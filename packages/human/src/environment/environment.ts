/**
 * SCOPE: appraisal of the surroundings (HF 2.0 L4). The host perceives the world and supplies it with `setAmbient`:
 * cold, darkness, crowding, beauty or squalor, weather, the day's length and whether the person is outdoors. The
 * framework owns what those do to a person, applied by the composite while time passes. It owns the optional
 * `Person.ambient` slice; a person with none is unaffected, so existing runs are unchanged.
 *
 * Mood. A small offset is added to the mood's target (the needs term spans about ±0.6): −0.08 × cold; −0.03 ×
 * darkness while awake; −0.06 × a short-day factor (0 at 12 hours of daylight, 1 at 6) × (0.5 + emotionality);
 * +0.04 × weather, at 0.4 strength indoors; +0.06 × beauty (squalor is negative); −0.06 × crowding beyond a
 * tolerance of 0.4 + 0.3 × extraversion. The magnitudes are deliberately small and are engineering assumptions:
 * daily weather effects on mood are small (F22 in research/family-environment-sources.md) and almost absent from
 * life satisfaction (F24); pleasant weather lifts mood mainly for people outdoors (F23); mood tracks day length
 * (F25), most people notice seasonal change but few are impaired by it, and a large survey found no link between
 * depression and season or latitude (F26), so the seasonal term is a nudge scaled by emotionality, not a disorder.
 * Felt crowding differs from density (F29), hence the trait tolerance; perceived disorder raises anxiety and
 * mistrust and nature reduces rumination (F30).
 *
 * Body. Cold raises metabolism by up to 15% (more food and water used), slows recovery from exertion (half-life up
 * to doubled) and makes sleep less restorative (sleep pressure falls up to 30% slower). Darkness while awake lets
 * sleep pressure build up to 15% faster, the inverse of light raising alertness (F27). All four factors are
 * engineering assumptions; thermal-comfort effect sizes were not found (research/family-environment-sources.md).
 *
 * Needs, per hour: crowding beyond tolerance drains autonomy (0.02 × excess), squalor drains safety (0.02 ×
 * squalor; disorder works through mistrust and powerlessness, F30), beauty restores leisure (0.01 × beauty).
 * Entering a place of beauty ≥ 0.7 brings a moment of awe.
 *
 * Not modelled: the physical-warmth and social-warmth link (it failed replication, F28), heat stress, noise, smell,
 * hypothermia or frostbite (a host injures or sickens), clinical seasonal depression, light's circadian phase
 * shifts, and adaptation to a climate over years.
 */
import { feel } from '../affect/index.ts';
import type { BodyParams } from '../body/index.ts';
import { clamp, clamp01, clampSigned } from '../core/index.ts';
import type {
  AmbientPercept,
  AmbientState,
  LifeModifiers,
  Minute,
  Person,
  PsychologicalNeed,
  Signed,
  Unit,
} from '../types.ts';

export const ENVIRONMENT_DEFAULTS = {
  coldMood: 0.08,
  darkMood: 0.03,
  shortDayMood: 0.06,
  /** Day length (hours) with no seasonal effect, and the length at which it is full. */
  longDayHours: 12,
  shortDayHours: 6,
  weatherMood: 0.04,
  indoorWeather: 0.4,
  beautyMood: 0.06,
  crowdingMood: 0.06,
  crowdingTolerance: 0.4,
  crowdingToleranceExtraversion: 0.3,
  coldMetabolism: 0.15,
  coldRecovery: 1,
  coldSleep: 0.3,
  darkWake: 0.15,
  crowdingAutonomyPerHour: 0.02,
  squalorSafetyPerHour: 0.02,
  beautyLeisurePerHour: 0.01,
  aweBeauty: 0.7,
  aweIntensity: 0.4,
};

function clean(x: AmbientPercept): AmbientPercept {
  const out: AmbientPercept = {};
  const unit = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : undefined);
  const signed = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? clampSigned(v) : undefined);
  const cold = unit(x.cold);
  if (cold !== undefined) out.cold = cold;
  const dark = unit(x.dark);
  if (dark !== undefined) out.dark = dark;
  const crowding = unit(x.crowding);
  if (crowding !== undefined) out.crowding = crowding;
  const beauty = signed(x.beauty);
  if (beauty !== undefined) out.beauty = beauty;
  const weather = signed(x.weather);
  if (weather !== undefined) out.weather = weather;
  if (typeof x.dayLength === 'number' && Number.isFinite(x.dayLength))
    out.dayLength = clamp(x.dayLength, 0, 24);
  if (typeof x.outdoors === 'boolean') out.outdoors = x.outdoors;
  return out;
}

