import test from 'node:test';
import assert from 'node:assert/strict';
import * as commons from '../src/games/commons.js';
import { makeLegacyFixture } from '../scripts/continuous-work-fixture.js';
import { createContinuation, advanceContinuation, getContinuityView, stopWork, resumeWork, acceptHandover, startAssembly,
  advanceToNextEvent, beginMeal, stopMeal, exportContinuation, restoreContinuation } from '../src/experiments/continuous-work/host.js';

const fixture = () => commons.exportGame(makeLegacyFixture());

test('future workbench productivity completes the already-started garden by 202 without restarting', () => {
  const state = createContinuation(fixture(), { improvement: 'prospective', recovery: 'active-idle' });
  const result = getContinuityView(advanceContinuation(state, 15));
  assert.equal(result.now, 202);
  assert.equal(result.structures.workbench, 2);
  assert.equal(result.structures.garden, 1);
});

test('snapshot productivity control preserves the old 207 completion without automatic rest', () => {
  const state = createContinuation(fixture(), { improvement: 'snapshot', recovery: 'active-idle' });
  assert.equal(getContinuityView(advanceContinuation(state, 15)).structures.garden, 0);
  assert.equal(getContinuityView(advanceContinuation(state, 20)).structures.garden, 1);
});

test('migration and the improvement boundary preserve paid people, supplies and prior fractions', () => {
  const snapshot = fixture(), state = createContinuation(snapshot, { recovery: 'active-idle' });
  for (const actor of ['player', 'neighbor']) {
    assert.deepEqual(state.people[actor].body, snapshot.game.people[actor].body);
    assert.deepEqual(state.people[actor].skills, snapshot.game.people[actor].skills);
    assert.equal(state.people[actor].minutes, 187);
    assert.equal(state.people[actor].pending, null);
  }
  const next = advanceContinuation(state, 1), original = commons.advanceGame(snapshot.game, 1);
  assert.deepEqual(next.stock, original.stock);
  assert.ok(Math.abs(next.work['garden-0'].progress - .05) < 1e-12);
  assert.ok(Math.abs(next.people.neighbor.body.fatigue - original.people.neighbor.body.fatigue) < 1e-12);
  assert.deepEqual(next.people.neighbor.skills, original.people.neighbor.skills);
});

test('stopping retains installed work and materials; unassigned time gives no construction practice', () => {
  let state = advanceContinuation(createContinuation(fixture(), { recovery: 'active-idle' }), 4);
  const before = structuredClone(state), skill = state.people.neighbor.skills.construction;
  state = advanceContinuation(stopWork(state, 'neighbor'), 3);
  assert.equal(state.assignments.neighbor, null);
  assert.deepEqual(state.stock, before.stock);
  assert.deepEqual(state.work['garden-0'], before.work['garden-0']);
  assert.equal(state.people.neighbor.skills.construction, skill);
  assert.equal(state.paid.neighbor.work, 4);
});

test('same-minute stop/resume cannot refresh productivity or erase paid effort', () => {
  const fork = advanceContinuation(createContinuation(fixture(), { recovery: 'active-idle' }), 1);
  let restarted = fork;
  for (let i = 0; i < 4; i++) {
    restarted = stopWork(restarted, 'neighbor');
    assert.equal(restarted.assignments.neighbor, null);
    restarted = resumeWork(restarted, 'neighbor', 'garden-0');
  }
  const uninterrupted = advanceContinuation(fork, 14), resumed = advanceContinuation(restarted, 14);
  assert.deepEqual(resumed.people, uninterrupted.people);
  assert.deepEqual(resumed.work, uninterrupted.work);
  assert.deepEqual(resumed.stock, uninterrupted.stock);
  assert.equal(resumed.work['garden-0'].completedAt, 202);
  assert.ok(Math.abs(resumed.work['garden-0'].contributions.neighbor.effort - .2) < 1e-12);
});

test('accepted handover carries remaining physical work but never the previous actor practice or effort', () => {
  const fork = advanceContinuation(createContinuation(fixture(), { recovery: 'active-idle' }), 1);
  const prior = structuredClone(fork.people.neighbor), stock = structuredClone(fork.stock);
  let state = acceptHandover(fork, 'neighbor', 'player');
  assert.equal(state.assignments.neighbor, null);
  assert.equal(state.assignments.player, 'garden-0');
  state = advanceContinuation(state, 13);
  assert.equal(state.work['garden-0'].completedAt, 201);
  assert.deepEqual(state.stock, stock);
  assert.equal(state.people.neighbor.skills.construction, prior.skills.construction);
  assert.ok(Math.abs(state.work['garden-0'].contributions.neighbor.effort - .01) < 1e-12);
  assert.ok(Math.abs(state.work['garden-0'].contributions.player.effort - .19) < 1e-12);
  assert.equal(state.work['garden-0'].contributions.neighbor.minutes, 1);
  assert.equal(state.work['garden-0'].contributions.player.minutes, 13);
});

