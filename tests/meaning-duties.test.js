import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDuties,advanceDuties,receiveDutyNotice,recordStatedIntention,
  receiveRepairOutcome,getDutyView,getDutyPublicView,exportDuties,restoreDuties
} from '../src/meaning/duties.js';

const setup=()=>createDuties({ownerId:'borrower',now:0,cases:[{
  id:'entrusted-book',
  source:{kind:'revelation',locator:'https://quran.com/4/58',translationAttribution:'Mustafa Khattab, The Clear Quran'},
  interpretation:{summary:'A case-specific entrusted-property reading, pending review',school:'Hanafi-Maturidi starting point',reviewStatus:'unreviewed'},
  requirements:[{id:'return-book',requiredAmount:1},{id:'replace-damage',requiredAmount:2}]
}]});

test('source, scenario interpretation, understanding and intention remain distinct',()=>{
  const first=setup();
  assert.equal(getDutyView(first).cases[0].source.locator,'https://quran.com/4/58');
  assert.equal(getDutyView(first).cases[0].interpretation.reviewStatus,'unreviewed');
  const noticed=receiveDutyNotice(first,{id:'notice1',at:0,caseId:'entrusted-book',sourceActorId:'lender',understanding:'Return the book and repair its damage',stance:'accepted',disclosedTo:[]});
  const intended=recordStatedIntention(noticed,{id:'intent1',at:0,caseId:'entrusted-book',statement:'I will return it tomorrow',disclosedTo:[]});
  assert.equal(getDutyView(intended).notices.length,1);
  assert.equal(getDutyView(intended).intentions.length,1);
  assert.equal(getDutyView(intended).repairs['entrusted-book'].status,'unrepaired');
  assert.equal(getDutyPublicView(intended,'lender').notices.length,0);
  assert.equal(getDutyPublicView(intended,'lender').intentions.length,0);
  assert.equal(getDutyView(first).notices.length,0);
});

test('failed and partial restitution do not complete an authored repair',()=>{
  let state=setup();
  state=receiveRepairOutcome(state,{id:'failed1',at:0,caseId:'entrusted-book',kind:'restitution',requirementId:'return-book',amount:0,outcomeId:'attempt-failed',disclosedTo:[]});
  assert.equal(getDutyView(state).repairs['entrusted-book'].status,'unrepaired');
  state=receiveRepairOutcome(state,{id:'return1',at:0,caseId:'entrusted-book',kind:'restitution',requirementId:'return-book',amount:1,outcomeId:'book-received',disclosedTo:['lender']});
  assert.equal(getDutyView(state).repairs['entrusted-book'].status,'partial');
  assert.equal(getDutyView(state).repairs['entrusted-book'].requirements[0].completedAmount,1);
  assert.equal(getDutyPublicView(state,'lender').outcomes.length,1);
  assert.equal(getDutyPublicView(state,'other').outcomes.length,0);
  assert.throws(()=>receiveRepairOutcome(state,{id:'second-receipt',at:0,caseId:'entrusted-book',kind:'restitution',requirementId:'replace-damage',amount:1,outcomeId:'book-received',disclosedTo:[]}));
  assert.throws(()=>receiveRepairOutcome(state,{id:'over',at:0,caseId:'entrusted-book',kind:'restitution',requirementId:'return-book',amount:1,outcomeId:'duplicate-return',disclosedTo:[]}));
  state=receiveRepairOutcome(state,{id:'damage1',at:0,caseId:'entrusted-book',kind:'restitution',requirementId:'replace-damage',amount:2,outcomeId:'damage-replaced',disclosedTo:[]});
  assert.equal(getDutyView(state).repairs['entrusted-book'].status,'completed');
});

test('recipient response is independent of restitution',()=>{
  let state=setup();
  state=receiveRepairOutcome(state,{id:'refusal',at:0,caseId:'entrusted-book',kind:'recipient-response',recipientId:'lender',response:'refused',disclosedTo:['borrower']});
  assert.equal(getDutyView(state).repairs['entrusted-book'].status,'unrepaired');
  assert.equal(getDutyView(state).recipientResponses[0].response,'refused');
  state=receiveRepairOutcome(state,{id:'return1',at:0,caseId:'entrusted-book',kind:'restitution',requirementId:'return-book',amount:1,outcomeId:'book-received',disclosedTo:[]});
  state=receiveRepairOutcome(state,{id:'damage1',at:0,caseId:'entrusted-book',kind:'restitution',requirementId:'replace-damage',amount:2,outcomeId:'damage-replaced',disclosedTo:[]});
  assert.equal(getDutyView(state).repairs['entrusted-book'].status,'completed');
  assert.equal(getDutyView(state).recipientResponses[0].response,'refused');
});

