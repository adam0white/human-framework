/**
 * Headless director for Game 1 tests and benchmarks: plays every nudge's order at its minute and logs each
 * card's settled answer.
 */
import { ColonyGame, DEFAULT_SEED, NUDGES } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { END_MINUTE } from './world-types.ts';

export interface CardLog {
  minute: number;
  nudge: string;
  personId: string;
  action: string;
  state: string;
  label: string;
}

/** The director's script: every nudge's order issued at its minute (Insist where the card highlights it). */
export function playDirector(seed = DEFAULT_SEED, lag = 0): { game: ColonyGame; cards: CardLog[] } {
  const game = new ColonyGame(seed, createFrameworkHumanSide);
  const byOrder = new Map<string, string>();
  const seen = new Set<string>();
  const cards: CardLog[] = [];
  for (let m = 0; m < END_MINUTE; m++) {
    for (const n of NUDGES) {
      if (n.minute + lag !== m) continue;
      const o = game.issue({ ...n.order, ...(n.prefill ?? {}) }, n.id);
      if (o) byOrder.set(o.id, n.id);
    }
    game.advance(1);
    for (const c of game.book.cards) {
      const key = `${c.order.id}:${c.human.state}:${c.human.label ?? ''}`;
      if (seen.has(key) || c.human.state === 'pending') continue;
      seen.add(key);
      cards.push({
        minute: m,
        nudge: byOrder.get(c.order.id) ?? '',
        personId: c.order.personId,
        action: c.order.action,
        state: c.human.state,
        label: c.human.label ?? '',
      });
    }
  }
  return { game, cards };
}
