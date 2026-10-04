/**
 * SCOPE: slow change of HEXACO traits and Schwartz values over adult life (1.8.0, opt-in per person with
 * `enableCharacterChange`; without it traits and values stay as set at birth). Two channels, both small and bounded:
 *
 * - **Maturation** (age only), from 18 to 65, at fixed yearly rates in the directions of the age trends:
 *   Honesty-Humility rises most, Emotionality falls, Extraversion rises a little, Conscientiousness rises until about
 *   40, Agreeableness and Openness stay level (Ashton & Lee 2016, HEXACO, cross-sectional; Roberts, Walton &
 *   Viechtbauer 2006, longitudinal Big Five: conscientiousness and emotional stability rise most between 20 and 40;
 *   Bleidorn et al. 2022: mean-level change is real but small). Values: benevolence and tradition rise, power,
 *   achievement, stimulation and self-direction fall (Milfont, Milojev & Sibley 2016: older adults emphasise others'
 *   welfare and tradition, younger ones status, power and independent thought; values are largely stable).
 * - **Sustained experience**, once a year from that year's days: a year lived in low mood raises Emotionality and a
 *   good year lowers it (Jeronimus et al. 2014: lasting difficulties and life quality, not single events, move
 *   neuroticism a little and lastingly); a year of commitments kept far more than broken raises Conscientiousness
 *   (social investment: Roberts, Wood & Smith 2005; Lodi-Smith & Roberts 2007, cross-sectional); much time with
 *   others raises Extraversion and little lowers it; a varied year raises Openness and a narrow one lowers it. Each
 *   push is at most `CHARACTER_DEFAULTS.maxExperiencePerYear`. Single events change nothing directly.
 *
 * Every trait and value stays within `maxDrift` of where it stood when drift was enabled, so rank order mostly holds
 * (high adult rank-order stability, Bleidorn et al. 2022). All rates, thresholds and caps are engineering assumptions
 * chosen for these directions (research/long-run-sources.md); none converts a published effect size. It does not
 * model childhood or adolescent personality development, change in honesty or agreeableness from experience,
 * therapy, cohort effects, individual differences in plasticity, or norm conviction (owned by `conscience/`).
 * Traits never branch logic (framework.md, locked decisions): this module only moves the coefficients.
 */
import { clamp, clamp01 } from '../core/index.ts';
import type { CharacterState, Minute, Person, Signed, Traits, Values } from '../types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../types.ts';

export const CHARACTER_DEFAULTS = {
  /** Largest distance any trait or value may drift from its value when drift was enabled. */
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

const TRAIT_KEYS = Object.keys(CHARACTER_DEFAULTS.traitPerYear) as (keyof Traits)[];
const VALUE_KEYS = Object.keys(CHARACTER_DEFAULTS.valuePerYear) as (keyof Values)[];

const yearOf = (now: Minute): number => Math.floor(Math.floor(now / MINUTES_PER_DAY) / 365);
const emptyAcc = (): CharacterState['acc'] => ({
  days: 0,
  mood: 0,
  kept: 0,
  broken: 0,
  social: 0,
  variety: 0,
});

/** Turn on slow trait and value change for this person (idempotent); the current values become the anchor. */
export function enableCharacterChange(p: Person): void {
  if (p.character) return;
  p.character = {
    baseTraits: { ...p.traits },
    baseValues: { ...p.values },
    year: yearOf(p.now),
    acc: emptyAcc(),
    agedTo: p.now,
  };
}

/** What one day contributes to the year's experience. */
export interface CharacterDay {
  /** Mean (or end-of-day) mood valence. */
  mood: Signed;
  kept?: number;
  broken?: number;
  /** Minutes spent with others. */
  socialMinutes?: number;
  /** Distinct actions done. */
  variety?: number;
}

/** Add a day to the current year's experience (drift on only). */
export function noteCharacterDay(p: Person, d: CharacterDay): void {
  const acc = p.character?.acc;
  if (!acc) return;
  acc.days += 1;
  acc.mood += d.mood;
  acc.kept += d.kept ?? 0;
  acc.broken += d.broken ?? 0;
  acc.social += d.socialMinutes ?? 0;
  acc.variety += d.variety ?? 0;
}

/** Add minutes spent with others to the current year's experience (drift on only); `finish` calls it. */
export function noteCharacterSocial(p: Person, minutes: number): void {
  const acc = p.character?.acc;
  if (acc && minutes > 0) acc.social += minutes;
}

/** Years of age lived in [from, to] that fall inside [lo, hi]. */
function overlap(fromAge: number, toAge: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(toAge, hi) - Math.max(fromAge, lo));
}

/** The experience pushes a year's accumulator implies, per trait (pure). */
export function experiencePush(acc: CharacterState['acc']): Partial<Record<keyof Traits, number>> {
  const K = CHARACTER_DEFAULTS;
  if (acc.days < K.minDays) return {};
  const cap = (x: number) => clamp(x, -K.maxExperiencePerYear, K.maxExperiencePerYear);
  const out: Partial<Record<keyof Traits, number>> = {};
  const mood = acc.mood / acc.days;
  out.emotionality = cap(-K.moodGain * mood);
  const duties = acc.kept + acc.broken;
  if (duties >= K.minCommitments)
    out.conscientiousness = cap((K.dutyGain * (acc.kept - acc.broken)) / duties);
  const share = acc.social / (acc.days * K.wakingMinutes);
  out.extraversion = cap(K.socialGain * (share - K.socialBaseline));
  out.openness = cap(K.varietyGain * (acc.variety / acc.days - K.varietyBaseline));
  return out;
}

function bounded(value: number, base: number): number {
  const K = CHARACTER_DEFAULTS;
  return clamp01(clamp(value, base - K.maxDrift, base + K.maxDrift));
}

/**
 * Apply maturation from `agedTo` to `to` and, for every year boundary crossed, the closed year's experience push
 * (drift on only). The composite calls it at midnight and from `skip` (which lives no experience, so only maturation
 * applies across a skipped gap). Returns whether anything changed.
 */
export function ageCharacter(p: Person, to: Minute): boolean {
  const c = p.character;
  if (!c || to <= c.agedTo) return false;
  const K = CHARACTER_DEFAULTS;
  const fromAge = (c.agedTo - p.life.bornAt) / MINUTES_PER_YEAR;
  const toAge = (to - p.life.bornAt) / MINUTES_PER_YEAR;
  const years = overlap(fromAge, toAge, K.maturationFrom, K.maturationTo);
  const cYears = overlap(
    fromAge,
    toAge,
    K.maturationFrom,
    Math.min(K.maturationTo, K.conscientiousnessUntil),
  );
  const push: Partial<Record<keyof Traits, number>> = {};
  if (yearOf(to) > c.year) {
    Object.assign(push, experiencePush(c.acc));
    c.year = yearOf(to);
    c.acc = emptyAcc();
  }
  for (const k of TRAIT_KEYS) {
    const span = k === 'conscientiousness' ? cYears : years;
    const delta = K.traitPerYear[k] * span + (push[k] ?? 0);
    if (delta !== 0) p.traits[k] = bounded(p.traits[k] + delta, c.baseTraits[k]);
  }
  for (const k of VALUE_KEYS) {
    const delta = K.valuePerYear[k] * years;
    if (delta !== 0) p.values[k] = bounded(p.values[k] + delta, c.baseValues[k]);
  }
  c.agedTo = to;
  return true;
}
