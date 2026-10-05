/**
 * The G3-2 gate, approximated headlessly (spec §10: "a fresh tester names one watcher's fear and one bond,
 * unprompted, within three nights"). A tester can only name what the game shows, so this checks that within
 * three nights the dawn pages put in some watcher's own words a fear of a named stretch of wall with its cause,
 * and a bond with a named person or family. Two Keepers: one who plans against the warning with the lantern
 * (`matched`), one who leaves the standing posts (`usual`). Cards are left unanswered: people decide alone.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { type PlanName, planInputs } from '../../../test/watch/plans.ts';
import { WatchRun } from './run.ts';

const SEEDS = Array.from({ length: 24 }, (_, i) => 1000 + i * 7919);

const FEAR =
  /(couldn’t stay at|couldn’t move at|came right up under me at|breathing under|to the foot of|had my leg|don’t like the|knocked me flat at|went down at|hit me at|stood like a post at|At the .* I just|got down off|right under the|I left the|kept looking over at|glad not to be on|Every sound from|again\. I hate that stretch|something about the|Don’t put me on)/;
const BOND =
  /(was beside me|got me off the wall|had to get \w+ down|I went to|kept one eye on|next to me I could stand it|because \w+ stayed|turn my back with)/;

interface Seen {
  fear: string | null;
  bond: string | null;
  fearNight: number;
  bondNight: number;
  moments: number;
  lost: number;
}

export function watchThree(seed: number, plan: PlanName): Seen {
  const run = new WatchRun(seed);
  run.input({ k: 'start' });
  const seen: Seen = { fear: null, bond: null, fearNight: 0, bondNight: 0, moments: 0, lost: 0 };
  for (let n = 1; n <= 3; n++) {
    for (const i of planInputs(run.state, plan, true)) run.input(i);
    run.input({ k: 'begin' });
    while (run.state.phase === 'night') run.step();
    seen.moments += run.state.momentLog.length;
    seen.lost += run.state.history.at(-1)?.lost ?? 0;
    for (const v of run.state.dawn?.voices ?? []) {
      if (!seen.fear && FEAR.test(v.text)) {
        seen.fear = `${v.who}: ${v.text}`;
        seen.fearNight = n;
      }
      if (!seen.bond && BOND.test(v.text)) {
        seen.bond = `${v.who}: ${v.text}`;
        seen.bondNight = n;
      }
    }
    if (run.state.phase !== 'dawn') break;
    run.input({ k: 'toDusk' });
  }
  return seen;
}

describe('G3-2 gate: a fear and a bond in the watchers’ own words within three nights', () => {
  const summarise = (plan: PlanName) => {
    const runs = SEEDS.map((seed) => watchThree(seed, plan));
    return {
      plan,
      runs,
      fear: runs.filter((r) => r.fear).length,
      bond: runs.filter((r) => r.bond).length,
      both: runs.filter((r) => r.fear && r.bond).length,
      moments: runs.reduce((a, r) => a + r.moments, 0) / runs.length,
    };
  };
  let rows: ReturnType<typeof summarise>[] = [];
  // The runs are made once, before the tests, not while collecting them.
  beforeAll(() => {
    rows = (['matched', 'usual'] as const).map(summarise);
  }, 300_000);

  it('prints the table and examples', () => {
    for (const r of rows) {
      console.log(
        `${r.plan.padEnd(8)} fear ${r.fear}/${SEEDS.length} bond ${r.bond}/${SEEDS.length} both ${r.both}/${SEEDS.length} cards/run ${r.moments.toFixed(2)}`,
      );
      for (const x of r.runs.slice(0, 3))
        console.log(`  fear n${x.fearNight} ${x.fear}\n  bond n${x.bondNight} ${x.bond}`);
    }
    expect(rows).toHaveLength(2);
  });

  it('a planning Keeper hears a fear and a bond on most seeds', () => {
    const m = rows.find((r) => r.plan === 'matched');
    expect(m?.both ?? 0).toBeGreaterThanOrEqual(Math.ceil(SEEDS.length * 0.75));
  });

  it('cards come, but not every night', () => {
    const m = rows.find((r) => r.plan === 'matched');
    expect(m?.moments ?? 0).toBeGreaterThan(0.5);
    expect(m?.moments ?? 0).toBeLessThanOrEqual(9);
  });
});
