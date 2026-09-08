import test from 'node:test';
import assert from 'node:assert/strict';
import {runObservationMemoryProbe} from '../scripts/observation-memory-probe.js';

test('delayed-cue comparison preserves equal deliveries, paid exposure and resume while retaining counterexamples',()=>{
  const probe=runObservationMemoryProbe();
  assert.equal(probe.cases.length,14);
  for(const row of probe.cases){
    const arms=Object.values(row.arms);
    assert.equal(new Set(arms.map(arm=>arm.paidObservationMinutes)).size,1);
    assert.equal(arms[0].paidObservationMinutes,row.deliveries.length);
    assert.equal(row.resumeIdentical,true);
  }
  for(const row of probe.cases.filter(row=>row.condition==='visible'))
    assert.ok(Object.values(row.arms).every(arm=>arm.correct));
  const rightDelayed=probe.cases.find(row=>row.condition==='delayed'&&row.initialTarget==='right');
  assert.equal(rightDelayed.arms.memory.correct,true);assert.equal(rightDelayed.arms.none.correct,false);
  const rightOverloaded=probe.cases.find(row=>row.condition==='two-distractors'&&row.initialTarget==='right');
  assert.equal(rightOverloaded.arms.memory.correct,false);assert.equal(rightOverloaded.arms.notebook.correct,true);
  for(const row of probe.cases.filter(row=>row.condition==='undisclosed-change')){
    assert.equal(row.arms.memory.correct,false);assert.equal(row.arms.notebook.correct,false);
    assert.equal(row.arms.memory.choice,row.initialTarget,'actor cannot read changed oracle');
  }
  assert.deepEqual(probe.summary.correct,{memory:10,notebook:12,none:8});
});
