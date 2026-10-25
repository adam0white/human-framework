import { expect, test } from 'vitest';
import { canonicalTickInputs } from '../src/tick-input.ts';

test('waits for the declared barrier, then orders without changing caller input', () => {
  const expected = [
    { sender: 'b', sequence: 1 },
    { sender: 'a', sequence: 2 },
    { sender: 'a', sequence: 0 },
  ];
  const inputs = expected.map((key) => ({ ...key, tick: 7, payload: key.sender }));
  const before = structuredClone(inputs);
  expect(canonicalTickInputs(7, inputs.slice(0, 2), expected)).toBeUndefined();
  expect(canonicalTickInputs(7, inputs, expected)?.map((x) => [x.sender, x.sequence])).toEqual([
    ['a', 0],
    ['a', 2],
    ['b', 1],
  ]);
  expect(inputs).toEqual(before);
  expect(canonicalTickInputs(8, [], [])).toEqual([]);
  const names = ['ä', 'a', 'B'].map((sender) => ({ sender, sequence: 0, tick: 9, payload: sender }));
  expect(canonicalTickInputs(9, names, names)?.map((input) => input.sender)).toEqual(['B', 'a', 'ä']);
});

test('rejects ambiguous identities and inputs outside the declared tick and barrier', () => {
  const key = { sender: 'a', sequence: 0 };
  const input = { ...key, tick: 7, payload: 'ask' };
  expect(() => canonicalTickInputs(7, [input, input], [key])).toThrow();
  expect(() => canonicalTickInputs(7, [], [key, key])).toThrow();
  expect(() => canonicalTickInputs(8, [input], [key])).toThrow();
  expect(() => canonicalTickInputs(7, [input], [])).toThrow();
  expect(() => canonicalTickInputs(7, [], [{ ...key, sequence: 0.5 }])).toThrow();
  expect(() =>
    canonicalTickInputs(
      7,
      [],
      Array.from({ length: 257 }, (_, sequence) => ({ ...key, sequence })),
    ),
  ).toThrow();
});
