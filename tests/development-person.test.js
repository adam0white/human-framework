import test from 'node:test';
import assert from 'node:assert/strict';
import {createDailyCondition,advanceDailyCondition} from '../src/development/condition.js';
import {createPerson} from '../src/human/v0.1.1.js';
import {createSituatedPerson} from '../src/person/index.js';
import {createLearning} from '../src/development/learning.js';
import {
  createSustainedPerson,advanceSustainedPerson,beginSustainedAttempt,
  advanceSustainedAttempt,finishSustainedAttempt,getSustainedView,
  exportSustainedPerson,restoreSustainedPerson
} from '../src/development/index.js';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<=1e-9,`${actual} != ${expected}`);

test('daily condition advances ordinary waking and sleep intervals compositionally',()=>{
  const start=createDailyCondition({now:0});
  const directAwake=advanceDailyCondition(start,{fatigue:0.2,hunger:0.1},{to:960,mode:'awake'});
  let stepped={condition:start,body:{fatigue:0.2,hunger:0.1}};
  for(let to=60;to<=960;to+=60)stepped=advanceDailyCondition(stepped.condition,stepped.body,{to,mode:'awake'});
  close(stepped.body.fatigue,directAwake.body.fatigue);
  close(stepped.body.hunger,directAwake.body.hunger);
  assert.equal(stepped.condition.awakeMinutes,960);
  assert.equal(stepped.condition.sleepMinutes,0);

  const directSleep=advanceDailyCondition(directAwake.condition,directAwake.body,{to:1440,mode:'sleep'});
  for(let to=1020;to<=1440;to+=60)stepped=advanceDailyCondition(stepped.condition,stepped.body,{to,mode:'sleep'});
  close(stepped.body.fatigue,directSleep.body.fatigue);
  close(stepped.body.hunger,directSleep.body.hunger);
  assert.deepEqual(stepped.condition,directSleep.condition);
  assert.equal(directSleep.condition.sleepMinutes,480);
});

const catalog={
  actors:['learner','other'],facts:['method'],purposes:['learn'],commitments:[],actions:['practice','meal']
};

function setup() {
  const human=createPerson({id:'learner',body:{fatigue:0.2,hunger:0.1},skills:{craft:0.2}});
  const situated=createSituatedPerson({human,now:0,purposes:[{id:'learn',status:'active'}]},catalog);
  return createSustainedPerson({situated,learning:createLearning({skills:['craft']})},catalog);
}

test('sustained person synchronizes awake and sleep chronology without resetting identity',()=>{
  let person=setup();
  person=advanceSustainedPerson(person,{to:960,mode:'awake'},catalog);
  person=advanceSustainedPerson(person,{to:1440,mode:'sleep'},catalog);
  const view=getSustainedView(person,catalog);
  assert.equal(view.id,'learner');
  assert.equal(view.now,1440);
  assert.equal(person.situated.human.minutes,1440);
  assert.equal(person.learning.now,1440);
  assert.equal(view.learning.ownerId,'learner');
  assert.equal(view.learning.rule,undefined);
  assert.equal(view.learning.receiptCount,undefined);
  assert.equal(view.condition.awakeMinutes,960);
  assert.equal(view.condition.sleepMinutes,480);
  close(view.situated.human.body.fatigue,0.2);
  close(view.situated.human.body.hunger,0.7);
  assert.deepEqual(view.situated.purposes,[{id:'learn',status:'active'}]);
});

test('active attempt uses Human body and practice updates exactly once',()=>{
  let person=advanceSustainedPerson(setup(),{to:60,mode:'awake'},catalog);
  person=beginSustainedAttempt(person,{actionId:'practice',durationMinutes:10,activity:'active',skill:'craft'},catalog);
  assert.throws(()=>advanceSustainedPerson(person,{to:70,mode:'sleep'},catalog),/pending attempt/i);
  person=advanceSustainedAttempt(person,10,catalog);
  assert.equal(person.condition.awakeMinutes,70);
  assert.equal(person.condition.sleepMinutes,0);
  assert.equal(person.situated.now,70);
  assert.equal(person.learning.now,70);
  close(person.situated.human.body.fatigue,0.245);
  close(person.situated.human.body.hunger,0.15);
  assert.ok(person.situated.human.skills.craft>0.2);
  const learnedBefore=person.learning;
  person=finishSustainedAttempt(person,{attemptId:person.situated.human.pending.id,status:'completed',mealConsumed:false},catalog);
  assert.deepEqual(person.learning,learnedBefore);
  assert.equal(person.situated.human.pending,null);
});

