// Exact JSON and bounded scalar checks shared by both host arms.
export const clone = structuredClone;
export const near = (a, b, tolerance = 1e-10) => Math.abs(a - b) <= tolerance;
export function insist(condition, message) { if (!condition) throw new Error(message); }
export function fields(value, names) {
  insist(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected record');
  insist(Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name)), 'Unexpected record fields');
}
export function number(value, min, max) {
  insist(typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0) && value >= min && value <= max, 'Invalid number');
}
export function integer(value, min, max) { number(value, min, max); insist(Number.isSafeInteger(value), 'Expected integer'); }
export function jsonTree(value, seen = new Set(), depth = 0) {
  insist(depth <= 24, 'Snapshot too deep');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') return number(value, -Number.MAX_VALUE, Number.MAX_VALUE);
  if (typeof value === 'string') return insist(value.length <= 120, 'Oversized string');
  insist(typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value)), 'Expected plain unshared JSON record');
  insist(!seen.has(value), 'Shared or cyclic snapshot'); seen.add(value);
  insist(Reflect.ownKeys(value).length <= 64, 'Too many fields');
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    insist(typeof key === 'string' && descriptor.enumerable && Object.hasOwn(descriptor, 'value'), 'Non-data snapshot field');
    jsonTree(descriptor.value, seen, depth + 1);
  }
}
export function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
