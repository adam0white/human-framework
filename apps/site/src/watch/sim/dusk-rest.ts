/**
 * One voluntary night-off request, admitted only for a fresh run. HF owns choice and sleep.
 * This host records actual events, ends the request by dawn, and observes later post work.
 * It adds no healing, guaranteed sleep/return, remote voice or general promise faculty.
 */
import { interruptPerson, type SimEvent, type Suggestion } from '@adam0white/human-framework';
import type { PostId, WatcherId } from './config.ts';
import { inVoice, nightEnd, presentIds } from './night.ts';
import { KEEPER_ID, personOf } from './people.ts';
import type { WatchState } from './state.ts';

export interface WatchOptions {
  duskRest?: 'dusk-rest@1';
}
export interface DuskRestRequest {
  askedAt: number;
  until: number;
  priorPost: PostId | null;
  status: 'pending' | 'deferred' | 'refused' | 'resting' | 'ended' | 'returned' | 'expired';
  decisionAt?: number;
  begunAt?: number;
  endedAt?: number;
  endReason?: 'dawn' | 'left-rest' | 'reposted' | 'unavailable';
  returnedAt?: number;
}
export interface DuskRestState {
  edition: 'dusk-rest@1';
  requests: Partial<Record<WatcherId, DuskRestRequest>>;
}
export type DuskRestInput = { k: 'dusk-rest'; who: WatcherId; until: 'dawn' };
export function validWatchOptions(options: WatchOptions | undefined): boolean {
  return (
    options === undefined ||
    (!!options &&
      typeof options === 'object' &&
      Object.keys(options).every((k) => k === 'duskRest') &&
      (options.duskRest === undefined || options.duskRest === 'dusk-rest@1'))
  );
}
export function activeRest(r: DuskRestRequest | undefined, at: number): boolean {
  return !!r && at < r.until && ['pending', 'deferred', 'resting'].includes(r.status);
}
export function duskRestUnavailable(s: WatchState, who: WatcherId): string | null {
  if (!s.duskRest || s.phase !== 'dusk')
    return 'Night-off requests are available at dusk in a new village with that choice.';
  if (!presentIds(s).includes(who)) return 'This watcher is not here for tonight’s watch.';
  const p = personOf(s, who);
  if (!p || p.body.downed || p.body.asleep) return 'They cannot answer a spoken request now.';
  if (!inVoice(s, who)) return 'Your voice cannot reach them from here. Move the lantern nearer.';
  if (activeRest(s.duskRest.requests[who], s.minute))
    return 'They are already answering your night-off request.';
  if (
    (s.asks[who]?.until ?? -1) > s.minute ||
    (s.commands[who]?.until ?? -1) > s.minute ||
    Object.entries(s.nightRequests ?? {}).some(
      ([id, r]) => r && (id === who || r.who === who) && r.until > s.minute,
    )
  )
    return 'They are answering an earlier request.';
  return null;
}
export function applyDuskRest(s: WatchState, input: DuskRestInput): boolean {
  if (input.until !== 'dawn' || duskRestUnavailable(s, input.who)) return false;
  const p = personOf(s, input.who);
  if (!p || !s.duskRest) return false;
  s.duskRest.requests[input.who] = {
    askedAt: s.minute,
    until: nightEnd(s),
    priorPost: s.posts[input.who] ?? null,
    status: 'pending',
  };
  interruptPerson(s.community, p, s.minute, 'keeper');
  return true;
}
export function restSuggestion(s: WatchState, who: WatcherId): Suggestion | undefined {
  const r = s.duskRest?.requests[who];
  return activeRest(r, s.minute)
    ? { voiceId: KEEPER_ID, affordanceId: 'dusk-rest', strength: 0.85, appeal: 'duty', since: r?.askedAt }
    : undefined;
}
export function endDuskRest(
  s: WatchState,
  who: WatcherId,
  at: number,
  reason: DuskRestRequest['endReason'],
): void {
  const r = s.duskRest?.requests[who];
  if (!r || !['pending', 'deferred', 'resting'].includes(r.status)) return;
  r.status = r.begunAt === undefined ? 'expired' : 'ended';
  r.endedAt = at;
  r.endReason = reason;
}
/** Events may span the remainder of dusk. Their clocks, never the old host minute, stamp the account. */
export function resolveDuskRest(s: WatchState, events: SimEvent[], until: number): void {
  if (!s.duskRest) return;
  // Stable time order preserves same-minute decide/begin order from the driver.
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const r = s.duskRest.requests[e.personId];
    if (!r || e.at < r.askedAt) continue;
    if (e.at >= r.until) endDuskRest(s, e.personId, r.until, 'dawn');
    if (
      r.begunAt !== undefined &&
      r.endedAt !== undefined &&
      e.at >= r.endedAt &&
      (e.kind === 'begin' || e.kind === 'continue') &&
      e.affordanceId?.startsWith('post:')
    ) {
      r.status = 'returned';
      r.returnedAt ??= e.at;
      continue;
    }
    if (!activeRest(r, e.at)) continue;
    if (r.begunAt === undefined && e.kind === 'decide' && e.verdict) {
      r.decisionAt = e.at;
      if (e.verdict === 'refused') {
        r.status = 'refused';
        r.endedAt = e.at;
      } else if (e.verdict === 'deferred' || e.verdict === 'modified') r.status = 'deferred';
    }
    if ((e.kind === 'begin' || e.kind === 'continue') && e.affordanceId === 'dusk-rest') {
      r.status = 'resting';
      r.begunAt ??= e.at;
    } else if (
      r.status === 'resting' &&
      (e.kind === 'died' || (e.kind === 'finish' && e.affordanceId === 'dusk-rest') || e.kind === 'begin')
    ) {
      endDuskRest(s, e.personId, e.at, e.kind === 'died' ? 'unavailable' : 'left-rest');
      if (e.kind === 'begin' && e.affordanceId?.startsWith('post:')) {
        r.status = 'returned';
        r.returnedAt = e.at;
      }
    }
  }
  for (const [who, r] of Object.entries(s.duskRest.requests)) {
    if (!r) continue;
    if (until >= r.until) endDuskRest(s, who, r.until, 'dawn');
    else if (!presentIds(s).includes(who)) endDuskRest(s, who, until, 'unavailable');
  }
}
export function duskRestAccount(r: DuskRestRequest): string {
  if (r.status === 'returned') return 'Night-off request ended. Seen back on watch.';
  if (r.status === 'resting')
    return 'They began resting at home. The request lasts until dawn; they may return sooner.';
  if (r.status === 'refused') return 'They declined the night-off request.';
  if (r.status === 'expired') return 'The night-off request ended without observed rest.';
  if (r.status === 'ended')
    return r.endReason === 'reposted'
      ? 'You changed their post plan. The night-off request ended; not yet seen back on watch.'
      : 'Night-off request ended; not yet seen back on watch.';
  if (r.status === 'deferred') return 'They chose something else first. The request lasts only until dawn.';
  return 'Asked to take tonight off, until dawn. Waiting for their answer.';
}
