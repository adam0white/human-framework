import { cloneData } from '../core/clone.ts';
import { Memo } from '../core/memo.ts';
import { hashCanonical } from '../run-canonical.ts';
/** SCOPE: always-present bounded maturation and annual sustained experience.
 * Rates and reversion are engineering assumptions, directions from research/long-run-sources.md.
 * Received caregiver contact changes values only through its actual exposure. No inherited norms.
 */

import { freezeData, required } from '../body/span.ts';
import { dexp, dlog } from '../core/libm.ts';
import { normal } from '../core/random.ts';
import { validateNarrativeFields, validateNarrativeJson } from '../memory/memory.ts';
import type {
  CharacterOwner,
  CharacterState,
  DeepReadonly,
  Traits,
  ValidationIssue,
  Values,
} from '../run-schema.ts';
export const CHARACTER_DEFAULTS = {
  /** Largest distance any trait or value may drift from its value at construction. */
  maxDrift: 0.15,
  /** Ages (years) between which maturation applies. */
  maturationFrom: 18,
  maturationTo: 65,
  /** Conscientiousness matures only until this age. */
  conscientiousnessUntil: 40,
  /** Maturation per year (assumptions; directions from research/long-run-sources.md). */
  traitPerYear: {
    honesty: 0.003,
    emotionality: -0.0015,
    extraversion: 0.001,
    agreeableness: 0,
    conscientiousness: 0.002,
    openness: 0,
  } as Record<keyof Traits, number>,
  valuePerYear: {
    benevolence: 0.0015,
    universalism: 0,
    tradition: 0.0015,
    conformity: 0,
    security: 0,
    achievement: -0.001,
    power: -0.001,
    hedonism: 0,
    stimulation: -0.0015,
    selfDirection: -0.001,
  } as Record<keyof Values, number>,
  /** Largest experience push on one trait in one year. */
  maxExperiencePerYear: 0.01,
  /**
   * Fraction of a trait's experience offset that fades each year (set point: a constant life stops moving traits
   * once the offset reaches push / reversion; only changes in life quality move them further).
   */
  experienceReversion: 0.1,
  /** Fewer days than this in a year's record: no experience push (a year barely lived says little). */
  minDays: 60,
  /** Emotionality push per unit of mean mood below 0 (and pull above it). */
  moodGain: 0.03,
  /** Conscientiousness push at a year of only kept commitments; needs `minCommitments` in the year. */
  dutyGain: 0.008,
  minCommitments: 20,
  /** Extraversion push per unit of daily share of waking time with others above `socialBaseline`. */
  socialGain: 0.04,
  socialBaseline: 0.15,
  /** Waking minutes per day the social share is taken over. */
  wakingMinutes: 16 * 60,
  /** Openness push per distinct action per day above `varietyBaseline`. */
  varietyGain: 0.002,
  varietyBaseline: 5,
};

