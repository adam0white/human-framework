import test from 'node:test';
import assert from 'node:assert/strict';
import {runShift,sweepShift,farmingProbe} from '../scripts/shift-benchmark.js';
import {replaySession,getShiftView} from '../src/games/shift.js';
test('shift benchmark retains partial scores, paid failures and replayable seed identities',()=>{
 const result=runShift({seed:23,policy:'all-patch',record:true});assert.equal(result.seed,23);assert.equal(result.restored,getShiftView(replaySession(result.replay)).score.verifiedCount);
 assert.equal(result.minutes,replaySession(result.replay).clock);
 assert.ok(result.actions>result.repairs);assert.ok(Number.isFinite(result.score));
 const sweep=sweepShift({firstSeed:1,count:5});assert.equal(sweep.controllers.length,15);assert.equal(sweep.routes.length,120);
 assert.ok(sweep.controllers.every(row=>['all-restored','left-early','departure'].includes(row.finishReason)));
 assert.equal(new Set(sweep.routes.map(row=>row.strategy)).size,24);
});
test('interruption probe holds paid exposure fixed and reports continuation losses as well as gains',()=>{
 const result=farmingProbe({firstSeed:1,count:5});assert.equal(result.zeroTimeRerolls,0);assert.ok(result.maximumSplitSkillDifference<1e-12);
 assert.equal(result.pairs.length,5);for(const pair of result.pairs){assert.ok(Number.isFinite(pair.delta));assert.ok(Number.isFinite(pair.completeScore));assert.ok(Number.isFinite(pair.interruptedScore));}
});
test('a partial benchmark continuation cannot claim a complete replay from a fresh shift',()=>{
 assert.throws(()=>runShift({seed:1,record:true,initialState:replaySession({version:'shift-0.1.0',seed:1,policy:'value-first',commands:[{type:'start',actionId:'take-tools'},{type:'finish'}]})}),/complete replay/);
});
