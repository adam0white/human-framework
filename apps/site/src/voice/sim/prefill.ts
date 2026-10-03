/**
 * The composer's prefill (build plan §6.3), deterministic, first rule that applies wins:
 * 1. another voice's standing advice that is offered now and is not his leaning;
 * 2. one of his ends (pay-rent at 300+, see-doctor if never seen, call Selin after iftar after 2+ days, work if
 *    not worked today), offered now and not leaning;
 * 3. a close call: the runner-up;
 * 4. nothing.
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
  type Town,
  townCalendar,
} from '@human/framework';
import type { Appeal, Prefill, VoiceId } from '../protocol.ts';
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
  const { h, town, t, offers, considered, leaningId } = i;
  const refusable = new Map<string, boolean>();
  const offered = (id: string) => {
    const o = offers.find((x) => x.id === id);
    if (!o) return undefined;
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
  const label = (id: string) => offered(id)?.label ?? ACTION_LABEL[id] ?? id;
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
  // 1. Another voice's standing advice.
  const advice = standingAdvice(h, t)
    .filter((a) => a.sourceId !== 'you')
    .sort((a, b) => adviceWeight(b, t) - adviceWeight(a, t) || (a.sourceId < b.sourceId ? -1 : 1));
  for (const a of advice) {
    const found = offers.find((o) => (a.affordanceId ? o.id === a.affordanceId : o.action === a.action));
    const target = found ? offered(found.id) : undefined;
    if (!target || target.id === leaningId) continue;
    const p: Prefill = {
      optionId: target.id,
      strength: adviceWeight(a, t) >= 0.5 ? 'urge' : 'mention',
      why: `${nameOfVoice(a.sourceId)} said ${relWhen(a.at, t)}: ${ACTION_LABEL[target.id] ?? target.label}.`,
      source: 'advice',
    };
    const appeal = APPEAL_BY_ACTION[target.action];
    if (appeal) p.appeal = appeal;
    if (isVoiceId(a.sourceId)) p.sourceId = a.sourceId as VoiceId;
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
      `Osman is owed ${owed}${day <= 15 ? '; he wants 300 by Ramadan 15' : ''}. He has ${money}.`,
      'duty',
    );
  if (
    offered('see-doctor') &&
    leaningId !== 'see-doctor' &&
    (town.state.completed.halil?.['see-doctor'] ?? 0) === 0
  )
    return end('see-doctor', 'Selin wants his pressure seen; he hasn’t gone.', 'safety');
  const call = town.state.lastCall;
  const since = call ? day - dayOf(call.at) : day - 1;
  if (
    offered('call:selin') &&
    leaningId !== 'call:selin' &&
    t % MINUTES_PER_DAY >= townCalendar(day).maghrib &&
    since >= 2
  )
    return end('call:selin', `He hasn’t spoken to Selin in ${since} days.`, 'benevolence');
  if (offered('work-repair') && leaningId !== 'work-repair' && town.state.lastWorked.halil !== day)
    return end('work-repair', `Osman is owed ${Math.round(town.state.rentOwed)}.`);
  // 3. A close call.
  const rival = closeRival(considered);
  if (rival && offered(rival.affordanceId) && rival.affordanceId !== leaningId)
    return {
      optionId: rival.affordanceId,
      strength: 'mention',
      why: `He’s torn: ${label(rival.affordanceId)} is close behind what he’s leaning toward.`,
      source: 'close-call',
    };
  return undefined;
}

const pad = (m: number) => {
  const mm = m % MINUTES_PER_DAY;
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
};
