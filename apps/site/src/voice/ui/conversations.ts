/**
 * Four-line scenes beside recorded social acts. Reads only the act's time and already surfaced log facts;
 * never consumes simulation RNG, writes a log record, invents a remembered event or promises an outcome.
 * Felt body and open concerns are read only when the frame is at the act’s minute. Later feelings never rewrite history.
 */
import type { HalilView, LogEntry } from '../protocol.ts';

type Companion = 'Hacer' | 'Rıza' | 'Selin';
export interface SpokenLine {
  speaker: 'Halil' | Companion;
  words: string;
}
type Pair = readonly [string, string];

const LABELS: Readonly<Record<string, string>> = {
  'Talk hacer': 'Talk with Hacer at the door',
  'Tea riza': 'Have tea with Rıza',
  'Call selin': 'Call Selin',
};
/** Old answer text is part of the saved state. Translate its raw request prefix only for display. */
export function spokenLogText(text: string): string {
  return text.replace(
    /^(Talk hacer|Tea riza|Call selin)\?/,
    (match, key: string) => `${LABELS[key] ?? match}?`,
  );
}

const EVERYDAY: Record<Companion, readonly Pair[]> = {
  Hacer: [
    [
      'Stay a moment, Hacer. It is good to hear someone at the door.',
      'I have a little time, Halil. How has your morning been?',
    ],
    ['I find it hard to start talking sometimes, Hacer.', 'No hurry, Halil. I am here.'],
  ],
  Rıza: [
    ['It is good to sit with you, Rıza.', 'I like having you here, Halil. Take the chair beside me.'],
    ['I wanted some company. Is this seat taken?', 'For you? Sit down, Halil. Tell me about your day.'],
  ],
  Selin: [
    ['I wanted to hear your voice, Selin.', 'I am glad we are talking, Dad. How has today been?'],
    ['It is good to hear you, love.', 'You too, Dad. Tell me something about your day.'],
  ],
};
const LATE: Record<Companion, readonly Pair[]> = {
  Hacer: [
    [
      'The day has gone by, Hacer. I am glad we have a moment.',
      'Me too, Halil. We can talk for a little while.',
    ],
    ['It is quiet tonight. Stay and talk a moment?', 'Of course. How has the day treated you?'],
  ],
  Rıza: [
    ['Evenings feel long on my own, Rıza.', 'Then sit with me a while. There is no hurry.'],
    ['I wanted to end the day with some company.', 'You have mine, Halil. Pull your chair closer.'],
  ],
  Selin: [
    ['I wanted to hear you before the day was over.', 'I am here, Dad. We have time to talk.'],
    ['How are you this evening, Selin?', 'Better for hearing you, Dad. How are you?'],
  ],
};
const WORRIES: Record<Companion, readonly Pair[]> = {
  Hacer: [
    [
      'I keep turning the rent over in my head, Hacer.',
      'No wonder you look preoccupied. We can stand here a moment.',
    ],
    ['It is hard to put the rent out of my mind.', 'Even at your own door, Halil? That is a heavy worry.'],
  ],
  Rıza: [
    [
      'I brought my worries about the rent with me, Rıza.',
      'Then put your chair beside mine. We can talk it over.',
    ],
    [
      'Osman and the rent are on my mind again.',
      'Sit with me, Halil. You do not have to carry the worry in silence.',
    ],
  ],
  Selin: [
    ['I keep thinking about what I owe Osman.', 'I hear you, Dad. Tell me what is worrying you most.'],
    ['The rent has been on my mind, love.', 'You can tell me, Dad. I want to know how you are doing.'],
  ],
};
const HEALTH: Record<Companion, readonly Pair[]> = {
  Hacer: [
    ['Selin has been worrying about my health.', 'She loves you, Halil. It is hard being far away.'],
    [
      'Selin mentioned the doctor. It has stayed with me.',
      'It can be hard hearing worry in your daughter’s voice.',
    ],
  ],
  Rıza: [
    ['Selin has been worrying about my health, Rıza.', 'She wants you around, old friend. So do I.'],
    [
      'I keep thinking about what Selin said about the doctor.',
      'That is quite a subject to bring to the tea house. I am glad you told me.',
    ],
  ],
  Selin: [
    [
      'I heard what you said about the doctor, Selin.',
      'I worry about you, Dad. I want to know how you are feeling.',
    ],
    ['You have been worrying about my health, love.', 'I have, Dad. It helps when you tell me how you are.'],
  ],
};
const TIRED: Record<Companion, Pair> = {
  Hacer: ['I am tired, Hacer. I may be a little slow today.', 'Then we can take our time, Halil.'],
  Rıza: [
    'I am tired, Rıza. I wanted company more than conversation.',
    'Then sit. We do not have to talk the whole time.',
  ],
  Selin: [
    'I am tired, love. I am still glad to hear you.',
    'We can keep it short, Dad. I am glad we are talking.',
  ],
};
const HUNGRY: Record<Companion, Pair> = {
  Hacer: ['I am hungry, Hacer. It is hard to think of much else.', 'What food is on your mind, Halil?'],
  Rıza: ['My mind keeps wandering to food, Rıza.', 'What food are you thinking of, Halil?'],
  Selin: ['I am hungry, love. My mind keeps wandering.', 'What would you like to eat, Dad?'],
};
// The reply answers the opening and ends with an offer for this encounter, not a new task.
// These words do not establish a promise, another remembered event or a simulation outcome.
type Topic = 'everyday' | 'late' | 'rent' | 'health' | 'tired' | 'hunger' | 'memory' | 'table-memory';
const CONTINUATIONS: Record<Topic, Record<Companion, Pair>> = {
  everyday: {
    Hacer: [
      'It was quiet inside. Having you here at the door is the part I wanted.',
      'Then leave the door open, Halil. I can stand here with you a little.',
    ],
    Rıza: [
      'No news, Rıza. I came for the chair beside you more than the tea.',
      'Then take that chair. You do not have to bring news to sit with me.',
    ],
    Selin: [
      'It is good to hear someone call me Dad. The house is quiet without you.',
      'Keep me on the phone, Dad. Sit down and tell me about the quiet house.',
    ],
  },
  late: {
    Hacer: [
      'Lonely, if I am honest. I would rather stand here than go back inside.',
      'Then keep the door open a little longer. I can stay here beside you.',
    ],
    Rıza: [
      'I am in no hurry to go home to a quiet room, Rıza.',
      'Then pull your chair closer. Give me some company too.',
    ],
    Selin: [
      'Lonely, love. I wanted to hear someone call me Dad tonight.',
      'You have me on the phone now, Dad. Sit down; we need not say goodnight yet.',
    ],
  },
  rent: {
    Hacer: [
      'Even while I talk to you, I am adding up what I owe.',
      'Say the amount out loud, Halil. I can stand here while you work through it.',
    ],
    Rıza: [
      'I am sitting with you, but I am still doing sums for Osman in my head.',
      'Do them out loud, then. I can go through the sums with you here.',
    ],
    Selin: [
      'I am afraid every time we speak I will have to tell you I still owe him.',
      'You can say it to me, Dad. Keep me on the phone while you go through the amount.',
    ],
  },
  health: {
    Hacer: [
      'I am worried too. I wish Selin were here instead of worrying from far away.',
      'She is not at your door, Halil, but I am. Stand here with me a little.',
    ],
    Rıza: [
      'The doctor frightens me, Rıza. It is easier to say Selin is worried.',
      'Move your chair here beside mine. You can say you are frightened to me.',
    ],
    Selin: [
      'Frightened, love. Saying that to you is harder than talking about the doctor.',
      'Stay on the phone with me, Dad. You do not have to sound brave for me.',
    ],
  },
  tired: {
    Hacer: [
      'I do not have the energy to tell you the whole day, Hacer.',
      'Then just stand here with me. You need not tell the whole day at once.',
    ],
    Rıza: [
      'I do not have the energy for a proper conversation. I still wanted this chair beside you.',
      'Keep the chair, Halil. I can do the talking for a while.',
    ],
    Selin: [
      'I am too tired for a long answer. I still want to hear about your day.',
      'Then let me talk for a bit, Dad. You can stay on the phone and rest.',
    ],
  },
  hunger: {
    Hacer: [
      'Something warm, Hacer. That is what I keep thinking of: a warm supper.',
      'Tell me what you would put in it. We can plan a supper here at the door.',
    ],
    Rıza: [
      'A warm supper. I know I came for your company, but that is what is in my head.',
      'Describe it to me, Halil. Let me help you choose what goes on the plate.',
    ],
    Selin: [
      'I keep thinking about a warm supper. It is hard to keep my mind on the phone.',
      'Then tell me what you would like to eat, Dad. We can choose something together.',
    ],
  },
  memory: {
    Hacer: [
      'I miss Nuran today, Hacer. I did not want to say her name to an empty room.',
      'Keep the door open, Halil. You can say her name here with me.',
    ],
    Rıza: [
      'I miss her today, Rıza. That is what I came here with.',
      'Put your chair beside mine, Halil. You can talk about Nuran here with me.',
    ],
    Selin: [
      'I miss your mum today, love. I wanted to say that to someone who misses her too.',
      'Stay on the phone with me, Dad. We can talk about Mum before we say goodbye.',
    ],
  },
  'table-memory': {
    Hacer: [
      'I miss having Nuran across the table. That is the part I keep coming back to today.',
      'Keep the door open, Halil. Tell me about sitting with her. I can stand here with you.',
    ],
    Rıza: [
      'I miss sitting across from her, Rıza. There is no one in her place at my table.',
      'Bring your chair here beside mine. You need not sit by yourself just now.',
    ],
    Selin: [
      'I miss having your mum across the table. I wish you were here with me today.',
      'Keep me on the phone a little longer, Dad. Tell me about that meal with Mum.',
    ],
  },
};
function exchange(who: Companion, opening: Pair, topic: Topic): SpokenLine[] {
  const ending = CONTINUATIONS[topic][who];
  return [
    { speaker: 'Halil', words: opening[0] },
    { speaker: who, words: opening[1] },
    { speaker: 'Halil', words: ending[0] },
    { speaker: who, words: ending[1] },
  ];
}
function companion(entry: LogEntry): Companion | undefined {
  if (entry.kind === 'act' && entry.who === 'halil') {
    if (/^I talk with Hacer at the door\b/.test(entry.text)) return 'Hacer';
    if (/^I (?:have )?tea with Rıza\b/.test(entry.text)) return 'Rıza';
    if (/^I call Selin\b/.test(entry.text)) return 'Selin';
  }
  // A recorded incoming call, including the first Eid call. Advice alone is not proof of a new call.
  if (entry.kind === 'voice' && entry.who === 'selin' && /^Selin called/.test(entry.text)) return 'Selin';
  return undefined;
}
function hash(key: string): number {
  let h = 2166136261;
  for (const char of key) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}
