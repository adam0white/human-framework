import { describe, expect, test } from 'vitest';
import {
  ageCharacter,
  CHARACTER_DEFAULTS,
  CHRONICLE_DEFAULTS,
  closeDay,
  consolidate,
  createPerson,
  decide,
  enableCharacterChange,
  enableGists,
  enableYearbook,
  expectedEffect,
  foldDay,
  GIST_DEFAULTS,
  MEMORY_DEFAULTS,
  noteCharacterDay,
  openDay,
  remember,
  restore,
  skip,
  snapshot,
  yearRecord,
} from '../src/index.ts';
import type { Affordance, Person } from '../src/types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../src/types.ts';

const YEAR = MINUTES_PER_YEAR;

function adult(age: number, id = 'p1', seed = 3): Person {
  const now = 8 * 60;
  return createPerson({ id, name: 'Ada', seed, now, bornAt: now - age * YEAR, sex: 'female' });
}

const swim: Affordance = {
  id: 'swim',
  action: 'swim',
  label: 'Swim in the river',
  placeId: 'river',
  duration: 60,
  effort: 0.2,
  advertises: { competence: 0.3 },
};
const walk: Affordance = { ...swim, id: 'walk', action: 'walk', label: 'Walk by the river' };

describe('lasting gists (L5)', () => {
  test('a fear learned at 20 still shapes choices at 40 after its episodes are gone', () => {
    const withGists = adult(20);
    const without = adult(20);
    enableGists(withGists);
    for (const p of [withGists, without])
      remember(p, {
        at: p.now,
        kind: 'outcome',
        action: 'swim',
        actorId: p.id,
        placeId: 'river',
        valence: -0.9,
        summary: 'nearly drowned in the river',
        tags: ['danger'],
      });
    skip(withGists, withGists.now + 20 * YEAR);
    skip(without, without.now + 20 * YEAR);
    expect(withGists.memory.episodes.some((e) => e.action === 'swim')).toBe(false);
    expect(withGists.memory.gists?.[0]).toMatchObject({ action: 'swim', count: 1 });
    expect(withGists.memory.gists?.[0]?.valence).toBeLessThan(-0.5);
    expect(expectedEffect(withGists, swim).gist?.valence).toBeLessThan(0);
    expect(expectedEffect(without, swim).gist).toBeUndefined();

    const termOf = (p: Person) =>
      decide(p, [swim, walk])
        .considered.find((c) => c.action === 'swim')
        ?.terms.find((t) => t.source === 'memory');
    expect(termOf(withGists)?.value).toBeLessThan(0);
    expect(termOf(without)).toBeUndefined();
  });

  test('gists stay bounded and weak episodes leave nothing', () => {
    const p = adult(30);
    enableGists(p);
    for (let i = 0; i < 3000; i++)
      remember(p, {
        at: p.now + i,
        kind: 'outcome',
        action: `act${i % 400}`,
        actorId: p.id,
        valence: i % 3 === 0 ? 0.1 : -0.7,
        summary: `thing ${i}`,
        tags: [],
      });
    consolidate(p, p.now + 3000 + GIST_DEFAULTS.horizon + 1);
    expect(p.memory.episodes.length).toBe(0);
    expect(p.memory.gists?.length).toBeLessThanOrEqual(GIST_DEFAULTS.maxGists);
    expect(p.memory.gists?.every((g) => Math.abs(g.valence) >= GIST_DEFAULTS.minValence)).toBe(true);
  });

  test('without gists, forgotten episodes leave nothing and the state shape is unchanged', () => {
    const p = adult(30);
    for (let i = 0; i < MEMORY_DEFAULTS.maxEpisodes + 20; i++)
      remember(p, {
        at: p.now + i,
        kind: 'outcome',
        action: 'x',
        actorId: p.id,
        valence: -0.9,
        summary: 'x',
        tags: [],
      });
    skip(p, p.now + YEAR);
    expect(p.memory.gists).toBeUndefined();
    expect('gists' in p.memory).toBe(false);
    expect(p.chronicleYears).toBeUndefined();
    expect(p.character).toBeUndefined();
  });
});

describe('yearbook (L5)', () => {
  test('days fold into bounded year records', () => {
    const p = adult(30);
    enableYearbook(p);
    for (let d = 0; d < 3 * 365; d++)
      foldDay(p, {
        day: d,
        mood: d < 365 ? -0.4 : 0.4,
        kept: 1,
        actions: [`a${d % 50}`, 'farm'],
        episodes: d % 100 === 0 ? [{ id: `e${d}`, summary: 'x', valence: 0.8, salience: 0.9 }] : [],
        alive: true,
        routine: true,
      });
    const y0 = yearRecord(p, 0);
    const y1 = yearRecord(p, 1);
    expect(y0?.days).toBe(365);
    expect(y0?.routineDays).toBe(365);
    expect(y0?.mood).toBeCloseTo(-0.4, 6);
    expect(y1?.mood).toBeCloseTo(0.4, 6);
    expect(y0?.kept).toBe(365);
    expect(y0?.actions.length).toBeLessThanOrEqual(CHRONICLE_DEFAULTS.yearActions);
    expect(y0?.actions[0]?.action).toBe('farm');
    expect(y0?.episodes.length).toBeLessThanOrEqual(CHRONICLE_DEFAULTS.yearEpisodes);
  });

  test('lived days dropped from the chronicle are folded into the year', () => {
    const p = adult(30);
    enableYearbook(p);
    openDay(p);
    const days = CHRONICLE_DEFAULTS.maxDays + 10;
    for (let d = 0; d < days; d++) {
      p.now += MINUTES_PER_DAY;
      closeDay(p);
    }
    const folded = (p.chronicleYears ?? []).reduce((n, y) => n + y.days, 0);
    expect(folded).toBe(10);
    expect(p.chronicle?.length ?? 0).toBeLessThanOrEqual(CHRONICLE_DEFAULTS.maxDays);
  });
});

