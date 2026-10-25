/**
 * SCOPE: opt-in composition of beliefs.confirm and social.applyReputationBelief, in that order.
 * Owns no state or formula. This is the Hearsay 2 wrapper: direct observation corrects the belief,
 * recalibrates its sources and applies the credence change to the subject's relationship. It does
 * not infer opposite traits, accuse a source of lying, run attention or record a percept. Hosts
 * supply only observations their person has access to. Existing callers remain unchanged.
 */
import { confirm, credence } from './beliefs/beliefs.ts';
import { applyReputationBelief, type TraitEffect } from './social/social.ts';
import type { EntityId, Minute, Person } from './types.ts';

/** Returns the same detached, sorted misled-source ids as confirm; no relationship alias escapes. */
export function confirmObservedReputation(
  p: Person,
  prop: string,
  truth: boolean,
  now: Minute,
  table?: Record<string, TraitEffect>,
): EntityId[] {
  const before = credence(p, prop);
  const misled = confirm(p, prop, truth, now);
  applyReputationBelief(p, prop, before, credence(p, prop), now, table);
  return misled;
}
