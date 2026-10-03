// Deliberately tiny API doubles for runner gates only; no real comparison arms.
import {executeHistory} from '/Users/abdul/code/human-framework/scripts/work-progress-comparison.js';
import {CASES} from '/Users/abdul/code/human-framework/src/experiments/work-progress/cases.js';
import {createPerson,beginAttempt,advanceAttempt,finishAttempt,exportPerson} from '/Users/abdul/code/human-framework/src/runtime/index.js';
import fs from 'node:fs';import assert from 'node:assert/strict';
function toy({nonfinite=false,chargeStart=false,reuse=false}={}){
 const shared={};
 const observation=w=>{
  const p=w.started?Math.min(w.now/20,1):0,done=p===1,work=w.started?Math.min(w.now,20):0;
  const actors=Object.fromEntries(['A','B','C'].map(id=>{let person=createPerson({id,body:{fatigue:.2,hunger:.2},skills:id==='C'?{crafting:.1}:{construction:id==='A'?.1:.6,hauling:.1}});for(let t=1;t<=w.now;t++){const active=id==='A'&&t<=work;let next=beginAttempt(person,active?{actionId:'construct',targetId:'work-1',durationMinutes:1,effort:.01,exertive:true,skill:'construction'}:{actionId:'recover',durationMinutes:1,activity:'rest'});next=advanceAttempt(next,1);person=finishAttempt(next,{attemptId:next.pending.id,status:'completed'});}const exported=exportPerson(person);if(nonfinite)exported.person.body.fatigue=NaN;return [id,{person:exported,paid:{work:id==='A'?work:0,recovery:w.now-(id==='A'?work:0),effort:id==='A'?.2*p:0,construction:id==='A'?work:0,hauling:0,crafting:0}}];}));
  const result={now:w.now,stock:{timber:w.started?0:5,salvage:w.started?0:1,toolBlank:0},spent:{timber:done?5:0,salvage:done?1:0,toolBlank:0},toolAvailable:false,outputs:done?1:0,actors,items:[{id:'work-1',progress:p,completedAt:done?20:null,settled:done,reserved:{timber:w.started&&!done?5:0,salvage:w.started&&!done?1:0},contributions:w.started?{A:{basis:20,minutes:work,fraction:p,effort:.2*p}}:{}}],assignments:{A:w.started&&!done?'work-1':null,B:null,C:null},lastResponse:null};return reuse?Object.assign(shared,result):result;
 };
 return {createWorld:()=>({now:0,started:false}),command:w=>({...w,started:true,now:chargeStart?1:w.now}),advanceTo:(w,to)=>({...w,now:to}),nextEvent:w=>w.now<20?20:null,observe:observation,exportWorld:w=>({toy:w}),restoreWorld:s=>s.toy};
}
const out=[];
for(const [name,options]of [['invalid-nonfinite-person',{nonfinite:true}],['start-illegally-pays-one-minute',{chargeStart:true}]]){let rejected=false;try{executeHistory(toy(options),CASES[0],'event');}catch(error){rejected=true;out.push({name,rejected,error:error.message,hasEvidence:!!error.evidence});}assert.equal(rejected,true,name+' must reject');}
const run=executeHistory(toy({reuse:true}),CASES[0],'event');assert.equal(run.records[0].observation.now,0);assert.equal(run.checkpoints[0].observation.now,0);assert.equal(run.checkpoints[1].observation.now,0);out.push({name:'reused-observation-detached',initial:run.checkpoints[0].observation.now,command:run.checkpoints[1].observation.now,final:run.final.now});fs.writeFileSync('/tmp/work-progress-runner-recheck.json',JSON.stringify(out,null,2));console.log(out);
