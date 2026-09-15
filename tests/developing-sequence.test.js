import test from 'node:test';
import assert from 'node:assert/strict';
import {runDevelopingSequence,compareDevelopingSequences} from '../examples/developing-person/sequence.js';

test('understood duty produces actual costly repair then recipient acknowledgment permits coordination',()=>{
 const result=runDevelopingSequence();
 assert.equal(result.repair.action,'return-item');
 assert.equal(result.repair.returned,1);
 assert.equal(result.repair.originalCommitment,'breached');
 assert.equal(result.relationship.before,'guarded');
 assert.equal(result.relationship.after,'open');
 assert.equal(result.care.action,'provide-aid');
 assert.equal(result.care.aid,1);
 assert.equal(result.care.promiseRequired,false);
 assert.ok(result.actualActivityMinutes>0);
});
test('separate interventions affect notice, care and acknowledgment without automatic forgiveness',()=>{
 assert.equal(runDevelopingSequence({notice:false}).repair.returned,0);
 assert.equal(runDevelopingSequence({care:false}).care.aid,0);
 assert.equal(runDevelopingSequence({acknowledge:false}).relationship.after,'guarded');
 assert.equal(runDevelopingSequence({observeFailure:false,notice:false}).relationship.before,'unknown');
 assert.equal(runDevelopingSequence({repairAvailable:false}).repair.returned,0);
});
test('adult opportunity changes depend on roles and earned evidence, not calendar aging',()=>{
 const result=runDevelopingSequence();
 assert.deepEqual(result.adult.actions,['assist','mentor-session','assist']);
 assert.deepEqual(runDevelopingSequence({qualification:false}).adult.actions,['assist','assist','assist']);
 assert.equal(result.adult.unmodeledDays,730);
 assert.equal(result.adult.ageOnlySkillChange,0);
 assert.ok(result.adult.finalSkill>=result.adult.initialSkill);
});
test('resuming every component preserves full actual state and simpler rule parity',()=>{
 assert.deepEqual(runDevelopingSequence({restore:true}),runDevelopingSequence());
 const result=compareDevelopingSequences();
 assert.ok(result.length>=6);
 for(const row of result)assert.deepEqual(row.candidate,row.direct);
});

test('private intention does not leak and acknowledgment changes actual coordination cost',()=>{
 const open=runDevelopingSequence(),guarded=runDevelopingSequence({acknowledge:false});
 assert.deepEqual(open.repair.observer.intentions,[]);
 assert.deepEqual(open.repair.observer.notices,[]);
 assert.equal(guarded.actualActivityMinutes-open.actualActivityMinutes,10);
 assert.equal(guarded.relationship.response,'request-confirmation');
 assert.equal(open.relationship.response,'accept');
 assert.equal(open.state.self.relationships.now,open.state.person.person.situated.now);
});

test('uncertain or rejected understanding does not trigger the accepted-duty policy',()=>{
 assert.equal(runDevelopingSequence({dutyStance:'uncertain'}).repair.returned,0);
 assert.equal(runDevelopingSequence({dutyStance:'rejected'}).repair.returned,0);
 const result=runDevelopingSequence();
 assert.equal(result.state.duties.state.recipientResponses[0].response,'accepted');
 assert.equal(result.adult.assessments[0].passed,true);
 assert.equal(result.adult.assessments[0].finishedAt-result.adult.assessments[0].startedAt,10);
});
