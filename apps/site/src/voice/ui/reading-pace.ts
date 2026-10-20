/** Reading changes wall-clock playback only. Logged simulation minutes retain their exact meaning. */
import { type Frame, PACE_MINUTES_PER_SECOND } from '../protocol.ts';
/** One simulation minute per second leaves even short busy occasions readable. */
export function readingTick(dtMs: number, frame: Frame | null, reading: boolean): number {
  if (!reading || !frame) return dtMs;
  const rate = frame.fastForward ? 240 : PACE_MINUTES_PER_SECOND[frame.pace];
  return dtMs / rate;
}
