/**
 * SCOPE (bodily forecast, 2.5.0): a person anticipates their own body during exertion they know must follow an
 * act ("I can reach the top, but I'll be spent for the descent"). The host declares the follow-on spans on the
 * offer (`Affordance.followedBy`); the person simulates a copy of their body through the act and those spans with
 * the ordinary body model, reads it as they perceive it, and weighs the worst perceived fatigue, sleepiness,
 * hunger or thirst during the follow-on spans. One term, `forecast:body` = -forecastScale × smoothstep(comfortAt,
 * spentAt, worst), joins the offer's utility; it is pure and draws no randomness. Offers without `followedBy`
 * get no forecast, so existing hosts continue exactly.
 *
 * The forecast inherits the body model's limits and the person's misperceptions: HF exertion relaxes toward the
 * current effort (no cumulative glycogen or muscle-damage store), so a long climb does not by itself leave a
 * person more spent for the descent unless sleepiness, hunger, thirst or the descent's own effort do; unfelt
 * sleep debt stays unfelt in the forecast; a fast's damped hunger and thirst are not applied (so a fasting
 * person forecasts them undamped); host surroundings are not applied (the person's own body rates and life
 * modifiers are, but not `ambient` parameters). Existing bleeding, illness and healing run in the copy, so an
 * open wound can read as being spent, and death in the forecast reads as fully spent. The term is absolute
 * (see `bodyForecastTerm`). It does not plan, search routes, schedule rests on the way or
 * predict injuries, and it is not a calibrated estimate of human anticipation. Every number is an engineering
 * default.
 */
import { type BodyForecastSpan, forecastBody } from '../body/index.ts';
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

const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** The person's forecast for an offer: the act, then its follow-on spans. Empty without `followedBy`. Pure. */
export function bodyForecastFor(p: Person, aff: Affordance, mods: LifeModifiers): BodyForecastSpan[] {
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
  return forecastBody(p, spans, mods);
}

/**
 * The `forecast:body` term for an offer, or undefined (no follow-on, or not expected to weigh). Absolute by
 * design: it weighs being in that state *while doing* the follow-on, so a person already sleepy or thirsty is
 * charged for exerting so, while an offer with no declared follow-on is not (a night hike with a declared descent
 * costs more than staying home). A resting baseline was tried and rejected: thirst and sleepiness rise at rest
 * too, which cancelled the very case the forecast exists for. Pure.
 */
export function bodyForecastTerm(p: Person, aff: Affordance, mods: LifeModifiers): Term | undefined {
  const spans = bodyForecastFor(p, aff, mods).slice(1);
  if (spans.length === 0) return undefined;
  const D = FORECAST_DEFAULTS;
  const worst = Math.max(...spans.map((s) => s.worst));
  const v = round(-D.forecastScale * smooth(D.comfortAt, D.spentAt, worst));
  return v < 0 ? { source: 'forecast:body', value: v } : undefined;
}

/** A first-person line for the forecast (narration only). */
export function forecastLine(spans: readonly BodyForecastSpan[]): string {
  const after = spans.slice(1);
  if (after.length === 0) return '';
  let w = after[0] as BodyForecastSpan;
  for (const s of after) if (s.worst > w.worst) w = s;
  const what = { fatigue: 'spent', sleepiness: 'too sleepy', hunger: 'too hungry', thirst: 'too thirsty' }[
    w.worstOf
  ];
  if (w.worst >= FORECAST_DEFAULTS.spentAt) return `I can do it, but I'll be ${what} for ${w.label}.`;
  if (w.worst >= FORECAST_DEFAULTS.comfortAt) return `I can do it, though ${w.label} will be hard.`;
  return `I'll still have enough for ${w.label}.`;
}
