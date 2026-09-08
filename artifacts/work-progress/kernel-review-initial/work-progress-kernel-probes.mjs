import assert from 'node:assert/strict';
import * as work from '/Users/abdul/code/human-framework/src/experiments/work-progress/candidate.js';
import * as camp from '/Users/abdul/code/human-framework/src/experiments/work-progress/camp-candidate.js';
import {practice} from '/Users/abdul/code/human-framework/src/core/model.js';
const output={node:process.version,probes:[]};
function probe(name,run){try{output.probes.push({name,...run()});}catch(error){output.probes.push({name,error:error.stack});}}
const start={type:'start',actor:'A',item:'work-1'};
probe('component_multiple_final_partial_minutes',()=>{
 let state=work.prepareWorker(work.createWork({id:'piece',effort:.2,minimumDuration:1}),{workerId:'A',basisMinutes:1});
 state=work.prepareWorker(state,{workerId:'B',basisMinutes:1});
 const snapshot=work.exportWork(state);snapshot.work.progress=1;snapshot.work.status='complete';
 for(const worker of Object.values(snapshot.work.workers))Object.assign(worker,{minutes:1,fraction:.5,effort:.1});
 const accepted=work.restoreWork(snapshot);
 const actualFirst=work.advanceWork(state,{workerId:'A'}).work;
 assert.equal(actualFirst.status,'complete');
 return {accepted,actualFirst,explanation:'With floor and both bases exactly 1, every legal first paid minute completes the item. Two workers each claiming a half paid minute is impossible.'};
});
probe('host_progress_without_any_productivity_change',()=>{
 const valid=camp.advanceTo(camp.command(camp.createWorld(),start),1),snapshot=camp.exportWorld(valid),w=snapshot.world;
 w.items[0].work.progress=1/6;w.items[0].work.workers.A.fraction=1/6;w.items[0].work.workers.A.effort=.2/6;w.actors.A.paid.effort=.2/6;
 const accepted=camp.restoreWorld(snapshot),resumed=camp.advanceTo(accepted,40),control=camp.advanceTo(valid,40);
 return {acceptedProgress:accepted.items[0].work.progress,paidMinutes:accepted.actors.A.paid.construction,tool:accepted.toolAvailable,acceptedCompletion:resumed.items[0].completedAt,controlCompletion:control.items[0].completedAt};
});
probe('host_completion_before_paid_work_can_fit',()=>{
 const valid=camp.advanceTo(camp.command(camp.createWorld(),start),20),snapshot=camp.exportWorld(valid);snapshot.world.items[0].completedAt=1;
 const accepted=camp.restoreWorld(snapshot);
 return {acceptedCompletion:accepted.items[0].completedAt,constructionMinutes:accepted.items[0].work.workers.A.minutes,actualCompletion:valid.items[0].completedAt};
});
probe('component_single_extra_minute_after_completion',()=>{
 let state=work.prepareWorker(work.createWork({id:'piece',effort:.2,minimumDuration:1}),{workerId:'A',basisMinutes:1});
 state=work.advanceWork(state,{workerId:'A'}).work;
 const snapshot=work.exportWork(state);snapshot.work.workers.A.minutes=2;
 const accepted=work.restoreWork(snapshot);
 return {acceptedMinutes:accepted.workers.A.minutes,basis:accepted.workers.A.basisMinutes,floor:accepted.minimumDuration,actualLegalMinutes:state.workers.A.minutes};
});
probe('host_fabricated_final_minute_and_practice',()=>{
 const valid=camp.advanceTo(camp.command(camp.createWorld(),start),21),snapshot=camp.exportWorld(valid),w=snapshot.world;
 w.items[0].work.workers.A.minutes=21;w.items[0].completedAt=21;
 w.actors.A.paid.work=21;w.actors.A.paid.recovery=0;w.actors.A.paid.construction=21;
 w.actors.A.person.skills.construction=practice(.1,21);
 const accepted=camp.restoreWorld(snapshot);
 return {acceptedMinutes:accepted.actors.A.paid.construction,actualMinutes:valid.actors.A.paid.construction,acceptedSkill:accepted.actors.A.person.skills.construction,actualSkill:valid.actors.A.person.skills.construction};
});
console.log(JSON.stringify(output,null,2));
