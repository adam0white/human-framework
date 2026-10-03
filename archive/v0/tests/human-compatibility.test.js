import test from 'node:test';
import assert from 'node:assert/strict';
import * as human from '../src/human/v0.1.1.js';
import * as legacy from '../src/human/index.js';

const setup={id:'keeper',body:{fatigue:.12,hunger:.1},skills:{repair:.2}};
const work={actionId:'repair',durationMinutes:12,effort:.12,exertive:true,skill:'repair'};

test('pending snapshots accept reversed capacity object keys without changing their values',()=>{
  const original=human.exportPerson(human.beginAttempt(human.createPerson(setup),work));
  const reversed=structuredClone(original);
  reversed.person.pending.capacity=Object.fromEntries(Object.entries(reversed.person.pending.capacity).reverse());
  assert.deepEqual(human.exportPerson(human.restorePerson(reversed)),original);
});

test('fractional advances at a nonzero accumulated origin remain exportable and resumable',()=>{
  const imported=human.exportPerson(human.createPerson(setup));
  // A supported, internally consistent historical snapshot; no pending history
  // is invented or repaired by restore. The origin itself is not authenticated.
  imported.person.minutes=100000000;
  let state=human.beginAttempt(human.restorePerson(imported),work);
  for(let i=0;i<100;i++) {
    state=human.advanceAttempt(state,.1);
    assert.doesNotThrow(()=>human.exportPerson(state),'fractional step '+(i+1));
    const saved=JSON.parse(JSON.stringify(human.exportPerson(state)));
    assert.deepEqual(human.restorePerson(saved),state);
  }
  const remaining=state.pending.action.durationMinutes-state.pending.elapsedMinutes;
  state=human.advanceAttempt(state,remaining);
  state=human.finishAttempt(state,{attemptId:state.pending.id,status:'completed'});
  assert.equal(state.minutes,100000012);
  assert.equal(human.exportPerson(state).person.pending,null);
});

test('legacy snapshots migrate only version metadata and continue the same pending attempt',()=>{
  const old=legacy.advanceAttempt(legacy.beginAttempt(legacy.createPerson(setup),work),5);
  const record=legacy.exportPerson(old),before=structuredClone(record);
  const migrated=human.restorePerson(record);
  assert.equal(human.HUMAN_VERSION,'0.1.1');
  assert.equal(migrated.version,'0.1.1');
  const exported=human.exportPerson(migrated);
  assert.equal(exported.componentVersion,'0.1.1');
  assert.equal(exported.version,1);
  exported.componentVersion='0.1.0';exported.person.version='0.1.0';
  assert.deepEqual(exported,before);
  assert.deepEqual(record,before,'migration never changes its caller');
  assert.equal(human.advanceAttempt(migrated,7).pending.id,old.pending.id);
});

test('capacity comparison rejects missing, extra, mistyped and false receipt fields',()=>{
  const original=human.exportPerson(human.beginAttempt(human.createPerson(setup),work));
  const changes=[
    ...Object.keys(original.person.pending.capacity).map(key=>c=>{delete c[key];}),
    c=>{c.extra=0;}, c=>{c.allowed=1;}, c=>{c.allowed=false;},
    c=>{c.causes=['fatigue'];}, c=>{c.causes={length:0};},
    c=>{c.causes.extra=true;}, c=>{c.fatigueCost=String(c.fatigueCost);},
    c=>{c.hungerCost=NaN;}, c=>{c.projectedFatigue=Infinity;},
    c=>{c.projectedHunger+=.1;}
  ];
  for(const change of changes) {
    const record=structuredClone(original);change(record.person.pending.capacity);
    assert.throws(()=>human.restorePerson(record));
  }
});

