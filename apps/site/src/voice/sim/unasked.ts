/**
 * "He'd now do unasked" (seventh pass; the spec's dawn probe, voice.md §3, which the build plan had cut). For a
 * few acts tied to his ends, the game keeps what he chose at his last decision where the act was open to him and
 * your voice was not part of the weighing: a real decision with no `you` suggestion in it, or a silent copy of the
 * next decision (the look-ahead's ghost, decided again with no suggestion) when your word stood. Any unasked choice
 * of it in a day counts for that day. Reads decision records only; writes nothing in the town.
 *
 * Covers: suhoor, calling Selin, the clinic, paying Osman, the afternoon shift and the doctor's walk. Prayer is left
 * out (games keep faith gentle; the report leaves it out of the ends too). Not covered: whether he would do it at a
 * time the act was not open (a reading is only taken where it was offered), and acts he never considered among his
 * top eight options at a skipped decision (no reading, rather than a guess).
 */
import { type DecisionRecord, dayOf, MINUTES_PER_DAY, resolutionsOf } from '@human/framework';
import type { UnaskedItem } from '../protocol.ts';
import { townCalendar, townDay } from './town.ts';
import { dayLabel } from './view.ts';

export const UNASKED: readonly { key: string; optionId: string; label: string }[] = [
  { key: 'suhoor', optionId: 'eat', label: 'eat at suhoor' },
  { key: 'call', optionId: 'call:selin', label: 'call Selin' },
  { key: 'doctor', optionId: 'see-doctor', label: 'see the doctor' },
  { key: 'rent', optionId: 'pay-rent', label: 'pay Osman' },
  { key: 'extra', optionId: 'work-extra', label: 'take the afternoon shift' },
  { key: 'walk', optionId: 'walk', label: 'walk, not the cigarette' },
];

export type UnaskedState = Record<string, { did: boolean; day: number }>;

/** Whether your voice was weighed in this decision. */
export const heardYou = (r: DecisionRecord): boolean => resolutionsOf(r).some((x) => x?.voiceId === 'you');

/**
 * Fold one unasked decision in. `offered`: the options open at that decision, when known (an option open but not
 * among his top eight then reads as not chosen).
 */
export function noteUnasked(s: UnaskedState, r: DecisionRecord, offered?: ReadonlySet<string>): void {
  if (r.review || heardYou(r)) return;
  const day = dayOf(r.at);
  const m = r.at % MINUTES_PER_DAY;
  for (const u of UNASKED) {
    if (u.key === 'suhoor' && !(townDay(day).kind === 'ramadan' && m < townCalendar(day).fajr)) continue;
    const seen = r.considered.some((c) => c.affordanceId === u.optionId);
    if (!seen && !offered?.has(u.optionId)) continue;
    const prev = s[u.key];
    if (prev && prev.day === day && prev.did) continue;
    s[u.key] = { did: r.chosenAffordanceId === u.optionId, day };
  }
}

/** The strip as shown: the walk once the doctor has told him to walk, the rent while something is owed. */
export function unaskedView(
  s: UnaskedState,
  today: number,
  show: { walk: boolean; rent: boolean },
): UnaskedItem[] {
  return UNASKED.filter((u) => (u.key !== 'walk' || show.walk) && (u.key !== 'rent' || show.rent)).map(
    (u) => {
      const x = s[u.key];
      const item: UnaskedItem = { label: u.label, state: x ? (x.did ? 'yes' : 'no') : 'unknown' };
      if (x && x.day !== today) item.day = dayLabel(x.day);
      return item;
    },
  );
}
