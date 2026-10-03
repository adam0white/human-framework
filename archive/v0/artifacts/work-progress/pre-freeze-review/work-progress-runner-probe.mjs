// Intentionally invalid API doubles exercise only the runner's rejection gates.
// These are not candidate/rival implementations and no real arm is imported.
import {executeHistory,canonical} from '/Users/abdul/code/human-framework/scripts/work-progress-comparison.js';
import {CASES} from '/Users/abdul/code/human-framework/src/experiments/work-progress/cases.js';
import fs from 'node:fs';
function toy({nonfinite=false,chargeStart=false}={}){
 const observation=w=>{
  const p=w.started?Math.min(w.now/20,1):0,done=p===1,work=w.started?Math.min(w.now,20):0;
  const actors=Object.fromEntries(['A','B','C'].map(id=>[id,{person:{person:{minutes:w.now,pending:null,body:{fatigue:nonfinite?NaN:0,hunger:.2},skills:{construction:nonfinite?Infinity:.1}}},paid:{work:id==='A'?work:0,recovery:w.now-(id==='A'?work:0),effort:id==='A'?.2*p:0,construction:id==='A'?work:0,hauling:0,crafting:0}}]));
  return {now:w.now,stock:{timber:w.started?0:5,salvage:w.started?0:1,toolBlank:0},spent:{timber:done?5:0,salvage:done?1:0,toolBlank:0},toolAvailable:false,outputs:done?1:0,actors,items:[{id:'work-1',progress:p,completedAt:done?20:null,settled:done,reserved:{timber:w.started&&!done?5:0,salvage:w.started&&!done?1:0},contributions:w.started?{A:{basis:20,minutes:work,fraction:p,effort:.2*p}}:{}}],assignments:{A:w.started&&!done?'work-1':null,B:null,C:null},lastResponse:null};
 };
 return {createWorld:()=>({now:0,started:false}),command:w=>({...w,started:true,now:chargeStart?1:w.now}),advanceTo:(w,to)=>({...w,now:to}),nextEvent:w=>w.now<20?20:null,observe:observation,exportWorld:w=>({toy:w}),restoreWorld:s=>s.toy};
}
const out=[];
for(const [name,options]of [['invalid-nonfinite-person',{nonfinite:true}],['start-illegally-pays-one-minute',{chargeStart:true}]]){
 try{const result=executeHistory(toy(options),CASES[0],'event');out.push({name,rejected:false,completion:result.completed,commandObservations:result.records.filter(r=>r.operation.type==='command').map(r=>({commandAt:r.operation.at,observedAt:r.observation.now})),rawNonfinite:options.nonfinite?Number.isNaN(result.final.actors.A.person.person.body.fatigue):undefined,canonical:options.nonfinite?canonical(result.final.actors.A.person.person.body):undefined});}catch(error){out.push({name,rejected:true,error:error.message});}
}
const success='{"error":"test"}'+'\n',failure='{"error":"test"}'+'\\n';for(const [name,raw]of [['actual-newline',success],['literal-backslash-n',failure]]){try{JSON.parse(raw);out.push({name,parses:true});}catch(error){out.push({name,parses:false,error:error.message});}}
fs.writeFileSync('/tmp/work-progress-runner-probe.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
