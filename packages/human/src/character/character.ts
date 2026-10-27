/** SCOPE: always-present bounded maturation and annual sustained experience.
 * Rates and reversion are engineering assumptions, directions from research/long-run-sources.md.
 * Received caregiver contact changes values only through its actual exposure. No inherited norms.
 */

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
  if (!s || !s.character || !s.traits || !s.values)
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
  if (issues.length) throw new RangeError(issues[0]!.message);
  return structuredClone(s) as State;
};
export const characterOwner: CharacterOwner = {
  initialize(input, context) {
    return checked({
      traits: structuredClone(input.traits),
      values: structuredClone(input.values),
      character: {
        baseTraits: structuredClone(input.traits),
        baseValues: structuredClone(input.values),
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
    const fromAge = (c.agedTo - context.life.bornAt) / YEAR,
      toAge = (context.to - context.life.bornAt) / YEAR;
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
    c.agedTo = context.to;
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
    if (parents.length !== 2) throw new RangeError('Two parents required');
    const rng = structuredClone(cursor);
    if (cursor.status !== 'active') throw new RangeError('Completed inheritance cursor');
    const traits = {} as Traits;
    const h = 0.3,
      sd = 0.15 * Math.sqrt(1 - (h * h) / 2);
    for (const key of TRAIT_KEYS) {
      const mid = (parents[0]![key] + parents[1]![key]) / 2;
      traits[key] = clamp(0.5 + h * (mid - 0.5) + normal(rng.words, 0, sd), 0.02, 0.98);
    }
    rng.uniformDraws += 12;
    return { traits, rng };
  },
};
Object.freeze(CHARACTER_DEFAULTS.traitPerYear);
Object.freeze(CHARACTER_DEFAULTS.valuePerYear);
Object.freeze(CHARACTER_DEFAULTS);
