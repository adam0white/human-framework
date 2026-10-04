/**
 * Talks by day (G3-3, spec §4): the Keeper's main way to learn a watcher's fears and hurts. At dawn he has
 * daylight for two talks; each costs the watcher sleep after a night on the wall. "Tell me about last night" asks
 * for the night as they remember it: what frightened them and where. "How is the knee?" asks after the body. Each
 * answer is the person's own words (HF `selfReport`: what they are willing to say, so pride hides pain) and moves
 * the Keeper's impression as testimony (HF `hear`), weaker than seeing them lit.
 *
 * Not covered: the spec's ranked topics that change behaviour (rest, practise with, mend things, take the Gate as a
 * promise, teach); talks with children; talks in the open seasons.
 */
import { hear, selfReport } from '@human/framework';
import { SECTION_IDS, type SectionId } from './config.ts';
import { theSection } from './night.ts';
import { isWatcher, personOf } from './people.ts';
import type { WatchState } from './state.ts';

export type Topic = 'night' | 'body';
export const TALKS_PER_DAY = 2;
/** Sleep a talk costs a watcher after a night on the wall (sleep pressure, 0..1). */
const TALK_SLEEP = 0.06;
/** Testimony weighs less than seeing (the dawn voices use 0.5). */
const TALK_WEIGHT = 0.6;

export function canTalk(s: WatchState, who: string): boolean {
  const p = personOf(s, who);
  return (
    s.phase === 'dawn' &&
    s.talks.left > 0 &&
    !!p &&
    isWatcher(s, p) &&
    !s.talks.said.some((x) => x.who === who)
  );
}

/** Holds a talk. Returns false when it cannot be held. */
export function talk(s: WatchState, who: string, topic: Topic): boolean {
  if (!canTalk(s, who) || (topic !== 'night' && topic !== 'body')) return false;
  const p = personOf(s, who);
  if (!p) return false;
  const said = selfReport(p);
  const at = s.minute;
  let text: string;
  if (topic === 'night') {
    const fears = Object.entries(said.fearOf ?? {})
      .filter(([k, v]) => SECTION_IDS.includes(k as SectionId) && v > 0.25)
      .sort((a, b) => b[1] - a[1]);
    for (const [k, v] of fears) hear(s.keeper, who, `fear@${k}`, v, { at, weight: TALK_WEIGHT });
    hear(s.keeper, who, 'fear', said.fear, { at, weight: TALK_WEIGHT });
    const worst = s.notes.filter((n) => n.who === who).at(-1);
    const top = fears[0];
    if (top && top[1] > 0.45)
      text = `“${capital(theSection(top[0] as SectionId))}. I keep seeing it when I shut my eyes.”`;
    else if (top) text = `“It was all right. I don’t love ${theSection(top[0] as SectionId)}.”`;
    else if (worst?.kind === 'carrier') text = '“I got someone down off the wall. That’s what I remember.”';
    else if (said.fear > 0.35) text = '“I don’t want to talk about it.”';
    else text = '“Cold. Long. Nothing I couldn’t stand.”';
  } else {
    hear(s.keeper, who, 'pain', said.pain, { at, weight: TALK_WEIGHT });
    hear(s.keeper, who, 'fatigue', said.fatigue, { at, weight: TALK_WEIGHT });
    if (said.pain > 0.45) text = '“It’s bad. I won’t lie to you.”';
    else if (said.pain > 0.15) text = '“It aches. It’ll hold.”';
    else if (said.fatigue > 0.5) text = '“Tired to the bone, that’s all.”';
    else text = '“Fine. I’m fine.”';
  }
  p.body.sleepPressure = Math.min(1, p.body.sleepPressure + TALK_SLEEP);
  s.talks.left -= 1;
  s.talks.said.push({ who, topic, text });
  return true;
}

function capital(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
