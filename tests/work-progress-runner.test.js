// Deliberately tiny API doubles for runner gates only; no real comparison arms.
import {executeHistory,assertJson} from '../scripts/work-progress-comparison.js';
import {CASES} from '../src/experiments/work-progress/cases.js';
import {createPerson,beginAttempt,advanceAttempt,finishAttempt,exportPerson} from '../src/runtime/index.js';
import test from 'node:test';import assert from 'node:assert/strict';
function toy({nonfinite=false,chargeStart=false,reuse=false}={}){
 const shared={};
 const observation=w=>{
  const p=w.started?Math.min(w.now/20,1):0,done=p===1,work=w.started?Math.min(w.now,20):0;
  const actors=Object.fromEntries(['A','B','C'].map(id=>{let person=createPerson({id,body:{fatigue:.2,hunger:.2},skills:id==='C'?{crafting:.1}:{construction:id==='A'?.1:.6,hauling:.1}});for(let t=1;t<=w.now;t++){const active=id==='A'&&t<=work;let next=beginAttempt(person,active?{actionId:'construct',targetId:'work-1',durationMinutes:1,effort:.01,exertive:true,skill:'construction'}:{actionId:'recover',durationMinutes:1,activity:'rest'});next=advanceAttempt(next,1);person=finishAttempt(next,{attemptId:next.pending.id,status:'completed'});}const exported=exportPerson(person);if(nonfinite)exported.person.body.fatigue=NaN;return [id,{person:exported,paid:{work:id==='A'?work:0,recovery:w.now-(id==='A'?work:0),effort:id==='A'?.2*p:0,construction:id==='A'?work:0,hauling:0,crafting:0}}];}));
  const result={now:w.now,stock:{timber:w.started?0:5,salvage:w.started?0:1,toolBlank:0},spent:{timber:done?5:0,salvage:done?1:0,toolBlank:0},toolAvailable:false,outputs:done?1:0,actors,items:[{id:'work-1',progress:p,completedAt:done?20:null,settled:done,reserved:{timber:w.started&&!done?5:0,salvage:w.started&&!done?1:0},contributions:w.started?{A:{basis:20,minutes:work,fraction:p,effort:.2*p}}:{}}],assignments:{A:w.started&&!done?'work-1':null,B:null,C:null},lastResponse:null};return reuse?Object.assign(shared,result):result;
 };
 return {createWorld:()=>({now:0,started:false}),command:w=>({...w,started:true,now:chargeStart?1:w.now}),advanceTo:(w,to)=>({...w,now:to}),nextEvent:w=>w.now<20?20:null,observe:observation,exportWorld:w=>({toy:w}),restoreWorld:s=>s.toy};
}

test('comparison rejects a non-finite exported person with failure evidence',()=>{
 assert.throws(()=>executeHistory(toy({nonfinite:true}),CASES[0],'event'),error=>/Non-finite/.test(error.message)&&Boolean(error.evidence));
});
test('comparison rejects zero-time commands that secretly advance the world',()=>{
 assert.throws(()=>executeHistory(toy({chargeStart:true}),CASES[0],'event'),error=>/command may not advance time/.test(error.message)&&Boolean(error.evidence));
});
test('comparison checkpoints detach an API observation cache',()=>{
 const run=executeHistory(toy({reuse:true}),CASES[0],'event');
 assert.equal(run.checkpoints[0].observation.now,0);
 assert.equal(run.checkpoints[1].observation.now,0);
 assert.equal(run.final.now,40);
});
test('evidence JSON refuses sparse arrays with an unrelated replacement key',()=>{
 const array=Array(1);array.extra=7;
 assert.throws(()=>assertJson(array),/Missing JSON array index/);
});
