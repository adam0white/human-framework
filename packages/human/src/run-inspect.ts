/** SCOPE: detached current reads. Subjective views use only the observer's own
 * stores. Unknown other-person facts stay unknown. Host-only current reuses the
 * exported duplicate-journal window, without accepted-history packing or hashes.
 * Host control reads existing offers, activity and current world revision.
 * No new player knowledge, actor mutation or RNG draw. */

import { readCapacities } from './body/injury.ts';
import { cloneData } from './core/clone.ts';
import { sigmoid } from './core/index.ts';
import { outwardSigns, selfReport } from './impression.ts';
import { projectPortablePerson } from './portable-person.ts';
import { practiceAt } from './promptings/promptings.ts';
import { exportRun } from './run.ts';
import { PORTABLE_ADMISSION_REJECTED } from './run-admission.ts';
import { archiveSnapshot } from './run-archive.ts';
import { RUN_ENGINE } from './run-engine.ts';
import { conditionImpression } from './run-imagination.ts';
import { freezeData, readKernel } from './run-kernel.ts';
import { OWNERS } from './run-owners.ts';
import { bodyPerception } from './run-person.ts';
import type * as T from './run-schema.ts';
import { validateData } from './run-validation.ts';
import { projectEvents } from './run-view.ts';
import { skillLevel } from './skills/skills.ts';
import { adviceWeight, standingAdvice } from './will/will.ts';

