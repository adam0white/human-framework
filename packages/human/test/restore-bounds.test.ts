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

  test('a lived save with character, impressions, bonds and gists restores byte-identical', () => {
    const mk = (id: string, seed: number, sex: 'female' | 'male') =>
      H.createPerson({ id, name: id, seed, now: 600, bornAt: 600 - 30 * H.MINUTES_PER_YEAR, sex });
    const a = mk('a', 1, 'female');
    H.enableGists(a);
    H.enableCharacterChange(a);
    for (let i = 0; i < 9; i++) {
      const b = mk(`b${i}`, 10 + i, 'male');
      H.glimpseOf(a, b, 600 + i);
      H.acquaintWith(a, b, 0.5, 600 + i);
      H.court(a, b, 600 + i * H.MINUTES_PER_DAY);
    }
    H.tick(a, 600 + 3 * H.MINUTES_PER_YEAR);
    expect(a.bonds?.courtships).toHaveLength(H.PARTNERING_DEFAULTS.maxCourtships);
    expect(a.social.impressions?.length).toBe(9);
    expect(a.character).toBeDefined();
    expect(a.memory.gists).toBeDefined();
    const s = JSON.stringify(H.snapshot(a));
    expect(JSON.stringify(H.snapshot(H.restore(JSON.parse(s))))).toBe(s);
  });
});

