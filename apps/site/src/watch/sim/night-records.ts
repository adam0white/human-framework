/** Host accounts of actual night requests and visible events. These records never choose an act,
 * read private motives, force rest, or attribute a later return to a bell. Full records stay in the save.
 */
import { actorReport, actorRuntime, type Percept, type SimEvent } from './actor.ts';
import { type PostId, postSection, type SectionId, type WatcherId } from './config.ts';
import { litSection, theSection } from './night.ts';
import type { NightInput, NightRequest } from './night-actions.ts';
import { isPost, nameOf, personOf } from './people.ts';
import type { WatchState } from './state.ts';

export interface NightRecord {
  id: number;
  nightStart: number;
  kind: NightInput['k'] | 'callback' | 'cover' | 'carry' | 'hold';
  moment?: true;
  who: WatcherId;
  by: WatcherId;
  section: SectionId;
  affordance: string;
  sentAt: number;
  until: number;
  answer?: 'refused' | 'deferred' | 'modified' | 'not-started' | 'replaced' | 'begun' | 'expired';
  answeredAt?: number;
  requestEndedAt?: number;
  ended?: { at: number; status: SimEvent['status']; observed: boolean; receipt?: string };
  returned?: { at: number; post: PostId };
}
export interface BellRecord {
  who: WatcherId;
  nightStart: number;
  rungAt: number;
  fromWall: boolean;
  until: number;
  perceptId?: string;
  checkedAt?: number;
  heardAt?: number;
  wakeAt?: number;
  returned?: { at: number; post: PostId };
}
/** Sound carry is a host fact; it is not proof of attention or return. */
export function beginBellRecords(s: WatchState): void {
  s.bellRecords ??= [];
  for (const who of Object.keys(s.bell.heard))
    s.bellRecords.push({
      who,
      nightStart: s.nightStart,
      rungAt: s.minute,
      until: s.bell.until,
      fromWall: isPost(s.place[who]),
    });
}
/** Retain the exact IDs assigned by the existing public observation input. No input is changed. */
export function bindBellPercepts(
  s: WatchState,
  who: WatcherId,
  percepts: readonly Percept[],
  ids: readonly string[],
): void {
  percepts.forEach((p, i) => {
    if (p.kind !== 'bell') return;
    const r = s.bellRecords?.findLast((r) => r.who === who && r.rungAt === p.at && !r.perceptId);
    if (r && ids[i]) r.perceptId = ids[i];
  });
}

export interface ObservedWake {
  who: WatcherId;
  nightStart: number;
  at: number;
  section: SectionId;
  /** A threat actually visible when the Keeper looked; this does not explain the wake. */
  threatAt?: number;
}

function appendNightRecord(s: WatchState, r: Omit<NightRecord, 'id' | 'sentAt' | 'nightStart'>): number {
  s.nightRecords ??= [];
  for (const old of s.nightRecords) {
    if (old.by !== r.by || old.requestEndedAt !== undefined) continue;
    old.requestEndedAt = Math.min(s.minute, old.until);
    if (!old.answer) {
      old.answer = 'replaced';
      old.answeredAt = s.minute;
    }
  }
  const id = s.nightRecords.length;
  s.nightRecords.push({ ...r, id, nightStart: s.nightStart, sentAt: s.minute });
  return id;
}
export function beginNightRecord(s: WatchState, input: NightInput, by: WatcherId, r: NightRequest): number {
  return appendNightRecord(s, {
    kind: input.k,
    who: input.who,
    by,
    section: r.section,
    affordance: r.affordance,
    until: r.until,
  });
}
export function beginMomentRecord(
  s: WatchState,
  by: WatcherId,
  affordance: string,
  context: {
    kind: 'callback' | 'cover' | 'carry' | 'hold';
    who: WatcherId;
    section: SectionId;
  },
): void {
  const request = s.asks[by];
  if (request) appendNightRecord(s, { ...context, by, affordance, until: request.until, moment: true });
}
export function answerNightRecord(
  s: WatchState,
  r: NightRequest,
  answer: NonNullable<NightRecord['answer']>,
  at: number,
): void {
  const record = r.accountId === undefined ? undefined : s.nightRecords?.[r.accountId];
  if (!record || record.answer) return;
  record.answer = answer;
  record.answeredAt = at;
}

