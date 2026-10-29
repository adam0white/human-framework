/** HF3 policy win margins are not HF4 calibration. Pin policy inputs and Classic isolation;
 * the full current human control is in hf4-control.test.ts. */
import { describe, expect, it } from 'vitest';
import { requireValue } from '../../shared/require-value.ts';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { GOOD2, PATTERNS, standing } from './policies.ts';
import { at } from './world-types.ts';

describe('current player policies', () => {
  it('keeps the cook at her role until the preparation window and gives builders rushed offers', () => {
    expect(GOOD2(at(2, 12))).not.toHaveProperty('maryam');
    expect(GOOD2(at(2, 13))).toHaveProperty('maryam', 'kitchen');
    expect(GOOD2(at(2, 18))).not.toHaveProperty('maryam');
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    PATTERNS.good2rush()(g, 0);
    expect(g.book.cards.map((c) => c.order.personId)).toEqual([
      'yusuf',
      'tariq',
      'idris',
      'samira',
      'danyal',
    ]);
    expect(g.book.cards.every((c) => c.order.rush)).toBe(true);
    expect(g.log.filter((e) => e.kind === 'order')).toHaveLength(5);
  });

  it('does not flood an open request or reissue before the policy gap', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    const policy = standing(() => ({ yusuf: 'site' }), 75);
    policy(g, 0);
    policy(g, 1);
    expect(g.book.cards).toHaveLength(1);
    g.cancel(requireValue(g.book.cards[0]).order.id);
    policy(g, 74);
    expect(g.book.cards).toHaveLength(1);
    policy(g, 75);
    expect(g.book.cards).toHaveLength(2);
  });

  it('keeps Classic deterministic while Human uses the current actor engine', () => {
    const a = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    const b = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    for (const g of [a, b]) {
      g.issue({ personId: 'yusuf', placeId: 'site', rush: true });
      g.advance(40);
    }
    expect(a.classicWorld).toEqual(b.classicWorld);
    expect(a.classic.units).toEqual(b.classic.units);
    expect(a.minute).toBe(40);
  });
});
