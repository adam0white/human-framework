import test from 'node:test';
import assert from 'node:assert/strict';
import {runDeliberatingPerson} from '../examples/deliberating-person/sequence.js';
import {runDeliberatingComparisons} from '../examples/deliberating-person/comparison.js';

const decision=(run,index)=>run.deliberations[index];

test('the same initial evidence produces the same first plan despite hidden cache state',()=>{
  const stocked=runDeliberatingPerson({actualCache:'stocked'});
  const empty=runDeliberatingPerson({actualCache:'empty'});
  assert.deepEqual(decision(stocked,0).plan.steps,decision(empty,0).plan.steps);
  assert.equal(decision(empty,0).plan.actionId,'cache-pickup');
});

test('a failed real attempt pays time, revises belief, and produces a new executable plan',()=>{
  const run=runDeliberatingPerson({actualCache:'empty'});
  assert.deepEqual(run.attempts.slice(0,3).map(entry=>[entry.actionId,entry.status,entry.startedAt,entry.completedAt]),[
    ['cache-pickup','failed',0,10],
    ['alternative-supply','completed',10,18],
    ['deliver-kit','completed',18,38],
  ]);
  assert.equal(decision(run,0).beliefs.beliefs.find(entry=>entry.propositionId==='cache-stocked').value,true);
  assert.equal(decision(run,1).beliefs.beliefs.find(entry=>entry.propositionId==='cache-stocked').status,'conflict');
  assert.equal(decision(run,1).plan.actionId,'alternative-supply');
  assert.equal(run.commitment.status,'fulfilled');
  assert.equal(run.commitment.outcomeId,'kit-delivery-receipt');
  assert.equal(run.world.recipientResponses,1);
  assert.equal(run.person.situated.purposes.find(entry=>entry.id==='deliver-duty').status,'completed');
  assert.equal(run.recipientDecisions[0].actionId,'acknowledge-delivery');
  assert.ok(run.housemate.observations.some(entry=>entry.subject==='delivery-received'&&entry.value===true));
  assert.equal(run.person.situated.human.minutes,run.now);
  assert.equal(run.person.situated.human.pending,null);
  assert.ok(run.deliberations.every(entry=>entry.plan.search.nodesVisited<=entry.plan.search.maxNodes));
});

test('search forecasts neither mutate actual resources nor fulfill a canonical duty',()=>{
  const run=runDeliberatingPerson({actualCache:'empty'});
  const first=decision(run,0);
  assert.ok(first.plan.steps[0].expectedEffects.resources.some(entry=>entry.resourceId==='kit'&&entry.delta===1));
  assert.ok(first.plan.forecast.achievedGoals.some(entry=>entry.goalId==='deliver-duty'));
  assert.equal(first.worldBefore.kit,0);
  assert.equal(run.attempts[0].worldAfter.kit,0);
  assert.equal(run.attempts[0].commitmentAfter,'accepted');
  assert.equal(run.attempts[0].worldAfter.recipientResponses,0);
  assert.equal(run.world.deliveries,1);
  assert.equal(run.world.recipientResponses,1);
});

test('JSON restore after an action preserves the trace without duplicate effects',()=>{
  const uninterrupted=runDeliberatingPerson({actualCache:'empty'});
  const restored=runDeliberatingPerson({actualCache:'empty',restoreAfterActions:1});
  assert.deepEqual({...restored,checkpoints:[]},{...uninterrupted,checkpoints:[]});
  assert.equal(restored.checkpoints.length,1);
  assert.equal(restored.world.alternativePurchases,1);
  assert.equal(restored.world.deliveries,1);
  assert.equal(restored.world.recipientResponses,1);
});

test('conflict blocks both belief branches and stale late evidence cannot restore the cache path',()=>{
  const conflict=runDeliberatingPerson({evidence:'conflict'});
  const stale=runDeliberatingPerson({evidence:'stale-after-correction'});
  assert.equal(decision(conflict,0).beliefs.beliefs.find(entry=>entry.propositionId==='cache-stocked').status,'conflict');
  assert.equal(decision(conflict,0).plan.steps.some(step=>step.actionId==='cache-pickup'),false);
  assert.equal(decision(conflict,0).plan.steps.some(step=>step.actionId==='alternative-supply'),false);
  assert.equal(decision(stale,0).beliefs.beliefs.find(entry=>entry.propositionId==='cache-stocked').value,false);
  assert.equal(decision(stale,0).plan.steps.some(step=>step.actionId==='cache-pickup'),false);
  assert.equal(decision(stale,0).plan.actionId,'alternative-supply');
});

test('canonical withdrawal changes the selected purpose and no delivery occurs',()=>{
  const run=runDeliberatingPerson({duty:'withdrawn'});
  assert.equal(decision(run,0).plan.actionId,'paid-work');
  assert.deepEqual(decision(run,0).plan.eligibleGoalIds,['paid-work']);
  assert.ok(decision(run,0).plan.inactiveGoals.some(entry=>entry.goalId==='deliver-duty'));
  assert.equal(run.commitment.status,'withdrawn');
  assert.equal(run.person.situated.purposes.find(entry=>entry.id==='deliver-duty').status,'withdrawn');
  assert.equal(run.world.deliveries,0);
  assert.equal(run.recipientDecisions.length,0);
});

test('an unfulfilled duty settles just after an exact inclusive deadline',()=>{
  const run=runDeliberatingPerson({evidence:'conflict',dutyDueAt:25});
  assert.deepEqual(run.attempts.map(entry=>[entry.actionId,entry.completedAt]),[['paid-work',25]]);
  assert.equal(run.now,26);
  assert.equal(run.commitment.status,'breached');
  assert.equal(run.commitment.updatedAt,26);
});

test('bounded search earns a preparation difference while serious rivals retain parity cases',()=>{
  const report=runDeliberatingComparisons();
  assert.equal(report.format,'deliberating-person-comparison');
  assert.equal(report.claims.modelSuperiority,false);
  assert.equal(report.claims.empiricalCalibration,false);
  const preparation=report.cases.find(entry=>entry.name==='missing-preparation');
  assert.equal(preparation.results['bounded-search'].firstAction,'cache-pickup');
  assert.equal(preparation.results.greedy.firstAction,'paid-work');
  assert.equal(preparation.results.direct.firstAction,'cache-pickup');
  const prepared=report.cases.find(entry=>entry.name==='prepared-parity');
  assert.deepEqual(Object.values(prepared.results).map(value=>value.firstAction),['deliver-kit','deliver-kit','deliver-kit']);
  const withdrawn=report.cases.find(entry=>entry.name==='withdrawn-duty-parity');
  assert.deepEqual(Object.values(withdrawn.results).map(value=>value.firstAction),['paid-work','paid-work','paid-work']);
  assert.ok(report.cases.some(entry=>entry.name==='deadline-pressure'));
  assert.ok(report.cases.find(entry=>entry.name==='deadline-pressure').results['bounded-search'].deliveryStatus==='breached');
  assert.ok(report.cases.some(entry=>entry.name==='resource-shortage'));
  assert.ok(report.cases.some(entry=>entry.name==='evidence-correction'));
  assert.ok(report.execution.stateBytes<250000);
});
