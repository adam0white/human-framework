import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { planInputs } from '../../../test/watch/plans.ts';
import { playYears } from '../../../test/watch/years.ts';
import { DAY } from './config.ts';
import type { Moment } from './moments.ts';
import { DAY_RATE, Pacer } from './pace.ts';
import { type LogEntry, replay, WatchRun } from './run.ts';
import { isSeason } from './season.ts';
import type { Alert, NightNote, WatchState } from './state.ts';

/**
 * The 2026-10-19 level-up (docs/games/watch.md): refusals and leavings said in the moment with a reason and a
 * source, honest reads on every option that asks something of a person, delayed feedback on pressing and on fair
 * works, and grave news in the seasons slowed so it is seen. All of it is words and pacing: scenario 9 rules stand.
 */

const pinned = JSON.parse(
  readFileSync(new URL('../../../test/fixtures/watch-scenario9-2026-10-19.json', import.meta.url), 'utf8'),
) as { scenario: number; seed: number; inputs: LogEntry[]; endMinute: number; end: { ruleHash: string } };

interface Heard {
  alerts: Alert[];
  notes: NightNote[];
  moments: Moment[];
  s: WatchState;
}
const heard = new Map<string, Heard>();

/** Everything said on the ticker, noted for dawn and opened as a card over `years`, deduplicated (cached). */
function hear(seed: number, years: number): Heard {
  const key = `${seed}|${years}`;
  const had = heard.get(key);
  if (had) return had;
  const alerts = new Map<string, Alert>();
  const notes = new Map<string, NightNote>();
  const moments = new Map<string, Moment>();
  const run = playYears(seed, years, undefined, (s) => {
    for (const a of s.alerts) alerts.set(`${a.minute}|${a.text}`, a);
    for (const n of s.notes) notes.set(`${n.minute}|${n.who}|${n.kind}`, n);
    if (s.moment) moments.set(`${s.year}|${s.moment.id}`, s.moment);
    return false;
  });
  const out = {
    alerts: [...alerts.values()],
    notes: [...notes.values()],
    moments: [...moments.values()],
    s: run.state,
  };
  heard.set(key, out);
  return out;
}

/** Year 1 of two seeds and two years of seed 1: enough refusals, leavings, cards and a fair to check. */
const RUNS: [number, number][] = [
  [1, 2],
  [2, 1],
  [7, 1],
];

describe('Night Watch level-up (2026-10-19)', () => {
  it('refuses the pre-cast scenario 9 export before replay', () => {
    expect(pinned.scenario).toBe(9);
    expect(() => replay(pinned)).toThrow(/scenario/);
  });

  it('a refusal is said as it happens, with the watcher’s own reason; a leaving in the dark is called by a neighbour', () => {
    let refusals = 0;
    let calls = 0;
    for (const [seed, years] of RUNS) {
      const { alerts, notes } = hear(seed, years);
      for (const n of notes) {
        if (n.kind !== 'refused' && n.kind !== 'deferred' && n.kind !== 'modified') continue;
        refusals += 1;
        const said = alerts.find((a) => a.who === n.who && a.minute === n.minute && a.kind === 'person');
        expect(said?.text).toMatch(/“.+”$/);
        expect(said?.slowed).toBe(true);
      }
      for (const a of alerts.filter((x) => / calls from /.test(x.text))) {
        calls += 1;
        // The caller names the leaver, and the leaving is noted that minute.
        expect(notes.some((n) => n.who === a.who && n.minute === a.minute)).toBe(true);
      }
      // No act under the lantern falls back to a bare "Name at the wall." line.
      for (const a of alerts.filter((x) => x.kind === 'person'))
        expect(a.text).not.toMatch(/^[A-Z][a-zé]+ at (the [a-z ]+|the Gate)\.$/);
    }
    expect(refusals).toBeGreaterThan(0);
    expect(calls).toBeGreaterThan(0);
  });

  it('urging a wavering watcher shows the Keeper’s read, as the bell does', () => {
    let urges = 0;
    for (const [seed, years] of RUNS)
      for (const m of hear(seed, years).moments)
        for (const o of m.options)
          if (m.kind === 'waver' && o.id === 'urge') {
            urges += 1;
            expect(o.read).toMatch(/probably agree|agree unwillingly|might agree|will not agree|cannot tell/);
          }
    expect(urges).toBeGreaterThan(0);
  });

  it('a posting pressed for tonight is answered at dawn: held, or gone anyway', () => {
    const answers: string[] = [];
    for (const seed of [1, 2]) {
      const run = new WatchRun(seed);
      run.input({ k: 'start' });
      for (let guard = 0; guard < 200_000 && run.state.year === 1 && run.state.phase !== 'thaw'; guard++) {
        const s = run.state;
        if (s.phase === 'dusk') {
          for (const i of planInputs(s, 'matched', true, 'urge')) run.input(i);
          run.input({ k: 'begin' });
        } else if (s.phase === 'dawn') {
          for (const v of s.dawn?.voices ?? []) answers.push(v.text);
          run.input({ k: 'toDusk' });
        } else run.step();
      }
    }
    expect(
      answers.some((t) =>
        /You pressed me for|because you asked it twice|I know you pressed me|You asked hard/.test(t),
      ),
    ).toBe(true);
  });

  it('the thaw after a raised wall reports what came over it', async () => {
    const { endWinter } = await import('./season.ts');
    const run = new WatchRun(7);
    run.input({ k: 'start' });
    const s = run.state;
    s.year = 2;
    s.chronicle.push({
      year: 1,
      season: 'autumn',
      minute: s.minute,
      kind: 'fair',
      text: 'The west wall was raised and lengthened.',
    });
    endWinter(s);
    expect(s.chronicle.find((l) => l.text.startsWith('Raised at the fair'))?.text).toMatch(
      /nothing crossed .* this winter|still climbed (once|\d+ times)/,
    );
  });

  it('a death or a leaving in the open seasons slows the days to the slowest pace for two days', () => {
    const run = playYears(2, 1, undefined, (s) => s.phase === 'thaw');
    run.input({ k: 'continue' });
    if (run.state.phase === 'closed') run.input({ k: 'continue' });
    expect(isSeason(run.state)).toBe(true);
    const pacer = new Pacer();
    pacer.tick(run, 0);
    expect(pacer.speed).toBe('seasons');
    pacer.tick(run, 1000);
    // Grave news written into the chronicle (as the life rules write it).
    const s = run.state;
    s.chronicle.push({
      year: s.year,
      season: 'spring',
      minute: s.minute,
      kind: 'death',
      text: 'Someone died.',
    });
    pacer.tick(run, 0);
    expect(pacer.slowed(run)).toBe(true);
    expect(pacer.rate(run)).toBe(DAY_RATE.tactical);
    const from = s.minute;
    for (let guard = 0; guard < 400 && !s.card && pacer.rate(run) === DAY_RATE.tactical; guard++)
      pacer.tick(run, 1000);
    // About two days at the slowest pace, then the ordinary news ease (Days).
    expect(s.minute - from).toBeGreaterThanOrEqual(DAY);
    expect(s.minute - from).toBeLessThanOrEqual(3 * DAY);
    if (!s.card) expect(pacer.rate(run)).toBe(DAY_RATE.days);
  });
});
