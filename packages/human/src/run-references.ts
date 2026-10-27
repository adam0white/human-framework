/** SCOPE: a readonly view over a committed reference index plus bounded new
 * allocations. Owners see an array without cloning the lifetime index per frame.
 * This transient internal view is never archived or accepted from a host.
 */
import type { Reference } from './run-schema.ts';

export function joinedReferences(
  base: readonly Reference[],
  added: readonly Reference[],
): readonly Reference[] {
  const length = () => base.length + added.length;
  const index = (key: PropertyKey): number | null => {
    if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)) return null;
    const value = Number(key);
    return Number.isSafeInteger(value) ? value : null;
  };
  const at = (offset: number) => (offset < base.length ? base[offset] : added[offset - base.length]);
  return new Proxy<Reference[]>([], {
    get(target, key, receiver) {
      if (key === 'length') return length();
      const offset = index(key);
      return offset === null ? Reflect.get(target, key, receiver) : at(offset);
    },
    has(target, key) {
      const offset = index(key);
      return offset === null ? Reflect.has(target, key) : offset < length();
    },
    ownKeys() {
      return [...Array.from({ length: length() }, (_, offset) => String(offset)), 'length'];
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === 'length') return { ...Reflect.getOwnPropertyDescriptor(target, key), value: length() };
      const offset = index(key);
      if (offset !== null && offset < length())
        return { configurable: true, enumerable: true, writable: false, value: at(offset) };
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    set() {
      throw new TypeError('reference view is readonly');
    },
    deleteProperty() {
      throw new TypeError('reference view is readonly');
    },
    defineProperty() {
      throw new TypeError('reference view is readonly');
    },
  });
}
