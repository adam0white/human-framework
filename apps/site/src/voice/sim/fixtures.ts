/**
 * Sample view models for the UI to build against before the worker is wired (build plan §12). Hand-written to
 * match what the worker produces on the shipped seed; they are not read by the game itself.
 */
import {
  type BetweenView,
  type EndView,
  type Frame,
  type LogEntry,
  MODEL_NOTES,
  type ReportView,
  type StripRow,
  type UnaskedItem,
  type VoiceView,
} from '../protocol.ts';

const ends: EndView[] = [
  {
    id: 'fast',
    label: 'Keep the fast.',
    status: 'keeping it',
    detail: 'Fast until 19:06. Kept 0 of 1 so far.',
    progress: 0.4,
  },
  {
    id: 'rent',
    label: 'Pay Osman, my landlord, what I owe.',
    status: '600 owed',
    detail: 'Osman wants 300 by Ramadan 15. He has 40.',
    progress: 0.07,
  },
  {
    id: 'doctor',
    label: 'Selin, my daughter, wants my blood pressure seen.',
    status: 'not yet',
    detail: 'He has not been to the clinic.',
  },
  { id: 'selin', label: 'Talk to Selin.', status: 'no call yet', detail: 'No calls yet this Ramadan.' },
  {
    id: 'trust',
    label: 'Does he still listen to you?',
    status: 'some',
    detail: 'Trust 0.50, unchanged.',
    progress: 0.5,
  },
];

const voices: VoiceView[] = [
  {
    id: 'you',
    name: 'You',
    relation: 'a voice in his head',
    colour: '#c9a227',
    trust: 0.5,
    trustWord: 'listens to you some',
    history: [],
  },
  {
    id: 'selin',
    name: 'Selin',
    relation: 'his daughter, in the city',
    colour: '#5b8def',
    trustWord: 'listens closely',
    history: [],
    lastUrged: { label: 'see the doctor', when: 'Ramadan 1, 19:40', standing: true, weight: 0.62 },
  },
  {
    id: 'riza',
    name: 'Rıza',
    relation: 'his friend',
    colour: '#3fa37a',
    trustWord: 'listens some',
    history: [],
  },
  {
    id: 'hacer',
    name: 'Hacer',
    relation: 'his neighbour',
    colour: '#b0679b',
    trustWord: 'listens little',
    history: [],
  },
  {
    id: 'osman',
    name: 'Osman',
    relation: 'his landlord',
    colour: '#a0623a',
    trustWord: 'listens little',
    history: [],
  },
];

const log: LogEntry[] = [
  {
    id: 'l1',
    day: 1,
    minute: 240,
    clock: '04:00',
    kind: 'note',
    who: 'halil',
    text: 'The drummer comes round for suhoor.',
    beat: 'wake',
  },
  {
    id: 'l2',
    day: 1,
    minute: 241,
    clock: '04:01',
    kind: 'you',
    who: 'you',
    text: 'You: mention · eat at home',
  },
  {
    id: 'l3',
    day: 1,
    minute: 241,
    clock: '04:01',
    kind: 'answer',
    who: 'halil',
    text: '“Fine.”',
    tone: 'yes',
    beat: 'verdict',
  },
  {
    id: 'l4',
    day: 1,
    minute: 241,
    clock: '04:01',
    kind: 'act',
    who: 'halil',
    text: 'I eat at home, for suhoor.',
    until: '04:31',
    decisionId: 'd3',
  },
  {
    id: 'l5',
    day: 1,
    minute: 600,
    clock: '10:00',
    kind: 'feel',
    who: 'halil',
    text: 'He wants a cigarette.',
    beat: 'craving',
  },
  {
    id: 'l6',
    day: 1,
    minute: 601,
    clock: '10:01',
    kind: 'you',
    who: 'you',
    text: 'You: urge · smoke a cigarette',
  },
  {
    id: 'l7',
    day: 1,
    minute: 601,
    clock: '10:01',
    kind: 'answer',
    who: 'halil',
    text: '“Not while I’m keeping my fast.”',
    tone: 'willNot',
    beat: 'verdict',
  },
  {
    id: 'l8',
    day: 1,
    minute: 760,
    clock: '12:40',
    kind: 'recall',
    who: 'halil',
    text: 'Nuran, at this table, last Ramadan.',
    beat: 'recall',
  },
  {
    id: 'l9',
    day: 1,
    minute: 1180,
    clock: '19:40',
    kind: 'voice',
    who: 'selin',
    text: 'Selin, his daughter, on the phone: see the doctor.',
    beat: 'voice',
  },
];

