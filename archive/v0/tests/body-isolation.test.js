import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as old from '../src/experiments/mechanism-comparison/experiment.js';
import {assessEffort} from '../src/human/v0.1.1.js';
const protocol=JSON.parse(readFileSync(new URL('../artifacts/body-isolation/protocol.json',import.meta.url)));
let api,pooled,runner;
for(const [key,path] of [['api','../src/experiments/body-isolation/experiment.js'],['pooled','../src/experiments/body-isolation/pooled-model.js'],['runner','../scripts/body-isolation.js']]) {
  try {const value=await import(path);if(key==='api')api=value;else if(key==='pooled')pooled=value;else runner=value;} catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
}
const requireAPI=()=>assert.ok(api,'New isolated body comparison must exist');
const input={body:{fatigue:.1,hunger:.2},skills:{a:.2,b:.2},food:2,parts:30};
const work={kind:'a',durationMinutes:20,effort:.12},rest={kind:'rest',durationMinutes:20,effort:0},meal={kind:'meal',durationMinutes:10,effort:0};
for(const model of ['human','pooled']) {
  test(`${model}: interrupted paid work gains only trained skill and consumes owned part`,()=>{
    requireAPI();const s=api.advanceHost(api.startCommand(api.createHost(model,input,protocol),work,protocol),7.5);
    const stopped=api.finishCommand(s,true);
    assert.equal(stopped.parts,29);assert.equal(stopped.stats.practiceMinutes.a,7.5);assert.equal(stopped.stats.practiceMinutes.b,0);
    assert.equal(stopped.stats.output,0);assert.ok(api.inspectHost(stopped).skills.a>.2);assert.equal(api.inspectHost(stopped).skills.b,.2);
    assert.throws(()=>api.finishCommand(stopped),/pending/i);
  });
  test(`${model}: missing resources and capacity refusal give no practice or free recovery`,()=>{
    requireAPI();for(const condition of [{...input,parts:0,food:0},{...input,body:{fatigue:1,hunger:1}}]) {
      const initial=api.createHost(model,condition,protocol),after=api.executeCommand(initial,work,protocol);
      assert.equal(after.stats.workMinutes,0);assert.equal(after.stats.practiceMinutes.a,0);assert.equal(after.stats.output,0);
      assert.equal(after.parts,initial.parts);assert.ok(api.inspectHost(after).load>=api.inspectHost(initial).load);
    }
    const missing=api.executeCommand(api.createHost(model,{...input,food:0},protocol),meal,protocol);
    assert.equal(missing.stats.foodConsumed,0);assert.equal(missing.stats.resourceMinutes,10);
  });
  test(`${model}: mid-action JSON resume, chunking and single-use meal settlement`,()=>{
    requireAPI();for(const command of [work,rest,meal]) {
      const start=api.startCommand(api.createHost(model,input,protocol),command,protocol),half=api.advanceHost(start,3.5);
      const restored=api.restoreHost(JSON.parse(JSON.stringify(api.exportHost(half))));
      const finish=s=>api.finishCommand(api.advanceHost(s,command.durationMinutes-3.5));
      assert.deepEqual(finish(half),finish(restored));
      const direct=api.finishCommand(api.advanceHost(start,command.durationMinutes));
      assert.ok(Math.abs(api.inspectHost(direct).load-api.inspectHost(finish(half)).load)<1e-12);
      assert.ok(Math.abs(api.inspectHost(direct).skills.a-api.inspectHost(finish(half)).skills.a)<1e-12);
      assert.throws(()=>api.advanceHost(start,command.durationMinutes+1));assert.throws(()=>api.finishCommand(start));
    }
    const start=api.startCommand(api.createHost(model,input,protocol),meal,protocol),partial=api.advanceHost(start,5);
    const interrupted=api.finishCommand(partial,true);assert.equal(interrupted.food,2);assert.equal(interrupted.stats.foodConsumed,0);
    const completed=api.finishCommand(api.advanceHost(partial,5));assert.equal(completed.food,1);
    assert.throws(()=>api.finishCommand(completed),/pending/i);
  });
  test(`${model}: obvious forged snapshot claims reject`,()=>{
    requireAPI();const pending=api.exportHost(api.startCommand(api.createHost(model,input,protocol),work,protocol));
    for(const mutate of [r=>r.state.secretHistory=[],r=>r.state.pending.forecast=1,r=>r.state.pending.status='rest',r=>r.state.pending.action.effort=.99,r=>r.state.stats.output=-1,r=>r.state.stats.practiceMinutes.c=1,r=>r.state.parts++]) {
      const bad=structuredClone(pending);mutate(bad);assert.throws(()=>api.restoreHost(bad));
    }
  });
}
test('nominal pooled gate is no stricter over mapped-state grid; initial forecasts match',()=>{
  requireAPI();assert.ok(pooled);for(let fi=0;fi<=10;fi++)for(let hi=0;hi<=10;hi++)for(const durationMinutes of [1,20,90])for(const effort of [0,.12,.5]) {
    const body={fatigue:fi/10,hunger:hi/10},action={actionId:'a',durationMinutes,effort,exertive:true,activity:'active',skill:'a'};
    const p=pooled.beginPooled(pooled.createPooled({...input,body},protocol.rival),action);
    if(assessEffort(body,action).allowed)assert.equal(p.pending.allowed,true);
    const h=api.startCommand(api.createHost('human',{...input,body},protocol),{kind:'a',durationMinutes,effort},protocol);
    const s=api.startCommand(api.createHost('pooled',{...input,body},protocol),{kind:'a',durationMinutes,effort},protocol);
    assert.ok(Math.abs(h.pending.forecast-s.pending.forecast)<1e-12);
  }
});
test('identical admitted exposure produces identical saturating skill gains including interrupted intervals',()=>{
  requireAPI();for(const skill of [.01,.2,.75,1])for(const minutes of [.1,7.5,20]) {
    const states=['human','pooled'].map(model=>api.finishCommand(api.advanceHost(api.startCommand(api.createHost(model,{...input,skills:{a:skill,b:.2}},protocol),work,protocol),minutes),minutes<20));
    assert.ok(Math.abs(api.inspectHost(states[0]).skills.a-api.inspectHost(states[1]).skills.a)<1e-12);
  }
});
test('one current proficiency per skill and one pooled body field, with no hidden history or coefficients',()=>{
  requireAPI();const snapshot=api.exportHost(api.createHost('pooled',input,protocol));
  assert.deepEqual(Object.keys(snapshot.state.person.skills),['a','b']);assert.equal(snapshot.state.person.skills.a,.2);
  for(const key of ['body','fatigue','hunger','practice','initialSkills','history','learningScale']) {
    assert.equal(Object.hasOwn(snapshot.state.person,key),false);
    const bad=structuredClone(snapshot);bad.state.person[key]=0;assert.throws(()=>api.restoreHost(bad));
  }
  const p=pooled.createPooled(input,protocol.rival);const action={actionId:'meal',durationMinutes:10,effort:0,exertive:false,activity:'meal',skill:null};
  const complete=pooled.advancePooled(pooled.beginPooled(p,action),10);
  for(const result of [{attemptId:'wrong',status:'completed',mealConsumed:true},{attemptId:complete.pending.id,status:'completed',mealConsumed:1}])assert.throws(()=>pooled.finishPooled(complete,result));
});
test('development common inputs/time/actions agree and Human trajectory matches unchanged frozen host',()=>{
  requireAPI();for(const c of protocol.development.filter(c=>c.kind==='schedule')) {
    const pair=api.runSchedule(c,protocol),baseline=old.runSchedule(c,{...protocol,rival:{...protocol.rival,learningPerMinute:.0052}}).human;
    assert.deepEqual(pair.human.initialInput,pair.pooled.initialInput);assert.deepEqual(pair.human.offered,pair.pooled.offered);
    assert.equal(pair.human.final.minutes,pair.pooled.final.minutes);assert.deepEqual(pair.human.trace,baseline.trace);assert.deepEqual(pair.human.final,baseline.final);
    const extra={...protocol,hiddenAnswer:'a',conditionSpecificMultiplier:100};
    assert.deepEqual(api.runSchedule(c,extra),pair);
  }
});
test('paid A/B/idle retests preserve task specificity, matched exposure learning and common recovery costs',()=>{
  requireAPI();const r=api.runRetest(protocol.development.find(c=>c.id==='retest-novice'),protocol);
  for(const model of ['human','pooled']) {
    const a=r.arms.a[model],b=r.arms.b[model],idle=r.arms.idle[model];
    assert.equal(a.endpoint.minutes,170);assert.equal(idle.endpoint.minutes,170);
    assert.deepEqual(a.endpoint.view.body,b.endpoint.view.body);assert.equal(a.endpoint.stats.practiceMinutes.a,120);
    assert.equal(a.endpoint.stats.restMinutes,40);assert.equal(a.endpoint.stats.foodConsumed,1);
    assert.ok(a.endpoint.view.skills.a>b.endpoint.view.skills.a);assert.equal(b.endpoint.view.skills.a,idle.endpoint.view.skills.a);
    assert.equal(a.retests.a.final.minutes,180);assert.equal(a.retests.a.final.stats.partsConsumed,7);
  }
  assert.equal(r.arms.a.human.endpoint.view.skills.a,r.arms.a.pooled.endpoint.view.skills.a);
});
test('reserved and sensitivity guard; immutable fresh artifact output; source-hash mutations reject',async()=>{
  requireAPI();assert.ok(runner);assert.throws(()=>api.runPartition(protocol,'reserved'),/freeze/i);assert.throws(()=>api.runPartition(protocol,'sensitivity'),/freeze/i);
  const valid={format:'body-isolation-freeze',version:1,registrationCommit:'780d20d',sourceSha256:{a:'one'}};
  assert.equal(runner.matchesFreeze(valid,{a:'one'}),true);assert.equal(runner.matchesFreeze(valid,{a:'two'}),false);
  const {mkdtemp,rm,readFile}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
  const dir=await mkdtemp(join(tmpdir(),'body-isolation-'));
  try {const path=join(dir,'result.json');await runner.writeNew(path,{v:1});await assert.rejects(runner.writeNew(path,{v:2}),/EEXIST/);assert.deepEqual(JSON.parse(await readFile(path,'utf8')),{v:1});}finally{await rm(dir,{recursive:true,force:true});}
});
test('diagnostics separate jointly admitted forecast output from capacity exposure and prove matched learning',()=>{
  requireAPI();const pair=api.runSchedule(protocol.development.find(c=>c.id==='sustained'),protocol);
  assert.ok(pair.comparison.diagnostics,'Required diagnostic decomposition must exist');
  const d=pair.comparison.diagnostics;
  assert.ok(d.maxMatchedExposureSkillError<1e-12);assert.ok(d.maxCumulativePracticeError<1e-12);
  assert.ok(d.maxForecastLogitResidual<1e-12);
  assert.ok(Math.abs(d.jointOutputGap+d.pooledOnlyOutput-d.humanOnlyOutput-pair.comparison.outputDifference)<1e-12);
  assert.ok(d.matchedExposureChecks>0);
});
test('pooled completed meal preserves maintenance through zero, interruptions do not add relief',()=>{
  assert.ok(pooled);const p=pooled.createPooled({...input,body:{fatigue:1,hunger:1}},protocol.rival);
  const a={actionId:'meal',durationMinutes:10,effort:0,exertive:false,activity:'meal',skill:null};
  const pending=pooled.advancePooled(pooled.beginPooled(p,a),10);
  const done=pooled.finishPooled(pending,{attemptId:pending.pending.id,status:'completed',mealConsumed:true});
  assert.ok(Math.abs(done.stamina-(11/60-10/600))<1e-12);
  const stopped=pooled.finishPooled(pending,{attemptId:pending.pending.id,status:'interrupted',mealConsumed:false});assert.equal(stopped.stamina,0);
});
test('snapshot envelope and exposure accounting are strict',()=>{
  requireAPI();for(const model of ['human','pooled']) {
    const s=api.exportHost(api.executeCommand(api.createHost(model,input,protocol),work,protocol));
    for(const mutate of [r=>r.extra=1,r=>r.state.stats.practiceMinutes.a=0,r=>r.state.stats.completedCommands=.5]) {
      const bad=structuredClone(s);mutate(bad);assert.throws(()=>api.restoreHost(bad));
    }
  }
});
