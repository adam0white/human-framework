/**
 * The composer's prefill (voice.md §6), deterministic, first rule that applies wins:
 * 1. another voice's standing advice that is offered now and is not his leaning;
 * 2. one of his ends, offered now and not leaning: pay-rent at 300+; the afternoon shift when the mornings alone
 *    will not reach what Osman wants in time; see-doctor if never seen; call Selin after iftar when HE has not
 *    called her for 2+ days; work if not worked today;
 * 2b. (round 5) the doctor's walk when he is about to smoke and has seen her;
 * 3. nothing. (Fix pass 2: a close call no longer prefills the runner-up, which made an attentive player
 *    contrarian by default; the torn moment is a beat and the choice is the player's.)
 * Nothing is prefilled that he is already doing.
 * The first beat of Ramadan 1 (the suhoor wake) is prefilled with `eat`, his leaning, as the tutorial.
 * Every prefill carries the sentence that says why.
 *
 * Addition to the plan's rules (reported): a candidate he would refuse outright (`preview` says cannot or will
 * not, e.g. tea with Rıza during the fast) is skipped, so the prefill never walks the player into a refusal.
 */
import {
  type Affordance,
  adviceWeight,
  type Considered,
  dayOf,
  MINUTES_PER_DAY,
  type Person,
  preview,
  standingAdvice,
} from '@human/framework';
import type { Appeal, Prefill } from '../protocol.ts';
import { selinEidCallMinute, TOWN_DEFAULTS, type Town, townCalendar } from './town.ts';
import { ACTION_LABEL, isVoiceId, nameOfVoice, relWhen } from './view.ts';

const APPEAL_BY_ACTION: Record<string, Appeal> = {
  'see-doctor': 'safety',
  'pay-rent': 'duty',
  call: 'benevolence',
  tea: 'belonging',
};

/** A rival within this share of the leaning option's utility is a close call (as in the framework's narration). */
export const CLOSE_CALL_FRACTION = 0.2;
/** Below this the leaning option is too weak for "close" to mean anything. */
export const CLOSE_CALL_MIN = 0.1;

export interface PrefillInput {
  h: Person;
  town: Town;
  t: number;
  offers: readonly Affordance[];
  considered: readonly Considered[];
  leaningId?: string;
  /** The running activity's affordance: never prefilled (he is already doing it). */
  currentId?: string;
  /** Minute Halil last placed a call to Selin himself, if ever. */
  halilCalledAt?: number;
  /** The pause was called for this option (the afternoon-shift beat): its own rule goes first when it applies. */
  prefer?: string;
  tutorial?: boolean;
}

/** The runner-up when the top two non-vetoed options are within the close-call margin. */
export function closeRival(considered: readonly Considered[]): Considered | undefined {
  const open = considered.filter((c) => !c.vetoed);
  const [a, b] = open;
  if (!a || !b) return undefined;
  if (a.utility < CLOSE_CALL_MIN || b.utility <= 0) return undefined;
  return a.utility - b.utility < CLOSE_CALL_FRACTION * a.utility ? b : undefined;
}

