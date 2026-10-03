import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HOST_VERSION,replaySession,exportGame} from '../src/games/workshop.js';
import {recordWorkshopSession,summarizeWorkshopRuns,runWorkshopController} from '../scripts/workshop-benchmark.js';

const actions=ids=>ids.flatMap(actionId=>[{type:'start',actionId},{type:'finish'}]);

test('workshop summaries separate deadline-censored time from winning completion time',()=>{
  const win=recordWorkshopSession({seed:1,policy:'greedy',commands:actions(['take-wrench','go-pump','patch','test-pump'])});
  const loss=recordWorkshopSession({seed:1,policy:'greedy',commands:actions(Array(16).fill('rest'))});
  assert.equal(win.status,'won');assert.equal(win.metrics.elapsedMinutes,61);
  assert.equal(loss.status,'lost');assert.equal(loss.metrics.elapsedMinutes,240);
  const summary=summarizeWorkshopRuns([win,loss]);
  assert.equal(summary.wins,1);assert.equal(summary.deadlineCensoredRuns,1);
  assert.equal(summary.means.elapsedMinutes,150.5);
  assert.equal(summary.meanWinningMinutes,61);
  assert.equal(summarizeWorkshopRuns([loss]).meanWinningMinutes,null);
  assert.deepEqual(summary.completedActionCounts,{eat:0,'go-pump':1,'go-storage':0,'inspect-pump':0,patch:1,replace:0,rest:16,'take-seal':0,'take-wrench':1,'test-pump':1});
  assert.throws(()=>recordWorkshopSession({seed:1,policy:'greedy',commands:[]}),/terminal|finished/i);
});

test('separate session recording counts interrupted meals without a ration and reproduces final state',()=>{
  const commands=[{type:'start',actionId:'eat'},{type:'advance',minutes:5},{type:'interrupt',reason:'Stop before consuming'},...actions(Array(16).fill('rest'))];
  const run=recordWorkshopSession({seed:1,policy:'greedy',commands});
  assert.equal(run.metrics.foodUsed,0);assert.equal(run.metrics.completedMeals,0);
  assert.equal(run.metrics.mealMinutes,5);assert.equal(run.metrics.restMinutes,235);
  assert.equal(run.metrics.interruptedActions,2);assert.equal(run.metrics.completedRestActions,15);
  assert.equal(run.requestedActionCounts.eat,1);assert.equal(run.completedActionCounts.eat,0);
  const replayed=replaySession({version:HOST_VERSION,seed:run.seed,policy:run.policy,commands:run.commands});
  assert.equal(createHash('sha256').update(JSON.stringify(exportGame(replayed))).digest('hex'),run.finalStateSha256);
  const auto=runWorkshopController({seed:1,policy:'task-aware'});
  assert.equal(auto.status,'won');assert.ok(auto.commands.length>0);
  assert.equal(Object.hasOwn(exportGame(replayed),'commands'),false);
});

test('failed repairs and capacity-blocked requests have separate counts and actual idle durations',()=>{
  // This seed fails three full patches. Repeated requests then exhaust the
  // 117 remaining minutes in 58 two-minute blocks and one deadline-capped block.
  const run=recordWorkshopSession({seed:20,policy:'greedy',commands:actions(['take-wrench','go-pump',...Array(62).fill('patch')])});
  assert.equal(run.status,'lost');assert.equal(run.metrics.failedRepairs,3);
  assert.equal(run.metrics.repairWorkMinutes,105);
  assert.equal(run.metrics.blockedAttempts,59);assert.equal(run.metrics.blockedIdleMinutes,117);
  assert.equal(run.events.at(-1).elapsedMinutes,1);
  assert.equal(run.metrics.restMinutes,0);assert.equal(run.metrics.foodUsed,0);
  assert.equal(run.requestedActionCounts.patch,62);assert.equal(run.completedActionCounts.patch,0);
});
