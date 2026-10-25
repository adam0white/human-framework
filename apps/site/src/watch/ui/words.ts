/** Words for things the play UI never shows as numbers: which night, the hour, rope wear. */

import type { Speed } from '../sim/pace.ts';
import { type Frame, ordinal } from '../sim/view.ts';

/** One clock-rate indicator, separate from the date so its reason stays visible on a phone. */
export function clockRateWords(f: Frame, chosen: Speed): string {
  if (f.rate <= 0) return 'The clock is stopped.';
  const season = f.phase === 'spring' || f.phase === 'summer' || f.phase === 'autumn';
  const rate = season ? f.rate / 1440 : f.rate;
  const unit = season ? 'day' : 'min';
  const pace =
    rate < 1 ? `1 ${unit} / ${Number((1 / rate).toFixed(1))} s` : `${Number(rate.toFixed(1))} ${unit}/s`;
  if (f.slowed) return `Slow · ${slowedWords(f)} · ${pace}`;
  const label = { tactical: 'Slow', watch: 'Watch', fast: 'Fast', days: 'Days', seasons: 'Seasons' }[chosen];
  return `${f.phase === 'dusk' ? 'Dusk' : label} · ${pace}`;
}

/** Why the clock is eased, in the header's words. */
export function slowedWords(f: Frame): string {
  if (f.phase === 'spring' || f.phase === 'summer' || f.phase === 'autumn') {
    if (f.card) return 'the days slow for you to answer';
    // Grave news eases the days furthest (pace.ts, GRAVE_DAYS): say which (2026-10-19 level-up).
    const last = f.chronicle.at(-1);
    if (last && f.minute - last.minute < 2 * 1440) {
      if (last.kind === 'death') return 'the days slow: a death in the village';
      if (last.kind === 'leave') return 'the days slow: someone is leaving';
    }
    return 'the days slow for the news';
  }
  return f.moment ? 'a watcher is deciding' : 'the night slows';
}

export function hourWords(clock: number, phase: string): string {
  if (phase === 'goal') return 'Before dusk';
  if (phase === 'dusk') return 'Dusk';
  if (phase === 'dawn' || phase === 'fallen') return 'Dawn';
  const h = Math.floor(clock / 60);
  if (h >= 18 && h < 20) return 'Nightfall';
  if (h >= 20 && h < 23) return 'Night';
  if (h >= 23 || h < 1) return 'Midnight';
  if (h >= 1 && h < 4) return 'After midnight';
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
  if (left <= 0) return 'There is work to do. You cannot have more talks this morning.';
  if (left === 1) return 'There is time for one more talk.';
  return 'There is still time to talk this morning.';
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
  return 'The outcome is not yet settled.';
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

/** Coarse reads of the counted grain and the declared winter, never a success forecast. */
export function grainCondition(f: Pick<Frame, 'grain' | 'need'>): string {
  if (f.grain <= 0) return 'There is no grain left. The village faces a hungry spring.';
  if (f.grain < f.need) return 'There is not enough grain for spring. Some households may leave.';
  if (f.grain === f.need) return 'There is enough grain for spring, with none to spare.';
  if (f.grain <= f.need * 1.5) return 'There is enough grain for spring, with a little to spare.';
  return 'There is enough grain for spring, with plenty to spare.';
}

export function thawProgress(f: Pick<Frame, 'winter' | 'phase'>): string {
  const w = f.winter;
  if (!w) return '';
  const left = w.nights - w.night;
  if (left <= 0)
    return f.phase === 'dawn'
      ? 'The watches you control are finished. The usual watches continue until the spring thaw.'
      : 'This is the last watch you control. Then the usual watches continue until the spring thaw.';
  if (left <= 2)
    return 'You have a few watches left to control. Then the usual watches continue until the spring thaw.';
  return 'These are the early watches. The spring thaw is still far off.';
}

/** Morning's plain account, using the same small-loss band as the winter account. */
export function dawnOutcome(
  d: Pick<NonNullable<Frame['dawn']>, 'grainBefore' | 'grainAfter' | 'crossed'>,
): string {
  const lost = Math.max(0, d.grainBefore - d.grainAfter);
  if (lost === 0)
    return d.crossed ? 'The wall was crossed. No grain was lost.' : 'The wall held. No grain was lost.';
  if (lost <= 3) return 'A little grain was taken.';
  return 'The attackers crossed the wall and took a lot of grain.';
}

/** Four rough marks count only the watched nights; routine winter still follows. */
export function winterWatchMarks(f: Pick<Frame, 'winter' | 'phase'>): number {
  const w = f.winter;
  if (!w || w.nights <= 0) return 0;
  const finished = Math.max(0, w.night - (f.phase === 'dawn' ? 0 : 1));
  if (finished >= w.nights) return 4;
  return Math.min(3, Math.max(1, Math.floor((finished / w.nights) * 4)));
}
