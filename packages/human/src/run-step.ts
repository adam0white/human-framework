/** SCOPE: one reached-frame scheduler for all run calls. Proposals never consume
 * randomness. Only a reached hazard commits its owning stream. */

import { cloneData } from './core/clone.ts';
import { checkBatchEnvelope } from './run-admission.ts';
import { materializePhysiology, materializeRetained, probePhysiology, probeRetained } from './run-advance.ts';
import { canonicalJson, hashCanonical } from './run-canonical.ts';
import { Frame } from './run-dispatch.ts';
import { validateActor } from './run-integrity.ts';
import { commitTransaction, freezeData, RunLimitError, readKernel, stageTransaction } from './run-kernel.ts';
import { OWNERS } from './run-owners.ts';
import { compareScheduled, frameEntries, nextDailyAt, queuedInputs } from './run-scheduler.ts';
import type * as T from './run-schema.ts';

export function step(run: T.Run, input: T.DeepReadonly<T.StepBatch>): T.Result<T.DeepReadonly<T.StepResult>> {
  const record = readKernel(run),
    initial = record.current;
  const admitted = checkBatchEnvelope(
    {
      at: initial.at,
      closed: initial.cursor.closed,
      resolutionLane: initial.cursor.resolutionLane,
      worldRevision: initial.world.revision,
      hostId: record.spec.host.id,
      sources: record.spec.definitions.sources,
      people: Object.keys(initial.people),
      acceptedInputIds: record.inputIds,
      queued: initial.queue.flatMap((event) => (event.data.kind === 'input' ? [event.data.input] : [])),
      pending: initial.pending,
    },
    input,
  );
  if (!admitted.ok) return admitted;
  const batch = admitted.value,
    stage = stageTransaction(run),
    frame = new Frame(record, stage);
  // A batch that resolves pending requests continues the paused frame at its fidelity; a different one is refused.
  if (
    initial.pending.length &&
    batch.fidelity !== undefined &&
    canonicalJson(batch.fidelity) !== canonicalJson(initial.cursor.fidelity)
  )
    return {
      ok: false,
      error: {
        code: 'invalid-admission',
        path: '$.fidelity',
        message:
          'a batch that resolves pending requests keeps the paused fidelity; omit fidelity or repeat it',
      },
    };
  const fidelity = initial.pending.length ? initial.cursor.fidelity : (batch.fidelity ?? { mode: 'fine' });
  stage.current.cursor = { ...initial.cursor, fidelity };
  try {
    for (const entry of batch.inputs) {
      const ordinal = stage.current.counters.nextInput++;
      if (!Number.isSafeInteger(stage.current.counters.nextInput))
        throw new RunLimitError('Input counter exhausted');
      stage.receipts.inputs.push({ id: entry.id, ordinal, hash: hashCanonical('hf-run4/input', entry) });
    }
    stage.current.queue = [...stage.current.queue, ...queuedInputs(record.spec.id, batch.inputs)].sort(
      compareScheduled,
    );
    const drainReachedHazards = () => {
      for (let work = 0; work < 10000; work++) {
        const allocations = Object.fromEntries(
          Object.keys(stage.current.people).map((person) => [person, frame.references(person)]),
        );
        const causes = Object.fromEntries(
          Object.keys(stage.current.people).map((person) => [
            person,
            [hashCanonical('hf-run4/reached-hazard', person, stage.current.at)],
          ]),
        );
        const probe = probePhysiology(
          stage.current,
          Math.min(Number.MAX_SAFE_INTEGER, stage.current.at + 1),
          stage.current.cursor.fidelity,
          record.parameters.effective,
          record.parameters.hash,
          allocations,
          causes,
          OWNERS,
        );
        const reached = probe.boundaries.find(
          (boundary) => boundary.kind === 'hazard' && boundary.at === stage.current.at,
        );
        if (reached?.kind !== 'hazard') return;
        frame.hazard(
          reached.person,
          reached.boundary,
          probe.proposals.find((proposal) => proposal.person === reached.person)?.affect?.trajectory,
        );
      }
      throw new RunLimitError('Reached hazard work limit exceeded');
    };
    const initialRequests = new Set(initial.pending.map((request) => request.id));
    const unresolvedIngress = () => stage.current.pending.some((request) => initialRequests.has(request.id));
    let processedAt: T.Time | undefined;
    let work = 0;
    while (true) {
      if (++work > 100000) throw new RunLimitError('Reached-frame work limit exceeded');
      const at = stage.current.at;
      const entries = frameEntries(stage.current.queue, at);
      if (entries.length || (processedAt !== at && !stage.current.cursor.closed)) {
        stage.current.queue = stage.current.queue.filter((event) => event.at !== at);
        stage.current.cursor = { ...stage.current.cursor, at, phase: 0, closed: false };
        for (const event of entries) if (event.data.kind === 'input') frame.receive(event.data.input);
        for (const phase of [0, 1, 2, 3, 4, 5, 6] as const) {
          frame.runIngress(phase);
          if (phase === 3) frame.flushContacts();
          if (phase === 2 && !unresolvedIngress()) drainReachedHazards();
          const emitted = stage.current.queue.filter((event) => event.at === at && event.phase === phase);
          stage.current.queue = stage.current.queue.filter(
            (event) => !(event.at === at && event.phase === phase),
          );
          const phaseEntries = [
            ...entries.filter((event) => event.data.kind !== 'input' && event.phase === phase),
            ...emitted,
          ].sort(compareScheduled);
          for (const event of phaseEntries) {
            const data = event.data;
            if (data.kind === 'effect')
              frame.effect(data.effect, frame.context(data.effect.person, phase, [event.causalId]));
            else if (data.kind === 'activity-finish') {
              const actor = frame.actor(data.person);
              if (actor.activity?.id === data.activityId && !actor.activity.interrupt)
                frame.issueAction(data.person, 'finish', frame.context(data.person, phase, [event.causalId]));
            } else if (data.kind === 'activity-review') {
              if (frame.actor(data.person).activity?.id === data.activityId)
                frame.requestDecision(data.person, 'reconsider', event.causalId);
            } else if (data.kind === 'owner-boundary' && data.owner === 'review')
              frame.review(data.person, frame.context(data.person, phase, [event.causalId]));
            else if (data.kind === 'owner-boundary' && data.owner === 'chronicle')
              frame.closeDay(data.person, event.causalId);
            else if (data.kind === 'owner-boundary' && data.owner === 'will')
              frame.requestDecision(data.person, 'ordinary', event.causalId);
            else if (data.kind === 'hazard-boundary') {
              /* Revalidated from actual phase-two conditions below. */
            } else if (data.kind === 'calendar') {
              for (const id of Object.keys(stage.current.people).sort()) {
                if (data.commitmentIds.length === 0) frame.closeDay(id, event.causalId);
                frame.requestDecision(id, 'ordinary', event.causalId);
              }
            } else if (data.kind === 'routine-opportunity') {
              const routine = stage.current.routines.find(
                (routine) => routine.person === data.person && routine.id === data.scheduleId,
              );
              const entry = routine?.entries.find((entry) => entry.id === data.entryId);
              if (entry) frame.routine(data.person, entry, event.causalId);
            }
          }
          if (phase === 2 && !unresolvedIngress()) drainReachedHazards();
          if (phase === 4 && !unresolvedIngress())
            for (const person of Object.keys(stage.current.people).sort())
              frame.review(person, frame.context(person, 4, []));
          if (phase === 5 && unresolvedIngress()) {
            for (const [person, decision] of frame.decisions) {
              const id = hashCanonical('hf-run4/deferred-assent', person, at, decision);
              if (!stage.current.queue.some((event) => event.id === id))
                stage.current.queue = [
                  ...stage.current.queue,
                  {
                    id,
                    at,
                    phase: 5,
                    person,
                    causalId: decision.causes[0] ?? id,
                    localOrdinal: 0,
                    data: { kind: 'owner-boundary', owner: 'will', person, boundary: 'threshold' },
                  },
                ];
            }
            frame.decisions.clear();
          }
          if (phase === 5 && !unresolvedIngress()) {
            for (const [person, decision] of [...frame.decisions].sort(([a], [b]) =>
              a < b ? -1 : a > b ? 1 : 0,
            ))
              frame.choose(person, decision.treatment, decision.causes);
            frame.decisions.clear();
          }
          stage.current.cursor = { ...stage.current.cursor, phase };
        }
        processedAt = at;
        stage.current.cursor = {
          ...stage.current.cursor,
          closed: stage.current.pending.length === 0,
          frameOrdinal: stage.current.cursor.frameOrdinal + 1,
          resolutionLane: stage.current.pending.map((request) => request.id),
        };
      }
      if (stage.current.pending.length) break;
      if (stage.current.queue.some((event) => event.at === stage.current.at)) continue;
      if (stage.current.at === batch.until) break;
      const allocations = Object.fromEntries(
        Object.keys(stage.current.people).map((person) => [person, frame.references(person)]),
      );
      const causes = Object.fromEntries(
        Object.keys(stage.current.people).map((person) => [
          person,
          [hashCanonical('hf-run4/span', person, stage.current.at)],
        ]),
      );
      let to = stage.current.queue.reduce((next, event) => Math.min(next, event.at), batch.until);
      const midnight = nextDailyAt(stage.current.at, 0);
      if (!midnight.ok) return midnight;
      to = Math.min(to, midnight.value);
      if (fidelity.mode === 'daily') {
        const daily = nextDailyAt(stage.current.at, fidelity.anchor);
        if (!daily.ok) return daily;
        to = Math.min(to, daily.value);
      }
      const physics = (until: T.Time) =>
        probePhysiology(
          stage.current,
          until,
          fidelity,
          record.parameters.effective,
          record.parameters.hash,
          allocations,
          causes,
          OWNERS,
        );
      const retained = (until: T.Time) =>
        probeRetained(
          stage.current,
          until,
          fidelity,
          record.parameters.effective,
          record.parameters.hash,
          record.spec.definitions.norms,
          allocations,
          causes,
          OWNERS,
        );
      let physical = physics(to),
        mental = retained(to);
      const currentHazard = physical.boundaries.find(
        (boundary) => boundary.kind === 'hazard' && boundary.at === stage.current.at,
      );
      if (currentHazard?.kind === 'hazard') {
        frame.hazard(
          currentHazard.person,
          currentHazard.boundary,
          physical.proposals.find((proposal) => proposal.person === currentHazard.person)?.affect?.trajectory,
        );
        continue;
      }
      const reached = Math.min(to, physical.through, mental.through);
      if (reached !== to) {
        to = reached;
        physical = physics(to);
        mental = retained(to);
      }
      const boundary = physical.boundaries.find(
        (boundary) => boundary.at === stage.current.at && boundary.kind === 'hazard',
      );
      if (boundary?.kind === 'hazard') {
        frame.hazard(
          boundary.person,
          boundary.boundary,
          physical.proposals.find((proposal) => proposal.person === boundary.person)?.affect?.trajectory,
        );
        continue;
      }
      if (to === stage.current.at) throw new RangeError('Owner span failed to make progress');
      const physicalResult = materializePhysiology(stage.current, physical);
      stage.current = physicalResult.state;
      const mentalResult = materializeRetained(stage.current, mental);
      stage.current = mentalResult.state;
      for (const allocation of mentalResult.allocations)
        frame.allocate(
          allocation.scope.kind === 'person' ? allocation.scope.person : record.spec.id,
          allocation.reference,
        );
      // What a span delivers is caused by reaching `to`, not by where the step call
      // began, so its cause names the reached time and stays the same under any chunking.
      const reachedCauses = (person: T.PersonId) => [hashCanonical('hf-run4/reached-span', person, to)];
      for (const delivery of [...physicalResult.deliveries, ...mentalResult.deliveries]) {
        const context = frame.context(delivery.person, 1, reachedCauses(delivery.person));
        for (const event of delivery.events) frame.emit(delivery.person, event, context);
        for (const effect of [
          ...delivery.effects.terms,
          ...delivery.effects.modifiers,
          ...delivery.effects.appraisals,
        ])
          frame.effect(effect, context);
      }
      for (const receipt of mentalResult.upbringing)
        frame.upbringing(
          receipt.person,
          receipt.receipts,
          frame.context(receipt.person, 3, reachedCauses(receipt.person)),
        );
      for (const receipt of mentalResult.willReceipts)
        frame.willReceipts(
          receipt.person,
          receipt.output,
          frame.context(receipt.person, 1, reachedCauses(receipt.person)),
        );
      for (const receipt of physicalResult.lifeReceipts)
        frame.lifeReceipts(
          receipt.person,
          receipt.receipts,
          frame.context(receipt.person, 1, reachedCauses(receipt.person)),
        );
      for (const boundary of physical.boundaries)
        if (boundary.kind === 'hazard' && boundary.at === to)
          stage.current.queue = [
            ...stage.current.queue,
            {
              id: hashCanonical('hf-run4/hazard', boundary),
              at: to,
              phase: 2,
              person: boundary.person,
              causalId: boundary.boundary.key.channelId,
              localOrdinal: 0,
              data: { kind: 'hazard-boundary', person: boundary.person, boundary: boundary.boundary },
            },
          ];
      if (to === midnight.value)
        for (const person of Object.keys(stage.current.people).sort()) {
          const cause = hashCanonical('hf-run4/day-boundary', record.spec.id, person, to);
          stage.current.queue = [
            ...stage.current.queue,
            {
              id: cause,
              at: to,
              phase: 4,
              person,
              causalId: cause,
              localOrdinal: 0,
              data: { kind: 'owner-boundary', owner: 'chronicle', person, boundary: 'day' },
            },
          ];
        }
      stage.current.cursor = { ...stage.current.cursor, at: to, closed: false, phase: 0 };
      processedAt = undefined;
    }
    const state = stage.current;
    for (const person of Object.keys(state.people)) {
      const actor = state.people[person],
        continuation = state.continuations.find((item) => item.person === person);
      if (!actor || !continuation) throw new TypeError('Missing reached actor continuation');
      const issues = validateActor(
        actor,
        continuation,
        frame.references(person),
        state.at,
        record.parameters.hash,
        OWNERS,
      );
      if (issues[0]) throw new RangeError(`${issues[0].path}: ${issues[0].message}`);
    }
    const boundary: T.StepResult['boundary'] = state.pending.length
      ? { type: 'world-required', requests: state.pending }
      : { type: 'until' };
    const nextAt = state.pending.length
      ? state.at
      : state.queue.reduce<T.Time | null>(
          (next, event) => (next === null || event.at < next ? event.at : next),
          null,
        );
    const result = freezeData(
      cloneData({
        at: state.at,
        reachedUntil: state.at === batch.until,
        events: stage.events,
        boundary,
        nextAt,
      }),
    );
    const ordinal = state.counters.nextTransaction++;
    if (!Number.isSafeInteger(state.counters.nextTransaction))
      throw new RunLimitError('Transaction counter exhausted');
    const transaction = freezeData(
      cloneData({
        ordinal,
        until: batch.until,
        inputs: batch.inputs,
        fidelity,
        reachedAt: state.at,
        cursor: state.cursor,
        boundary,
      }),
    );
    commitTransaction(run, stage, true, transaction);
    return { ok: true, value: result };
  } catch (error) {
    // An engine budget (numerical cell, work, segment or counter limit) is limit-exceeded; any other
    // RangeError is a host input the engine refuses. A TypeError is an engine fault, not a host error.
    if (!(error instanceof RangeError)) throw error;
    const limit = error instanceof RunLimitError || /limit[- ]exceeded/i.test(error.message);
    return {
      ok: false,
      error: {
        code: limit ? 'limit-exceeded' : 'invalid-admission',
        path: '$.runtime',
        message: error.message,
      },
    };
  }
}
