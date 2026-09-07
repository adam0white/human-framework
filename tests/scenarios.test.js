import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSimulation,step,getView,runSimulation,exportReplay,replay} from '../src/core/index.js';

// Import inside tests so the initial red run reports assertions for missing features.
async function scenarioModule() {
  const module=await import('../src/scenarios/index.js').catch(()=>null);
  assert.ok(module,'scenario presets must be implemented');
  return module;
}
async function experimentModule() {
  const module=await import('../src/experiments.js').catch(()=>null);
  assert.ok(module,'paired experiments must be implemented');
  return module;
}

test('each data-defined scenario runs to a bounded terminal state and replays exactly',async()=>{
  const {scenarios,getScenario}=await scenarioModule();
  assert.deepEqual(scenarios.map(s=>s.id),['courier','workshop','commons','solo']);
  for(const scenario of scenarios) {
    assert.equal(scenario.actors.length,scenario.id==='solo'?1:2);
    for(const seed of [0,7,4294967295]) {
      const state=runSimulation(getScenario(scenario.id),{seed});
      assert.ok(['won','lost'].includes(state.status));
      assert.ok(state.round<=scenario.horizon);
      assert.deepEqual(replay(JSON.parse(JSON.stringify(exportReplay(state)))),state);
      assert.ok(state.world.food>=0);
      for(const actor of state.actors)for(const value of [...Object.values(actor.body),...Object.values(actor.skills)])assert.ok(value>=0&&value<=1);
    }
  }
  const copy=getScenario('courier');copy.actors[0].skills[copy.skills[0]]=0;
  assert.notEqual(getScenario('courier').actors[0].skills[copy.skills[0]],0);
  assert.throws(()=>getScenario('missing'),/unknown scenario/i);
});

test('a paid inspection changes beliefs but hidden conditions do not leak before it',async()=>{
  const {getScenario}=await scenarioModule();
  const s=getScenario('courier'),id=s.actors[0].id;
  const initial=createSimulation(s,{seed:7});
  const other=createSimulation({...s,hazard:1-s.hazard},{seed:7});
  assert.deepEqual(getView(initial,id),getView(other,id));
  const inspect=step(initial,{type:'act',actorId:id,actionId:'observe'});
  const rest=step(initial,{type:'act',actorId:id,actionId:'rest'});
  assert.ok(inspect.actors[0].beliefs.hazard.confidence>initial.actors[0].beliefs.hazard.confidence);
  assert.deepEqual(rest.actors[0].beliefs,initial.actors[0].beliefs);
  assert.equal(inspect.round,1);
  assert.equal(inspect.history[0].decisions[0].observations.filter(o=>o.kind==='hazard-report').length,1);
});

test('paired summaries retain seed identities, exact null equality and independently checkable deltas',async()=>{
  const {compareModels}=await experimentModule();
  const result=compareModels({seeds:3});
  assert.deepEqual(result.seedValues,[101,102,103]);
  assert.equal(result.results.length,4);
  for(const scenario of result.results) {
    assert.equal(scenario.nullControl.allEqual,true);
    assert.equal(scenario.nullControl.equalPairs,3);
    assert.equal(scenario.variants.length,7);
    const full=scenario.variants.find(v=>v.id==='full');
    const baseline=scenario.variants.find(v=>v.id==='baseline');
    const delta=scenario.comparisons.find(v=>v.against==='baseline').metrics.objectiveProgress;
    const differences=full.runs.map((r,i)=>r.metrics.objectiveProgress-baseline.runs[i].metrics.objectiveProgress);
    const expected=differences.reduce((a,b)=>a+b,0)/3;
    assert.ok(Math.abs(delta.mean-expected)<1e-12);
    assert.ok(Math.abs(delta.pairedSE-Math.sqrt(differences.reduce((sum,d)=>sum+(d-expected)**2,0)/2/3))<1e-12);
    assert.ok(delta.interval95[0]<=delta.mean&&delta.interval95[1]>=delta.mean);
    for(const variant of scenario.variants) {
      assert.deepEqual(variant.runs.map(r=>r.seed),[101,102,103]);
      assert.ok(variant.runs.every(r=>Number.isFinite(r.metrics.runtimeMs)&&r.metrics.decisions>0));
    }
  }
  assert.throws(()=>compareModels({seeds:0}),/seeds/i);
  assert.throws(()=>compareModels({seeds:1.5}),/seeds/i);
});

