import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson,assessEffort,estimateSuccess} from '../src/human/index.js';

const person=()=>createPerson({id:'worker',body:{fatigue:0.2,hunger:0.3},skills:{repair:0.5}});
const work={actionId:'repair-pump',targetId:'pump',durationMinutes:20,effort:0.2,exertive:true,skill:'repair'};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);

test('an interrupted attempt charges only elapsed maintenance, effort and actual practice',()=>{
  const initial=person(),started=beginAttempt(initial,work);
  const partial=advanceAttempt(started,5);
  near(partial.body.fatigue,0.2575);near(partial.body.hunger,0.31);
  assert.ok(partial.skills.repair>0.5);
  assert.equal(partial.minutes,5);
  const ended=finishAttempt(partial,{attemptId:partial.pending.id,status:'interrupted'});
  assert.equal(ended.pending,null);assert.deepEqual(ended.body,partial.body);assert.deepEqual(ended.skills,partial.skills);
  assert.equal(initial.minutes,0);assert.equal(initial.body.fatigue,0.2);assert.equal(initial.pending,null);
  assert.throws(()=>finishAttempt(ended,{attemptId:partial.pending.id,status:'interrupted'}));
});

test('rest integrates maintenance once across partial intervals and snapshots resume the same pending attempt',()=>{
  const started=beginAttempt(person(),{actionId:'sit',durationMinutes:8,activity:'rest'});
  const uninterrupted=advanceAttempt(started,8);
  const resumed=advanceAttempt(restorePerson(exportPerson(advanceAttempt(started,3))),5);
  near(resumed.body.fatigue,0.012);near(resumed.body.hunger,0.316);
  near(resumed.body.fatigue,uninterrupted.body.fatigue);near(resumed.body.hunger,uninterrupted.body.hunger);
  assert.equal(resumed.pending.id,started.pending.id);
  assert.deepEqual(resumed.skills,{repair:0.5});
  assert.throws(()=>advanceAttempt(resumed,1));
});

test('blocked exertion earns no practice or recovery and cannot manufacture a meal',()=>{
  const hungry=createPerson({id:'worker',body:{fatigue:0.2,hunger:0.99},skills:{repair:0.5}});
  const start=beginAttempt(hungry,work);
  assert.equal(start.pending.capacity.allowed,false);
  const partial=advanceAttempt(start,1);
  near(partial.body.fatigue,0.2015);near(partial.body.hunger,0.992);
  assert.deepEqual(partial.skills,hungry.skills);
  assert.throws(()=>finishAttempt(partial,{attemptId:partial.pending.id,status:'completed'}));
  assert.throws(()=>finishAttempt(partial,{attemptId:partial.pending.id,status:'blocked',mealConsumed:true}));
  const ended=finishAttempt(partial,{attemptId:partial.pending.id,status:'blocked'});
  near(ended.body.hunger,0.992);assert.equal(ended.minutes,1);
  assert.equal(Object.hasOwn(getPersonView(start).pending,'capacity'),false);
});

test('meal relief requires a completed host-confirmed consumption and applies once',()=>{
  const start=beginAttempt(createPerson({id:'worker',body:{fatigue:0.2,hunger:0.8},skills:{repair:0.5}}),{actionId:'eat-owned-ration',targetId:'ration',durationMinutes:10,activity:'meal'});
  const full=advanceAttempt(start,10);
  const meal=finishAttempt(full,{attemptId:full.pending.id,status:'completed',mealConsumed:true});
  near(meal.body.hunger,0.27);
  const absent=finishAttempt(full,{attemptId:full.pending.id,status:'failed'});
  near(absent.body.hunger,0.82);
  assert.throws(()=>finishAttempt(meal,{attemptId:full.pending.id,status:'completed',mealConsumed:true}));
  const early=advanceAttempt(start,5);
  assert.throws(()=>finishAttempt(early,{attemptId:early.pending.id,status:'interrupted',mealConsumed:true}));
});

