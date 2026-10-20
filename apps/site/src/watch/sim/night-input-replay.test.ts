import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { withHistoricPersonEngine } from '../../../test/support/engine-stamp.ts';
import { endState, type PlaytestExport, replay, ruleHash, WatchRun } from './run.ts';
import type { WatchState } from './state.ts';

// These fixtures were captured under engine 2.9.0; later engines change only the person stamp for these runs.
const atCaptured = (s: WatchState): WatchState => withHistoricPersonEngine(s, '2.9.0', true) as WatchState;

const legacy = {
  scenario: 10,
  seed: 7,
  inputs: [
    { m: 1020, i: { k: 'start' as const } },
    { m: 1020, i: { k: 'begin' as const } },
  ],
  endMinute: 1240,
};

describe('night act input vocabulary and legacy continuation', () => {
  it('keeps a captured scenario 10 run and its midpoint continuation exact', () => {
    const state = replay(legacy);
    expect(ruleHash(state)).toBe('1c799a04');
    const resumed = WatchRun.resume({
      scenario: 10,
      seed: legacy.seed,
      log: legacy.inputs,
      state,
    });
    for (let i = 0; i < 80; i++) resumed.step();
    expect(ruleHash(resumed.state)).toBe('26d92083');
    expect(endState(atCaptured(resumed.state)).fullHash).toBe('efe70d11');
  });

  it.each([9, 10])('rejects new night acts in scenario %i before applying the log', (scenario) => {
    for (const i of [
      { k: 'relieve' as const, who: 'tamar', by: 'kian' },
      { k: 'help' as const, who: 'tamar', by: 'kian' },
      { k: 'down' as const, who: 'tamar' },
    ]) {
      expect(() => replay({ ...legacy, scenario, inputs: [...legacy.inputs, { m: 1080, i }] })).toThrow(
        /vocabulary|scenario/,
      );
    }
  });

  it('replays the pinned scenario 11 run with every new input to its rule hash', () => {
    const pinned = JSON.parse(
      readFileSync(
        new URL('../../../test/fixtures/watch-scenario11-2026-10-20.json', import.meta.url),
        'utf8',
      ),
    ) as PlaytestExport;
    expect(pinned.scenario).toBe(11);
    for (const k of ['relieve', 'help', 'down']) expect(pinned.inputs.some((e) => e.i.k === k)).toBe(true);
    expect(ruleHash(replay(pinned))).toBe(pinned.end.ruleHash);
  });
});
