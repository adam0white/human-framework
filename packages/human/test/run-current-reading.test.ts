/** SCOPE: explicit host control data through inspect, with exact cold-current semantics.
 * Public authored work and public world receipts supply the headless control. */
import { expect, test } from 'vitest';
import * as HF from '../src/index.ts';
import type { DeepReadonly, Run, RunState } from '../src/run-schema.ts';
import { emptyRunSpec } from './run-fixture.ts';
import {
  actionRequest,
  authoredPerson,
  exampleOffers,
  freshHost,
  MINUTE,
  need,
  openingInputs,
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
});
