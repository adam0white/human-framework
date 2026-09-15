import test from 'node:test';
import assert from 'node:assert/strict';
import {runSustainedPerson} from '../examples/sustained-person/sequence.js';
import {runSustainedComparisons} from '../examples/sustained-person/comparison.js';

const DAY=1440;
const decision=(run,id)=>run.decisions.find(entry=>entry.id===id);
function assertCloseTree(actual,expected,path='result') {
  if(typeof actual==='number'&&typeof expected==='number')return assert.ok(Math.abs(actual-expected)<=1e-9,`${path}: ${actual} != ${expected}`);
  assert.equal(Array.isArray(actual),Array.isArray(expected),path);
  if(actual&&expected&&typeof actual==='object'&&typeof expected==='object'){
    assert.deepEqual(Object.keys(actual),Object.keys(expected),`${path} keys`);
    for(const key of Object.keys(actual))assertCloseTree(actual[key],expected[key],`${path}.${key}`);
    return;
  }
  assert.deepEqual(actual,expected,path);
}

test('fourteen ordinary days account for every actor minute and offer varied work, care, learning and recovery',()=>{
  const run=runSustainedPerson();
  assert.equal(run.now,14*DAY);
  for(const person of Object.values(run.people)){
    assert.equal(person.condition.now,14*DAY);
    assert.equal(person.condition.awakeMinutes+person.condition.sleepMinutes,14*DAY);
    assert.equal(person.situated.now,14*DAY);
  }
  assert.ok(run.decisions.length>=20);
  assert.ok(new Set(run.decisions.map(entry=>entry.actionId)).size>=8);
  assert.ok(run.days.some(day=>day.opportunities.includes('paid-work')));
  assert.ok(run.days.some(day=>day.opportunities.includes('learning')));
  assert.ok(run.days.some(day=>day.opportunities.includes('service')));
  assert.ok(run.days.some(day=>day.opportunities.includes('recovery')));
  assert.ok(run.attempts.some(attempt=>attempt.status==='interrupted'));
});

test('minute and boundary drivers preserve the same world, decisions and continuous person state',()=>{
  const boundary=runSustainedPerson({driverMinutes:null});
  const minute=runSustainedPerson({driverMinutes:1});
  assertCloseTree(minute,boundary);
});

test('JSON restore during an unfinished attempt neither grants time nor loses its later consequence',()=>{
  const uninterrupted=runSustainedPerson({driverMinutes:7});
  const restored=runSustainedPerson({driverMinutes:7,restoreAt:3*DAY+133});
  assertCloseTree({...restored,checkpoints:[]},uninterrupted);
  assert.ok(restored.checkpoints.some(record=>record.pendingActionId!==null));
});

test('paid reinforcement changes delayed access and work while equal elapsed learning time stays fixed',()=>{
  const retained=runSustainedPerson();
  const control=runSustainedPerson({learning:'equal-time-control'});
  assert.equal(retained.metrics.learningMinutes,control.metrics.learningMinutes);
  assert.ok(retained.metrics.delayedAccessibility>control.metrics.delayedAccessibility);
  assert.equal(decision(retained,'late-retrieval').actionId,'use-retained-method');
  assert.equal(decision(control,'late-retrieval').actionId,'consult-source');
  assert.ok(retained.world.completedWork>control.world.completedWork);
});

test('short sleep changes an actual service attempt and later recovery can restore capacity without resetting history',()=>{
  const ordinary=runSustainedPerson();
  const short=runSustainedPerson({condition:'short-sleep'});
  assert.notEqual(decision(short,'shortage-response').capacityAllowed,decision(ordinary,'shortage-response').capacityAllowed);
  assert.equal(decision(short,'recovery-service').capacityAllowed,true);
  assert.ok(short.people.learner.condition.sleepMinutes<ordinary.people.learner.condition.sleepMinutes);
  assert.equal(short.people.learner.situated.id,'learner');
  assert.ok(short.people.learner.situated.observations.length>0);
});

test('a hidden shortage cannot change choice before communication but recipient response changes afterward',()=>{
  const shortage=runSustainedPerson({shortage:true});
  const available=runSustainedPerson({shortage:false});
  assert.deepEqual(decision(shortage,'pre-shortage-choice'),decision(available,'pre-shortage-choice'));
  assert.equal(decision(shortage,'housemate-response').actionId,'seek-alternative');
  assert.equal(decision(available,'housemate-response').actionId,'acknowledge-delivery');
  assert.ok(shortage.people.learner.situated.observations.some(record=>record.subject==='supply-available'&&record.value===false));
});

test('canonical duty survives days and records honestly fulfilled, breached and withdrawn outcomes',()=>{
  const fulfilled=runSustainedPerson();
  const breached=runSustainedPerson({service:'neglect'});
  const withdrawn=runSustainedPerson({service:'withdrawn'});
  assert.equal(fulfilled.commitments.household.status,'fulfilled');
  assert.equal(fulfilled.commitments.household.outcomeId,'household-delivery-receipt');
  assert.equal(breached.commitments.household.status,'breached');
  assert.equal(breached.commitments.household.outcomeId,null);
  assert.equal(withdrawn.commitments.household.status,'withdrawn');
  assert.equal(withdrawn.world.deliveries,0);
});

test('comparison report records useful differences, equal-time controls and simpler-rival parity without superiority claims',()=>{
  const report=runSustainedComparisons();
  assert.equal(report.format,'sustained-person-comparison');
  assert.ok(report.cases.length>=6);
  assert.equal(report.claims.modelSuperiority,false);
  assert.equal(report.claims.empiricalCalibration,false);
  assert.ok(report.cases.some(entry=>entry.differences.length>0));
  assert.ok(report.cases.some(entry=>entry.name==='direct-rule-rival'&&entry.parity.some(item=>item.matches)));
  assert.ok(report.cases.some(entry=>entry.name==='equal-time-learning'&&entry.controls.equalElapsedMinutes));
});
