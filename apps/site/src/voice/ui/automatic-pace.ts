/** UI timing and skip boundaries. Never changes the simulation or its replay format. */
import { type Frame, PACE_MINUTES_PER_SECOND, type Pace } from '../protocol.ts';
import { speakingOpportunity } from './pause-policy.ts';
import { readingTick } from './reading-pace.ts';
import { deriveScene } from './scenes.ts';

export type PaceSetting = 'automatic' | Pace;
export function automaticTick(
  dt: number,
  frame: Frame | null,
  setting: PaceSetting,
  reading: boolean,
  offer: boolean,
): number {
  if (!frame) return dt;
  if (reading || offer) return readingTick(dt, frame, reading, offer);
  const actual = frame.fastForward ? 240 : PACE_MINUTES_PER_SECOND[frame.pace];
  return (
    (dt * (setting === 'automatic' ? (frame.fastForward ? 240 : 8) : PACE_MINUTES_PER_SECOND[setting])) /
    actual
  );
}
/** One whole minute per acknowledgement prevents jumping over an encounter or a calendar boundary. */
export function skipTick(frame: Frame): number {
  return 1000 / (frame.fastForward ? 240 : PACE_MINUTES_PER_SECOND[frame.pace]);
}
export function skipStop(previous: Frame, frame: Frame): boolean {
  if (frame.phase !== previous.phase || frame.day !== previous.day || frame.intro || frame.paused)
    return true;
  if (deriveScene(frame)?.id !== deriveScene(previous)?.id) return true;
  if (speakingOpportunity(frame) !== speakingOpportunity(previous)) return true;
  if (frame.pauseBeat && frame.pauseBeat.text !== previous.pauseBeat?.text) return true;
  if (frame.halil.asleep !== previous.halil.asleep) return true;
  if (frame.sceneWords?.length !== previous.sceneWords?.length) return true;
  if (
    frame.log.findLast((e) => e.kind === 'answer')?.id !==
    previous.log.findLast((e) => e.kind === 'answer')?.id
  )
    return true;
  const boundaries = [
    ...frame.sky.prayers.map((p) => p.minute),
    ...(frame.sky.fast ? [frame.sky.fast.from, frame.sky.fast.until] : []),
  ];
  return boundaries.some((minute) => previous.minute % 1440 < minute && frame.minute % 1440 >= minute);
}
