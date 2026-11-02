/** SCOPE: explicit host control data through inspect, with exact cold-current semantics.
 * Public authored work and public world receipts supply the headless control. */
import { expect, test } from 'vitest';
import * as HF from '../src/index.ts';
import type {
  ActionRequest,
  DeepReadonly,
  InspectQuery,
  Run,
  RunState,
  StepResult,
} from '../src/run-schema.ts';
import { emptyRunSpec } from './run-fixture.ts';
import { numericalPerson, numericalSpec, sleepOffer } from './run-numerical-fixture.ts';
import {
  actionRequest,
  authoredPerson,
  exampleOffers,
  freshHost,
  MINUTE,
  need,
  openingInputs,
  resolutionInput,
  restoredHost,
  START,
  serve,
  setup,
} from './support.ts';

function current(run: Run): DeepReadonly<RunState> {
  const value = need(HF.inspect(run, { perspective: { kind: 'host' }, people: [], select: ['current'] }));
  if (!value.current) throw new Error('Missing selected current');
  return value.current;
}

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeepFrozen(child);
}

test('host current is exact, detached, omitted when unselected and coherent with mixed selections', () => {
  const run = setup([authoredPerson('ada', 'Ada'), authoredPerson('bora', 'Bora')]);
  const before = HF.exportRun(run);
  const value = current(run);
  expect(value).toStrictEqual(before.current);
  expect(Object.keys(value.people)).toEqual(['ada', 'bora']);
  expect(Object.isFrozen(value.people.ada)).toBe(true);
  expect(Reflect.set(value.world, 'revision', 99)).toBe(false);
  expect(Reflect.set(value.people, 'ada', null)).toBe(false);
  expect(HF.exportRun(run)).toStrictEqual(before);
  const query = {
    perspective: { kind: 'host' as const },
    people: ['ada'],
    select: ['summary', 'events'] as const,
  };
  const legacy = need(HF.inspect(run, query));
  expect(Object.hasOwn(legacy, 'current')).toBe(false);
  const { current: selected, ...mixed } = need(
    HF.inspect(run, { ...query, select: ['current', ...query.select] }),
  );
  expect(selected).toStrictEqual(value);
  expect(mixed).toStrictEqual(legacy);
  for (const observer of ['ada', 'bora']) {
    for (const people of [[], ['ada']]) {
      const result = HF.inspect(run, {
        perspective: { kind: 'person', observer },
        people,
        select: ['summary', 'current'],
      });
      expect(result).toStrictEqual({
        ok: false,
        error: {
          code: 'invalid-admission',
          path: '$.select',
          message: 'current requires privileged host perspective',
        },
      });
    }
  }
  expect(HF.inspect(run, { ...query, people: ['missing'], select: ['current'] })).toMatchObject({
    ok: false,
    error: { code: 'unknown-id' },
  });
  expect(HF.inspect(run, { ...query, select: ['current', 'current'] })).toMatchObject({
    ok: false,
    error: { code: 'duplicate-id' },
  });
  const controlQuery = (
    people: string[],
    select: InspectQuery['select'],
    perspective: InspectQuery['perspective'] = { kind: 'host' },
  ): InspectQuery => ({ perspective, people, select });
  for (const people of [[], ['ada']]) {
    expect(
      HF.inspect(run, controlQuery(people, ['control'], { kind: 'person', observer: 'ada' })),
    ).toMatchObject({ ok: false, error: { code: 'invalid-admission', path: '$.select' } });
  }
  expect(HF.inspect(run, controlQuery(['missing'], ['control']))).toMatchObject({
    ok: false,
    error: { code: 'unknown-id' },
  });
  expect(HF.inspect(run, controlQuery(['ada', 'ada'], ['control']))).toMatchObject({
    ok: false,
    error: { code: 'duplicate-id' },
  });
  expect(HF.inspect(run, controlQuery(['ada'], ['control', 'control']))).toMatchObject({
    ok: false,
    error: { code: 'duplicate-id' },
  });
  expect(
    HF.inspect(
      run,
      controlQuery(['ada'], ['control', 'not-a-selector'] as unknown as InspectQuery['select']),
    ),
  ).toMatchObject({ ok: false });
  const empty = need(HF.inspect(run, controlQuery(['ada'], ['control'])));
  expect(empty.people[0]).toStrictEqual({
    kind: 'host',
    id: 'ada',
    parts: [{ select: 'control', value: { offers: null, activity: null } }],
  });
  expect(HF.exportRun(run)).toStrictEqual(before);
});

