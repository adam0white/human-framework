import test from 'node:test';
import assert from 'node:assert/strict';
import * as story from '../src/games/camp-story.js';
import * as rain from '../src/games/commons-next.js';
import { restoreLocal } from '../src/experiments/camp-validator/local.js';

test('private local validator uses the actual story shape and kernel for valid snapshots', () => {
  for (const game of [story.createGame(), story.migrateLegacyRainGame(rain.exportGame(rain.createGame()))]) {
    assert.deepEqual(restoreLocal(story.exportGame(game)), game);
  }
});
test('local snapshot invariants reject obvious deadline, physical stock and raw tree corruption', () => {
  const save = story.exportGame(story.migrateLegacyRainGame(rain.exportGame(rain.createGame())));
  const deadline = structuredClone(save); deadline.game.window.ferryAt++;
  assert.throws(() => restoreLocal(deadline));
  const stock = structuredClone(save); stock.game.world.stock.food++;
  assert.throws(() => restoreLocal(stock));
  const getter = structuredClone(save); let reads = 0;
  Object.defineProperty(getter.game, 'returned', { get() { reads++; return false; }, enumerable: true });
  assert.throws(() => restoreLocal(getter)); assert.equal(reads, 0);
});
