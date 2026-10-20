/**
 * UI-only responses for a current named encounter. Recorded answers alone establish agreement/refusal;
 * local reading reveals authored words, never another action, remembered fact or relationship outcome.
 * Reads surfaced scene words and present concerns/body. Does not write a log or consume simulation RNG.
 */
import type { Frame } from '../protocol.ts';
import { spokenLogText } from './conversations.ts';
import type { DayScene } from './scenes.ts';

type Line = DayScene['lines'][number];
type Companion = 'Selin' | 'Hacer' | 'Rıza';
const ACTION: Record<Companion, RegExp> = {
  Selin: /call Selin/i,
  Hacer: /talk (?:with Hacer at the door|hacer)/i,
  Rıza: /(?:have )?tea (?:with Rıza|riza)/i,
};
/** The reply belongs to this occasion, not merely to the most recent timestamp. */
export function currentReply(frame: Frame, scene: DayScene | null) {
  const at = frame.log.findLastIndex((e) => e.kind === 'answer');
  const answer = frame.log[at];
  if (!answer || answer.day !== frame.day || answer.minute > frame.minute) return undefined;
  const later = frame.log.slice(at + 1);
  if (
    later.some(
      (e) =>
        e.kind === 'you' || (e.kind === 'act' && (!answer.decisionId || e.decisionId !== answer.decisionId)),
    )
  )
    return undefined;
  const anchor = scene && frame.log.findIndex((e) => `scene:${e.id}` === scene.id);
  if (
    typeof anchor === 'number' &&
    anchor > at &&
    (!answer.decisionId || frame.log[anchor]?.decisionId !== answer.decisionId)
  )
    return undefined;
  return answer;
}
const pair = (who: Companion, words: readonly [string, string]): Line[] => [
  { speaker: 'Halil', words: words[0] },
  { speaker: who, words: words[1] },
];
const TABLE: Record<Companion, readonly [string, string]> = {
  Selin: [
    'I keep thinking about that meal because I miss having your mum across the table. I did not want to say that to an empty room.',
    'I miss her too, Dad. I can keep you company on the phone for a little.',
  ],
  Hacer: [
    'I keep seeing Nuran across the table, Hacer. I miss sitting with her.',
    'I can stand here with you, Halil. We can leave the door open a little.',
  ],
  Rıza: [
    'I miss having Nuran across the table. It is hard to sit there on my own.',
    'You have a place beside me here, Halil. Stay for a little company.',
  ],
};
const MEMORY: Record<Companion, readonly [string, string]> = {
  Selin: [
    'I miss your mum, love. Saying it to you feels different from saying it to myself.',
    'I miss her too, Dad. I am glad you said her name to me.',
  ],
  Hacer: [
    'I miss Nuran, Hacer. I wanted someone to hear me say that.',
    'I hear you, Halil. I can stand here with you for a little.',
  ],
  Rıza: [
    'I miss Nuran, Rıza. That is what I wanted to say.',
    'I hear you, old friend. There is room for that at this table.',
  ],
};
const ORDINARY: Record<Companion, readonly [string, string]> = {
  Selin: [
    'The house has been quiet, love. Hearing you call me Dad is good.',
    'It is good to hear you too, Dad. I can stay on the phone a little.',
  ],
  Hacer: [
    'It was quiet inside, Hacer. I am glad I opened the door.',
    'So am I, Halil. I can stand here a little.',
  ],
  Rıza: [
    'I wanted the company, Rıza. I do not have much news.',
    'You do not need news to sit beside me, Halil.',
  ],
};
const MORE: Record<Companion, readonly [string, string]> = {
  Selin: ['I am glad I said that aloud, love.', 'I am glad you told me, Dad. We can be quiet for a moment.'],
  Hacer: ['The house feels less quiet with you at the door.', 'We need not fill every silence, Halil.'],
  Rıza: [
    'It is easier sitting here than sitting on my own.',
    'It is good to have you beside me too, old friend.',
  ],
};
export function sceneResponse(frame: Frame, scene: DayScene | null) {
  if (!scene?.current || !['call', 'door', 'tea'].includes(scene.kind)) return null;
  const who = scene.names.find((n): n is Companion => n === 'Selin' || n === 'Hacer' || n === 'Rıza');
  if (!who) return null;
  const latest = currentReply(frame, scene);
  const index = latest ? frame.log.indexOf(latest) : -1;
  const request = frame.log.slice(0, index).findLast((e) => e.kind === 'you');
  // Delayed standing replies name the action themselves. Otherwise use the recorded player words.
  const named = latest && /\?/.test(latest.text.split(/[“"]/, 1)[0] ?? '');
  const answer =
    latest && ACTION[who].test(named ? spokenLogText(latest.text) : (request?.text ?? ''))
      ? latest
      : undefined;
  if (answer && answer.tone !== 'yes')
    return {
      answer,
      accepted: false,
      lines: [
        {
          speaker: 'Halil',
          words: spokenLogText(answer.text)
            .replace(/^[^“"]*\?\s*/, '')
            .replace(/^[“"]/, '')
            .replace(/[”"](?=\s*—|$)/, ''),
        },
      ],
      more: [] as Line[],
    };
  const words = scene.lines.map((l) => l.words).join(' ');
  const tired = frame.halil.felt.some((f) => f.id === 'tired' && f.level >= 0.55);
  const rent = frame.halil.onMind.some(
    (c) => (c.state === 'open' || c.state === 'closing') && /rent|Osman/.test(c.label),
  );
  const opening = /Nuran|Mum|your mum/.test(words)
    ? /table|meal/.test(words)
      ? TABLE[who]
      : MEMORY[who]
    : tired
      ? ([
          'I am tired. I wanted company more than a long conversation.',
          who === 'Selin'
            ? 'Then rest while I keep you company, Dad.'
            : who === 'Hacer'
              ? 'Then we can stand here quietly for a moment, Halil.'
              : 'Then we can sit quietly for a moment, Halil.',
        ] as const)
      : rent
        ? ([
            'I am still thinking about what I owe Osman. I cannot put it out of my mind.',
            who === 'Selin'
              ? 'I hear you, Dad. I can listen while you go through it.'
              : 'I hear you, Halil. I can listen while you go through it.',
          ] as const)
        : ORDINARY[who];
  return { answer, accepted: !!answer, lines: pair(who, opening), more: pair(who, MORE[who]) };
}
