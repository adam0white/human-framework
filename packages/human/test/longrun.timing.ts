/**
 * Wall-clock budget for the L5 control scenario at full size: 25 founders aged 0..70 lived by routine for 50 years,
 * with marriages and births keeping the settlement near 25. Run with `npm run bench`; the correctness half (aging, death, no flat
 * lines, save/resume) is asserted at a smaller size in longrun.test.ts. Prints the numbers the release notes quote.
 */
import { describe, expect, test } from 'vitest';
import { liveCommunity, type Person, snapshot } from '../src/index.ts';
import { families, routineFor, settlement, YEAR } from './longrun-fixture.ts';

/** Budget multiplier: 1 on the quiet dev machine the budgets were set on; CI sets `BENCH_SCALE` (see ci.yml). */
const SCALE = Number(process.env.BENCH_SCALE ?? 1);

const range = (xs: number[]) => `${Math.min(...xs).toFixed(3)}..${Math.max(...xs).toFixed(3)}`;

describe('long run throughput', () => {
  test('25 people for 50 years by routine in under ten seconds', () => {
    // Warm the hot paths first so the measurement is steady-state throughput, not JIT compilation.
    const warm = settlement(5, 9);
    liveCommunity(warm, YEAR, { routineFor, onDay: families(5), lifecourse: { mortality: true } });

    const c = settlement(25, 1);
    const founders = c.people.map((p) => ({ ...p.traits }));
    const t0 = performance.now();
    let deaths = 0;
    let onsets = 0;
    for (let y = 1; y <= 50; y++) {
      const r = liveCommunity(c, y * YEAR, {
        routineFor,
        onDay: families(25),
        lifecourse: { mortality: true, chronicOnsets: true },
      });
      deaths += r.events.filter((e) => e.kind === 'died').length;
      onsets += r.events.filter((e) => e.kind === 'onset').length;
    }
    const ms = performance.now() - t0;
    const alive = c.people.filter((p) => p.body.alive);
    const of = (f: (p: Person) => number) => range(alive.map(f));
    const bytes = c.people.map((p) => JSON.stringify(snapshot(p)).length);
    const marriages = c.people.flatMap((p) => p.bonds?.marriages ?? []);
    const widowed = marriages.filter((m) => m.end === 'widowed').length;
    const parentsOf = (p: Person) =>
      p.social.relationships.filter((r) => r.roles.includes('parent')).map((r) => r.otherId);
    const grandchildren = c.people.filter((p) => parentsOf(p).some((id) => id.startsWith('k'))).length;
    console.log(
      [
        `long run 25 founders x 50 years: ${ms.toFixed(0)} ms`,
        `people ${c.people.length}, alive ${alive.length}, deaths ${deaths}, chronic onsets ${onsets}`,
        `marriages ${marriages.length / 2}, widowed ${widowed}, grandchildren ${grandchildren}`,
        `emotionality: founders ${range(founders.map((t) => t.emotionality))}, alive at 50 years ${of((p) => p.traits.emotionality)}`,
        `farming ${of((p) => p.skills.farming?.level ?? 0)}, mood ${of((p) => p.affect.mood.valence)}, ties ${of((p) => p.social.relationships.length)}`,
        `saved bytes per person: ${Math.min(...bytes)}..${Math.max(...bytes)}`,
      ].join('\n'),
    );
    expect(deaths).toBeGreaterThan(5);
    expect(ms).toBeLessThan(10_000 * SCALE);
  }, 120_000);
});
