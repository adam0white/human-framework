/** Private software fixtures. All legacy worlds are made through the unchanged public API. */
import assert from 'node:assert/strict';
import * as old from '../../games/commons.js';
import * as rain from '../../games/commons-next.js';
import { chooseCommand, applyCommand } from '../../games/commons-policy.js';
import { PRELUDE, applyLegacy, legacyCounterexample, roundedCapacityFixture } from '../../../scripts/continuous-work-fixture.js';

export function legacyEarned(policy = 'build-first') {
  let world = old.createGame();
  const commands = [];
  while (world.milestoneAt === null && commands.length < 500) {
    const command = chooseCommand(old.getGameView(world), policy);
    commands.push(command);
    world = applyCommand(world, command);
  }
  assert.notEqual(world.milestoneAt, null, 'Legacy controller hit 500-command bound');
  assert.deepEqual(commands.reduce(applyCommand, old.createGame()), world);
  return { policy, commands, world };
}

export function legacyBusy() {
  const commands = [...PRELUDE, ['advance', 1], ['start', 'gather-timber'], ['advance', 1]];
  return { commands, world: commands.reduce(applyLegacy, old.createGame()) };
}

export function legacySupply(caches = 4) {
  let world = old.createGame();
  const commands = [];
  while (world.caches < caches && commands.length < 1500) {
    const command = chooseCommand(old.getGameView(world), 'build-first');
    commands.push(command);
    world = applyCommand(world, command);
  }
  assert.equal(world.caches, caches, 'Legacy supply controller hit 1500-command bound');
  return { commands, world };
}

export function worldFacts(world) {
  return structuredClone({ now: world.clock.now, milestoneAt: world.milestoneAt, caches: world.caches,
    stock: world.stock, structures: world.structures, commitment: world.commitment, jobs: world.jobs,
    people: Object.fromEntries(Object.entries(world.people).map(([id, p]) => [id, {
      id: p.id, minutes: p.minutes, body: p.body, skills: p.skills, pending: p.pending
    }])), stats: world.stats, work: world.work ?? null, paid: world.paid ?? null });
}

export function oldControls() {
  const original = legacyCounterexample();
  let finish = old.advanceGame(original.fork.game, original.fork.game.jobs.neighbor.endsAt - original.fork.game.clock.now);
  finish = old.releaseProject(finish);
  const rounded = roundedCapacityFixture(), view = old.getGameView(rounded);
  let executionError = null;
  try { old.startJob(rounded, 'build-workbench'); } catch (error) { executionError = error.message; }
  const authored = rain.createGame();
  return {
    original: { ...original, continueAt: original.untouchedFinish.game.clock.now, restartAt: original.restartedFinish.game.clock.now,
      finishThenReleaseAt: finish.clock.now, finishThenRelease: old.exportGame(finish) },
    rounded: { snapshot: old.exportGame(rounded), advertisedAvailable: !view.choices.find(c => c.id === 'build-workbench').unavailable,
      actualBody: rounded.people.player.body, visibleBody: view.people.player.body, executionError },
    authoredRain: { snapshot: rain.exportGame(authored), facts: worldFacts(authored.world) }
  };
}
