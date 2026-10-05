/**
 * The Keeper's impressions of a watcher, in words (G3-2, spec §5). Everything here reads the Keeper's estimates
 * (HF `impressionOf`), never the watcher's true state, so a phrase can be wrong and every phrase carries how sure
 * he is. The UI shows the phrase and draws the sureness as a soft bar; it prints no numbers.
 *
 * G3-3: what the Keeper learned of someone's nature, ties, trust, aim and fears of a place does not fade through
 * the months he doesn't watch them on the wall. Those cues are read as they stood a few weeks after he last saw
 * them, and the read says how old it is ("from last winter"). Passing states (tired, hurt, frightened) still fade
 * on HF's clock. This is how the frame shows the impression; the Keeper's HF estimates are unchanged.
 */
import { estimate, impressionOf, MINUTES_PER_DAY } from '@adam0white/human-framework';
import { SECTIONS, type SectionId, type WatcherId } from './config.ts';
import { theSection } from './night.ts';
import { isHere, KEEPER_ID } from './people.ts';
import type { WatchState } from './state.ts';

export interface Impression {
  /** A short phrase in the Keeper's voice ("afraid of the west wall"). */
  text: string;
  /** How sure the Keeper is, 0..1 (drawn, not printed). */
  sure: number;
}

/** Below this confidence a cue is not worth saying. */
const SAY_MIN = 0.12;

/** A lasting cue is read as it stood this long after it was last seen. */
const HOLD = 30 * MINUTES_PER_DAY;

/** Passing states fade on HF's clock; everything else is held (see the module comment). */
const passing = (key: string) => key === 'fatigue' || key === 'pain' || key === 'fear';

/** Up to `max` phrases, the surest first. A stranger gets one: "you don't know them yet". */
export function keeperImpressions(s: WatchState, id: WatcherId, max = 4): Impression[] {
  const read = impressionOf(s.keeper, id, s.minute);
  const out: Impression[] = [];
  let newest = -1;
  for (const raw of read.cues) {
    const at = raw.seenAt;
    const c =
      passing(raw.key) || at === undefined || s.minute - at <= HOLD
        ? raw
        : { key: raw.key, ...estimate(s.keeper, id, raw.key, at + HOLD) };
    if (c.confidence < SAY_MIN) continue;
    const v = c.value;
    const sure = Math.round(c.confidence * 20) / 20;
    let text: string | null = null;
    if (c.key === 'fatigue') text = v > 0.55 ? 'worn out' : v > 0.35 ? 'tiring' : null;
    else if (c.key === 'pain') text = v > 0.45 ? 'hurting badly' : v > 0.2 ? 'hurt' : null;
    else if (c.key === 'fear') text = v > 0.45 ? 'frightened' : v > 0.22 ? 'uneasy' : null;
    else if (c.key.startsWith('fear@')) {
      const place = c.key.slice(5);
      if (SECTIONS.some((x) => x.id === place) && v > 0.3)
        text = `afraid of ${theSection(place as SectionId)}`;
    } else if (c.key === `trust:${KEEPER_ID}`)
      text = v > 0.65 ? 'heeds you' : v < 0.35 ? 'doesn’t heed you' : null;
    else if (c.key.startsWith('tie:')) {
      const other = c.key.slice(4);
      const name = s.cast[other]?.name;
      // A tie to someone not yet come, or gone, would name a stranger; it waits until they are here.
      if (name && s.community.people.some((q) => q.id === other && isHere(s, q)))
        text = v > 0.4 ? `close to ${name}` : v < -0.3 ? `at odds with ${name}` : null;
    } else if (c.key === 'trait:emotionality')
      text = v > 0.65 ? 'jumpy by nature' : v < 0.3 ? 'steady by nature' : null;
    // Aim as seen: the share of lit throws that landed (a fine arm lands about a third of them).
    else if (c.key === 'skill:sling')
      text = v > 0.26 ? 'a sure arm' : v < 0.13 ? 'wild with the sling' : null;
    else if (c.key === 'trait:conscientiousness') text = v > 0.7 ? 'dutiful' : v < 0.3 ? 'careless' : null;
    if (text) {
      out.push({ text, sure });
      if (!passing(c.key) && at !== undefined) newest = Math.max(newest, at);
    }
  }
  out.sort((a, b) => b.sure - a.sure || (a.text < b.text ? -1 : 1));
  if (out.length === 0) return [{ text: 'you don’t know them yet', sure: 0 }];
  const shown = out.slice(0, max);
  // How old the read is, when nothing in it is recent.
  const age = newest < 0 ? 0 : s.minute - newest;
  if (age > HOLD)
    shown.push({ text: age < 400 * MINUTES_PER_DAY ? 'from last winter' : 'from winters ago', sure: 0 });
  return shown;
}
