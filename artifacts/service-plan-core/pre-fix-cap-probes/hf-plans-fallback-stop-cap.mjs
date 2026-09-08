import assert from 'node:assert/strict';
import * as h from '/Users/abdul/code/human-framework/src/games/service-plan.js';
const safe={pumpStartAt:39,readyBy:45,waitUntil:45,fallback:'cart'};
let s=h.createServicePlan();
while(s.commands.length<249){s=h.requestTask(s,'keeper','rest');s=h.interruptTask(s,'keeper');if(s.commands.length===248)s=h.requestTask(s,'partner','share');}
s=h.requestTask(s,'keeper','rest');assert.ok(s.lastResponse.accepted);
s=h.requestTask(s,'partner','rest');assert.ok(s.lastResponse.accepted);
s=h.withdrawContribution(s);assert.equal(s.lastResponse.accepted,false);
s=h.interruptTask(s,'keeper');assert.ok(s.lastResponse.accepted);
s=h.advanceTo(s,1);
let error;try{s=h.interruptTask(s,'partner');}catch(e){error={code:e.code,message:e.message};}
console.log(JSON.stringify({now:s.clock.now,count:s.commands.length,jobs:s.jobs,error},null,2));