test('sleep cannot be credited during an attempt and explicit wake is required to act',()=>{
  let person=advanceSustainedPerson(setup(),{to:30,mode:'sleep'},catalog);
  assert.throws(()=>beginSustainedAttempt(person,{actionId:'practice',durationMinutes:10,activity:'active',skill:'craft'},catalog),/awake/i);
  person=advanceSustainedPerson(person,{to:30,mode:'awake'},catalog);
  person=beginSustainedAttempt(person,{actionId:'practice',durationMinutes:10,activity:'active',skill:'craft'},catalog);
  person=advanceSustainedAttempt(person,4,catalog);
  assert.equal(person.condition.awakeMinutes,4);
  assert.equal(person.condition.sleepMinutes,30);
  assert.throws(()=>advanceSustainedAttempt(person,7,catalog),/remaining/i);
});

test('attempt durations must fit the sustained integer chronology',()=>{
  const person=setup();
  assert.throws(()=>beginSustainedAttempt(person,{actionId:'practice',durationMinutes:0.5,activity:'active',skill:'craft'},catalog),/integer/i);
});

test('learning skills belong to the composed Human skill namespace',()=>{
  const human=createPerson({id:'learner',body:{fatigue:0.2,hunger:0.1},skills:{craft:0.2}});
  const situated=createSituatedPerson({human,now:0,purposes:[{id:'learn',status:'active'}]},catalog);
  assert.throws(()=>createSustainedPerson({situated,learning:createLearning({skills:['unrelated']})},catalog),/Human skill/i);
});

test('learning state is actor-owned and cannot be spliced between people',()=>{
  const learner=setup();
  const otherHuman=createPerson({id:'other',body:{fatigue:0.2,hunger:0.1},skills:{craft:0.2}});
  const otherSituated=createSituatedPerson({human:otherHuman,now:0,purposes:[{id:'learn',status:'active'}]},catalog);
  const other=createSustainedPerson({situated:otherSituated,learning:createLearning({skills:['craft']})},catalog);
  assert.throws(()=>exportSustainedPerson({...learner,learning:other.learning},catalog),/learning owner/i);
});

test('new sustained compositions start at zero and later continuity uses restore',()=>{
  const human=createPerson({id:'learner',body:{fatigue:0.2,hunger:0.1},skills:{craft:0.2}});
  const situated=createSituatedPerson({human,now:10,purposes:[{id:'learn',status:'active'}]},catalog);
  assert.throws(()=>createSustainedPerson({situated,learning:createLearning({now:10,skills:['craft']})},catalog),/start at zero/i);
});

test('sustained snapshots validate nested chronology and restore detached state',()=>{
  const person=advanceSustainedPerson(setup(),{to:1440,mode:'awake'},catalog);
  const snapshot=exportSustainedPerson(person,catalog);
  const restored=restoreSustainedPerson(structuredClone(snapshot),catalog);
  assert.deepEqual(restored,person);
  restored.condition.rules.awakeFatiguePerMinute=0;
  assert.notEqual(person.condition.rules.awakeFatiguePerMinute,0);
  const malformed=structuredClone(snapshot);
  malformed.person.condition.now++;
  assert.throws(()=>restoreSustainedPerson(malformed,catalog),/condition|chronology/i);

  const pending=beginSustainedAttempt(setup(),{actionId:'practice',durationMinutes:10,activity:'active',skill:'craft'},catalog);
  const sleeping=exportSustainedPerson(pending,catalog);
  sleeping.person.condition.mode='sleep';
  assert.throws(()=>restoreSustainedPerson(sleeping,catalog),/pending.*awake/i);
});
