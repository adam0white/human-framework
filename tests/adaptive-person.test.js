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
import {createDevelopingPerson} from '../src/developing/person.js';
import {createHabits} from '../src/adaptation/habits.js';
import {
  createAdaptivePerson,beginAdaptiveAttempt,advanceAdaptiveAttempt,finishAdaptiveAttempt,
  advanceAdaptivePerson,advanceAdaptiveCalendar,updateAdaptiveComponent,acceptAdaptiveRevision,
  getAdaptiveView,exportAdaptivePerson,restoreAdaptivePerson
} from '../src/adaptive/index.js';

const catalog={actors:['adam','neighbor'],facts:[],purposes:['repair','care'],commitments:[],actions:['work','review']};
const dutyCases=[{id:'book',source:{kind:'revelation',locator:'https://quran.com/4/58',translationAttribution:'Mustafa Khattab'},interpretation:{summary:'Authored property return case',school:'Hanafi-Maturidi starting point',reviewStatus:'unreviewed'},requirements:[{id:'return',requiredAmount:1}]}];
function initial(fatigue=.1){
  const human=createPerson({id:'adam',body:{fatigue,hunger:.1},skills:{support:.2}});
  const situated=createSituatedPerson({human,now:0,purposes:[{id:'repair',status:'active'},{id:'care',status:'withdrawn'}]},catalog);
  const person=createDevelopingPerson({
    sustained:createSustainedPerson({situated,learning:createLearning({skills:['support']})},catalog),
    beliefs:createBeliefs({ownerId:'adam',now:0,propositions:['gateOpen'],sources:['adam','neighbor']}),
    relationships:createRelationships({ownerId:'adam',now:0,actors:catalog.actors,contexts:['care'],ties:[]}),
    duties:createDuties({ownerId:'adam',now:0,cases:dutyCases}),
    course:createAdultCourse({actorId:'adam',startDay:0,ageAtStartYears:30,catalog:{actors:catalog.actors,skills:['support'],qualifications:[],roles:[],opportunities:[]}}),
    appraisal:createAppraisal({ownerId:'adam',now:0,contexts:[],maxConcernMinutes:30,minReflectionMinutes:5})
  },catalog);
  const habits=createHabits({ownerId:'adam',now:0,
    habits:[{id:'routine',cueId:'toolsOut',purposeId:'repair',actions:['work'],threshold:2}],
    revisions:[{id:'changeAim',fromPurposeId:'repair',toPurposeId:'care',cueId:'toolsOut',failedActionIds:['work'],reviewActionId:'review',minFailures:2,minReviewMinutes:5}]});
  return createAdaptivePerson({person,habits},catalog);
}
const action=(actionId='work',durationMinutes=5)=>({actionId,durationMinutes,activity:'active',effort:0,exertive:false,skill:actionId==='work'?'support':null});
function run(state,{actionId='work',status='completed',cueId='toolsOut',purposeId='repair',durationMinutes=5,elapsedMinutes=durationMinutes}={}){
  state=beginAdaptiveAttempt(state,{action:action(actionId,durationMinutes),cueId,purposeId},catalog);
  state=advanceAdaptiveAttempt(state,elapsedMinutes,catalog);
  const attemptId=state.person.sustained.situated.human.pending.id;
  return finishAdaptiveAttempt(state,{attemptId,status,mealConsumed:false},catalog);
}

test('actual completed attempts under a cue suggest only a currently available action',()=>{
  let state=run(initial());state=run(state);
  assert.deepEqual(getAdaptiveView(state,catalog,{cueId:'toolsOut',availableActionIds:['work']}).habit,
    {suggestedActionId:'work',habitId:'routine',streak:2});
  assert.equal(getAdaptiveView(state,catalog,{cueId:'otherCue',availableActionIds:['work']}).habit.suggestedActionId,null);
  assert.deepEqual(getAdaptiveView(state,catalog).habit,{suggestedActionId:null,habitId:null,streak:0});
  assert.equal(getAdaptiveView(state,catalog,{cueId:'toolsOut',availableActionIds:['review']}).habit.suggestedActionId,null);
  assert.equal(state.person.sustained.situated.human.skills.support>initial().person.sustained.situated.human.skills.support,true);
});

test('split and whole paid attempt advancement yield the same adaptive receipt and body',()=>{
  let split=beginAdaptiveAttempt(initial(),{action:action(),cueId:'toolsOut',purposeId:'repair'},catalog);
  split=advanceAdaptiveAttempt(split,2,catalog);split=advanceAdaptiveAttempt(split,3,catalog);
  split=finishAdaptiveAttempt(split,{attemptId:split.person.sustained.situated.human.pending.id,status:'failed'},catalog);
  const whole=run(initial(),{status:'failed'});
  for(const field of ['fatigue','hunger'])assert.ok(Math.abs(split.person.sustained.situated.human.body[field]-whole.person.sustained.situated.human.body[field])<1e-12);
  const normalized=structuredClone(split);
  normalized.person.sustained.situated.human.body=structuredClone(whole.person.sustained.situated.human.body);
  assert.deepEqual(normalized,whole);
  assert.deepEqual(split.habits.receipts[0],{ownerId:'adam',attemptId:'adam:1',at:5,cueId:'toolsOut',purposeId:'repair',actionId:'work',status:'failed',elapsedMinutes:5,durationMinutes:5});
});

