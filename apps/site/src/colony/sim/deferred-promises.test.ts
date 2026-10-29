/** Current HF4 resolves unavailable advice itself. Home remains a standing request;
 * bodily/prayer completion wakes the actual actor without a host-selected action. */
import { describe, expect, it } from 'vitest';
import { requireValue } from '../../shared/require-value.ts';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import { colonyHash, replayColony } from './playtest.ts';

function waiting(): ColonyGame {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  g.issue({ personId: 'idris', placeId: 'home-idris' });
  g.advance(1);
  expect(g.book.cards[0]?.human.state).toBe('notNow');
  expect(g.human.working('o1')).toBe(true);
  return g;
}

describe('current standing requests', () => {
  it('reports HF’s unavailable verdict rather than inventing a conditional promise', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    g.humanWorld.resources.timber = 0;
    g.issue({ personId: 'idris', placeId: 'site' });
    g.advance(1);
    expect(g.book.cards[0]?.human.state).toBe('cannot');
    expect(g.book.cards[0]?.human.settled).toBe(true);
    expect(g.human.working('o1')).toBe(false);
    g.humanWorld.resources.timber = 20;
    g.advance(1);
    expect(g.book.cards[0]?.human.state).toBe('cannot');
    expect(g.human.working('o1')).toBe(false);
  });

  it('keeps a Home request through its initial prayer deferral and the completion wake', () => {
    const g = waiting();
    const side = g.human as FrameworkHumanSide;
    const first = requireValue(side.person('idris').trace.at(-1));
    expect(first.suggestion?.verdict).toBe('deferred');
    expect(first.suggestion?.reason).toBe('commitment:salah-fajr');
    expect(side.person('idris').activity?.action).toBe('pray');
    g.advance(35);
    expect(side.person('idris').trace.some((r) => r.at > first.at)).toBe(true);
    expect(side.person('idris').activity?.action).not.toBe('pray');
    expect(g.human.working('o1')).toBe(true);
    expect(g.book.cards[0]?.status).toBe('active');
  });

  it('cancel and replacement withdraw the standing Home request', () => {
    for (const end of ['cancel', 'replace'] as const) {
      const g = waiting();
      const card = requireValue(g.book.cards[0]);
      if (end === 'cancel') g.cancel(card.order.id);
      else g.issue({ personId: 'idris', placeId: 'forest' });
      g.advance(1);
      expect(card.status).toBe(end === 'cancel' ? 'cancelled' : 'replaced');
      expect(g.human.working(card.order.id)).toBe(false);
      const saved = (g.human as FrameworkHumanSide).snapshot() as {
        host: { shelterUntil?: Record<string, number> };
      };
      expect(saved.host.shelterUntil?.idris).toBeUndefined();
    }
  });

  it('cold-restores the deferred request and gives the same next native state', () => {
    const g = waiting();
    // The Human adapter restores its own state; the game owns the world and order book.
    const saved = JSON.parse(JSON.stringify(g.human.snapshot()));
    // Replaying installs the same world reference into a separately constructed adapter.
    const replay = replayColony(g.seed, createFrameworkHumanSide, g.log, g.minute);
    replay.human.restore(saved);
    expect(replay.human.snapshot()).toEqual(saved);
    expect(replay.human.working('o1')).toBe(true);
    g.advance(35);
    replay.advance(35);
    expect(colonyHash(replay)).toBe(colonyHash(g));
    expect(replay.human.snapshot()).toEqual(g.human.snapshot());
    const nativeHash = (game: ColonyGame) =>
      (game.human.snapshot() as { community: { run: { hashes: { full: string } } } }).community.run.hashes
        .full;
    expect(nativeHash(replay)).toBe(nativeHash(g));
  });
});
