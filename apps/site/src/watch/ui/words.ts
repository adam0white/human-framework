/** Words for things the play UI never shows as numbers: which night, the hour, rope wear. */
import { ordinal } from '../sim/view.ts';

export function hourWords(clock: number, phase: string): string {
  if (phase === 'goal') return 'Before dusk';
  if (phase === 'dusk') return 'Dusk';
  if (phase === 'dawn' || phase === 'fallen') return 'Dawn';
  const h = Math.floor(clock / 60);
  if (h >= 18 && h < 20) return 'Nightfall';
  if (h >= 20 && h < 23) return 'Night';
  if (h >= 23 || h < 1) return 'Midnight';
  if (h >= 1 && h < 4) return 'The small hours';
  return 'Before dawn';
}

/** How hard the Keeper pressed a posting, as the roster says it. */
export const PRESS_WORDS: Record<'ask' | 'urge' | 'insist', { verb: string; done: string }> = {
  ask: { verb: 'Ask', done: 'asked' },
  urge: { verb: 'Urge', done: 'urged' },
  insist: { verb: 'Insist', done: 'insisted' },
};

/** Where a watcher is, off a post: never their posture or what they are doing there. */
export function awayWords(place: string, phase: string): string {
  if (place === 'hall') return 'gone to the hall';
  if (place === 'home') return phase === 'night' ? 'gone home' : 'at home';
  if (place === 'away') return 'away';
  return 'in the village';
}

const SMALL = ['no', 'one', 'two', 'three', 'four', 'five'];

/** 2 → "second", 23 → "twenty-third" (lower case), for generations and years on the shelf. */
export function ordinalWord(n: number): string {
  return ordinal(n);
}

/** How many fair choices are left, in words. */
export function picksWords(n: number): string {
  if (n <= 0) return 'You can take nothing more this year.';
  if (n === 1) return 'You can take one more.';
  return `You can take ${SMALL[n] ?? 'a few'} more.`;
}

/** The daylight left for talks, in words (the pips draw it). */
export function daylightWords(left: number): string {
  if (left <= 0) return 'The day’s work calls. No more talks this morning.';
  if (left === 1) return 'Daylight enough for one more talk.';
  return 'The morning is young.';
}

/** Born here and the generation, or an outsider. */
export function rootsWords(bornHere: boolean, gen: number): string {
  if (!bornHere) return gen <= 1 ? 'not born here' : `came in, of the ${ordinalWord(gen)} generation`;
  return `born here, ${ordinalWord(gen)} generation`;
}

/** How the winter's question stands. */
export function metWords(met: boolean | null): string {
  if (met === true) return 'It was done.';
  if (met === false) return 'It was not done.';
  return 'Not yet settled.';
}

/** The epilogue's line without the leading "Name, age:" (the name is printed beside it; ages stay words). */
export function epilogueText(text: string): string {
  return text.replace(/^[^,:]+,\s*\d+\s*:\s*/, '');
}

/** A saved page's "when", with any night count in words. */
export function pageWhen(when: string): string {
  return when.replace(/night (\d+)/, (_, n: string) => `the ${ordinalWord(Number(n))} night`);
}

export function ropeWords(wear: number, snapped: boolean): string {
  if (snapped) return 'The rope has snapped';
  if (wear < 0.15) return 'The rope is sound';
  if (wear < 0.45) return 'The rope is fraying';
  if (wear < 0.75) return 'The rope is badly frayed';
  return 'The rope hangs by a few strands';
}
