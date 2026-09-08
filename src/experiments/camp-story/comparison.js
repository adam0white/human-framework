/** Registered private comparison. Reserved functions are never evaluated at module load. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as old from '../../games/commons.js';
import * as rain from '../../games/commons-next.js';
import * as camp from '../../games/camp.js';
import * as story from '../../games/camp-story.js';
import { legacyEarned, legacyBusy, legacySupply, worldFacts, oldControls } from './controls.js';
import { makeLegacyFixture } from '../../../scripts/continuous-work-fixture.js';
import { drive } from './policy.js';

const json = value => JSON.parse(JSON.stringify(value));
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const saved = (api, state) => api.exportGame(state);
function roundtrip(api, state) {
  const snapshot = saved(api, state), restored = api.restoreGame(json(snapshot));
  assert.deepEqual(restored, state);
  return { snapshot, bytes: bytes(snapshot), exactRoundtrip: true };
}
function physicalImport(source, target) {
  assert.equal(target.clock.now, source.clock.now);
  for (const field of ['stock', 'structures', 'caches', 'milestoneAt']) assert.deepEqual(target[field], source[field]);
  for (const id of Object.keys(source.people)) for (const field of ['body', 'skills', 'minutes']) assert.deepEqual(target.people[id][field], source.people[id][field]);
}
function unchangedWorld(operation, state, ...args) {
  const before = camp.exportGame(state.world), next = operation(state, ...args);
  assert.deepEqual(camp.exportGame(next.world), before);
  return next;
}
const service = state => {
  const v = story.getGameView(state);
  return { phase: v.phase, now: v.now, enteredAt: v.enteredAt, ferryAt: v.ferryAt, rainAt: v.rainAt,
    caches: v.caches, availableCaches: v.availableCaches, carriedCaches: v.carriedCaches,
    householdsEquipped: v.householdsEquipped, campNights: v.campNights, departed: v.departed };
};
function importCase(policy) {
  const origin = legacyEarned(policy), input = old.exportGame(origin.world);
  const selected = camp.migrateLegacyGame(input), migrated = story.migrateLegacyGame(input);
  physicalImport(origin.world, selected);
  assert.deepEqual(migrated.world, selected);
  assert.equal(story.getGameView(migrated).phase, 'introduction');
  const before = roundtrip(story, migrated);
  let state = unchangedWorld(story.continueStory, migrated);
  const copy = story.restoreGame(json(story.exportGame(state)));
  state = story.advanceGame(state, 6);
  assert.deepEqual(story.advanceGame(copy, 6), state);
  return { kind: 'synthetic-old-earned', policy, commands: origin.commands, legacy: input, selected: camp.exportGame(selected),
    entry: before, continued: roundtrip(story, state), service: service(state),
    exactSelectedKernelEntry: true, sameZeroTimeAcknowledgment: true, exactContinuation: true };
}
function freshKernel(approach, improvement, recovery) {
  const initial = camp.createGame({ improvement, recovery });
  const run = drive(camp, initial, approach, view => view.now >= 480);
  return { approach, options: { improvement, recovery }, fixedBudgetMinutes: 480, decisions: run.decisions,
    watchdog: run.watchdog, firstMilestone: run.firstMilestone, final: roundtrip(camp, run.state), facts: worldFacts(run.state) };
}
function freshStory(approach) {
  const run = drive(story, story.createGame(), approach, v => v.phase === 'introduction', { maxMinutes: 1000 });
  assert.equal(story.getGameView(run.state).phase, 'introduction', 'Policy did not reach first actual camp milestone');
  assert.equal(run.state.world.clock.now, run.state.world.milestoneAt);
  const acknowledged = unchangedWorld(story.continueStory, run.state);
  const direct = camp.advanceGame(acknowledged.world, 5), advanced = story.advanceGame(acknowledged, 5);
  assert.deepEqual(advanced.world, direct);
  assert.deepEqual(story.advanceGame(story.restoreGame(json(story.exportGame(acknowledged))), 5), advanced);
  return { approach, decisions: run.decisions, entry: roundtrip(story, run.state), continued: roundtrip(story, advanced),
    exactPaidKernelContinuation: true, sameZeroTimeAcknowledgment: true, service: service(advanced) };
}
function workArm(improvement, recovery) {
  const origin = old.exportGame(makeLegacyFixture());
  let state = camp.migrateLegacyGame(origin, { improvement, recovery });
  const initial = camp.exportGame(state), traces = [];
  let completedAt = null, firstComplete = null;
  while (state.clock.now < 207) {
    state = camp.advanceGame(state, 1);
    traces.push({ now: state.clock.now, facts: worldFacts(state) });
    if (completedAt === null && state.structures.garden > origin.game.structures.garden) {
      completedAt = state.clock.now; firstComplete = camp.exportGame(state);
      state = camp.releaseProject(state); // The controller may have admitted a zero-paid next stage. Preserve it explicitly.
    }
  }
  assert.equal(completedAt, improvement === 'snapshot' ? 207 : 202);
  return { options: { improvement, recovery }, initial, completedAt, firstComplete, completedStage: firstComplete.game.lastAssemblies.garden, final: roundtrip(camp, state), traces,
    costBoundary: 'First completion includes only paid minutes through stage one; subsequent zero-paid stage admission/material remains explicit.' };
}
function stopResume() {
  const origin = old.exportGame(makeLegacyFixture());
  let initial = camp.advanceGame(camp.migrateLegacyGame(origin, { recovery: 'active-idle' }), 1);
  let resumed = camp.requestProject(camp.releaseProject(initial), 'garden');
  const before = worldFacts(initial);
  for (const id of Object.keys(initial.people)) for (const field of ['body', 'skills', 'minutes']) assert.deepEqual(resumed.people[id][field], initial.people[id][field]);
  const uninterrupted = camp.advanceGame(initial, 14);
  resumed = camp.advanceGame(resumed, 14);
  for (const id of Object.keys(initial.people)) for (const field of ['body', 'skills', 'minutes']) assert.deepEqual(resumed.people[id][field], uninterrupted.people[id][field]);
  assert.deepEqual(resumed.work, uninterrupted.work);
  assert.deepEqual(resumed.stock, uninterrupted.stock);
  return { initial: camp.exportGame(initial), before, uninterrupted: roundtrip(camp, uninterrupted), resumed: roundtrip(camp, resumed),
    exactPeopleWorkStock: true };
}
function handover() {
  const initial = camp.advanceGame(camp.migrateLegacyGame(old.exportGame(makeLegacyFixture()), { recovery: 'active-idle' }), 1);
  const accepted = camp.requestHandover(initial, 'neighbor', 'player');
  assert.equal(accepted.jobs.player?.id, 'build-garden');
  for (const id of Object.keys(initial.people)) for (const field of ['body', 'skills', 'minutes']) assert.deepEqual(accepted.people[id][field], initial.people[id][field]);
  let state = accepted;
  while (state.structures.garden === 0 && state.clock.now < 220) state = camp.advanceGame(state, 1);
  assert.equal(state.structures.garden, 1);
  assert.ok(state.people.player.skills.construction !== undefined);
  return { initial: camp.exportGame(initial), accepted: camp.exportGame(accepted), final: roundtrip(camp, state),
    receiverUsesOwnPaidTime: state.people.player.minutes - accepted.people.player.minutes, facts: worldFacts(state) };
}
function busyImport() {
  const source = legacyBusy(), migrated = camp.migrateLegacyGame(old.exportGame(source.world));
  physicalImport(source.world, migrated);
  const restored = camp.restoreGame(json(camp.exportGame(migrated)));
  const stopped = camp.cancelJob(migrated), stoppedCopy = camp.cancelJob(restored);
  assert.deepEqual(stopped.people.player.body, migrated.people.player.body);
  assert.deepEqual(stopped.people.player.skills, migrated.people.player.skills);
  assert.deepEqual(stopped.stock, migrated.stock);
  assert.deepEqual(stopped.stats.gathered, migrated.stats.gathered);
  const advanced = camp.advanceGame(stopped, 5);
  assert.deepEqual(advanced, camp.advanceGame(stoppedCopy, 5));
  assert.deepEqual(advanced.stats.gathered, migrated.stats.gathered);
  return { source, migrated: roundtrip(camp, migrated), stopped: camp.exportGame(stopped), advanced: roundtrip(camp, advanced),
    exactContinuation: true, noCanceledGatherOutput: true, paidExposureRetained: true };
}
function mealImport() {
  let source = old.createGame({ solo: true });
  source = old.startJob(source, 'eat'); source = old.advanceGame(source, 3);
  const migrated = camp.migrateLegacyGame(old.exportGame(source));
  physicalImport(source, migrated);
  assert.equal(migrated.jobs.player.id, 'eat');
  assert.equal(migrated.jobs.player.endsAt, source.jobs.player.endsAt);
  const completed = camp.advanceGame(migrated, 5), canceled = camp.cancelJob(migrated);
  assert.equal(completed.stats.consumedFood, migrated.stats.consumedFood + 1);
  assert.equal(canceled.stock.food, migrated.stock.food + 1);
  assert.deepEqual(canceled.people.player.body, migrated.people.player.body);
  assert.deepEqual(camp.advanceGame(camp.restoreGame(json(camp.exportGame(migrated))), 5), completed);
  return { source: old.exportGame(source), migrated: roundtrip(camp, migrated), completed: roundtrip(camp, completed), canceled: roundtrip(camp, canceled) };
}
function suppliedState() {
  const path = 'artifacts/user-runs/2026-09-07/common-ground-minute-1312.json';
  const input = JSON.parse(readFileSync(new URL('../../../' + path, import.meta.url), 'utf8'));
  const original = old.restoreGame(input), migrated = story.migrateLegacyGame(input);
  assert.equal(original.clock.now, 1312); assert.equal(original.caches, 12);
  physicalImport(original, migrated.world);
  assert.equal(story.getGameView(migrated).enteredAt, 1312);
  assert.equal(story.getGameView(migrated).ferryAt, 1402);
  assert.equal(story.getGameView(migrated).rainAt, 1492);
  let state = unchangedWorld(story.continueStory, migrated);
  for (const destination of ['households', 'households', 'camp', 'camp']) state = unchangedWorld(story.allocateCache, state, destination);
  assert.equal(story.getGameView(state).availableCaches, 8);
  const allocated = roundtrip(story, state);
  state = story.advanceGame(state, 90);
  state = unchangedWorld(story.dispatchFerry, state);
  state = unchangedWorld(story.finishStory, state);
  const ended = state;
  state = unchangedWorld(story.returnToCamp, state);
  const continued = story.advanceGame(state, 6);
  assert.deepEqual(continued, story.advanceGame(story.restoreGame(json(story.exportGame(state))), 6));
  return { kind: 'private actual previously supplied current-state compatibility only', source: path,
    imported: roundtrip(story, migrated), allocated, ended: roundtrip(story, ended), continued: roundtrip(story, continued),
    service: service(ended), noInventedHistoricalCacheTimes: true, samePaidBodyAtEntry: true };
}
function surplusEnding() {
  const origin = legacySupply(4), migrated = story.migrateLegacyGame(old.exportGame(origin.world));
  let state = unchangedWorld(story.continueStory, migrated);
  for (const destination of ['households', 'households', 'camp', 'camp']) state = unchangedWorld(story.allocateCache, state, destination);
  state = story.advanceGame(state, 90);
  state = unchangedWorld(story.dispatchFerry, state);
  state = unchangedWorld(story.finishStory, state);
  const ended = roundtrip(story, state);
  state = unchangedWorld(story.returnToCamp, state);
  assert.throws(() => story.returnToCamp(state));
  assert.throws(() => story.continueStory(state));
  return { origin, ended, returned: roundtrip(story, state), service: service(state), noForcedEmptyWait: true, sameEndingWorld: true };
}
function lateFerry() {
  const origin = legacyEarned();
  let state = story.continueStory(story.migrateLegacyGame(old.exportGame(origin.world)));
  state = story.advanceGame(state, 90);
  const ferry = roundtrip(story, state);
  state = unchangedWorld(story.dispatchFerry, state);
  const run = drive(story, state, 'build-first', v => v.phase === 'rain', { maxMinutes: origin.world.clock.now + 180 });
  state = run.state;
  assert.equal(story.getGameView(state).phase, 'rain');
  assert.throws(() => story.allocateCache(state, 'households'));
  while (story.getGameView(state).availableCaches && story.getGameView(state).campNights < 4) state = unchangedWorld(story.allocateCache, state, 'camp');
  state = unchangedWorld(story.finishStory, state);
  assert.ok(story.getGameView(state).campNights > 0, 'This prescribed late policy produced no useful later camp provision');
  const ended = roundtrip(story, state);
  state = unchangedWorld(story.returnToCamp, state);
  return { origin, ferry, decisions: run.decisions, ended, returned: roundtrip(story, state), service: service(state), sameEndingWorld: true };
}
function rainMigration(phase) {
  let source = rain.createGame();
  if (phase !== 'packing') source = rain.advanceGame(source, 90);
  if (phase === 'ended') source = rain.finishDay(rain.advanceGame(rain.dispatchFerry(source), 90));
  const migrated = story.migrateLegacyRainGame(rain.exportGame(source));
  physicalImport(source.world, migrated.world);
  const v = story.getGameView(migrated), oldView = rain.getGameView(source);
  assert.equal(v.enteredAt, source.openedAt);
  assert.equal(v.ferryAt, source.openedAt + 90); assert.equal(v.rainAt, source.openedAt + 180);
  for (const field of ['householdsEquipped', 'campNights', 'availableCaches', 'departed']) assert.equal(v[field], oldView[field]);
  let continued = migrated;
  if (phase === 'packing') continued = story.advanceGame(migrated, 6);
  if (phase === 'ferry') continued = unchangedWorld(story.dispatchFerry, migrated);
  if (phase === 'ended') continued = unchangedWorld(story.returnToCamp, migrated);
  return { phase, source: rain.exportGame(source), migrated: roundtrip(story, migrated), continued: roundtrip(story, continued),
    service: service(migrated), exactExistingWindow: true };
}
function reservedInclusive() {
  const source = legacySupply(4);
  let state = story.continueStory(story.migrateLegacyGame(old.exportGame(source.world)));
  state = story.advanceGame(state, 90);
  assert.equal(story.getGameView(state).phase, 'ferry');
  const atCheckpoint = roundtrip(story, state);
  state = unchangedWorld(story.allocateCache, state, 'households');
  state = unchangedWorld(story.dispatchFerry, state);
  assert.throws(() => story.allocateCache(state, 'households'));
  return { source, atCheckpoint, final: roundtrip(story, state), service: service(state), exactNewProductionTieTested: false };
}
function reservedLate() {
  const source = legacySupply(4);
  let state = story.continueStory(story.migrateLegacyGame(old.exportGame(source.world)));
  state = story.advanceGame(state, 90); state = unchangedWorld(story.dispatchFerry, state); state = story.advanceGame(state, 90);
  state = story.restoreGame(json(story.exportGame(state)));
  state = unchangedWorld(story.allocateCache, state, 'camp');
  state = unchangedWorld(story.finishStory, state);
  const settled = state.window, ended = roundtrip(story, state);
  state = unchangedWorld(story.returnToCamp, state);
  assert.throws(() => story.returnToCamp(state)); assert.throws(() => story.continueStory(state));
  state = story.advanceGame(state, 6);
  assert.deepEqual(state.window, settled);
  assert.equal(story.getGameView(state).householdsEquipped, 0);
  return { source, ended, continued: roundtrip(story, state), service: service(state), singleWindow: true };
}
export function casesFor(partition) {
  if (partition === 'reserved') return [['reserved-inclusive-carried', reservedInclusive], ['reserved-interrupted-import', busyImport], ['reserved-late-retained', reservedLate]];
  if (partition !== 'development') throw new Error('Unknown comparison partition');
  return [['old-controls', oldControls],
    ...['build-first', 'stock-first'].flatMap(approach => ['snapshot', 'prospective'].flatMap(improvement => ['active-idle', 'automatic'].map(recovery =>
      [`kernel-${approach}-${improvement}-${recovery}`, () => freshKernel(approach, improvement, recovery)]))),
    ...['build-first', 'stock-first'].map(approach => [`earned-${approach}`, () => freshStory(approach)]),
    ...['build-first', 'stock-first'].map(approach => [`import-${approach}`, () => importCase(approach)]),
    ...['snapshot', 'prospective'].flatMap(improvement => ['active-idle', 'automatic'].map(recovery => [`work-${improvement}-${recovery}`, () => workArm(improvement, recovery)])),
    ['work-stop-resume', stopResume], ['work-handover', handover], ['owned-meal-import', mealImport],
    ['private-supplied-state', suppliedState], ['surplus-early-ending', surplusEnding], ['late-ferry', lateFerry],
    ...['packing', 'ferry', 'ended'].map(phase => [`rain-import-${phase}`, () => rainMigration(phase)])];
}
