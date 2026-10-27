/** SCOPE: bounded memo tables for pure owner computations. A key must serialize every
 * input the computation reads; values are deep-frozen on insert, so a hit returns data
 * equal to a recomputation and no caller can mutate it. Hits and misses never change a
 * result, an RNG draw, a clock or an event: this is a cache, not state. Large frozen
 * inputs that are themselves memo products enter keys by identity serial.
 * Precondition for identity keys: the object is deep-frozen (a memo product, freezeData
 * or the effective-parameter freeze). A shallowly frozen object with mutable children
 * must not reach keyOf; it would keep a stale key.
 * JSON keys write undefined and NaN as null and -0 as 0; keyed inputs here never rely on
 * that difference (hashCanonical refuses -0 and non-finite numbers in state).
 */
const serials = new WeakMap<object, number>();
let nextSerial = 0;
/** Identity serial for a frozen object; mutable objects are refused, since their
 * content could change under the same identity. */
export function serial(value: object): number {
  if (!Object.isFrozen(value)) throw new TypeError('memo identity requires a frozen value');
  const known = serials.get(value);
  if (known !== undefined) return known;
  const s = ++nextSerial;
  serials.set(value, s);
  return s;
}
/** Key part for an object input: its identity serial when frozen, else its content. */
export function keyOf(value: object): string {
  return Object.isFrozen(value) ? `#${serial(value)}` : JSON.stringify(value);
}
function deepFreeze<T>(value: T): T {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  while (pending.length) {
    const item = pending.pop();
    if (item !== null && typeof item === 'object' && !visited.has(item)) {
      visited.add(item);
      Object.freeze(item);
      for (const child of Object.values(item)) pending.push(child);
    }
  }
  return value;
}
export class Memo<V> {
  readonly #limit: number;
  readonly #table = new Map<string, V>();
  constructor(limit: number) {
    this.#limit = limit;
  }
  get(key: string, make: () => V): V {
    const hit = this.#table.get(key);
    if (hit !== undefined) {
      this.#table.delete(key);
      this.#table.set(key, hit);
      return hit;
    }
    const value = deepFreeze(make());
    this.#table.set(key, value);
    if (this.#table.size > this.#limit) {
      const oldest = this.#table.keys().next();
      if (!oldest.done) this.#table.delete(oldest.value);
    }
    return value;
  }
}
