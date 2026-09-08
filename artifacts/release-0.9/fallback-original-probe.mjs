import assert from 'node:assert/strict';
import * as h from '/Users/abdul/code/human-framework/src/games/service-plan.js';
import {writeFileSync} from 'node:fs';
const safe={pumpStartAt:39,readyBy:45,waitUntil:45,fallback:'cart'};
const ask=(s,a,t)=>{const n=h.requestTask(s,a,t);assert.ok(n.lastResponse.accepted,n.lastResponse.reason);return n;};
function prefix(at=37){let s=ask(h.createServicePlan(),'keeper','meal');s=h.advanceTo(s,4);s=ask(s,'keeper','gate');s=h.advanceTo(s,10);s=ask(s,'keeper','gate');s=h.advanceTo(s,16);s=ask(s,'keeper','salvage');s=h.advanceTo(s,24);s=ask(s,'keeper','rest');return h.advanceTo(s,at);}
const summary=s=>({now:s.clock.now,count:s.commands.length,pending:s.coordination.pending?.id,jobs:Object.fromEntries(Object.entries(s.jobs).map(([a,j])=>[a,j?.task])),canInterrupt:h.getServicePlanView(s).coordination.canInterrupt,paid:s.paid.discuss,current:s.coordination.current,slot:s.coordination.slot});
let s=prefix();
while(s.commands.length<249){if(s.commands.length===248){s=h.requestTask(s,'partner','share');assert.equal(s.lastResponse.accepted,false);}else{s=ask(s,'keeper','rest');s=h.interruptTask(s,'keeper');}}
assert.equal(s.commands.length,249);
s=h.proposePlan(s,safe);assert.equal(s.lastResponse.accepted,true);
s=h.requestTask(s,'keeper','rest');assert.equal(s.lastResponse.accepted,false);
s=h.withdrawContribution(s);assert.equal(s.lastResponse.accepted,false);
const before=summary(s);
s=h.advanceTo(s,38);
let stopped,err;try{stopped=h.interruptDiscussion(s,'keeper');}catch(e){err={code:e.code,message:e.message};}
const closing=h.advanceTo(s,64);assert.deepEqual(h.restoreServicePlan(h.exportServicePlan(closing)),closing);
const cap={beforeAdvance:before,atPartial:summary(s),interrupt:err??summary(stopped),ended:summary(closing)};
writeFileSync('/tmp/hf-plans-fallback-cap-save.json',JSON.stringify(h.exportServicePlan(s),null,2));
writeFileSync('/tmp/hf-plans-fallback-probe.json',JSON.stringify({cap},null,2));
console.log(JSON.stringify({cap},null,2));