test('explicit communication controls observer view and owner restore',()=>{
  let state=setup();
  state=recordStatedIntention(state,{id:'intent1',at:0,caseId:'entrusted-book',statement:'I plan to return the book',disclosedTo:['lender']});
  state=receiveDutyNotice(state,{id:'notice1',at:0,caseId:'entrusted-book',sourceActorId:'lender',understanding:'I owe the book back',stance:'accepted',disclosedTo:['lender']});
  assert.equal(getDutyPublicView(state,'lender').intentions.length,1);
  assert.equal(getDutyPublicView(state,'other').intentions.length,0);
  assert.equal(getDutyPublicView(state,'lender').notices.length,1);
  const restored=restoreDuties(JSON.parse(JSON.stringify(exportDuties(state))),'borrower');
  assert.deepEqual(restored,state);
  assert.throws(()=>restoreDuties(exportDuties(state),'other'));
  const forged=exportDuties(state);
  forged.state.intentions[0].disclosedTo.push('other');
  assert.equal(getDutyPublicView(state,'other').intentions.length,0);
  assert.deepEqual(receiveDutyNotice(state,{id:'notice1',at:0,caseId:'entrusted-book',sourceActorId:'lender',understanding:'I owe the book back',stance:'accepted',disclosedTo:['lender']}),state);
  assert.throws(()=>receiveDutyNotice(state,{id:'notice1',at:0,caseId:'entrusted-book',sourceActorId:'lender',understanding:'Different interpretation',stance:'accepted',disclosedTo:['lender']}));
});

test('chronology and bounded histories reject invalid receipts',()=>{
  let state=advanceDuties(setup(),10);
  assert.throws(()=>advanceDuties(state,9));
  assert.throws(()=>recordStatedIntention(state,{id:'future',at:11,caseId:'entrusted-book',statement:'Tomorrow',disclosedTo:[]}));
  assert.throws(()=>receiveRepairOutcome(state,{id:'fake',at:10,caseId:'entrusted-book',kind:'restitution',requirementId:'return-book',amount:1,outcomeId:'receipt',disclosedTo:[],status:'completed'}));
  for(let i=0;i<128;i++)state=recordStatedIntention(state,{id:`statement${i}`,at:10,caseId:'entrusted-book',statement:`Statement ${i}`,disclosedTo:[]});
  assert.throws(()=>recordStatedIntention(state,{id:'overflow',at:10,caseId:'entrusted-book',statement:'More',disclosedTo:[]}));
});

test('historical receipt remains valid after later chronology and restore',()=>{
  let state=setup();
  state=receiveDutyNotice(state,{id:'notice1',at:0,caseId:'entrusted-book',sourceActorId:'lender',understanding:'Return the book',stance:'accepted',disclosedTo:[]});
  state=advanceDuties(state,20);
  assert.equal(getDutyView(state).notices[0].at,0);
  assert.deepEqual(restoreDuties(exportDuties(state),'borrower'),state);
  state=receiveRepairOutcome(state,{id:'later-return',at:20,caseId:'entrusted-book',kind:'restitution',requirementId:'return-book',amount:1,outcomeId:'returned-later',disclosedTo:[]});
  state=advanceDuties(state,30);
  assert.equal(getDutyView(state).repairs['entrusted-book'].status,'partial');
});

test('uncertain and rejected application remain actor-local notices, not outcomes',()=>{
  let state=setup();
  state=receiveDutyNotice(state,{id:'uncertain1',at:0,caseId:'entrusted-book',sourceActorId:'lender',understanding:'I may owe a replacement',stance:'uncertain',disclosedTo:[]});
  state=receiveDutyNotice(state,{id:'rejected1',at:0,caseId:'entrusted-book',sourceActorId:'lender',understanding:'I do not accept that replacement applies',stance:'rejected',disclosedTo:[]});
  assert.equal(getDutyView(state).notices.findLast(item=>item.caseId==='entrusted-book').stance,'rejected');
  assert.equal(getDutyView(state).repairs['entrusted-book'].status,'unrepaired');
  assert.deepEqual(getDutyPublicView(state,'lender').notices,[]);
  assert.throws(()=>receiveDutyNotice(state,{id:'invalid1',at:0,caseId:'entrusted-book',sourceActorId:'lender',understanding:'No stance',disclosedTo:[]}));
  assert.throws(()=>receiveDutyNotice(state,{id:'invalid2',at:0,caseId:'entrusted-book',sourceActorId:'lender',understanding:'Bad stance',stance:'compelled',disclosedTo:[]}));
});