export function prefillFor(i: PrefillInput): Prefill | undefined {
  const { h, town, t, offers, leaningId } = i;
  const refusable = new Map<string, boolean>();
  const offered = (id: string) => {
    const o = offers.find((x) => x.id === id);
    if (!o || id === i.currentId) return undefined;
    if (!refusable.has(id))
      refusable.set(
        id,
        preview(
          h,
          offers,
          { voiceId: 'you', affordanceId: id, strength: 0.35 },
          { scarcity: town.scarcityFor?.(h) ?? 0 },
        ).verdict === 'refused',
      );
    return refusable.get(id) ? undefined : o;
  };
  if (i.tutorial && offered('eat')) {
    const cal = townCalendar(dayOf(t));
    const fajr = dayOf(t) * MINUTES_PER_DAY + cal.fajr;
    return {
      optionId: 'eat',
      strength: 'mention',
      why: `The fast begins at ${pad(fajr)}. He hasn’t cooked since Nuran died; there’s bread and cheese.`,
      source: 'tutorial',
    };
  }
  // 0. The pause was for the afternoon shift: say it first, if he is still short and it is still on offer.
  if (i.prefer === 'work-extra' && offered('work-extra')) {
    const short = moneyShort(town, t);
    if (short)
      return {
        optionId: 'work-extra',
        strength: 'mention',
        why: `Mornings alone get him to about ${short.projected} by ${short.by}; ${short.wants}. He has ${Math.round(town.state.money.halil ?? 0)}.`,
        source: 'end',
        appeal: 'duty',
      };
  }
  // 0a. The last night's beat: the Eid call (seventh pass).
  if (i.prefer === 'call:selin' && offered('call:selin'))
    return {
      optionId: 'call:selin',
      strength: 'mention',
      why: `Tomorrow is Eid. Selin will leave the first call to him; she will not call before about ${pad(selinEidCallMinute(town.state))}.`,
      source: 'end',
      appeal: 'benevolence',
    };
  // 0b. He is about to smoke and the doctor's walk is open: offer it instead (round 5: the doctor's "walk, stop
  // smoking" became something the player can act on; each walk where the cigarette is cued wears the habit down).
  if (leaningId === 'smoke' && offered('walk'))
    return {
      optionId: 'walk',
      strength: 'mention',
      why: 'He is reaching for a cigarette. The doctor told him to walk, and to stop smoking.',
      source: 'end',
      appeal: 'safety',
    };
  // 1. Another voice's standing advice.
  const advice = standingAdvice(h, t)
    .filter((a) => a.sourceId !== 'you')
    .sort((a, b) => adviceWeight(b, t) - adviceWeight(a, t) || (a.sourceId < b.sourceId ? -1 : 1));
  for (const a of advice) {
    const found = offers.find((o) => (a.affordanceId ? o.id === a.affordanceId : o.action === a.action));
    const target = found ? offered(found.id) : undefined;
    // The doctor's walk is prefilled only against the cigarette (rule 0b), not at every evening composer.
    if (!target || target.id === leaningId || target.id === 'walk') continue;
    const p: Prefill = {
      optionId: target.id,
      strength: adviceWeight(a, t) >= 0.5 ? 'urge' : 'mention',
      why: `${nameOfVoice(a.sourceId)} said ${relWhen(a.at, t)}: ${ACTION_LABEL[target.id] ?? target.label}.`,
      source: 'advice',
    };
    const appeal = APPEAL_BY_ACTION[target.action];
    if (appeal) p.appeal = appeal;
    if (isVoiceId(a.sourceId)) p.sourceId = a.sourceId;
    return p;
  }
  // 2. One of his ends.
  const money = Math.round(town.state.money.halil ?? 0);
  const day = dayOf(t);
  const end = (optionId: string, why: string, appeal?: Appeal): Prefill => {
    const p: Prefill = { optionId, strength: 'mention', why, source: 'end' };
    if (appeal) p.appeal = appeal;
    return p;
  };
  const owed = Math.round(town.state.rentOwed);
  if (offered('pay-rent') && leaningId !== 'pay-rent' && money >= 300 && owed > 0)
    return end(
      'pay-rent',
      `Osman is owed ${owed}${t < T15 ? '; he wants 300 by Ramadan 15, 20:00' : ''}. He has ${money}.`,
      'duty',
    );
  const short = moneyShort(town, t);
  if (short && offered('work-extra') && leaningId !== 'work-extra')
    return end(
      'work-extra',
      `Mornings alone get him to about ${short.projected} by ${short.by}; ${short.wants}. He has ${money}.`,
      'duty',
    );
  if (
    offered('see-doctor') &&
    leaningId !== 'see-doctor' &&
    (town.state.completed.halil?.['see-doctor'] ?? 0) === 0
  )
    return end('see-doctor', 'Selin wants his pressure seen; he hasn’t gone.', 'safety');
  const since = i.halilCalledAt === undefined ? undefined : day - dayOf(i.halilCalledAt);
  if (
    offered('call:selin') &&
    leaningId !== 'call:selin' &&
    t % MINUTES_PER_DAY >= townCalendar(day).maghrib &&
    (since === undefined || since >= 2)
  )
    return end(
      'call:selin',
      since === undefined
        ? 'He has not called Selin himself since the funeral; she always calls him.'
        : `He hasn’t called Selin himself in ${since} days.`,
      'benevolence',
    );
  if (offered('work-repair') && leaningId !== 'work-repair' && town.state.lastWorked.halil !== day)
    return end('work-repair', `Osman is owed ${Math.round(town.state.rentOwed)}.`);
  return undefined;
}

/**
 * Whether the morning shifts alone will leave him short of what Osman wants next: 300 paid by Ramadan 15, then
 * the rest by the end of Ramadan. Counts one morning wage for each workday left (today's if not yet worked).
 */
export function moneyShort(
  town: Town,
  t: number,
): { projected: number; by: string; wants: string } | undefined {
  const T = TOWN_DEFAULTS;
  const day = dayOf(t);
  const owed = Math.round(town.state.rentOwed);
  if (owed <= 0) return undefined;
  const money = Math.round(town.state.money.halil ?? 0);
  const paid = Math.round(town.state.rentPaid);
  const lastFast = T.ramadanFirstDay + T.ramadanDays - 1;
  // The date ends at 20:00 on Ramadan 15, not at midnight: the 23:30 card that night looks to the rest (review:
  // "Mornings alone get him to about 291 by Ramadan 15" on the card after the date had passed).
  const dateOpen = t < T.rentPromiseDay * MINUTES_PER_DAY + 20 * 60;
  const [goal, byDay, wants] =
    paid < T.rent && dateOpen
      ? [T.rent - paid, T.rentPromiseDay, `Osman wants ${T.rent} by Ramadan ${T.rentPromiseDay}`]
      : [owed, lastFast, `${owed} is owed`];
  if (day > byDay) return undefined;
  const mornings = byDay - day + (town.state.lastWorked.halil === day ? 0 : 1);
  const projected = money + mornings * T.wage;
  return projected < goal ? { projected, by: `Ramadan ${byDay}`, wants } : undefined;
}

/** The end of Osman's date: Ramadan 15, 20:00. */
const T15 = TOWN_DEFAULTS.rentPromiseDay * MINUTES_PER_DAY + 20 * 60;

const pad = (m: number) => {
  const mm = m % MINUTES_PER_DAY;
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
};
