import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerson} from '../src/human/v0.1.1.js';
import {createSituatedPerson} from '../src/person/index.js';
import {createSustainedPerson,createLearning} from '../src/development/index.js';
import {createBeliefs} from '../src/cognition/beliefs.js';
import {createRelationships} from '../src/social/relationships.js';
import {createDuties} from '../src/meaning/duties.js';
import {createAdultCourse} from '../src/lifecourse/adult.js';
import {createAppraisal} from '../src/affect/appraisal.js';
import {
  createDevelopingPerson,advanceDevelopingPerson,beginDevelopingAttempt,
  advanceDevelopingAttempt,finishDevelopingAttempt,advanceDevelopingCalendar,
  updateDevelopingComponent,getDevelopingView,exportDevelopingPerson,
  restoreDevelopingPerson
} from '../src/developing/person.js';

const catalog={actors:['adam','neighbor'],facts:[],purposes:['repair'],commitments:[],actions:['work','reflect']};
const dutyCases=[{id:'book',source:{kind:'revelation',locator:'https://quran.com/4/58',translationAttribution:'Mustafa Khattab'},interpretation:{summary:'Authored property return case',school:'Hanafi-Maturidi starting point',reviewStatus:'unreviewed'},requirements:[{id:'return',requiredAmount:1}]}];
const adultCatalog={actors:['adam','neighbor'],skills:['support'],qualifications:[{id:'teaching',skillId:'support',minimumSkill:.1}],roles:[],opportunities:[]};
const context={id:'route',purposeId:'repair',propositionId:'gateOpen',checkActionId:'work',deliberateActionId:'reflect',reflectionActionId:'reflect'};
function components(){
  const human=createPerson({id:'adam',body:{fatigue:.1,hunger:.1},skills:{support:.2,other:.3}});
  return {
    sustained:createSustainedPerson({situated:createSituatedPerson({human,now:0,purposes:[{id:'repair',status:'active'}]},catalog),learning:createLearning({skills:['support']})},catalog),
    beliefs:createBeliefs({ownerId:'adam',now:0,propositions:['gateOpen'],sources:['adam','neighbor']}),
    relationships:createRelationships({ownerId:'adam',now:0,actors:catalog.actors,contexts:['care'],ties:[{otherId:'neighbor',care:'active'}]}),
    duties:createDuties({ownerId:'adam',now:0,cases:dutyCases}),
    course:createAdultCourse({actorId:'adam',startDay:0,ageAtStartYears:30,catalog:adultCatalog}),
    appraisal:createAppraisal({ownerId:'adam',now:0,contexts:[context],maxConcernMinutes:30,minReflectionMinutes:5})
  };
}
const start=()=>createDevelopingPerson(components(),catalog);
const action=(id='work',durationMinutes=10)=>({actionId:id,durationMinutes,activity:'active',effort:0,exertive:false,skill:id==='reflect'?null:'support'});
function finish(state,status='completed') {
  return finishDevelopingAttempt(state,{attemptId:state.sustained.situated.human.pending.id,status,mealConsumed:false},catalog);
}

test('one lifecycle owner advances all observed clocks through split paid attempts',()=>{
  let split=beginDevelopingAttempt(start(),action(),catalog);
  split=advanceDevelopingAttempt(split,5,catalog);
  split=advanceDevelopingAttempt(split,5,catalog);
  split=finish(split);
  let whole=beginDevelopingAttempt(start(),action(),catalog);
  whole=advanceDevelopingAttempt(whole,10,catalog);
  whole=finish(whole);
  for(const field of ['fatigue','hunger'])assert.ok(Math.abs(split.sustained.situated.human.body[field]-whole.sustained.situated.human.body[field])<1e-12);
  const normalized=structuredClone(split);
  normalized.sustained.situated.human.body=structuredClone(whole.sustained.situated.human.body);
  assert.deepEqual(normalized,whole);
  assert.equal(split.sustained.situated.now,10);
  assert.equal(split.beliefs.now,10);
  assert.equal(split.relationships.now,10);
  assert.equal(split.duties.now,10);
  assert.equal(split.appraisal.now,10);
  assert.deepEqual(split.lastAttempt,{attemptId:'adam:1',actionId:'work',startedAt:0,finishedAt:10,elapsedMinutes:10,status:'completed'});
});