test('new assembly reserves material once and a second worker cannot start the same stage', () => {
  let state = createContinuation(commons.exportGame(commons.createGame()));
  state = startAssembly(state, 'player', 'workbench');
  assert.deepEqual(state.stock, { timber: 1, salvage: 0, food: 4 });
  assert.throws(() => startAssembly(state, 'neighbor', 'workbench'), /already|reserved|active/i);
  state = stopWork(advanceContinuation(state, 1), 'player');
  state = resumeWork(state, 'neighbor', 'workbench-0');
  assert.deepEqual(state.stock, { timber: 1, salvage: 0, food: 4 });
});

test('automatic recovery matches actually paid legacy rest while active-idle remains a distinct control', () => {
  const original = commons.createGame({ solo: true }), snapshot = commons.exportGame(original);
  const auto = advanceContinuation(createContinuation(snapshot), 6);
  const idle = advanceContinuation(createContinuation(snapshot, { recovery: 'active-idle' }), 6);
  const explicit = commons.advanceGame(commons.startJob(original, 'rest'), 6);
  assert.ok(Math.abs(auto.people.player.body.fatigue - explicit.people.player.body.fatigue) < 1e-12);
  assert.ok(Math.abs(idle.people.player.body.fatigue - auto.people.player.body.fatigue - .15) < 1e-12);
  assert.equal(auto.people.player.body.hunger, idle.people.player.body.hunger);
  assert.deepEqual(auto.people.player.skills, idle.people.player.skills);
  assert.equal(auto.people.player.pending, null);
  assert.equal(auto.assignments.player, null);
});

test('Next Event reaches real completion before its finite six-minute unassigned review horizon', () => {
  const busy = advanceToNextEvent(createContinuation(fixture()));
  assert.equal(busy.now, 188);
  assert.equal(busy.structures.workbench, 2);
  const idle = advanceToNextEvent(createContinuation(commons.exportGame(commons.createGame({ solo: true }))));
  assert.equal(idle.now, 6);
  assert.equal(idle.assignments.player, null);
  assert.equal(idle.people.player.pending, null);
  assert.equal(startAssembly(idle, 'player', 'workbench').now, 6);
});

test('Next Event returns on an actual recovery floor instead of creating a rest job', () => {
  let state = createContinuation(commons.exportGame(commons.createGame({ solo: true })));
  state = advanceContinuation(state, 6);
  state = advanceToNextEvent(state);
  assert.equal(state.now, 9);
  assert.equal(state.people.player.body.fatigue, 0);
  assert.equal(state.people.player.pending, null);
});

test('interrupted eating reserves one portion for its actor, pays time, and gives no hunger relief', () => {
  let state = createContinuation(commons.exportGame(commons.createGame()));
  state = beginMeal(state, 'neighbor');
  assert.equal(state.stock.food, 3);
  assert.throws(() => beginMeal(state, 'neighbor'), /occupied/);
  state = advanceContinuation(state, 3);
  state = stopMeal(state, 'neighbor');
  assert.equal(state.stock.food, 4);
  assert.ok(Math.abs(state.people.neighbor.body.hunger - .286) < 1e-12);
  assert.equal(state.people.neighbor.pending, null);
  assert.equal(state.paid.neighbor.meal, 3);
  assert.throws(() => stopMeal(state, 'neighbor'), /meal/);
});

test('eating finishes only after eight paid minutes and consumes its reserved portion once', () => {
  let state = createContinuation(commons.exportGame(commons.createGame()));
  state = beginMeal(state, 'neighbor');
  state = advanceContinuation(state, 7);
  assert.ok(state.people.neighbor.body.hunger > .28);
  assert.equal(state.meals.neighbor.endsAt, 8);
  state = advanceContinuation(state, 1);
  assert.equal(state.stock.food, 3);
  assert.equal(state.meals.neighbor, null);
  assert.equal(state.people.neighbor.body.hunger, 0);
  assert.equal(state.paid.neighbor.meal, 8);
  assert.throws(() => stopMeal(state, 'neighbor'), /meal/);
  assert.equal(advanceContinuation(state, 1).stock.food, 3);
});

test('JSON replay preserves paid partial work, interrupted eating, takeover and future continuation', () => {
  let state = advanceContinuation(createContinuation(fixture()), 1);
  state = acceptHandover(state, 'neighbor', 'player');
  state = beginMeal(state, 'neighbor');
  state = advanceContinuation(state, 3);
  state = stopMeal(state, 'neighbor');
  const restored = restoreContinuation(JSON.parse(JSON.stringify(exportContinuation(state))));
  assert.deepEqual(restored, state);
  assert.deepEqual(advanceContinuation(restored, 20), advanceContinuation(state, 20));
});

