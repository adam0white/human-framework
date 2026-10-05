/**
 * SCOPE: saving and loading a person. `snapshot` copies a person as plain JSON; `restore` validates a saved person,
 * upgrades a save from an earlier supported engine (`migrate`), fills defaults for missing or mistyped core fields,
 * hands every optional slice to its owning module's sanitizer, and holds every list to the bound the live code keeps.
 * A save the engine wrote restores to exactly what was saved. It does not repair a save's meaning (a plausible but
 * wrong value stays), merge two saves, or read any format but the person JSON.
 */
import { sanitizeCrisis } from './affect/index.ts';
import { sanitizeAgenda } from './agenda/index.ts';
import { sanitizeBody, sanitizeInjuries } from './body/index.ts';
import { sanitizeCharacter } from './character/index.ts';
import { CHRONICLE_DEFAULTS, sanitizeYears } from './chronicle/index.ts';
import { isNum } from './core/index.ts';
import { sanitizeAmbient } from './environment/index.ts';
import { sanitizeFamily } from './family/index.ts';
import { HABIT_DEFAULTS } from './habits/index.ts';
import { GIST_DEFAULTS, MEMORY_DEFAULTS, sanitizeGists } from './memory/index.ts';
import { migrate } from './migrate.ts';
import { sanitizeBonds } from './partnering/index.ts';
import { cleanRetention, createPerson, traceLimit } from './person.ts';
import { sanitizeSkillRetention } from './skills/index.ts';
import { sanitizeGroups, sanitizeImpressions } from './social/index.ts';
import type { Person } from './types.ts';
import { ENGINE_VERSION, MAX_MINUTE, PERSON_SCHEMA } from './types.ts';
import { sanitizeWill } from './will/index.ts';

/** A deep copy of the person as plain JSON (what a host saves). */
export function snapshot(p: Person): Person {
  return structuredClone(p);
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const isMinute = (x: unknown): x is number => isNum(x) && Math.abs(x) <= MAX_MINUTE;

const REQUIRED_OBJECTS: (keyof Person)[] = [
  'rng',
  'life',
  'body',
  'needs',
  'traits',
  'values',
  'conscience',
  'affect',
  'skills',
  'memory',
  'social',
  'agenda',
  'will',
];

/** Optional top-level keys of a person that `createPerson` leaves absent; `restore` keeps them. */
const OPTIONAL_KEYS: ReadonlySet<string> = new Set([
  'chronicle',
  'chronicleDay',
  'chronicleYears',
  'skillRetention',
  'character',
  'lexicon',
  'family',
  'bonds',
  'ambient',
  'retention',
]);

/** Kind of a JSON value for the per-field type check in `restore`. */
const kindOf = (x: unknown): string => (Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x);

/**
 * Fill `saved` from `defaults`, recursively for plain objects: a field that is missing, non-finite, or of a
 * different JSON kind than the default takes the default. Fields absent from the defaults (optional ones)
 * are kept as saved. Arrays are taken whole.
 */
function fillFrom(
  defaults: Record<string, unknown>,
  saved: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...saved };
  for (const [k, def] of Object.entries(defaults)) {
    const v = saved[k];
    const dk = kindOf(def);
    if (v === undefined || kindOf(v) !== dk || (dk === 'number' && !Number.isFinite(v as number))) {
      out[k] = structuredClone(def);
    } else if (dk === 'object') {
      out[k] = fillFrom(def as Record<string, unknown>, v as Record<string, unknown>);
    }
  }
  return out;
}

/** Set an optional slice to its sanitized value, or remove it when nothing valid remains. */
function keepValid<K extends keyof Person>(
  p: Person,
  key: K,
  clean: (x: unknown) => Person[K] | undefined,
): void {
  if (p[key] === undefined) return;
  const v = clean(p[key]);
  if (v !== undefined) p[key] = v;
  else delete p[key];
}

/**
 * Validate a saved person and fill defaults for missing or mistyped fields, slice by slice and field by
 * field. A save from an earlier supported engine is upgraded by `migrate` first. Throws on a wrong schema, a
 * missing core slice, an engine version `migrate` does not support, or a `now` that is not a finite minute within
 * ±`MAX_MINUTE`. Optional slices are checked by their owning modules and dropped when malformed (absent means none).
 */
