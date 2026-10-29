/**
 * The one list of Human Framework games. The homepage, /games/ and lab dashboard read it.
 * Keep entries in rank order. Fields:
 *   id        short key; also picks a sketch in shared/sketches.tsx (an open notebook if none)
 *   rank      owner’s order, starting at 1
 *   status    active or frozen; frozen experiments stay playable
 *   name      title as shown
 *   href      a path on this site ('/watch/') or a full URL; full URLs are marked as another site
 *   line      one-line pitch
 *   faculties HF faculties it shows, named as in FACULTIES below
 */
export type Game = {
  id: string;
  rank: number;
  status: 'active' | 'frozen';
  name: string;
  href: string;
  line: string;
  faculties: string[];
  labNote?: string;
};

/** Names of the HF faculties, with one line each. Games cite these names. */
export const FACULTIES: [string, string][] = [
  ['Body', 'hunger, sleep, injury, illness, tiredness that builds over days'],
  ['Forecast', '“I can do it, but I’ll be spent for the descent”'],
  ['Needs and feelings', 'safety, belonging, rest, meaning, and moods'],
  ['Memory and belief', 'episodes that fade, beliefs with a source'],
  ['Habits and character', 'routines, skills, traits and values that change slowly'],
  ['Will', 'yes, not now, cannot, will not, each with a reason'],
  ['Conscience', 'a person’s own understanding of each norm'],
  ['Inner life', 'a nudge toward good or ill, and looking back on the day'],
  ['Relationships', 'trust, favours, gossip, marriage, grief'],
  ['Narration', 'clear accounts of what a person did and why, with reviewed wording that can vary'],
  [
    'Portable roles',
    'a person can enter another game with remembered experience; each game checks what it can carry over',
  ],
  ['A whole life', 'birth, upbringing, aging, natural death'],
];

