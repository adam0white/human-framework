import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';

const clockFile=new URL('../src/runtime/clock.js',import.meta.url);
const clockAPI=existsSync(clockFile)?await import(clockFile):{};
const {createClock,scheduleEvent,cancelEvent,advanceClock,exportClock,restoreClock,CLOCK_LIMITS}=clockAPI;
const add=(clock,at,type='tick',data=null)=>scheduleEvent(clock,{at,type,data}).clock;
const drain=(clock,target)=>{
  const events=[];
  do {const next=advanceClock(clock,target);clock=next.clock;events.push(...next.events);}while(clock.now<target);
  return {clock,events};
};

test('clock exposes the portable scheduler contract',()=>{
  for(const name of ['createClock','scheduleEvent','cancelEvent','advanceClock','exportClock','restoreClock'])assert.equal(typeof clockAPI[name],'function',name);
});

test('clock stops at each earliest event boundary and preserves equal-time insertion order',()=>{
  const original=createClock();
  let clock=add(original,20,'late');
  clock=add(clock,10,'first');clock=add(clock,10,'second');clock=add(clock,15,'middle');
  const before=structuredClone(clock);
  const first=advanceClock(clock,30);
  assert.equal(first.clock.now,10);
  assert.deepEqual(first.events.map(event=>event.type),['first','second']);
  assert.deepEqual(first.events[0],{id:'event:2',at:10,type:'first',actorId:null,data:null});
  const second=advanceClock(first.clock,30);
  assert.equal(second.clock.now,15);assert.deepEqual(second.events.map(event=>event.type),['middle']);
  const third=advanceClock(second.clock,30);
  assert.equal(third.clock.now,20);assert.deepEqual(third.events.map(event=>event.type),['late']);
  assert.deepEqual(advanceClock(third.clock,30).events,[]);
  assert.equal(advanceClock(third.clock,30).clock.now,30);
  assert.deepEqual(clock,before);assert.equal(original.queue.length,0);
});

test('clock idle and same-time targets settle no work and permit a nonzero origin',()=>{
  const initial=createClock({now:41});
  assert.deepEqual(advanceClock(initial,41),{clock:initial,events:[]});
  const future=add(initial,80);
  assert.equal(advanceClock(future,60).clock.now,60);
  assert.deepEqual(advanceClock(future,60).events,[]);
  assert.equal(advanceClock(initial,Number.MAX_SAFE_INTEGER).clock.now,Number.MAX_SAFE_INTEGER);
});

test('advancing in chunks has the same event trace, state and host-scheduled continuations',()=>{
  function run(targets) {
    let clock=add(add(createClock(),7,'repeat',{count:0}),19,'one-off');
    const trace=[];
    for(const target of targets) {
      do {
        const next=advanceClock(clock,target);clock=next.clock;
        for(const event of next.events) {
          trace.push(event);
          if(event.type==='repeat'&&event.data.count<7)clock=add(clock,clock.now+7,'repeat',{count:event.data.count+1});
        }
      } while(clock.now<target);
    }
    return {clock,trace};
  }
  const direct=run([70]);
  assert.deepEqual(run([1,7,7,8,19,25,49,70]),direct);
  assert.deepEqual(run(Array.from({length:70},(_,i)=>i+1)),direct);
  assert.equal(direct.trace.length,9);
});

test('cancellation is idempotent, leaves no receipt, and never reuses an event ID',()=>{
  let {clock,eventId}=scheduleEvent(createClock(),{at:8,type:'meal',actorId:'worker'});
  const canceled=cancelEvent(clock,eventId);
  assert.equal(clock.queue.length,1);assert.equal(canceled.queue.length,0);
  assert.deepEqual(cancelEvent(canceled,eventId),canceled);
  assert.deepEqual(drain(canceled,10).events,[]);
  const next=scheduleEvent(canceled,{at:9,type:'meal'});
  assert.notEqual(next.eventId,eventId);
  assert.throws(()=>cancelEvent(clock,1));
  assert.throws(()=>cancelEvent(clock,'garbage'));
});

test('JSON save and resume retain order, cancellation counters and future results',()=>{
  let clock=add(add(createClock({now:3}),14,'a'),14,'b');
  const canceled=scheduleEvent(clock,{at:12,type:'discard'});
  clock=cancelEvent(canceled.clock,canceled.eventId);
  clock=advanceClock(clock,8).clock;
  const record=exportClock(clock);
  const restored=restoreClock(JSON.parse(JSON.stringify(record)));
  assert.deepEqual(restored,clock);
  assert.deepEqual(drain(restored,30),drain(clock,30));
  record.clock.queue[0].type='mutated';assert.equal(clock.queue[0].type,'a');
  restored.queue[0].type='changed';assert.equal(clock.queue[0].type,'a');
});

test('event payloads and returned events have no mutable aliases to caller state',()=>{
  const data={steps:[{value:1}],nullable:null};
  const original=createClock();
  const scheduled=scheduleEvent(original,{at:1,type:'job',actorId:'actor:1',data});
  data.steps[0].value=2;
  assert.equal(scheduled.clock.queue[0].data.steps[0].value,1);
  const next=advanceClock(scheduled.clock,1);
  next.events[0].data.steps[0].value=3;
  assert.equal(scheduled.clock.queue[0].data.steps[0].value,1);
  assert.equal(original.queue.length,0);
});

