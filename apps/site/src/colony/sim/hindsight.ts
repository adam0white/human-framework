/**
 * Hindsight for the Day-2 end screen ("what would have won"). Replays the player's own run up to a branch minute,
 * then hands it to the simple good-order policy from the balance tests (`GOOD2` with Rush: everyone but Maryam to
 * the house, Maryam to the kitchen D2 13:00–18:00) and plays to the Day-2 end. Branches are tried from the latest
 * to the earliest; the first that wins all three Human goals is reported. The last branch is dawn on Day 1 with no
 * player orders, which is the `good2rush` pattern the balance test pins as a win on the shipped seed.
 *
 * Covers: the Day-2 goals, one policy, four branch minutes. Does not cover: Day 3, other policies, or a search for
 * the smallest change that would have won. Deterministic: a fresh game per branch from the seed and the log.
 */
import { ColonyGame, type LogEntry } from './game.ts';
import type { HumanSideFactory } from './human-side.ts';
import { GOOD2, standing } from './policies.ts';
import { at, END_MINUTE, type Minute, type VillagerId } from './world-types.ts';

/** Branch minutes, latest first: D2 09:00 (the roof-hands cards), D2 05:00, D1 12:00, D1 05:00. */
export const HINDSIGHT_BRANCHES: readonly Minute[] = [at(2, 9, 0), at(2, 5, 0), at(1, 12, 0), 0];

export interface Hindsight {
  /** The minute the policy took over; the player's orders before it are kept. */
  from: Minute;
  /** People the policy ordered to the house (rushed), in roster order. */
  builders: VillagerId[];
  /** Whether the policy also sent Maryam to the kitchen on Day 2. */
  cook: boolean;
  /** First minute the Human house was roofed, or null. */
  roofAt: Minute | null;
  /** Human meals in store at D2 19:00. */
  stock: number;
  /** All three Human goals met. */
  wins: boolean;
}

const ROSTER: VillagerId[] = ['maryam', 'yusuf', 'tariq', 'idris', 'samira', 'danyal'];

/** One branch: the player's log before `from`, then the policy to the Day-2 end. */
export function branch(
  seed: number,
  factory: HumanSideFactory,
  log: readonly LogEntry[],
  from: Minute,
): Hindsight {
  const before = log.filter((e) => e.minute < from && e.kind !== 'continue');
  const g = ColonyGame.replay(seed, factory, before, from);
  const issuedBefore = g.book.cards.length;
  const policy = standing(GOOD2, 75, { rush: true });
  for (let m = g.minute; m < END_MINUTE && !g.ended; m++) {
    policy(g, m);
    g.advance(1);
  }
  const mine = g.book.cards.slice(issuedBefore);
  const builders = ROSTER.filter((id) =>
    mine.some((c) => c.order.personId === id && c.order.placeId === 'site'),
  );
  const d = g.deadlineOf('human');
  return {
    from,
    builders,
    cook: mine.some((c) => c.order.personId === 'maryam' && c.order.placeId === 'kitchen'),
    roofAt: d.roofAt,
    stock: d.stockAtStorm ?? 0,
    wins: g.goals(2).every((goal) => goal.human.status === 'met'),
  };
}

/** The latest branch that wins all three Human goals (null if none does). */
export function hindsight(
  seed: number,
  factory: HumanSideFactory,
  log: readonly LogEntry[],
): Hindsight | null {
  for (const from of HINDSIGHT_BRANCHES) {
    const h = branch(seed, factory, log, from);
    if (h.wins) return h;
  }
  return null;
}
