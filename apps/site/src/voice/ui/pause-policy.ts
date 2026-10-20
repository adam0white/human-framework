/** UI pacing only. Every pause/resume uses the existing recorded worker inputs. */
import type { Frame } from '../protocol.ts';
import { deriveScene } from './scenes.ts';

// Walk is prefilled when the doctor's advice competes with a cigarette, not for a routine walk.
const IMPORTANT = new Set(['see-doctor', 'pay-rent', 'work-extra', 'walk']);
function opportunities(frame: Frame): string[] {
  const keys: string[] = [];
  const scene = deriveScene(frame);
  if (scene?.current && scene.names.length >= 2) keys.push(`scene:${scene.id}`);
  const p = consequentialOffer(frame);
  if (p) keys.push(`offer:${frame.day}:${p.optionId}:${p.source}:${p.sourceId ?? ''}`);
  return keys;
}

/** A speakable offer worth stopping for, never routine food/rest or every rank change. */
export function consequentialOffer(frame: Frame): Frame['prefill'] {
  const p = frame.prefill;
  return frame.composer.open &&
    !frame.muted &&
    p &&
    IMPORTANT.has(p.optionId) &&
    frame.options.some((option) => option.id === p.optionId)
    ? p
    : undefined;
}

/** A current scene or an important, speakable offer, keyed without changing prose or ranks. */
export function speakingOpportunity(frame: Frame): string | null {
  return opportunities(frame)[0] ?? null;
}

export class PausePolicy {
  private readonly seen = new Set<string>();

  update(frame: Frame, previous: Frame | null, held = false): 'pause' | 'resume' | null {
    const keys = opportunities(frame);
    const fresh = keys.some((key) => !this.seen.has(key));
    for (const key of keys) this.seen.add(key);
    if (held || !previous || !frame.autoPause || frame.intro || !['day', 'free', 'eid'].includes(frame.phase))
      return null;
    if (fresh) return frame.paused ? null : 'pause';
    if (frame.pauseBeat?.kind === 'verdict') return null;
    const answer = frame.log.findLast((entry) => entry.kind === 'answer');
    const oldAnswer = previous.log.findLast((entry) => entry.kind === 'answer');
    if (answer?.id !== oldAnswer?.id) return null;
    return frame.paused && !previous.paused && frame.pauseBeat ? 'resume' : null;
  }
}