/** Only real finish/wake events and the Keeper's current lit view add evidence. */
export function followNightRecords(
  s: WatchState,
  events: SimEvent[],
  before: WatchState['place'],
  until: number,
): void {
  for (const e of events) {
    for (const r of s.nightRecords ?? []) {
      if (!r.moment || r.by !== e.personId || r.answer || e.at < r.sentAt || e.at >= r.until) continue;
      if (e.kind === 'decide' && e.affordanceId !== r.affordance) {
        r.answer =
          e.verdict === 'refused' || e.verdict === 'deferred' || e.verdict === 'modified'
            ? e.verdict
            : 'not-started';
        r.answeredAt = e.at;
      } else if (e.kind === 'begin' && e.affordanceId === r.affordance) {
        r.answer = 'begun';
        r.answeredAt = e.at;
      }
    }
    if (e.kind === 'finish') {
      const r = s.nightRecords?.findLast(
        (r) =>
          r.by === e.personId &&
          r.answer === 'begun' &&
          !r.ended &&
          (r.answeredAt ?? Infinity) <= e.at &&
          r.affordance === e.affordanceId,
      );
      if (r)
        r.ended = {
          at: e.at,
          status: e.status,
          observed: isPost(before[e.personId]) && postSection(before[e.personId] as PostId) === litSection(s),
          ...(e.actionReceipt ? { receipt: e.actionReceipt } : {}),
        };
    }
    if (e.kind === 'wake') {
      const post = before[e.personId];
      if (!isPost(post) || postSection(post) !== litSection(s)) continue;
      const section = postSection(post);
      const bell = s.bellRecords?.findLast(
        (r) => r.who === e.personId && r.nightStart === s.nightStart && r.rungAt <= e.at && e.at <= r.until,
      );
      if (bell && bell.wakeAt === undefined) bell.wakeAt = e.at;
      s.observedWakes ??= [];
      s.observedWakes.push({
        who: e.personId,
        nightStart: s.nightStart,
        at: e.at,
        section,
        ...(s.tokens.some((t) => t.section === section && ['foot', 'in'].includes(t.state))
          ? { threatAt: s.minute }
          : {}),
      });
    }
  }
  // Check actual public attended observations once per pull, after the queued percepts settle.
  const pending = (s.bellRecords ?? []).filter(
    (r) => r.checkedAt === undefined && r.perceptId !== undefined && until > r.rungAt,
  );
  for (const r of pending) {
    const reading = actorRuntime(s).read({
      perspective: { kind: 'host' },
      people: [r.who],
      select: ['events'],
    });
    const heard = reading.events.find(
      (e) =>
        e.at >= r.rungAt * 60_000 &&
        e.data.kind === 'observation-attended' &&
        e.data.perceptId === r.perceptId &&
        e.data.attention > 0,
    );
    r.checkedAt = until;
    if (heard) r.heardAt = heard.at / 60_000;
  }
  for (const r of s.bellRecords ?? []) {
    const post = s.place[r.who];
    if (
      !r.fromWall &&
      !r.returned &&
      r.nightStart === s.nightStart &&
      isPost(post) &&
      postSection(post) === litSection(s)
    )
      r.returned = { at: until, post };
  }
  for (const r of s.nightRecords ?? []) {
    if (until >= r.until && r.requestEndedAt === undefined) {
      r.requestEndedAt = r.until;
      if (!r.answer) {
        r.answer = 'expired';
        r.answeredAt = r.until;
      }
    }
    const post = s.place[r.by];
    if (
      r.nightStart === s.nightStart &&
      r.kind === 'down' &&
      r.answer === 'begun' &&
      r.ended &&
      !r.returned &&
      isPost(post) &&
      postSection(post) === litSection(s)
    )
      r.returned = { at: until, post };
  }
}
const clock = (at: number) => {
  const m = ((Math.floor(at) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export function nightHistory(s: WatchState, who: WatcherId): string[] {
  const requests = (s.nightRecords ?? [])
    .filter((r) => r.nightStart === s.nightStart && (r.who === who || r.by === who))
    .map((r) => {
      const name = nameOf(s, r.by);
      const request =
        r.kind === 'down'
          ? 'go down'
          : r.kind === 'callback'
            ? `return to ${theSection(r.section)}`
            : r.kind === 'hold'
              ? `hold ${theSection(r.section)}`
              : r.kind === 'cover'
                ? `cover for ${nameOf(s, r.who)} at ${theSection(r.section)}`
                : r.kind === 'carry'
                  ? `carry ${nameOf(s, r.who)} down`
                  : `${r.kind === 'relieve' ? 'relieve' : 'help'} ${nameOf(s, r.who)} at ${theSection(r.section)}`;
      let line = `Asked ${name} to ${request} at ${clock(r.sentAt)}. `;
      line +=
        r.answer === 'begun'
          ? `${name} began ${r.affordance === 'sleep' ? 'rest' : 'the requested act'} at ${clock(r.answeredAt ?? r.sentAt)}.`
          : r.answer === 'refused'
            ? `${name} declined at ${clock(r.answeredAt ?? r.sentAt)}.`
            : r.answer === 'deferred'
              ? `${name} put it off at ${clock(r.answeredAt ?? r.sentAt)}; no start is recorded for this request.`
              : r.answer === 'modified' || r.answer === 'not-started'
                ? `${name} chose something else at ${clock(r.answeredAt ?? r.sentAt)}; no start is recorded for this request.`
                : r.answer === 'replaced'
                  ? `A newer request replaced it at ${clock(r.answeredAt ?? r.sentAt)}.`
                  : r.answer === 'expired'
                    ? `The request expired at ${clock(r.until)} without a recorded start.`
                    : 'Waiting for an answer.';
      if (r.requestEndedAt !== undefined && r.answer === 'begun')
        line += ` The request window ended at ${clock(r.requestEndedAt)}; that does not end the act.`;
      if (r.ended?.observed)
        line += ` ${r.affordance === 'sleep' ? 'The rest' : 'The act'} ended at ${clock(r.ended.at)}${r.ended.status === 'interrupted' ? ' after an interruption' : ''}.`;
      if (r.returned && !r.ended?.observed && r.affordance === 'sleep')
        line += ' The rest ended before this sighting.';
      if (r.returned)
        line += ` Seen back at ${theSection(postSection(r.returned.post))} at ${clock(r.returned.at)}.`;
      return line;
    });
  const bells = (s.bellRecords ?? [])
    .filter((r) => r.who === who && r.nightStart === s.nightStart && (!r.fromWall || r.wakeAt !== undefined))
    .map((r) => {
      let line = `The bell rang at ${clock(r.rungAt)}. Its sound carried to ${nameOf(s, who)}'s position. Its call lasts until ${clock(r.until)}.`;
      line +=
        r.heardAt !== undefined
          ? ` ${nameOf(s, who)} heard it at ${clock(r.heardAt)}.`
          : ' Hearing has not been established.';
      if (r.wakeAt !== undefined) line += ` Seen waking at ${clock(r.wakeAt)}.`;
      if (r.returned)
        line += ` Seen back at ${theSection(postSection(r.returned.post))} at ${clock(r.returned.at)}. The cause of the return is unknown.`;
      return line;
    });
  return [...requests, ...bells];
}
export function witnessedWake(s: WatchState, who: WatcherId): ObservedWake | undefined {
  return s.observedWakes?.findLast(
    (w) => w.who === who && w.nightStart === s.nightStart && w.threatAt !== undefined,
  );
}
export function wakeQuestion(s: WatchState, who: WatcherId): string | null {
  const wake = witnessedWake(s, who);
  return wake ? `Tell me about waking at ${theSection(wake.section)}` : null;
}
export function wakeAccount(s: WatchState, who: WatcherId): string | null {
  const wake = witnessedWake(s, who);
  return wake
    ? `You saw ${nameOf(s, who)} wake at ${theSection(wake.section)} at ${clock(wake.at)}. A threat was at that wall when you looked at ${clock(wake.threatAt ?? wake.at)}. No further account of that moment is recorded.`
    : null;
}

/** A current public self-report reading, not a speech receipt or a remembered cause. */
export function wakeReading(s: WatchState, who: WatcherId): string | null {
  if (s.phase !== 'dawn' || !witnessedWake(s, who)) return null;
  const person = personOf(s, who);
  if (!person) return null;
  const report = actorReport(person);
  const fatigue =
    report.fatigue > 0.55 ? 'very tired' : report.fatigue > 0.35 ? 'tired' : 'little tiredness reported';
  const fear =
    report.fear > 0.45 ? 'strong fear' : report.fear > 0.22 ? 'some unease' : 'little fear reported';
  const pain = report.pain > 0.45 ? 'strong pain' : report.pain > 0.2 ? 'some pain' : 'little pain reported';
  return `How ${nameOf(s, who)} feels now: ${fatigue}; ${fear}; ${pain}. This is a current reading, not words the person said or an explanation of the earlier wake.`;
}
