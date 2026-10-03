import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerson,createClock,scheduleEvent} from '../src/runtime/index.js';
import {beginJob,interruptJob,completeJob,advanceJobs,dueRecord} from '../src/coordination/attempt-clock.js';
const state=()=>({people:{person:createPerson({id:'person',body:{fatigue:.3,hunger:.6},skills:{repair:.2}})},jobs:{person:null},clock:createClock(),stock:1});
const action=(activity='active')=>({actionId:'test',targetId:null,durationMinutes:4,effort:activity==='active'?.02:0,exertive:activity==='active',activity,skill:activity==='active'?'repair':null});

test('host extensions cannot replace lifecycle identity or partially mutate the draft',()=>{
  for(const key of ['task','startedAt','endsAt','eventId','attemptId']){
    const s=state(),before=structuredClone(s);
    assert.throws(()=>beginJob(s,'person','repair',action(),{[key]:'override',reserved:1}),{code:'INVALID_JOB_FIELDS'});
    assert.deepEqual(s,before);
  }
});

test('accepted work preserves paid body/practice on interruption and cancels its unique due event',()=>{
  const s=state();beginJob(s,'person','repair',action(),{reserved:1});
  assert.equal(s.jobs.person.endsAt,4);assert.equal(s.jobs.person.reserved,1);
  const result=advanceJobs(s,['person'],2);assert.equal(result.elapsed,2);assert.deepEqual(result.events,[]);
  assert.equal(s.people.person.minutes,2);assert.ok(s.people.person.skills.repair>.2);
  const body=structuredClone(s.people.person.body),skill=s.people.person.skills.repair,job=s.jobs.person;
  assert.equal(interruptJob(s,'person'),job);assert.deepEqual(s.people.person.body,body);assert.equal(s.people.person.skills.repair,skill);
  assert.equal(s.people.person.pending,null);assert.equal(s.jobs.person,null);assert.deepEqual(s.clock.queue,[]);assert.equal(s.stock,1);
});
test('mismatched, early, late and duplicate completion reject without changing borrowed state',()=>{
  const s=state();beginJob(s,'person','repair',action(),{});const event=dueRecord('person',s.jobs.person),initial=structuredClone(s);
  for(const bad of [{...event,id:'event:99'},{...event,data:{...event.data,task:'meal'}},{...event,extra:1}]){
    assert.throws(()=>completeJob(s,bad),{code:'STALE_RECEIPT'});assert.deepEqual(s,initial);
  }
  assert.throws(()=>completeJob(s,event),{code:'EARLY_RECEIPT'});assert.deepEqual(s,initial);
  const late=structuredClone(s);late.clock.now=5;assert.throws(()=>completeJob(late,event),{code:'STALE_RECEIPT'});
  const delivered=advanceJobs(s,['person'],20);assert.equal(delivered.elapsed,4);assert.deepEqual(delivered.events,[event]);
  completeJob(s,event);assert.equal(s.people.person.pending,null);assert.equal(s.jobs.person,null);
  const done=structuredClone(s);assert.throws(()=>completeJob(s,event),{code:'STALE_RECEIPT'});assert.deepEqual(s,done);
});
test('paid meal requires explicit consumed outcome; interrupted or unconfirmed meals cannot reduce hunger',()=>{
  const partial=state();beginJob(partial,'person','food',action('meal'),{});advanceJobs(partial,['person'],2);interruptJob(partial,'person');assert.ok(partial.people.person.body.hunger>=.6);
  const unconfirmed=state();beginJob(unconfirmed,'person','food',action('meal'),{});const a=advanceJobs(unconfirmed,['person'],4);completeJob(unconfirmed,a.events[0]);assert.ok(unconfirmed.people.person.body.hunger>=.6);
  const consumed=state();beginJob(consumed,'person','food',action('meal'),{});const b=advanceJobs(consumed,['person'],4);completeJob(consumed,b.events[0],{mealConsumed:true});assert.ok(consumed.people.person.body.hunger<.6);
  assert.equal(consumed.stock,1,'the host must consume its owned reservation separately');
});
test('arrival remains first at a tie and the host can interrupt before a duplicate due outcome',()=>{
  const s=state();s.clock=scheduleEvent(s.clock,{at:4,type:'arrival'}).clock;beginJob(s,'person','repair',action(),{});
  const {events}=advanceJobs(s,['person'],4);assert.equal(events[0].type,'arrival');assert.equal(events[1].type,'attempt-due');
  interruptJob(s,'person');assert.throws(()=>completeJob(s,events[1]),{code:'STALE_RECEIPT'});
  assert.equal(s.people.person.minutes,4);assert.deepEqual(Object.keys(s).sort(),['clock','jobs','people','stock']);
});
