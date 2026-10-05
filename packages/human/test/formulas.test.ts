/**
 * Direct tests of exported formula helpers and host setters that were covered only through their callers
 * (deferred from 2.0): the age curves of family/, the partnering fit terms, and the state setters
 * `gistsFor`, `widow`, `understandNorm` and `adoptVoiceTrust`.
 */
import { describe, expect, test } from 'vitest';
import {
  adoptVoiceTrust,
  ageFit,
  attachmentPlasticity,
  conceive,
  createPerson,
  enableGists,
  femaleFecundity,
  GIST_DEFAULTS,
  gistsFor,
  MUSLIM_CUSTOM,
  maleFertility,
  marry,
  pregnancyWeeks,
  spousesOf,
  understandNorm,
  valuePlasticity,
  valuesSimilarity,
  widow,
} from '../src/index.ts';
import type { Gist, Person, PersonSpec } from '../src/types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../src/types.ts';

const NOW = 6 * 60;

function adult(id: string, sex: 'female' | 'male', age: number, extra: Partial<PersonSpec> = {}): Person {
  return createPerson({
    id,
    name: id,
    seed: 7,
    now: NOW,
    bornAt: NOW - age * MINUTES_PER_YEAR,
    sex,
    ...extra,
  });
}

describe('family age curves', () => {
  test('female fecundity: 0 before 15 and from 50, full to 30, half at 37, 0.4 at 42, falling to 0 at 50', () => {
    expect(femaleFecundity(14.9)).toBe(0);
    expect(femaleFecundity(15)).toBe(1);
    expect(femaleFecundity(30)).toBe(1);
    expect(femaleFecundity(37)).toBeCloseTo(0.5, 12);
    expect(femaleFecundity(42)).toBeCloseTo(0.4, 12);
    expect(femaleFecundity(46)).toBeCloseTo(0.2, 12);
    expect(femaleFecundity(50)).toBe(0);
    for (let a = 30; a < 50; a += 0.5)
      expect(femaleFecundity(a + 0.5)).toBeLessThanOrEqual(femaleFecundity(a));
  });

  test('male fertility: 0 before 15, full to 40, then falling to a floor of 0.7 at 60', () => {
    expect(maleFertility(14)).toBe(0);
    expect(maleFertility(40)).toBe(1);
    expect(maleFertility(50)).toBeCloseTo(0.85, 12);
    expect(maleFertility(60)).toBeCloseTo(0.7, 12);
    expect(maleFertility(90)).toBe(0.7);
  });

  test('value plasticity is full to 12 and gone at 25; attachment plasticity is full to 3 and 0.1 from 12', () => {
    expect(valuePlasticity(12)).toBe(1);
    expect(valuePlasticity(18.5)).toBeCloseTo(0.5, 12);
    expect(valuePlasticity(25)).toBe(0);
    expect(valuePlasticity(60)).toBe(0);
    expect(attachmentPlasticity(3)).toBe(1);
    expect(attachmentPlasticity(7.5)).toBeCloseTo(0.55, 12);
    expect(attachmentPlasticity(12)).toBeCloseTo(0.1, 12);
    expect(attachmentPlasticity(40)).toBe(0.1);
  });

  test('pregnancy weeks count from conception; 0 without a pregnancy', () => {
    const mother = adult('m', 'female', 25);
    const father = adult('f', 'male', 27);
    expect(pregnancyWeeks(mother)).toBe(0);
    conceive(mother, father, 1, NOW);
    expect(pregnancyWeeks(mother, NOW)).toBe(0);
    expect(pregnancyWeeks(mother, NOW + 10 * 7 * MINUTES_PER_DAY)).toBeCloseTo(10, 12);
  });
});

describe('partnering fit terms', () => {
  test('age fit: 0 under 16, full within 5 years, linear to its 0.1 floor at 18.5 years apart', () => {
    const at = (age: number) => adult(`a${age}`, 'male', age);
    expect(ageFit(at(15), at(20))).toBe(0);
    expect(ageFit(at(25), at(30))).toBeCloseTo(1, 9);
    expect(ageFit(at(20), at(32.5))).toBeCloseTo(0.5, 9);
    expect(ageFit(at(20), at(38.5))).toBeCloseTo(0.1, 9);
    expect(ageFit(at(20), at(60))).toBe(0.1);
    expect(ageFit(at(25), at(40))).toBeCloseTo(ageFit(at(40), at(25)), 12);
  });

  test('values similarity is 1 for equal values, symmetric, and lower the further apart they are', () => {
    const a = adult('a', 'male', 30, { values: { tradition: 0.9, hedonism: 0.1 } });
    const b = adult('b', 'female', 30, { values: { tradition: 0.9, hedonism: 0.1 } });
    const c = adult('c', 'female', 30, { values: { tradition: 0.1, hedonism: 0.9 } });
    expect(valuesSimilarity(a, b)).toBeCloseTo(1, 12);
    expect(valuesSimilarity(a, c)).toBeCloseTo(valuesSimilarity(c, a), 12);
    expect(valuesSimilarity(a, c)).toBeLessThan(valuesSimilarity(a, b));
  });
});

