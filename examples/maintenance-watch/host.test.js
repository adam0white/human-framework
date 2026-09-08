import test from 'node:test';
import assert from 'node:assert/strict';
import {assessEffort} from 'human-framework-runtime';
import {createWatch,requestTask,interruptTask,advanceTo,receiveReceipt,getWatchView,exportWatch,restoreWatch} from './host.js';

const request=(state,actor,task)=>requestTask(state,actor,task);
const paired=()=>request(request(createWatch(),'keeper','repair'),'watcher','watch');
function near(a,b,path='') {
  if(typeof a==='number'&&typeof b==='number'&&path.startsWith('.state.people.')) {
    if(Number.isInteger(a)&&Number.isInteger(b))assert.equal(a,b,path);
    else assert.ok(Math.abs(a-b)<=1e-10,path+': '+a+' vs '+b);
    return;
  }
  if(a&&b&&typeof a==='object'&&typeof b==='object') {
    assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort(),path);
    for(const key of Object.keys(a))near(a[key],b[key],path+'.'+key);
  } else assert.equal(a,b,path);
}
function drive(state,target,driver) {
  if(driver==='minutes')while(state.clock.now<target)state=advanceTo(state,state.clock.now+1);
  else if(driver==='irregular')while(state.clock.now<target)state=advanceTo(state,Math.min(target,state.clock.now+[3,1,7,2][state.clock.now%4]));
  else state=advanceTo(state,target);
  return state;
}

test('requests preserve recipient refusal, concurrent ownership and one reservation',()=>{
  const original=createWatch(),before=exportWatch(original);
  const refused=request(original,'watcher','repair');
  assert.equal(refused.lastResponse.accepted,false);
  assert.equal(refused.lastResponse.code,'ROLE_DECLINED');
  assert.deepEqual(refused.parts,{available:2,reserved:0,spent:0});
  let state=request(original,'keeper','repair');
  assert.equal(state.lastResponse.accepted,true);
  assert.deepEqual(state.parts,{available:0,reserved:2,spent:0});
  state=request(state,'keeper','repair');
  assert.equal(state.lastResponse.code,'BUSY');
  assert.deepEqual(state.parts,{available:0,reserved:2,spent:0});
  state=request(state,'watcher','watch');
  assert.equal(state.lastResponse.accepted,true);
  assert.equal(state.jobs.keeper.task,'repair');
  assert.equal(state.jobs.watcher.task,'watch');
  assert.deepEqual(exportWatch(original),before,'commands never mutate caller state');
});

test('interruption retains paid work and practice, consumes used parts and returns only unused reservation',()=>{
  let state=request(createWatch(),'keeper','repair');
  state=advanceTo(state,5);
  const skill=state.people.keeper.skills.repair,body=structuredClone(state.people.keeper.body);
  assert.equal(state.repairMinutes,5);
  assert.deepEqual(state.parts,{available:0,reserved:1,spent:1});
  state=interruptTask(state,'keeper');
  assert.equal(state.repairMinutes,5);
  assert.deepEqual(state.parts,{available:1,reserved:0,spent:1});
  assert.equal(state.people.keeper.skills.repair,skill);
  assert.deepEqual(state.people.keeper.body,body);
  assert.ok(skill>0.2);
  state=request(state,'keeper','repair');
  assert.equal(state.jobs.keeper.endsAt,12,'resuming pays only seven remaining minutes');
  assert.deepEqual(state.parts,{available:0,reserved:1,spent:1});
  state=interruptTask(state,'keeper');
  assert.equal(state.repairMinutes,5,'zero-time restart earns no progress');
  assert.deepEqual(state.parts,{available:1,reserved:0,spent:1});
});

test('the approaching event interrupts unfinished work and reports the actual partial outcome',()=>{
  let state=advanceTo(createWatch(),10);
  state=request(state,'keeper','repair');
  state=advanceTo(state,15);
  state=request(state,'watcher','watch');
  state=advanceTo(state,18);
  assert.equal(state.repairMinutes,8);
  assert.equal(state.watchMinutes,3);
  assert.equal(state.warningAt,null,'three minutes of lookout is not a completed observation');
  assert.deepEqual(state.outcome,{at:18,repairMinutes:8,unrepairedMinutes:4,warningAvailable:false});
  assert.deepEqual(state.parts,{available:0,reserved:0,spent:2});
  assert.equal(state.stats.interrupted,2);
  assert.equal(state.jobs.keeper.task,'idle');
  assert.equal(state.jobs.watcher.task,'idle');
  const later=advanceTo(state,30);
  assert.equal(later.repairMinutes,8,'canceled due events cannot finish the repair later');
  assert.equal(later.watchMinutes,3);
  assert.deepEqual(later.outcome,state.outcome);
});

test('completed repair and paid lookout produce distinct host results at their due times',()=>{
  let state=paired();
  state=advanceTo(state,8);
  assert.equal(state.warningAt,8);
  assert.equal(state.repairMinutes,8);
  assert.equal(state.outcome,null);
  state=advanceTo(state,12);
  assert.equal(state.repairMinutes,12);
  assert.equal(state.parts.spent,2);
  assert.equal(state.stats.completed,2);
  state=advanceTo(state,18);
  assert.deepEqual(state.outcome,{at:18,repairMinutes:12,unrepairedMinutes:0,warningAvailable:true});
  assert.ok(state.people.keeper.skills.repair>0.2);
  assert.ok(state.people.watcher.skills.watch>0.1);
});

