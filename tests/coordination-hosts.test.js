import test from 'node:test';
import assert from 'node:assert/strict';
import * as watch from '../src/games/watch.js';
import * as candidateWatch from '../src/experiments/coordination/watch.js';
import * as maintenance from '../src/experiments/coordination/maintenance-direct.js';
import * as candidateMaintenance from '../src/experiments/coordination/maintenance.js';

function pair(direct,candidate,setup={}) {
  let a=direct.createWatch(setup),b=candidate.createWatch(setup);
  const check=()=>{assert.deepEqual(b,a);assert.deepEqual(candidate.exportWatch(b),direct.exportWatch(a));};check();
  return {
    run(method,...args){a=direct[method](a,...args);b=candidate[method](b,...args);check();return a;},
    resume(){a=direct.restoreWatch(JSON.parse(JSON.stringify(direct.exportWatch(a))));b=candidate.restoreWatch(JSON.parse(JSON.stringify(candidate.exportWatch(b))));check();},
    error(method,args,code){const before=structuredClone(a);for(const [api,s] of [[direct,a],[candidate,b]])assert.throws(()=>api[method](s,...args),{code});check();assert.deepEqual(a,before);},
    get state(){return a;}
  };
}
for(const [name,direct,candidate] of [['watch',watch,candidateWatch],['maintenance',maintenance,candidateMaintenance]]) {
  test(name+' keeps refusal, partial paid work, reservations, resume, early and duplicate receipts identical',()=>{
    const p=pair(direct,candidate);
    assert.equal(p.run('requestTask','watcher','repair').lastResponse.code,'ROLE_DECLINED');
    p.run('requestTask','keeper','repair');p.run('requestTask','watcher','watch');
    assert.equal(p.run('requestTask','keeper','rest').lastResponse.code,'BUSY');
    p.error('receiveReceipt',[p.state.clock.queue.find(e=>e.actorId==='keeper')],'EARLY_RECEIPT');
    p.run('advanceTo',3);p.resume();const minutes=p.state.people.keeper.minutes;assert.equal(minutes,3);
    const skill=p.state.people.keeper.skills.repair;
    p.run('interruptTask','keeper');assert.equal(p.state.people.keeper.skills.repair,skill);
    p.run('requestTask','keeper','repair');p.run('advanceTo',12);
    p.error('receiveReceipt',[p.state.lastReceipt],'STALE_RECEIPT');p.run('advanceTo',40);p.resume();
  });
  test(name+' keeps arrival-first warning ties and forged saved reservations identical',()=>{
    const p=pair(direct,candidate),arrival=name==='watch'?32:18,duration=name==='watch'?6:8;
    p.run('advanceTo',arrival-duration);p.run('requestTask','watcher','watch');p.resume();p.run('advanceTo',arrival);
    assert.equal(p.state.warningAt,null);
    for(const api of [direct,candidate]){const s=api.exportWatch(api.requestTask(api.createWatch(),'keeper','repair'));s.state.jobs.keeper.endsAt++;assert.throws(()=>api.restoreWatch(s));}
  });
}
test('Watch preserves own parts and meal authorization while maintenance keeps its separate resource rules',()=>{
  const p=pair(watch,candidateWatch);p.run('requestTask','keeper','bypass');p.run('advanceTo',2);p.run('interruptTask','keeper');
  assert.equal(p.state.bypass,2);assert.equal(p.state.parts.keeper,1);
  p.run('requestTask','keeper','meal');p.run('advanceTo',4);p.run('interruptTask','keeper');assert.equal(p.state.food.keeper,1);
  p.run('requestTask','keeper','meal');p.resume();p.run('advanceTo',8);assert.equal(p.state.food.keeper,0);assert.equal(p.state.eaten.keeper,1);
  p.error('receiveReceipt',[p.state.lastReceipt],'STALE_RECEIPT');
  assert.equal(p.run('requestTask','watcher','share').lastResponse.code,'KEEPING_SPARE');
});
test('Watch short arrival still admits three paid rest minutes then final repair',()=>{
  const p=pair(watch,candidateWatch,{scenario:'short'});p.run('requestTask','keeper','repair');p.run('requestTask','watcher','watch');p.run('advanceTo',6);
  p.run('requestTask','keeper','repair');p.run('requestTask','watcher','share');p.run('advanceTo',12);
  assert.equal(p.run('requestTask','keeper','repair').lastResponse.code,'CAPACITY');
  p.run('requestTask','keeper','rest');p.run('advanceTo',15);p.run('interruptTask','keeper');p.run('requestTask','keeper','repair');p.resume();p.run('advanceTo',22);
  assert.equal(p.state.outcome.protected,true);assert.equal(p.state.paid.rest,3);assert.equal(p.state.repair,18);
});