export interface ConversationMoment {
  minute: number;
  halil: Pick<HalilView, 'felt' | 'onMind'>;
}
export function conversationFor(
  entry: LogEntry,
  log: readonly LogEntry[],
  moment?: ConversationMoment,
): SpokenLine[] {
  const who = companion(entry);
  if (!who) return [];
  // Bound context to this occasion. A later memory, payment or diagnosis cannot alter an earlier exchange.
  const nearby = log.filter(
    (e) => e.day === entry.day && e.minute <= entry.minute && entry.minute - e.minute <= 360,
  );
  const memory = log.findLast(
    (e) => e.day === entry.day && e.minute <= entry.minute && e.kind === 'recall' && /Nuran/.test(e.text),
  );
  if (memory) {
    const recalled = memory.text.replace(/^He remembers:\s*/, '').replace(/\.$/, '');
    return exchange(
      who,
      [
        `I was remembering ${recalled}.`,
        who === 'Selin'
          ? 'You can talk about Mum with me, Dad.'
          : 'You can tell me about Nuran, Halil. I have time.',
      ],
      /\btable\b/i.test(recalled) ? 'table-memory' : 'memory',
    );
  }
  const present = moment?.minute === entry.minute ? moment.halil : undefined;
  const felt = present?.felt
    .filter((f) => (f.id === 'tired' || f.id === 'hunger') && f.level >= 0.55)
    .sort((a, b) => b.level - a.level)[0];
  const lastWorry = nearby.findLast(
    (e) =>
      (e.kind === 'voice' || e.kind === 'note') &&
      (/Osman|\brent\b/.test(e.text) || (e.who === 'selin' && /doctor|clinic/.test(e.text))),
  );
  const rentOnMind = present?.onMind.some(
    (c) => (c.state === 'open' || c.state === 'closing') && /Osman|rent/.test(c.label),
  );
  const bank = rentOnMind
    ? WORRIES
    : lastWorry
      ? /Osman|\brent\b/.test(lastWorry.text)
        ? WORRIES
        : HEALTH
      : entry.minute % 1440 >= 17 * 60
        ? LATE
        : EVERYDAY;
  const variants = bank[who];
  const pair = felt
    ? felt.id === 'tired'
      ? TIRED[who]
      : HUNGRY[who]
    : variants[hash(`${entry.day}|${entry.minute}|${who}|${entry.text}`) % variants.length];
  if (!pair) return [];
  const topic: Topic = felt
    ? felt.id === 'tired'
      ? 'tired'
      : 'hunger'
    : bank === WORRIES
      ? 'rent'
      : bank === HEALTH
        ? 'health'
        : bank === LATE
          ? 'late'
          : 'everyday';
  return exchange(who, pair, topic);
}
