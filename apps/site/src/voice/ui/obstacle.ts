/** Presentation only: refresh a forecast when its observed context changes, and name its stated obstacle. */
import type { Frame, Telegraph } from '../protocol.ts';

/** Pausing or changing playback speed alone does not change his likely answer. */
export function predictionContext(frame: Frame): string {
  return JSON.stringify([
    frame.day,
    frame.minute,
    frame.phase,
    frame.muted,
    frame.composer,
    frame.halil,
    frame.leaning,
    frame.options,
    frame.standing,
    frame.voices,
  ]);
}

const REASON_WORDS: Readonly<Record<string, string>> = {
  'need:food': 'I need to eat.',
  'need:water': 'I need water.',
  'need:sleep': 'I need sleep.',
  'need:rest': 'I need a rest.',
  'need:relief': 'I need relief.',
  'need:safety': 'I want to feel safe.',
  'need:belonging': 'I want company.',
  'need:leisure': 'I want some time to myself.',
  'need:meaning': 'It matters to me.',
  'need:competence': 'I want to do something I can do well.',
  'need:esteem': 'I want to feel useful.',
  habit: 'It’s what I’m used to doing.',
  preference: 'It’s what I’d rather do.',
  material: 'I’m thinking about the money.',
  expectation: 'I’m going by what I expect from it.',
  autonomy: 'I want to choose for myself.',
};

/**
 * A counter-offer names what he prefers first; it does not prove tiredness, an unfinished shift or a promise
 * to do the suggested action later. Only translate reasons the prediction actually supplies.
 */
export function obstacleWords(telegraph: Telegraph): string | null {
  if (telegraph.tone !== 'notNow') return null;
  const first = telegraph.counter?.match(/^after I (.+)$/i)?.[1];
  if (!first) return null;
  const reason =
    REASON_WORDS[telegraph.reason] ??
    (telegraph.reason.startsWith('commitment:')
      ? 'I have a commitment to keep.'
      : telegraph.reason.startsWith('norm:')
        ? 'It’s what I believe I should do.'
        : telegraph.reason.startsWith('emotion:grief:')
          ? 'I’m grieving.'
          : undefined);
  return `I want to ${first} first.${reason ? ` ${reason}` : ''}`;
}
