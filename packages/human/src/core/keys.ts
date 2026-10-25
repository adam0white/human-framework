/**
 * Own enumerable string keys of a typed record, in Object.keys order.
 * Callers must supply records whose runtime keys match their declared key type.
 * This only types enumeration; it does not sort, validate keys or change state.
 */
export function keysOf<K extends string>(record: Partial<Record<K, unknown>>): K[] {
  return Object.keys(record) as K[];
}
