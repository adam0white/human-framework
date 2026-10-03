import assert from 'node:assert/strict';
import * as work from '/Users/abdul/code/human-framework/src/experiments/work-progress/candidate.js';
import * as camp from '/Users/abdul/code/human-framework/src/experiments/work-progress/camp-candidate.js';
const output={node:process.version,workVersion:work.WORK_VERSION,hostVersion:camp.HOST_VERSION,probes:[]};
const roundWork=state=>{const snapshot=work.exportWork(state);assert.equal(snapshot.work.version,'0.1.1');const restored=work.restoreWork(JSON.parse(JSON.stringify(snapshot)));assert.deepEqual(restored,state);return restored;};
const roundCamp=world=>{const snapshot=camp.exportWorld(world);assert(snapshot.world.items.every(item=>item.work.version==='0.1.1'));const restored=camp.restoreWorld(JSON.parse(JSON.stringify(snapshot)));assert.deepEqual(restored,world);return restored;};
function probe(name,run){try{output.probes.push({name,ok:true,...run()});}catch(error){output.probes.push({name,ok:false,error:error.stack});}}
function build(def,steps){let state=work.createWork({id:'piece',effort:.2,minimumDuration:def.floor});for(const [workerId,basisMinutes]of Object.entries(def.bases))state=work.prepareWorker(state,{workerId,basisMinutes});const payments=[];for(const [workerId,n,durationReduction=0]of steps)for(let i=0;i<n;i++){const before=state,result=work.advanceWork(state,{workerId,durationReduction});assert.equal(before.status,'open');payments.push(result.payment);state=roundWork(result.work);}assert.equal(state.status,'complete');const settled=work.settleWork(state);state=roundWork(settled.work);assert.equal(work.settleWork(state).completion,null);return {transitions:payments.length,lastPayment:payments.at(-1),workers:state.workers};}
probe('legal_exact_one_minute_with_unused_contributor',()=>build({floor:1,bases:{A:1,B:1}},[['A',1]]));
probe('legal_two_worker_positive_final_partial',()=>build({floor:6,bases:{A:20,B:18}},[['A',1],['B',18]]));
probe('legal_returning_worker_positive_final_partial',()=>build({floor:2,bases:{A:7,B:11}},[['A',2],['B',3],['A',4]]));
probe('legal_variable_productivity_multiworker_partial',()=>build({floor:3,bases:{A:13,B:17}},[['A',2],['B',5,5],['A',3,8]]));
const start=(actor,item='work-1')=>({type:'start',actor,item});
const step=(world,at)=>roundCamp(camp.advanceTo(world,at));
const command=(world,input)=>roundCamp(camp.command(world,input));
probe('legal_late_tool_start',()=>{let world=step(camp.createWorld({toolArrival:1}),17);world=command(world,start('A'));world=step(world,18);world=step(world,31);assert.equal(world.items[0].completedAt,31);return {completedAt:world.items[0].completedAt,contributions:world.items[0].work.workers};});
probe('legal_late_no_tool_start',()=>{let world=step(camp.createWorld(),7);world=command(world,start('B'));world=step(world,8);world=step(world,25);assert.equal(world.items[0].completedAt,25);return {completedAt:world.items[0].completedAt,contributions:world.items[0].work.workers};});
probe('legal_tool_first_minute_then_pause_transfer_partial',()=>{let world=command(camp.createWorld({toolArrival:1}),start('A'));world=step(world,1);world=command(world,{type:'stop',actor:'A'});world=step(world,7);world=command(world,start('A'));world=step(world,8);world=command(world,{type:'handover',from:'A',to:'B',item:'work-1'});world=step(world,19);assert.equal(world.items[0].completedAt,19);return {completedAt:world.items[0].completedAt,contributions:world.items[0].work.workers};});
probe('legal_tool_prepared_without_exposure_late_start',()=>{let world=command(camp.createWorld({toolArrival:1}),start('A'));world=command(world,{type:'stop',actor:'A'});world=step(world,5);world=command(world,start('B'));world=step(world,17);assert.equal(world.items[0].completedAt,17);return {completedAt:world.items[0].completedAt,contributions:world.items[0].work.workers};});
console.log(JSON.stringify(output,null,2));
if(output.probes.some(p=>!p.ok))process.exitCode=1;
