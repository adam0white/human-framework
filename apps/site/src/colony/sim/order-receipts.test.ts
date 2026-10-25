import { expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { colonyHash, colonyState, replayColony } from './playtest.ts';

it('keeps completion facts on the person and log without changing replay state', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 5);
  game.issue({ personId: 'yusuf', placeId: 'site' });
  game.advance(300);
  const card = game.frame().cards[0];
  expect(card?.human.outcome).toMatch(/I did more building work.*House/);
  expect(card?.classic.outcome).toMatch(/House/);
  expect(game.book.cards[0]?.human).not.toHaveProperty('outcome');
  const replay = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute, 5);
  expect(replay.frame().cards).toEqual(game.frame().cards);
  expect(colonyHash(replay)).toBe(colonyHash(game));
  expect(Object.keys(colonyState(game))).not.toContain('receipts');
});

it('says Home means one meal or one sleep and reports the next activity honestly', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 5);
  game.issue({ personId: 'idris', placeId: 'home-idris' });
  game.advance(180);
  const card = game.frame().cards[0];
  expect(card?.human.outcome).toMatch(/I ate raw grain/);
  expect(card?.human.outcome).toContain('After Home ended, chose:');
  const after = card?.human.outcome?.split('. Now:')[0];
  game.advance(200);
  expect(game.frame().cards[0]?.human.outcome).toContain(after);
  expect(card?.human.outcome).toContain('Now:');
  const loaded = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute, 5);
  expect(loaded.frame().cards).toEqual(game.frame().cards);
});

it('names store-room progress when a Day-3 building order completes', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 5);
  game.advance(2880);
  game.continueDay();
  game.humanWorld.house.stage = 10;
  game.humanWorld.storeroom = 0;
  game.humanWorld.resources.timber = 100;
  game.issue({ personId: 'yusuf', placeId: 'site' });
  game.advance(360);
  expect(game.frame().cards[0]?.human.outcome).toContain('Store-room');
  expect(game.frame().cards[0]?.human.outcome).not.toContain('House 10');
});