const YEAR = 365 * 86400000;
const TRAIT_KEYS = [
  'honesty',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
] as const;
const VALUE_KEYS = [
  'benevolence',
  'universalism',
  'tradition',
  'conformity',
  'security',
  'achievement',
  'power',
  'hedonism',
  'stimulation',
  'selfDirection',
] as const;
const emptyAcc = (): CharacterState['acc'] => ({
  days: 0,
  mood: 0,
  kept: 0,
  broken: 0,
  socialMs: 0,
  variety: 0,
});
type State = ReturnType<CharacterOwner['initialize']>;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
function validate(s: DeepReadonly<State>): ValidationIssue[] {
  const issues: ValidationIssue[] = validateNarrativeJson(s);
  issues.push(
    ...validateNarrativeFields(
      s,
      ['character', 'traits', 'values'],
      ['character', 'traits', 'values'],
      'character',
    ),
  );
  const bad = (path: string) =>
    issues.push({ path, code: 'invalid-schema', message: 'Invalid character state' });
  if (!s?.character || !s.traits || !s.values)
    return [{ path: 'character', code: 'invalid-schema', message: 'Required character state missing' }];
  for (const [record, keys, path] of [
    [s.traits, TRAIT_KEYS, 'traits'],
    [s.values, VALUE_KEYS, 'values'],
    [s.character.baseTraits, TRAIT_KEYS, 'baseTraits'],
    [s.character.baseValues, VALUE_KEYS, 'baseValues'],
  ] as const) {
    if (!record) {
      bad(path);
      continue;
    }
    for (const key of keys) {
      const value = (record as Readonly<Record<string, number>>)[key];
      if (value === undefined || !Number.isFinite(value) || value < 0 || value > 1) bad(`${path}.${key}`);
    }
  }
  const c = s.character;
  issues.push(
    ...validateNarrativeFields(
      c,
      ['baseTraits', 'baseValues', 'year', 'acc', 'agedTo', 'experience'],
      ['baseTraits', 'baseValues', 'year', 'acc', 'agedTo', 'experience'],
      'character',
    ),
  );
  issues.push(...validateNarrativeFields(s.traits, TRAIT_KEYS, TRAIT_KEYS, 'traits'));
  issues.push(...validateNarrativeFields(s.values, VALUE_KEYS, VALUE_KEYS, 'values'));
  issues.push(...validateNarrativeFields(c.baseTraits, TRAIT_KEYS, TRAIT_KEYS, 'baseTraits'));
  issues.push(...validateNarrativeFields(c.baseValues, VALUE_KEYS, VALUE_KEYS, 'baseValues'));
  if (!Number.isSafeInteger(c.year) || !Number.isSafeInteger(c.agedTo)) bad('character.clock');
  if (!c.acc || !c.experience) {
    bad('character.acc');
    return issues;
  }
  issues.push(
    ...validateNarrativeFields(
      c.acc,
      ['days', 'mood', 'kept', 'broken', 'socialMs', 'variety'],
      ['days', 'mood', 'kept', 'broken', 'socialMs', 'variety'],
      'character.acc',
    ),
  );
  for (const key of ['days', 'mood', 'kept', 'broken', 'socialMs', 'variety'] as const)
    if (!Number.isFinite(c.acc[key]) || (key !== 'mood' && c.acc[key] < 0)) bad(`character.acc.${key}`);
  for (const [key, value] of Object.entries(c.experience))
    if (
      !TRAIT_KEYS.includes(key as keyof Traits) ||
      !Number.isFinite(value) ||
      Math.abs(value) > 0.15 + 1e-15
    )
      bad('character.experience');
  return issues;
}
const checked = (s: DeepReadonly<State>): State => {
  const issues = validate(s);
  const [issue] = issues;
  if (issue) throw new RangeError(issue.message);
  return cloneData(s) as State;
};
/** Pure source maturation from a retained semantic anchor. No RNG or caller endpoint. */
function matureCharacter(
  state: DeepReadonly<State>,
  bornAt: number,
  at: number,
  K: DeepReadonly<import('../run-schema.ts').Effective_CHARACTER_DEFAULTS>,
  readoutOnly = false,
): State {
  // Samplers discard Character metadata. Copy only the fields maturation writes;
  // base traits, base values and annual accumulators remain read-only here.
  const out = readoutOnly
      ? {
          traits: { ...state.traits },
          values: { ...state.values },
          character: { ...state.character, experience: { ...state.character.experience } },
        }
      : (cloneData(state) as State),
    c = out.character;
  if (!Number.isFinite(at) || at < c.agedTo) throw new RangeError('Character clock rewound');
  const fromAge = (c.agedTo - bornAt) / YEAR,
    toAge = (at - bornAt) / YEAR;
  const overlap = (lo: number, hi: number) => Math.max(0, Math.min(toAge, hi) - Math.max(fromAge, lo));
  const years = overlap(K.maturationFrom, K.maturationTo),
    cyears = overlap(K.maturationFrom, Math.min(K.maturationTo, K.conscientiousnessUntil));
  const bounded = (value: number, base: number) =>
    clamp(value, Math.max(0, base - K.maxDrift), Math.min(1, base + K.maxDrift));
  for (const key of TRAIT_KEYS) {
    const span = key === 'conscientiousness' ? cyears : years;
    const offset = c.experience[key] ?? 0;
    const path = bounded(out.traits[key] - offset + K.traitPerYear[key] * span, c.baseTraits[key]);
    const next = offset;
    out.traits[key] = bounded(path + next, c.baseTraits[key]);
    const kept = out.traits[key] - path;
    if (kept) c.experience[key] = kept;
    else delete c.experience[key];
  }
  if (fromAge < K.maturationFrom && toAge >= K.maturationFrom) c.baseValues = { ...out.values };
  for (const key of VALUE_KEYS)
    out.values[key] = bounded(out.values[key] + K.valuePerYear[key] * years, c.baseValues[key]);
  c.agedTo = at;
  return out;
}

