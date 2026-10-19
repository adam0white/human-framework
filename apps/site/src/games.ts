/**
 * The one list of Human Framework games. The homepage and /games/ both read it.
 * To add a game, append one object. Fields:
 *   id        short key; also picks a sketch in shared/sketches.tsx (an open notebook if none)
 *   name      title as shown
 *   href      a path on this site ('/watch/') or a full URL; full URLs are marked as another site
 *   line      one-line pitch
 *   faculties HF faculties it shows, named as in FACULTIES below
 */
export type Game = { id: string; name: string; href: string; line: string; faculties: string[] };

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
  ['A whole life', 'birth, upbringing, aging, natural death'],
];

export const GAMES: Game[] = [
  {
    id: 'well',
    name: 'Twice at the Well',
    href: '/colony/',
    line: 'One village, two days, played twice: once with units that obey, once with people who decide.',
    faculties: ['Will', 'Needs and feelings', 'Conscience'],
  },
  {
    id: 'voice',
    name: 'The Day You Say Nothing',
    href: '/voice/',
    line: 'You are a voice in Halil’s head during his first Ramadan as a widower. He hears you, then decides.',
    faculties: ['Habits and character', 'Inner life', 'Relationships'],
  },
  {
    id: 'watch',
    name: 'The Night Watch',
    href: '/watch/',
    line: 'Keep the watch of a walled village, winter after winter, across generations.',
    faculties: ['A whole life', 'Relationships', 'Memory and belief'],
  },
  {
    id: 'repair',
    name: 'Small Works',
    href: 'https://repair.adamwhite.work',
    line: 'A repair workshop where neighbours watch, learn, and agree to help or not.',
    faculties: ['Habits and character', 'Memory and belief', 'Will'],
  },
  {
    id: 'neighbours',
    name: 'Neighbours',
    href: 'https://neighbours.adamwhite.work',
    line: 'A town of 208 HF people. Change one thing and compare two futures.',
    faculties: ['Relationships', 'Memory and belief', 'Needs and feelings'],
  },
  {
    id: 'rope',
    name: 'The Rope',
    href: 'https://rope.adamwhite.work',
    line: 'A climb where the body has to last the descent.',
    faculties: ['Body', 'Forecast', 'Will'],
  },
  {
    id: 'pass',
    name: 'The Pass',
    href: 'https://pass.adamwhite.work',
    line: 'Six nights running a small kitchen with three cooks who can say no.',
    faculties: ['Will', 'Memory and belief', 'Relationships'],
  },
  {
    id: 'glance',
    name: 'The Glance',
    href: 'https://glance.adamwhite.work',
    line: 'A storm week on the night desk of a dam, where every gauge is read by a tired keeper.',
    faculties: ['Body', 'Forecast', 'Relationships'],
  },
  {
    id: 'murmur',
    name: 'The Two Voices',
    href: 'https://murmur.adamwhite.work',
    line: 'One ordinary week as the voice in Dilan’s head, against the other one. Every evening she looks back.',
    faculties: ['Inner life', 'Will', 'Forecast'],
  },
  {
    id: 'valley',
    name: 'The Valley',
    href: 'https://valley.adamwhite.work',
    line: 'First furrow, an early build being played in now: three years keeping an absent agha’s seal over two hamlets of named households who remember what you did.',
    faculties: ['Will', 'Memory and belief', 'A whole life'],
  },
  {
    id: 'stairwell',
    name: 'The Stairwell',
    href: 'https://stairwell.adamwhite.work',
    line: 'A week as the new kapıcı of a seven-flat block in Istanbul: bread, bins, stairs, and everything the residents tell you, which you may pass on.',
    faculties: ['Memory and belief', 'Relationships', 'Conscience'],
  },
];

export const isExternal = (g: Game): boolean => /^https?:\/\//.test(g.href);
