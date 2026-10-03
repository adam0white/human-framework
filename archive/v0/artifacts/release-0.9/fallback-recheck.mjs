import assert from 'node:assert/strict';
import * as h from '/Users/abdul/code/human-framework/src/games/service-plan.js';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const safe={pumpStartAt:39,readyBy:45,waitUntil:45,fallback:'cart'};
const ask=(s,a,t)=>{const n=h.requestTask(s,a,t);assert.ok(n.lastResponse.accepted,n.lastResponse.reason);return n;};
function prefix(){let s=ask(h.createServicePlan(),'keeper','meal');s=h.advanceTo(s,4);s=ask(s,'keeper','gate');s=h.advanceTo(s,10);s=ask(s,'keeper','gate');s=h.advanceTo(s,16);s=ask(s,'keeper','salvage');s=h.advanceTo(s,24);s=ask(s,'keeper','rest');return h.advanceTo(s,37);}
function pad(s){while(s.commands.length<249){if(s.commands.length===248){s=h.requestTask(s,'partner','share');assert.equal(s.lastResponse.accepted,false);}else{s=ask(s,'keeper','rest');s=h.interruptTask(s,'keeper');}}return s;}
function exact(s){assert.deepEqual(h.restoreServicePlan(h.exportServicePlan(s)),s);return s;}
const out={node:process.version,sha256:createHash('sha256').update(readFileSync('/Users/abdul/code/human-framework/src/games/service-plan.js')).digest('hex')};
let s=pad(prefix());s=h.proposePlan(s,safe);assert.ok(s.lastResponse.accepted);s=h.requestTask(s,'keeper','rest');s=h.withdrawContribution(s);s=h.advanceTo(s,38);
assert.ok(h.getServicePlanView(s).coordination.canInterrupt);const before=structuredClone(s);s=h.interruptDiscussion(s);assert.equal(s.coordination.pending,null);assert.equal(s.coordination.current,null);assert.equal(s.paid.discuss,2);const ended=exact(h.advanceTo(s,64));assert.equal(ended.paid.discuss,2);out.originalDiscussion={stoppedAt:38,stopCount:s.commands.length,closingCount:ended.commands.length,paid:ended.paid.discuss};
// The original partial save must remain importable with no world rewrite.
const priorSave=JSON.parse(readFileSync('/tmp/hf-plans-fallback-cap-save.json'));const restored=h.restoreServicePlan(priorSave);assert.equal(restored.clock.now,38);assert.deepEqual(h.exportServicePlan(restored).state,priorSave.state);out.originalSaveImport=true;
// Admission of a new no-effect refusal is safe only if current controls remain usable.
let next=before;try{next=h.withdrawContribution(next);}catch(e){assert.equal(e.code,'COMMAND_LIMIT');}
assert.ok(h.getServicePlanView(next).coordination.canInterrupt);
let progressed;try{progressed=h.advanceTo(next,39);}catch(e){assert.equal(e.code,'COMMAND_LIMIT');}
if(progressed){assert.ok(h.getServicePlanView(progressed).coordination.canWithdraw);progressed=h.withdrawContribution(progressed);exact(h.advanceTo(progressed,64));out.refusalSuccessor='advanced and withdrew';}
else{next=h.interruptDiscussion(next);exact(h.advanceTo(next,64));out.refusalSuccessor='advance refused atomically; discussion interruption and closing available';}
// Two requested jobs plus an interleaved elapsed minute preserve both stop rights.
s=pad(h.createServicePlan());s=ask(s,'keeper','rest');s=ask(s,'partner','rest');const beforeUnsafeRefusal=structuredClone(s);assert.throws(()=>h.withdrawContribution(s),e=>e.code==='COMMAND_LIMIT');assert.deepEqual(s,beforeUnsafeRefusal);s=h.advanceTo(s,1);s=h.interruptTask(s,'keeper');s=h.advanceTo(s,2);s=h.interruptTask(s,'partner');assert.ok(s.lastResponse.accepted);assert.equal(s.paidByActor.partner.rest,2);const closed=exact(h.advanceTo(s,64));out.twoRequestedJobs={stopCount:s.commands.length,closingCount:closed.commands.length,paidPartnerRestAtStop:s.paidByActor.partner.rest};
// Active promise plus two requested jobs permits three controls at separate elapsed times.
s=h.advanceTo(h.proposePlan(prefix(),safe),39);
while(s.commands.length<247){if(s.commands.length===246)s=h.requestTask(s,'partner','share');else{s=ask(s,'keeper','rest');s=h.interruptTask(s,'keeper');}}
s=ask(s,'keeper','rest');s=ask(s,'partner','rest');assert.equal(s.commands.length,249);
s=h.advanceTo(s,40);s=h.interruptTask(s,'partner');s=h.advanceTo(s,41);s=h.withdrawContribution(s);s=h.advanceTo(s,42);s=h.interruptTask(s,'keeper');assert.equal(s.coordination.current.status,'withdrawn');assert.equal(s.paidByActor.keeper.rest,9);const allStopped=s;s=exact(h.advanceTo(s,64));assert.equal(s.commands.length,256);out.threeInterleavedControls={stopCount:allStopped.commands.length,closingCount:s.commands.length,keeperRestBeforeClosing:allStopped.paidByActor.keeper.rest,partnerRestBeforeClosing:allStopped.paidByActor.partner.rest};
// Every feasible successor around this cap state must retain actual stopper/withdraw controls and closure.
let paths=0;function walk(state,depth){exact(state);let end;try{end=h.advanceTo(state,64);}catch(e){assert.equal(e.code,'COMMAND_LIMIT');let q=state;if(q.coordination.pending)q=h.interruptDiscussion(q);for(const a of ['keeper','partner'])if(q.jobs[a]?.origin==='request'&&q.jobs[a]?.task!=='idle')q=h.interruptTask(q,a);if(h.getServicePlanView(q).coordination.canWithdraw)q=h.withdrawContribution(q);end=h.advanceTo(q,64);}assert.equal(end.outcome.at,64);if(state.coordination.pending)assert.doesNotThrow(()=>h.interruptDiscussion(state));for(const a of ['keeper','partner'])if(state.jobs[a]?.origin==='request'&&state.jobs[a]?.task!=='idle'&&state.jobs[a]?.task!=='discuss')assert.doesNotThrow(()=>h.interruptTask(state,a));if(state.coordination.current?.status==='active'&&state.coordination.current?.contribution.status!=='fulfilled')assert.doesNotThrow(()=>h.withdrawContribution(state));paths++;if(!depth||state.outcome)return;const ops=[q=>h.requestTask(q,'keeper','rest'),q=>h.withdrawContribution(q),q=>h.advanceTo(q,q.clock.now+1),q=>h.interruptDiscussion(q)];for(const op of ops){try{const n=op(state);walk(n,depth-1);}catch(e){assert.ok(['COMMAND_LIMIT','NO_DISCUSSION','NOT_WORKING'].includes(e.code),e.stack);}}}
walk(before,3);out.capSuccessorsChecked=paths;
const file=`/tmp/hf-plans-fallback-recheck-${process.version.startsWith('v22')?'node22':'node26'}.json`;writeFileSync(file,JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