/** Immutable internal source-law path. C0 constructs this before downstream physics. */
export function projectCharacterTrajectory(
  context: DeepReadonly<{
    person: string;
    life: { bornAt: number };
    continuation: import('../run-schema.ts').NarrativeContinuation['character'];
    effective: { builtins: { CHARACTER_DEFAULTS: import('../run-schema.ts').Effective_CHARACTER_DEFAULTS } };
    effectiveParametersHash: string;
  }>,
): import('../run-schema.ts').CharacterTrajectory {
  return characterPaths.get(
    JSON.stringify([
      context.person,
      context.life.bornAt,
      context.continuation,
      context.effectiveParametersHash,
      context.effective.builtins.CHARACTER_DEFAULTS,
    ]),
    () => buildCharacterTrajectory(context),
  );
}
const characterPaths = new Memo<import('../run-schema.ts').CharacterTrajectory>(256);
function buildCharacterTrajectory(
  context: Parameters<typeof projectCharacterTrajectory>[0],
): import('../run-schema.ts').CharacterTrajectory {
  const continuation = cloneData(context.continuation);
  checked(continuation.state);
  return freezeData({
    id: hashCanonical(
      'character-path',
      context.person,
      context.life.bornAt,
      continuation,
      context.effectiveParametersHash,
      context.effective.builtins.CHARACTER_DEFAULTS,
    ),
    bornAt: context.life.bornAt,
    continuation,
    parameters: cloneData(context.effective.builtins.CHARACTER_DEFAULTS),
  });
}
export function readCharacterTrajectory(
  path: DeepReadonly<import('../run-schema.ts').CharacterTrajectory>,
  at: number,
): Pick<State, 'traits' | 'values'> {
  // A frozen trajectory's reading at one time is shared by every sampler.
  if (!Object.isFrozen(path) || !Object.isFrozen(path.continuation.state)) {
    const state = matureCharacter(path.continuation.state, path.bornAt, at, path.parameters, true);
    return { traits: state.traits, values: state.values };
  }
  let times = readings.get(path);
  if (!times) {
    times = new Map();
    readings.set(path, times);
  }
  let reading = times.get(at);
  if (!reading) {
    const state = matureCharacter(path.continuation.state, path.bornAt, at, path.parameters, true);
    reading = Object.freeze({ traits: Object.freeze(state.traits), values: Object.freeze(state.values) });
    if (times.size >= 4096) times.clear();
    times.set(at, reading);
  }
  return reading;
}
const readings = new WeakMap<object, Map<number, Pick<State, 'traits' | 'values'>>>();

/** Exact affine pieces of the existing doubly clipped trait law, for rate integration.
 * Boundaries are source age/clipping changes, never a compulsory execution grid. */
