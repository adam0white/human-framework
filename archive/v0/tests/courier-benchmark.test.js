import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startAction,interruptAction,exportGame} from '../src/games/courier.js';
const benchmark=await import('../scripts/courier-benchmark.js').catch(()=>({}));
test('courier benchmark records reproducible runs, identities, partial success and negative cases',()=>{
  assert.equal(typeof benchmark.buildBenchmark,'function','Benchmark must exist');
  const result=benchmark.buildBenchmark({startSeed:101,seeds:10});
  assert.equal(result.runs.length,30);assert.ok(Object.keys(result.sourceSha256).length>=4);
  assert.ok(result.runs.every(run=>run.finalStateSha256.length===64&&run.status!=='playing'));
  assert.ok(result.runs.some(run=>run.failedCrossings>0));
  assert.ok(result.runs.filter(run=>run.policy==='reliable').every(run=>run.finalSkill===0.36));
  const repeat=benchmark.buildBenchmark({startSeed:101,seeds:10});assert.deepEqual(result,repeat);
  assert.ok(result.negativeCases.length>0);
});
test('matched task practice changes the common recovered retest without invented transfer',()=>{
  const experiment=benchmark.practiceRetest();
  assert.equal(experiment.trainingMinutes,44);
  assert.deepEqual(experiment.practice.bodyBeforeRetest,experiment.control.bodyBeforeRetest);
  assert.ok(experiment.practice.skillBeforeRetest>experiment.control.skillBeforeRetest);
  assert.ok(experiment.practice.estimatedRetestSuccess>experiment.control.estimatedRetestSuccess);
});
test('ten thousand commands leave the active save bounded without a transcript',()=>{
  let g=createGame(),initial=JSON.stringify(exportGame(g)).length;
  for(let i=0;i<5000;i++)g=interruptAction(startAction(g,'load-fabric'));
  const save=JSON.stringify(exportGame(g));
  assert.ok(save.length<12000);assert.ok(save.length-initial<350);assert.equal(g.clock,0);
  assert.equal(Object.hasOwn(g,'commands'),false);assert.equal(g.crossings.footbridge.trials,0);
});
