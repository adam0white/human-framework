import type { Commitment } from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

/**
 * A fixed, fictional mid-latitude schedule (minutes of day) used when the host supplies none. Real prayer
 * times depend on location and date; hosts should supply them. Windows here run from each prayer time
 * until the next one (Isha until the next day's Fajr), which simplifies the actual endings (e.g. Fajr
 * ends at sunrise).
 */
export const DEFAULT_PRAYER_TIMES = {
  fajr: 300, // 05:00
  dhuhr: 750, // 12:30
  asr: 960, // 16:00
  maghrib: 1125, // 18:45
  isha: 1215, // 20:15
};

export type PrayerTimes = typeof DEFAULT_PRAYER_TIMES;

/** Engineering default importance of each prayer window commitment. */
export const PRAYER_IMPORTANCE = 0.8;

/** Five daily worship commitments for `day`, each recurring every 24 h. */
export function prayerWindows(
  day: number,
  times: PrayerTimes = DEFAULT_PRAYER_TIMES,
): Omit<Commitment, 'id' | 'status'>[] {
  const base = day * MINUTES_PER_DAY;
  const order = [times.fajr, times.dhuhr, times.asr, times.maghrib, times.isha];
  return order.map((start, i) => {
    const next = order[i + 1] ?? times.fajr + MINUTES_PER_DAY;
    return {
      kind: 'worship',
      actions: ['pray'],
      from: base + start,
      until: base + next,
      normId: 'salah',
      importance: PRAYER_IMPORTANCE,
      recurEvery: MINUTES_PER_DAY,
    };
  });
}
