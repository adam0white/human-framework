/** Private bounded JSON, canonical hashing and exact UTC time helpers for the fixed instrument. */
export function fail(code: string): never {
  throw new Error(`Frozen forecast: ${code}`);
}
const encoder = new TextEncoder();
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(',')}}`;
}
export function snapshot<T>(value: T): T {
  const seen = new Set<object>();
  function visit(v: unknown, depth: number): void {
    if (depth > 12) fail('json-depth');
    if (v === null || typeof v === 'boolean') return;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) fail('json-number');
      return;
    }
    if (typeof v === 'string') {
      if (encoder.encode(v).length > 256) fail('json-string');
      return;
    }
    if (typeof v !== 'object') fail('json-value');
    if (seen.has(v)) fail('json-cycle');
    seen.add(v);
    const array = Array.isArray(v);
    if (
      Object.getPrototypeOf(v) !== (array ? Array.prototype : Object.prototype) &&
      !(Object.getPrototypeOf(v) === null && !array)
    )
      fail('json-prototype');
    const descriptors = Object.getOwnPropertyDescriptors(v);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((k) => typeof k !== 'string')) fail('json-key');
    if (array) {
      if (Object.keys(v).length !== v.length || keys.length !== v.length + 1) fail('json-array');
    } else if (keys.length > 32) fail('json-keys');
    for (const key of keys as string[]) {
      if (array && key === 'length') continue;
      if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('json-key');
      const d = descriptors[key];
      if (!d || !('value' in d) || !d.enumerable) fail('json-accessor');
      visit(d.value, depth + 1);
    }
    seen.delete(v);
  }
  visit(value, 0);
  if (encoder.encode(canonical(value)).length > 8 * 1024 * 1024) fail('json-size');
  try {
    return structuredClone(value);
  } catch {
    fail('json-value');
  }
}
export function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('schema');
  const o = value as Record<string, unknown>;
  if (Object.keys(o).length !== keys.length || keys.some((k) => !Object.hasOwn(o, k))) fail('schema-keys');
  return o;
}
export function id(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value))
    fail('identifier');
}
export function oneOf(value: unknown, values: readonly unknown[]): void {
  if (!values.includes(value)) fail('enum');
}
export function digest(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail('digest');
}
export function date(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.slice(0, 4) === '0000')
    fail('date');
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) fail('date');
}
export function time(value: unknown): bigint {
  if (typeof value !== 'string' || value.length > 40) fail('timestamp');
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:Z|\+00:00)$/.exec(value);
  if (!m) fail('timestamp');
  date(m[1]);
  if (Number(m[2]) > 23 || Number(m[3]) > 59 || Number(m[4]) > 59) fail('timestamp');
  return (
    BigInt(Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`)) * 1_000_000n + BigInt((m[5] ?? '').padEnd(9, '0'))
  );
}
export async function hash(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(canonical(value)));
  return Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, '0')).join('');
}
