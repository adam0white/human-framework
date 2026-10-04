/**
 * L5 control scenario: a small settlement lived by routine for 50 years. It fails on flat lines (traits, skills,
 * relationships and mood must move over the decades), requires people to age and die and the dead to be grieved, keeps
 * state bounded, and resumes from a save bit for bit. Run time is measured in longrun.timing.ts, not here.
 */
import { describe, expect, test } from 'vitest';
import {
  communityState,
  createCommunity,
  createPerson,
  enableCharacterChange,
  enableGists,
  isDeceasedTie,
  type LifeStage,
  lifeStage,
  liveCommunity,
  liveRoutine,
  type Person,
  type Routine,
  restore,
  snapshot,
} from '../src/index.ts';
import { births, DAY, routineFor, settlement, YEAR } from './longrun-fixture.ts';

const rt = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const lifecourse = { mortality: true, chronicOnsets: true };

describe('liveRoutine (one person)', () => {
  const routine: Routine = {
    activities: [
      { action: 'farm', minutes: 360, skill: { id: 'farming', difficulty: 0.3 }, valence: 0.1, keeps: true },
      { action: 'quarrel', minutes: 20, chance: 0.05, valence: -0.6, summary: 'a quarrel', with: ['q'] },
    ],
  };
  const make = (): Person => {
    const p = createPerson({ id: 'p', name: 'P', seed: 9, now: 0, bornAt: -30 * YEAR, sex: 'male' });
    enableGists(p);
    enableCharacterChange(p);
    return p;
  };

  test('the same stretch gives the same bits however it is split into whole days', () => {
    const a = make();
    const b = make();
    liveRoutine(a, 400 * DAY, routine);
    liveRoutine(b, 123 * DAY, routine);
    liveRoutine(b, 400 * DAY, routine);
    expect(rt(snapshot(b))).toEqual(rt(snapshot(a)));
  });

  test('a year of routine practises, bonds, remembers events and ages; a remainder is skipped', () => {
    const p = make();
    const notable = liveRoutine(p, YEAR + 600, routine);
    expect(p.now).toBe(YEAR + 600);
    expect(p.skills.farming?.level ?? 0).toBeGreaterThan(0.3);
    expect(p.social.relationships.find((r) => r.otherId === 'q')).toBeDefined();
    expect(notable.length).toBeGreaterThan(5);
    expect(notable.every((d) => d.episodes.length > 0)).toBe(true);
    expect(p.character?.year).toBe(1);
  });

  test('a dead person lives nothing', () => {
    const p = make();
    p.body.alive = false;
    const before = rt(snapshot(p));
    expect(liveRoutine(p, 30 * DAY, routine)).toEqual([]);
    expect({ ...rt(snapshot(p)), now: before.now }).toEqual(before);
  });
});

describe('fifty years of a settlement (L5 control)', () => {
  test('people age and die, the dead are grieved, and traits, skills, ties and mood keep moving', () => {
    const c = settlement(10, 2, 30, 70);
    type Sample = {
      traits: Person['traits'];
      skills: number;
      warmth: number;
      stage: LifeStage;
      alive: boolean;
    };
    const decades: Map<string, Sample>[] = [];
    const sample = () =>
      new Map(
        c.people.map((p) => [
          p.id,
          {
            traits: { ...p.traits },
            skills: Object.values(p.skills).reduce((n, s) => n + s.level, 0),
            warmth: p.social.relationships.reduce((n, r) => n + r.affection + r.trust, 0),
            stage: lifeStage(p),
            alive: p.body.alive,
          },
        ]),
      );
    decades.push(sample());
    const born = new Map(c.people.map((p) => [p.id, p.life.bornAt]));
    let deaths = 0;
    let stages = 0;
    for (let d = 1; d <= 5; d++) {
      const r = liveCommunity(c, d * 10 * YEAR, { routineFor, onDay: births(12), lifecourse });
      deaths += r.events.filter((e) => e.kind === 'died').length;
      stages += r.events.filter((e) => e.kind === 'stage').length;
      decades.push(sample());
    }
    // Aging and death.
    for (const p of c.people) expect(p.now).toBe(50 * YEAR);
    for (const [id, at] of born) expect(c.people.find((p) => p.id === id)?.life.bornAt).toBe(at);
    expect(deaths).toBeGreaterThanOrEqual(5);
    expect(stages).toBeGreaterThan(0);
    expect(c.people.some((p) => p.id.startsWith('k'))).toBe(true);
    const grieved = c.people.filter((p) => p.body.alive && p.social.relationships.some(isDeceasedTie));
    expect(grieved.length).toBeGreaterThan(0);

    // No flat lines: each decade, among people alive at both ends, something moved.
    for (let d = 1; d <= 5; d++) {
      const prev = decades[d - 1] as Map<string, Sample>;
      const cur = decades[d] as Map<string, Sample>;
      const both = [...cur.keys()].filter((id) => prev.get(id)?.alive && cur.get(id)?.alive);
      expect(both.length).toBeGreaterThan(2);
      const moved = (f: (s: Sample) => number, eps: number) =>
        both.filter((id) => Math.abs(f(cur.get(id) as Sample) - f(prev.get(id) as Sample)) > eps).length;
      expect(moved((s) => s.traits.emotionality, 0.002)).toBeGreaterThan(0);
      expect(
        moved((s) => s.traits.extraversion + s.traits.openness + s.traits.conscientiousness, 0.002),
      ).toBeGreaterThan(0);
      expect(moved((s) => s.skills, 0.01)).toBeGreaterThan(0);
      expect(moved((s) => s.warmth, 0.01)).toBeGreaterThan(0);
    }
    // Mood differs across years and people (from the yearbook), not one constant.
    const moods = c.people.flatMap((p) =>
      (p.chronicleYears ?? []).filter((y) => y.days > 300).map((y) => y.mood),
    );
    expect(Math.max(...moods) - Math.min(...moods)).toBeGreaterThan(0.05);
    expect(
      c.people.every((p) =>
        (p.chronicleYears ?? []).every((y) => y.moodLow <= y.mood && y.mood <= y.moodHigh),
      ),
    ).toBe(true);
    // Bounded: no one's saved state grows without limit (episodes, gists, years and ties are all capped).
    for (const p of c.people) expect(JSON.stringify(snapshot(p)).length).toBeLessThan(150_000);
  });

  test('a run saved and restored mid-way continues bit for bit', () => {
    const opts = { routineFor, onDay: births(6), lifecourse: { ...lifecourse, multiplier: 5 } };
    const a = settlement(6, 3, 20, 60);
    liveCommunity(a, 4 * YEAR, opts);
    const b = settlement(6, 3, 20, 60);
    liveCommunity(b, 2 * YEAR + 37 * DAY, opts);
    const saved = rt({ people: b.people.map(snapshot), c: communityState(b) });
    const resumed = createCommunity(
      saved.people.map((j) => restore(j)),
      saved.c,
    );
    liveCommunity(resumed, 4 * YEAR, opts);
    expect(rt(resumed.people.map(snapshot))).toEqual(rt(a.people.map(snapshot)));
  });
});