export function characterTraitSegments(
  path: DeepReadonly<import('../run-schema.ts').CharacterTrajectory>,
  key: keyof Traits,
  from: number,
  to: number,
): import('../run-schema.ts').ScalarTrajectory {
  const s = path.continuation.state,
    k = path.parameters;
  if (from < s.character.agedTo || to < from) throw new RangeError('Invalid character path interval');
  const startAge = (s.character.agedTo - path.bornAt) / YEAR;
  const endAge =
    key === 'conscientiousness' ? Math.min(k.maturationTo, k.conscientiousnessUntil) : k.maturationTo;
  const activeFrom = Math.max(startAge, k.maturationFrom);
  const rate = k.traitPerYear[key];
  const base = s.character.baseTraits[key],
    offset = s.character.experience[key] ?? 0;
  const lo = Math.max(0, base - k.maxDrift),
    hi = Math.min(1, base + k.maxDrift);
  const points = [from, to, path.bornAt + k.maturationFrom * YEAR, path.bornAt + endAge * YEAR];
  if (rate !== 0)
    for (const level of [lo, hi, lo - offset, hi - offset]) {
      const age = activeFrom + (level - (s.traits[key] - offset)) / rate;
      if (age >= activeFrom && age <= endAge) points.push(path.bornAt + age * YEAR);
    }
  const boundaries = [...new Set(points.filter((t) => t >= from && t <= to))].sort((a, b) => a - b);
  const segments: import('../run-schema.ts').ScalarTrajectory['segments'][number][] = [];
  for (let i = 1; i < boundaries.length; i++) {
    const a = required(boundaries[i - 1]),
      b = required(boundaries[i]);
    const initial = readCharacterTrajectory(path, a).traits[key];
    const age = (a + (b - a) / 2 - path.bornAt) / YEAR;
    const raw = s.traits[key] - offset + rate * Math.max(0, Math.min(age, endAge) - activeFrom);
    const inner = clamp(raw, lo, hi);
    const slope =
      age > activeFrom && age < endAge && raw > lo && raw < hi && inner + offset > lo && inner + offset < hi
        ? (rate * 60000) / YEAR
        : 0;
    segments.push({ kind: 'linear', from: a, to: b, initial, ratePerMinute: slope });
  }
  if (from === to)
    segments.push({ kind: 'constant', from, to, value: readCharacterTrajectory(path, from).traits[key] });
  return { from, to, segments };
}