test('clock rejects backward, fractional, nonfinite, unsafe and exhausted times and counters',()=>{
  for(const bad of [-1,0.5,NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1,'1',null]) {
    assert.throws(()=>createClock({now:bad}));
    assert.throws(()=>scheduleEvent(createClock(),{at:bad,type:'job'}));
    assert.throws(()=>advanceClock(createClock(),bad));
  }
  const clock=createClock({now:4});
  assert.throws(()=>scheduleEvent(clock,{at:4,type:'job'}));
  assert.throws(()=>scheduleEvent(clock,{at:3,type:'job'}));
  assert.throws(()=>advanceClock(clock,3));
  const exhausted={...createClock(),nextEvent:Number.MAX_SAFE_INTEGER};
  assert.throws(()=>scheduleEvent(exhausted,{at:1,type:'job'}),/exhaust/i);
  assert.throws(()=>scheduleEvent(createClock({now:Number.MAX_SAFE_INTEGER}),{at:Number.MAX_SAFE_INTEGER,type:'job'}));
});

test('clock bounds pending events and payloads while drained histories stay bounded',()=>{
  let clock=createClock();
  for(let i=0;i<CLOCK_LIMITS.pendingEvents;i++)clock=add(clock,i+1);
  assert.throws(()=>add(clock,CLOCK_LIMITS.pendingEvents+1),/limit|many|full/i);
  clock=advanceClock(clock,1).clock;
  assert.equal(add(clock,CLOCK_LIMITS.pendingEvents+1).queue.length,CLOCK_LIMITS.pendingEvents);
  assert.throws(()=>add(createClock(),1,'job','x'.repeat(CLOCK_LIMITS.dataCharacters+1)),/limit|large/i);
  let serial=createClock();
  for(let i=0;i<10000;i++)serial=advanceClock(add(serial,i+1),i+1).clock;
  assert.equal(serial.queue.length,0);assert.equal(serial.nextEvent,10001);
  assert.ok(JSON.stringify(exportClock(serial)).length<250);
});

test('clock rejects non-JSON payloads rather than silently losing data during save',()=>{
  const cyclic={};cyclic.self=cyclic;
  class DecoratedArray extends Array {toJSON(){return 'silently changed';}}
  const sparse=Array(1),arrayProperty=[1];arrayProperty.extra=2;
  const symbolKey={[Symbol('hidden')]:1};
  const hidden=Object.defineProperty({},'hidden',{value:1});
  let getterCalls=0;
  const getter=Object.defineProperty({},'value',{enumerable:true,get(){getterCalls++;return 1;}});
  let deep={};for(let i=0;i<30;i++)deep={nested:deep};
  for(const data of [undefined,NaN,Infinity,-0,1n,()=>1,Symbol('x'),new Date(),new Map(),new Set(),new DecoratedArray(1,2),cyclic,sparse,arrayProperty,symbolKey,hidden,getter,{value:undefined},deep]) {
    assert.throws(()=>scheduleEvent(createClock(),{at:1,type:'job',data}));
  }
  assert.equal(getterCalls,0);
  assert.deepEqual(add(createClock(),1,'job',JSON.parse('{"__proto__":{"polluted":true}}')).queue[0].data,JSON.parse('{"__proto__":{"polluted":true}}'));
  assert.equal({}.polluted,undefined);
});

test('combined payload size cannot evade the total state bound with fewer large events',()=>{
  const data='x'.repeat(CLOCK_LIMITS.dataCharacters-2);
  const count=Math.floor(CLOCK_LIMITS.snapshotCharacters/(CLOCK_LIMITS.dataCharacters+200))-1;
  let clock=createClock();
  for(let i=0;i<count;i++)clock=add(clock,i+1,'payload',data);
  const before=structuredClone(clock);
  assert.ok(clock.queue.length<CLOCK_LIMITS.pendingEvents);
  assert.throws(()=>{
    let next=clock;
    for(let i=count;i<count+5;i++)next=add(next,i+1,'payload',data);
  },/size limit/i);
  assert.deepEqual(clock,before);
  assert.deepEqual(restoreClock(JSON.parse(JSON.stringify(exportClock(clock)))),clock);
});

test('clock snapshots and API arguments reject unknown fields, malformed queues and forged ordering',()=>{
  let clock=add(add(createClock(),3,'a'),3,'b');
  const change=fn=>{const copy=exportClock(clock);fn(copy);assert.throws(()=>restoreClock(copy));};
  for(const fn of [r=>r.version=2,r=>r.clockVersion='other',r=>r.extra=true,r=>delete r.clock,
    r=>r.clock.extra=true,r=>r.clock.now=3,r=>r.clock.nextEvent=2,r=>r.clock.queue.reverse(),
    r=>r.clock.queue[0].at=4,r=>r.clock.queue[1].id=r.clock.queue[0].id,r=>r.clock.queue[0].id='event:01',
    r=>r.clock.queue[0].type='',r=>r.clock.queue[0].actorId=1,r=>delete r.clock.queue[0].data,
    r=>r.clock.queue[0].extra=true,r=>r.clock.queue={length:0},r=>r.clock.version='other'])change(fn);
  assert.throws(()=>createClock({extra:1}));
  assert.throws(()=>scheduleEvent(clock,{at:4,type:'a',extra:1}));
  assert.throws(()=>scheduleEvent(clock,{at:4,type:' '.repeat(3)}));
  assert.throws(()=>scheduleEvent(clock,{at:4,type:'a',actorId:''}));
  assert.throws(()=>advanceClock({...clock,now:4},5));
  assert.throws(()=>cancelEvent({...clock,nextEvent:0},'event:1'));
});