test('headless current reads preserve native history, journals, RNG, cold replay and next continuation across 64/65 receipts', () => {
  const run = setup();
  const work = exampleOffers('ada', ['work']);
  const book = new Map([['ada', work]]);
  const opening = need(HF.exportRunJournal(run));
  expect(opening.opening?.initial.effective).toStrictEqual(HF.exportRun(run).initial.effective);
  const reached = need(HF.step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: work }]) }));
  const request = actionRequest(reached, 'start');
  const pending = current(run);
  const pendingCopy = structuredClone(pending);
  expect(pending.pending.map((item) => item.id)).toContain(request.id);
  expect(pending).toStrictEqual(HF.exportRun(run).current);
  // Catch a shallow-only projection or a lifecycle aggregate that aliases caller/live data.
  const beforeReads = HF.exportRun(run);
  const query = {
    perspective: { kind: 'host' },
    people: ['ada'],
    select: ['current', 'events'],
    lifecycle: { kind: 'host', query: { kind: 'age', person: 'ada', at: START } },
  } satisfies InspectQuery;
  const composed = need(HF.inspect(run, query));
  const composedCopy = structuredClone(composed);
  expectDeepFrozen(composed);
  query.people.push('missing');
  if (!query.lifecycle || query.lifecycle.query.kind !== 'age') throw new Error('Missing age query');
  query.lifecycle.query.person = 'missing';
  query.lifecycle.query.at++;
  expect(Reflect.set(composed, 'at', -1)).toBe(false);
  expect(Reflect.set(composed, 'extra', true)).toBe(false);
  expect(Reflect.deleteProperty(composed, 'current')).toBe(false);
  expect(() => (composed.events as unknown[]).push(null)).toThrow(TypeError);
  if (!composed.current) throw new Error('Missing composed current');
  expect(Reflect.set(composed.current.world, 'revision', -1)).toBe(false);
  const held = need(
    HF.inspect(run, {
      perspective: { kind: 'person', observer: 'ada' },
      people: ['ada'],
      select: [],
      lifecycle: {
        kind: 'person',
        query: { kind: 'held-kin', person: 'ada', other: { kind: 'entity', id: 'unseen' } },
      },
    }),
  );
  expectDeepFrozen(held);
  expect(composed).toStrictEqual(composedCopy);
  expect(current(run)).toStrictEqual(pending);
  expect(HF.exportRun(run)).toStrictEqual(beforeReads);
  const host = freshHost();
  serve(run, host, book, START, [], reached);
  expect(current(run).people.ada?.activity).toBeDefined();
  expect(current(run).at).toBe(pending.at);
  expect(current(run).world.revision).toBeGreaterThan(pending.world.revision);
  expect(current(run)).toStrictEqual(HF.exportRun(run).current);
  expect(pending).toStrictEqual(pendingCopy);
  expect(current(run).pending.map((item) => item.id)).not.toContain(request.id);
  serve(run, host, book, START + 60 * MINUTE);
  expect(host.completed).toBeGreaterThan(0);
  const windowRun = need(HF.createRun(emptyRunSpec()));
  const at = 0;
  const hostState = null;
  const baseRevision = 0;
  const change = (revision: number) => ({
    id: `current-world-${revision}`,
    at: at + revision - baseRevision,
    source: { type: 'host' as const, id: 'world' },
    kind: 'world.changed' as const,
    payload: { expectedRevision: revision - 1, revision, put: [], remove: [], hostState },
  });
  // Each public world input advances one millisecond. The start resolution above
  // is the external same-time mutation and must refresh the next reading.
  const revision = 0;
  for (let index = 1; index <= 65; index++) {
    need(HF.step(windowRun, { until: at + index, inputs: [change(revision + index)] }));
    const read = current(windowRun);
    expect(read.world.revision).toBe(revision + index);
    expect(read.at).toBe(at + index);
    expect(read).toStrictEqual(HF.exportRun(windowRun).current);
    if (index === 64 || index === 65) {
      expect(read.receipts.inputs).toHaveLength(64);
      expect(
        read.receipts.inputs.map((receipt) => receipt.id).includes(`current-world-${revision + 1}`),
      ).toBe(index === 64);
      expect(read.events.length).toBeLessThanOrEqual(64);
      expect(read.receipts.dispositions).toHaveLength(64);
    }
  }
  const windowArchive = HF.exportRun(windowRun);
  const windowCold = need(HF.restoreRun(windowArchive));
  expect(need(HF.replay(windowArchive)).fullHash).toBe(windowArchive.hashes.full);
  expect(HF.step(windowRun, { until: 65, inputs: [change(65)] }).ok).toBe(false);
  expect(HF.exportRun(windowRun)).toStrictEqual(windowArchive);
  need(HF.step(windowRun, { until: 65, inputs: [] }));
  need(HF.step(windowCold, { until: 65, inputs: [] }));
  const afterNoop = HF.exportRun(windowRun);
  expect(current(windowRun)).toStrictEqual(afterNoop.current);
  expect(HF.exportRun(windowRun)).toStrictEqual(afterNoop);
  expect(HF.readRunHistory(afterNoop)).toHaveLength(66);
  need(HF.step(windowRun, { until: 66, inputs: [change(66)] }));
  need(HF.step(windowCold, { until: 66, inputs: [change(66)] }));
  expect(HF.exportRun(windowRun)).toStrictEqual(HF.exportRun(windowCold));
  const before = HF.exportRun(run);
  const journal = need(HF.exportRunJournal(run, opening.cursor));
  expect(HF.step(run, { until: before.current.at - 1, inputs: [] }).ok).toBe(false);
  const retained = current(run);
  expect(HF.exportRun(run)).toStrictEqual(before);
  expect(need(HF.exportRunJournal(run, journal.cursor)).chunk).toBe(null);
  const cold = need(HF.restoreRun(JSON.parse(JSON.stringify(before))));
  if (!opening.opening || !journal.chunk) throw new Error('Missing journal evidence');
  const fromJournal = need(
    HF.restoreRunJournal({ opening: opening.opening, chunks: [journal.chunk], head: journal.head }),
  ).run;
  const reproduced = need(HF.replay(before));
  expect(reproduced.fullHash).toBe(before.hashes.full);
  for (const restored of [cold, fromJournal, reproduced.run])
    expect(HF.exportRun(restored)).toStrictEqual(before);
  const coldHost = restoredHost(before);
  serve(run, host, book, before.current.at + 30 * MINUTE);
  serve(cold, coldHost, book, before.current.at + 30 * MINUTE);
  expect(HF.exportRun(run)).toStrictEqual(HF.exportRun(cold));
  expect(current(run)).toStrictEqual(HF.exportRun(run).current);
  expect(retained).toStrictEqual(before.current);
  expect(pending).toStrictEqual(pendingCopy);
  expect(composed).toStrictEqual(composedCopy);
});