export function restore(input: unknown): Person {
  if (!isObject(input)) throw new Error('restore: not an object');
  if (input.schema !== PERSON_SCHEMA) throw new Error(`restore: unsupported schema ${String(input.schema)}`);
  if (typeof input.engine !== 'string') throw new Error('restore: missing engine');
  // Saves from earlier engines are upgraded first (see migrate.ts); unsupported versions throw there.
  const json = input.engine === ENGINE_VERSION ? input : migrate(input);
  if (typeof json.id !== 'string' || typeof json.name !== 'string')
    throw new Error('restore: missing identity');
  // A minute must be finite and within ±MAX_MINUTE (security review H2: 1e999 parses to Infinity, and past
  // about 5e17 a step rounds back to the same minute).
  if (!isMinute(json.now)) throw new Error('restore: missing or out-of-range now');
  for (const k of REQUIRED_OBJECTS) if (!isObject(json[k])) throw new Error(`restore: missing ${k}`);
  const life = json.life as Record<string, unknown>;
  const defaults = createPerson({
    id: json.id,
    name: json.name,
    seed: 0,
    now: json.now,
    bornAt: isMinute(life.bornAt) ? life.bornAt : 0,
    sex: life.sex === 'female' ? 'female' : 'male',
  });
  const saved = structuredClone(json);
  const out = { ...defaults, ...(saved as Partial<Person>) } as Person;
  const slices = out as unknown as Record<string, unknown>;
  // Unknown top-level keys are dropped, not carried (security review 2026-10-04): only the person's own slices
  // and its known optional ones survive a restore.
  for (const k of Object.keys(slices))
    if (!Object.hasOwn(defaults, k) && !OPTIONAL_KEYS.has(k)) delete slices[k];
  const defs = defaults as unknown as Record<string, unknown>;
  for (const k of REQUIRED_OBJECTS) {
    slices[k] = fillFrom(defs[k] as Record<string, unknown>, saved[k] as Record<string, unknown>);
  }
  if (!Array.isArray(out.habits)) out.habits = [];
  if (!Array.isArray(out.trace)) out.trace = [];
  if (!isMinute(out.life.bornAt)) out.life.bornAt = defaults.life.bornAt;
  if (typeof out.nextDecision !== 'number') out.nextDecision = 0;
  if (out.activity === undefined) out.activity = null;
  // Optional record slices (1.2.0): absent means empty; a mistyped one is dropped rather than trusted.
  if (out.chronicle !== undefined && !Array.isArray(out.chronicle)) delete out.chronicle;
  if (out.chronicleDay !== undefined && !isObject(out.chronicleDay)) delete out.chronicleDay;
  if (out.lexicon !== undefined && !isObject(out.lexicon)) delete out.lexicon;
  // Optional fields inside the core slices, each checked by its owner.
  sanitizeBody(out.body, out.now);
  sanitizeInjuries(out.body);
  sanitizeGroups(out.social);
  sanitizeImpressions(out.social);
  sanitizeWill(out.will);
  sanitizeCrisis(out.affect);
  sanitizeAgenda(out.agenda);
  sanitizeGists(out.memory);
  // Optional top-level slices (1.8.0 onward), each checked by its owner.
  keepValid(out, 'chronicleYears', sanitizeYears);
  keepValid(out, 'character', sanitizeCharacter);
  keepValid(out, 'skillRetention', sanitizeSkillRetention);
  keepValid(out, 'family', sanitizeFamily);
  keepValid(out, 'bonds', sanitizeBonds);
  keepValid(out, 'ambient', sanitizeAmbient);
  keepValid(out, 'retention', cleanRetention);
  boundLists(out);
  return out;
}

/**
 * Hold a restored person's lists to the bounds the live code keeps (security review H2: a crafted save with
 * 200,000 gists restored whole and made every later day slow). A save the engine wrote is already within them,
 * so this changes nothing for it. Episodes and gists keep the most salient; dated lists keep the newest.
 */
function boundLists(p: Person): void {
  const top = <T extends { salience: number }>(xs: T[], n: number): T[] => {
    if (xs.length <= n) return xs;
    const keep = new Set([...xs].sort((a, b) => b.salience - a.salience).slice(0, n));
    return xs.filter((x) => keep.has(x));
  };
  p.memory.episodes = top(p.memory.episodes, MEMORY_DEFAULTS.maxEpisodes);
  if (p.memory.gists) p.memory.gists = top(p.memory.gists, GIST_DEFAULTS.maxGists);
  const newest = <T>(xs: T[], n: number): T[] => (xs.length <= n ? xs : xs.slice(xs.length - n));
  p.memory.expectations = newest(p.memory.expectations, MEMORY_DEFAULTS.maxExpectations);
  p.trace = newest(p.trace, traceLimit(p));
  p.habits = newest(p.habits, HABIT_DEFAULTS.maxHabits);
  if (p.chronicle) p.chronicle = newest(p.chronicle, CHRONICLE_DEFAULTS.maxDays);
  if (p.chronicleYears) p.chronicleYears = newest(p.chronicleYears, CHRONICLE_DEFAULTS.maxYears);
}
