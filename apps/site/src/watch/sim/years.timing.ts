/**
 * Game 3 fifty-year check (G3-3). Runs the game's own world for fifty years with the headless Keeper and fails on
 * flat lines: the cast must change, new generations must appear, skills, fears and ties must differ between people
 * and over time, and the granary and the wall must not give the same outcome every year. Run with `npm run bench`.
 */
import { skillLevel } from '@human/framework';
import { describe, expect, it } from 'vitest';
import { playYears } from '../../../test/watch/years.ts';
import { living } from './life.ts';
import { villager } from './people.ts';
import { fearedSection } from './voices.ts';

const SCALE = Number(
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.BENCH_SCALE ?? 1,
);
const YEARS = 50;

const spread = (xs: number[]) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);
const distinct = (xs: number[]) => new Set(xs.map((x) => Math.round(x * 100))).size;

describe('Game 3 over fifty years', () => {
  it('the village changes over fifty years and lines do not stay flat', () => {
    const ever = new Set<string>();
    const livingByYear: number[] = [];
    const genByYear: number[] = [];
    const slingSpread: number[] = [];
    const fearSpread: number[] = [];
    const tieSpread: number[] = [];
    const meanMood: number[] = [];
    const meanSling: number[] = [];
    const t0 = performance.now();
    const run = playYears(1, YEARS, (s) => {
      const people = living(s);
      for (const p of people) ever.add(p.id);
      livingByYear.push(people.length);
      genByYear.push(Math.max(0, ...people.map((p) => villager(s, p.id).gen)));
      const sling = people.map((p) => skillLevel(p, 'sling'));
      slingSpread.push(spread(sling));
      meanSling.push(sling.reduce((a, b) => a + b, 0) / Math.max(1, sling.length));
      fearSpread.push(spread(people.map((p) => fearedSection(p)?.level ?? 0)));
      meanMood.push(people.reduce((a, p) => a + p.affect.mood.valence, 0) / Math.max(1, people.length));
      tieSpread.push(spread(people.flatMap((p) => p.social.relationships.map((r) => r.affection))));
    });
    const ms = performance.now() - t0;
    const s = run.state;
    const annals = s.annals;
    const count = (k: string) => s.chronicle.filter((l) => l.kind === k).length;
    console.log(
      `watch ${YEARS} years: reached year ${s.year} (${s.phase}); ever lived ${ever.size}, living ${livingByYear.join(',')}; ` +
        `top generation ${Math.max(...genByYear)}; births ${count('birth')}, deaths ${count('death')}, marriages ${count('marriage')}, leavings ${count('leave')}, arrivals ${count('arrive')}; ` +
        `volumes ${s.volumes.length + 1}; lost per winter ${annals.map((a) => a.lostWinter).join(',')}; ` +
        `harvest ${annals.map((a) => a.harvest).join(',')}; granary at winter ${annals.map((a) => a.grainAtWinter).join(',')}; ` +
        `breaches ${annals.map((a) => a.breaches).join(',')}; hungry springs ${annals.filter((a) => a.hungry).length}`,
    );
    console.log(`watch ${YEARS}-year run: ${ms.toFixed(0)} ms`);

    expect(s.phase).not.toBe('fallen');
    expect(s.year).toBe(YEARS + 1);
    expect(annals).toHaveLength(YEARS);
    // The cast changes: far more people lived than the founding cast, and nobody from year 1 is at the wall now.
    expect(ever.size).toBeGreaterThan(3 * (livingByYear[0] ?? 0));
    expect(distinct(livingByYear)).toBeGreaterThan(4);
    expect(Math.max(...genByYear)).toBeGreaterThanOrEqual(3);
    for (const k of ['birth', 'death', 'marriage', 'leave', 'arrive']) expect(count(k), k).toBeGreaterThan(0);
    // Skills, fears and ties differ between people, and how much they differ moves over the years.
    expect(Math.min(...slingSpread.slice(5))).toBeGreaterThan(0.05);
    expect(distinct(meanSling)).toBeGreaterThan(5);
    expect(distinct(fearSpread)).toBeGreaterThan(5);
    expect(distinct(tieSpread)).toBeGreaterThan(5);
    // Mood swings by decade: the village's mean mood is not the same in every ten-year stretch.
    const decades = [0, 1, 2, 3, 4].map(
      (d) => meanMood.slice(d * 10, d * 10 + 10).reduce((a, b) => a + b, 0) / 10,
    );
    console.log(`watch mood by decade: ${decades.map((x) => x.toFixed(3)).join(', ')}`);
    expect(spread(decades)).toBeGreaterThan(0.02);
    expect(distinct(meanMood)).toBeGreaterThan(5);
    // The granary and the wall give different outcomes in different years.
    expect(distinct(annals.map((a) => a.lostWinter))).toBeGreaterThan(4);
    expect(distinct(annals.map((a) => a.harvest))).toBeGreaterThan(4);
    expect(distinct(annals.map((a) => a.grainAtWinter))).toBeGreaterThan(4);
    expect(ms).toBeLessThan(900_000 * SCALE);
  }, 1_800_000);
});