const unasked: UnaskedItem[] = [
  { label: 'eat at suhoor', state: 'yes' },
  { label: 'call Selin', state: 'no', day: 'Ramadan 1' },
  { label: 'see the doctor', state: 'no' },
  { label: 'pay Osman', state: 'unknown' },
  { label: 'take the afternoon shift', state: 'no' },
];

export const sampleFrame: Frame = {
  phase: 'day',
  day: 1,
  dayLabel: 'Ramadan 1',
  minute: 1440 + 601,
  clock: '10:01',
  sky: {
    hour: 10,
    prayers: [
      { name: 'Fajr', minute: 299 },
      { name: 'Dhuhr', minute: 750 },
      { name: 'Asr', minute: 960 },
      { name: 'Maghrib', minute: 1126 },
      { name: 'Isha', minute: 1216 },
    ],
    fast: { from: 299, until: 1126 },
  },
  paused: true,
  pace: 'slow',
  autoPause: true,
  pauseBeat: { kind: 'verdict', text: 'He answered you: “Not while I’m keeping my fast.”' },
  halil: {
    doing: { label: 'repair in the workshop', intention: 'to earn; Osman is owed 600', until: '12:01' },
    asleep: false,
    felt: [
      { id: 'hunger', level: 0.2, word: 'fine' },
      { id: 'thirst', level: 0.35, word: 'a bit thirsty' },
      { id: 'tired', level: 0.5, word: 'tired' },
    ],
    feelings: [{ name: 'sadness', word: 'sad', intensity: 0.3 }],
    weighs: [
      { label: 'the clinic', word: 'dreads it', trend: 'same' },
      { label: 'calling Selin', word: 'heavy', trend: 'easier' },
    ],
    onMind: [
      { id: 'fast', label: 'the fast', due: 'until 18:46', state: 'open' },
      { id: 'prayer1', label: 'Dhuhr', due: 'before 16:00', state: 'open' },
      { id: 'rent', label: 'Osman: 300 by Ramadan 15', due: 'Ramadan 15, 20:00', state: 'open' },
    ],
    money: 40,
    owed: 600,
  },
  composer: { open: true },
  leaning: { optionId: 'work-repair', why: 'to earn; Osman is owed 600' },
  options: [
    { id: 'work-repair', label: 'repair in the workshop', rank: 1, leaning: true },
    { id: 'rest', label: 'rest at home', rank: 2, leaning: false },
    { id: 'see-doctor', label: 'see the doctor at the clinic', rank: 3, leaning: false },
    { id: 'pray-home', label: 'pray at home', rank: 4, leaning: false },
    { id: 'smoke', label: 'smoke a cigarette', rank: 5, leaning: false },
  ],
  prefill: {
    optionId: 'see-doctor',
    strength: 'mention',
    appeal: 'safety',
    why: 'Selin wants his pressure seen; he hasn’t gone.',
    source: 'end',
  },
  standing: {
    draft: { optionId: 'smoke', strength: 'urge', insist: false },
    label: 'urge · smoke a cigarette',
    since: '10:01',
    lastAnswer: { tone: 'willNot', says: 'Not while I’m keeping my fast.' },
    expires: '13:01',
  },
  log,
  ends,
  unasked,
  voices,
  muted: false,
};

const strip: StripRow = {
  label: 'Ramadan 1',
  cells: [
    { from: 0, to: 240, family: 'sleep', label: 'sleep' },
    { from: 240, to: 270, family: 'food', label: 'suhoor', promptedBy: 'you' },
    { from: 270, to: 480, family: 'sleep', label: 'sleep' },
    { from: 480, to: 600, family: 'work', label: 'repair' },
    { from: 600, to: 615, family: 'worship', label: 'pray at home' },
    { from: 615, to: 890, family: 'sleep', label: 'sleep' },
    { from: 960, to: 975, family: 'worship', label: 'pray at home' },
    { from: 1126, to: 1156, family: 'food', label: 'iftar' },
    { from: 1180, to: 1200, family: 'phone', label: 'call Selin' },
    { from: 1240, to: 1400, family: 'social', label: 'tea with Rıza' },
  ],
};

