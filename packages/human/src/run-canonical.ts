/** SCOPE: exact HF4 canonical JSON and SHA-256. Used at archive/replay or explicit
 * diagnostics, never a compulsory per-step full-history clone/hash. No actor writes,
 * global RNG, Node-only crypto, locale sorting or object-key enumeration shortcut.
 */
export function compareCodePoints(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const x = a.codePointAt(i);
    const y = b.codePointAt(j);
    if (x === undefined || y === undefined) throw new TypeError('invalid string cursor');
    if (x !== y) return x < y ? -1 : 1;
    i += x > 0xffff ? 2 : 1;
    j += y > 0xffff ? 2 : 1;
  }
  return i < a.length ? 1 : j < b.length ? -1 : 0;
}

type Work =
  | string
  | { kind: 'value'; value: unknown }
  | { kind: 'leave'; value: object; start: number; frozen: boolean; children: readonly unknown[] };
// Weak identities retain no state. Cache only proven deeply frozen, small JSON
// fragments. The token cap bounds first-pass copying even for very deep host JSON.
const immutableJson = new WeakMap<object, string>();
const deeplyFrozen = new WeakSet<object>();
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

// Primitive bytes need no value-stack wrapper. Keep invalid values on the value
// path so admission still rejects them without JSON.stringify's silent loss.
function valueWork(value: unknown): Work {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0))
    return JSON.stringify(value);
  return { kind: 'value', value };
}

/** Validates JSON representation without invoking getters or accepting silent loss.
 * Iterative traversal avoids a JavaScript call-stack bound on inert host JSON.
 * Semantic owner/size/reference admission limits are enforced by run validation.
 */
export function canonicalJson(value: unknown): string {
  const output: string[] = [];
  const ancestors = new Set<object>();
  const work: Work[] = [valueWork(value)];
  while (work.length) {
    const item = work.pop();
    if (!item) throw new TypeError('invalid canonical work stack');
    if (typeof item === 'string') {
      output.push(item);
      continue;
    }
    if (item.kind === 'leave') {
      ancestors.delete(item.value);
      if (
        item.frozen &&
        item.children.every((child) => child === null || typeof child !== 'object' || deeplyFrozen.has(child))
      ) {
        deeplyFrozen.add(item.value);
        if (output.length - item.start <= 256) {
          let length = 0;
          for (let i = item.start; i < output.length && length <= 16384; i++)
            length += output[i]?.length ?? 0;
          if (length <= 16384) immutableJson.set(item.value, output.slice(item.start).join(''));
        }
      }
      continue;
    }
    const current = item.value;
    if (current === null || typeof current === 'boolean' || typeof current === 'string') {
      output.push(JSON.stringify(current));
      continue;
    }
    if (typeof current === 'number') {
      if (!Number.isFinite(current) || Object.is(current, -0)) throw new TypeError('invalid JSON number');
      output.push(JSON.stringify(current));
      continue;
    }
    if (typeof current !== 'object') throw new TypeError('non-JSON value');
    if (ancestors.has(current)) throw new TypeError('cyclic JSON');
    const cached = immutableJson.get(current);
    if (cached !== undefined) {
      output.push(cached);
      continue;
    }
    const array = Array.isArray(current);
    const prototype = Object.getPrototypeOf(current);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('nonplain JSON object');
    }
    const frozen = Object.isFrozen(current);
    const descriptors = Object.getOwnPropertyDescriptors(current);
    const ownKeys = Reflect.ownKeys(current);
    if (ownKeys.some((key) => typeof key !== 'string')) throw new TypeError('symbol JSON key');
    ancestors.add(current);
    work.push({
      kind: 'leave',
      value: current,
      start: output.length,
      frozen,
      // Only frozen containers can enter the immutable fragment cache. Mutable
      // archives need ancestor tracking, but no separate child list.
      children: frozen
        ? Object.values(descriptors).flatMap((descriptor) =>
            'value' in descriptor ? [descriptor.value] : [],
          )
        : [],
    });
    if (array) {
      if (ownKeys.length !== current.length + 1) throw new TypeError('sparse or decorated JSON array');
      work.push(']');
      for (let i = current.length - 1; i >= 0; i -= 1) {
        const descriptor = descriptors[String(i)];
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          throw new TypeError('sparse or accessor JSON array');
        }
        if (i < current.length - 1) work.push(',');
        work.push(valueWork(descriptor.value));
      }
      work.push('[');
    } else {
      const keys = Object.keys(descriptors).sort(compareCodePoints);
      work.push('}');
      for (let i = keys.length - 1; i >= 0; i -= 1) {
        const key = keys[i];
        if (key === undefined) throw new TypeError('invalid JSON key cursor');
        const descriptor = descriptors[key];
        if (forbiddenKeys.has(key) || !descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          throw new TypeError('unsafe or accessor JSON key');
        }
        if (i < keys.length - 1) work.push(',');
        work.push(valueWork(descriptor.value));
        work.push(`${JSON.stringify(key)}:`);
      }
      work.push('{');
    }
  }
  return output.join('');
}

// FIPS 180-4 SHA-256 constants; integer bit operations have the same meaning in
// browser and Node. The digest is consistency evidence, never authentication.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
]);
// One schedule buffer, reused: sha256 is synchronous and never re-entered.
const schedule = new Uint32Array(64);
const hex = (x: number): string => (x >>> 0).toString(16).padStart(8, '0');

function sha256(input: Uint8Array): string {
  const bytes = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer);
  const bits = input.length * 8;
  view.setUint32(bytes.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(bytes.length - 4, bits >>> 0);
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a,
    h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;
  const w = schedule;
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const a = w[i - 15] as number;
      const b = w[i - 2] as number;
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = ((w[i - 16] as number) + s0 + (w[i - 7] as number) + s1) >>> 0;
    }
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;
    for (let i = 0; i < 64; i += 1) {
      const sum1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const choose = (e & f) ^ (~e & g);
      const t1 = (h + sum1 + choose + (K[i] as number) + (w[i] as number)) >>> 0;
      const sum0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}

// Node 24+ and the supported browsers provide the same standard UTF-8 encoder.
// Supported runtimes provide the standard UTF-8 encoder; the core TS lib excludes DOM types.
declare const TextEncoder: { new (): { encode(input: string): Uint8Array } };
const encoder = new TextEncoder();
/** UTF-8 bytes; the standard encoder replaces lone surrogates with U+FFFD. */
export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

/** One wire contract: SHA256(UTF8(canonical JSON [domain,...parts])). */
export function hashCanonical(domain: string, ...parts: readonly unknown[]): string {
  if (!domain) throw new TypeError('empty hash domain');
  return sha256(utf8(canonicalJson([domain, ...parts])));
}