test('calendar years advance separately and cannot infer body change or skip pending work',()=>{
  const initial=start(),before=initial.sustained.situated.human.body;
  const moved=advanceDevelopingCalendar(initial,{toDay:365,kind:'unmodeled'},catalog);
  assert.equal(moved.course.day,365);
  assert.equal(moved.sustained.situated.now,0);
  assert.deepEqual(moved.sustained.situated.human.body,before);
  assert.deepEqual(initial.course.intervals,[]);
  assert.throws(()=>advanceDevelopingCalendar(beginDevelopingAttempt(initial,action(),catalog),{toDay:1,kind:'unmodeled'},catalog),/pending/i);
});

test('failed receipts leave all component state unchanged',()=>{
  const initial=start(),before=structuredClone(initial);
  assert.throws(()=>updateDevelopingComponent(initial,{kind:'duty-notice',input:{id:'notice',at:1,caseId:'book',sourceActorId:'neighbor',understanding:'Return the book',stance:'accepted',disclosedTo:[]}},catalog),/time|current/i);
  assert.deepEqual(initial,before);
  assert.throws(()=>updateDevelopingComponent(initial,{kind:'unknown',input:{}},catalog),/kind/i);
});

test('appraisal consumes internal views and paid regulation derives actual completed attempt',()=>{
  let person=updateDevelopingComponent(start(),{kind:'appraise',input:{contextId:'route'}},catalog);
  assert.equal(getDevelopingView(person,catalog,{appraisal:{contextId:'route',availableActionIds:['work','reflect']}}).appraisal.tendency,'check');
  person=beginDevelopingAttempt(person,action('reflect',5),catalog);
  person=advanceDevelopingAttempt(person,5,catalog);
  person=finish(person);
  person=updateDevelopingComponent(person,{kind:'regulate',input:{contextId:'route',receiptId:'reflection1',selectedByActor:true}},catalog);
  assert.equal(getDevelopingView(person,catalog,{appraisal:{contextId:'route',availableActionIds:['work','reflect']}}).appraisal.tendency,'deliberate');
  assert.equal(person.appraisal.receipts[0].attemptId,'adam:1');
  assert.equal(person.appraisal.receipts[0].elapsedMinutes,5);
  assert.deepEqual(updateDevelopingComponent(person,{kind:'regulate',input:{contextId:'route',receiptId:'reflection1',selectedByActor:true}},catalog),person);
});

test('stale, unfinished or failed attempts cannot count as paid reflection',()=>{
  let person=updateDevelopingComponent(start(),{kind:'appraise',input:{contextId:'route'}},catalog);
  assert.throws(()=>updateDevelopingComponent(person,{kind:'regulate',input:{contextId:'route',receiptId:'premature',selectedByActor:true}},catalog),/attempt|completed/i);
  person=beginDevelopingAttempt(person,action('reflect',5),catalog);
  assert.throws(()=>updateDevelopingComponent(person,{kind:'regulate',input:{contextId:'route',receiptId:'pending',selectedByActor:true}},catalog),/pending|attempt/i);
  person=advanceDevelopingAttempt(person,5,catalog);
  person=finish(person,'failed');
  assert.throws(()=>updateDevelopingComponent(person,{kind:'regulate',input:{contextId:'route',receiptId:'failed',selectedByActor:true}},catalog),/completed/i);
});

test('cross-component restore enforces owner, time and saved attempt integrity',()=>{
  let person=advanceDevelopingPerson(start(),{to:5,mode:'awake'},catalog);
  assert.deepEqual(restoreDevelopingPerson(exportDevelopingPerson(person,catalog),catalog,'adam'),person);
  assert.throws(()=>restoreDevelopingPerson(exportDevelopingPerson(person,catalog),catalog,'other'),/owner/i);
  const forged=exportDevelopingPerson(person,catalog);
  forged.person.relationships.now=4;
  assert.throws(()=>restoreDevelopingPerson(forged,catalog,'adam'),/clock|time|chronology/i);
});

test('creation rejects cross actor and cross clock components',()=>{
  const wrongOwner=components();wrongOwner.relationships.ownerId='neighbor';
  assert.throws(()=>createDevelopingPerson(wrongOwner,catalog),/owner/i);
  const wrongTime=components();wrongTime.appraisal.now=1;
  assert.throws(()=>createDevelopingPerson(wrongTime,catalog),/clock|time/i);
});

