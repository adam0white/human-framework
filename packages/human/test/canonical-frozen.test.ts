/** SCOPE: immutable canonical fragments avoid repeat traversal without caching
 * shallow-frozen containers whose children can still change. Hash bytes stay exact.
 */
import { expect, it } from 'vitest';
import { canonicalJson, hashCanonical, utf8 } from '../src/run-canonical.ts';

it('reuses deeply frozen JSON while observing mutable and shallow-frozen children', () => {
  expect([...utf8('aé𐀀\ud800')]).toEqual([97, 195, 169, 240, 144, 128, 128, 239, 191, 189]);
  let reads = 0;
  const frozen = new Proxy(Object.freeze({ a: Object.freeze([1, 2]), z: 'prior' }), {
    ownKeys(target) {
      reads++;
      return Reflect.ownKeys(target);
    },
  });
  expect(canonicalJson(frozen)).toBe('{"a":[1,2],"z":"prior"}');
  reads = 0;
  const first = hashCanonical('frozen-control', { frozen, live: 1 });
  expect(reads).toBe(0);
  expect(hashCanonical('frozen-control', { frozen, live: 2 })).not.toBe(first);
  const child = { value: 1 };
  const shallow = Object.freeze({ child });
  expect(canonicalJson(shallow)).toBe('{"child":{"value":1}}');
  child.value = 2;
  expect(canonicalJson(shallow)).toBe('{"child":{"value":2}}');
  const accessor = Object.freeze({
    get value() {
      throw new Error('getter ran');
    },
  });
  expect(() => canonicalJson(accessor)).toThrow('unsafe or accessor JSON key');
  // The first frozen check may itself run a Proxy trap. Capture bytes only after
  // that check, so a target frozen by the trap cannot cache its earlier value.
  const target = { value: 1 };
  let done = false;
  const selfFreezing = new Proxy(target, {
    isExtensible(value) {
      if (!done) {
        done = true;
        value.value = 2;
        Object.freeze(value);
      }
      return Reflect.isExtensible(value);
    },
  });
  const reached = canonicalJson(selfFreezing);
  expect(reached).toBe('{"value":2}');
  expect(canonicalJson(selfFreezing)).toBe(reached);
});
