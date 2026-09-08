import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as commons from '../src/games/commons.js';
import * as work from '../src/experiments/continuous-work/host.js';
import { PRELUDE, makeLegacyFixture, legacyCounterexample, roundedCapacityFixture } from './continuous-work-fixture.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceFiles = ['src/experiments/continuous-work/host.js', 'scripts/continuous-work-fixture.js', 'scripts/continuous-work-probe.js',
  'src/games/commons.js', 'src/human/index.js', 'src/human/v0.1.1.js', 'src/runtime/index.js', 'src/runtime/clock.js', 'src/core/model.js',
  'scripts/runtime-release-lock.json', 'tests/continuous-work-legacy.test.js', 'tests/continuous-work.test.js'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceCommit = git(['rev-parse', 'HEAD']);
const sources = Object.fromEntries(sourceFiles.map(path => {
  const bytes = readFileSync(resolve(root, path));
  const committed = execFileSync('git', ['show', `${sourceCommit}:${path}`], { cwd: root });
  assert.equal(sha(bytes), sha(committed), `Commit the frozen source before probing: ${path}`);
  return [path, sha(bytes)];
}));
const artifacts = {};
function keep(name, value) { artifacts[name] = JSON.stringify(value, null, 2) + '\n'; }
function keepContinuation(name, state) {
  const saved = work.exportContinuation(state);
  assert.deepEqual(work.restoreContinuation(JSON.parse(JSON.stringify(saved))), state);
  keep(name, saved);
}
function summary(state) {
  const garden = state.work['garden-0'];
  return { now: state.now, gardenCompletedAt: garden?.completedAt ?? null, structures: state.structures, stock: state.stock,
    bodies: Object.fromEntries(Object.entries(state.people).map(([a, p]) => [a, p.body])), paid: state.paid,
    gardenContributions: garden?.contributions ?? null, nextStop: work.getContinuityView(state).nextStop };
}

const original = legacyCounterexample();
keep('original-counterexample.json', original);
const originalFork = original.fork.game;
let finishThenRelease = commons.advanceGame(originalFork, originalFork.jobs.neighbor.endsAt - originalFork.clock.now);
finishThenRelease = commons.releaseProject(finishThenRelease);
assert.equal(finishThenRelease.clock.now, 207);
assert.equal(finishThenRelease.structures.garden, 1);
assert.equal(finishThenRelease.commitment.status, 'released');
assert.equal(finishThenRelease.jobs.neighbor.id, 'rest');
assert.equal(finishThenRelease.people.neighbor.pending.elapsedMinutes, 0);
keep('finish-current-then-release.json', commons.exportGame(finishThenRelease));

const arms = {};
for (const improvement of ['snapshot', 'prospective']) for (const recovery of ['active-idle', 'automatic']) {
  const key = `${improvement}-${recovery}`;
  const state = work.advanceContinuation(work.createContinuation(original.before, { improvement, recovery }), 20);
  assert.equal(state.work['garden-0'].completedAt, improvement === 'snapshot' ? 207 : 202);
  assert.deepEqual(state.stock, original.before.game.stock);
  assert.ok(Math.abs(state.work['garden-0'].contributions.neighbor.effort - .2) < 1e-12);
  arms[key] = summary(state);
  keepContinuation(`${key}.json`, state);
}

const fork = work.advanceContinuation(work.createContinuation(original.before, { recovery: 'active-idle' }), 1);
const resumed = work.advanceContinuation(work.resumeWork(work.stopWork(fork, 'neighbor'), 'neighbor', 'garden-0'), 14);
const continued = work.advanceContinuation(fork, 14);
assert.deepEqual(resumed.people, continued.people);
assert.deepEqual(resumed.work, continued.work);
keepContinuation('stop-resume.json', resumed);
const takeover = work.advanceContinuation(work.acceptHandover(fork, 'neighbor', 'player'), 13);
assert.equal(takeover.work['garden-0'].completedAt, 201);
keepContinuation('takeover.json', takeover);

