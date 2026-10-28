import type { PortableRetainedState } from './portable-person.ts';
/** SCOPE: closed HF4 structural admission and narrow tuning. This is only the
 * first admission layer; the run and faculty owners validate clock order, IDs,
 * references, current requests, counters, effective coefficients and owned bounds.
 * No repair, mutation, callback, actor patch or runtime handler registry.
 */
import { canonicalJson } from './run-canonical.ts';
import type {
  CalendarProjection,
  ContractError,
  DeepReadonly,
  InspectQuery,
  PersonAuthoring,
  PersonaProjection,
  PortablePersonEnvelope,
  PreviewQuery,
  Result,
  RunArchive,
  RunSpec,
  RunTuning,
  StepBatch,
} from './run-schema.ts';
import { DATA_SHAPES, ROOT_SHAPES } from './run-schema-data.ts';

export type DataShape =
  | { kind: 'string' | 'number' | 'boolean' | 'never' }
  | { kind: 'scalar'; name: string }
  | { kind: 'literal'; value: string | number | boolean | null }
  | { kind: 'ref'; name: string }
  | { kind: 'array'; element: DataShape }
  | { kind: 'tuple'; elements: readonly DataShape[] }
  | { kind: 'object'; fields: Readonly<Record<string, { optional: boolean; shape: DataShape }>> }
  | { kind: 'dict'; key: DataShape; value: DataShape }
  | { kind: 'union' | 'all'; options: readonly DataShape[] }
  | { kind: 'pattern'; pattern: string };