test('dispatch delivers real actor receipts and blocks all commands during pending work',()=>{
  const evidence={receiptId:'report1',propositionId:'gateOpen',sourceId:'neighbor',originId:'neighbor',value:true,observedAt:0,receivedAt:0,expiresAt:30,correctsReceiptId:null};
  let person=updateDevelopingComponent(start(),{kind:'evidence',input:evidence},catalog);
  assert.equal(getDevelopingView(person,catalog).beliefs.beliefs[0].status,'resolved');
  person=updateDevelopingComponent(person,{kind:'duty-notice',input:{id:'notice1',at:0,caseId:'book',sourceActorId:'neighbor',understanding:'Return the book',stance:'accepted',disclosedTo:[]}},catalog);
  assert.equal(getDevelopingView(person,catalog).duties.notices.length,1);
  person=updateDevelopingComponent(person,{kind:'care',input:{actorId:'adam',otherId:'neighbor',care:'inactive',at:0}},catalog);
  assert.equal(getDevelopingView(person,catalog,{relationship:{otherId:'neighbor',contextId:'care'}}).relationships.care,'inactive');
  const pending=beginDevelopingAttempt(person,action(),catalog);
  assert.throws(()=>updateDevelopingComponent(pending,{kind:'evidence',input:{...evidence,receiptId:'report2'}},catalog),/pending/i);
  assert.throws(()=>advanceDevelopingPerson(pending,{to:1,mode:'awake'},catalog),/pending/i);
});

test('restored last attempt must be the actual most recent Human attempt counter',()=>{
  let person=beginDevelopingAttempt(start(),action('work',5),catalog);
  person=finish(advanceDevelopingAttempt(person,5,catalog));
  person=beginDevelopingAttempt(person,action('work',5),catalog);
  person=finish(advanceDevelopingAttempt(person,5,catalog));
  assert.equal(person.lastAttempt.attemptId,'adam:2');
  const forged=exportDevelopingPerson(person,catalog);
  forged.person.lastAttempt.attemptId='adam:1';
  assert.throws(()=>restoreDevelopingPerson(forged,catalog,'adam'),/counter|attempt/i);
});

test('qualification assessment projects only registered adult skills from multispecialty Human',()=>{
  const receipt={receiptId:'award1',atDay:0,id:'teaching',kind:'awarded',assessorId:'neighbor',evidenceRef:'assessment1',deliveredTo:'adam'};
  const person=updateDevelopingComponent(start(),{kind:'qualification',input:receipt},catalog);
  assert.deepEqual(getDevelopingView(person,catalog).course.qualifications,['teaching']);
  assert.equal(person.sustained.situated.human.skills.other,.3);
});

test('restoration rejects accessor fields before reading or spreading them',()=>{
  const forged=exportDevelopingPerson(start(),catalog);
  let called=false;
  Object.defineProperty(forged.person,'beliefs',{enumerable:true,get(){called=true;return components().beliefs;}});
  assert.throws(()=>restoreDevelopingPerson(forged,catalog,'adam'),/data|field|invalid/i);
  assert.equal(called,false);
});

test('calendar jump retires prior episode attempt payment',()=>{
  let person=updateDevelopingComponent(start(),{kind:'appraise',input:{contextId:'route'}},catalog);
  person=beginDevelopingAttempt(person,action('reflect',5),catalog);
  person=finish(advanceDevelopingAttempt(person,5,catalog));
  person=advanceDevelopingCalendar(person,{toDay:365,kind:'unmodeled'},catalog);
  assert.equal(person.lastAttempt,null);
  assert.throws(()=>updateDevelopingComponent(person,{kind:'regulate',input:{contextId:'route',receiptId:'stale',selectedByActor:true}},catalog),/attempt|completed/i);
});

test('pending snapshot cannot retain earlier completed payment proof',()=>{
  let person=beginDevelopingAttempt(start(),action('work',5),catalog);
  person=finish(advanceDevelopingAttempt(person,5,catalog));
  const oldAttempt=structuredClone(person.lastAttempt);
  person=beginDevelopingAttempt(person,action('work',5),catalog);
  assert.equal(person.lastAttempt,null);
  const forged=exportDevelopingPerson(person,catalog);
  forged.person.lastAttempt=oldAttempt;
  assert.throws(()=>restoreDevelopingPerson(forged,catalog,'adam'),/pending|attempt/i);
});
