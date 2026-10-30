import { expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { colonyHash, colonyState, replayColony } from './playtest.ts';

it('keeps completion facts on the person and log without changing replay state', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 9);
  game.issue({ personId: 'yusuf', placeId: 'site' });
  const phases = new Set<string>();
  while (game.minute < 300) {
    game.advance(1);
    const facts = game.frame({ buildingDetails: true, personId: 'yusuf' }).humanWorld.construction;
    for (const work of facts?.active ?? [])
      if (work.personId === 'yusuf' && work.phase) phases.add(work.phase);
  }
  expect(phases).toContain('travelling');
  expect(phases).toContain('working');
  const card = game.frame().cards[0];
  expect(card?.human.outcome).toMatch(/I did more building work.*House/);
  expect(card?.classic.outcome).toMatch(/House/);
  expect(game.book.cards[0]?.human).not.toHaveProperty('outcome');
  const replay = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute, 9);
  expect(replay.frame().cards).toEqual(game.frame().cards);
  expect(colonyHash(replay)).toBe(colonyHash(game));
  expect(Object.keys(colonyState(game))).not.toContain('receipts');
});

it('keeps a Home shelter request open and replays its current state', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 9);
  game.issue({ personId: 'idris', placeId: 'home-idris' });
  game.advance(180);
  const card = game.frame().cards[0];
  expect(card?.order.action).toBe('shelter');
  expect(card?.status).toBe('active');
  expect(card?.human.outcome).toBeUndefined();
  const loaded = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute, 9);
  expect(loaded.frame().cards).toEqual(game.frame().cards);
});

it('names store-room progress when building work completes', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 9);
  game.humanWorld.house.stage = 10;
  game.humanWorld.storeroom = 0;
  game.humanWorld.resources.timber = 100;
  game.issue({ personId: 'yusuf', placeId: 'site', insist: true });
  game.advance(300);
  expect(game.frame().cards[0]?.human.outcome).toContain('Store-room');
  expect(game.frame().cards[0]?.human.outcome).not.toContain('House 10');
});

it('keeps an actual construction interruption with its earlier request after a replacement and full replay', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  const order = game.issue({ personId: 'yusuf', placeId: 'site' });
  if (!order) throw new Error('No issued construction request');
  while (
    game.minute < 120 &&
    !game.frame({ buildingDetails: true }).humanWorld.construction?.active.some((a) => a.personId === 'yusuf')
  )
    game.advance(1);
  expect(
    game.frame({ buildingDetails: true }).humanWorld.construction?.active.some((a) => a.personId === 'yusuf'),
  ).toBe(true);
  const replacement = game.issue({ personId: 'yusuf', placeId: 'home-yusuf' });
  game.advance(1);
  const prior = game.frame().cards.find((c) => c.order.id === order.id);
  expect(prior?.status).toBe('replaced');
  expect(prior?.human.workEvents?.some((e) => e.kind === 'interrupted' && e.action === 'build')).toBe(true);
  expect(game.frame().cards.find((c) => c.order.id === replacement?.id)?.human.workEvents).toBeUndefined();
  const again = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute);
  expect(again.frame().cards).toEqual(game.frame().cards);
  expect(colonyHash(again)).toBe(colonyHash(game));
}, 30_000);

it('retains the observation time of an actual matched appeal answer outside saved state', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  const order = game.issue({ personId: 'yusuf', placeId: 'site', appeal: 'safety' });
  if (!order) throw new Error('No issued request');
  game.advance(1);
  const card = game.frame().cards.find((c) => c.order.id === order.id);
  expect(card?.order.appeal).toBe('safety');
  expect(card?.human.state).not.toBe('pending');
  expect(card?.human.answerObservedAt).toBe(game.minute);
  expect(game.book.card(order.id)?.human).not.toHaveProperty('answerObservedAt');
  const replay = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute);
  expect(replay.frame().cards).toEqual(game.frame().cards);
  expect(colonyHash(replay)).toBe(colonyHash(game));
});