test('migration rejects unsupported or mixed versions and inconsistent historical state',()=>{
  const original=legacy.exportPerson(legacy.advanceAttempt(legacy.beginAttempt(legacy.createPerson(setup),work),5));
  for(const change of [
    s=>{s.componentVersion='0.2.0';s.person.version='0.2.0';},
    s=>{s.componentVersion='0.1.1';}, s=>{s.person.version='0.1.1';},
    s=>{s.version=2;}, s=>{s.person.minutes+=1;},
    s=>{s.person.body.fatigue=0;}, s=>{s.person.skills.repair=.8;},
    s=>{s.person.pending.elapsedMinutes=13;}, s=>{s.person.pending.id='keeper:99';},
    s=>{s.person.pending.capacity.allowed=false;}
  ]) {
    const record=structuredClone(original);change(record);
    assert.throws(()=>human.restorePerson(record));
  }
});

test('import rejects invalid capacity properties before detachment can discard them',()=>{
  for(const change of [
    c=>{Object.defineProperty(c,'extra',{value:0});},
    c=>{c[Symbol('extra')]=0;},
    c=>{Object.defineProperty(c,'allowed',{get(){throw new Error('getter was evaluated');},enumerable:true});}
  ]) {
    const record=human.exportPerson(human.beginAttempt(human.createPerson(setup),work));
    change(record.person.pending.capacity);
    assert.throws(()=>human.restorePerson(record),/Invalid pending capacity fields/);
  }
});

test('migration does not repair the invalid elapsed history produced by legacy fractional drift',()=>{
  const original=legacy.exportPerson(legacy.createPerson(setup));original.person.minutes=100000000;
  let old=legacy.beginAttempt(legacy.restorePerson(original),work);
  old=legacy.advanceAttempt(legacy.advanceAttempt(old,.1),.1);
  assert.throws(()=>legacy.exportPerson(old),/elapsed person time/);
  const inconsistent={...original,person:old};
  assert.throws(()=>human.restorePerson(inconsistent),/elapsed person time/);
});

test('only explicit import migrates old people, including settled snapshots',()=>{
  const old=legacy.createPerson(setup);
  assert.throws(()=>human.beginAttempt(old,work),/component version/);
  const record=legacy.exportPerson(old),migrated=human.restorePerson(record);
  assert.equal(migrated.pending,null);
  assert.equal(migrated.nextAttempt,1);
  assert.equal(human.beginAttempt(migrated,work).pending.id,'keeper:1');
  migrated.body.fatigue=.9;
  assert.equal(record.person.body.fatigue,.12);
});

test('fractional advancement preserves person time and interval bounds',()=>{
  const record=human.exportPerson(human.createPerson(setup));record.person.minutes=1e12;
  const atLimit=human.beginAttempt(human.restorePerson(record),{actionId:'wait',durationMinutes:1});
  const before=human.exportPerson(atLimit);
  assert.throws(()=>human.advanceAttempt(atLimit,.5));
  assert.deepEqual(human.exportPerson(atLimit),before);
  const started=human.beginAttempt(human.createPerson(setup),{actionId:'wait',durationMinutes:.3});
  const advanced=human.advanceAttempt(human.advanceAttempt(started,.1),.2);
  assert.equal(advanced.pending.elapsedMinutes,.3);
  assert.equal(advanced.minutes,.3);
  assert.throws(()=>human.advanceAttempt(advanced,.001));
});

test('second-sized steps remain valid after a legally elapsed long history',()=>{
  let state=human.createPerson(setup);
  while(state.minutes<32768) {
    const durationMinutes=Math.min(1440,32768-state.minutes);
    state=human.beginAttempt(state,{actionId:'wait',durationMinutes});
    state=human.advanceAttempt(state,durationMinutes);
    state=human.finishAttempt(state,{attemptId:state.pending.id,status:'completed'});
  }
  state=human.beginAttempt(state,{actionId:'observe',durationMinutes:60});
  for(let i=0;i<3600;i++) {
    state=human.advanceAttempt(state,1/60);
    assert.doesNotThrow(()=>human.exportPerson(state),'second '+(i+1));
  }
  state=human.advanceAttempt(state,60-state.pending.elapsedMinutes);
  state=human.finishAttempt(state,{attemptId:state.pending.id,status:'completed'});
  assert.equal(state.minutes,32828);
  assert.deepEqual(state.body,{fatigue:1,hunger:1});
});

