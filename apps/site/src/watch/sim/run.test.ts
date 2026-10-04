import { describe, expect, it } from 'vitest';
import type { Input } from './night.ts';
import { DUSK_RATE, Pacer, type Speed } from './pace.ts';
import { endState, replay, WatchRun } from './run.ts';
import { nextRandom } from './state.ts';

/**
 * A scripted Keeper driven through the real-time pacer: posts at dusk, walks the lantern, rings the bell and
 * changes speed at fixed sim minutes, while real time arrives in an irregular tick schedule.
 */
function playScripted(seed: number, tickSeed: number, nights: number): WatchRun {
  const run = new WatchRun(seed);
  const pacer = new Pacer();
  const ticks = { rng: tickSeed };
  const speeds: Speed[] = ['watch', 'fast', 'tactical'];
  run.input({ k: 'start' });
  for (let n = 0; n < nights; n++) {
    const plan: Input[] = [
      { k: 'post', watcher: 'tamar', post: `${run.state.warned}-1` },
      { k: 'post', watcher: 'mara', post: `${run.state.warned}-2` },
      { k: 'lantern', section: run.state.warned },
    ];
    for (const i of plan) run.input(i);
    // Let some dusk pass in real time before beginning.
    for (let k = 0; k < 30; k++) pacer.tick(run, 16 + nextRandom(ticks) * 40);
    run.input({ k: 'begin' });
    let rang = 0;
    while (run.state.phase === 'night') {
      const m = run.state.minute;
      if (m % 97 === 0) pacer.speed = speeds[m % 3] ?? 'watch';
      if (m % 211 === 0) run.input({ k: 'lantern', section: m % 2 === 0 ? 'gate' : run.state.warned });
      if (rang < 2 && run.state.alerts.some((a) => a.kind === 'foot' && a.minute === m - 1)) {
        run.input({ k: 'bell' });
        rang += 1;
      }
      pacer.tick(run, 5 + nextRandom(ticks) * 250);
    }
    if (run.state.phase !== 'dawn') break;
    run.input({ k: 'toDusk' });
  }
  return run;
}

describe('Night Watch input log and playtest export', () => {
  it('logs inputs by sim minute and replays the export to the same end state', () => {
    const run = playScripted(2026, 1, 3);
    const exp = run.export();
    expect(exp.inputs.length).toBeGreaterThan(10);
    expect(exp.inputs.every((e, i) => i === 0 || e.m >= (exp.inputs[i - 1]?.m ?? 0))).toBe(true);
    const roundTrip = JSON.parse(JSON.stringify(exp));
    expect(JSON.stringify(endState(replay(roundTrip)))).toBe(JSON.stringify(exp.end));
    // Short enough to paste into a chat or an issue.
    expect(JSON.stringify(exp).length).toBeLessThan(120_000);
  });

  it('real-time pacing does not leak into the rules: two tick schedules, one log, one end state', () => {
    const a = playScripted(77, 1, 2);
    // Replaying a's log under another tick schedule: drive the pacer with different ticks, applying a's inputs.
    const b = new WatchRun(77);
    const pacer = new Pacer();
    const ticks = { rng: 999 };
    let idx = 0;
    for (let guard = 0; guard < 1_000_000; guard++) {
      for (let e = a.log[idx]; e !== undefined && e.m === b.state.minute; e = a.log[idx]) {
        expect(b.input(e.i)).toBe(true);
        idx += 1;
      }
      if (idx >= a.log.length && b.state.minute >= a.state.minute) break;
      // Never let a tick carry the clock past the next logged input.
      const next = a.log[idx];
      const room = next ? next.m - b.state.minute : 20;
      pacer.speed = 'fast';
      const before = b.state.minute;
      pacer.tick(b, Math.min(room, 1 + nextRandom(ticks) * 3) * (1000 / 12));
      if (b.state.minute === before && room <= 0) throw new Error('stuck');
    }
    expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state));
  });

  it('refuses an export from another rules version', () => {
    const exp = new WatchRun(1).export();
    expect(() => replay({ ...exp, scenario: exp.scenario + 1 })).toThrow(/scenario/);
  });

  it('a moment eases play to the tactical speed and then hands the chosen speed back', () => {
    const run = new WatchRun(5);
    const pacer = new Pacer();
    pacer.speed = 'fast';
    run.input({ k: 'start' });
    run.input({ k: 'begin' });
    let sawSlow = false;
    let sawFastAfter = false;
    while (run.state.phase === 'night') {
      const slowed = pacer.slowed(run);
      if (slowed) {
        sawSlow = true;
        // An open card slows play further, to the dusk rate, so there is time to read it.
        expect(pacer.rate(run)).toBe(
          run.state.moment && run.state.minute < run.state.moment.until ? DUSK_RATE : 1,
        );
      } else if (sawSlow) {
        sawFastAfter = true;
        expect(pacer.rate(run)).toBe(12);
      }
      pacer.tick(run, 100);
    }
    expect(sawSlow && sawFastAfter).toBe(true);
  });
});
