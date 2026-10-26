/**
 * SCOPE: explicit host synchronization for the event-only driver prototype. This module
 * owns no Person state and changes no tick, perception, duty, death or doze calculation.
 * It synchronizes the entire community through the ordinary eager driver, including due
 * events and community death dispatch. It cannot intercept arbitrary Person reads or
 * make different tick partitions numerically equivalent. Hosts must synchronize before
 * reading or directly mutating people outside World callbacks; callbacks may read only their
 * supplied current person unless they explicitly synchronize other people beforehand.
 * No existing host, including Watch, opts in automatically. No coarse stepping is used.
 */
import type { Minute } from '../types.ts';
import { type Community, type SimEvent, type StepOptions, stepCommunity, type World } from './sim.ts';

/** Fail closed before a host read. This checks clocks, not cached host projections. */
export function requireCommunityCurrent(c: Community, at: Minute): void {
  if (!Number.isFinite(at)) throw new Error('Host read minute must be finite');
  const stale = c.people.find((p) => p.now < at);
  if (stale)
    throw new Error(`Person ${stale.id} is stale at ${stale.now}; synchronize to ${at} before reading`);
}

/**
 * Explicit read barrier. Retain returned events: synchronization can discover death,
 * deliver notices and release proposals. Supply the same pinned run options after restore.
 * This catches up all people, not just the requested HUD subject. It does not pull new
 * percepts before their scheduled event; use interruptPerson when an immediate event is due.
 * Never call recursively from a World callback.
 */
export function synchronizeCommunity(
  c: Community,
  world: World,
  at: Minute,
  opts: StepOptions & { deathHandling: 'community' },
): SimEvent[] {
  if (!Number.isFinite(at)) throw new Error('Synchronization minute must be finite');
  if (opts.deathHandling !== 'community')
    throw new Error("Synchronization requires deathHandling:'community'");
  return stepCommunity(c, world, at, { ...opts, catchUp: undefined });
}
