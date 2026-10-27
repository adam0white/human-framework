/** SCOPE: outward projections only. C0 owns admitted evidence, perspective and preview.
 * This module never copies private target memory, norms, values, skills or agenda into
 * an observer's imagined actor. Reserve hides signs, never physical loss of movement.
 */
import { cloneData } from './core/clone.ts';
import type {
  ActorState,
  BodyReadout,
  DeepReadonly,
  EffectiveParameters,
  OutwardSigns,
  PersonView,
} from './run-schema.ts';

const unit = (x: number) => Math.max(0, Math.min(1, x));
const round = (x: number) => Math.round(x * 1e9) / 1e9;
export function outwardSigns(
  target: DeepReadonly<Pick<ActorState, 'affect' | 'social' | 'traits'>>,
  body: DeepReadonly<BodyReadout>,
  moving: number,
  effective: EffectiveParameters,
): OutwardSigns {
  return signs(target, body, moving, false, effective);
}
export function selfReport(
  target: DeepReadonly<Pick<ActorState, 'affect' | 'social' | 'traits'>>,
  body: DeepReadonly<BodyReadout>,
  moving: number,
  effective: EffectiveParameters,
): OutwardSigns {
  return signs(target, body, moving, true, effective);
}
function signs(
  target: DeepReadonly<Pick<ActorState, 'affect' | 'social' | 'traits'>>,
  body: DeepReadonly<BodyReadout>,
  moving: number,
  words: boolean,
  effective: EffectiveParameters,
): OutwardSigns {
  const reserve = (key: 'fatigue' | 'pain' | 'fear' | 'mood') => {
    const K = effective.builtins.IMPRESSION_DEFAULTS,
      R = K.reserve;
    const r =
      target.social.reserve[key] ??
      (key === 'fatigue'
        ? R.fatigue
        : key === 'mood'
          ? R.mood
          : unit(R.base + R.emotionalityCoef * (1 - target.traits.emotionality)));
    return words ? unit(r * K.wordsReserve) : r;
  };
  let fear = 0;
  const fearOf: Record<string, number> = {};
  for (const e of target.affect.emotions)
    if (e.id === 'fear') {
      fear += e.intensity;
      if (e.targetId !== undefined) fearOf[e.targetId] = unit((fearOf[e.targetId] ?? 0) + e.intensity);
    }
  const shown: Record<string, number> = {};
  for (const id of Object.keys(fearOf).sort()) shown[id] = round(fearOf[id]! * (1 - reserve('fear')));
  return {
    fatigue: round(body.perceived.fatigue * (1 - reserve('fatigue'))),
    pain: round(
      words
        ? body.perceived.pain * (1 - reserve('pain'))
        : Math.max(body.perceived.pain * (1 - reserve('pain')), 0.6 * (1 - moving)),
    ),
    fear: round(unit(fear) * (1 - reserve('fear'))),
    mood: round(target.affect.mood.valence * (1 - reserve('mood'))),
    fearOf: shown,
  };
}
/** A detached view, never a target-state shortcut. Preview uses this admitted picture. */
export function imagine(
  view: DeepReadonly<Extract<PersonView, { kind: 'other' }>>,
): Extract<PersonView, { kind: 'other' }> {
  return cloneData(view) as Extract<PersonView, { kind: 'other' }>;
}