export const characterOwner: CharacterOwner = {
  initialize(input, context) {
    return checked({
      traits: cloneData(input.traits),
      values: cloneData(input.values),
      character: {
        baseTraits: cloneData(input.traits),
        baseValues: cloneData(input.values),
        year: Math.floor(context.at / YEAR),
        acc: emptyAcc(),
        agedTo: context.at,
        experience: {},
      },
    });
  },
  validate,
  advance(state, context) {
    checked(state);
    const out = checked(context.continuation.state),
      c = out.character,
      K = context.effective.builtins.CHARACTER_DEFAULTS;
    if (context.to < c.agedTo || context.to < context.from) throw new RangeError('Character clock rewound');
    const materialized = matureCharacter(context.continuation.state, context.life.bornAt, context.to, K);
    Object.assign(out, materialized);
    return {
      state: out,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: (Math.floor(context.to / YEAR) + 1) * YEAR,
      advancedThrough: context.to,
      continuation: {
        anchor: { ...context.continuation.anchor },
        state: checked(context.continuation.state),
      },
    };
  },
  receiveDay(state, day, context) {
    const out = checked(state),
      c = out.character,
      K = context.effective.builtins.CHARACTER_DEFAULTS;
    if (
      context.at !== (day.day + 1) * 86400000 ||
      Math.floor(day.day / 365) !== c.year ||
      !Number.isSafeInteger(context.socialMs) ||
      context.socialMs < 0
    )
      throw new RangeError('Character day receipt mismatch');
    const acc = c.acc;
    acc.days++;
    acc.mood += day.mood;
    acc.kept += day.kept.length;
    acc.broken += day.broken.length;
    acc.variety += day.actions.length;
    acc.socialMs += context.socialMs;
    const endYear = Math.floor(context.at / YEAR),
      crossed = Math.max(0, endYear - c.year);
    if (crossed) {
      const pushes: Partial<Record<keyof Traits, number>> = {};
      if (acc.days >= K.minDays) {
        const cap = (x: number) => clamp(x, -K.maxExperiencePerYear, K.maxExperiencePerYear);
        pushes.emotionality = cap((-K.moodGain * acc.mood) / acc.days);
        const duties = acc.kept + acc.broken;
        if (duties >= K.minCommitments)
          pushes.conscientiousness = cap((K.dutyGain * (acc.kept - acc.broken)) / duties);
        pushes.extraversion = cap(
          K.socialGain * (acc.socialMs / (acc.days * K.wakingMinutes * 60000) - K.socialBaseline),
        );
        pushes.openness = cap(K.varietyGain * (acc.variety / acc.days - K.varietyBaseline));
      }
      const bounded = (x: number, base: number) =>
        clamp(x, Math.max(0, base - K.maxDrift), Math.min(1, base + K.maxDrift));
      for (const key of TRAIT_KEYS) {
        const offset = c.experience[key] ?? 0,
          path = bounded(out.traits[key] - offset, c.baseTraits[key]),
          next = offset * dexp(dlog(1 - K.experienceReversion) * crossed) + (pushes[key] ?? 0);
        out.traits[key] = bounded(path + next, c.baseTraits[key]);
        const kept = out.traits[key] - path;
        if (kept) c.experience[key] = kept;
        else delete c.experience[key];
      }
      c.acc = emptyAcc();
      c.year = endYear;
    }
    return {
      state: out,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: (Math.floor(context.at / YEAR) + 1) * YEAR,
      advancedThrough: context.at,
      continuation: {
        anchor: { at: context.at, conditionId: `character-day:${day.day}` },
        state: checked(out),
      },
    };
  },
  receiveUpbringing(state, input, context) {
    const out = checked(state);
    if (input.child !== context.person || input.to !== context.at || input.from > input.to)
      throw new RangeError('Upbringing receipt mismatch');
    const carers = input.caregivers.filter((c) => c.id !== context.person);
    if (new Set(carers.map((c) => c.id)).size !== carers.length) throw new RangeError('Duplicate caregiver');
    const total = carers.reduce((s, c) => s + c.warmth, 0),
      age = (context.at - context.life.bornAt) / YEAR,
      plasticity = clamp((25 - age) / 13, 0, 1);
    if (total > 0 && plasticity > 0) {
      const mean = total / carers.length,
        rate = context.effective.builtins.FAMILY_DEFAULTS.valueRatePerYear;
      const k = 1 - dexp(((-rate * mean * (input.to - input.from)) / YEAR) * plasticity);
      for (const key of VALUE_KEYS) {
        const target = carers.reduce((s, c) => s + c.warmth * c.values[key], 0) / total;
        out.values[key] = clamp(out.values[key] + k * (target - out.values[key]), 0, 1);
      }
    }
    return {
      state: out,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
      continuation: { anchor: { at: context.at, conditionId: input.id }, state: checked(out) },
    };
  },
  deriveTraits(parents, cursor) {
    const [mother, father] = parents;
    if (parents.length !== 2 || !mother || !father) throw new RangeError('Two parents required');
    const rng = cloneData(cursor);
    if (cursor.status !== 'active') throw new RangeError('Completed inheritance cursor');
    const traits = {} as Traits;
    const h = 0.3,
      sd = 0.15 * Math.sqrt(1 - (h * h) / 2);
    for (const key of TRAIT_KEYS) {
      const mid = (mother[key] + father[key]) / 2;
      traits[key] = clamp(0.5 + h * (mid - 0.5) + normal(rng.words, 0, sd), 0.02, 0.98);
    }
    rng.uniformDraws += 12;
    return { traits, rng };
  },
};
Object.freeze(CHARACTER_DEFAULTS.traitPerYear);
Object.freeze(CHARACTER_DEFAULTS.valuePerYear);
Object.freeze(CHARACTER_DEFAULTS);
