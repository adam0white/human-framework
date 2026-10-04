/**
 * The Keeper's impressions of a watcher, in words (G3-2, spec §5). Everything here reads the Keeper's estimates
 * (HF `impressionOf`), never the watcher's true state, so a phrase can be wrong and every phrase carries how sure
 * he is. The UI shows the phrase and draws the sureness as a soft bar; it prints no numbers.
 */
import { impressionOf } from '@human/framework';
import { SECTIONS, type SectionId, WATCHERS, type WatcherId } from './config.ts';
import { theSection } from './night.ts';
import { KEEPER_ID } from './people.ts';
import type { WatchState } from './state.ts';

export interface Impression {
  /** A short phrase in the Keeper's voice ("afraid of the west wall"). */
  text: string;
  /** How sure the Keeper is, 0..1 (drawn, not printed). */
  sure: number;
}

/** Below this confidence a cue is not worth saying. */
const SAY_MIN = 0.12;

/** Up to `max` phrases, the surest first. A stranger gets one: "you don't know them yet". */
export function keeperImpressions(s: WatchState, id: WatcherId, max = 4): Impression[] {
  const read = impressionOf(s.keeper, id, s.minute);
  const out: Impression[] = [];
  for (const c of read.cues) {
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
      const other = c.key.slice(4) as WatcherId;
      const name = WATCHERS.find((w) => w.id === other)?.name;
      // A tie to someone not yet among the watchers would name a stranger; it waits until they arrive.
      if (name && s.community.people.some((q) => q.id === other))
        text = v > 0.4 ? `close to ${name}` : v < -0.3 ? `at odds with ${name}` : null;
    } else if (c.key === 'trait:emotionality')
      text = v > 0.65 ? 'jumpy by nature' : v < 0.3 ? 'steady by nature' : null;
    else if (c.key === 'trait:conscientiousness') text = v > 0.7 ? 'dutiful' : v < 0.3 ? 'careless' : null;
    if (text) out.push({ text, sure });
  }
  out.sort((a, b) => b.sure - a.sure || (a.text < b.text ? -1 : 1));
  if (out.length === 0) return [{ text: 'you don’t know them yet', sure: 0 }];
  return out.slice(0, max);
}
