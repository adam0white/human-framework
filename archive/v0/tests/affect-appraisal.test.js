import test from 'node:test';
import assert from 'node:assert/strict';
import {createBeliefs,advanceBeliefs,receiveEvidence,retractEvidence,getBeliefView} from '../src/cognition/beliefs.js';
import {createPerson} from '../src/human/v0.1.1.js';
import {createSituatedPerson,advancePerson,getSituatedView,setPurpose} from '../src/person/index.js';
import {
  createAppraisal,advanceAppraisal,appraiseBeliefs,getAppraisalChoiceView,
  recordPaidRegulation,exportAppraisal,restoreAppraisal
} from '../src/affect/appraisal.js';

const personCatalog={actors:['actorA'],facts:[],purposes:['repair'],commitments:[],actions:[]};
const context={id:'route',purposeId:'repair',propositionId:'gateOpen',checkActionId:'check',deliberateActionId:'ask',reflectionActionId:'reflect'};
const start=()=>createAppraisal({ownerId:'actorA',now:0,contexts:[context],maxConcernMinutes:30,minReflectionMinutes:5});
const situated=()=>createSituatedPerson({human:createPerson({id:'actorA',body:{fatigue:0,hunger:0},skills:{}}),now:0,purposes:[{id:'repair',status:'active'}]},personCatalog);
const beliefs=()=>createBeliefs({ownerId:'actorA',now:0,propositions:['gateOpen'],sources:['sourceA','sourceB','relay']});
const report=(receiptId,originId,value,extra={})=>({receiptId,propositionId:'gateOpen',sourceId:originId,originId,value,observedAt:0,receivedAt:0,expiresAt:50,correctsReceiptId:null,...extra});
const appraise=(state,belief,situatedPerson)=>appraiseBeliefs(state,{contextId:'route',beliefView:getBeliefView(belief),situatedView:getSituatedView(situatedPerson,personCatalog)});
const choice=(state,situatedPerson)=>getAppraisalChoiceView(state,{contextId:'route',availableActionIds:['deliver','check','ask'],situatedView:getSituatedView(situatedPerson,personCatalog)});

test('unresolved actor belief makes check preferable without forcing an action',()=>{
  const actor=situated();
  const state=appraise(start(),beliefs(),actor);
  assert.deepEqual(choice(state,actor),{tendency:'check',preferredActionIds:['check'],expiresAt:30});
  assert.equal(getBeliefView(beliefs()).beliefs[0].status,'unknown');
});

test('a relayed copy of the same origin cannot extend a concern lifetime',()=>{
  const actor=situated();
  let belief=receiveEvidence(beliefs(),report('original','sourceA',true));
  belief=receiveEvidence(belief,report('opposite','sourceB',false));
  let state=appraise(start(),belief,actor);
  state=advanceAppraisal(state,10);
  belief=advanceBeliefs(belief,10);
  const movedActor=advancePerson(actor,10,personCatalog);
  belief=receiveEvidence(belief,report('relayCopy','sourceA',true,{sourceId:'relay',receivedAt:10}));
  state=appraise(state,belief,movedActor);
  assert.equal(choice(state,movedActor).expiresAt,30);
  state=advanceAppraisal(state,30);
  belief=advanceBeliefs(belief,30);
  const lateActor=advancePerson(movedActor,30,personCatalog);
  state=appraise(state,belief,lateActor);
  assert.equal(choice(state,lateActor).tendency,'none');
});

test('voluntarily selected paid reflection redirects a live tendency without resolving belief',()=>{
  const actor=advancePerson(situated(),5,personCatalog),belief=advanceBeliefs(beliefs(),5);
  let state=appraise(start(),beliefs(),situated());
  state=advanceAppraisal(state,5);
  const receipt={receiptId:'reflection1',at:5,contextId:'route',attemptId:'actorA:1',actionId:'reflect',elapsedMinutes:5,selectedByActor:true,completed:true};
  state=recordPaidRegulation(state,receipt);
  assert.deepEqual(choice(state,actor),{tendency:'deliberate',preferredActionIds:['ask'],expiresAt:30});
  assert.equal(getBeliefView(belief).beliefs[0].status,'unknown');
  assert.deepEqual(recordPaidRegulation(state,receipt),state);
  const later=advanceAppraisal(state,10);
  assert.deepEqual(recordPaidRegulation(later,receipt),later);
  assert.throws(()=>recordPaidRegulation(state,{...receipt,receiptId:'reflection2'}),/attempt|duplicate/i);
  assert.deepEqual(restoreAppraisal(exportAppraisal(state),'actorA'),state);
});

