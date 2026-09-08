import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const protocol=JSON.parse(readFileSync(new URL('../artifacts/mechanism-comparison/protocol.json',import.meta.url)));
let api;
try {api=await import('../src/experiments/mechanism-comparison/experiment.js');} catch(error) {if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const requireAPI=()=>assert.ok(api,'The shared comparison host and independent rival must exist');
const setup={id:'test',kind:'schedule',body:{fatigue:0.1,hunger:0.2},skills:{a:0.2,b:0.2},food:2,parts:8};
const work={kind:'a',durationMinutes:20,effort:0.12};
const rest={kind:'rest',durationMinutes:20,effort:0};
const meal={kind:'meal',durationMinutes:10,effort:0};
for(const model of ['human','small']) {
  test(`${model}: only admitted elapsed work earns task-specific practice and spends a part`,()=>{
    requireAPI();const initial=api.createHost(model,setup,protocol);
    const pending=api.startCommand(initial,work,protocol),half=api.advanceHost(pending,10);
    assert.equal(half.parts,7);assert.equal(half.stats.practiceMinutes.a,10);assert.equal(half.stats.practiceMinutes.b,0);
    assert.equal(half.stats.output,0);assert.ok(api.inspectHost(half).skills.a>0.2);
    const stopped=api.finishCommand(half,true);
    assert.equal(stopped.stats.output,0);assert.equal(stopped.stats.workMinutes,10);
    assert.throws(()=>api.finishCommand(stopped),/pending/i);
  });
  test(`${model}: missing resources cannot create work practice or a meal`,()=>{
    requireAPI();let state=api.createHost(model,{...setup,food:0,parts:0},protocol);
    const initial=api.inspectHost(state),blocked=api.executeCommand(state,work,protocol);
    state=api.executeCommand(blocked,meal,protocol);
    assert.equal(state.stats.practiceMinutes.a,0);assert.equal(state.stats.foodConsumed,0);assert.equal(state.stats.partsConsumed,0);
    assert.equal(state.stats.output,0);assert.equal(state.stats.resourceMinutes,30);
    assert.equal(api.inspectHost(state).skills.a,initial.skills.a);
    assert.ok(api.inspectHost(state).load>initial.load);
  });
  test(`${model}: exhausted work is capacity-blocked with no free recovery`,()=>{
    requireAPI();const initial=api.createHost(model,{...setup,body:{fatigue:1,hunger:1}},protocol);
    const state=api.executeCommand(initial,work,protocol);
    assert.equal(state.stats.blockedMinutes,20);assert.equal(state.parts,initial.parts);
    assert.equal(state.stats.practiceMinutes.a,0);assert.equal(state.stats.restMinutes,0);assert.equal(state.stats.foodConsumed,0);
    assert.ok(api.inspectHost(state).load>=api.inspectHost(initial).load);
  });
  test(`${model}: JSON mid-action resume is deterministic and meal receipts are single-use`,()=>{
    requireAPI();let pending=api.advanceHost(api.startCommand(api.createHost(model,setup,protocol),work,protocol),7);
    const restored=api.restoreHost(JSON.parse(JSON.stringify(api.exportHost(pending))));
    const finish=s=>api.finishCommand(api.advanceHost(s,13));
    assert.deepEqual(finish(restored),finish(pending));
    const before=finish(pending),after=api.executeCommand(before,meal,protocol);
    assert.equal(after.food,before.food-1);assert.equal(after.stats.foodConsumed,1);
    assert.throws(()=>api.finishCommand(after),/pending/i);
    const mealPending=api.advanceHost(api.startCommand(before,meal,protocol),4);
    assert.equal(mealPending.stats.foodConsumed,0);
    const interrupted=api.finishCommand(mealPending,true);
    assert.equal(interrupted.food,before.food);assert.equal(interrupted.stats.foodConsumed,0);
    assert.ok(api.inspectHost(interrupted).load>=api.inspectHost(before).load);
  });
  test(`${model}: action chunking agrees including saturated recovery`,()=>{
    requireAPI();const initial=api.createHost(model,setup,protocol);
    for(const command of [work,rest,meal]) {
      const direct=api.executeCommand(initial,command,protocol);
      let split=api.startCommand(initial,command,protocol);
      for(let i=0;i<command.durationMinutes;i++)split=api.advanceHost(split,1);
      split=api.finishCommand(split);
      assert.ok(Math.abs(api.inspectHost(direct).load-api.inspectHost(split).load)<1e-10);
      assert.ok(Math.abs(api.inspectHost(direct).skills.a-api.inspectHost(split).skills.a)<1e-10);
      assert.deepEqual(direct.stats,split.stats);
    }
  });
}
test('protocol equality: both arms receive identical offered actions, time, task constants and initial resources',()=>{
  requireAPI();const condition=protocol.development.find(c=>c.id==='balanced');
  const pair=api.runSchedule(condition,protocol);
  assert.deepEqual(pair.human.offered,pair.small.offered);
  assert.deepEqual(pair.human.initialInput,pair.small.initialInput);
  assert.equal(pair.human.final.minutes,pair.small.final.minutes);
  assert.equal(pair.human.final.minutes,280);
  assert.equal(pair.human.final.stats.foodConsumed,4);assert.equal(pair.small.final.stats.foodConsumed,4);
  assert.equal(pair.human.final.stats.partsConsumed,pair.human.trace.filter(t=>t.status==='work').length);
  assert.equal(pair.small.final.stats.partsConsumed,pair.small.trace.filter(t=>t.status==='work').length);
});
test('matched retests pay for equal exposure and recovery; A and B practice have equal body paths within each model',()=>{
  requireAPI();const condition=protocol.development.find(c=>c.id==='retest-novice');
  const result=api.runRetest(condition,protocol);
  for(const model of ['human','small']) {
    const a=result.arms.a[model],b=result.arms.b[model],idle=result.arms.idle[model];
    assert.equal(a.endpoint.minutes,170);assert.equal(b.endpoint.minutes,170);assert.equal(idle.endpoint.minutes,170);
    assert.equal(a.endpoint.stats.foodConsumed,1);assert.equal(a.endpoint.stats.restMinutes,40);
    assert.equal(a.endpoint.stats.practiceMinutes.a,120);assert.equal(b.endpoint.stats.practiceMinutes.b,120);
    assert.equal(idle.endpoint.stats.practiceMinutes.a,0);
    assert.equal(a.endpoint.view.load,b.endpoint.view.load);
    assert.ok(a.endpoint.view.skills.a>b.endpoint.view.skills.a);
    assert.equal(b.endpoint.view.skills.a,idle.endpoint.view.skills.a);
    assert.equal(a.retests.a.final.minutes,180);assert.equal(a.retests.a.final.stats.partsConsumed,a.endpoint.stats.partsConsumed+1);
  }
});
test('retained idle control demonstrates a smaller model suffices under predeclared tolerances',()=>{
  requireAPI();const pair=api.runSchedule(protocol.development[0],protocol);
  assert.equal(pair.comparison.equivalent,true);assert.equal(pair.comparison.outputDifference,0);
});
test('reserved and sensitivity partitions require a verified-freeze capability',()=>{
  requireAPI();assert.throws(()=>api.runPartition(protocol,'reserved'),/freeze/i);
  assert.throws(()=>api.runPartition(protocol,'sensitivity'),/freeze/i);
  assert.throws(()=>api.runPartition(protocol,'unknown'),/partition/i);
});
test('invalid commands, overshooting time and inconsistent snapshot accounting reject',()=>{
  requireAPI();for(const model of ['human','small']) {
    const initial=api.createHost(model,setup,protocol);
    assert.throws(()=>api.startCommand(initial,{...work,kind:'magic'},protocol));
    assert.throws(()=>api.startCommand(initial,{...work,durationMinutes:0},protocol));
    const pending=api.startCommand(initial,work,protocol);
    assert.throws(()=>api.advanceHost(pending,21));assert.throws(()=>api.finishCommand(pending));
    const snapshot=api.exportHost(pending);snapshot.state.parts++;
    assert.throws(()=>api.restoreHost(snapshot),/resource|account/i);
  }
});
let runner;
try {runner=await import('../scripts/mechanism-comparison.js');} catch(error) {if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
test('freeze integrity rejects mutated protocol or source and requires original registration',()=>{
  assert.ok(runner,'The frozen-source runner must exist');
  const valid={format:'mechanism-comparison-freeze',version:1,registrationCommit:'904b7e4',sourceSha256:{a:'one',b:'two'}};
  assert.equal(runner.matchesFreeze(valid,{a:'one',b:'two'}),true);
  assert.equal(runner.matchesFreeze(valid,{a:'one',b:'changed'}),false);
  assert.equal(runner.matchesFreeze({...valid,registrationCommit:'other'},{a:'one',b:'two'}),false);
});
test('artifact writing refuses to overwrite a retained result or freeze',async()=>{
  assert.ok(runner,'The frozen-source runner must exist');
  const {mkdtemp,readFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
  const dir=await mkdtemp(join(tmpdir(),'mechanism-integrity-'));
  try {const path=join(dir,'result.json');await runner.writeNew(path,{v:1});await assert.rejects(runner.writeNew(path,{v:2}),/EEXIST/);assert.deepEqual(JSON.parse(await readFile(path,'utf8')),{v:1});}
  finally {await rm(dir,{recursive:true,force:true});}
});
test('initial forecasts match analytically; unrelated protocol fields cannot change either model',()=>{
  requireAPI();const h=api.startCommand(api.createHost('human',setup,protocol),work,protocol);
  const s=api.startCommand(api.createHost('small',setup,protocol),work,protocol);
  assert.ok(Math.abs(h.pending.forecast-s.pending.forecast)<1e-12);
  assert.deepEqual(h.pending.action,s.pending.action);
  const extra={...protocol,hiddenAnswer:'work',conditionSpecificMultiplier:9000};
  for(const model of ['human','small'])assert.deepEqual(api.executeCommand(api.createHost(model,setup,protocol),work,protocol),api.executeCommand(api.createHost(model,setup,extra),work,extra));
});
test('small-model snapshot validation rejects hidden history, extra skill counters and invalid coefficients',()=>{
  requireAPI();const s=api.exportHost(api.createHost('small',setup,protocol));
  for(const mutate of [r=>r.state.person.history=Array(100).fill('extra'),r=>r.state.person.practice.c=10,r=>r.state.person.parameters.learningPerMinute=0]) {
    const changed=structuredClone(s);mutate(changed);assert.throws(()=>api.restoreHost(changed));
  }
});