type RootData = {
  PortableRetainedState: PortableRetainedState;
  RunSpec: RunSpec;
  RunTuning: RunTuning;
  PersonAuthoring: PersonAuthoring;
  PortablePersonEnvelope: PortablePersonEnvelope;
  StepBatch: StepBatch;
  InspectQuery: InspectQuery;
  PreviewQuery: PreviewQuery;
  RunArchive: RunArchive;
  PersonaProjection: PersonaProjection;
  CalendarProjection: CalendarProjection;
};
const identifiers = new Set(['Id', 'PersonId', 'InputId', 'RequestId', 'EventId']);
const reserved = new Set(['__proto__', 'prototype', 'constructor']);
const issue = (path: string, message: string): ContractError => ({ code: 'invalid-schema', path, message });
function concrete(schema: DataShape): DataShape {
  let current = schema;
  while (current.kind === 'ref') {
    const next = DATA_SHAPES[current.name];
    if (!next) throw new TypeError('missing internal data schema');
    current = next;
  }
  return current;
}
function scalar(name: string, value: unknown): boolean {
  if (name === 'Json') return true; // canonicalJson already validated the entire inert JSON tree.
  if (identifiers.has(name)) {
    return (
      typeof value === 'string' &&
      value.length > 0 &&
      value.normalize('NFC') === value &&
      !reserved.has(value)
    );
  }
  if (name === 'Hash') return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  if (name === 'Time' || name === 'TimeMs') return typeof value === 'number' && Number.isSafeInteger(value);
  if (name === 'DurationMs') return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  if (name === 'Unit') return typeof value === 'number' && value >= 0 && value <= 1;
  if (name === 'Signed') return typeof value === 'number' && value >= -1 && value <= 1;
  throw new TypeError('unsupported internal scalar schema');
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function mismatch(schema: DataShape, value: unknown): boolean {
  schema = concrete(schema);
  if (schema.kind !== 'object' || !object(value)) return false;
  for (const key of ['kind', 'type', 'select', 'format']) {
    const property = schema.fields[key];
    if (!property || property.optional) continue;
    const expected = concrete(property.shape);
    if (expected.kind === 'literal' && value[key] !== expected.value) return true;
  }
  return false;
}
function check(schema: DataShape, value: unknown, path: string): ContractError | null {
  schema = concrete(schema);
  switch (schema.kind) {
    case 'string':
      return typeof value === 'string' ? null : issue(path, 'expected string');
    case 'number':
      return typeof value === 'number' ? null : issue(path, 'expected finite number');
    case 'boolean':
      return typeof value === 'boolean' ? null : issue(path, 'expected boolean');
    case 'never':
      return issue(path, 'value is not admitted');
    case 'scalar':
      return scalar(schema.name, value) ? null : issue(path, `invalid ${schema.name}`);
    case 'literal':
      return value === schema.value ? null : issue(path, 'unexpected literal');
    case 'pattern':
      return typeof value === 'string' && new RegExp(schema.pattern, 'u').test(value)
        ? null
        : issue(path, 'invalid semantic label');
    case 'array': {
      if (!Array.isArray(value)) return issue(path, 'expected array');
      for (const [i, item] of value.entries()) {
        const error = check(schema.element, item, `${path}[${i}]`);
        if (error) return error;
      }
      return null;
    }
    case 'tuple': {
      if (!Array.isArray(value) || value.length !== schema.elements.length)
        return issue(path, 'invalid tuple length');
      for (const [i, element] of schema.elements.entries()) {
        const error = check(element, value[i], `${path}[${i}]`);
        if (error) return error;
      }
      return null;
    }
    case 'object': {
      if (!object(value)) return issue(path, 'expected object');
      for (const key of Object.keys(value))
        if (!Object.hasOwn(schema.fields, key)) return issue(`${path}.${key}`, 'unknown field');
      for (const [key, field] of Object.entries(schema.fields)) {
        if (!Object.hasOwn(value, key)) {
          if (!field.optional) return issue(`${path}.${key}`, 'missing field');
          continue;
        }
        const error = check(field.shape, value[key], `${path}.${key}`);
        if (error) return error;
      }
      return null;
    }
    case 'dict': {
      if (!object(value)) return issue(path, 'expected keyed data');
      for (const [key, item] of Object.entries(value)) {
        const error = check(schema.key, key, `${path}[key]`) ?? check(schema.value, item, `${path}.${key}`);
        if (error) return error;
      }
      return null;
    }
    case 'union': {
      let first: ContractError | null = null;
      for (const option of schema.options) {
        if (mismatch(option, value)) continue;
        const error = check(option, value, path);
        if (!error) return null;
        first ??= error;
      }
      return first ?? issue(path, 'unknown data variant');
    }
    case 'all': {
      for (const option of schema.options) {
        const error = check(option, value, path);
        if (error) return error;
      }
      return null;
    }
    default:
      throw new TypeError('unresolved internal data schema');
  }
}
function tuningRanges(tuning: RunTuning, path: string): ContractError | null {
  const ranges: readonly [string, number | undefined, number, number][] = [
    ['planning.presentBias', tuning.planning?.presentBias, 0.5, 1],
    ['assent.minStrength', tuning.assent?.minStrength, 0.5, 0.9],
    ['assent.pressure', tuning.assent?.pressure, 0.05, 0.15],
    ['doze.hazardScale', tuning.doze?.hazardScale, 0.5, 1.5],
    ['crisis.hazardScale', tuning.crisis?.hazardScale, 0.5, 1.5],
    ['promptings.practiceHalfLifeDays', tuning.promptings?.practiceHalfLifeDays, 30, 120],
    ['promptings.echoRate', tuning.promptings?.echoRate, 0.05, 0.15],
  ];
  for (const [field, value, low, high] of ranges) {
    if (value !== undefined && (value < low || value > high))
      return issue(`${path}.${field}`, 'outside supported tuning range');
  }
  return null;
}
function freeze(value: unknown): void {
  const stack = [value];
  while (stack.length) {
    const item = stack.pop();
    if (item !== null && typeof item === 'object') {
      for (const child of Object.values(item)) stack.push(child);
      Object.freeze(item);
    }
  }
}

/** Internal typed root admission. The selector is a fixed schema name, never an
 * external handler name. Returning ok proves structure only, not run applicability.
 */
export function validateData<K extends keyof RootData>(
  name: K,
  input: unknown,
): Result<DeepReadonly<RootData[K]>> {
  let value: unknown;
  try {
    value = JSON.parse(canonicalJson(input));
  } catch {
    return {
      ok: false,
      error: issue('$', 'expected plain finite JSON without accessors, cycles or negative zero'),
    };
  }
  const error = check(ROOT_SHAPES[name], value, '$');
  if (error) return { ok: false, error };
  // The closed structural table has checked these exact roots before reading range fields.
  if (name === 'RunTuning') {
    const error = tuningRanges(value as RunTuning, '$');
    if (error) return { ok: false, error };
  }
  if (name === 'RunSpec') {
    const tuning = (value as RunSpec).tuning;
    const error = tuning ? tuningRanges(tuning, '$.tuning') : null;
    if (error) return { ok: false, error };
  }
  freeze(value);
  return { ok: true, value: value as DeepReadonly<RootData[K]> };
}