test('regulation requires actual paid interval after concern and cannot backdate',()=>{
  let state=appraise(start(),beliefs(),situated());
  state=advanceAppraisal(state,5);
  const receipt={receiptId:'reflection1',at:5,contextId:'route',attemptId:'actorA:1',actionId:'reflect',elapsedMinutes:5,selectedByActor:true,completed:true};
  assert.throws(()=>recordPaidRegulation(state,{...receipt,elapsedMinutes:6}),/interval|concern|start/i);
  assert.throws(()=>recordPaidRegulation(state,{...receipt,selectedByActor:false}),/selected|voluntary/i);
  assert.throws(()=>recordPaidRegulation(state,{...receipt,completed:false}),/completed|attempt/i);
  assert.throws(()=>recordPaidRegulation(state,{...receipt,actionId:'check'}),/reflection action/i);
});

test('resolved report or withdrawn purpose clears tendency without changing belief truth',()=>{
  const actor=situated();
  let state=appraise(start(),beliefs(),actor);
  const resolved=receiveEvidence(beliefs(),report('confirmed','sourceA',true));
  state=appraise(state,resolved,actor);
  assert.equal(choice(state,actor).tendency,'none');
  assert.equal(getBeliefView(resolved).beliefs[0].value,true);
  const withdrawn=setPurpose(actor,{id:'repair',status:'withdrawn'},personCatalog);
  assert.equal(choice(appraise(start(),beliefs(),withdrawn),withdrawn).tendency,'none');
});

test('owner and observed-time boundaries reject other actors and future views',()=>{
  const state=start(),actor=situated(),belief=beliefs();
  assert.throws(()=>appraiseBeliefs(state,{contextId:'route',beliefView:{...getBeliefView(belief),ownerId:'other'},situatedView:getSituatedView(actor,personCatalog)}),/owner/i);
  assert.throws(()=>appraiseBeliefs(state,{contextId:'route',beliefView:{...getBeliefView(belief),now:1},situatedView:getSituatedView(actor,personCatalog)}),/time|chronology/i);
  assert.throws(()=>restoreAppraisal(exportAppraisal(state),'other'),/owner/i);
});

test('resolution followed by a retraction starts a new uncertainty episode',()=>{
  let state=appraise(start(),beliefs(),situated());
  let belief=advanceBeliefs(beliefs(),1),actor=advancePerson(situated(),1,personCatalog);
  state=advanceAppraisal(state,1);
  belief=receiveEvidence(belief,report('confirmed','sourceA',true,{observedAt:1,receivedAt:1}));
  state=appraise(state,belief,actor);
  assert.equal(choice(state,actor).tendency,'none');
  belief=advanceBeliefs(belief,2);actor=advancePerson(actor,2,personCatalog);state=advanceAppraisal(state,2);
  belief=retractEvidence(belief,{receiptId:'withdrawal',targetReceiptId:'confirmed',sourceId:'sourceA',originId:'sourceA',receivedAt:2});
  state=appraise(state,belief,actor);
  assert.deepEqual(choice(state,actor),{tendency:'check',preferredActionIds:['check'],expiresAt:32});
});

test('snapshot cannot fabricate deliberate tendency without paid reflection evidence',()=>{
  const state=appraise(start(),beliefs(),situated());
  const forged=exportAppraisal(state);
  forged.appraisal.records[0].tendency='deliberate';
  assert.throws(()=>restoreAppraisal(forged,'actorA'),/paid|receipt|deliberate/i);
});

test('belief status must agree with origin and effective receipt evidence',()=>{
  const state=start(),actor=situated(),view=getBeliefView(beliefs());
  view.beliefs[0].status='conflict';
  assert.throws(()=>appraiseBeliefs(state,{contextId:'route',beliefView:view,situatedView:getSituatedView(actor,personCatalog)}),/conflict|origin|receipt/i);
});

test('snapshot rejects nonenumerable array entries',()=>{
  const forged=exportAppraisal(start());
  Object.defineProperty(forged.appraisal.contexts,0,{value:forged.appraisal.contexts[0],enumerable:false});
  assert.throws(()=>restoreAppraisal(forged,'actorA'),/array|data/i);
});
