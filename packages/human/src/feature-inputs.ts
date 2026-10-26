/**
 * Explicit, read-only diagnostics for creation feature options and observation selectors.
 * This module owns no Person state. It does not validate a whole PersonSpec or Percept,
 * invoke mutators, coerce input, log, throw on malformed JSON data, or consume RNG.
 * Existing APIs never call it automatically. Getters/proxies are outside this JSON-data contract.
 */
import { CURIOSITY_DEFAULTS } from './curiosity/curiosity.ts';
import { PROMPTINGS_DEFAULTS } from './promptings/promptings.ts';

export interface FeatureInputIssue {
  path: string;
  code: 'type' | 'range' | 'bound' | 'unknown';
  /** Fixed description; never includes a supplied value. */
  expected: string;
}
interface Rule {
  type: 'boolean' | 'string' | 'number';
  expected: string;
  accepts: (value: unknown) => boolean;
}
type Shape = Record<string, Rule>;
const bool: Rule = { type: 'boolean', expected: 'boolean', accepts: (v) => typeof v === 'boolean' };
const str: Rule = { type: 'string', expected: 'string', accepts: (v) => typeof v === 'string' };
const text = (min: number, max: number): Rule => ({
  type: 'string',
  expected: `string length ${min}..${max}`,
  accepts: (v) => typeof v === 'string' && v.length >= min && v.length <= max,
});
const number = (min: number, max: number, integer = false, exclusive = false): Rule => ({
  type: 'number',
  expected: `${integer ? 'integer' : 'finite number'} ${exclusive ? '>' : ''}${min}..${max}`,
  accepts: (v) =>
    typeof v === 'number' &&
    Number.isFinite(v) &&
    (exclusive ? v > min : v >= min) &&
    v <= max &&
    (!integer || Number.isInteger(v)),
});
const choice = (...values: string[]): Rule => ({
  type: 'string',
  expected: `string: ${values.join(' | ')}`,
  accepts: (v) => typeof v === 'string' && values.includes(v),
});
const plain = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const own = (v: Record<string, unknown>, key: string): unknown =>
  Object.hasOwn(v, key) ? v[key] : undefined;
const observation = { inheritedAptitude: bool };
const lexicon = { plainEnglish: bool, variety: bool, nounActions: bool, wording: choice('literal-v1') };
const lexiconKeys = [
  'plainEnglish',
  'wording',
  'variety',
  'materialMeaning',
  'nounActions',
  'locale',
  'names',
  'roles',
  'prefer',
  'lines',
  'extend',
  'actions',
];
const demoKeys = ['skill', 'level', 'minutes', 'domain', 'inheritedAptitude'];
const specs: Record<string, Shape> = {
  doze: { posture: choice('upright', 'seated', 'reclined'), stimulation: number(0, 1) },
  promptings: {
    reading: choice('whisper', 'inclination', 'intrusion', 'fault', 'none'),
    readingSource: str,
    echoRate: number(0, 1),
    practiceHalfLifeDays: number(0, 36500, false, true),
  },
  curiosity: Object.fromEntries(
    ['unknownScale', 'progressScale', 'varyScale', 'recentMinutes', 'rewardMax'].map((key) => [
      key,
      number(0, key === 'recentMinutes' ? 1440 : CURIOSITY_DEFAULTS[key as 'unknownScale']),
    ]),
  ),
  planning: { depth: number(2, 5, true), presentBias: number(0, 1, false, true) },
  review: {
    style: choice('accounting', 'ruminating', 'none'),
    styleSource: text(0, 96),
    at: number(0, 1439, true),
  },
  projects: {
    protectProgress: bool,
    ...Object.fromEntries(
      ['forgetMinutes', 'adoptEveryMinutes', 'cooldownMinutes', 'halfLifeMinutes', 'staleMinutes'].map(
        (key) => [key, number(1, 525600)],
      ),
    ),
    ...Object.fromEntries(['calmUrgency', 'fearBelow', 'adoptAppeal'].map((key) => [key, number(0, 1)])),
  },
  persistence: {
    stallHalfLifeMinutes: number(1, 1440),
    ...Object.fromEntries(
      ['continueScale', 'switchScale', 'cap', 'switchMargin'].map((key) => [key, number(0, 1)]),
    ),
    ...Object.fromEntries(['slackMinutes', 'maxMinutes', 'restMinutes'].map((key) => [key, number(0, 1440)])),
  },
};
const booleanKeys = [
  'bladder',
  'suggestionReasons',
  'gists',
  'yearbook',
  'character',
  'skillRetention',
  'fatigueStore',
  'fullness',
];
const shorthand = ['curiosity', 'projects', 'persistence'];

