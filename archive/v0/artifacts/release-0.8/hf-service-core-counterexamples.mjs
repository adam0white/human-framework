import test from 'node:test';
import assert from 'node:assert/strict';
import * as h from '/Users/abdul/code/human-framework/.worktrees/service-day-core/src/games/service.js';
test('Alternating rejected request and rejected cancellation should not consume the request budget',()=>{
 let s=h.advanceTo(h.createService(),24);const initial=structuredClone(s);
 for(let i=0;i<125;i++){
  s=h.requestTask(s,'partner','gate');assert.equal(s.lastResponse.code,'BUSY');
  s=h.interruptTask(s,'partner');assert.equal(s.lastResponse.code,'OWN_COMMITMENT');
 }
 assert.equal(s.clock.now,initial.clock.now);assert.deepEqual(s.people,initial.people);assert.deepEqual(s.parts,initial.parts);assert.deepEqual(s.jobs,initial.jobs);
 assert.equal(h.advanceTo(s,64).outcome.at,64,'Closing remains possible');
 assert.doesNotThrow(()=>h.requestTask(s,'keeper','rest'),'Refusals alone must not prohibit new requested work');
});
test('Partner refusal reason should remain in the bounded public decision record',()=>{
 let s=h.requestTask(h.createService(),'partner','share');const refused=s.lastResponse;
 s=h.requestTask(s,'keeper','rest');const v=h.getServiceView(s);
 assert.ok(v.recent.some(x=>x.actor==='partner'&&x.message.includes(refused.reason)),'The next accepted request must not erase the refusal explanation');
});
