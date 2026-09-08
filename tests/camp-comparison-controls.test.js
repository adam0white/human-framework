import test from 'node:test';
import assert from 'node:assert/strict';
import * as old from '../src/games/commons.js';
import { legacyEarned, legacyBusy, legacySupply, worldFacts, oldControls } from '../src/experiments/camp-story/controls.js';

test('independent old controls retain distinct earned milestone states and exact replay', () => {
  const a = legacyEarned('build-first'), b = legacyEarned('stock-first');
  assert.equal(a.world.clock.now, 220);
  assert.equal(b.world.clock.now, 226);
  assert.equal(b.world.jobs.player.id, 'gather-timber');
  assert.equal(b.world.people.player.pending.elapsedMinutes, 4);
  assert.equal(b.world.jobs.neighbor.id, 'rest');
  assert.deepEqual(old.restoreGame(JSON.parse(JSON.stringify(old.exportGame(b.world)))), b.world);
});
test('registered busy legacy input is legal and retains two paid jobs', () => {
  const { world } = legacyBusy();
  assert.equal(world.clock.now, 189);
  assert.equal(world.jobs.player.id, 'gather-timber');
  assert.equal(world.people.player.pending.elapsedMinutes, 1);
  assert.equal(world.jobs.neighbor.id, 'build-garden');
  assert.equal(world.people.neighbor.pending.elapsedMinutes, 2);
});
test('a synthetic legal surplus is retained separately from player data', () => {
  const { world } = legacySupply(4);
  assert.equal(world.caches, 4);
  assert.ok(world.clock.now > world.milestoneAt);
  assert.deepEqual(old.restoreGame(old.exportGame(world)), world);
});
test('old negative and simpler controls remain executable', () => {
  const controls = oldControls();
  assert.equal(controls.original.continueAt, 207);
  assert.equal(controls.original.restartAt, 202);
  assert.equal(controls.original.finishThenReleaseAt, 207);
  assert.match(controls.rounded.executionError, /Too much fatigue/);
  assert.equal(controls.rounded.advertisedAvailable, true);
  assert.equal(worldFacts(controls.original.before.game).now, 187);
});