test('one-pair experiments decline to invent a Monte Carlo standard error',async()=>{
  const {compareModels}=await experimentModule();
  const result=compareModels({seeds:1});
  const delta=result.results[0].comparisons[0].metrics.objectiveProgress;
  assert.equal(delta.pairedSE,null);
  assert.equal(delta.interval95,null);
});

test('simulate CLI validates inputs and writes a replay consumable by the core',()=>{
  const directory=mkdtempSync(join(tmpdir(),'human-framework-'));
  try {
    const file=join(directory,'courier.json');
    const run=spawnSync(process.execPath,['scripts/run.js','courier','--seed','7','--json',file],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const record=JSON.parse(readFileSync(file,'utf8'));
    assert.equal(record.format,'human-framework-replay');
    assert.equal(record.options.seed,7);
    assert.ok(['won','lost'].includes(replay(record).status));
    for(const args of [['courier','--seed','NaN'],['courier','--seed','7.2'],['courier','--surprise'],['missing']]) {
      const invalid=spawnSync(process.execPath,['scripts/run.js',...args],{encoding:'utf8'});
      assert.notEqual(invalid.status,0);
      assert.match(invalid.stderr,/seed|unknown/i);
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('benchmark CLI rejects malformed counts before writing files',()=>{
  const run=spawnSync(process.execPath,['scripts/benchmark.js','--seeds','0'],{encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/seeds/i);
});

test('benchmark artifact records its model inputs and exact source identities',()=>{
  const directory=mkdtempSync(join(tmpdir(),'human-framework-benchmark-'));
  try {
    const file=join(directory,'evaluation.json');
    const run=spawnSync(process.execPath,['scripts/benchmark.js','--seeds','2','--json',file],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const result=JSON.parse(readFileSync(file,'utf8'));
    assert.ok(Array.isArray(result.scenarioSnapshots),'benchmark must embed the scenario settings used for the run');
    assert.equal(result.scenarioSnapshots.length,4);
    assert.equal(result.environment.node,process.version);
    assert.match(result.sourceSha256['src/core/policy.js'],/^[a-f0-9]{64}$/);
    assert.ok(result.parameters.learningPerMinute>0);
    assert.deepEqual(result.seedValues,[101,102]);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('solo preserves player direction and contains no social actions or effects',async()=>{
  const {getScenario}=await scenarioModule();
  const scenario=getScenario('solo');
  assert.equal(scenario.actors.length,1);
  assert.equal(scenario.actors[0].commitment,undefined);
  assert.ok(scenario.actions.every(a=>a.kind!=='help'));
  const initial=createSimulation(scenario,{seed:7});
  const actorId=initial.actors[0].id;
  assert.deepEqual(getView(initial,actorId).peers,[]);
  const directed=step(initial,{type:'act',actorId,actionId:'rest',intention:'Recover before repairing'});
  assert.equal(directed.history[0].decisions.length,1);
  assert.equal(directed.history[0].decisions[0].actionId,'rest');
  assert.equal(directed.history[0].decisions[0].source,'player');
  assert.equal(directed.history[0].decisions[0].intention,'Recover before repairing');
  assert.ok(directed.actors[0].body.fatigue<initial.actors[0].body.fatigue);
  for(const seed of [0,7,101,4294967295]) {
    const full=runSimulation(scenario,{seed});
    assert.deepEqual(full.actors[0].relationships,{});
    assert.equal(full.actors[0].commitment,null);
    assert.equal(full.actors[0].support,0);
    assert.ok(full.history.every(h=>h.decisions.length===1&&h.decisions.every(d=>!d.outcome.promiseKept&&d.observations.every(o=>o.kind!=='assistance'))));
    for(const modules of [{relationships:false},{commitments:false},{relationships:false,commitments:false}]) {
      const ablated=runSimulation(scenario,{seed,modules});
      assert.deepEqual(ablated.actors,full.actors);
      assert.deepEqual(ablated.world,full.world);
      assert.deepEqual(ablated.history,full.history);
      assert.equal(ablated.status,full.status);
    }
  }
});
