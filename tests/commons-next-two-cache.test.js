import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/games/commons-next.js';
import * as probe from '../artifacts/commons-next/two-cache-ferry-probe.mjs';

test('visible event-boundary coordination earns two caches before the ferry with paid partial rest',()=>{
  assert.equal(typeof probe.runTwoCacheProbe,'function','The inspected two-cache protocol must execute');
  const run=probe.runTwoCacheProbe();
  assert.deepEqual(run.summary.cacheCompletionOffsets,[40,88]);
  assert.equal(run.summary.ferryMinute,90);
  assert.equal(run.summary.completedCaches,2);
  assert.equal(run.summary.canceledJobs,1);
  const canceled=run.trace.find(step=>step.command.type==='cancel');
  assert.equal(canceled.before.elapsed,54);assert.equal(canceled.before.people.player.job.remaining,4);
  assert.equal(canceled.after.elapsed,54);assert.equal(canceled.after.people.player.job,null);
  assert.deepEqual(canceled.after.people.player.body,canceled.before.people.player.body);
  assert.deepEqual(canceled.after.stock,canceled.before.stock);
  assert.equal(run.checks.partialRestPaidMinutes,14);
  assert.equal(run.checks.cancelPreservedExactCondition,true);
  assert.equal(run.checks.everyRequestedProjectAccepted,true);
  const restored=game.restoreGame(run.ferrySave);
  const households=game.allocateCache(game.allocateCache(restored,'households'),'households');
  const camp=game.allocateCache(game.allocateCache(restored,'camp'),'camp');
  assert.equal(game.getGameView(households).householdsEquipped,2);
  assert.equal(game.getGameView(camp).campNights,4);
  assert.throws(()=>game.allocateCache(households,'camp'),/cache/i);
});

test('finishing the full first rest leaves the second cache unpaid at the unchanged ferry deadline',()=>{
  const run=probe.runTwoCacheProbe({finishFirstRest:true});
  assert.deepEqual(run.summary.cacheCompletionOffsets,[40]);
  assert.equal(run.summary.completedCaches,1);assert.equal(run.summary.canceledJobs,0);
  assert.equal(run.summary.unfinishedPlayerJob.id,'build-cache');
  assert.equal(run.summary.unfinishedPlayerJob.remaining,2);
  const restored=game.restoreGame(run.ferrySave);
  assert.equal(game.getGameView(restored).availableCaches,1);
  assert.deepEqual(game.restoreGame(game.exportGame(restored)),restored);
});
