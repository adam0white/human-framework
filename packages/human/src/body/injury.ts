/** SCOPE: source injury impairment, clotting and downing predicates. No diagnosis. */
import type { BodyState, Capacity, DeepReadonly } from '../run-schema.ts';
import { clip, freezeData } from './span.ts';
export const INJURY_DEFAULTS = Object.freeze({
  clotHalfLife: 1080,
  tendedClotHalfLife: 180,
  tendBleedCut: 0.8,
  tendedHeal: 1.5,
  bleedStops: 0.001,
  standMargin: 0.05,
});
export const DEFAULT_PARTS: Readonly<Record<string, Partial<Record<Capacity, number>>>> = freezeData({
  leg: { moving: 0.5 },
  legs: { moving: 0.8 },
  foot: { moving: 0.4 },
  feet: { moving: 0.7 },
  arm: { manipulation: 0.5 },
  arms: { manipulation: 0.8 },
  hand: { manipulation: 0.5 },
  hands: { manipulation: 0.8 },
  shoulder: { manipulation: 0.4 },
  eye: { sight: 0.5 },
  eyes: { sight: 0.9 },
  head: { sight: 0.2, manipulation: 0.1, moving: 0.1 },
  torso: { moving: 0.2, manipulation: 0.2 },
  back: { moving: 0.3, manipulation: 0.2 },
});
export function readCapacities(b: DeepReadonly<BodyState>): Record<Capacity, number> {
  const c = { moving: 1, manipulation: 1, sight: 1 };
  if (!b.alive) return { moving: 0, manipulation: 0, sight: 0 };
  for (const i of b.injuries)
    for (const k of ['moving', 'manipulation', 'sight'] as const)
      c[k] *= 1 - clip((i.affects ?? DEFAULT_PARTS[i.part])?.[k] ?? 0) * clip(i.severity);
  return c;
}
export const downedAllows = (offer: { tags: readonly string[]; demands: { mode: string } }) =>
  offer.demands.mode === 'sleep' || offer.tags.some((t) => t === 'floor' || t === 'rest');
