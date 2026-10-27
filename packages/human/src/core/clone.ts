/** SCOPE: detached copy of plain JSON-like engine data (objects, arrays, primitives,
 * undefined). Engine state is plain data, so this matches structuredClone for it at a
 * fraction of the cost; anything else (typed arrays, maps) falls back to structuredClone.
 * The result is unfrozen and shares nothing mutable with the input. */
export function cloneData<T>(value: T): T {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) {
    const out = new Array(value.length);
    for (let i = 0; i < value.length; i++) out[i] = cloneData(value[i]);
    return out as T;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return structuredClone(value);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) out[key] = cloneData((value as Record<string, unknown>)[key]);
  return out as T;
}