/** Validate a saved ambient slice; undefined when malformed (used by `restore`). @internal */
export function sanitizeAmbient(x: unknown): AmbientState | undefined {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return undefined;
  const a = x as Record<string, unknown>;
  if (typeof a.since !== 'number' || !Number.isFinite(a.since)) return undefined;
  if (typeof a.percept !== 'object' || a.percept === null || Array.isArray(a.percept)) return undefined;
  return { percept: clean(a.percept as AmbientPercept), since: a.since };
}

/**
 * The host's perception of p's surroundings from `at` (default `p.now`) until the next call. Call it when the
 * person moves or the world changes, before the time is ticked. Entering beauty ≥ 0.7 brings awe. Returns a copy.
 */
export function setAmbient(p: Person, percept: AmbientPercept, at: Minute = p.now): AmbientState {
  const seen = clean(percept);
  const before = p.ambient?.percept.beauty ?? 0;
  p.ambient = { percept: seen, since: at };
  const E = ENVIRONMENT_DEFAULTS;
  if ((seen.beauty ?? 0) >= E.aweBeauty && before < E.aweBeauty && p.body.alive)
    feel(p, 'awe', E.aweIntensity * (seen.beauty ?? 0), 'event:beauty', at);
  return { percept: { ...seen }, since: at };
}

/** Remove the surroundings (the person is back to no environmental effect). */
export function clearAmbient(p: Person): void {
  delete p.ambient;
}

/** Crowding beyond the person's tolerance, 0..1. */
function crowdingExcess(p: Person, crowding: Unit): Unit {
  const E = ENVIRONMENT_DEFAULTS;
  const tol = clamp01(E.crowdingTolerance + E.crowdingToleranceExtraversion * p.traits.extraversion);
  return tol >= 1 ? 0 : clamp01((crowding - tol) / (1 - tol));
}

/** The mood-target offset from the surroundings (0 with none). Read only. */
export function ambientMood(p: Person): Signed {
  const a = p.ambient?.percept;
  if (!a) return 0;
  const E = ENVIRONMENT_DEFAULTS;
  let v = 0;
  if (a.cold) v -= E.coldMood * a.cold;
  if (a.dark && !p.body.asleep) v -= E.darkMood * a.dark;
  if (a.dayLength !== undefined) {
    const short = clamp01((E.longDayHours - a.dayLength) / (E.longDayHours - E.shortDayHours));
    v -= E.shortDayMood * short * (0.5 + p.traits.emotionality);
  }
  if (a.weather) v += E.weatherMood * a.weather * (a.outdoors ? 1 : E.indoorWeather);
  if (a.beauty) v += E.beautyMood * a.beauty;
  if (a.crowding) v -= E.crowdingMood * crowdingExcess(p, a.crowding);
  return v;
}

/** Life modifiers adjusted for the surroundings (cold raises metabolism); unchanged with none. */
export function ambientModifiers(p: Person, mods: LifeModifiers): LifeModifiers {
  const cold = p.ambient?.percept.cold ?? 0;
  if (cold <= 0) return mods;
  return { ...mods, metabolism: mods.metabolism * (1 + ENVIRONMENT_DEFAULTS.coldMetabolism * cold) };
}

/** Body parameters adjusted for the surroundings; `base` itself when nothing applies. */
export function ambientBodyParams(p: Person, base: BodyParams): BodyParams {
  const a = p.ambient?.percept;
  const cold = a?.cold ?? 0;
  const dark = a?.dark ?? 0;
  if (cold <= 0 && dark <= 0) return base;
  const E = ENVIRONMENT_DEFAULTS;
  return {
    ...base,
    exertionRecoverHalfLife: base.exertionRecoverHalfLife * (1 + E.coldRecovery * cold),
    exertionRecoverHalfLifeAsleep: base.exertionRecoverHalfLifeAsleep * (1 + E.coldRecovery * cold),
    sleepTau: base.sleepTau * (1 + E.coldSleep * cold),
    wakeTau: base.wakeTau * (1 - E.darkWake * dark),
  };
}

/** Psychological need changes over `dt` minutes in the surroundings (empty with none). Read only. */
export function ambientNeeds(p: Person, dt: number): Partial<Record<PsychologicalNeed, number>> {
  const a = p.ambient?.percept;
  if (!a || !(dt > 0)) return {};
  const E = ENVIRONMENT_DEFAULTS;
  const hours = dt / 60;
  const out: Partial<Record<PsychologicalNeed, number>> = {};
  const excess = a.crowding ? crowdingExcess(p, a.crowding) : 0;
  if (excess > 0) out.autonomy = -E.crowdingAutonomyPerHour * excess * hours;
  const beauty = a.beauty ?? 0;
  if (beauty < 0) out.safety = E.squalorSafetyPerHour * beauty * hours;
  else if (beauty > 0) out.leisure = E.beautyLeisurePerHour * beauty * hours;
  return out;
}