test('host control matches current through partial settlement, restore and finish', () => {
  const spec = numericalSpec(2);
  // support's receipt helper uses the minimal example's host; retain this fixture's host.
  const receipt = (...args: Parameters<typeof resolutionInput>) => ({
    ...resolutionInput(...args),
    source: { type: 'host' as const, id: spec.host.id },
  });
  spec.definitions = {
    ...spec.definitions,
    sources: [...spec.definitions.sources, { type: 'person', id: 'a' }, { type: 'person', id: 'b' }],
  };
  const run = need(HF.createRun(spec));
  const inputs = [];
  for (const id of ['a', 'b']) {
    const person = numericalPerson(2);
    person.id = id;
    person.state.retention = { ...person.state.retention, trace: 32 };
    need(HF.createPerson(run, person));
    const offer = { ...sleepOffer(), id: `sleep-${id}`, person: id, durationMs: 1 };
    inputs.push({
      id: `offer-${id}`,
      at: 0,
      source: { type: 'host' as const, id: spec.host.id },
      kind: 'offers.received' as const,
      payload: { person: id, revision: 1, offers: [offer] },
    });
    inputs.push({
      id: `decide-${id}`,
      at: 0,
      source: { type: 'person' as const, id },
      kind: 'decision.requested' as const,
      payload: { person: id, reason: 'sleep', treatment: 'ordinary' as const, offerRevision: 1 },
    });
  }
  const opening = need(HF.step(run, { until: 1, inputs }));
  if (opening.boundary.type !== 'world-required') throw new Error('Missing actual start boundary');
  const first = actionRequest(opening, 'start', 'a');
  const second = actionRequest(opening, 'start', 'b');
  expect(opening.boundary.requests).toHaveLength(2);
  expect(first.worldRevision).toBe(0);
  const control = (target: Run, people: string[]) =>
    need(HF.inspect(target, { perspective: { kind: 'host' }, people, select: ['control'] }));
  const projected = (reading: ReturnType<typeof control>, id: string) => {
    const view = reading.people.find((person) => person.id === id);
    const part = view?.parts[0];
    if (view?.kind !== 'host' || part?.select !== 'control') throw new Error('Missing host control part');
    return part.value;
  };
  const revision = (reading: ReturnType<typeof control>) => {
    if (typeof reading.worldRevision !== 'number') throw new Error('Missing current world revision');
    return reading.worldRevision;
  };
  const compare = (target: Run, people: string[]) => {
    const before = HF.exportRun(target);
    const full = current(target);
    const reading = control(target, people);
    expect(reading.at).toBe(full.at);
    expect(revision(reading)).toBe(full.world.revision);
    expect(reading.people.map((view) => view.id)).toStrictEqual(people);
    for (const view of reading.people) {
      expect(view.kind).toBe('host');
      expect(view.parts.map((part) => part.select)).toStrictEqual(['control']);
      expect(projected(reading, view.id)).toStrictEqual({
        offers: full.offers[view.id] ?? null,
        activity: full.people[view.id]?.activity ?? null,
      });
    }
    expectDeepFrozen(reading);
    expect(HF.exportRun(target)).toStrictEqual(before);
    return reading;
  };
  // Each builder reads its own branch and looks up the issued offer independently.
  const startFromCurrent = (target: Run, request: DeepReadonly<ActionRequest>, changeWorld = false) => {
    if (request.stage !== 'start') throw new Error('Expected actual start request');
    const full = current(target);
    const held = full.offers[request.person]?.offers.find((offer) => offer.id === request.offerId);
    return receipt(request, full.world.revision, {
      disposition: held ? 'accepted' : 'rejected',
      observations: [],
      ...(changeWorld
        ? {
            worldChange: {
              expectedRevision: full.world.revision,
              revision: full.world.revision + 1,
              put: [],
              remove: [],
              hostState: { settled: 1 },
            },
          }
        : {}),
    });
  };
  const startFromControl = (target: Run, request: DeepReadonly<ActionRequest>, changeWorld = false) => {
    if (request.stage !== 'start') throw new Error('Expected actual start request');
    const reading = compare(target, [request.person]);
    const held = projected(reading, request.person).offers?.offers.find(
      (offer) => offer.id === request.offerId,
    );
    return receipt(request, revision(reading), {
      disposition: held ? 'accepted' : 'rejected',
      observations: [],
      ...(changeWorld
        ? {
            worldChange: {
              expectedRevision: revision(reading),
              revision: revision(reading) + 1,
              put: [],
              remove: [],
              hostState: { settled: 1 },
            },
          }
        : {}),
    });
  };
  const held = compare(run, ['b', 'a']);
  const heldCopy = structuredClone(held);
  const initial = HF.exportRun(run);
  const other = need(HF.restoreRun(initial));
  const firstReceipt = startFromCurrent(run, first, true);
  const firstProjectedReceipt = startFromControl(other, first, true);
  expect(firstProjectedReceipt).toStrictEqual(firstReceipt);
  need(HF.step(run, { until: 0, inputs: [firstReceipt] }));
  need(HF.step(other, { until: 0, inputs: [firstProjectedReceipt] }));
  const partial = HF.exportRun(run);
  expect(HF.exportRun(other)).toStrictEqual(partial);
  expect(partial.current.world.revision).toBe(1);
  expect(partial.current.pending).toContainEqual(second);
  expect(second.worldRevision).toBe(0);
  // Empty-people API proof at an action boundary; Child communication adoption is separate.
  expect(revision(compare(run, []))).toBe(1);
  expect(revision(compare(other, []))).toBe(1);
  const fromFull = startFromCurrent(run, second);
  const fromControl = startFromControl(other, second);
  expect(fromControl).toStrictEqual(fromFull);
  expect(fromFull.payload.worldRevision).toBe(1);
  const stale = { ...fromFull, payload: { ...fromFull.payload, worldRevision: second.worldRevision } };
  expect(HF.step(run, { until: 0, inputs: [stale] }).ok).toBe(false);
  expect(HF.exportRun(run)).toStrictEqual(partial);
  const restored = need(HF.restoreRun(partial));
  const replayed = need(HF.replay(partial));
  expect(replayed.fullHash).toBe(partial.hashes.full);
  expect(HF.exportRun(replayed.run)).toStrictEqual(partial);
  expect(HF.exportRun(restored)).toStrictEqual(partial);
  const fromRestored = startFromControl(restored, second);
  expect(fromRestored).toStrictEqual(fromFull);
  need(HF.step(run, { until: 0, inputs: [fromFull] }));
  need(HF.step(other, { until: 0, inputs: [fromControl] }));
  need(HF.step(restored, { until: 0, inputs: [fromRestored] }));
  expect(HF.exportRun(other)).toStrictEqual(HF.exportRun(run));
  expect(HF.exportRun(restored)).toStrictEqual(HF.exportRun(run));
  const finish = need(HF.step(run, { until: 1, inputs: [] }));
  const finishOther = need(HF.step(other, { until: 1, inputs: [] }));
  const finishRestored = need(HF.step(restored, { until: 1, inputs: [] }));
  expect(finishOther).toStrictEqual(finish);
  expect(finishRestored).toStrictEqual(finish);
  if (finish.boundary.type !== 'world-required') throw new Error('Missing actual finish boundary');
  expect(finish.boundary.requests).toHaveLength(2);
  actionRequest(finish, 'finish', 'a');
  actionRequest(finish, 'finish', 'b');
  const finishFromCurrent = (target: Run, batch: DeepReadonly<StepResult>) => {
    if (batch.boundary.type !== 'world-required') throw new Error('Missing actual finish boundary');
    const finishFull = current(target);
    return batch.boundary.requests.map((request) => {
      if (request.kind !== 'action' || request.stage !== 'finish')
        throw new Error('Expected actual finish action');
      const activity = finishFull.people[request.person]?.activity;
      if (!activity) throw new Error('Missing actual activity');
      return receipt(request, finishFull.world.revision, {
        disposition: 'completed',
        observations: [],
        outcome: {
          activityId: request.activityId,
          offerId: request.offerId,
          actionId: activity.offer.actionId,
          start: activity.startedAt,
          end: request.boundaryAt,
          status: 'completed',
          evidenceId: `finish:${request.id}`,
          actual: { exposures: [], observedProgress: [] },
          fulfills: [],
          advances: [],
        },
      });
    });
  };
  const finishFromControl = (target: Run, batch: DeepReadonly<StepResult>) => {
    if (batch.boundary.type !== 'world-required') throw new Error('Missing actual finish boundary');
    const finishRead = compare(target, ['a', 'b']);
    return batch.boundary.requests.map((request) => {
      if (request.kind !== 'action' || request.stage !== 'finish')
        throw new Error('Expected actual finish action');
      const activity = projected(finishRead, request.person).activity;
      if (!activity) throw new Error('Missing control activity');
      return receipt(request, revision(finishRead), {
        disposition: 'completed',
        observations: [],
        outcome: {
          activityId: request.activityId,
          offerId: request.offerId,
          actionId: activity.offer.actionId,
          start: activity.startedAt,
          end: request.boundaryAt,
          status: 'completed',
          evidenceId: `finish:${request.id}`,
          actual: { exposures: [], observedProgress: [] },
          fulfills: [],
          advances: [],
        },
      });
    });
  };
  const activeHeld = compare(other, ['a', 'b']);
  const activeHeldCopy = structuredClone(activeHeld);
  const receipts = finishFromCurrent(run, finish);
  const projectedReceipts = finishFromControl(other, finishOther);
  const restoredReceipts = finishFromControl(restored, finishRestored);
  expect(projectedReceipts).toStrictEqual(receipts);
  expect(restoredReceipts).toStrictEqual(receipts);
  need(HF.step(run, { until: 1, inputs: receipts }));
  need(HF.step(other, { until: 1, inputs: projectedReceipts }));
  need(HF.step(restored, { until: 1, inputs: restoredReceipts }));
  expect(HF.exportRun(other)).toStrictEqual(HF.exportRun(run));
  expect(HF.exportRun(restored)).toStrictEqual(HF.exportRun(run));
  expect(HF.readRunHistory(HF.exportRun(other))).toStrictEqual(HF.readRunHistory(HF.exportRun(run)));
  expect(HF.readRunHistory(HF.exportRun(restored))).toStrictEqual(HF.readRunHistory(HF.exportRun(run)));
  const next = need(HF.step(run, { until: 2, inputs: [] }));
  expect(need(HF.step(other, { until: 2, inputs: [] }))).toStrictEqual(next);
  expect(need(HF.step(restored, { until: 2, inputs: [] }))).toStrictEqual(next);
  expect(HF.exportRun(other)).toStrictEqual(HF.exportRun(run));
  expect(HF.exportRun(restored)).toStrictEqual(HF.exportRun(run));
  expect(HF.readRunHistory(HF.exportRun(other))).toStrictEqual(HF.readRunHistory(HF.exportRun(run)));
  expect(HF.readRunHistory(HF.exportRun(restored))).toStrictEqual(HF.readRunHistory(HF.exportRun(run)));
  expect(activeHeld).toStrictEqual(activeHeldCopy);
  expectDeepFrozen(activeHeld);
  expect(held).toStrictEqual(heldCopy);
  expectDeepFrozen(held);
});
