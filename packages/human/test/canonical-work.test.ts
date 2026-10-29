/** SCOPE: stack allocation changes preserve canonical bytes for mutable archives,
 * including repeated references, escaped scalar text and invalid scalar admission.
 */
import { expect, it } from 'vitest';
import { canonicalJson } from '../src/run-canonical.ts';

it('observes mutable repeated fragments while preserving scalar bytes and strict admission', () => {
  const child = { n: 1, text: '"\\\n', absent: null, present: true };
  const input = { z: [child, false, 0, 1.25], a: child };
  expect(canonicalJson(input)).toBe(
    '{"a":{"absent":null,"n":1,"present":true,"text":"\\"\\\\\\n"},"z":[{"absent":null,"n":1,"present":true,"text":"\\"\\\\\\n"},false,0,1.25]}',
  );
  child.n = 2;
  expect(canonicalJson(input)).toContain('"n":2');
  expect(canonicalJson(input)).not.toContain('"n":1');
  for (const value of [undefined, -0, NaN, Infinity, 1n]) expect(() => canonicalJson({ value })).toThrow();
  const cycle: unknown[] = [];
  cycle.push(cycle);
  expect(() => canonicalJson(cycle)).toThrow('cyclic JSON');
});
