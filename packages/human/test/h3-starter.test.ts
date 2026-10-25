import { expect, test } from 'vitest';
import { control } from '../examples/h3-starter/control.ts';
import { Starter } from '../examples/h3-starter/starter.ts';

test('starter settles work, preserves full restore/replay and leaves withheld work incomplete', () => {
  for (const seed of [7, 42]) expect(control(seed).restoredExact).toBe(true);
});
test('invalid clock input leaves the host unchanged', () => {
  const host = new Starter(7);
  const before = host.save();
  expect(() => host.apply({ until: 61, workAvailable: true })).toThrow('Advance');
  expect(host.save()).toEqual(before);
});