function fail(
  path: string,
  message: string,
  code: T.ContractError['code'] = 'invalid-admission',
): T.Result<never> {
  return { ok: false, error: { code, path, message } };
}
export function inspectCurrentRun(
  run: T.Run,
  input: T.DeepReadonly<T.InspectQuery>,
): T.Result<T.DeepReadonly<T.Inspection>> {
  const admitted = validateData('InspectQuery', input);
  if (!admitted.ok) return admitted;
  const q = admitted.value;
  if (q.select.includes('current') && q.perspective.kind !== 'host')
    return fail('$.select', 'current requires privileged host perspective');
  if (q.select.includes('control') && q.perspective.kind !== 'host')
    return fail('$.select', 'control requires privileged host perspective');
  const record = readKernel(run),
    state = record.current;
  if (new Set(q.people).size !== q.people.length || new Set(q.select).size !== q.select.length)
    return fail('$', 'duplicate person or selection', 'duplicate-id');
  for (const id of q.people)
    if (!Object.hasOwn(state.people, id)) return fail('$.people', `unknown person ${id}`, 'unknown-id');
  if (q.perspective.kind === 'person' && !Object.hasOwn(state.people, q.perspective.observer))
    return fail('$.perspective.observer', 'unknown observer', 'unknown-id');
  if (q.diagnostic && q.perspective.kind !== 'host')
    return fail('$.diagnostic', 'full hash requires privileged host perspective');
  if (q.perspective.kind === 'host' && q.select.some((s) => s === 'chapter'))
    return fail('$.select', PORTABLE_ADMISSION_REJECTED, 'invalid-admission');
  let start = 0;
  if (q.afterEvent !== undefined) {
    const index = state.events.findIndex((e) => e.id === q.afterEvent);
    if (index < 0) return fail('$.afterEvent', 'unknown event cursor', 'unknown-id');
    const cursor = state.events[index];
    if (!cursor) return fail('$.afterEvent', 'unknown event cursor', 'unknown-id');
    const requestId = cursor.data.kind === 'claim-told' ? cursor.data.deliveryRequestId : undefined;
    const related =
      requestId === undefined
        ? []
        : state.events.filter(
            (e) => e.data.kind === 'communication-requested' && e.data.request.id === requestId,
          );
    if (
      !projectEvents(
        [...related, cursor],
        q.perspective,
        record.spec.definitions.lexicon,
        record.spec.seed,
        state.receipts.communications,
      ).some((e) => e.id === cursor.id)
    )
      return fail('$.afterEvent', 'unknown event cursor', 'unknown-id');
    start = index + 1;
  }
  const events = q.select.includes('events')
    ? projectEvents(
        state.events.slice(start),
        q.perspective,
        record.spec.definitions.lexicon,
        record.spec.seed,
        state.receipts.communications,
      )
    : [];
  let eventPeople: Map<T.Id, T.PersonId | undefined> | undefined;
  const personForEvent = (id: T.Id): T.PersonId | undefined => {
    if (!eventPeople) {
      eventPeople = new Map();
      for (const event of state.events)
        if (!eventPeople.has(event.id)) eventPeople.set(event.id, event.person);
    }
    return eventPeople.get(id);
  };
  const context = (person: T.PersonId): T.FrameContext => ({
    effective: record.parameters.effective,
    effectiveParametersHash: record.parameters.hash,
    person,
    at: state.at,
    priorAt: state.at,
    phase: state.cursor.phase,
    fidelity: state.cursor.fidelity,
    worldRevision: state.world.revision,
    causes: [],
  });
  const readings = (actor: T.ActorState): T.SkillReading[] =>
    Object.entries(actor.skills).map(([id, skill]) => ({
      id,
      competence: skillLevel({ ...actor, now: state.at, effective: record.parameters.effective }, id),
      practicedMs: skill.practicedMs,
      lastPracticed: skill.lastPracticed,
    }));
  const body = (actor: T.ActorState) =>
    OWNERS.body.read(actor.body, { ...context(actor.id), perception: bodyPerception(actor, state.at) });
  const condition = (actor: T.ActorState): T.ConditionReading => {
    const readout = body(actor),
      moving = readCapacities(actor.body).moving;
    return {
      outwardSigns: outwardSigns(actor, readout, moving, record.parameters.effective),
      selfReport: selfReport(actor, readout, moving, record.parameters.effective),
    };
  };
  const promptings = (actor: T.ActorState): T.PromptingsReading => ({
    ...actor.promptings,
    responses: actor.promptings.responses.map((response) => ({
      ...response,
      effectivePractice: practiceAt(
        response,
        state.at,
        record.parameters.effective.promptings.practiceHalfLifeDays,
      ),
    })),
  });
  const affect = (actor: T.ActorState): T.AffectReading => ({
    mood: actor.affect.mood,
    emotions: actor.affect.emotions.map(({ id, intensity, cause, targetId }) => ({
      id,
      intensity,
      cause,
      ...(targetId === undefined ? {} : { targetId }),
    })),
  });
  const advice = (actor: T.ActorState): T.AdviceReading =>
    standingAdvice({ will: actor.will, now: state.at }, state.at).map((item) => ({
      ...item,
      effectiveWeight: adviceWeight(item, state.at),
    }));
  const people: T.DeepReadonly<T.PersonView>[] = [];
  for (const id of q.people) {
    const actor = state.people[id];
    if (!actor) return fail('$.people', 'unknown person', 'unknown-id');
    if (q.perspective.kind === 'host') {
      const parts: T.DeepReadonly<T.SelectedPart<T.HostParts>>[] = [];
      for (const select of q.select)
        switch (select) {
          case 'control':
            parts.push({ select, value: { offers: state.offers[id] ?? null, activity: actor.activity } });
            break;
          case 'summary':
            parts.push({
              select,
              value: {
                name: actor.name,
                alive: actor.body.alive,
                activity: actor.activity
                  ? { id: actor.activity.id, actionId: actor.activity.offer.actionId }
                  : null,
              },
            });
            break;
          case 'needs':
            parts.push({
              select,
              value: OWNERS.needs.read(actor.needs, {
                ...context(id),
                body: body(actor),
                traits: actor.traits,
                values: actor.values,
              }),
            });
            break;
          case 'condition':
            parts.push({ select, value: condition(actor) });
            break;
          case 'affect':
            parts.push({ select, value: affect(actor) });
            break;
          case 'expectations':
            parts.push({ select, value: actor.memory.expectations });
            break;
          case 'skills':
            parts.push({ select, value: readings(actor) });
            break;
          case 'body':
            parts.push({ select, value: { state: actor.body, readout: body(actor) } });
            break;
          case 'beliefs':
            parts.push({
              select,
              value: actor.memory.beliefs.map(({ logOdds, ...belief }) => ({
                ...belief,
                credence: sigmoid(logOdds),
              })),
            });
            break;
          case 'sourceTrust':
            parts.push({ select, value: actor.memory.sourceTrust });
            break;
          case 'promptings':
            parts.push({ select, value: promptings(actor) });
            break;
          case 'review':
            parts.push({ select, value: actor.review });
            break;
          case 'advice':
            parts.push({ select, value: advice(actor) });
            break;
          case 'traits':
            parts.push({ select, value: actor.traits });
            break;
          case 'heldNorms':
            parts.push({ select, value: actor.conscience.norms });
            break;
          case 'relationships':
            parts.push({ select, value: { ties: actor.social.relationships, voices: actor.will.voices } });
            break;
          case 'methods':
            parts.push({ select, value: actor.methods });
            break;
          case 'agenda':
            parts.push({ select, value: actor.agenda });
            break;
          case 'calendar':
            parts.push({
              select,
              value: { definition: record.spec.definitions.calendar, norms: record.spec.definitions.norms },
            });
            break;
          case 'persona': {
            if (!q.portable || q.people.length !== 1 || q.portable.person !== id)
              return fail(
                '$.portable',
                'Portable projection requires one person and explicit cast identity/revision',
              );
            let initial = record.initialPeople.find((p) => p.id === id);
            // Arrived actors retain their admission in accepted transactions,
            // never in the authored opening. Walk immutable nodes only for this
            // cold portable projection; ordinary reads do not scan history.
            for (let node = record.history; initial === undefined && node; node = node.previous) {
              const arrival = node.transaction.inputs.find(
                (input) =>
                  input.kind === 'person.arrived' &&
                  input.payload.authored.id === id &&
                  state.receipts.dispositions.some(
                    (receipt) => receipt.inputId === input.id && receipt.kind === 'consumed',
                  ),
              );
              if (arrival?.kind === 'person.arrived') initial = arrival.payload.authored;
            }
            if (initial?.identity.castId !== undefined && initial.identity.castId !== q.portable.castId)
              return fail('$.portable.castId', 'Cast identity differs from the admitted person');
            try {
              parts.push({
                select,
                value: projectPortablePerson({
                  castId: q.portable.castId,
                  castRevision: q.portable.castRevision,
                  game: record.spec.host.id,
                  engine: RUN_ENGINE.package.split('@').at(-1) ?? '',
                  person: actor,
                  previous: initial?.portable?.person,
                  history: [],
                  calendar: {
                    definition: record.spec.definitions.calendar,
                    norms: record.spec.definitions.norms,
                  },
                }),
              });
            } catch (error) {
              if (!(error instanceof Error)) throw error;
              return fail('$.select', error.message);
            }
            break;
          }
          case 'events':
            parts.push({
              select,
              value: events.filter((e) => personForEvent(e.id) === id),
            });
            break;
        }
      people.push({ kind: 'host', id, parts });
    } else if (q.perspective.observer === id) {
      const parts: T.DeepReadonly<T.SelectedPart<T.SelfParts>>[] = [];
      for (const select of q.select)
        switch (select) {
          case 'traits':
            parts.push({ select, value: { kind: 'unobserved' } });
            break;
          case 'heldNorms':
            parts.push({ select, value: actor.conscience.norms });
            break;
          case 'summary':
            parts.push({ select, value: { name: actor.name } });
            break;
          case 'needs':
            parts.push({
              select,
              value: OWNERS.needs.read(actor.needs, {
                ...context(id),
                body: body(actor),
                traits: actor.traits,
                values: actor.values,
              }),
            });
            break;
          case 'condition':
            parts.push({ select, value: condition(actor) });
            break;
          case 'affect':
            parts.push({ select, value: affect(actor) });
            break;
          case 'expectations':
            parts.push({ select, value: actor.memory.expectations });
            break;
          case 'skills':
            parts.push({ select, value: readings(actor) });
            break;
          case 'body':
            parts.push({ select, value: { perceived: body(actor).perceived } });
            break;
          case 'beliefs':
            parts.push({
              select,
              value: actor.memory.beliefs.map(({ logOdds, ...belief }) => ({
                ...belief,
                credence: sigmoid(logOdds),
              })),
            });
            break;
          case 'sourceTrust':
            parts.push({ select, value: actor.memory.sourceTrust });
            break;
          case 'promptings':
            parts.push({ select, value: promptings(actor) });
            break;
          case 'review':
            parts.push({ select, value: actor.review });
            break;
          case 'advice':
            parts.push({ select, value: advice(actor) });
            break;
          case 'relationships':
            parts.push({ select, value: { ties: actor.social.relationships, voices: actor.will.voices } });
            break;
          case 'methods':
            parts.push({ select, value: actor.methods });
            break;
          case 'agenda':
            parts.push({ select, value: actor.agenda });
            break;
          case 'events':
            parts.push({ select, value: events });
            break;
          case 'persona':
            parts.push({ select, value: { kind: 'unavailable', reason: 'privileged-projection' } });
            break;
          case 'calendar':
            parts.push({
              select,
              value: { kind: 'known', value: actor.agenda.commitments, evidenceIds: [] },
            });
            break;
          case 'chapter':
            parts.push({ select, value: { kind: 'unavailable', reason: 'host-narrative-clock' } });
            break;
        }
      people.push({ kind: 'self', id, parts });
    } else {
      // Never read target faculties to estimate what the observer has learned.
      // There is no admitted observation-to-skill/body/agenda projector yet.
      const observer = state.people[q.perspective.observer];
      const parts: T.DeepReadonly<T.SelectedPart<T.OtherParts>>[] = [];
      for (const select of q.select)
        switch (select) {
          case 'condition':
            if (!observer) throw new TypeError('Missing observer');
            parts.push({ select, value: conditionImpression(observer, id, state.at) });
            break;
          case 'summary':
            parts.push({ select, value: { kind: 'unobserved' } });
            break;
          case 'affect':
          case 'expectations':
          case 'needs':
          case 'skills':
          case 'body':
          case 'beliefs':
          case 'sourceTrust':
          case 'promptings':
          case 'review':
          case 'advice':
          case 'relationships':
          case 'traits':
          case 'heldNorms':
          case 'methods':
          case 'agenda':
          case 'calendar':
            parts.push({ select, value: { kind: 'unobserved' } });
            break;
          case 'events':
            parts.push({ select, value: events });
            break;
          case 'persona':
            parts.push({ select, value: { kind: 'unavailable', reason: 'privileged-projection' } });
            break;
          case 'chapter':
            parts.push({ select, value: { kind: 'unavailable', reason: 'host-narrative-clock' } });
            break;
        }
      people.push({ kind: 'other', id, parts });
    }
  }
  let skill: T.SkillSuccess | undefined;
  let method: T.DeepReadonly<T.MethodEvidence> | undefined;
  if (q.skill) {
    const s = q.skill;
    if (!q.people.includes(s.person)) return fail('$.skill.person', 'skill person must be selected');
    if (q.perspective.kind !== 'host' && q.perspective.observer !== s.person)
      return fail('$.skill', 'current private skill requires host or self');
    if (!record.spec.definitions.skills.some((d) => d.id === s.skill))
      return fail('$.skill.skill', 'unknown skill', 'unknown-id');
    const actor = state.people[s.person];
    if (!actor) return fail('$.skill.person', 'unknown person', 'unknown-id');
    const capacity = body(actor).capacity;
    skill = {
      person: s.person,
      skill: s.skill,
      competence: skillLevel({ ...actor, now: state.at, effective: record.parameters.effective }, s.skill),
      capacity,
      successChance: OWNERS.skills.successChance(
        actor,
        { skill: s.skill, difficulty: s.difficulty, capacity, support: s.support ?? 0 },
        context(s.person),
      ),
    };
  }
  if (q.method) {
    const m = q.method;
    if (!q.people.includes(m.person)) return fail('$.method.person', 'method person must be selected');
    if (q.perspective.kind !== 'host' && q.perspective.observer !== m.person)
      return fail('$.method', 'private method evidence requires host or self');
    const actor = state.people[m.person];
    if (!actor) return fail('$.method.person', 'unknown person', 'unknown-id');
    if (!record.spec.definitions.actions.some((a) => a.id === m.action))
      return fail('$.method.action', 'unknown action', 'unknown-id');
    const book = state.offers[m.person];
    const available =
      book?.offers.some(
        (o) =>
          o.actionId === m.action &&
          !book.rejected.some((r) => r.offerId === o.id && r.offerRevision === book.revision),
      ) ?? false;
    method = OWNERS.methods.evidence(actor.methods, {
      ...context(m.person),
      action: m.action,
      contextId: m.contextId,
      available,
      sourceTrust: Object.entries(actor.memory.sourceTrust).map(([sourceId, trust]) => ({ sourceId, trust })),
      voices: actor.will.voices,
    });
  }
  const result: T.DeepReadonly<T.Inspection> = {
    at: state.at,
    perspective: q.perspective,
    people,
    events,
    ...(q.select.includes('control') ? { worldRevision: state.world.revision } : {}),
    ...(q.select.includes('current') ? { current: archiveSnapshot(state) } : {}),
    ...(skill ? { skill } : {}),
    ...(method ? { method } : {}),
    ...(q.diagnostic ? { fullHash: exportRun(run).hashes.full } : {}),
  };
  return { ok: true, value: freezeData(cloneData(result)) };
}
