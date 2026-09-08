import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as h from '/Users/abdul/code/human-framework/.worktrees/service-plan-core/src/games/service-plan.js';
const clone=x=>structuredClone(x);
const ask=(s,a,t)=>{const n=h.requestTask(s,a,t);assert.equal(n.lastResponse.accepted,true,n.lastResponse.reason);return n;};
function prefix(at=37){let s=ask(h.createServicePlan(),'keeper','meal');for(const [end,next] of [[4,'gate'],[10,'gate'],[16,'salvage'],[24,'rest']]){s=h.advanceTo(s,end);s=ask(s,'keeper',next);}return h.advanceTo(s,at);}
const safe={pumpStartAt:39,readyBy:45,waitUntil:45,fallback:'cart'};
const risk={pumpStartAt:47,readyBy:53,waitUntil:53,fallback:'none'};
const round=s=>h.restoreServicePlan(JSON.parse(JSON.stringify(h.exportServicePlan(s))));
let checks=0,termsAccepted=0,termsDeclined=0;
function invariant(s){assert.deepEqual(round(s),s);assert.equal(s.paid.discuss,s.paidByActor.keeper.discuss+s.paidByActor.partner.discuss);assert.equal(s.paidByActor.keeper.discuss,s.paidByActor.partner.discuss);assert.equal(Object.values(s.paid).reduce((a,b)=>a+b,0),s.clock.now*2);assert.equal(s.parts.keeper+s.parts.partner+(s.jobs.keeper?.reservedParts??0)+(s.jobs.partner?.reservedParts??0)+s.installedPartsByActor.keeper+s.installedPartsByActor.partner,3+s.salvaged);checks++;}
// Independently vary submitted schedules, then abandon the promised work. Paid listening must be symmetrical and save continuation exact.
for(const at of [30,33,37,40,41,43])for(const gap of [0,2,4,6])for(const waitUntil of [38,42,45,46,53,57,58])for(const fallback of ['cart','none']){
 const before=prefix(at),terms={pumpStartAt:at+2+gap,readyBy:at+8+gap,waitUntil,fallback};
 let s=h.proposePlan(before,terms);assert.deepEqual(before,prefix(at));
 if(s.coordination.pending){const receipt=clone(s.coordination.pending.receipt);assert.throws(()=>h.receivePlanResponse(s,receipt),e=>e.code==='EARLY_RESPONSE');s=h.advanceTo(s,at+2);assert.equal(s.paidByActor.keeper.discuss,2);assert.equal(s.paidByActor.partner.discuss,2);if(s.coordination.current)termsAccepted++;else termsDeclined++;assert.throws(()=>h.receivePlanResponse(s,receipt),e=>e.code==='STALE_RESPONSE');}
 invariant(s);let lump=h.advanceTo(s,64),stepped=round(s);while(!stepped.outcome){const t=h.nextVisibleEvent(stepped);assert.ok(t>stepped.clock.now);stepped=h.advanceTo(stepped,t);}assert.deepEqual(h.exportServicePlan(lump),h.exportServicePlan(stepped));invariant(lump);
}
// Either participant can stop a new proposal or a revision after zero or one paid minute, retaining the prior agreement and real body changes.
for(const revision of [false,true])for(const actor of ['keeper','partner'])for(const elapsed of [0,1]){
 let s=revision?h.advanceTo(h.proposePlan(prefix(),safe),39):prefix();const old=clone(s.coordination.current),paid=s.paidByActor.keeper.discuss;
 s=h.proposePlan(s,revision?risk:safe);s=h.advanceTo(s,s.clock.now+elapsed);const bodies=clone(s.people),parts=clone(s.parts);s=h.interruptDiscussion(s,actor);
 assert.deepEqual(s.coordination.current,old);assert.deepEqual(s.parts,parts);for(const a of ['keeper','partner']){assert.deepEqual(s.people[a].body,bodies[a].body);assert.deepEqual(s.people[a].skills,bodies[a].skills);assert.equal(s.paidByActor[a].discuss,paid+elapsed);}invariant(s);
}
// Withdrawal during a pending revision cancels only the meeting, preserving factual work and its active paid cost.
let s=h.advanceTo(h.proposePlan(prefix(),safe),39);s=h.proposePlan(s,risk);s=h.advanceTo(s,40);const work=clone(s.work),bodies=clone(s.people);s=h.withdrawContribution(s);assert.equal(s.coordination.pending,null);assert.equal(s.coordination.current.status,'withdrawn');assert.deepEqual(s.work,work);for(const a of ['keeper','partner'])assert.deepEqual(s.people[a].body,bodies[a].body);invariant(s);s=h.advanceTo(s,64);assert.equal(s.delivery.units,1);invariant(s);
// A malformed envelope never changes its supplied state. Plain JSON ambiguity/accessors are rejected before any getters execute.
s=prefix();for(const forged of [null,{},[],{id:'plan:1',at:39,participants:['partner','keeper']},{id:'plan:1',at:39,participants:['keeper','partner'],accepted:true}]){const before=clone(s);assert.throws(()=>h.receivePlanResponse(s,forged));assert.deepEqual(s,before);}
for(const field of ['pumpStartAt','readyBy','waitUntil','fallback']){const terms=clone(safe);delete terms[field];assert.throws(()=>h.proposePlan(s,terms));}
const saved=h.exportServicePlan(s);for(const mutate of [x=>x.state.coordination.pending={id:'plan:1'},x=>x.state.coordination.lastResponse={at:37,id:null,stage:'terms',accepted:true,code:'ACCEPTED',reason:'forged'},x=>x.state.paidByActor.keeper.discuss++,x=>x.state.people.keeper.skills.repair=1,x=>x.commands.push({type:'advance',to:-0})]){const x=clone(saved);mutate(x);assert.throws(()=>h.restoreServicePlan(x));}
// Exhausting ordinary actions cannot prevent paid closure or exact replay after a partial interrupted discussion.
s=prefix();while(h.getServicePlanView(s).remainingCommands>4){try{s=h.proposePlan(s,safe);s=h.interruptDiscussion(s);}catch(e){assert.equal(e.code,'COMMAND_LIMIT');break;}}s=h.advanceTo(s,64);assert.equal(s.outcome.at,64);invariant(s);assert.ok(JSON.stringify(h.exportServicePlan(s)).length<65536);
writeFileSync('/tmp/hf-plans-independent-probes.json',JSON.stringify({checks,termsAccepted,termsDeclined,finalCommands:s.commands.length,finalBytes:JSON.stringify(h.exportServicePlan(s)).length},null,2));
console.log(JSON.stringify({checks,termsAccepted,termsDeclined,finalCommands:s.commands.length},null,2));
