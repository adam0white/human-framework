/** SCOPE: live branches retain complete native evidence and isolate subsequent host receipts.
 * Cold files still recover through restoreRun; a fork accepts only an existing opaque Run.
 */
import { expect, test } from 'vitest';
import * as HF from '../src/index.ts';
import {
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

test('a live fork preserves pending work and history while keeping its source and journal cursor independent', () => {
  const source = setup();
  const offers = exampleOffers('ada');
  const book = new Map([['ada', offers]]);
  const reached = need(HF.step(source, { until: START, inputs: openingInputs([{ id: 'ada', offers }]) }));
  expect(reached.boundary.type).toBe('world-required');
  const before = HF.exportRun(source);
  const journal = need(HF.exportRunJournal(source));
  const branch = HF.forkRun(source);
  expect(branch).not.toBe(source);
  expect(Object.keys(branch)).toEqual([]);
  expect(Object.isFrozen(branch)).toBe(true);
  expect(HF.exportRun(branch)).toStrictEqual(before);
  expect(HF.exportRunJournal(branch, journal.cursor).ok).toBe(false);
  const cold = need(HF.restoreRun(JSON.parse(JSON.stringify(before))));
  const branchHost = freshHost(),
    coldHost = freshHost();
  serve(branch, branchHost, book, START + 60 * MINUTE, [], reached);
  serve(cold, coldHost, book, START + 60 * MINUTE, [], reached);
  expect(branchHost.completed).toBeGreaterThan(0);
  expect(HF.exportRun(branch)).toStrictEqual(HF.exportRun(cold));
  expect(HF.exportRun(source)).toStrictEqual(before);
  expect(need(HF.exportRunJournal(source, journal.cursor)).chunk).toBe(null);
  const sourceHost = freshHost();
  serve(source, sourceHost, book, START + 60 * MINUTE, [], reached);
  expect(HF.exportRun(source)).toStrictEqual(HF.exportRun(branch));
  expect(() => HF.forkRun({} as HF.Run)).toThrow();
});

test('headless live and cold branches preserve full replay and the same next accepted continuation', () => {
  const source = setup();
  const offers = exampleOffers('ada');
  const book = new Map([['ada', offers]]);
  const host = freshHost();
  serve(source, host, book, START + 60 * MINUTE, openingInputs([{ id: 'ada', offers }]));
  const checkpoint = HF.exportRun(source);
  const branch = HF.forkRun(source);
  const cold = need(HF.restoreRun(JSON.parse(JSON.stringify(checkpoint))));
  const branchHost = structuredClone(host),
    coldHost = restoredHost(checkpoint);
  for (const [run, world] of [
    [branch, branchHost],
    [cold, coldHost],
  ] as const)
    serve(run, world, book, START + 120 * MINUTE);
  const after = HF.exportRun(branch);
  expect(after).toStrictEqual(HF.exportRun(cold));
  expect(HF.exportRun(source)).toStrictEqual(checkpoint);
  expect(need(HF.replay(after)).fullHash).toBe(after.hashes.full);
  const restored = need(HF.restoreRun(JSON.parse(JSON.stringify(after))));
  serve(branch, branchHost, book, START + 150 * MINUTE);
  serve(restored, restoredHost(after), book, START + 150 * MINUTE);
  expect(HF.exportRun(branch)).toStrictEqual(HF.exportRun(restored));
});