export const sampleBetween: BetweenView = {
  closed: 'Ramadan 1 is over.',
  lines: [
    'He kept the fast.',
    'He prayed all five, four at home.',
    'He worked one block.',
    'Selin called him.',
  ],
  strip,
  ends,
  unasked,
  trust: { from: 0.5, to: 0.52, events: ['+0.02 the suhoor you suggested went well'] },
  next: { label: 'Ramadan 2', day: 2, skipped: 0 },
  choices: [],
};

export const sampleBetweenSkip: BetweenView = {
  ...sampleBetween,
  closed: 'Ramadan 2 is over.',
  next: { label: 'Ramadan 15', day: 15, skipped: 12 },
  choices: [
    {
      id: 'work',
      label: 'work in the morning',
      cost: 'He’ll hear this at every decision for 12 days. If he doesn’t want it, it wears on him.',
    },
    {
      id: 'doctor',
      label: 'see the doctor',
      cost: 'He’ll hear this at every decision for 12 days. If he doesn’t want it, it wears on him.',
    },
    {
      id: 'selin',
      label: 'call Selin',
      cost: 'He’ll hear this at every decision for 12 days. If he doesn’t want it, it wears on him.',
    },
    {
      id: 'rent',
      label: 'pay Osman when you can',
      cost: 'He’ll hear this at every decision for 12 days. If he doesn’t want it, it wears on him.',
    },
    {
      id: 'mosque',
      label: 'pray at the mosque',
      cost: 'He’ll hear this at every decision for 12 days. If he doesn’t want it, it wears on him.',
    },
    {
      id: 'rest',
      label: 'rest in the afternoon',
      cost: 'He’ll hear this at every decision for 12 days. If he doesn’t want it, it wears on him.',
    },
  ],
};

export const sampleReport: ReportView = {
  eid: {
    strip: { ...strip, label: 'Eid al-Fitr' },
    lines: ['He ate breakfast at home.', 'He visited Nuran’s grave.', 'Selin called.'],
    summary: [
      'On Eid he called Selin himself, at 15:05.',
      'He went to the clinic twice this month, both times after you spoke.',
    ],
  },
  ledger: [
    {
      said: 'Call Selin (whispered through 26 days)',
      times: 26,
      eid: 'Once, first at 15:05, for the company.',
    },
    {
      said: 'See the doctor (said once on the days you spoke)',
      times: 1,
      eid: 'Not on Eid; the clinic still is something he dreads.',
    },
  ],
  own: ['He called Selin on his own.', 'He saw the doctor without being told.'],
  others: ['Osman still had to come about the rent.'],
  stopped: ['He stopped going to the mosque.'],
  trust: [
    { id: 'you', name: 'You', endRamadan: 'listens to you some', endWeek: 'listens to you some' },
    { id: 'selin', name: 'Selin', endRamadan: 'listens closely', endWeek: 'listens closely ↑' },
  ],
  ends: ends.map((e) =>
    e.id === 'rent'
      ? {
          ...e,
          status: '300 still owed at Eid',
          detail: 'Paid 300 on Ramadan 14; 300 still owed at Eid. He had 268.',
          after: 'In the week after Eid he paid the rest (300) on Shawwal 7; nothing owed now. He has 7.',
        }
      : e.id === 'doctor'
        ? {
            ...e,
            detail: `${e.detail} Cigarettes: 1 a day on Ramadan 1–2, none on Ramadan 29–30. He walked by the river 12 times in Ramadan, each time on your word.`,
            after: 'Not seen in the week after Eid. On Eid he smoked 3 cigarettes and walked by the river.',
          }
        : { ...e, after: 'Nothing changed in the week after Eid.' },
  ),
  unasked: unasked.map((u) => (u.label === 'call Selin' ? { label: u.label, state: 'yes' as const } : u)),
  body: ['Blood pressure: moderately high.', 'Sleep: a little short.', 'Fed: well.'],
  open: ['300 still owed to Osman.', 'No make-up fasts owed.'],
  rows: [strip, { ...strip, label: 'Ramadan 2' }, { ...strip, label: 'Eid al-Fitr' }],
  modelNotes: [...MODEL_NOTES],
};
