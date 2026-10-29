/** The Keeper's current public observer cues, expressed in words. Old observed timestamps
 * label stale knowledge; the host never rewinds or recomputes a private impression. */
import { observerCues } from './actor.ts';

const MINUTES_PER_DAY = 1440;

import { SECTIONS, type SectionId, type WatcherId } from './config.ts';
import { theSection } from './night.ts';
import { isHere, KEEPER_ID, villager } from './people.ts';
import type { WatchState } from './state.ts';

export interface Impression {
  /** A short phrase in the Keeper's voice ("afraid of the west wall"). */
  text: string;
  /** Stable identity for topic priority and ordering; never displayed. */
  cue?: string;
  /** How sure the Keeper is, 0..1 (drawn, not printed). */
  sure: number;
}

/** Below this confidence a cue is not worth saying. */
const SAY_MIN = 0.12;

/** A lasting cue is read as it stood this long after it was last seen. */
const HOLD = 30 * MINUTES_PER_DAY;

/** Passing states fade on HF's clock; everything else is held (see the module comment). */
const passing = (key: string) => key === 'fatigue' || key === 'pain' || key === 'fear';

/** Hold a dusk fatigue impression through this night; a new observation can replace it. */
export function keeperFatigue(s: WatchState, id: WatcherId) {
  const found = observerCues(s, KEEPER_ID, id).find((c) => c.key === 'fatigue');
  const cue = found
    ? { ...found, ...(found.seenAt === undefined ? {} : { seenAt: found.seenAt / 60_000 }) }
    : { value: 0, confidence: 0, seenAt: undefined };
  return { ...cue, dusk: s.phase === 'night' && cue.seenAt !== undefined && cue.seenAt < s.nightStart };
}

/** Up to `max` phrases, the surest first. A stranger gets one: "you don't know them yet". */
export function keeperImpressions(s: WatchState, id: WatcherId, max = 4): Impression[] {
  const read = {
    cues: observerCues(s, KEEPER_ID, id).map((c) => ({
      ...c,
      ...(c.seenAt === undefined ? {} : { seenAt: c.seenAt / 60_000 }),
    })),
  };
  const female = villager(s, id).sex === 'female';
  const subject = female ? 'She' : 'He';
  const possessive = female ? 'her' : 'his';
  const out: Impression[] = [];
  let newest = -1;
  for (const raw of read.cues) {
    const at = raw.seenAt;
    const c = raw.key === 'fatigue' ? { ...raw, ...keeperFatigue(s, id) } : raw;
    if (c.confidence < SAY_MIN) continue;
    const v = c.value;
    const sure = Math.round(c.confidence * 20) / 20;
    let phrase: { cue: string; text: string } | null = null;
    if (c.key === 'fatigue') {
      phrase =
        v > 0.55
          ? { cue: 'worn out', text: `${subject} looks very tired.` }
          : v > 0.35
            ? { cue: 'tiring', text: `${subject} looks tired.` }
            : null;
      if (phrase && keeperFatigue(s, id).dusk)
        phrase = {
          cue: `seemed ${phrase.cue} at dusk`,
          text: v > 0.55 ? `${subject} looked very tired at dusk.` : `${subject} looked tired at dusk.`,
        };
    } else if (c.key === 'pain')
      phrase =
        v > 0.45
          ? { cue: 'hurting badly', text: `${subject} seems to be in a lot of pain.` }
          : v > 0.2
            ? { cue: 'hurt', text: `${subject} looks hurt.` }
            : null;
    else if (c.key === 'fear')
      phrase =
        v > 0.45
          ? { cue: 'frightened', text: `${subject} seems frightened.` }
          : v > 0.22
            ? { cue: 'uneasy', text: `${subject} seems uneasy.` }
            : null;
    else if (c.key.startsWith('fear@')) {
      const place = c.key.slice(5);
      if (SECTIONS.some((x) => x.id === place) && v > 0.3)
        phrase = {
          cue: `afraid of ${theSection(place as SectionId)}`,
          text: `${subject} seems afraid of ${theSection(place as SectionId)}.`,
        };
    } else if (c.key === `trust:${KEEPER_ID}`)
      phrase =
        v > 0.65
          ? { cue: 'heeds you', text: `${subject} seems to follow your advice.` }
          : v < 0.35
            ? { cue: 'doesn’t heed you', text: `${subject} does not seem to follow your advice.` }
            : null;
    else if (c.key.startsWith('tie:')) {
      const other = c.key.slice(4);
      const name = s.cast[other]?.name;
      if (name && s.community.people.some((q) => q.id === other && isHere(s, q)))
        phrase =
          v > 0.4
            ? { cue: `close to ${name}`, text: `${subject} seems close to ${name}.` }
            : v < -0.3
              ? { cue: `at odds with ${name}`, text: `${subject} does not seem to get along with ${name}.` }
              : null;
    } else if (c.key === 'trait:emotionality')
      phrase =
        v > 0.65
          ? { cue: 'jumpy by nature', text: `${subject} seems easily startled.` }
          : v < 0.3
            ? { cue: 'steady by nature', text: `${subject} seems calm by nature.` }
            : null;
    else if (c.key === 'skill:sling')
      phrase =
        v > 0.26
          ? { cue: 'a sure arm', text: `${subject} seems accurate with a sling.` }
          : v < 0.13
            ? { cue: 'wild with the sling', text: `${subject} seems to miss often with a sling.` }
            : null;
    else if (c.key === 'trait:conscientiousness')
      phrase =
        v > 0.7
          ? { cue: 'dutiful', text: `${subject} seems careful about ${possessive} duties.` }
          : v < 0.3
            ? { cue: 'careless', text: `${subject} seems careless about ${possessive} duties.` }
            : null;
    if (phrase) {
      out.push({ ...phrase, sure });
      if (!passing(c.key) && at !== undefined) newest = Math.max(newest, at);
    }
  }
  out.sort((a, b) => b.sure - a.sure || ((a.cue ?? a.text) < (b.cue ?? b.text) ? -1 : 1));
  if (out.length === 0)
    return [{ text: `You do not know ${female ? 'her' : 'him'} well enough yet.`, sure: 0 }];
  const shown = out.slice(0, max);
  // How old the read is, when nothing in it is recent.
  const age = newest < 0 ? 0 : s.minute - newest;
  if (age > HOLD)
    shown.push({
      text:
        age < 400 * MINUTES_PER_DAY
          ? 'This impression comes from last winter.'
          : 'This impression comes from several winters ago.',
      sure: 0,
    });
  return shown;
}