export const GAMES: Game[] = [
  {
    id: 'murmur',
    rank: 1,
    status: 'active',
    name: 'The Two Voices',
    href: 'https://murmur.adamwhite.work',
    line: 'You spend a week as one of two voices in Dilan’s head. Each evening, she reflects on her choices.',
    faculties: ['Inner life', 'Will', 'Forecast'],
  },
  {
    id: 'stairwell',
    rank: 2,
    status: 'active',
    name: 'The Stairwell',
    href: 'https://stairwell.adamwhite.work',
    line: 'You are the building’s caretaker in a seven-flat Istanbul building. Deliver bread, empty bins and decide what to share about the residents.',
    faculties: ['Memory and belief', 'Relationships', 'Conscience'],
  },
  {
    id: 'pass',
    rank: 3,
    status: 'active',
    name: 'The Pass',
    href: 'https://pass.adamwhite.work',
    line: 'Run a small kitchen for four weeks. The people working with you can disagree with your instructions.',
    faculties: ['Will', 'Memory and belief', 'Relationships'],
  },
  {
    id: 'glance',
    rank: 4,
    status: 'active',
    name: 'The Glance',
    href: 'https://glance.adamwhite.work',
    line: 'You run the night desk at a dam during a stormy week. Your tired keepers read the gauges.',
    faculties: ['Body', 'Forecast', 'Relationships'],
  },
  {
    id: 'watch',
    rank: 5,
    status: 'active',
    name: 'The Night Watch',
    href: '/watch/',
    line: 'Guide the watch in a walled village through many winters. The people grow older and raise new generations.',
    faculties: ['A whole life', 'Relationships', 'Memory and belief'],
  },
  {
    id: 'hearsay',
    rank: 6,
    status: 'active',
    name: 'Hearsay',
    href: 'https://hearsay.adamwhite.work',
    line: 'You run a tea garden by a fountain for two weeks. The news you share can change as people repeat it.',
    faculties: ['Memory and belief', 'Relationships', 'Conscience'],
  },
  {
    id: 'goodhands',
    rank: 7,
    status: 'active',
    name: 'Good Hands',
    href: 'https://goodhands.adamwhite.work',
    line: 'You run a small placement agency in Izmir during November. Applicants may leave important things out in their interviews.',
    faculties: ['Memory and belief', 'Relationships', 'Habits and character'],
  },
  {
    id: 'valley',
    rank: 8,
    status: 'active',
    name: 'The Valley',
    href: 'https://valley.adamwhite.work',
    line: 'You keep an absent landlord’s seal while managing two hamlets for three years. Their households remember your decisions.',
    faculties: ['Will', 'Memory and belief', 'A whole life'],
  },
  {
    id: 'voice',
    rank: 9,
    status: 'active',
    name: 'The Day You Say Nothing',
    href: '/voice/',
    line: 'You are a voice in Halil’s head during his first Ramadan, the fasting month, as a widower. He hears your advice and decides what to do.',
    faculties: ['Habits and character', 'Inner life', 'Relationships'],
  },
  {
    id: 'well',
    rank: 10,
    status: 'active',
    name: 'Twice at the Well',
    href: '/colony/',
    line: 'You guide two versions of the same village for two days. One follows your orders. The other has people who decide for themselves.',
    faculties: ['Will', 'Needs and feelings', 'Conscience'],
  },
  {
    id: 'warren',
    rank: 11,
    status: 'active',
    name: 'The Warren',
    href: 'https://warren.adamwhite.work',
    line: 'A village builds a refuge in soft stone. You mark where to dig and ring the bell. The villagers decide when to work.',
    faculties: ['Will', 'Habits and character', 'Body'],
  },
  {
    id: 'repair',
    rank: 12,
    status: 'active',
    name: 'Small Works',
    href: 'https://repair.adamwhite.work',
    line: 'You run a repair workshop. Your neighbours can watch, learn and choose whether to help.',
    faculties: ['Habits and character', 'Memory and belief', 'Will'],
  },
  {
    id: 'neighbours',
    rank: 13,
    status: 'active',
    name: 'Neighbours',
    href: 'https://neighbours.adamwhite.work',
    line: 'Help a riverside town reopen its flooded community hall.',
    faculties: ['Relationships', 'Memory and belief', 'Needs and feelings'],
  },
  {
    id: 'rope',
    rank: 14,
    status: 'active',
    name: 'The Rope',
    href: 'https://rope.adamwhite.work',
    line: 'Lead five people up a mountain and back. Every one of them can say no.',
    faculties: ['Body', 'Forecast', 'Will'],
  },
  {
    id: 'commonstead',
    labNote: 'Owner acceptance pending.',
    rank: 15,
    status: 'active',
    name: 'Commonstead',
    href: 'https://commonstead.adamwhite.work',
    line: 'Eight people prepare a shared workshop before a storm. You help them arrange meals, guest cabins and supplies.',
    faculties: ['Body', 'Will', 'Memory and belief'],
  },
  {
    id: 'smoke',
    rank: 16,
    status: 'active',
    name: 'Smoke on the Stairs',
    href: 'https://smoke.adamwhite.work',
    line: 'Lead four neighbours down a smoke-filled stairwell. They can refuse you, find a route, or help each other.',
    faculties: ['Will', 'Relationships', 'Body'],
  },
  {
    id: 'word',
    labNote: 'Owner acceptance pending.',
    rank: 17,
    status: 'active',
    name: 'His Word',
    href: 'https://word.adamwhite.work',
    line: 'A tailor left conflicting promises. Ask what each person needs, then agree on work, storage and rent before time runs out.',
    faculties: ['Memory and belief', 'Relationships'],
  },
  {
    id: 'child',
    labNote: 'Owner acceptance pending.',
    rank: 18,
    status: 'active',
    name: 'What the Child Saw',
    href: 'https://child.adamwhite.work',
    line: 'Elif learns from the work she sees. Choose what to show her as she grows, then let her decide what to do alone.',
    faculties: ['A whole life', 'Memory and belief', 'Will'],
  },
  {
    id: 'days',
    labNote: 'Owner acceptance pending.',
    rank: 19,
    status: 'active',
    name: 'Three Days',
    href: 'https://days.adamwhite.work',
    line: 'A daughter has three days of leave, an uncertain account and a promised visit. Choose what to check, what to share and when to ask for help.',
    faculties: ['Relationships', 'Body', 'Memory and belief'],
  },
  {
    id: 'lefthand',
    labNote: 'Owner acceptance pending.',
    rank: 20,
    status: 'active',
    name: 'The Left Hand',
    href: 'https://lefthand.adamwhite.work',
    line: 'Carry help through a snowy village over three nights. Reach a family before dawn and decide what to say when a neighbour sees you.',
    faculties: ['Memory and belief', 'Relationships', 'Will'],
  },
];

export const isExternal = (g: Game): boolean => /^https?:\/\//.test(g.href);