test('a second completed lookout retains the first warning time',()=>{
  let state=request(createWatch(),'keeper','watch');
  state=request(advanceTo(state,4),'watcher','watch');
  state=advanceTo(state,12);
  assert.equal(state.warningAt,8);
  assert.equal(state.watchMinutes,16);
});

test('event, minute and irregular drivers preserve exact world facts and person floats within 1e-10',()=>{
  const events=exportWatch(drive(paired(),150,'events'));
  near(exportWatch(drive(paired(),150,'minutes')),events);
  near(exportWatch(drive(paired(),150,'irregular')),events);
});

test('a mid-action JSON snapshot resumes identically under the same subsequent driver',()=>{
  let state=advanceTo(paired(),5);
  state=interruptTask(state,'keeper');
  state=request(state,'keeper','repair');
  state=advanceTo(state,6);
  const saved=JSON.parse(JSON.stringify(exportWatch(state)));
  const resumed=restoreWatch(saved);
  assert.deepEqual(exportWatch(drive(resumed,80,'irregular')),exportWatch(drive(state,80,'irregular')));
  saved.state.parts.available=99;
  assert.equal(resumed.parts.available,0,'restore detaches caller state');
});

test('duplicate and premature receipts cannot grant work or consume resources twice',()=>{
  const completed=advanceTo(paired(),12),before=exportWatch(completed);
  assert.equal(completed.lastReceipt.data.task,'repair');
  assert.throws(()=>receiveReceipt(completed,completed.lastReceipt),{code:'STALE_RECEIPT'});
  assert.deepEqual(exportWatch(completed),before);
  const running=paired(),due=running.clock.queue.find(event=>event.actorId==='keeper');
  assert.throws(()=>receiveReceipt(running,due),{code:'EARLY_RECEIPT'});
  assert.deepEqual(running.parts,{available:0,reserved:2,spent:0});
});

test('the solo variant has one actual person and does not invent a lookout or response',()=>{
  let state=createWatch({solo:true});
  const refused=request(state,'watcher','watch');
  assert.equal(refused.lastResponse.code,'NOT_PRESENT');
  assert.deepEqual(Object.keys(refused.people),['keeper']);
  state=request(state,'keeper','repair');
  state=advanceTo(state,5);
  state=interruptTask(state,'keeper');
  state=advanceTo(state,18);
  assert.deepEqual(state.outcome,{at:18,repairMinutes:5,unrepairedMinutes:7,warningAvailable:false});
  assert.equal(state.parts.available,1);
  assert.equal(state.clock.queue.length,1);
});

test('save validation rejects mismatched reservations, pending jobs, queue events and versions',()=>{
  const state=advanceTo(paired(),4);
  for(const mutate of [
    s=>s.state.parts.available++,
    s=>s.state.parts.reserved++,
    s=>s.state.jobs.keeper.endsAt++,
    s=>s.state.clock.queue.find(event=>event.actorId==='keeper').actorId='watcher',
    s=>s.state.people.keeper.id='stranger',
    s=>s.state.stats.completed=-1,
    s=>s.version=2
  ]) {
    const snapshot=exportWatch(state);mutate(snapshot);
    assert.throws(()=>restoreWatch(snapshot));
  }
});

test('a component-valid imported attempt cannot reduce the host-promised repair effort',()=>{
  const snapshot=exportWatch(paired()),person=snapshot.state.people.keeper;
  person.pending.action.effort=0;
  person.pending.capacity=assessEffort(person.body,person.pending.action);
  assert.throws(()=>restoreWatch(snapshot),/task contract/);
});

test('a capacity-blocked imported component cannot execute the host repair job',()=>{
  const snapshot=exportWatch(request(createWatch(),'keeper','repair')),person=snapshot.state.people.keeper;
  person.body={fatigue:1,hunger:1};
  person.pending.bodyBefore=structuredClone(person.body);
  person.pending.capacity=assessEffort(person.body,person.pending.action);
  assert.equal(person.pending.capacity.allowed,false);
  assert.throws(()=>restoreWatch(snapshot),/capacity-blocked/);
});

test('an imported future warning cannot refuse a present lookout request',()=>{
  const snapshot=exportWatch(advanceTo(createWatch(),4));
  snapshot.state.warningAt=8;snapshot.state.watchMinutes=8;
  assert.throws(()=>restoreWatch(snapshot),/warning time/);
});

test('long idle continuation keeps only bounded active jobs, receipts and recent messages',()=>{
  const settled=advanceTo(paired(),18),initialSize=JSON.stringify(exportWatch(settled)).length;
  let state=advanceTo(settled,100000);
  for(let i=0;i<1000;i++)state=request(state,'watcher','repair');
  const snapshot=exportWatch(state),size=JSON.stringify(snapshot).length;
  assert.equal(state.clock.now,100000);
  assert.equal(state.people.keeper.minutes,100000);
  assert.equal(state.people.watcher.minutes,100000);
  assert.equal(state.clock.queue.length,2);
  assert.ok(state.recent.length<=12);
  assert.ok(size<20000);
  assert.ok(size<initialSize+2500);
  assert.deepEqual(exportWatch(restoreWatch(JSON.parse(JSON.stringify(snapshot)))),snapshot);
  assert.equal(getWatchView(state).outcome.unrepairedMinutes,0);
});
