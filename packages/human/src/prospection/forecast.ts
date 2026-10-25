/**
 * SCOPE (bodily forecast, 2.5.0): a person anticipates their own body during exertion they know must follow an
 * act ("I can reach the top, but I'll be spent for the descent"). The host declares the follow-on spans on the
 * offer (`Affordance.followedBy`); the person simulates a copy of their body through the act and those spans with
 * the ordinary body model, reads it as they perceive it, and weighs the worst perceived fatigue, sleepiness,
 * hunger or thirst during the follow-on spans. One term, `forecast:body` = -forecastScale × smoothstep(comfortAt,
 * spentAt, worst), joins the offer's utility; it is pure and draws no randomness. Offers without `followedBy`
 * get no forecast, so existing hosts continue exactly.
 *
 * The forecast inherits the body model's limits and the person's misperceptions. Exertion relaxes toward the
 * current effort; only a person with the opt-in fatigue store (2.6.0, `enableFatigueStore`) carries accumulated
 * exertion, so only then does a long climb by itself leave them more spent for the descent; unfelt
 * sleep debt stays unfelt in the forecast; an open fast's damping of hunger and thirst applies (2.6.0) as it is
 * now, held for the whole forecast even if the fast would end during it; host surroundings are not applied (the person's own body rates and life
 * modifiers are, but not `ambient` parameters). Existing bleeding, illness and healing run in the copy, so an
 * open wound can read as being spent, and death in the forecast reads as fully spent. The term is absolute
 * (see `bodyForecastTerm`). It does not plan, search routes, schedule rests on the way or
 * predict injuries, and it is not a calibrated estimate of human anticipation. Every number is an engineering
 * default. 2.8.0: an offer may carry its own thresholds (`Affordance.forecastAt`, from The Glance's night
 * keepers); offers without it read exactly as before.
 */
import {
  BODY_DEFAULTS,
  type BodyForecastSpan,
  type BodyPerceptionContext,
  forecastBody,
} from '../body/index.ts';
import { clamp01, round } from '../core/index.ts';
import type { Affordance, LifeModifiers, Person, Term } from '../types.ts';

export const FORECAST_DEFAULTS = {
  /** Worst perceived readout during a follow-on from which the forecast starts to weigh. */
  comfortAt: 0.8,
  /** Worst perceived readout at which the person expects to be spent (full weight). */
  spentAt: 0.97,
  /** Weight at full expected spending (utility units; the effort term is on the order of 0.1–1). */
  forecastScale: 1.2,
  /** At most this many follow-on spans are read, and at most this many minutes in total. */
  maxSpans: 4,
  maxMinutes: 24 * 60,
} as const;

/**
 * The forecast thresholds for an offer (2.8.0): its `forecastAt` when it forms a valid pair, else the defaults.
 * Pure.
 */
export function forecastThresholds(aff: Pick<Affordance, 'forecastAt'>): {
  comfortAt: number;
  spentAt: number;
} {
  const D = FORECAST_DEFAULTS;
  const at = aff.forecastAt;
  if (!at || typeof at !== 'object') return { comfortAt: D.comfortAt, spentAt: D.spentAt };
  const c = Number.isFinite(at.comfortAt) ? (at.comfortAt as number) : D.comfortAt;
  const s = Number.isFinite(at.spentAt) ? (at.spentAt as number) : D.spentAt;
  return c >= 0 && c < s && s <= 1
    ? { comfortAt: c, spentAt: s }
    : { comfortAt: D.comfortAt, spentAt: D.spentAt };
}

const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** The person's forecast for an offer: the act, then its follow-on spans. Empty without `followedBy`. Pure. */
export function bodyForecastFor(
  p: Person,
  aff: Affordance,
  mods: LifeModifiers,
  perception?: BodyPerceptionContext,
): BodyForecastSpan[] {
  const follow = aff.followedBy;
  if (!Array.isArray(follow) || follow.length === 0 || !p.body.alive) return [];
  const D = FORECAST_DEFAULTS;
  const d0 = Number.isFinite(aff.duration) ? Math.min(D.maxMinutes, Math.max(0, aff.duration)) : 0;
  const spans = [
    {
      label: aff.label,
      duration: d0,
      load: {
        effort: clamp01(aff.effort),
        focus: clamp01(aff.focus ?? 0),
        mode: aff.mode ?? 'awake',
      } as const,
    },
  ];
  let total = spans[0]?.duration ?? 0;
  for (const f of follow.slice(0, D.maxSpans)) {
    if (!f || typeof f !== 'object') continue;
    const d = Number.isFinite(f.duration) ? Math.max(0, f.duration) : 0;
    if (total + d > D.maxMinutes) break;
    total += d;
    spans.push({
      label: f.label ?? 'after',
      duration: d,
      load: { effort: clamp01(f.effort), focus: clamp01(f.focus ?? 0), mode: 'awake' },
    });
  }
  return forecastBody(p, spans, mods, BODY_DEFAULTS, 30, perception);
}

/**
 * The `forecast:body` term for an offer, or undefined (no follow-on, or not expected to weigh). Absolute by
 * design: it weighs being in that state *while doing* the follow-on, so a person already sleepy or thirsty is
 * charged for exerting so, while an offer with no declared follow-on is not (a night hike with a declared descent
 * costs more than staying home). A resting baseline was tried and rejected: thirst and sleepiness rise at rest
 * too, which cancelled the very case the forecast exists for. Pure.
 */
export function bodyForecastTerm(
  p: Person,
  aff: Affordance,
  mods: LifeModifiers,
  perception?: BodyPerceptionContext,
): Term | undefined {
  const spans = bodyForecastFor(p, aff, mods, perception).slice(1);
  if (spans.length === 0) return undefined;
  const D = FORECAST_DEFAULTS;
  const at = forecastThresholds(aff);
  const worst = Math.max(...spans.map((s) => s.worst));
  const v = round(-D.forecastScale * smooth(at.comfortAt, at.spentAt, worst));
  return v < 0 ? { source: 'forecast:body', value: v } : undefined;
}

/** A first-person line for the forecast (narration only); `at` is the offer's thresholds (2.8.0, default as before). */
export function forecastLine(
  spans: readonly BodyForecastSpan[],
  at: { comfortAt: number; spentAt: number } = FORECAST_DEFAULTS,
  options: { plainEnglish?: boolean } = {},
): string {
  const after = spans.slice(1);
  if (after.length === 0) return '';
  let w = after[0] as BodyForecastSpan;
  for (const s of after) if (s.worst > w.worst) w = s;
  if (options.plainEnglish) {
    const label = w.label === 'after' ? 'what comes next' : w.label;
    const state = {
      fatigue: 'too tired',
      sleepiness: 'too sleepy',
      hunger: 'too hungry',
      thirst: 'too thirsty',
    }[w.worstOf];
    if (w.worst >= at.spentAt) return `I can do this. I will be ${state} for ${label}.`;
    if (w.worst >= at.comfortAt) return `I can do this, but ${label} will be hard.`;
    return `I can manage ${label} afterward.`;
  }
  const what = { fatigue: 'spent', sleepiness: 'too sleepy', hunger: 'too hungry', thirst: 'too thirsty' }[
    w.worstOf
  ];
  if (w.worst >= at.spentAt) return `I can do it, but I'll be ${what} for ${w.label}.`;
  if (w.worst >= at.comfortAt) return `I can do it, though ${w.label} will be hard.`;
  return `I'll still have enough for ${w.label}.`;
}
