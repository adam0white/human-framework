import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import * as legacy from '../../src/games/commons.js';
import { chooseCommand, applyCommand } from '../../src/games/commons-policy.js';
import * as story from '../../src/games/camp-story.js';
import * as slots from '../../web/camp-slots.js';

let old = legacy.createGame();
while (old.milestoneAt === null) old = applyCommand(old, chooseCommand(legacy.getGameView(old)));
function makeHistory(count) {
  let game = story.continueStory(story.migrateLegacyGame(legacy.exportGame(old)));
  while (game.record.commands.length < count) {
    const view = story.getGameView(game), n = game.record.commands.length;
    if (view.phase === 'ferry') game = story.dispatchFerry(game);
    else if (n % 10 === 9) game = story.advanceGame(game, 2);
    else game = story.requestProject(game, 'cache');
  }
  assert.equal(game.record.commands.length, count);
  return game;
}
function timing(fn) { const start = performance.now(); const value = fn(); return { value, milliseconds: performance.now() - start }; }
const records = [];
for (const commands of [100, 500]) {
  const game = makeHistory(commands);
  for (const count of [1, 5]) {
    let book = slots.createBook();
    for (let n = 1; n <= count; n++) book = slots.addStory(book, game, { id: `camp-${n}`, at: n });
    const initialRaw = slots.serializeBook(book), restore = timing(() => slots.restoreBook(initialRaw));
    const nextGame = story.advanceGame(game, 1), trials = [];
    for (let trial = 0; trial < 3; trial++) {
      const update = timing(() => slots.updateActive(book, nextGame, 1000));
      const serialize = timing(() => slots.serializeBook(update.value));
      assert.deepEqual(slots.getActiveGame(update.value), nextGame);
      assert.equal(serialize.value, slots.serializeBook(slots.restoreBook(serialize.value)));
      trials.push({ updateMs: update.milliseconds, serializeMs: serialize.milliseconds, totalMs: update.milliseconds + serialize.milliseconds,
        sha256: createHash('sha256').update(serialize.value).digest('hex'), bytes: Buffer.byteLength(serialize.value) });
    }
    records.push({ commands, slots: count, paidWindowMinutes: game.world.clock.now - game.window.enteredAt, phase: story.getGameView(game).phase,
      caches: game.world.caches, restoreMs: restore.milliseconds, trials });
    console.log(JSON.stringify(records.at(-1)));
  }
}
const paths = ['web/camp-slots.js', 'src/games/camp-story.js', 'src/games/camp.js', 'artifacts/camp-slots/performance.mjs'];
const output = process.argv[2]; if (!output) throw new Error('New output path required');
writeFileSync(output, JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version,
  sources: Object.fromEntries(paths.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  scope: 'Actual story saves with paid work and current jobs; repeated requests deliberately stress journal validation. These are synthetic reprioritization loads, not measured human command frequencies.',
  records }, null, 2) + '\n', { flag: 'wx' });
