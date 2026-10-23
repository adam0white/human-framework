import { expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED, SCENARIO_VERSION } from './game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import type { ColonyRules } from './human-side.ts';
import { colonyHash, replayColony } from './playtest.ts';

function dawn(rules: ColonyRules) {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, rules);
  game.issue({ personId: 'yusuf', placeId: 'site' });
  game.advance(1);
  return game;
}

it('fresh orders carry more weight in HF and explain the temporary pull', () => {
  const old = dawn(6);
  const fresh = dawn(7);
  const weight = (g: ColonyGame) =>
    g
      .why('yusuf')
      ?.options.flatMap((o) => o.terms)
      .find((t) => t.source === 'suggestion:player')?.value;
  expect(weight(fresh)).toBeGreaterThan(weight(old) ?? Infinity);
  expect(fresh.why('yusuf')?.narration).toContain('first hour');
  expect(fresh.classicWorld).toEqual(old.classicWorld);
});

it('fresh orders still allow HF to refuse work against a held duty', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 7);
  game.issue({ personId: 'maryam', placeId: 'forest' });
  game.advance(1);
  expect(game.book.cards[0]?.human.state).toBe('willNot');
  expect((game.human as FrameworkHumanSide).person('maryam').activity?.action).not.toBe('gather-timber');
});

it('replays a fresh-order run and resumes an open order from its saved age', () => {
  const game = dawn(7);
  const restored = dawn(7);
  restored.human.restore(game.human.snapshot());
  game.advance(100);
  restored.advance(100);
  expect(colonyHash(restored)).toBe(colonyHash(game));
  expect(colonyHash(replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute, 7))).toBe(
    colonyHash(game),
  );
});

it('versions the new order rules', () => {
  expect(SCENARIO_VERSION).toBe('colony-scenario@8');
});

it('the fresh pull fades and is gone after an hour, including a resumed conditional order', () => {
  for (const age of [30, 60]) {
    const old = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 6);
    const current = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 7);
    for (const game of [old, current]) {
      game.humanWorld.resources.timber = 0;
      game.issue({ personId: 'yusuf', placeId: 'site' });
      for (let m = 0; m < age; m++) {
        game.humanWorld.resources.timber = 0;
        game.advance(1);
      }
    }
    current.human.restore(old.human.snapshot());
    for (const game of [old, current]) {
      game.humanWorld.resources.timber = 20;
      game.advance(1);
    }
    const weight = (game: ColonyGame) =>
      game
        .why('yusuf')
        ?.options.flatMap((o) => o.terms)
        .find((t) => t.source === 'suggestion:player')?.value;
    if (age === 30) {
      expect(weight(current)).toBeGreaterThan(weight(old) ?? Infinity);
      expect(weight(current)).toBeLessThan(0.38);
    } else {
      expect(current.human.snapshot()).toEqual(old.human.snapshot());
    }
  }
});
