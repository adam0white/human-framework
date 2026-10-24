import { expect, it } from 'vitest';
import { replay, ruleHash, WatchRun } from './run.ts';

it('refuses pre-cast night exports before replaying their inputs', () => {
  for (const scenario of [9, 10, 11, 13]) {
    expect(() => replay({ scenario, seed: 7, inputs: [], endMinute: 1020 })).toThrow(/scenario/);
  }
});

it('replays current night inputs with their pinned cast edition', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  for (let n = 0; n < 20; n++) run.step();
  const exp = run.export();
  expect(ruleHash(replay(exp))).toBe(exp.end.ruleHash);
});