const normalized=value=>{
  const out=structuredClone(value);
  if(out.componentVersion)out.componentVersion='0.1.0';
  if(out.person)out.person.version='0.1.0';
  else if(out.version)out.version='0.1.0';
  return out;
};

test('integer lifecycle histories match legacy physics after normalizing only version metadata',()=>{
  const cases=[
    {name:'work completed',body:{fatigue:.12,hunger:.1},action:work,steps:[0,1,4,7],status:'completed'},
    {name:'work failed',body:{fatigue:.12,hunger:.1},action:work,steps:[4,8],status:'failed'},
    {name:'work interrupted',body:{fatigue:.12,hunger:.1},action:work,steps:[1,4],status:'interrupted'},
    {name:'work blocked',body:{fatigue:1,hunger:1},action:work,steps:[1,4],status:'blocked'},
    {name:'rest completed',body:{fatigue:.8,hunger:.6},action:{actionId:'rest',durationMinutes:8,activity:'rest'},steps:[3,5],status:'completed'},
    {name:'rest interrupted',body:{fatigue:.8,hunger:.6},action:{actionId:'rest',durationMinutes:8,activity:'rest'},steps:[3],status:'interrupted'},
    {name:'meal consumed at ceiling',body:{fatigue:.3,hunger:.999},action:{actionId:'meal',durationMinutes:10,activity:'meal'},steps:[4,6],status:'completed',mealConsumed:true},
    {name:'meal without receipt',body:{fatigue:.3,hunger:.7},action:{actionId:'meal',durationMinutes:10,activity:'meal'},steps:[10],status:'completed'},
    {name:'meal interrupted',body:{fatigue:.3,hunger:.7},action:{actionId:'meal',durationMinutes:10,activity:'meal'},steps:[2],status:'interrupted'}
  ];
  for(const scenario of cases) {
    let old=legacy.createPerson({...setup,body:scenario.body}),next=human.createPerson({...setup,body:scenario.body});
    const compare=()=>{
      assert.deepEqual(normalized(next),old,scenario.name);
      assert.deepEqual(human.getPersonView(next),legacy.getPersonView(old),scenario.name+' view');
      assert.deepEqual(normalized(human.exportPerson(next)),legacy.exportPerson(old),scenario.name+' save');
    };
    // An earlier, completed integer interval makes this a history with a
    // nonzero origin, rather than comparing only zero-origin attempts.
    for(const [api,initial,assign] of [[legacy,old,value=>{old=value;}],[human,next,value=>{next=value;}]]) {
      let p=api.beginAttempt(initial,{actionId:'orient',durationMinutes:3});
      p=api.advanceAttempt(p,3);assign(api.finishAttempt(p,{attemptId:p.pending.id,status:'completed'}));
    }
    old=legacy.beginAttempt(old,scenario.action);next=human.beginAttempt(next,scenario.action);compare();
    for(const minutes of scenario.steps) {
      old=legacy.advanceAttempt(old,minutes);next=human.advanceAttempt(next,minutes);compare();
      old=legacy.restorePerson(JSON.parse(JSON.stringify(legacy.exportPerson(old))));
      next=human.restorePerson(JSON.parse(JSON.stringify(human.exportPerson(next))));compare();
    }
    const result={attemptId:old.pending.id,status:scenario.status,mealConsumed:scenario.mealConsumed??false};
    old=legacy.finishAttempt(old,result);next=human.finishAttempt(next,result);compare();
    assert.throws(()=>human.finishAttempt(next,result),'duplicate settlement');
  }
});