test('strict boundary rejects forged status, stale results, unknown effect fields and malformed saves',()=>{
  const start=beginAttempt(person(),work);
  assert.throws(()=>beginAttempt(start,work));
  assert.throws(()=>beginAttempt(person(),{...work,food:2}));
  assert.throws(()=>beginAttempt(person(),{...work,skill:'medicine'}));
  assert.throws(()=>beginAttempt(person(),{...work,skill:['repair']}));
  assert.throws(()=>advanceAttempt(start,-1));
  assert.throws(()=>finishAttempt(start,{attemptId:start.pending.id,status:'blocked'}));
  const end=finishAttempt(advanceAttempt(start,20),{attemptId:start.pending.id,status:'completed'});
  const next=beginAttempt(end,work);
  assert.notEqual(next.pending.id,start.pending.id);
  assert.throws(()=>finishAttempt(next,{attemptId:start.pending.id,status:'completed'}));
  const save=exportPerson(start);save.componentVersion='99';assert.throws(()=>restorePerson(save));
  const invalid=exportPerson(start);invalid.person.pending.elapsedMinutes=30;assert.throws(()=>restorePerson(invalid));
  const badCounter=exportPerson(start);badCounter.person.nextAttempt=1;assert.throws(()=>restorePerson(badCounter));
  const resetBody=exportPerson(advanceAttempt(start,5));resetBody.person.body={fatigue:0,hunger:0};assert.throws(()=>restorePerson(resetBody));
  const resetPractice=exportPerson(advanceAttempt(start,5));resetPractice.person.skills.repair=0.5;assert.throws(()=>restorePerson(resetPractice));
  assert.throws(()=>createPerson({id:'worker',body:{fatigue:NaN,hunger:0},skills:{repair:0.5}}));
});

test('a completed meal preserves maintenance at the hunger ceiling, including resumed partial meals',()=>{
  const s=beginAttempt(createPerson({id:'worker',body:{fatigue:0.2,hunger:1},skills:{repair:0.5}}),{actionId:'eat',durationMinutes:10,activity:'meal'});
  const full=advanceAttempt(s,10);
  const partial=advanceAttempt(restorePerson(exportPerson(advanceAttempt(s,4))),6);
  near(finishAttempt(full,{attemptId:full.pending.id,status:'completed',mealConsumed:true}).body.hunger,0.47);
  near(finishAttempt(partial,{attemptId:partial.pending.id,status:'completed',mealConsumed:true}).body.hunger,0.47);
});

test('elapsed-time limit cannot produce a state that its own snapshot rejects',()=>{
  const p=person();p.minutes=1e12;
  assert.throws(()=>advanceAttempt(beginAttempt(p,{actionId:'wait',durationMinutes:1}),1));
});

test('bounded active person state supports ten thousand events without accumulating history',()=>{
  let s=person();
  const firstBytes=JSON.stringify(s).length;
  for(let i=0;i<10000;i++) {
    s=beginAttempt(s,{actionId:'wait',durationMinutes:0.01});
    const id=s.pending.id;
    s=finishAttempt(advanceAttempt(s,0.01),{attemptId:id,status:'completed'});
  }
  assert.equal(s.pending,null);assert.equal(s.nextAttempt,10001);
  assert.ok(JSON.stringify(s).length<firstBytes+100);
  assert.equal(Object.hasOwn(s,'history'),false);
  assert.ok(Math.abs(s.minutes-100)<1e-9);
});

test('shared prediction helpers use supplied beliefs without accessing a world or mutating inputs',()=>{
  const view=getPersonView(person());
  const capacity=assessEffort(view.body,{durationMinutes:20,effort:0.2,exertive:true});
  assert.equal(capacity.allowed,true);near(capacity.projectedFatigue,0.43);
  const safe=estimateSuccess({skill:0.5,body:view.body,difficulty:0.4,hazard:0,exposure:1});
  const danger=estimateSuccess({skill:0.5,body:view.body,difficulty:0.4,hazard:0.8,exposure:1});
  assert.ok(safe>danger);assert.deepEqual(view.body,{fatigue:0.2,hunger:0.3});
});
