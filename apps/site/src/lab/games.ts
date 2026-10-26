import { GAMES, type Game } from '../games.ts';

/** The lab reads the site's ranking and status; it never maintains another list. */
export const LAB_GAMES: Pick<Game, 'id' | 'name' | 'href' | 'rank' | 'status'>[] = GAMES.map(
  ({ id, name, href, rank, status }) => ({ id, name, href, rank, status }),
);

/** Reviewed event identifiers. Exact matches only: input text never becomes a public label. */
const numbered = (count: number, render: (n: number) => string): string[] =>
  Array.from({ length: count }, (_, i) => render(i + 1));
export const EVENT_LABELS: Readonly<Record<string, { scr: readonly string[]; ms: readonly string[] }>> = {
  smoke: { scr: ['stairwell', 'outcome', 'replay'], ms: [] },
  rope: {
    scr: [
      'title',
      'season',
      ...['hollin', 'tooth', 'kestrel'].flatMap((id, i) =>
        ['hut', 'climb', 'debrief'].map((phase) => `climb ${i + 1} ${id}: ${phase}`),
      ),
    ],
    ms: [
      'season done',
      ...numbered(3, (n) => `climb ${n} done`),
      ...numbered(3, (n) => `climb ${n} summit`),
      ...numbered(3, (n) => `climb ${n} all home`),
    ],
  },
  pass: {
    scr: [
      'title',
      'sunday',
      'ending',
      ...numbered(6, (n) => `night ${n}: service`),
      ...numbered(6, (n) => `night ${n}: evening`),
    ],
    ms: [
      'ending reached',
      ...numbered(6, (n) => `service ${n} done`),
      ...numbered(52, (n) => `week ${n} done`),
    ],
  },
  glance: {
    scr: [
      'title',
      'ending',
      ...numbered(7, (n) => `night ${n}: watch`),
      ...numbered(7, (n) => `night ${n}: dawn`),
    ],
    ms: ['ending reached', ...numbered(7, (n) => `night ${n} done`)],
  },
  hearsay: {
    scr: ['title', 'play', 'review', 'notebook'],
    ms: [
      'run started',
      'first word told',
      'first refusal heard',
      'a rumour reached you',
      'the engagement settled',
      'fortnight ended',
    ],
  },
  goodhands: {
    scr: ['title', 'office', 'city', 'scene', 'review', 'menu'],
    ms: [
      'run started',
      'first interview',
      'first placement',
      'first trial verdict',
      'first confidence',
      'week 1 done',
      'week 2 done',
      'week 3 done',
      'month ended',
    ],
  },
  warren: {
    scr: ['title', 'play', 'raid', 'notebook'],
    ms: [
      'run started',
      'a family arrived',
      'riders came and went',
      'a death',
      ...['chalk', 'first', 'store', 'lamp', 'raid', 'door', 'beds', 'water', 'grow', 'deep', 'year'].map(
        (id) => `goal ${id}`,
      ),
    ],
  },
  murmur: {
    scr: [
      'title',
      'ending',
      'back page',
      ...numbered(7, (n) => `day ${n}`),
      ...numbered(7, (n) => `day ${n}: evening`),
    ],
    ms: ['ending reached', ...numbered(7, (n) => `day ${n} done`)],
  },
};
const basic = { scr: ['title', 'play', 'ending'], ms: ['run started', 'ending reached'] };
export function declaredLabel(game: string, kind: string, value: unknown): string | undefined {
  if (typeof value !== 'string' || (kind !== 'scr' && kind !== 'ms')) return undefined;
  const names = EVENT_LABELS[game] ?? basic;
  return names[kind].includes(value) ? value : undefined;
}
