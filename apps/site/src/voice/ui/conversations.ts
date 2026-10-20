/**
 * Short scenes beside recorded social acts. Reads only the act's time and already surfaced log facts;
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
  Hacer: [
    'I am hungry, Hacer. It is hard to think of much else.',
    'I hear you. We can talk a little, if you like.',
  ],
  Rıza: ['My mind keeps wandering to food, Rıza.', 'Then tell me what you are thinking of. I will listen.'],
  Selin: [
    'I am hungry, love. My mind keeps wandering.',
    'Then we will take it slowly, Dad. I am glad to hear you.',
  ],
};
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
    return [
      { speaker: 'Halil', words: `I was remembering ${recalled}.` },
      {
        speaker: who,
        words:
          who === 'Selin'
            ? 'You can talk about Mum with me, Dad.'
            : 'You can tell me about Nuran, Halil. I have time.',
      },
    ];
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
  return [
    { speaker: 'Halil', words: pair[0] },
    { speaker: who, words: pair[1] },
  ];
}
