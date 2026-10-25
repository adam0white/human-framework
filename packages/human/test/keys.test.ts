import { expect, test } from 'vitest';
import { keysOf } from '../src/core/keys.ts';
import type { NeedId } from '../src/types.ts';

test('enumerates own string keys with Object.keys ordering and exclusions', () => {
  const record = Object.assign(Object.create({ inherited: 1 }), {
    z: 1,
    10: 1,
    2: 1,
    a: 1,
    [Symbol('private')]: 1,
  });
  Object.defineProperty(record, 'hidden', { value: 1 });
  expect(keysOf(record)).toEqual(['2', '10', 'z', 'a']);
});

test('keeps saved partial need order without mutating the record', () => {
  const record: Partial<Record<NeedId, number>> = JSON.parse('{"water":0.2,"food":0.4,"rest":0.1}');
  const before = JSON.stringify(record);
  const keys: NeedId[] = keysOf(record);
  expect(keys).toEqual(['water', 'food', 'rest']);
  keys.reverse();
  expect(JSON.stringify(record)).toBe(before);
  expect(keysOf({})).toEqual([]);
});
