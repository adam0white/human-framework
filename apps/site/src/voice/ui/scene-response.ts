/**
 * UI-only responses for a current named encounter. Recorded answers alone establish agreement/refusal;
 * local reading reveals authored words, never another action, remembered fact or relationship outcome.
 * Reads surfaced scene words and present concerns/body. Does not write a log or consume simulation RNG.
 */
import type { Frame } from '../protocol.ts';
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
type Pairs = Record<Companion, readonly (readonly [string, string])[]>;
// R2 (8 of 16 players): each person keeps their own words, and a later visit picks the next pair, so no friend
// borrows another's sentence and the same pair does not come back on the next visit.
const ORDINARY: Pairs = {
  Selin: [
    [
      'The house has been quiet, love. Hearing you call me Dad is good.',
      'It is good to hear you too, Dad. I can stay on the phone a little.',
    ],
    ['I wanted to hear how the city is treating you.', 'Busy, Dad. But I have time for this call.'],
  ],
  Hacer: [
    [
      'It was quiet inside, Hacer. I am glad I opened the door.',
      'So am I, Halil. I can stand here a little.',
    ],
    ['You always knock just when the house is too still.', 'I listen for it, Halil. Old neighbours do.'],
  ],
  Rıza: [
    ['I wanted the company, Rıza. I do not have much news.', 'You do not need news to sit beside me, Halil.'],
    ['Is the tea any good tonight?', 'Same as every night, my friend. Too strong. Sit.'],
  ],
};
const RENT: Pairs = {
  Selin: [
    [
      'I am still thinking about what I owe Osman. I cannot put it out of my mind.',
      'Tell me the numbers, Dad. Saying them to me might make them smaller.',
    ],
    [
      'I keep counting what is left before Osman’s date.',
      'Then count it out loud with me, Dad. We will see what fits.',
    ],
  ],
  Hacer: [
    [
      'Osman will knock again soon. I can feel it.',
      'Then let us think about it before he does. What do you have?',
    ],
    [
      'I hate owing anyone, Hacer.',
      'Owing is heavy. You do not have to carry the whole weight on this step.',
    ],
  ],
  Rıza: [
    [
      'Osman again. The rent sits on me like a stone.',
      'Then lift it a little with tea. How short are you, really?',
    ],
    [
      'I keep doing sums in my head, Rıza.',
      'Do them on the table instead. My head is no good for sums, but I can watch.',
    ],
  ],
};
const TIRED: Pairs = {
  Selin: [
    [
      'I am tired, love. I wanted to hear you more than talk.',
      'Then rest while I talk, Dad. I can tell you about my week.',
    ],
  ],
  Hacer: [['I am tired, Hacer. Forgive me if I am slow.', 'We can stand here quietly for a moment, Halil.']],
  Rıza: [['I am worn out, Rıza. I came for the chair.', 'Then sit. I will do the talking for us both.']],
};
const MORE: Pairs = {
  Selin: [
    ['I am glad I said that aloud, love.', 'I am glad you told me, Dad. We can be quiet for a moment.'],
    ['I like hearing your voice in this quiet house.', 'Then I will keep talking, Dad.'],
  ],
  Hacer: [
    ['The house feels less quiet with you at the door.', 'We need not fill every silence, Halil.'],
    ['I like hearing the street from the door.', 'Then stand with me and listen to it a while.'],
  ],
  Rıza: [
    [
      'It is easier sitting here than sitting on my own.',
      'It is good to have you beside me too, old friend.',
    ],
    ['You never ask me to talk, Rıza. I like that.', 'Talking is overrated. Tea is not.'],
  ],
};
const RETURNING: Pairs = {
  Hacer: [
    ['It is good to talk again, Hacer.', 'You can take your time at the door, Halil.'],
    ['Back at the door again, Hacer.', 'I was passing anyway. That is my story, at least.'],
    ['Have you been well since we talked?', 'My knees complain, my heart does not. Thank you for asking.'],
  ],
  Rıza: [
    ['I wanted a little more company, Rıza.', 'Then sit beside me. We do not need a new subject.'],
    ['The same chair, Rıza?', 'It is yours now. Nobody else dares sit in it.'],
    ['Anything new at the tea house?', 'Only the same old men. You make it one more.'],
  ],
  Selin: [
    ['I am glad we are talking again, love.', 'So am I, Dad. We do not need to fill every moment.'],
    ['I called again. I hope you do not mind.', 'Mind? I like it, Dad.'],
    ['How was work today, love?', 'Long. Better now I am talking to you.'],
  ],
};
const RETURNING_MORE: Pairs = {
  Hacer: [
    ['A short talk is enough for me just now.', 'We can leave it there, Halil.'],
    ['I should let you get on with your evening.', 'Mine is not going anywhere. But go, if you need to.'],
    ['Thank you for knocking, Hacer.', 'I will knock again. You know that.'],
  ],
  Rıza: [
    ['I do not have much else to say, Rıza.', 'That is all right. You can just sit with me.'],
    ['One more glass and I will go.', 'You always say that. Have two.'],
    ['It helps, sitting here.', 'I know, old friend. That is why I keep the chair.'],
  ],
  Selin: [
    ['I do not have much news, love.', 'You do not need news to talk to me, Dad.'],
    ['I should let you go, love.', 'Not yet, Dad. One more minute.'],
    ['Call me when you get home safe.', 'I will, Dad. Look after yourself too.'],
  ],
};
const pick = (pairs: Pairs, who: Companion, n: number) => {
  const list = pairs[who];
  return list[n % list.length] ?? list[0] ?? (['', ''] as const);
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
  const answer = latest && ACTION[who].test(named ? latest.text : (request?.text ?? '')) ? latest : undefined;
  if (answer && answer.tone !== 'yes')
    return {
      answer,
      accepted: false,
      lines: [
        {
          speaker: 'Halil',
          words: answer.text
            .replace(/^[^“"]*\?\s*/, '')
            .replace(/^[“"]/, '')
            .replace(/[”"](?=\s*—|$)/, ''),
        },
      ],
      more: [] as Line[],
    };
  if (scene.lines.every((line) => line.speaker === 'Scene')) return null;
  const words = scene.lines.map((l) => l.words).join(' ');
  const tired = frame.halil.felt.some((f) => f.id === 'tired' && f.level >= 0.55);
  const rent = frame.halil.onMind.some(
    (c) => (c.state === 'open' || c.state === 'closing') && /rent|Osman/.test(c.label),
  );
  const anchor = frame.log.findIndex((entry) => `scene:${entry.id}` === scene.id);
  const visits =
    anchor >= 0
      ? frame.log
          .slice(0, anchor)
          .filter((entry) => entry.kind === 'act' && entry.who === 'halil' && ACTION[who].test(entry.text))
          .length
      : 0;
  const returning = visits > 0;
  const opening = /Nuran|Mum|your mum/.test(words)
    ? /table|meal/.test(words)
      ? TABLE[who]
      : MEMORY[who]
    : tired
      ? pick(TIRED, who, visits)
      : rent
        ? pick(RENT, who, visits)
        : pick(ORDINARY, who, visits);
  return {
    answer,
    accepted: !!answer,
    lines: pair(who, returning && !rent && !tired ? pick(RETURNING, who, visits - 1) : opening),
    more: pair(who, returning ? pick(RETURNING_MORE, who, visits - 1) : pick(MORE, who, visits)),
  };
}
