/** SCOPE: perceived conditional body forecasts through the body owner's exact numerical kernel.
 * No independent physiology, hidden context inference or competing narration path. */

import * as bodyModule from '../body/body.ts';
import { clamp01, round } from '../core/index.ts';
import type {
  BodyForecastSpan,
  BodyProjectionContext,
  BodyState,
  DeepReadonly,
  FrameContext,
  Offer,
  TermData,
} from '../run-schema.ts';
export const FORECAST_DEFAULTS = {
  comfortAt: 0.8,
  spentAt: 0.97,
  forecastScale: 1.2,
  maxSpans: 4,
  maxMinutes: 1440,
};
export function bodyForecastFor(
  state: DeepReadonly<BodyState>,
  offer: DeepReadonly<Offer>,
  context: DeepReadonly<FrameContext & BodyProjectionContext>,
): readonly BodyForecastSpan[] {
  if (offer.expected.followedBy.length === 0 || !state.alive) return [];
  const d = context.effective.builtins.FORECAST_DEFAULTS;
  const first = Math.min(d.maxMinutes * 60000, offer.durationMs);
  const spans: {
    label: string;
    durationMs: number;
    load: { effort: number; focus: number; mode: 'awake' | 'sleep' };
  }[] = [
    {
      label: offer.label,
      durationMs: first,
      load: { effort: offer.demands.effort, focus: offer.demands.focus, mode: offer.demands.mode },
    },
  ];
  let total = first;
  for (const follow of offer.expected.followedBy.slice(0, d.maxSpans)) {
    if (total + follow.durationMs > d.maxMinutes * 60000) break;
    total += follow.durationMs;
    spans.push({
      label: follow.label ?? 'after',
      durationMs: follow.durationMs,
      load: { effort: follow.effort, focus: follow.focus ?? 0, mode: 'awake' },
    });
  }
  const result = bodyModule.bodyOwner.forecast(state, spans, context);
  if (!result.ok) throw new RangeError(result.error.message);
  return result.value;
}
export function bodyForecastTerm(
  state: DeepReadonly<BodyState>,
  offer: DeepReadonly<Offer>,
  context: DeepReadonly<FrameContext & BodyProjectionContext>,
): TermData | undefined {
  const spans = bodyForecastFor(state, offer, context).slice(1);
  if (spans.length === 0) return undefined;
  const d = context.effective.builtins.FORECAST_DEFAULTS,
    at = offer.expected.forecastAt ?? d;
  const worst = Math.max(...spans.map((s) => s.worst)),
    t = clamp01((worst - at.comfortAt) / (at.spentAt - at.comfortAt));
  const value = round(-d.forecastScale * t * t * (3 - 2 * t));
  return value < 0 ? { source: 'forecast:body', value } : undefined;
}
