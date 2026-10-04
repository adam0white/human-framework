/** Security review H2 (docs/reviews/2026-10-04-h2-security.md S1–S3): restore holds crafted saves to sane minutes and bounds. */
import { describe, expect, test } from 'vitest';
import * as H from '../src/index.ts';

const base = (): Record<string, unknown> => {
  const p = H.createPerson({
    id: 'a',
    name: 'A',
    seed: 1,
    now: 600,
    bornAt: 600 - 30 * H.MINUTES_PER_YEAR,
    sex: 'female',
  });
  H.enableGists(p);
  return JSON.parse(JSON.stringify(H.snapshot(p))) as Record<string, unknown>;
};

describe('restore: crafted saves (security review H2)', () => {
  test('an infinite, huge or missing minute is refused; an infinite bornAt falls back', () => {
    for (const now of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1e18, Number.NaN, '1'])
      expect(() => H.restore({ ...base(), now }), String(now)).toThrow(/now/);
    const j = base();
    (j.life as Record<string, unknown>).bornAt = Number.NEGATIVE_INFINITY;
    expect(Number.isFinite(H.restore(j).life.bornAt)).toBe(true);
  });

  test('tick never spins on a minute too large to step', () => {
    const p = H.restore(base());
    p.now = 6e17;
    H.tick(p, 6e17 + 1000);
    expect(p.now).toBe(6e17 + 1000);
  });

  test('oversized lists come back within the live bounds, the most salient kept', () => {
    const j = base();
    const mem = j.memory as Record<string, unknown>;
    mem.gists = Array.from({ length: 5000 }, (_, i) => ({
      id: `g${i}`,
      at: 0,
      kind: 'outcome',
      valence: -0.5,
      salience: i / 10_000,
      summary: 's',
      tags: [],
      count: 1,
      firstAt: 0,
      lastAt: 0,
      weight: 1,
      peak: 0.5,
    }));
    j.trace = Array.from({ length: 1000 }, () => ({}));
    const p = H.restore(j);
    expect(p.memory.gists).toHaveLength(H.GIST_DEFAULTS.maxGists);
    expect(Math.min(...(p.memory.gists ?? []).map((g) => g.salience))).toBeGreaterThan(0.49);
    expect(p.trace.length).toBeLessThanOrEqual(32);
  });

  test('a save the engine wrote is unchanged by the bounds', () => {
    const j = base();
    expect(JSON.parse(JSON.stringify(H.snapshot(H.restore(j))))).toEqual(j);
  });
});