describe('host setters', () => {
  test('widow ends the open marriage once, with the custom’s waiting period for a widow and none for a widower', () => {
    const a = adult('amin', 'male', 40);
    const b = adult('banu', 'female', 38);
    expect(marry(a, b, NOW, MUSLIM_CUSTOM).ok).toBe(true);
    const at = NOW + 3 * MINUTES_PER_YEAR;
    expect(widow(b, a.id, at)).toBe(true);
    expect(spousesOf(b)).toEqual([]);
    expect(b.bonds?.marriages[0]).toMatchObject({ spouseId: a.id, endedAt: at, end: 'widowed' });
    expect(b.bonds?.mourning).toEqual({
      forId: a.id,
      since: at,
      until: at + MUSLIM_CUSTOM.mourningDays.widow * MINUTES_PER_DAY,
    });
    expect(widow(b, a.id, at + 1)).toBe(false);
    expect(widow(a, b.id, at)).toBe(true);
    expect(a.bonds?.mourning).toBeUndefined();
    expect(widow(adult('c', 'male', 30), a.id, at)).toBe(false);
  });

  test('understandNorm adds a held norm, then replaces standing and conviction; an invalid standing is ignored', () => {
    const p = adult('p', 'female', 20);
    const n = p.conscience.norms.length;
    expect(understandNorm(p, 'test-norm', 'recommended', 0.4)).toEqual({
      normId: 'test-norm',
      standing: 'recommended',
      conviction: 0.4,
    });
    expect(p.conscience.norms).toHaveLength(n + 1);
    understandNorm(p, 'test-norm', 'obligatory', 2);
    expect(p.conscience.norms.find((x) => x.normId === 'test-norm')).toEqual({
      normId: 'test-norm',
      standing: 'obligatory',
      conviction: 1,
    });
    expect(understandNorm(p, 'test-norm', 'nonsense' as never, 0.5)).toBeUndefined();
    expect(understandNorm(p, 'other', 'recommended', Number.NaN)?.conviction).toBe(0);
    expect(p.conscience.norms).toHaveLength(n + 2);
  });

  test('adoptVoiceTrust moves trust a fraction of the way to the target and adds a missing voice', () => {
    const p = adult('p', 'male', 10, { voices: [{ voiceId: 'mother', trust: 0.2 }] });
    expect(adoptVoiceTrust(p, 'mother', 0.8, 0.5).trust).toBeCloseTo(0.5, 12);
    expect(adoptVoiceTrust(p, 'mother', 0.8, 0).trust).toBeCloseTo(0.5, 12);
    expect(adoptVoiceTrust(p, 'mother', Number.NaN, 1).trust).toBeCloseTo(0.5, 12);
    const added = adoptVoiceTrust(p, 'uncle', 1, 1);
    expect(added.trust).toBe(1);
    expect(p.will.voices.some((v) => v.voiceId === 'uncle')).toBe(true);
  });

  test('gistsFor: full weight by action (and target), place weight by place, scaled by salience', () => {
    const p = adult('p', 'female', 30);
    expect(gistsFor(p, { action: 'fish' })).toEqual([]);
    enableGists(p);
    const gist = (id: string, over: Partial<Gist>): Gist => ({
      id,
      at: NOW,
      kind: 'outcome',
      valence: 0.5,
      salience: 0.8,
      summary: id,
      tags: [],
      count: 1,
      firstAt: NOW,
      lastAt: NOW,
      weight: 1,
      peak: 0.8,
      ...over,
    });
    p.memory.gists = [
      gist('g0', { action: 'fish', placeId: 'river' }),
      gist('g1', { action: 'fish', targetId: 'ali', salience: 0.5 }),
      gist('g2', { action: 'swim', placeId: 'river', salience: 0.6 }),
    ];
    const ids = (xs: { gist: Gist; weight: number }[]) => xs.map((x) => [x.gist.id, x.weight]);
    expect(ids(gistsFor(p, { action: 'fish' }))).toEqual([
      ['g0', 0.8],
      ['g1', 0.5],
    ]);
    expect(ids(gistsFor(p, { action: 'fish', targetId: 'ali' }))).toEqual([['g1', 0.5]]);
    expect(ids(gistsFor(p, { action: 'wade', placeId: 'river' }))).toEqual([
      ['g0', GIST_DEFAULTS.placeWeight * 0.8],
      ['g2', GIST_DEFAULTS.placeWeight * 0.6],
    ]);
  });
});