test('replay rejects fabricated food, erased effort, person practice and material duplication', () => {
  const state = advanceContinuation(createContinuation(fixture()), 2);
  for (const mutate of [
    s => { s.stock.food++; },
    s => { s.work['garden-0'].contributions.neighbor.effort = 0; },
    s => { s.people.player.skills.construction = .99; },
    s => { s.work['garden-0'].cost.timber = 0; }
  ]) {
    const forged = structuredClone(state); mutate(forged);
    assert.throws(() => exportContinuation(forged), /replay|match|state/i);
    assert.throws(() => advanceContinuation(forged, 1), /replay|match|state/i);
  }
});

test('new save identity rejects wrong versions, untrusted properties, and mixed legacy jobs explicitly', () => {
  const snapshot = fixture(), state = createContinuation(snapshot);
  const saved = exportContinuation(state);
  saved.version = 999;
  assert.throws(() => restoreContinuation(saved), /version|save/i);
  const getter = { get format() { throw new Error('getter invoked'); } };
  assert.throws(() => restoreContinuation(getter), /JSON|properties/i);
  const busy = commons.startJob(commons.createGame(), 'gather-timber');
  assert.throws(() => createContinuation(commons.exportGame(busy)), /Only idle or active assembly/);
  const original = commons.restoreGame(snapshot);
  assert.equal(original.people.player.version, '0.1.0');
  assert.equal(original.people.player.pending.elapsedMinutes, 27);
});

test('chunked advancement preserves exact state and never bills one actor time to another', () => {
  const origin = createContinuation(fixture());
  const whole = advanceContinuation(origin, 20);
  let split = origin;
  for (let i = 0; i < 20; i++) split = advanceContinuation(split, 1);
  assert.deepEqual(split, whole);
  for (const actor of ['player', 'neighbor']) {
    assert.equal(Object.values(whole.paid[actor]).reduce((a, b) => a + b, 0), 20);
    assert.equal(whole.people[actor].minutes, 207);
  }
});

test('private time horizon is explicit and new-command exhaustion retains stops and advancing', () => {
  let state = createContinuation(commons.exportGame(commons.createGame()));
  state = startAssembly(state, 'player', 'workbench');
  state = beginMeal(state, 'neighbor');
  let rejected = false;
  for (let i = 0; i < 600; i++) {
    try { state = state.assignments.player ? stopWork(state, 'player') : resumeWork(state, 'player', 'workbench-0'); }
    catch (error) { assert.match(error.message, /command limit/i); rejected = true; break; }
  }
  assert.equal(rejected, true);
  state = advanceContinuation(state, 1);
  if (state.assignments.player) state = stopWork(state, 'player');
  state = advanceContinuation(state, 1);
  state = stopMeal(state, 'neighbor');
  state = advanceContinuation(state, 238);
  assert.equal(state.now, 240);
  assert.ok(state.commands.length <= 512);
  assert.equal(advanceToNextEvent(state).now, 240);
  assert.throws(() => advanceContinuation(state, 1), /limited to 240/);
});

test('seven legal overlap cases retain prior fractions and never reward refreshing a same-worker assignment', () => {
  const expected = [202, 201, 200, 200, 199, 198, 198];
  for (let overlap = 1; overlap <= 7; overlap++) {
    const snapshot = commons.exportGame(makeLegacyFixture(overlap));
    const origin = createContinuation(snapshot, { recovery: 'active-idle' });
    const fork = advanceContinuation(origin, overlap);
    const restarted = resumeWork(stopWork(fork, 'neighbor'), 'neighbor', 'garden-0');
    const continued = advanceContinuation(fork, 20);
    const resumed = advanceContinuation(restarted, 20);
    assert.equal(continued.work['garden-0'].completedAt, expected[overlap - 1]);
    assert.deepEqual(resumed.people, continued.people);
    assert.deepEqual(resumed.work, continued.work);
    assert.ok(Math.abs(continued.work['garden-0'].contributions.neighbor.effort - .2) < 1e-12);
  }
});

test('automatic recovery cannot feed a hungry actor or authorize exertion that still exceeds hunger capacity', () => {
  const hungry = commons.advanceGame(commons.createGame({ solo: true }), 400);
  const origin = createContinuation(commons.exportGame(hungry));
  const recovered = advanceContinuation(origin, 40);
  assert.equal(recovered.people.player.body.fatigue, 0);
  assert.equal(recovered.people.player.body.hunger, 1);
  assert.deepEqual(recovered.stock, origin.stock);
  assert.throws(() => startAssembly(recovered, 'player', 'workbench'), /hunger capacity/);
});

test('command identities reject coercible arrays rather than recording an ambiguous replay', () => {
  const idle = createContinuation(commons.exportGame(commons.createGame()));
  assert.throws(() => startAssembly(idle, 'player', ['workbench']), /Unknown project/);
  const stopped = stopWork(advanceContinuation(createContinuation(fixture()), 1), 'neighbor');
  assert.throws(() => resumeWork(stopped, 'neighbor', ['garden-0']), /Unknown work/);
});
