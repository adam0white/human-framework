import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as h from '/Users/abdul/code/human-framework/.worktrees/service-day-core/src/games/service.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const ask=(s,a,t)=>{const n=h.requestTask(s,a,t);assert.ok(n.lastResponse.accepted,n.lastResponse.reason);return n;};
const round=s=>assert.deepEqual(h.restoreService(clone(h.exportService(s))),s);
const out=[];
function probe(name,fn){fn();out.push(name);}
probe('Parts: immediate refund, one-minute install, cross-owner continuation',()=>{
 let s=ask(h.createService(),'keeper','gate');assert.equal(s.jobs.keeper.reservedParts,1);s=h.interruptTask(s,'keeper');assert.equal(s.parts.keeper,2);
 s=ask(s,'keeper','gate');s=h.advanceTo(s,1);s=h.interruptTask(s,'keeper');assert.equal(s.parts.keeper,1);assert.equal(s.installedPartsByActor.keeper,1);
 s=ask(s,'partner','gate');assert.equal(s.jobs.partner.reservedParts,0);assert.equal(s.parts.partner,1);s=h.advanceTo(s,6);assert.equal(s.work.gate,6);assert.equal(s.installedPartsByActor.partner,0);round(s);
});
probe('Shed cancellation and one-part-only completion, plus requested versus own cancellation',()=>{
 let s=ask(h.createService(),'partner','salvage');s=h.advanceTo(s,7);s=h.interruptTask(s,'partner');assert.equal(s.parts.partner,1);assert.equal(h.getServiceView(s).resources.shedAvailable,true);
 s=ask(s,'keeper','salvage');s=h.advanceTo(s,15);assert.equal(s.parts.keeper,3);assert.equal(s.salvaged,1);assert.equal(h.requestTask(s,'partner','salvage').lastResponse.accepted,false);
 s=ask(s,'partner','rest');s=h.advanceTo(s,16);s=h.interruptTask(s,'partner');assert.equal(s.lastResponse.accepted,true);
 s=h.advanceTo(s,24);assert.equal(s.jobs.partner.origin,'own');const n=h.interruptTask(s,'partner');assert.equal(n.lastResponse.code,'OWN_COMMITMENT');assert.deepEqual(n.people,s.people);round(n);
});
probe('Late restored gate supplies two units while retaining morning loss',()=>{
 let s=ask(h.createService(),'partner','salvage');s=h.advanceTo(s,20);s=ask(s,'keeper','gate');s=h.advanceTo(s,26);s=ask(s,'keeper','gate');s=h.advanceTo(s,32);s=h.advanceTo(s,64);
 assert.equal(s.morning.waterService,false);assert.equal(s.outcome.clinicUnits,2);assert.equal(s.delivery.at,48);assert.equal(s.paidByActor.partner.rest,12);assert.equal(s.outcome.allService,false);round(s);
});
probe('One receiving slot excludes simultaneous and subsequent deliveries',()=>{
 let s=h.advanceTo(h.createService(),41);s=ask(s,'partner','rest');s=ask(s,'keeper','cart');assert.equal(h.requestTask(s,'partner','cart').lastResponse.accepted,false);
 s=h.advanceTo(s,59);assert.equal(s.delivery.units,1);const n=h.requestTask(s,'keeper','cart');assert.equal(n.lastResponse.code,'ALREADY_DELIVERED');assert.deepEqual(n.delivery,s.delivery);round(n);
});
probe('Budget reserves allow both requested jobs to stop and full day continuation',()=>{
 let s=h.createService();for(let i=0;i<123;i++){s=ask(s,'keeper','rest');s=h.interruptTask(s,'keeper');}
 s=h.requestTask(s,'partner','share');s=ask(s,'keeper','rest');s=ask(s,'partner','rest');assert.equal(s.commands.length,249);s=h.requestTask(s,'keeper','gate');assert.equal(s.commands.length,250);s=h.interruptTask(s,'keeper');assert.equal(s.commands.length,251);
 assert.throws(()=>h.requestTask(s,'keeper','rest'),e=>e.code==='COMMAND_LIMIT');round(s);s=h.interruptTask(s,'partner');round(s);for(let t=1;t<=64;t++){s=h.advanceTo(s,t);round(s);}assert.equal(s.outcome.at,64);assert.ok(JSON.stringify(h.exportService(s)).length<65536);
});
probe('Mixed-driver worlds and valid saves over 160 deterministic unusual histories',()=>{
 let seed=9235,checks=0,maxSave=0;const draw=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let run=0;run<160;run++){
  let s=h.createService();for(let step=0;step<180&&!s.outcome;step++){
   const before=clone(s),a=draw(2)?'keeper':'partner',op=draw(7);try{
    if(op<4)s=h.requestTask(s,a,Object.keys(h.SERVICE_TASKS)[draw(Object.keys(h.SERVICE_TASKS).length)]);
    else if(op===4)s=h.interruptTask(s,a);
    else {const to=Math.min(64,s.clock.now+draw(9));let each=s;for(let t=s.clock.now+1;t<=to;t++)each=h.advanceTo(each,t);s=h.advanceTo(s,to);assert.deepEqual(s,each);}
   }catch(e){if(!['COMMAND_LIMIT','NOT_WORKING'].includes(e.code)){fs.writeFileSync('/tmp/hf-service-core-counterexample.json',JSON.stringify({run,step,before,a,op,error:String(e)},null,2));throw e;}}
   round(s);checks++;maxSave=Math.max(maxSave,JSON.stringify(h.exportService(s)).length);
  }s=h.advanceTo(s,64);round(s);assert.ok(s.outcome);
 }
 out.push({checks,maxSave});
});
console.log(JSON.stringify({passed:out},null,2));