const overlaps = [];
for (let overlap = 1; overlap <= 7; overlap++) {
  const origin = commons.exportGame(makeLegacyFixture(overlap));
  const state = work.advanceContinuation(work.createContinuation(origin, { recovery: 'active-idle' }), overlap + 20);
  const restarted = commons.requestProject(commons.releaseProject(commons.advanceGame(origin.game, overlap)), 'garden');
  overlaps.push({ overlap, gardenStartedAt: origin.game.clock.now, oldContinueAt: origin.game.jobs.neighbor.endsAt,
    oldRestartAt: restarted.jobs.neighbor.endsAt, prospectiveAt: state.work['garden-0'].completedAt,
    retainedEffort: state.work['garden-0'].contributions.neighbor.effort });
  keepContinuation(`overlap-${overlap}.json`, state);
}

const quietOriginal = commons.createGame({ solo: true }), quietSnapshot = commons.exportGame(quietOriginal);
const automatic = work.advanceContinuation(work.createContinuation(quietSnapshot), 6);
const activeIdle = work.advanceContinuation(work.createContinuation(quietSnapshot, { recovery: 'active-idle' }), 6);
const explicitRest = commons.advanceGame(commons.startJob(quietOriginal, 'rest'), 6);
assert.ok(Math.abs(automatic.people.player.body.fatigue - explicitRest.people.player.body.fatigue) < 1e-12);
keepContinuation('automatic-recovery.json', automatic);
keepContinuation('active-idle-control.json', activeIdle);
keep('legacy-explicit-rest.json', commons.exportGame(explicitRest));

const rounded = roundedCapacityFixture(), roundedView = commons.getGameView(rounded);
let executionError;
try { commons.startJob(rounded, 'build-workbench'); } catch (error) { executionError = error.message; }
assert.match(executionError, /Too much fatigue/);
assert.equal(roundedView.choices.find(c => c.id === 'build-workbench').unavailable, null);
keep('rounded-capacity-counterexample.json', { source: 'Independent source-review hypothesis verified by legal commands',
  commands: [['start', 'gather-timber'], ['next'], ['start', 'gather-timber'], ['next'], ['start', 'gather-timber'], ['next'], ['advance', 72]],
  snapshot: commons.exportGame(rounded), actualBody: rounded.people.player.body, visibleBody: roundedView.people.player.body,
  advertisedChoice: roundedView.choices.find(c => c.id === 'build-workbench'), executionError });

keep('report.json', { sourceCommit, sources, environment: { node: process.version, platform: process.platform, architecture: process.arch },
  scope: 'Private deterministic continuation fixtures, not a public game release, blind sample or human-validation result',
  original: { prelude: PRELUDE, improvementAt: 188, continueAt: 207, restartAt: 202, finishThenReleaseAt: 207,
    retainedGardenMinute: 1, priorEffort: .01, restartFutureEffort: .2 }, arms, stopResume: summary(resumed), takeover: summary(takeover), overlaps,
  recovery: { automatic: summary(automatic), activeIdle: summary(activeIdle), legacyRestBody: explicitRest.people.player.body },
  originalFailuresRetained: ['workbench benefit snapshots at job start', 'rounded capacity advertises an actually blocked job'] });

const output = resolve(root, process.argv[2] ?? `artifacts/continuous-work/${sourceCommit.slice(0, 7)}`);
mkdirSync(dirname(output), { recursive: true });
mkdirSync(output); // Never overwrite an earlier evidence run.
for (const [name, data] of Object.entries(artifacts)) writeFileSync(resolve(output, name), data);
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify({ sourceCommit, node: process.version,
  files: Object.fromEntries(Object.entries(artifacts).map(([name, data]) => [name, sha(data)])) }, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceCommit, files: Object.keys(artifacts).length + 1,
  results: { unchanged: 207, restarted: 202, prospective: arms['prospective-active-idle'].gardenCompletedAt, takeover: takeover.work['garden-0'].completedAt } }, null, 2));
