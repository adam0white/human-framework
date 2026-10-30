/** One actual HF4 counterfactual branch. The former HF3 'good policy always wins'
 * calibration is retired; a negative counterfactual remains a valid result. */
import { writeFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { stableStringify } from '../../shared/playtest.ts';
import { requireValue } from '../../shared/require-value.ts';
import { ColonyGame, type LogEntry } from './game.ts';
import { branch, HINDSIGHT_BRANCHES } from './hindsight.ts';
import { createFrameworkHumanSide } from './human.ts';
import { colonyState } from './playtest.ts';
import { at, END_MINUTE } from './world-types.ts';

it('replays the seeded prefix, keeps village configuration and hands later decisions to the policy', () => {
  const seed = 812;
  const village: LogEntry = {
    minute: 0,
    kind: 'village',
    village: 'early-warning',
    preparationAt: at(2, 12),
  };
  const order: LogEntry = { minute: 0, kind: 'order', input: { personId: 'maryam', placeId: 'kitchen' } };
  const cancel: LogEntry = { minute: 0, kind: 'cancel', orderId: 'o1' };
  const log: LogEntry[] = [
    village,
    order,
    cancel,
    { minute: 0, kind: 'continue' },
    { minute: 1, kind: 'order', input: { personId: 'danyal', placeId: 'forest' } },
  ];
  const original = structuredClone(log);
  // This spy records the real replay and its real game; it replaces no HF decisions.
  const replay = vi.spyOn(ColonyGame, 'replay');
  try {
    const result = branch(seed, createFrameworkHumanSide, log, 1);
    expect(replay).toHaveBeenCalledExactlyOnceWith(
      seed,
      createFrameworkHumanSide,
      [village, order, cancel],
      1,
    );
    const game = requireValue(replay.mock.results[0]).value as ColonyGame;
    expect(game.seed).toBe(seed);
    expect(game.village).toBe('early-warning');
    expect(game.minute).toBe(END_MINUTE);
    expect(game.book.cards[0]?.status).toBe('cancelled');
    expect(game.log.some((e) => e.kind === 'continue')).toBe(false);
    expect(game.log.some((e) => e.kind === 'order' && e.input.placeId === 'forest')).toBe(false);
    const policyCards = game.book.cards.slice(1);
    expect(policyCards.some((c) => c.order.placeId === 'site')).toBe(true);
    expect(policyCards.every((c) => c.order.rush)).toBe(true);
    expect(result.builders).toEqual(['yusuf', 'tariq', 'idris', 'samira', 'danyal']);
    expect(result.cook).toBe(
      policyCards.some((c) => c.order.personId === 'maryam' && c.order.placeId === 'kitchen'),
    );
    expect(result.from).toBe(1);
    expect(result.wins).toBe(game.goals(2).every((g) => g.human.status === 'met'));
    expect(result.roofAt).toBe(game.deadlineOf('human').roofAt);
    expect(result.stock).toBe(game.deadlineOf('human').stockAtStorm ?? 0);
    expect(log).toEqual(original);
    expect(HINDSIGHT_BRANCHES).toEqual([at(2, 9), at(2, 5), at(1, 12), 0]);
    if (process.env.WELL_HINDSIGHT_EXPORT)
      writeFileSync(process.env.WELL_HINDSIGHT_EXPORT, stableStringify({ result, state: colonyState(game) }));
  } finally {
    replay.mockRestore();
  }
});
