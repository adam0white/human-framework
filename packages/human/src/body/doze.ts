/** SCOPE: continuous onset intensity, distinct from interval probability. No
 * spontaneous waking, stages, inertia or clinical prediction. */
import type { DeepReadonly, DozeContext, Effective_DOZE_DEFAULTS } from '../run-schema.ts';
import { smooth } from './span.ts';
export const DOZE_DEFAULTS = Object.freeze({
  sleepiness: 0.75,
  stimulation: 0.5,
  hazard: 0.08,
  seatedWeight: 0.5,
  wakeSalience: 0.8,
});
export function dozeIntensity(
  s: number,
  context: DeepReadonly<DozeContext>,
  eligible: boolean,
  p: DeepReadonly<Effective_DOZE_DEFAULTS>,
  scale: number,
): number {
  return eligible && s > p.sleepiness && context.posture !== 'upright' && context.stimulation < p.stimulation
    ? p.hazard *
        scale *
        smooth(p.sleepiness, 1, s) *
        (context.posture === 'seated' ? p.seatedWeight : 1) *
        (1 - context.stimulation / p.stimulation)
    : 0;
}
