import test from 'node:test';
import assert from 'node:assert/strict';
import * as commons from '../src/games/commons.js';
import { makeLegacyFixture, legacyCounterexample, roundedCapacityFixture } from '../scripts/continuous-work-fixture.js';

test('retained original failure: restarting the garden after workbench completion wins five minutes', () => {
  const result = legacyCounterexample(), before = result.before.game, fork = result.fork.game;
  assert.equal(before.clock.now, 187);
  assert.equal(before.jobs.player.endsAt, 188);
  assert.equal(before.jobs.neighbor.startedAt, 187);
  assert.equal(fork.jobs.neighbor.endsAt, 207);
  assert.equal(result.restarted.game.jobs.neighbor.endsAt, 202);
  assert.deepEqual(result.restarted.game.people.neighbor.body, fork.people.neighbor.body);
  assert.deepEqual(result.restarted.game.people.neighbor.skills, fork.people.neighbor.skills);
  assert.deepEqual(result.restarted.game.stock, fork.stock);
  assert.equal(fork.people.neighbor.pending.elapsedMinutes, 1);
  assert.equal(result.restarted.game.people.neighbor.pending.action.effort, .2);
  assert.equal(result.untouchedFinish.game.structures.garden, 1);
  assert.equal(result.restartedFinish.game.structures.garden, 1);
});

test('retained original behavior: idle increases fatigue while paid rest reduces it', () => {
  const initial = commons.createGame({ solo: true });
  const idle = commons.advanceGame(initial, 6);
  const rest = commons.advanceGame(commons.startJob(initial, 'rest'), 6);
  assert.ok(Math.abs(idle.people.player.body.fatigue - .209) < 1e-12);
  assert.ok(Math.abs(rest.people.player.body.fatigue - .059) < 1e-12);
  assert.deepEqual(idle.people.player.skills, rest.people.player.skills);
  assert.equal(idle.people.player.body.hunger, rest.people.player.body.hunger);
  assert.throws(() => commons.advanceToNextEvent(initial), /Choose a job/);
});

test('retained original behavior: releasing assembly returns materials and preserves only worker exposure', () => {
  let game = commons.advanceGame(makeLegacyFixture(), 1);
  const body = structuredClone(game.people.neighbor.body), skills = structuredClone(game.people.neighbor.skills);
  game = commons.releaseProject(game);
  assert.equal(game.structures.garden, 0);
  assert.equal(game.jobs.neighbor, null);
  assert.equal(game.stock.timber, 7);
  assert.equal(game.stock.salvage, 3);
  assert.deepEqual(game.people.neighbor.body, body);
  assert.deepEqual(game.people.neighbor.skills, skills);
});

test('retained independently reported failure: rounded capacity offers work that actual execution rejects', () => {
  const game = roundedCapacityFixture(), view = commons.getGameView(game);
  assert.equal(view.now, 120);
  assert.equal(view.people.player.body.fatigue, .75);
  assert.ok(Math.abs(game.people.player.body.fatigue - .77) < 1e-12);
  assert.equal(view.choices.find(c => c.id === 'build-workbench').unavailable, null);
  assert.throws(() => commons.startJob(game, 'build-workbench'), /Too much fatigue/);
});

test('finish-current-then-release ends the project while retaining the neighbor self-chosen recovery', () => {
  const fork = commons.advanceGame(makeLegacyFixture(), 1);
  let state = commons.advanceGame(fork, 19);
  state = commons.releaseProject(state);
  assert.equal(state.clock.now, 207);
  assert.equal(state.structures.garden, 1);
  assert.equal(state.commitment.status, 'released');
  assert.equal(state.jobs.neighbor.id, 'rest');
  assert.equal(state.people.neighbor.pending.elapsedMinutes, 0);
});
