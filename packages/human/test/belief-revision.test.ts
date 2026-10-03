import { describe, expect, test } from 'vitest';
import { believe, confirm, contested, credence } from '../src/beliefs/index.ts';
import { lanePerson } from './lane-fixture.ts';

describe('belief revision', () => {
  test('conflicting sources pull toward uncertainty and are reported', () => {
    const p = lanePerson('me');
    believe(p, 'osman:generous', true, 0.9, 'hacer', 0);
    const after1 = credence(p, 'osman:generous');
    believe(p, 'osman:generous', false, 0.9, 'riza', 1);
    expect(credence(p, 'osman:generous')).toBeLessThan(after1);
    expect(contested(p, 'osman:generous')).toEqual({ for: ['hacer'], against: ['riza'], contested: true });
    expect(contested(p, 'unknown').contested).toBe(false);
  });

  test('confirm returns the misled sources; a rumour confirmed false does not simply return', () => {
    const p = lanePerson('me');
    believe(p, 'riza:dishonest', true, 0.9, 'hacer', 0);
    expect(confirm(p, 'riza:dishonest', false, 10)).toEqual(['hacer']);
    const settled = credence(p, 'riza:dishonest');
    believe(p, 'riza:dishonest', true, 0.9, 'osman', 20);
    const withDiscount = credence(p, 'riza:dishonest');
    // The same telling to someone who never observed moves much further.
    const r = lanePerson('r');
    believe(r, 'x', true, 0.9, 'osman', 0);
    expect(withDiscount - settled).toBeLessThan(credence(r, 'x') - 0.5);
    expect(withDiscount).toBeLessThan(0.5);
  });
});
