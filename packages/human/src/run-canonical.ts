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
  | { kind: 'value'; value: unknown }
  | { kind: 'text'; text: string }
  | { kind: 'leave'; value: object };
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

/** Validates JSON representation without invoking getters or accepting silent loss.
 * Iterative traversal avoids a JavaScript call-stack bound on inert host JSON.
 * Semantic owner/size/reference admission limits are enforced by run validation.
 */
export function canonicalJson(value: unknown): string {
  const output: string[] = [];
  const ancestors = new Set<object>();
  const work: Work[] = [{ kind: 'value', value }];
  while (work.length) {
    const item = work.pop();
    if (!item) throw new TypeError('invalid canonical work stack');
    if (item.kind === 'text') {
      output.push(item.text);
      continue;
    }
    if (item.kind === 'leave') {
      ancestors.delete(item.value);
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
    const array = Array.isArray(current);
    const prototype = Object.getPrototypeOf(current);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('nonplain JSON object');
    }
    const descriptors = Object.getOwnPropertyDescriptors(current);
    const ownKeys = Reflect.ownKeys(current);
    if (ownKeys.some((key) => typeof key !== 'string')) throw new TypeError('symbol JSON key');
    ancestors.add(current);
    work.push({ kind: 'leave', value: current });
    if (array) {
      if (ownKeys.length !== current.length + 1) throw new TypeError('sparse or decorated JSON array');
      work.push({ kind: 'text', text: ']' });
      for (let i = current.length - 1; i >= 0; i -= 1) {
        const descriptor = descriptors[String(i)];
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          throw new TypeError('sparse or accessor JSON array');
        }
        if (i < current.length - 1) work.push({ kind: 'text', text: ',' });
        work.push({ kind: 'value', value: descriptor.value });
      }
      work.push({ kind: 'text', text: '[' });
    } else {
      const keys = Object.keys(descriptors).sort(compareCodePoints);
      work.push({ kind: 'text', text: '}' });
      for (let i = keys.length - 1; i >= 0; i -= 1) {
        const key = keys[i];
        if (key === undefined) throw new TypeError('invalid JSON key cursor');
        const descriptor = descriptors[key];
        if (forbiddenKeys.has(key) || !descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          throw new TypeError('unsafe or accessor JSON key');
        }
        if (i < keys.length - 1) work.push({ kind: 'text', text: ',' });
        work.push({ kind: 'value', value: descriptor.value });
        work.push({ kind: 'text', text: `${JSON.stringify(key)}:` });
      }
      work.push({ kind: 'text', text: '{' });
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
const rotate = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
const word = (words: Uint32Array, i: number): number => {
  const value = words[i];
  if (value === undefined) throw new RangeError('SHA-256 word index');
  return value;
};

function sha256(input: Uint8Array): string {
  const bytes = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer);
  const bits = input.length * 8;
  view.setUint32(bytes.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(bytes.length - 4, bits >>> 0);
  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const a = word(w, i - 15);
      const b = word(w, i - 2);
      const s0 = rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3);
      const s1 = rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10);
      w[i] = (word(w, i - 16) + s0 + word(w, i - 7) + s1) >>> 0;
    }
    let a = word(state, 0);
    let b = word(state, 1);
    let c = word(state, 2);
    let d = word(state, 3);
    let e = word(state, 4);
    let f = word(state, 5);
    let g = word(state, 6);
    let h = word(state, 7);
    for (let i = 0; i < 64; i += 1) {
      const sum1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choose = (e & f) ^ (~e & g);
      const t1 = (h + sum1 + choose + word(K, i) + word(w, i)) >>> 0;
      const sum0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
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
    const result = [a, b, c, d, e, f, g, h];
    for (const [i, value] of result.entries()) state[i] = (word(state, i) + value) >>> 0;
  }
  return Array.from(state, (x) => x.toString(16).padStart(8, '0')).join('');
}

/** One wire contract: SHA256(UTF8(canonical JSON [domain,...parts])). */
export function hashCanonical(domain: string, ...parts: readonly unknown[]): string {
  if (!domain) throw new TypeError('empty hash domain');
  return sha256(new TextEncoder().encode(canonicalJson([domain, ...parts])));
}