test('paid review plus actor selection revises the sole situated purpose owner and consumes failed evidence',()=>{
  let state=run(initial(),{status:'failed'});state=run(state,{status:'failed'});
  assert.deepEqual(getAdaptiveView(state,catalog,{cueId:'toolsOut',availableActionIds:['review']}).revisionOffers,
    [{revisionId:'changeAim',reviewActionId:'review',failedAttemptIds:['adam:1','adam:2']}]);
  assert.throws(()=>acceptAdaptiveRevision(state,{revisionId:'changeAim',selectedByActor:true},catalog),/review|paid/i);
  state=run(state,{actionId:'review',cueId:null,durationMinutes:5});
  assert.throws(()=>acceptAdaptiveRevision(state,{revisionId:'changeAim',selectedByActor:false},catalog),/selected/i);
  state=acceptAdaptiveRevision(state,{revisionId:'changeAim',selectedByActor:true},catalog);
  assert.deepEqual(state.person.sustained.situated.purposes,[{id:'repair',status:'withdrawn'},{id:'care',status:'active'}]);
  assert.deepEqual(getAdaptiveView(state,catalog,{cueId:'toolsOut',availableActionIds:['review']}).revisionOffers,[]);
  assert.throws(()=>acceptAdaptiveRevision(state,{revisionId:'changeAim',selectedByActor:true},catalog),/offer|evidence|duplicate/i);
});

test('blocked or unpaid execution contributes no habit evidence',()=>{
  let state=beginAdaptiveAttempt(initial(),{action:action(),cueId:'toolsOut',purposeId:'repair'},catalog);
  assert.throws(()=>finishAdaptiveAttempt(state,{attemptId:'adam:1',status:'failed'},catalog),/interval|incomplete/i);
  state=advanceAdaptiveAttempt(state,1,catalog);
  state=finishAdaptiveAttempt(state,{attemptId:'adam:1',status:'interrupted'},catalog);
  assert.equal(state.habits.receipts.length,1);
  assert.equal(state.habits.receipts[0].elapsedMinutes,1);
  assert.equal(getAdaptiveView(state,catalog,{cueId:'toolsOut',availableActionIds:['work']}).habit.streak,0);
});

test('passive clock and calendar changes earn no evidence; export restores exact lifecycle state',()=>{
  let state=advanceAdaptivePerson(initial(),{to:60,mode:'awake'},catalog);
  assert.deepEqual(state.habits.receipts,[]);
  state=run(state);
  const snapshot=JSON.parse(JSON.stringify(exportAdaptivePerson(state,catalog)));
  assert.deepEqual(restoreAdaptivePerson(snapshot,catalog,'adam'),state);
  state=advanceAdaptiveCalendar(state,{toDay:1,kind:'unmodeled'},catalog);
  assert.equal(state.habits.receipts.length,1);
  assert.throws(()=>restoreAdaptivePerson(snapshot,catalog,'other'),/owner/i);
  assert.throws(()=>updateAdaptiveComponent(beginAdaptiveAttempt(state,{action:action(),cueId:null,purposeId:null},catalog),{kind:'appraise',input:{contextId:'none'}},catalog),/pending/i);
});

test('adaptive restore rejects future attempt evidence, mismatched pending context and component clocks',()=>{
  const future=exportAdaptivePerson(initial(),catalog);
  future.person.habits.receipts.push({ownerId:'adam',attemptId:'adam:9',at:0,cueId:'toolsOut',purposeId:'repair',actionId:'work',status:'completed',elapsedMinutes:5,durationMinutes:5});
  assert.throws(()=>restoreAdaptivePerson(future,catalog,'adam'),/attempt|counter|future/i);
  const pending=exportAdaptivePerson(beginAdaptiveAttempt(initial(),{action:action(),cueId:'toolsOut',purposeId:'repair'},catalog),catalog);
  pending.person.pendingContext.cueId='otherCue';
  pending.person.pendingContext.actionId='review';
  assert.throws(()=>restoreAdaptivePerson(pending,catalog,'adam'),/context|action|attempt/i);
  const clock=exportAdaptivePerson(initial(),catalog);clock.person.habits.now=1;
  assert.throws(()=>restoreAdaptivePerson(clock,catalog,'adam'),/clock/i);
});

test('last paid receipt must match the developing last attempt and a calendar gap cannot reuse paid review',()=>{
  let state=run(initial());
  const changed=exportAdaptivePerson(state,catalog);
  changed.person.habits.receipts[0].status='failed';
  assert.throws(()=>restoreAdaptivePerson(changed,catalog,'adam'),/receipt|attempt|status/i);
  state=run(state,{status:'failed'});
  state=run(state,{actionId:'review',cueId:null});
  state=advanceAdaptiveCalendar(state,{toDay:1,kind:'unmodeled'},catalog);
  assert.throws(()=>acceptAdaptiveRevision(state,{revisionId:'changeAim',selectedByActor:true},catalog),/review|paid/i);
});

test('a body-blocked attempt without elapsed time creates no habit evidence',()=>{
  let state=beginAdaptiveAttempt(initial(.99),{action:{...action(),effort:1,exertive:true},cueId:'toolsOut',purposeId:'repair'},catalog);
  assert.equal(state.person.sustained.situated.human.pending.capacity.allowed,false);
  state=finishAdaptiveAttempt(state,{attemptId:'adam:1',status:'blocked'},catalog);
  assert.deepEqual(state.habits.receipts,[]);
  assert.equal(state.person.lastAttempt.status,'blocked');
});
