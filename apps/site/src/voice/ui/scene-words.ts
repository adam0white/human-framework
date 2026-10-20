/**
 * Authored inner-voice continuations over surfaced words and present state. These are not HF
 * perceptions: they change no Person, trust, memory, need, activity or RNG. RecordedGame keeps
 * the chosen input and its deterministic reading separately so a run can replay what was shown.
 */
import type { Frame, SceneWords } from '../protocol.ts';
import { deriveScene } from './scenes.ts';

type Kind = 'care' | 'question';
/** One occasion, anchored to recorded activity/beat rather than a timer or a rerender. */
export function sceneBeat(frame: Frame): string {
  const scene = deriveScene(frame);
  const anchor = frame.log.findLast(
    (entry) => entry.day === frame.day && (entry.kind === 'act' || entry.beat),
  );
  return `${frame.day}:${scene?.current ? scene.id : 'day'}:${anchor?.id ?? 'awake'}`;
}
function allowed(frame: Frame): boolean {
  return (
    (frame.phase === 'day' || frame.phase === 'free') &&
    !frame.muted &&
    !frame.halil.asleep &&
    !/pray|prayer|worship/i.test(frame.halil.doing?.label ?? '')
  );
}
function exchange(frame: Frame, kind: Kind): { words: string; answer: string } {
  const derived = deriveScene(frame);
  const scene = derived?.current ? derived : null;
  const spoken = scene?.lines.map((line) => line.words).join(' ') ?? '';
  if (scene?.kind === 'clinic') {
    return kind === 'care'
      ? {
          words: 'That was a lot to hear.',
          answer: 'It was. I am still thinking about what the doctor said.',
        }
      : {
          words: 'What stayed with you from that conversation?',
          answer: /Nuran|illness/.test(spoken)
            ? 'The clinic brings Nuran back to mind. That is hard to separate from being here myself.'
            : 'What he said about my health. I need a moment with it.',
        };
  }
  if (/doctor|clinic|pressure/i.test(spoken) && !/Nuran|Mum|your mum/.test(spoken)) {
    return kind === 'care'
      ? {
          words: 'It is hard hearing someone worry about you.',
          answer: 'It is. I do not find it easy to talk about my health.',
        }
      : {
          words: 'How do you feel about seeing the doctor?',
          answer: 'It is not an easy thing for me to think about.',
        };
  }
  if (/Nuran|Mum|your mum/.test(spoken)) {
    return kind === 'care'
      ? {
          words: 'You can miss her. You do not have to find more words.',
          answer: /table|meal/.test(spoken)
            ? 'I miss sitting across from her. That is what keeps coming back.'
            : 'I miss Nuran. Sometimes that is all I have to say.',
        }
      : {
          words: 'Which part of that memory stays with you?',
          answer: /table|meal/.test(spoken)
            ? 'Having her across the table. The empty place is hard to look at.'
            : 'Nuran herself. I keep coming back to her.',
        };
  }
  const tired = frame.halil.felt.some((felt) => felt.id === 'tired' && felt.level >= 0.55);
  if (tired)
    return kind === 'care'
      ? {
          words: 'You sound tired. You do not owe me a long answer.',
          answer: 'I am tired. A short answer will have to do.',
        }
      : {
          words: 'How does the day feel just now?',
          answer: 'Long. I am tired, and I do not have much to say.',
        };
  if (scene?.kind === 'workshop')
    return kind === 'care'
      ? { words: 'Take your time. I can be quiet while you work.', answer: 'He keeps working; he heard you.' }
      : {
          words: 'Would you rather have quiet while you work?',
          answer: 'For this part, yes. I want to keep my attention here.',
        };
  const rent = frame.halil.onMind.some(
    (concern) =>
      (concern.state === 'open' || concern.state === 'closing') && /Osman|rent/.test(concern.label),
  );
  if (rent)
    return kind === 'care'
      ? {
          words: 'The rent is a lot to carry in your head.',
          answer: 'I keep adding it up. It is hard to set it aside.',
        }
      : { words: 'What is on your mind?', answer: 'What I owe Osman. I am still thinking about it.' };
  const who = scene?.names.find((name) => name === 'Selin' || name === 'Hacer' || name === 'Rıza');
  if (who)
    return kind === 'care'
      ? {
          words: `It is good to hear ${who} with you.`,
          answer: 'It is good to have company. We need not fill every silence.',
        }
      : {
          words: 'What did you want to say just now?',
          answer: 'That I wanted the company. I do not have to bring news every time.',
        };
  return kind === 'care'
    ? {
        words: 'I am here. You need not answer at length.',
        answer: 'There is not much I want to say just now.',
      }
    : { words: 'Would you rather have a quiet moment?', answer: 'Yes. Just a little quiet for now.' };
}
export function sceneWordChoices(frame: Frame): { kind: Kind; words: string }[] {
  if (
    !allowed(frame) ||
    frame.sceneWords?.some(
      (line) => line.beat === sceneBeat(frame) && line.kind !== 'suggestion' && line.said !== false,
    )
  )
    return [];
  return (['care', 'question'] as const).map((kind) => ({ kind, words: exchange(frame, kind).words }));
}
export function sceneWord(frame: Frame, kind: Kind, beat: string, words?: string): SceneWords | null {
  if (beat !== sceneBeat(frame) || !sceneWordChoices(frame).some((choice) => choice.kind === kind))
    return null;
  if (words !== undefined && words !== exchange(frame, kind).words) return null;
  return { beat, kind, day: frame.day, minute: frame.minute, clock: frame.clock, ...exchange(frame, kind) };
}
