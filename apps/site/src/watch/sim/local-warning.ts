/**
 * GDI-205 / F-289.2 only: a named caution to an awake watcher actually at a nearby post.
 * Public HF perception owns attention and its normal consequences. An attended heard percept proves
 * hearing, never a reply, assent, a new choice or defence. No threat is asserted and no suggestion or
 * interrupt is issued. The bell, requests, combat and sleepers remain outside this action.
 */
import { actorRuntime, observeActor } from './actor.ts';
import { postSection, type WatcherId } from './config.ts';
import { inVoice, presentIds } from './night.ts';
import { isPost, KEEPER_ID, nameOf, personOf } from './people.ts';
import type { WatchState } from './state.ts';

export type LocalWarningInput = { k: 'local-warning'; who: WatcherId };
type WarningReceipt =
  | { saidAt: number; status: 'pending' }
  | { saidAt: number; status: 'delivered'; at: number; heard: boolean }
  | { saidAt: number; status: 'unavailable'; at: number; reason: string };
export interface LocalWarningState {
  edition: 'local-warning@1';
  pending: {
    who: WatcherId;
    saidAt: number;
    post: import('./config.ts').PostId;
    perceptIds?: string[];
    queuedAtMs?: number;
    afterEvent?: string;
  }[];
  receipts: Partial<Record<WatcherId, WarningReceipt>>;
}
export function ownsWarningCast(s: WatchState, who: string): boolean {
  return Object.hasOwn(s.cast, who) && !!s.cast[who];
}
export function validLocalWarningInput(input: LocalWarningInput): boolean {
  return (
    !!input &&
    input.k === 'local-warning' &&
    typeof input.who === 'string' &&
    Object.keys(input).every((k) => k === 'k' || k === 'who')
  );
}
export function localWarningUnavailable(s: WatchState, who: WatcherId): string | null {
  if (!s.localWarning || s.phase !== 'night') return 'Spoken cautions are available at night.';
  if (!ownsWarningCast(s, who) || !presentIds(s).includes(who) || !isPost(s.place[who]))
    return 'This watcher is not at a post.';
  const p = personOf(s, who);
  if (
    !p?.body.alive ||
    p.body.downed ||
    p.body.asleep ||
    ['doze', 'sleep'].includes(p.activity?.action ?? '')
  )
    return 'They cannot hear a spoken caution while asleep, dozing or down.';
  if (!inVoice(s, who)) return 'Your voice cannot reach them from here. Move the lantern nearer.';
  return null;
}
export function applyLocalWarning(s: WatchState, input: LocalWarningInput): boolean {
  if (!validLocalWarningInput(input) || localWarningUnavailable(s, input.who)) return false;
  const p = personOf(s, input.who);
  const post = s.place[input.who];
  if (!p || !isPost(post) || !s.localWarning) return false;
  s.localWarning.pending.push({ who: input.who, saidAt: s.minute, post });
  s.localWarning.receipts[input.who] = { saidAt: s.minute, status: 'pending' };
  return true;
}

