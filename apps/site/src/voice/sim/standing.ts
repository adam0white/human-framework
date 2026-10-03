/**
 * The player's standing suggestion (build plan §6.3). One stands at a time; Confirm replaces it. It ends when the
 * activity he began for it ends (it keeps standing while he does it, so he does not turn back half-way), on a `cannot`/`willNot` refusal, after 3 sim hours, when he falls asleep, or
 * when the player withdraws it. A deferral or a modification keeps it standing, and so does its option leaving the
 * offer set (round 3: the framework holds a standing suggestion back while its target is not offered, so a "later"
 * is heard when the option returns; the log says so once). Plain JSON.
 */
import type { Suggestion, SuggestionResolution } from '@human/framework';
import { type Draft, STRENGTH_VALUE, type StandingView, type Tone } from '../protocol.ts';
import { ACTION_LABEL, clock, toneOf } from './view.ts';

export const STANDING_MINUTES = 180;

export interface Standing {
  draft: Draft;
  label: string;
  since: number;
  expires: number;
  lastAnswer?: { tone: Tone; says: string; counter?: string };
  /** Tone and counter-offer of the last answer logged, so repeats collapse (his wording varies). */
  lastKey?: string;
  /** Decision id of the activity he began for it; the suggestion stands until that activity ends. */
  going?: string;
  /** Its option has left the offer set: the framework holds it back until it returns (said once, plainly). */
  away?: boolean;
}

/** Why an option is not open to him now, in the town's terms (for the "your word waits" line). */
export const WHY_AWAY: Record<string, string> = {
  'see-doctor': 'the clinic sees people from 09:00 to 17:00, and not again within a week of a visit',
  'call:selin': 'he calls her in the evening, and not twice within twelve hours',
  'work-repair': 'the workshop takes him once a day, from 08:00 to 12:00',
  'work-extra': 'the afternoon shift runs once a day, between Dhuhr and an hour and a half before Asr',
  'pay-rent': 'he has not got the 300 together, or nothing is owed',
  'tea:riza': 'the tea house is for the daytime',
};

const APPEAL_WORDS: Record<string, string> = {
  duty: 'it’s your duty',
  safety: 'your health',
  benevolence: 'for Selin',
  belonging: 'you shouldn’t be alone',
  meaning: 'it matters',
};

export function draftLabel(d: Draft, optionLabel: string): string {
  return [
    d.insist ? `${d.strength} · insist` : d.strength,
    optionLabel,
    d.appeal ? APPEAL_WORDS[d.appeal] : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function toSuggestion(d: Draft, since?: number): Suggestion {
  const s: Suggestion = { voiceId: 'you', affordanceId: d.optionId, strength: STRENGTH_VALUE[d.strength] };
  if (since !== undefined) s.since = since;
  if (d.insist) s.insist = true;
  if (d.appeal) s.appeal = d.appeal;
  return s;
}

export function createStanding(d: Draft, optionLabel: string, at: number): Standing {
  return {
    draft: d,
    label: draftLabel(d, optionLabel || ACTION_LABEL[d.optionId] || d.optionId),
    since: at,
    expires: at + STANDING_MINUTES,
  };
}

/**
 * Fold his answer in. `fresh`: the first answer or a change of tone (this pauses); `changed`: same tone, a new
 * counter-offer ("after I rest" → "after I sleep"; logged without a pause, fix pass 2: one suggestion used to
 * pause three times to say he was putting it off). `ends`: a cannot/willNot refusal.
 */
export function answer(
  s: Standing,
  r: SuggestionResolution,
): { fresh: boolean; changed: boolean; ends: boolean } {
  const tone = toneOf(r.verdict, r.kind);
  const a: { tone: Tone; says: string; counter?: string } = { tone, says: r.says };
  if (r.counterOffer) a.counter = r.counterOffer.label;
  const key = `${tone}|${a.counter ?? ''}`;
  const fresh = s.lastAnswer?.tone !== tone;
  const changed = !fresh && key !== s.lastKey;
  s.lastKey = key;
  s.lastAnswer = a;
  return { fresh, changed, ends: r.verdict === 'refused' && (r.kind === 'cannot' || r.kind === 'willNot') };
}

export function standingView(s: Standing): StandingView {
  const v: StandingView = {
    draft: s.draft,
    label: s.label,
    since: clock(s.since),
    expires: clock(s.expires),
  };
  if (s.lastAnswer) v.lastAnswer = s.lastAnswer;
  return v;
}
