/**
 * SCOPE: opt-in normalized storage and delayed water intake; hosts resolve actual voiding.
 * NIDDK, The Urinary Tract & How It Works supports production/storage/urination, not these
 * engineering rates. Base filling is independent of hydration, including dehydration.
 * Urgency and perceived urgency are equal in this slice; hosts supply toilet choices. It models no renal calibration, continence, injury, search for a toilet or automatic waking.
 */
import { clamp01, dexp, isNum, isObj } from '../core/index.ts';
import type { Affordance, BladderState, Person } from '../types.ts';

export const BLADDER_DEFAULTS = Object.freeze({
  intakeScale: 0.5,
  maxPending: 4,
  halfLife: 45,
  basePerMinute: 0.001,
  /** Frozen engineering default, not a clinical threshold or fitted choice result. */
  choiceThreshold: 0.35,
  /** Frozen engineering weight on perceived urgency above the threshold. */
  choiceScale: 4,
});
export function enableBladder(p: Person): void {
  p.body.bladder ??= { fill: 0, pending: 0 };
}
/** Pure host readout; equal perceived urgency is a first-slice assumption. */
export function readBladder(p: Person): { urgency: number; perceived: number } | undefined {
  const b = p.body.bladder;
  return b ? { urgency: b.fill, perceived: b.fill } : undefined;
}
/** Pure opt-in choice contribution; a declared offer says nothing about actual success. */
export function bladderMotivation(p: Person, offer: Affordance, believedSuccess: number): number {
  if (offer.voidsBladder !== true) return 0;
  const perceived = readBladder(p)?.perceived;
  if (perceived === undefined) return 0;
  return (
    BLADDER_DEFAULTS.choiceScale *
    clamp01((perceived - BLADDER_DEFAULTS.choiceThreshold) / (1 - BLADDER_DEFAULTS.choiceThreshold)) *
    clamp01(believedSuccess)
  );
}
/** Host calls only after successful urination. Pending intake remains. */
export function voidBladder(p: Person): boolean {
  if (!p.body.bladder || !p.body.alive || p.body.asleep) return false;
  p.body.bladder.fill = 0;
  return true;
}
/** @internal */
export function intakeBladder(p: Person, water: number | undefined): void {
  const b = p.body.bladder;
  if (b && isNum(water) && water > 0)
    b.pending = Math.min(
      BLADDER_DEFAULTS.maxPending,
      b.pending + BLADDER_DEFAULTS.intakeScale * clamp01(water),
    );
}
/** @internal */
export function advanceBladder(b: BladderState, dt: number): void {
  const remaining = b.pending * dexp((-Math.LN2 * dt) / BLADDER_DEFAULTS.halfLife);
  b.fill = clamp01(b.fill + BLADDER_DEFAULTS.basePerMinute * dt + b.pending - remaining);
  b.pending = remaining;
}
/** @internal */
export function sanitizeBladder(raw: unknown): BladderState | undefined {
  if (!isObj(raw) || !isNum(raw.fill) || !isNum(raw.pending)) return undefined;
  return {
    fill: clamp01(raw.fill),
    pending: Math.min(BLADDER_DEFAULTS.maxPending, Math.max(0, raw.pending)),
  };
}
