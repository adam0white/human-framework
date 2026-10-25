/**
 * SCOPE: opt-in minute-grid involuntary onset and interval-delivered urgent-percept waking. Cole 1989
 * (PMID 2606843) supports posture context; auditory arousal studies (PMIDs 8776786,
 * 8153254) distinguish arousal from attention. None calibrates these engineering gates,
 * hazard weights or salience. No stages, inertia, spontaneous wake or clinical prediction.
 * Manual hosts schedule nextDozeCheck and resolve activities stopped at Activity.dozedAt.
 * A prior pending interrupt reason is retained; physical doze still stops work.
 */
import { clamp01, dexp, isNum, isObj, random, smoothstep } from '../core/index.ts';
import type { BodyState, DozeContext, DozeState, Person } from '../types.ts';
import { readBody } from './body.ts';

export const DOZE_DEFAULTS = Object.freeze({
  sleepiness: 0.75,
  stimulation: 0.5,
  hazard: 0.08,
  seatedWeight: 0.5,
  wakeSalience: 0.8,
});
function context(raw: unknown): DozeContext | undefined {
  if (
    !isObj(raw) ||
    (raw.posture !== 'upright' && raw.posture !== 'seated' && raw.posture !== 'reclined') ||
    !isNum(raw.stimulation)
  )
    return undefined;
  return { posture: raw.posture as DozeContext['posture'], stimulation: clamp01(raw.stimulation) };
}
/**
 * Enable involuntary doze without drawing RNG. Idempotent; off when absent.
 * Hosts must deliver detectable heard/felt/social alarms with salience >= 0.8
 * to this person (targetId, or near: true). There is no spontaneous wake: without such
 * percepts sleep continues. Alarm timestamps must be within the current doze span
 * through p.now; delayed interval delivery can wake. Other delivered percepts still
 * pass through ordinary bounded attention, as during voluntary sleep. The community driver checks percepts on its ordinary idle cadence.
 * Enabled tick integration uses one-minute boundaries even with closed gates or during sleep;
 * cost is O(elapsed minutes) and continuous state can differ from the absent opt-in arm.
 * Closed gates draw no onset RNG; passive community checkpoints do not call choice.
 * Activity.dozedAt pins stopped work until the host resolves it with finish, even after an alarm;
 * begin refuses all replacements while that pin remains;
 * the pending interrupt reason may retain an earlier host/percept cause.
 */
export function enableDoze(p: Person, input: DozeContext): void {
  if (p.body.doze) return;
  const ctx = context(input);
  if (!ctx) throw new RangeError('Invalid doze context');
  p.body.doze = { context: ctx };
}
export function setDozeContext(p: Person, input: DozeContext): void {
  if (!p.body.doze) return;
  const ctx = context(input);
  if (!ctx) throw new RangeError('Invalid doze context');
  p.body.doze.context = ctx;
}
/** Pure; closed onset gates still require the next checkpoint. */
export function nextDozeCheck(p: Person): number {
  return p.body.doze && p.body.alive && !p.body.asleep ? Math.floor(p.now) + 1 : Number.POSITIVE_INFINITY;
}
/** Pure truth/debug reader, not a first-person lens. */
export function readDoze(p: Person): { asleep: boolean; hazardPerMinute: number } | undefined {
  const d = p.body.doze;
  if (!d) return undefined;
  const s = readBody(p).sleepiness;
  const D = DOZE_DEFAULTS;
  const eligible =
    p.body.alive &&
    !p.body.downed &&
    !p.body.asleep &&
    s > D.sleepiness &&
    d.context.posture !== 'upright' &&
    d.context.stimulation < D.stimulation;
  const lambda = eligible
    ? D.hazard *
      smoothstep(D.sleepiness, 1, s) *
      (d.context.posture === 'seated' ? D.seatedWeight : 1) *
      (1 - d.context.stimulation / D.stimulation)
    : 0;
  return { asleep: d.since !== undefined, hazardPerMinute: 1 - dexp(-lambda) };
}
/** @internal Composite dispatch only, once per crossed integer minute. */
export function checkDoze(p: Person, at: number): boolean {
  const d = p.body.doze;
  const hazard = readDoze(p)?.hazardPerMinute ?? 0;
  if (!d || hazard <= 0 || random(p.rng) >= hazard) return false;
  d.since = at;
  p.body.asleep = true;
  p.body.since = at;
  return true;
}
/** @internal */
export function wakeDoze(p: Person, at: number): boolean {
  if (p.body.doze?.since === undefined) return false;
  delete p.body.doze.since;
  p.body.lastSleep = { from: p.body.since, to: at };
  p.body.asleep = false;
  p.body.since = at;
  return true;
}
/** @internal Transfer without resetting the continuous sleep span. */
export function enterVoluntarySleep(p: Person): void {
  if (p.body.doze) delete p.body.doze.since;
}
/** @internal */
export function sanitizeDoze(raw: unknown, b: BodyState, now: number): DozeState | undefined {
  if (!isObj(raw)) return undefined;
  const ctx = context(raw.context);
  if (!ctx) return undefined;
  const out: DozeState = { context: ctx };
  if (isNum(raw.since) && raw.since <= now && raw.since === b.since && b.alive && b.asleep)
    out.since = raw.since;
  return out;
}
