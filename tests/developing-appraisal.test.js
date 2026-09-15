import test from 'node:test';
import assert from 'node:assert/strict';
import {runAppraisalSequence} from '../examples/developing-person/appraisal.js';

test('voluntary paid reflection changes tendency while unresolved evidence remains unresolved',()=>{
 const result=runAppraisalSequence();
 assert.equal(result.before.tendency,'check');
 assert.equal(result.after.tendency,'deliberate');
 assert.equal(result.beliefAfterReflection,'conflict');
 assert.deepEqual(result.actions,['reflect','alternative-route']);
 assert.equal(result.actualMinutes,25);
 assert.equal(result.delivered,true);
});
test('unregulated concern suggests paid checking and purpose/expiry controls do not create truth',()=>{
 assert.deepEqual(runAppraisalSequence({regulate:false}).actions,['check','alternative-route']);
 assert.equal(runAppraisalSequence({purposeActive:false}).before.tendency,'none');
 const expired=runAppraisalSequence({expire:true,regulate:false});
 assert.equal(expired.after.tendency,'none');
 assert.equal(expired.beliefAfterReflection,'conflict');
});
test('supplied choice overrides tendency, pays real cost and can fail',()=>{
 const result=runAppraisalSequence({regulate:false,override:'direct-route'});
 assert.equal(result.before.tendency,'check');
 assert.deepEqual(result.actions,['direct-route']);
 assert.equal(result.delivered,false);
 assert.equal(result.actualMinutes,10);
});
test('appraisal restores and direct concern rule reproduces all intervention cases',()=>{
 for(const options of [{},{conflict:false},{regulate:false},{purposeActive:false},{expire:true,regulate:false},{regulate:false,override:'direct-route'}]){
  assert.deepEqual(runAppraisalSequence({...options,restore:true}),runAppraisalSequence(options));
  assert.deepEqual(runAppraisalSequence({...options,policy:'direct'}),runAppraisalSequence(options));
 }
});

test('a resolved delivered report removes checking under identical closed-route physics',()=>{
 const uncertain=runAppraisalSequence({regulate:false}),resolved=runAppraisalSequence({conflict:false,regulate:false});
 assert.equal(resolved.before.tendency,'none');
 assert.deepEqual(resolved.actions,['alternative-route']);
 assert.equal(uncertain.actualMinutes-resolved.actualMinutes,5);
 assert.equal(resolved.world.routeOpen,uncertain.world.routeOpen);
});
