// Read-only analysis of the preserved user snapshot; no inferred action replay.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {restoreGame,exportGame,getGameView,advanceGame} from '../../../src/games/commons.js';

const bytes=readFileSync(new URL('./common-ground-minute-1312.json',import.meta.url));
const snapshot=JSON.parse(bytes),state=restoreGame(snapshot);
assert.deepEqual(exportGame(state),snapshot);
assert.deepEqual(exportGame(restoreGame(JSON.parse(JSON.stringify(exportGame(state))))),snapshot);
const stats=state.stats;
const personMinutes=stats.workMinutes+stats.restMinutes+stats.mealMinutes+stats.idleMinutes;
assert.equal(personMinutes,state.clock.now*Object.keys(state.people).length);
// Prospective continuation is a software check, not recovered user behavior.
const whole=advanceGame(state,60);
let chunks=restoreGame(snapshot);
for(let i=0;i<60;i++)chunks=advanceGame(chunks,1);
assert.deepEqual(exportGame(whole),exportGame(chunks));
assert.deepEqual(exportGame(state),snapshot,'analysis never modifies the supplied state');
const result={
  sourceSha256:createHash('sha256').update(bytes).digest('hex'),sourceBytes:bytes.length,
  validated:true,exactRoundTrip:true,worldMinutes:state.clock.now,
  milestoneAt:state.milestoneAt,minutesAfterMilestone:state.clock.now-state.milestoneAt,
  completedStages:Object.values(state.structures).reduce((a,b)=>a+b,0),caches:state.caches,
  stock:state.stock,stats,personMinutes,body:Object.fromEntries(Object.entries(state.people).map(([id,p])=>[id,p.body])),
  pendingJobs:Object.values(state.jobs).filter(Boolean).length,pendingEvents:state.clock.queue.length,
  latestCommitment:state.commitment,
  journal:{entries:state.recent.length,earliest:Math.min(...state.recent.map(e=>e.at)),latest:Math.max(...state.recent.map(e=>e.at))},
  publicView:getGameView(state),
  continuationCheck:{minutes:60,exactOneMinuteEquivalence:true,unmodifiedInput:true,scope:'Prospective test only; no actual player choices inferred.'},
  limits:'Current-state consistency is not authenticated history. Aggregate activity minutes combine both people; the retained journal is incomplete.'
};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