describe('slow character change (L1)', () => {
  test('maturation moves traits in the age-trend directions, bounded, only when enabled', () => {
    const p = adult(20);
    const fixed = adult(20);
    enableCharacterChange(p);
    const t0 = { ...p.traits };
    const v0 = { ...p.values };
    skip(p, p.now + 30 * YEAR);
    skip(fixed, fixed.now + 30 * YEAR);
    expect(fixed.traits).toEqual(t0);
    expect(p.traits.honesty - t0.honesty).toBeCloseTo(CHARACTER_DEFAULTS.traitPerYear.honesty * 30, 6);
    expect(p.traits.emotionality).toBeLessThan(t0.emotionality);
    // Conscientiousness matures only until 40: 20 of the 30 years.
    expect(p.traits.conscientiousness - t0.conscientiousness).toBeCloseTo(
      CHARACTER_DEFAULTS.traitPerYear.conscientiousness * 20,
      6,
    );
    expect(p.values.benevolence).toBeGreaterThan(v0.benevolence);
    expect(p.values.power).toBeLessThan(v0.power);
    for (const k of Object.keys(t0) as (keyof Person['traits'])[])
      expect(Math.abs(p.traits[k] - t0[k])).toBeLessThanOrEqual(CHARACTER_DEFAULTS.maxDrift + 1e-12);
  });

  test('a hard year raises emotionality and a good one lowers it, capped per year', () => {
    const hard = adult(70); // past maturation: only experience moves traits
    const good = adult(70);
    for (const [p, mood] of [
      [hard, -0.8],
      [good, 0.8],
    ] as const) {
      enableCharacterChange(p);
      for (let d = 0; d < 365; d++) noteCharacterDay(p, { mood });
    }
    const e0 = hard.traits.emotionality;
    const nextYear = (Math.floor(hard.now / YEAR) + 1) * YEAR + 1;
    ageCharacter(hard, nextYear);
    ageCharacter(good, nextYear);
    expect(hard.traits.emotionality - e0).toBeCloseTo(CHARACTER_DEFAULTS.maxExperiencePerYear, 9);
    expect(good.traits.emotionality - e0).toBeCloseTo(-CHARACTER_DEFAULTS.maxExperiencePerYear, 9);
  });

  test('a year barely lived moves nothing; years alike settle at a set point inside the band', () => {
    const p = adult(70);
    enableCharacterChange(p);
    const e0 = p.traits.emotionality;
    for (let d = 0; d < CHARACTER_DEFAULTS.minDays - 1; d++) noteCharacterDay(p, { mood: -1 });
    ageCharacter(p, (Math.floor(p.now / YEAR) + 1) * YEAR + 1);
    expect(p.traits.emotionality).toBe(e0);
    for (let y = 2; y < 40; y++) {
      for (let d = 0; d < 365; d++) noteCharacterDay(p, { mood: -1 });
      ageCharacter(p, (Math.floor(p.now / YEAR) + y) * YEAR + 1);
    }
    const K = CHARACTER_DEFAULTS;
    const setPoint = K.maxExperiencePerYear / K.experienceReversion;
    expect(setPoint).toBeLessThan(K.maxDrift);
    expect(p.traits.emotionality - e0).toBeGreaterThan(0.9 * setPoint);
    expect(p.traits.emotionality - e0).toBeLessThanOrEqual(setPoint + 1e-9);
    // Good years after bad ones bring it back down.
    const high = p.traits.emotionality;
    for (let y = 40; y < 45; y++) {
      for (let d = 0; d < 365; d++) noteCharacterDay(p, { mood: 0.5 });
      ageCharacter(p, (Math.floor(p.now / YEAR) + y) * YEAR + 1);
    }
    expect(p.traits.emotionality).toBeLessThan(high - 0.03);
  });
});

test('gists, yearbook and character survive save and restore unchanged', () => {
  const p = adult(25);
  enableGists(p);
  enableYearbook(p);
  enableCharacterChange(p);
  remember(p, {
    at: p.now,
    kind: 'outcome',
    action: 'swim',
    actorId: p.id,
    valence: -0.9,
    summary: 'x',
    tags: [],
  });
  skip(p, p.now + 2 * YEAR);
  foldDay(p, { day: 800, mood: 0.2, actions: ['farm'], alive: true });
  for (let d = 0; d < 10; d++) noteCharacterDay(p, { mood: 0.1, socialMinutes: 30 });
  const saved = JSON.parse(JSON.stringify(snapshot(p)));
  const back = restore(saved);
  expect(back.memory.gists).toEqual(p.memory.gists);
  expect(back.chronicleYears).toEqual(p.chronicleYears);
  expect(back.character).toEqual(p.character);
  expect(JSON.stringify(snapshot(back))).toBe(JSON.stringify(snapshot(p)));
});
