/**
 * Authored inner-voice continuations over surfaced words and present state. These are not HF
 * perceptions. Accepted care uses an acknowledged-support receipt; it grants no comfort, trust or action. RecordedGame keeps
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
            ? 'The clinic brings Nuran back to mind. It is hard to think about my own visit without remembering hers.'
            : 'What the doctor said about my health. I need a moment to think about it.',
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
  const tired = frame.halil.felt.some(
    (felt) => felt.id === 'tired' && ['high', 'very high'].includes(felt.level),
  );
  if (tired)
    return kind === 'care'
      ? {
          words: 'You sound tired. You do not owe me a long answer.',
          answer: 'I am tired. A short answer will have to do.',
        }
      : {
          words: 'How does the day feel just now?',
          answer: 'The day feels long. I am tired, and I do not have much to say.',
        };
  if (scene?.kind === 'workshop')
    return kind === 'care'
      ? { words: 'Take your time. I can be quiet while you work.', answer: 'He heard you and keeps working.' }
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
          words: 'You have a lot to think about with the rent.',
          answer: 'I keep adding it up. It is hard to set it aside.',
        }
      : { words: 'What is on your mind?', answer: 'What I owe Osman. I am still thinking about it.' };
  const who = scene?.names.find((name) => name === 'Selin' || name === 'Hacer' || name === 'Rıza');
  if (who)
    return kind === 'care'
      ? {
          words: `It is good to hear ${who} with you.`,
          answer: 'It is good to have company. We do not have to keep talking.',
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
type Topic = 'clinic' | 'health' | 'nuran' | 'tired' | 'work' | 'rent' | 'company';
/** Topics describe authored words, never a person's emotional or therapeutic progress. */
function topicOf(words: string): Topic | null {
  if (/doctor.s words|what the doctor said|That was a lot to hear|What stayed with you/.test(words))
    return 'clinic';
  if (/hearing someone worry|seeing the doctor/.test(words)) return 'health';
  if (/miss her|that memory|empty place|Nuran/.test(words)) return 'nuran';
  if (/sound tired|day feel just now/.test(words)) return 'tired';
  if (/while you work/.test(words)) return 'work';
  if (/rent|What is on your mind/.test(words)) return 'rent';
  if (/good to hear|want to say just now/.test(words)) return 'company';
  return null;
}
function particular(frame: Frame, kind: Kind): { words: string; answer: string } {
  const original = exchange(frame, kind);
  const topic = topicOf(original.words);
  if (topic === 'clinic')
    return kind === 'care'
      ? {
          words: 'You do not have to talk more about what the doctor said.',
          answer: 'Yes. I do not want to go over them again just now.',
        }
      : original;
  if (
    topic === 'nuran' &&
    /table|meal/.test(
      deriveScene(frame)
        ?.lines.map((line) => line.words)
        .join(' ') ?? '',
    )
  )
    return kind === 'care'
      ? {
          words: 'You do not have to say more about missing Nuran at the table.',
          answer: 'No. I can remember sitting with Nuran without saying anything more.',
        }
      : original;
  return original;
}
/** Legacy acceptance stays independent of current offers so existing exports replay unchanged. */
function legacyAvailable(frame: Frame): boolean {
  return (
    allowed(frame) &&
    !frame.sceneWords?.some(
      (line) => line.beat === sceneBeat(frame) && line.kind !== 'suggestion' && line.said !== false,
    )
  );
}
export function sceneWordChoices(frame: Frame): { kind: Kind; words: string }[] {
  if (!legacyAvailable(frame)) return [];
  const topic = topicOf(exchange(frame, 'care').words);
  // One response to a surfaced particular. A later activity or day does not reopen it.
  // Generic reassurance supplies no new particular; leave room for quiet instead.
  if (
    !topic ||
    frame.sceneWords?.some(
      (line) => line.kind !== 'suggestion' && line.said !== false && topicOf(line.words) === topic,
    )
  )
    return [];
  return (['care', 'question'] as const).map((kind) => ({ kind, words: particular(frame, kind).words }));
}
export function sceneWord(frame: Frame, kind: Kind, beat: string, words?: string): SceneWords | null {
  if (beat !== sceneBeat(frame) || !legacyAvailable(frame)) return null;
  const legacy = exchange(frame, kind);
  // Original inputs, including omitted wording, retain the original deterministic reply.
  if (words === undefined || words === legacy.words)
    return { beat, kind, day: frame.day, minute: frame.minute, clock: frame.clock, ...legacy };
  const offered = sceneWordChoices(frame).find((choice) => choice.kind === kind && choice.words === words);
  if (!offered) return null;
  return { beat, kind, day: frame.day, minute: frame.minute, clock: frame.clock, ...particular(frame, kind) };
}
