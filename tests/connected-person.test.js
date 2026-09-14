import test from 'node:test';
import assert from 'node:assert/strict';
import {runConnectedPerson,runComparisons} from '../examples/connected-person/sequence.js';

const choice=(run,stage)=>run.decisions.find(d=>d.stage===stage);
test('instruction changes actual work method and outcome without changing procedural practice',()=>{
 const taught=runConnectedPerson(),untaught=runConnectedPerson({instruction:false});
 assert.equal(choice(taught,'learning').decision.actionId,'guided-practice');
 assert.equal(choice(untaught,'learning').decision.actionId,'basic-practice');
 assert.equal(taught.world.produced,2);assert.equal(untaught.world.produced,1);
 assert.deepEqual(taught.people.learner.human.skills,untaught.people.learner.human.skills);
 assert.ok(choice(taught,'learning').decision.evidence.includes('instruction-method'));
});
test('accepted responsibility changes choice and counterpart outcome; externally supplied neglect remains possible',()=>{
 const honor=runConnectedPerson(),absent=runConnectedPerson({acceptResponsibility:false}),neglect=runConnectedPerson({householdChoice:'paid-work'});
 assert.equal(choice(honor,'household').decision.actionId,'deliver');
 assert.equal(choice(absent,'household').decision.actionId,'paid-work');
 assert.equal(honor.world.delivered,1);assert.equal(absent.world.delivered,0);
 assert.equal(neglect.commitments.delivery.status,'breached');
 assert.equal(choice(neglect,'household').decision.provider,'external');
 assert.equal(choice(neglect,'housemate-response').decision.actionId,'seek-alternative');
 assert.equal(choice(honor,'housemate-response').decision.actionId,'acknowledge');
});
test('observed interaction changes later coordination and recipient response, hidden breach alone does not',()=>{
 const known=runConnectedPerson(),unknown=runConnectedPerson({interaction:false});
 assert.equal(choice(known,'collaboration').decision.actionId,'confirm');
 assert.equal(choice(unknown,'collaboration').decision.actionId,'coordinate');
 assert.equal(known.world.confirmations,1);assert.equal(unknown.world.confirmations,0);
 assert.equal(choice(known,'colleague-response').decision.actionId,'send-plan');
 assert.equal(choice(unknown,'colleague-response').decision.actionId,'start-together');
 assert.deepEqual(choice(known,'collaboration').bodyBefore,choice(unknown,'collaboration').bodyBefore);
});
test('hidden current obstacle cannot leak into choice, but is observed after an elapsed attempt',()=>{
 const open=runConnectedPerson(),blocked=runConnectedPerson({hiddenObstacle:true});
 assert.deepEqual(choice(open,'learning'),choice(blocked,'learning'));
 assert.equal(blocked.world.produced,0);
 assert.equal(blocked.people.learner.observations.find(o=>o.id==='practice-result').value,false);
 assert.equal(blocked.people.learner.human.minutes,open.people.learner.human.minutes);
});
test('event jumps and save/restore boundaries preserve outcomes and dated deadlines',()=>{
 const jump=runConnectedPerson(),segmented=runConnectedPerson({stepMinutes:17}),unrestored=runConnectedPerson({restoreBetween:false});
 assert.deepEqual(segmented,jump);assert.deepEqual(unrestored,jump);
 assert.equal(jump.now,14*1440);assert.ok(jump.people.learner.human.minutes<60);
 assert.equal(jump.commitments.supply.status,'breached');
});
test('revision and withdrawal require communicated state and cannot silently keep old accepted obligations',()=>{
 const revised=runConnectedPerson({responsibilityChange:'revise'}),withdrawn=runConnectedPerson({responsibilityChange:'withdraw'});
 assert.equal(revised.commitments.delivery.status,'fulfilled');
 assert.equal(revised.commitments.delivery.revision,1);
 assert.equal(choice(revised,'household').decision.actionId,'deliver-revised');
 assert.equal(revised.world.deliveryPlace,'revised meeting place');
 assert.equal(revised.commitments.delivery.outcomeId,'delivery-receipt');
 assert.equal(withdrawn.commitments.delivery.status,'withdrawn');
 assert.equal(choice(withdrawn,'household').decision.actionId,'paid-work');
});
test('direct notebook baseline receives equivalent information and matches declared outcomes',()=>{
 const report=runComparisons();assert.equal(report.cases.length,8);
 assert.ok(report.cases.every(c=>c.directBaselineMatches));
 assert.equal(report.claims.empiricalValidation,false);
});

test('withdrawing care purpose changes baseline action without erasing the accepted commitment',()=>{
 const run=runConnectedPerson({carePurpose:false});
 assert.equal(choice(run,'household').decision.actionId,'paid-work');
 assert.equal(run.commitments.delivery.status,'breached');
 assert.ok(run.people.learner.observations.some(o=>o.kind==='commitment'&&o.subject==='delivery'&&o.value==='accepted'));
});

test('unrelated observation cannot change choices or outcomes',()=>{
 const base=runConnectedPerson(),irrelevant=runConnectedPerson({irrelevantObservation:true});
 assert.deepEqual(irrelevant.decisions,base.decisions);
 assert.deepEqual(irrelevant.world,base.world);
});

test('unrelated success with the same colleague cannot erase relevant earlier breach',()=>{
 const base=runConnectedPerson(),unrelated=runConnectedPerson({irrelevantInteraction:true});
 assert.deepEqual(unrelated.decisions,base.decisions);
 assert.deepEqual(unrelated.world,base.world);
});
