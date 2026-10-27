/** Output retention is state. It does not disable faculties or remove accepted history. */
import { expect, test } from 'vitest';
import { exportRun, replay, restoreRun } from '../src/index.ts';
import {
  actor,
  authoredPerson,
  exampleOffers,
  freshHost,
  MINUTE,
  need,
  openingInputs,
  START,
  serve,
  setup,
} from './support.ts';

function live(trace: number) {
  const person = authoredPerson('ada', 'Ada');
  person.state.retention = { trace, chronicleDays: 120 };
  const run = setup([person]);
  const offers = exampleOffers('ada');
  serve(
    run,
    freshHost(),
    new Map([['ada', offers]]),
    START + 150 * MINUTE,
    openingInputs([{ id: 'ada', offers }]),
  );
  return run;
}

test('a smaller positive trace retains the same recent decisions and changes no actor dynamics', () => {
  const full = live(32),
    lean = live(4);
  const a = actor(full),
    b = actor(lean);
  expect(a.trace.length).toBeGreaterThan(4);
  expect(b.trace).toHaveLength(4);
  expect(b.trace).toStrictEqual(a.trace.slice(-4));
  const { trace: _at, retention: _ar, ...fullState } = a;
  const { trace: _bt, retention: _br, ...leanState } = b;
  expect(leanState).toStrictEqual(fullState);
  const archive = exportRun(lean);
  expect(archive.history).toStrictEqual(exportRun(full).history);
  expect(archive.current.receipts).toStrictEqual(exportRun(full).current.receipts);
  expect(archive.current.receipts.settlements.length).toBeGreaterThan(b.trace.length);
  const restored = need(restoreRun(archive));
  expect(actor(restored).retention).toStrictEqual({ trace: 4, chronicleDays: 120 });
  expect(exportRun(restored)).toStrictEqual(archive);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});
