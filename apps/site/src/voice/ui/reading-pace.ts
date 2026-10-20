/** Reading changes wall-clock playback only. Logged simulation minutes retain their exact meaning. */
import { type Frame, PACE_MINUTES_PER_SECOND } from '../protocol.ts';
import { deriveScene, sceneChoices } from './scenes.ts';

/** An offer to stay expires with this encounter, even before Speak is opened. */
export function pendingSceneOffer(frame: Frame | null): string | null {
  if (!frame || frame.muted || !['day', 'free'].includes(frame.phase)) return null;
  const scene = deriveScene(frame);
  if (!scene?.current) return null;
  // Read the call before its last few minutes open the ordinary suggestion controls.
  if (scene.kind === 'call') return scene.id;
  if (!frame.composer.open) return null;
  return sceneChoices(scene, frame.options).some((choice) =>
    /^(Stay|Hacer is here\. Stay)/.test(choice.label),
  )
    ? scene.id
    : null;
}
/** One simulation minute per second leaves even short busy occasions readable. */
export function readingTick(dtMs: number, frame: Frame | null, reading: boolean, sceneOffer = false): number {
  if ((!reading && !sceneOffer) || !frame) return dtMs;
  const rate = frame.fastForward ? 240 : PACE_MINUTES_PER_SECOND[frame.pace];
  return (dtMs / rate) * (sceneOffer ? 0.25 : 1);
}