describe('restore: malformed values are held to their ranges (quality review H2 Q20–Q23)', () => {
  const cue = (key: string, mean: number, weight: number, at: number) => ({ key, mean, weight, at });

  test('impressions: negative cue weight drops the impression; means clamp; one per target, latest kept', () => {
    const j = base();
    (j.social as Record<string, unknown>).impressions = [
      { targetId: 'neg', seenAt: 10, cues: [cue('fear', 0.5, -1.5, 10)] },
      {
        targetId: 'x',
        seenAt: 20,
        cues: [cue('fear', 7, 1, 20), cue('tie:y', -9, 1, 20), cue('mood', 3, 1, 20), cue('fear', 0.2, 1, 5)],
      },
      { targetId: 'x', seenAt: 5, cues: [cue('pain', 0.3, 1, 5)] },
    ];
    const imps = H.restore(j).social.impressions ?? [];
    expect(imps.map((i) => i.targetId)).toEqual(['x']);
    expect(imps[0]?.seenAt).toBe(20);
    expect(imps[0]?.cues).toEqual([cue('fear', 1, 1, 20), cue('tie:y', -1, 1, 20), cue('mood', 1, 1, 20)]);
  });

  test('impressions: past the bounds the most recently seen are kept', () => {
    const j = base();
    const many = Array.from({ length: 100 }, (_, i) => ({
      targetId: `t${i}`,
      seenAt: i,
      cues: Array.from({ length: 60 }, (_, k) => cue(`trait:k${k}`, 0.5, 1, k)),
    }));
    (j.social as Record<string, unknown>).impressions = many;
    const imps = H.restore(j).social.impressions ?? [];
    expect(imps).toHaveLength(H.IMPRESSION_DEFAULTS.maxImpressions);
    expect(imps[0]?.targetId).toBe(`t${100 - H.IMPRESSION_DEFAULTS.maxImpressions}`);
    expect(imps[0]?.cues).toHaveLength(H.IMPRESSION_DEFAULTS.maxCues);
    expect(imps[0]?.cues[0]?.at).toBe(60 - H.IMPRESSION_DEFAULTS.maxCues);
  });

  test('character: wrong keys drop the slice; out-of-range values and experience are clamped', () => {
    const p = H.createPerson({ id: 'a', name: 'A', seed: 1, now: 600, bornAt: 0, sex: 'female' });
    H.enableCharacterChange(p);
    type Obj = Record<string, unknown>;
    type Saved = { character: { baseTraits: Obj; baseValues: Obj; experience: Obj; acc: Obj } };
    const good = JSON.parse(JSON.stringify(H.snapshot(p))) as Saved;
    const wrong = structuredClone(good);
    wrong.character.baseTraits = { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 };
    expect(H.restore(wrong).character).toBeUndefined();
    const big = structuredClone(good);
    big.character.baseTraits.honesty = 5;
    big.character.baseValues.power = -2;
    big.character.baseValues.extra = 0.5;
    big.character.experience = { emotionality: 3, openness: -3, power: 0.1, honesty: 'x' };
    big.character.acc.days = -4;
    big.character.acc.mood = -2;
    const c = H.restore(big).character;
    expect(c?.baseTraits.honesty).toBe(1);
    expect(c?.baseValues.power).toBe(0);
    expect(c?.baseValues).not.toHaveProperty('extra');
    expect(c?.experience).toEqual({
      emotionality: H.CHARACTER_DEFAULTS.maxDrift,
      openness: -H.CHARACTER_DEFAULTS.maxDrift,
    });
    expect(c?.acc.days).toBe(0);
    expect(c?.acc.mood).toBe(-2);
  });

  test('bonds: appeal and warmth clamp, meetings ≥ 0, one courtship per person, capped, mourning ordered', () => {
    const j = base();
    const court = (withId: string, lastAt: number, extra: Record<string, unknown> = {}) => ({
      withId,
      since: 0,
      warmth: 0.5,
      appeal: 0.5,
      meetings: 2,
      lastAt,
      ...extra,
    });
    j.bonds = {
      courtships: [
        court('x', 1, { appeal: 1e9, warmth: -3, meetings: -5 }),
        court('x', 9),
        ...Array.from({ length: 10 }, (_, i) => court(`c${i}`, 10 + i)),
        court('e', 0, { engagedAt: 0 }),
      ],
      marriages: [
        { spouseId: 's', since: 1, mourningDays: -10 },
        { spouseId: 's', since: 2 },
      ],
      mourning: { forId: 's', since: 100, until: 50 },
    };
    const b = H.restore(j).bonds;
    expect(b?.courtships).toHaveLength(H.PARTNERING_DEFAULTS.maxCourtships);
    expect(b?.courtships.some((c) => c.withId === 'e')).toBe(true);
    expect(b?.courtships.filter((c) => c.withId === 'x')).toEqual([]);
    expect(b?.marriages).toEqual([{ spouseId: 's', since: 2 }]);
    expect(b?.mourning).toBeUndefined();

    const k = base();
    k.bonds = {
      courtships: [court('x', 1, { appeal: 1e9, warmth: -3, meetings: -5 })],
      marriages: [{ spouseId: 's', since: 1, mourningDays: -10 }],
    };
    const r = H.restore(k).bonds;
    expect(r?.courtships[0]).toMatchObject({ appeal: 1, warmth: 0, meetings: 0 });
    expect(r?.marriages[0]?.mourningDays).toBe(0);
  });

  test('gists: negative weight drops the gist; fields clamp; nextGist passes the largest id', () => {
    const j = base();
    const gist = (id: string, extra: Record<string, unknown>) => ({
      id,
      at: 0,
      kind: 'outcome',
      valence: 0,
      salience: 0.5,
      summary: 's',
      tags: [],
      count: 1,
      firstAt: 0,
      lastAt: 0,
      weight: 1,
      peak: 0.5,
      ...extra,
    });
    const mem = j.memory as Record<string, unknown>;
    mem.gists = [
      gist('g3', { weight: -1 }),
      gist('g7', { salience: 4, valence: -9, peak: -1 }),
      gist('g2', {}),
    ];
    delete mem.nextGist;
    const p = H.restore(j);
    expect(p.memory.gists?.map((g) => g.id)).toEqual(['g7', 'g2']);
    expect(p.memory.gists?.[0]).toMatchObject({ salience: 1, valence: -1, peak: 0 });
    expect(p.memory.nextGist).toBe(8);
    mem.nextGist = 1;
    expect(H.restore(j).memory.nextGist).toBe(8);
  });

  test('yearbook: malformed entries drop, lists hold their bounds, one record per year in year order', () => {
    const j = base();
    const year = (y: number, extra: Record<string, unknown> = {}) => ({
      year: y,
      days: 1,
      routineDays: 0,
      mood: 0,
      moodLow: 0,
      moodHigh: 0,
      kept: 0,
      broken: 0,
      released: 0,
      breaches: 0,
      repairs: 0,
      material: 0,
      decisions: 0,
      actions: [],
      episodes: [],
      illness: [],
      alive: true,
      ...extra,
    });
    j.chronicleYears = [
      year(31, { days: 5 }),
      year(30, {
        actions: [
          { action: 'work', days: 3 },
          { action: 7, days: 1 },
          ...Array(40).fill({ action: 'x', days: 1 }),
        ],
        episodes: [{ id: 'e1', day: 1, summary: 's', valence: 0.2, salience: 0.5 }, { id: 'e2' }],
        illness: ['flu', 3],
      }),
      year(31, { days: 9 }),
      { year: 'x' },
    ];
    const ys = H.restore(j).chronicleYears ?? [];
    expect(ys.map((y) => [y.year, y.days])).toEqual([
      [30, 1],
      [31, 9],
    ]);
    expect(ys[0]?.actions).toHaveLength(4 * H.CHRONICLE_DEFAULTS.yearActions);
    expect(ys[0]?.actions[0]).toEqual({ action: 'work', days: 3 });
    expect(ys[0]?.episodes.map((e) => e.id)).toEqual(['e1']);
    expect(ys[0]?.illness).toEqual(['flu']);
  });
});
