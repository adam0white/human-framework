/** Current-scenario controls for the wording, order cards and explanations. */

import { describe, expect, it } from 'vitest';
import { hindsightLine } from '../ui/end-report.ts';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import type { SuggestionResolution } from './hf4.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import { sayLine, trustOf, whyOf } from './human-view.ts';
import { passesByItself } from './playback.ts';
import { at } from './world-types.ts';

const modified = {
  voiceId: 'player',
  verdict: 'modified',
  reason: 'goal:role',
  says: "Not that — I'll draw water.",
  counterOffer: { affordanceId: 'a1', label: 'draw water' },
} as unknown as SuggestionResolution;

describe('current Well wording and order controls', () => {
  it('a different choice names its reason', () => {
    expect(sayLine(modified, 9)).toBe('I will draw water instead, because that is my work.');
    expect(sayLine({ ...modified, reason: 'goal:role:1' }, 9)).toBe(
      'I will draw water instead, because that is my work.',
    );
    expect(sayLine({ ...modified, reason: 'habit' } as SuggestionResolution, 9)).toBe(modified.says);
  });

  it('a new order to the same person settles the old card as replaced', () => {
    const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    game.issue({ personId: 'yusuf', placeId: 'site' });
    game.issue({ personId: 'yusuf', placeId: 'forest' });
    game.issue({ personId: 'tariq', placeId: 'forest' });
    game.advance(2);
    const [a, b, c] = game.book.cards;
    expect(b?.status).toBe('active');
    expect(c?.status).toBe('active');
    expect(a?.status).toBe('replaced');
    expect(a?.replacedBy).toBe(b?.order.id);
  });

  it('a bodily or prayer "not now" passes by itself; a "not now" for other work and a "will not" still pause', () => {
    expect(passesByItself({ kind: 'notNow', reason: 'need:water' })).toBe(true);
    expect(passesByItself({ kind: 'notNow', reason: 'commitment:salah-fajr' })).toBe(true);
    expect(passesByItself({ kind: 'notNow', reason: 'norm:salah' })).toBe(true);
    expect(passesByItself({ kind: 'notNow', reason: 'goal:role' })).toBe(false);
    expect(passesByItself({ kind: 'willNot', reason: 'need:safety' })).toBe(false);
  });

  it('the hindsight line says the plan re-orders, as the policy does (a single dawn order does not reproduce it)', () => {
    const line = hindsightLine({
      from: 0,
      builders: ['yusuf', 'tariq'],
      cook: true,
      roofAt: at(2, 12, 3),
      stock: 13,
      wins: true,
    });
    expect(line).toMatch(
      /Yusuf and Tariq received new orders to work at the house with Rush whenever their orders ended/,
    );
    expect(line).toMatch(/One order at dawn is not enough/);
  });

  it('explains keeping current work when a rival scores higher in a review', () => {
    const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    game.advance(2);
    const person = (game.human as FrameworkHumanSide).person('yusuf');
    const original = person.trace.find((r) => r.considered.length > 0);
    if (!original) throw new Error('Missing current decision');
    const chosen = structuredClone(original.considered[0]);
    if (!chosen) throw new Error('Missing option');
    chosen.utility = 0.3;
    delete chosen.vetoed;
    const rival = { ...structuredClone(chosen), affordanceId: 'test-rival', utility: 0.4 };
    const review = {
      ...structuredClone(original),
      review: true,
      chosenAffordanceId: chosen.affordanceId,
      considered: [chosen, rival],
    };
    expect(whyOf(person, review, trustOf(person), 9).narration).toMatch(/keep doing this/);
  });
});