/** Queue the actual nearby speech once. Only public attended-observation events establish hearing. */
export function deliverLocalWarnings(s: WatchState, until: number): void {
  const w = s.localWarning;
  if (!w || !Number.isInteger(until)) return;
  w.pending = w.pending.filter((speech) => {
    if (speech.perceptIds) {
      const reading = actorRuntime(s).read({
        perspective: { kind: 'host' },
        people: [speech.who],
        select: ['events'],
        ...(speech.afterEvent ? { afterEvent: speech.afterEvent } : {}),
      });
      if (
        reading.at < (speech.queuedAtMs ?? Infinity) ||
        s.actors.queued.some(
          (input) =>
            input.at === speech.queuedAtMs &&
            input.kind === 'observation.received' &&
            input.payload.person === speech.who,
        )
      )
        return true;
      const heardEvent = reading.events.find(
        (event) =>
          event.data.kind === 'observation-attended' &&
          speech.perceptIds?.includes(event.data.perceptId) &&
          event.data.attention > 0,
      );
      w.receipts[speech.who] = {
        saidAt: speech.saidAt,
        at: (heardEvent?.at ?? speech.queuedAtMs ?? reading.at) / 60_000,
        status: 'delivered',
        heard: !!heardEvent,
      };
      return false;
    }
    const p = personOf(s, speech.who);
    if (speech.saidAt > until) return true;
    const reason =
      localWarningUnavailable(s, speech.who) ??
      (s.place[speech.who] !== speech.post ? 'They moved from the post you addressed.' : null);
    if (reason || !p) {
      w.receipts[speech.who] = {
        saidAt: speech.saidAt,
        at: until,
        status: 'unavailable',
        reason: reason ?? 'This watcher is not here.',
      };
      return false;
    }
    const before = actorRuntime(s).read({
      perspective: { kind: 'host' },
      people: [speech.who],
      select: ['events'],
    });
    const previousEvent = before.events.at(-1)?.id;
    if (previousEvent) speech.afterEvent = previousEvent;
    speech.perceptIds = observeActor(s, p.id, [
      {
        at: until,
        channel: 'heard',
        kind: 'local-warning',
        actorId: KEEPER_ID,
        targetId: speech.who,
        placeId: postSection(speech.post),
        near: true,
        salience: 0.85,
        summary: `The Keeper says to ${nameOf(s, speech.who)}: “Keep an eye on this stretch.”`,
      },
    ]);
    speech.queuedAtMs = s.actors.ingress;
    return true;
  });
}
export function localWarningAccount(s: WatchState, who: WatcherId): string | null {
  const receipt = s.localWarning?.receipts[who];
  if (!receipt) return null;
  const pending = s.localWarning?.pending.filter((x) => x.who === who).length ?? 0;
  const result =
    receipt.status === 'pending'
      ? 'Hearing has not been checked yet.'
      : receipt.status === 'unavailable'
        ? `The caution was not delivered. ${receipt.reason}`
        : receipt.heard
          ? 'They heard the caution.'
          : 'Their attention did not take in the caution.';
  return `You said to ${nameOf(s, who)}: “Keep an eye on this stretch.” ${result} ${
    pending ? `${pending} spoken caution${pending === 1 ? '' : 's'} await the next whole actor minute. ` : ''
  }The caution may draw their attention to this stretch. It does not ask them to change posts or stay awake. No reply or new choice is recorded by this caution. Hearing you does not mean they agreed or that this stretch is safe.`;
}
export function validateLocalWarningState(s: WatchState): void {
  const w = s.localWarning;
  if (w === undefined) return;
  const sourceAt =
    actorRuntime(s).read({ perspective: { kind: 'host' }, people: [KEEPER_ID], select: ['summary'] }).at /
    60_000;
  const past = (at: number) => Number.isFinite(at) && at >= 0 && at <= Math.max(s.minute, sourceAt);
  if (
    w?.edition !== 'local-warning@1' ||
    Object.keys(w).some((k) => !['edition', 'receipts', 'pending'].includes(k)) ||
    !w.receipts ||
    typeof w.receipts !== 'object' ||
    Array.isArray(w.receipts) ||
    !Array.isArray(w.pending)
  )
    throw new Error('Invalid local warning state');
  for (const q of w.pending) {
    if (
      !q ||
      typeof q.who !== 'string' ||
      !ownsWarningCast(s, q.who) ||
      Object.keys(q).some(
        (k) => !['who', 'saidAt', 'post', 'perceptIds', 'queuedAtMs', 'afterEvent'].includes(k),
      ) ||
      !past(q.saidAt) ||
      !isPost(q.post) ||
      (q.perceptIds !== undefined &&
        (!Array.isArray(q.perceptIds) ||
          q.perceptIds.some((id) => typeof id !== 'string') ||
          !Number.isSafeInteger(q.queuedAtMs))) ||
      (q.afterEvent !== undefined && typeof q.afterEvent !== 'string')
    )
      throw new Error('Invalid pending local warning');
  }
  for (const [who, r] of Object.entries(w.receipts)) {
    if (!ownsWarningCast(s, who) || !r || !past(r.saidAt)) throw new Error('Invalid local warning receipt');
    const keys =
      r.status === 'pending'
        ? ['saidAt', 'status']
        : r.status === 'delivered'
          ? ['saidAt', 'status', 'at', 'heard']
          : ['saidAt', 'status', 'at', 'reason'];
    if (
      Object.keys(r).some((k) => !keys.includes(k)) ||
      (r.status === 'pending'
        ? !w.pending.some((q) => q.who === who && q.saidAt === r.saidAt)
        : !['delivered', 'unavailable'].includes(r.status) ||
          !past(r.at) ||
          r.at < r.saidAt ||
          (r.status === 'delivered' ? typeof r.heard !== 'boolean' : typeof r.reason !== 'string'))
    )
      throw new Error('Invalid local warning receipt');
  }
  for (const q of w.pending)
    if (!Object.hasOwn(w.receipts, q.who)) throw new Error('Pending warning has no speech receipt');
}
