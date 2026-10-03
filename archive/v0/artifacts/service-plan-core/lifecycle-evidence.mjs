import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as h from '../../src/games/service-plan.js';
import * as old from '../../src/games/service.js';
const root=new URL('../../',import.meta.url).pathname,out=process.argv[2];
if(!out)throw Error('Supply a fresh output path.');
const hash=x=>createHash('sha256').update(x).digest('hex');
const json=x=>JSON.parse(JSON.stringify(x));
const sourcePaths=['src/games/service-plan.js','src/games/service.js','src/human/v0.1.1.js','src/runtime/index.js','src/runtime/clock.js','src/core/model.js','scripts/runtime-release-lock.json','tests/service-plan.test.js','docs/service-plan-design.md','artifacts/service-plan-core/lifecycle-evidence.mjs','artifacts/service-day/late-timed-request-control.json'];
const sourceSha256=Object.fromEntries(sourcePaths.map(p=>[p,hash(readFileSync(root+p))]));
assert.equal(sourceSha256['src/games/service.js'],'50ce6e3e52a9e92c85532f3a73d8afa46e6bc0ca7993ef72ce9e4f58e51738d1');
const original=JSON.parse(readFileSync(new URL('../service-day/late-timed-request-control.json',import.meta.url)));
const S={pumpStartAt:39,readyBy:45,waitUntil:45,fallback:'cart'},R={pumpStartAt:47,readyBy:53,waitUntil:53,fallback:'none'};
const q=(actor,task)=>({type:'request',actor,task}),a=to=>({type:'advance',to}),p=terms=>({type:'propose',terms}),stop=actor=>({type:'stop',actor});
const safePrefix=[q('keeper','meal'),a(4),q('keeper','gate'),a(10),q('keeper','gate'),a(16),q('keeper','salvage'),a(24),q('keeper','rest'),a(37)];
function apply(s,c){if(c.type==='request')return h.requestTask(s,c.actor,c.task);if(c.type==='stop')return h.interruptTask(s,c.actor);if(c.type==='advance')return h.advanceTo(s,c.to);if(c.type==='propose')return h.proposePlan(s,c.terms);if(c.type==='interrupt-discussion')return h.interruptDiscussion(s,c.actor);if(c.type==='withdraw')return h.withdrawContribution(s);throw Error(`Unknown ${c.type}`);}
function replay(commands){let s=h.createServicePlan();for(const c of commands)s=apply(s,c);return s;}
const checkpoint=replay(original.checkpointAt41.commands),oldCheckpoint=old.restoreService(original.checkpointAt41);
for(const field of ['people','jobs','parts','food','eaten','work','salvaged','reopenedAt','morning','delivery','installedPartsByActor','handedOver'])assert.deepEqual(checkpoint[field],oldCheckpoint[field],field);
for(const actor of ['keeper','partner']){const {discuss,...paid}=checkpoint.paidByActor[actor];assert.equal(discuss,0);assert.deepEqual(paid,oldCheckpoint.paidByActor[actor]);}
const definitions=[
 {id:'short-full',prefix:safePrefix,actions:[p(S),a(39),q('keeper','pump'),a(64)],units:2,arrival:51},
 {id:'short-missed-fallback',prefix:safePrefix,actions:[p(S),a(64)],units:1,arrival:63},
 {id:'retained-gate-risky-full',prefix:original.checkpointAt41.commands,actions:[p(R),a(43),q('keeper','rest'),a(47),stop('keeper'),q('keeper','pump'),a(64)],units:2,arrival:59},
 {id:'retained-gate-unperformed-rest-capacity-refusal',prefix:original.checkpointAt41.commands,actions:[p(R),a(43),a(47),q('keeper','pump'),a(64)],units:0,arrival:null,refusal:'CAPACITY'},
 {id:'useful-revision',prefix:safePrefix,actions:[p(S),a(39),q('keeper','rest'),a(41),stop('keeper'),p(R),a(43),q('keeper','rest'),a(47),stop('keeper'),q('keeper','pump'),a(64)],units:2,arrival:59},
 {id:'refused-revision-keeps-old-fallback',prefix:safePrefix,actions:[p(S),a(39),p({...R,pumpStartAt:53}),a(41),a(64)],units:1,arrival:63},
 {id:'interrupted-revision-keeps-old-fallback',prefix:safePrefix,actions:[p(S),a(39),p(R),a(40),{type:'interrupt-discussion',actor:'keeper'},a(64)],units:1,arrival:63},
 {id:'revision-expiry-tie',prefix:safePrefix,actions:[p(S),a(39),a(43),p(R),a(45),a(64)],units:1,arrival:63},
 {id:'withdrawal-does-not-erase-independent-clinic-work',prefix:safePrefix,actions:[p(S),a(39),q('keeper','pump'),{type:'withdraw'},a(64)],units:1,arrival:60},
];
const cases=definitions.map(d=>{
 let s=replay(d.prefix);const initialSave=h.exportServicePlan(s),steps=[];
 for(const command of d.actions){const at=s.clock.now;s=apply(s,command);const saved=h.exportServicePlan(s);assert.deepEqual(h.restoreServicePlan(json(saved)),s);assert.ok(Buffer.byteLength(JSON.stringify(saved))<65536);const v=h.getServicePlanView(s);steps.push({at,command,response:command.type==='advance'?null:s.lastResponse,minute:s.clock.now,plan:v.coordination.current,planResponse:v.coordination.lastResponse,slot:v.coordination.slot,readiness:v.coordination.readiness,jobs:v.jobs,paidByActor:v.paidByActor,actualBody:Object.fromEntries(['keeper','partner'].map(id=>[id,s.people[id].body])),saveSha256:hash(JSON.stringify(saved))});}
 assert.equal(s.outcome.clinicUnits,d.units,d.id);assert.equal(s.delivery?.at??null,d.arrival,d.id);if(d.refusal)assert.ok(steps.some(x=>x.response?.code===d.refusal),d.id);
 const finalSave=h.exportServicePlan(s);return {id:d.id,initialSave,steps,outcome:s.outcome,delivery:s.delivery,coordination:s.coordination,paidByActor:s.paidByActor,resources:h.getServicePlanView(s).resources,finalSave,activeSaveBytes:Buffer.byteLength(JSON.stringify(finalSave)),commandCount:s.commands.length,resumeEqualAfterEveryAction:true};
});
const result={format:'service-plan-core-lifecycle-evidence',version:1,createdAt:new Date().toISOString(),executionCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),nodeVersion:process.version,scope:'Exploratory core lifecycle execution, not reserved comparison outcomes or human validation. Private direct host; no new portable faculty.',sourceSha256,retainedGateCheckpointPhysicalParity:true,existingTimedRequestControl:{source:'artifacts/service-day/late-timed-request-control.json',delivery:original.delivery,paidDenizRest:original.paidByActor.partner.rest},cases};
writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,cases:cases.map(c=>({id:c.id,units:c.outcome.clinicUnits,arrival:c.delivery?.at??null,discussion:c.paidByActor.partner.discuss,keeperRest:c.paidByActor.keeper.rest,partnerRest:c.paidByActor.partner.rest,saveBytes:c.activeSaveBytes,commands:c.commandCount})),retainedGateCheckpointPhysicalParity:true},null,2));
