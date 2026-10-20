import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { withHistoricPersonEngine } from '../../../test/support/engine-stamp.ts';
import { NIGHT_LENGTH, WINTER_RULES } from './config.ts';
import { planNight } from './night.ts';
import { endState, type PlaytestExport, replay, ruleHash, WatchRun } from './run.ts';
import type { WatchState } from './state.ts';

// These fixtures were captured under engine 2.9.0; later engines change only the person stamp for these runs.
const atCaptured = (s: WatchState): WatchState => withHistoricPersonEngine(s, '2.9.0', true) as WatchState;

const fixture = (scenario: number): PlaytestExport =>
  JSON.parse(
    readFileSync(
      new URL(`../../../test/fixtures/watch-scenario${scenario}-2026-10-20.json`, import.meta.url),
      'utf8',
    ),
  );

function start(milder = false): WatchRun {
  const r = new WatchRun(7);
  if (milder) r.input({ k: 'winter', winter: 'milder' });
  r.input({ k: 'start' });
  return r;
}

describe('scenario 12 winter choice', () => {
  it('keeps the default state and event sequence identical to scenario 11', () => {
    const exp = fixture(11);
    const current = new WatchRun(exp.seed);
    const sequence = createHash('sha256');
    let idx = 0;
    while (current.state.minute < exp.endMinute || idx < exp.inputs.length) {
      for (let e = exp.inputs[idx]; e && e.m === current.state.minute; e = exp.inputs[idx]) {
        expect(current.input(e.i)).toBe(true);
        sequence.update(JSON.stringify(atCaptured(current.state))).update('\n');
        idx++;
      }
      // Full JSON includes all events, alerts, memories and rule state, not only the end hash.
      sequence.update(JSON.stringify(atCaptured(current.state))).update('\n');
      if (current.state.minute >= exp.endMinute && idx === exp.inputs.length) break;
      current.step();
    }
    // Captured from the complete scenario-11 sim at 0f08985, extracted outside the repository.
    expect(sequence.digest('hex')).toBe('f51bd92a1f1f6b79a71b50acd01d105f73e31de15f0803aefdda314a1169e424');
    expect(current.export().scenario).toBe(12);
    expect(current.export().end.ruleHash).toBe('3c84c1c3');
    expect(ruleHash(replay({ ...exp, scenario: 12 }))).toBe(exp.end.ruleHash);
    expect(endState(atCaptured(replay(exp))).fullHash).toBe(exp.end.fullHash);
  });

  it('applies a choice at first dusk, and a later choice only at the next dusk', () => {
    const r = new WatchRun(7);
    const original = structuredClone(r.state.spawns);
    expect(r.input({ k: 'winter', winter: 'milder' })).toBe(true);
    expect(r.state.winterSetting).toEqual({ active: 'hard', next: 'milder' });
    expect(r.state.spawns).toEqual(original);
    r.input({ k: 'start' });
    expect(r.state.winterSetting?.active).toBe('milder');
    expect(r.state.spawns.map((s) => s.at)).toEqual(original.map((s) => s.at + 45));
    r.input({ k: 'begin' });
    const plan = structuredClone(r.state.spawns);
    const before = ruleHash(r.state);
    r.input({ k: 'winter', winter: 'hard' });
    expect(ruleHash(r.state)).not.toBe(before);
    expect(r.state.winterSetting).toEqual({ active: 'milder', next: 'hard' });
    expect(r.state.spawns).toEqual(plan);
    const resumed = WatchRun.resume(r.snapshot());
    while (r.state.phase === 'night') {
      r.step();
      resumed.step();
    }
    expect(r.input({ k: 'toDusk' })).toBe(true);
    expect(resumed.input({ k: 'toDusk' })).toBe(true);
    expect(r.state.winterSetting).toEqual({ active: 'hard', next: 'hard' });
    expect(resumed.state).toEqual(r.state);
    expect(replay(r.export())).toEqual(r.state);
  });

  it('delays the same packs without changing their count, size, sections or RNG stream', () => {
    for (const year of [1, 2])
      for (let seed = 1; seed <= 20; seed++) {
        const hard = new WatchRun(seed).state;
        hard.year = year;
        hard.winterNight = 6;
        if (year === 2) hard.winter.twist = 'inside';
        const milder = structuredClone(hard);
        milder.winterSetting = { active: 'milder', next: 'milder' };
        planNight(hard);
        planNight(milder);
        expect(milder.world).toEqual(hard.world);
        const latest = hard.nightStart + NIGHT_LENGTH - WINTER_RULES.milder.approachReserve;
        const last = Math.max(...hard.spawns.map((s) => s.at));
        const delay = Math.max(0, Math.min(WINTER_RULES.milder.packDelay, latest - last));
        expect(milder.spawns).toEqual(hard.spawns.map((s) => ({ ...s, at: s.at + delay })));
        // Leave enough night for even a slow thief to reach and climb the wall.
        expect(Math.max(...milder.spawns.map((s) => s.at)) + 90).toBeLessThan(hard.nightStart + NIGHT_LENGTH);
      }
  });

  it('warns earlier on the same approach without slowing the threat', () => {
    const times = [false, true].map((milder) => {
      const r = start(milder);
      r.input({ k: 'begin' });
      r.state.spawns = [];
      r.state.posts = {};
      r.state.tokens = [
        {
          id: 1,
          kind: 'wolf',
          section: 'east',
          pos: 0,
          hp: 1,
          climb: 0,
          state: 'coming',
          since: r.state.minute,
        },
      ];
      let warning = -1;
      for (let i = 0; i < 50; i++) {
        r.step();
        if (warning < 0 && r.state.alerts.some((a) => a.kind === 'motion')) warning = r.state.minute;
        if (r.state.tokens[0]?.state === 'foot') return { warning, foot: r.state.minute };
      }
      throw new Error('threat never reached the wall');
    });
    expect(times[0]?.foot).toBe(times[1]?.foot);
    expect((times[0]?.warning ?? 0) - (times[1]?.warning ?? 0)).toBeGreaterThanOrEqual(5);
  });

  it.each([9, 10, 11])('rejects winter inputs in scenario %i', (scenario) => {
    expect(() =>
      replay({
        scenario,
        seed: 7,
        inputs: [{ m: 1020, i: { k: 'winter', winter: 'milder' } }],
        endMinute: 1020,
      }),
    ).toThrow(/vocabulary/);
  });

  it('replays and resumes the pinned milder-winter fixture', () => {
    const exp = fixture(12);
    expect(exp.inputs.some((e) => e.i.k === 'winter')).toBe(true);
    expect(exp.end.winterSetting?.active).toBe('milder');
    const s = replay(exp);
    expect(ruleHash(s)).toBe(exp.end.ruleHash);
    expect(endState(atCaptured(s)).fullHash).toBe(exp.end.fullHash);
    const direct = new WatchRun(exp.seed, { scenario: 12, seed: exp.seed, log: exp.inputs, state: s });
    const resumed = WatchRun.resume(direct.snapshot());
    for (let i = 0; i < 30; i++) {
      direct.step();
      resumed.step();
    }
    expect(resumed.state).toEqual(direct.state);
    expect(replay(resumed.export())).toEqual(resumed.state);
  });
});
