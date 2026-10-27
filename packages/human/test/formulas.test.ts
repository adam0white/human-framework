/** Fixed source-law references. Retired host mutators are mapped in the migration inventory. */
import { expect, test } from 'vitest';
import {
  attachmentPlasticity,
  femaleFecundity,
  maleFertility,
  pregnancyWeeks,
  valuePlasticity,
} from '../src/family/family.ts';
import { ageFit, valuesSimilarity } from '../src/partnering/partnering.ts';
import type { FamilyState, LifeCourse, Values } from '../src/run-schema.ts';

const DAY = 86_400_000;
const life = (age: number): LifeCourse => ({ bornAt: -age * 365.25 * DAY, sex: 'male' });
const values: Values = {
  benevolence: 0.5,
  universalism: 0.5,
  tradition: 0.9,
  conformity: 0.5,
  security: 0.5,
  achievement: 0.5,
  power: 0.5,
  hedonism: 0.1,
  stimulation: 0.5,
  selfDirection: 0.5,
};

test('female source fertility curve retains its age boundaries and decline', () => {
  expect(femaleFecundity(14.9)).toBe(0);
  expect(femaleFecundity(15)).toBe(1);
  expect(femaleFecundity(30)).toBe(1);
  expect(femaleFecundity(37)).toBeCloseTo(0.5, 12);
  expect(femaleFecundity(42)).toBeCloseTo(0.4, 12);
  expect(femaleFecundity(46)).toBeCloseTo(0.2, 12);
  expect(femaleFecundity(50)).toBe(0);
});

test('male source fertility curve retains its later decline and floor', () => {
  expect(maleFertility(14)).toBe(0);
  expect(maleFertility(40)).toBe(1);
  expect(maleFertility(50)).toBeCloseTo(0.85, 12);
  expect(maleFertility(60)).toBeCloseTo(0.7, 12);
  expect(maleFertility(90)).toBe(0.7);
});

test('value and attachment plasticity retain distinct developmental horizons', () => {
  expect(valuePlasticity(12)).toBe(1);
  expect(valuePlasticity(18.5)).toBeCloseTo(0.5, 12);
  expect(valuePlasticity(25)).toBe(0);
  expect(valuePlasticity(60)).toBe(0);
  expect(attachmentPlasticity(3)).toBe(1);
  expect(attachmentPlasticity(7.5)).toBeCloseTo(0.55, 12);
  expect(attachmentPlasticity(12)).toBeCloseTo(0.1, 12);
  expect(attachmentPlasticity(40)).toBe(0.1);
});

test('age fit uses actual life times in milliseconds, remains symmetric and keeps its floor', () => {
  expect(ageFit(life(15), life(20), 0)).toBe(0);
  expect(ageFit(life(25), life(30), 0)).toBeCloseTo(1, 12);
  expect(ageFit(life(20), life(32.5), 0)).toBeCloseTo(0.5, 12);
  expect(ageFit(life(20), life(38.5), 0)).toBeCloseTo(0.1, 12);
  expect(ageFit(life(20), life(60), 0)).toBe(0.1);
  expect(ageFit(life(25), life(40), 0)).toBeCloseTo(ageFit(life(40), life(25), 0), 12);
});

test('value similarity is symmetric and responds to the authored difference', () => {
  const unlike = { ...values, tradition: 0.1, hedonism: 0.9 };
  expect(valuesSimilarity(values, { ...values })).toBe(1);
  expect(valuesSimilarity(values, unlike)).toBe(valuesSimilarity(unlike, values));
  expect(valuesSimilarity(values, unlike)).toBeLessThan(1);
});

test('pregnancy weeks use conception time in milliseconds and preserve an unknown father', () => {
  const family: FamilyState = { aptitudes: {}, contactCovered: [] };
  expect(pregnancyWeeks(family, 0)).toBe(0);
  family.pregnancy = {
    id: 'pregnancy',
    mother: { kind: 'actor', id: 'mother' },
    father: { kind: 'unknown' },
    offspring: { kind: 'entity', id: 'child-reference' },
    conceivedAt: 0,
    dueAt: 280 * DAY,
    basis: { kind: 'authored', evidence: { kind: 'evidence', id: 'authored-pregnancy' } },
  };
  expect(pregnancyWeeks(family, 0)).toBe(0);
  expect(pregnancyWeeks(family, 10 * 7 * DAY)).toBe(10);
  expect(family.pregnancy.father).toEqual({ kind: 'unknown' });
});