/** Inspect only the named feature boundary. Undefined means omitted, including own undefined fields. */
export function validateFeatureInputs(
  kind: 'person-spec' | 'observation' | 'percept',
  input: unknown,
): readonly FeatureInputIssue[] {
  const issues: FeatureInputIssue[] = [];
  let bounded = false;
  const issue = (path: string, code: FeatureInputIssue['code'], expected: string) => {
    if (issues.length >= 63 || path.length > 256) {
      bounded = true;
      return;
    }
    issues.push({ path, code, expected });
  };
  const object = (v: unknown, path: string): v is Record<string, unknown> => {
    if (plain(v)) return true;
    issue(path, 'type', 'plain own-property configuration object');
    return false;
  };
  const unknowns = (v: Record<string, unknown>, keys: readonly string[], path: string) => {
    // Collect at most 64 own keys; do not enumerate/sort an unbounded Object.keys array.
    const found: string[] = [];
    let visited = 0;
    for (const key in v) {
      if (!Object.hasOwn(v, key)) continue;
      if (++visited > 64) {
        bounded = true;
        break;
      }
      if (!keys.includes(key) && v[key] !== undefined) found.push(key);
    }
    for (const key of found.sort())
      issue(`${path}${path ? '.' : ''}${key}`, 'unknown', 'supported feature property');
  };
  const fields = (
    v: Record<string, unknown>,
    shape: Shape,
    path: string,
    required: readonly string[] = [],
  ) => {
    for (const [key, rule] of Object.entries(shape)) {
      const value = own(v, key);
      if ((value === undefined && required.includes(key)) || (value !== undefined && !rule.accepts(value)))
        issue(
          `${path}${path ? '.' : ''}${key}`,
          typeof value === rule.type ? 'range' : 'type',
          rule.expected,
        );
    }
  };
  const responses = (v: unknown, path: string) => {
    if (!Array.isArray(v)) {
      issue(path, 'type', 'response array');
      return;
    }
    if (v.length > PROMPTINGS_DEFAULTS.maxResponses) issue(path, 'bound', 'at most 8 responses');
    const ids = new Set<string>();
    for (let i = 0; i < Math.min(v.length, PROMPTINGS_DEFAULTS.maxResponses); i++) {
      const r = v[i];
      const p = `${path}.${i}`;
      if (!object(r, p)) continue;
      const shape = {
        id: {
          type: 'string',
          expected: 'nonempty string',
          accepts: (v: unknown) => typeof v === 'string' && v.length > 0,
        } as Rule,
        kind: choice('refuge', 'redirect', 'leave'),
        practice: number(0, 1),
        cue: text(1, 200),
      };
      fields(r, shape, p, ['id', 'kind']);
      unknowns(r, Object.keys(shape), p);
      const id = own(r, 'id');
      if (typeof id === 'string') {
        if (ids.has(id)) issue(`${p}.id`, 'range', 'unique response id');
        ids.add(id);
      }
    }
  };
  if (input !== undefined && object(input, '')) {
    if (kind === 'observation') {
      fields(input, observation, '');
      unknowns(input, Object.keys(observation), '');
    } else if (kind === 'percept') {
      const demo = own(input, 'demonstrates');
      if (demo !== undefined && object(demo, 'demonstrates')) {
        fields(demo, observation, 'demonstrates');
        unknowns(demo, demoKeys, 'demonstrates');
      }
    } else if (kind === 'person-spec') {
      const on = own(input, 'enable');
      if (on !== undefined && object(on, 'enable')) {
        fields(on, Object.fromEntries(booleanKeys.map((key) => [key, bool])), 'enable');
        for (const [key, shape] of Object.entries(specs)) {
          const value = own(on, key);
          if (value === undefined || (shorthand.includes(key) && typeof value === 'boolean')) continue;
          const path = `enable.${key}`;
          if (!object(value, path)) continue;
          fields(value, shape, path);
          if (key === 'doze')
            for (const required of ['posture', 'stimulation'])
              if (own(value, required) === undefined)
                issue(`${path}.${required}`, 'type', 'required doze field');
          if (key === 'promptings' && own(value, 'responses') !== undefined)
            responses(own(value, 'responses'), `${path}.responses`);
          unknowns(value, [...Object.keys(shape), ...(key === 'promptings' ? ['responses'] : [])], path);
        }
        unknowns(on, [...booleanKeys, ...Object.keys(specs)], 'enable');
      }
      const lex = own(input, 'lexicon');
      if (lex !== undefined && object(lex, 'lexicon')) {
        fields(lex, lexicon, 'lexicon');
        unknowns(lex, lexiconKeys, 'lexicon');
      }
    } else issue('', 'type', 'supported diagnostic kind');
  }
  if (bounded)
    issues.push({ path: '', code: 'bound', expected: 'diagnostic budget exhausted; list is incomplete' });
  return issues;
}
