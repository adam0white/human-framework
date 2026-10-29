/** SCOPE: format-six lossless accepted-history interning. Every scalar and
 * structural node has one canonical backward reference; no input is discarded.
 * Admission bounds expanded work before traversing shared decoded subtrees.
 */
import { canonicalJson, compareCodePoints } from './run-canonical.ts';
import type { AcceptedTransaction, DeepReadonly, HistoryPool } from './run-schema.ts';

// The cap scales with encoded size rather than elapsed game time. It bounds
// hostile DAG amplification without imposing a fixed history or term length.
const MIN_EXPANSION_UNITS = 10_000_000;
const MAX_AMPLIFICATION = 1024;

function withinBudget(units: number, encodedUnits: number): boolean {
  return (
    Number.isSafeInteger(units) && units <= Math.max(MIN_EXPANSION_UNITS, encodedUnits * MAX_AMPLIFICATION)
  );
}

type DictionaryNode = null | boolean | number | string | readonly number[];
type DictionaryHistory = { root: number; pool: DictionaryNode[] };
function dictionaryHistory(history: unknown): { value: DictionaryHistory; withinBudget: boolean } {
  const pool: DictionaryNode[] = [];
  const indexes = new Map<string, number>();
  const weights: number[] = [];
  const references: number[] = [];
  type Work = { value: unknown } | { tag: number; start: number; value: object };
  const ancestors = new Set<object>();
  const work: Work[] = [{ value: history }];
  let encodedUnits = 0;
  function add(node: DictionaryNode): void {
    const key = JSON.stringify(node);
    const prior = indexes.get(key);
    if (prior !== undefined) {
      references.push(prior);
      return;
    }
    let weight = Array.isArray(node) ? node.length : key.length;
    if (Array.isArray(node)) for (const reference of node.slice(1)) weight += weights[reference] ?? 0;
    if (!Number.isSafeInteger(weight)) throw new TypeError('history exceeds expansion budget');
    const index = pool.length;
    pool.push(node);
    weights.push(weight);
    indexes.set(key, index);
    encodedUnits += key.length + 1;
    references.push(index);
  }
  while (work.length) {
    const item = work.pop();
    if (!item) throw new TypeError('invalid history work stack');
    if ('tag' in item) {
      ancestors.delete(item.value);
      add([item.tag, ...references.splice(item.start)]);
      continue;
    }
    const value = item.value;
    if (value !== null && typeof value === 'object') {
      if (ancestors.has(value)) throw new TypeError('cyclic history value');
      ancestors.add(value);
    }
    if (Array.isArray(value)) {
      work.push({ tag: 0, start: references.length, value });
      for (let index = value.length - 1; index >= 0; index--) work.push({ value: value[index] });
    } else if (value !== null && typeof value === 'object') {
      work.push({ tag: 1, start: references.length, value });
      const keys = Object.keys(value).sort(compareCodePoints);
      for (let index = keys.length - 1; index >= 0; index--) {
        const key = keys[index] as string;
        work.push({ value: (value as Record<string, unknown>)[key] }, { value: key });
      }
    } else if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0))
    )
      add(value);
    else throw new TypeError('non-JSON history value');
  }
  const root = references[0];
  if (root === undefined) throw new TypeError('invalid history root');
  return { value: { root, pool }, withinBudget: withinBudget(weights[root] ?? Infinity, encodedUnits) };
}

/** Valid highly repetitive history uses its explicit canonical JSON bytes when
 * a dictionary would exceed admission's amplification bound. The literal contains
 * every expanded byte, so it cannot hide decompression work behind references.
 */
export function packHistory(history: DeepReadonly<readonly AcceptedTransaction[]>): HistoryPool {
  const dictionary = dictionaryHistory(history);
  return dictionary.withinBudget ? dictionary.value : { root: 0, pool: [{ json: canonicalJson(history) }] };
}

/** Structural pool checks happen before closed AcceptedTransaction admission.
 * Sharing decoded values does not bypass the budget: weights count each use.
 */
export function unpackHistory(input: DeepReadonly<HistoryPool>): unknown {
  const literal = input.pool[0];
  if (literal !== null && typeof literal === 'object' && !Array.isArray(literal)) {
    if (
      input.root !== 0 ||
      input.pool.length !== 1 ||
      Object.keys(literal).join(',') !== 'json' ||
      !('json' in literal) ||
      typeof literal.json !== 'string'
    )
      throw new TypeError('invalid literal history');
    const history: unknown = JSON.parse(literal.json);
    if (canonicalJson(history) !== literal.json) throw new TypeError('noncanonical literal history');
    if (dictionaryHistory(history).withinBudget) throw new TypeError('unnecessary literal history');
    return history;
  }
  const values: unknown[] = [];
  const weights: number[] = [];
  let encodedUnits = 0;
  const signatures = new Set<string>();
  for (const [index, node] of input.pool.entries()) {
    if (node !== null && typeof node === 'object' && !Array.isArray(node))
      throw new TypeError('literal history must be the sole root');
    const signature = JSON.stringify(node);
    if (signatures.has(signature)) throw new TypeError('duplicate history pool node');
    signatures.add(signature);
    encodedUnits += signature.length + 1;
    let weight = Array.isArray(node) ? node.length : signature.length;
    if (!Array.isArray(node)) {
      if (typeof node === 'number' && (!Number.isFinite(node) || Object.is(node, -0)))
        throw new TypeError('invalid history scalar');
      values.push(node);
    } else {
      const tag = node[0];
      if ((tag !== 0 && tag !== 1) || (tag === 1 && node.length % 2 !== 1))
        throw new TypeError('invalid history pool node');
      for (const reference of node.slice(1)) {
        if (!Number.isSafeInteger(reference) || reference < 0 || reference >= index)
          throw new TypeError('history pool reference must point backward');
        weight += weights[reference] ?? Infinity;
        if (!Number.isSafeInteger(weight)) throw new TypeError('history exceeds expansion budget');
      }
      if (tag === 0) values.push(node.slice(1).map((reference) => values[reference]));
      else {
        const object: Record<string, unknown> = {};
        let previous: string | undefined;
        for (let i = 1; i < node.length; i += 2) {
          const key = values[node[i] as number];
          if (
            typeof key !== 'string' ||
            ['__proto__', 'constructor', 'prototype'].includes(key) ||
            (previous !== undefined && compareCodePoints(previous, key) >= 0)
          )
            throw new TypeError('invalid history object key');
          object[key] = values[node[i + 1] as number];
          previous = key;
        }
        values.push(object);
      }
    }
    weights.push(weight);
  }
  if (!Number.isSafeInteger(input.root) || input.root !== input.pool.length - 1)
    throw new TypeError('invalid history pool root');
  if (!withinBudget(weights[input.root] ?? Infinity, encodedUnits))
    throw new TypeError('history exceeds expansion budget');
  const reachable = new Set<number>();
  const pending: { index: number; leave: boolean }[] = [{ index: input.root, leave: false }];
  let expected = 0;
  while (pending.length) {
    const item = pending.pop();
    if (!item) throw new TypeError('invalid history traversal');
    if (item.leave) {
      if (item.index !== expected++) throw new TypeError('noncanonical history pool order');
      continue;
    }
    if (reachable.has(item.index)) continue;
    reachable.add(item.index);
    pending.push({ index: item.index, leave: true });
    const node = input.pool[item.index];
    if (Array.isArray(node))
      for (let offset = node.length - 1; offset >= 1; offset--)
        pending.push({ index: node[offset] as number, leave: false });
  }
  if (reachable.size !== input.pool.length) throw new TypeError('unreachable history pool node');
  return values[input.root];
}
