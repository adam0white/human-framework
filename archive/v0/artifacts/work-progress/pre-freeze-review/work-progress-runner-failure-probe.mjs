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

import vm from 'node:vm';import {resolve,dirname} from 'node:path';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const source=fs.readFileSync('/Users/abdul/code/human-framework/scripts/work-progress-comparison.js','utf8');
const hash=createHash('sha256').update(source).digest('hex');
const start=source.indexOf(' try {\n for(const fixture of CASES){');
assert.ok(start>=0);const end=source.indexOf('\n return {format:',start);assert.ok(end>start);
const block=source.slice(start,end);
const compare=new Function('CASES','DRIVERS','apis','runs','canonical','assert','freeze',block);
const tinyRuns=[{id:'H1',driver:'minute',restore:false,arm:'candidate',records:[{observation:{testOnly:1}}]},{id:'H1',driver:'minute',restore:false,arm:'direct',records:[{observation:{testOnly:2}}]}];
let comparisonError;try{compare([{id:'H1'}],['minute'],{candidate:{},direct:{}},tinyRuns,JSON.stringify,assert,{testOnly:true});}catch(error){comparisonError=error;}
assert.equal(comparisonError.evidence.phase,'cross-arm-and-driver-comparison');assert.equal(comparisonError.evidence.runs,tinyRuns);
const marker='main().catch(';const handlerStart=source.lastIndexOf(marker)+marker.length;assert.ok(handlerStart>=marker.length);const handlerExpression=source.slice(handlerStart,source.lastIndexOf(');'));
const output='/tmp/work-progress-runner-failure-probe-'+Date.now();const processMock={argv:['node','test','run','--out',output],exitCode:0};const logs=[];
const handler=vm.runInNewContext('('+handlerExpression+')',{resolve,dirname,mkdir:fs.promises.mkdir,writeFile:fs.promises.writeFile,gzipSync,Buffer,process:processMock,option:(args,name)=>args[args.indexOf(name)+1],console:{error:value=>logs.push(String(value))}});
await handler(comparisonError);const bytes=fs.readFileSync(output+'.failed.json.gz'),raw=gunzipSync(bytes),parsed=JSON.parse(raw);assert.equal(raw.at(-1),10);assert.equal(parsed.evidence.runs.length,2);assert.equal(parsed.evidence.phase,'cross-arm-and-driver-comparison');
await handler(comparisonError);assert.deepEqual(fs.readFileSync(output+'.failed.json.gz'),bytes);
const unsafe=toy();unsafe.exportWorld=w=>w.now>=20?{invalid:1n}:{toy:w};let unsafeError;try{executeHistory(unsafe,CASES[0],'event');}catch(error){unsafeError=error;}
assert.equal(unsafeError.evidence.snapshot,null);assert.match(unsafeError.evidence.snapshotError,/Non-JSON/);assert.equal(unsafeError.evidence.records.length,2);assert.doesNotThrow(()=>JSON.stringify(unsafeError.evidence));
const result={sourceHash:hash,scope:'Exact runner comparison catch and CLI failure handler extracted in isolation; no matrix or real arms',postComparisonEvidence:true,failureJsonParses:true,endsWithActualNewline:true,existingFailureNotOverwritten:true,unsafeCurrentExportDiagnostic:true,priorValidRecords:unsafeError.evidence.records.length,artifact:output+'.failed.json.gz'};fs.writeFileSync('/tmp/work-progress-runner-failure-probe-result.json',JSON.stringify(result,null,2));console.log(result);
