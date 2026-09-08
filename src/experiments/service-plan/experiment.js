import assert from 'node:assert/strict';
import {selectCases,chooseCommand} from './cases.js';
import {hash} from './provenance.js';
import {loadVisiblePump} from './visible-pump.js';
export async function hostFor(arm){
 const original=arm.startsWith('original-');
 const module=original?await import('../../games/service.js'):arm==='visible-pump'?await loadVisiblePump():await import('../../games/service-plan.js');
 return {...module,create:original?module.createService:module.createServicePlan,view:original?module.getServiceView:module.getServicePlanView,save:original?module.exportService:module.exportServicePlan,restore:original?module.restoreService:module.restoreServicePlan};
}
function decisionFacts(v){
 return {now:v.now,jobs:v.jobs,work:v.work,supply:v.supply,ownedParts:v.resources.parts,keeperPumpEstimate:v.choices.keeper.find(x=>x.task==='pump')?.capacityEstimate??null,currentPlan:v.coordination?.current?{id:v.coordination.current.id,terms:v.coordination.current.terms,status:v.coordination.current.status}:null,pending:v.coordination?.pending?{id:v.coordination.pending.id,endsAt:v.coordination.pending.endsAt}:null};
}
function projection(v){
 return {now:v.now,morning:v.morning,delivery:v.delivery,outcome:v.outcome,work:v.work,resources:v.resources,paidByActor:v.paidByActor,people:Object.fromEntries(Object.entries(v.people).map(([a,p])=>[a,{body:p.body}])),coordination:v.coordination??null};
}
function apply(h,s,c,receipts){
 if(c.type==='advance')return h.advanceTo(s,c.to);
 if(c.type==='request')return h.requestTask(s,c.actor,c.task);
 if(c.type==='interrupt')return h.interruptTask(s,c.actor);
 if(c.type==='propose')return h.proposePlan(s,c.terms);
 if(c.type==='withdraw')return h.withdrawContribution(s);
 if(c.type==='interrupt-discussion')return h.interruptDiscussion(s,c.actor);
 if(c.type==='response')return h.receivePlanResponse(s,receipts[c.receipt]);
 throw Error('Unknown prescribed command.');
}
export async function runTrial(condition){
 const h=await hostFor(condition.arm);let s=h.create(),index=0,maxSaveBytes=0,maxSaveCharacters=0;const commands=[],receipts={},violations=[];
 const initialSaveSha256=hash(h.save(s));
 for(let n=0;n<256&&!h.view(s).outcome;n++){
  const view=h.view(s),next=chooseCommand(structuredClone(view),condition.steps,index);if(!next)break;index=next.nextIndex;
  const before=h.save(s),c=next.command;let thrown=null;
  try{s=apply(h,s,c,receipts);if(c.expectError)violations.push('Expected defensive response rejection did not occur.');}
  catch(e){thrown={code:e.code??null,message:e.message};assert.deepEqual(h.save(s),before);if(!c.expectError)violations.push(`Unexpected ${c.type} error: ${e.code??e.message}`);}
  const after=h.view(s),saved=h.save(s),serialized=JSON.stringify(saved);assert.deepEqual(h.restore(JSON.parse(serialized)),s);
  maxSaveBytes=Math.max(maxSaveBytes,Buffer.byteLength(serialized));maxSaveCharacters=Math.max(maxSaveCharacters,serialized.length);
  if(after.coordination?.pending&&!receipts.first)receipts.first=structuredClone(after.coordination.pending.receipt);
  commands.push({at:view.now,command:c,decisionFacts:decisionFacts(view),response:after.lastResponse??null,planResponse:after.coordination?.lastResponse??null,error:thrown,saveSha256:hash(saved)});
 }
 const v=h.view(s);if(!v.outcome)violations.push('Prescribed script did not reach closing.');
 if(v.outcome)for(const a of ['keeper','partner'])assert.equal(Object.values(v.paidByActor[a]).reduce((x,y)=>x+y,0),64);
 assert.ok(maxSaveCharacters<=65536);
 const trial={id:condition.id,family:condition.family,arm:condition.arm,variant:condition.variant,partition:condition.partition,status:violations.length?'ended-with-errors':'ended',violations,initialSaveSha256,commands,commandCount:commands.length,final:projection(v),finalSaveSha256:hash(h.save(s)),maxSaveBytes,maxSaveCharacters,replayEqual:false};
 assert.equal(await replayTrial(trial),trial.finalSaveSha256);trial.replayEqual=true;return trial;
}
export async function replayTrial(trial){
 const h=await hostFor(trial.arm);let s=h.create();const receipts={};assert.equal(hash(h.save(s)),trial.initialSaveSha256);
 for(const entry of trial.commands){
  assert.deepEqual(decisionFacts(h.view(s)),entry.decisionFacts);let thrown=null;
  try{s=apply(h,s,entry.command,receipts);}catch(e){thrown={code:e.code??null,message:e.message};}
  assert.deepEqual(thrown,entry.error);assert.equal(hash(h.save(s)),entry.saveSha256);
  assert.deepEqual(h.view(s).lastResponse??null,entry.response);
  assert.deepEqual(h.view(s).coordination?.lastResponse??null,entry.planResponse);
  s=h.restore(JSON.parse(JSON.stringify(h.save(s))));const pending=h.view(s).coordination?.pending;
  if(pending&&!receipts.first)receipts.first=structuredClone(pending.receipt);
 }
 assert.deepEqual(projection(h.view(s)),trial.final);
 return hash(h.save(s));
}
export async function runComparison({partition='development',unseal=false}={}){
 const conditions=selectCases(partition,{unseal}),trials=[];
 for(const c of conditions)trials.push(await runTrial(c));
 return {format:'service-plan-comparison',version:1,partition,trials};
}
