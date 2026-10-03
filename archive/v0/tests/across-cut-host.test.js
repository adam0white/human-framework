import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';

const path=new URL('../src/experiments/across-cut/host.js',import.meta.url);
test('the private Across Cut host implements the frozen API',async()=>{
 assert.ok(existsSync(path),'Host implementation is absent');
 const h=await import(path);
 for(const key of ['create','request','interrupt','advance','getActorView','getKnownLocalBoundary','exportState','restoreState','getWorldSummary'])assert.equal(typeof h[key],'function');
});
const host=async()=>import(path);
async function repaired(options={}){
 const h=await host();let s=h.create(options);
 for(const a of ['keeper','receiver'])s=h.request(s,a,{task:'inspect'});
 s=h.advance(s,1);
 for(const a of ['keeper','receiver'])s=h.request(s,a,{task:'repair'});
 return {h,s};
}
test('paid fixed schedule supplies two units without any messages',async()=>{
 let {h,s}=await repaired();s=h.advance(s,7);s=h.request(s,'receiver',{task:'attend',minutes:5});s=h.request(s,'keeper',{task:'release'});s=h.advance(s,12);
 assert.equal(h.getWorldSummary(s).service.units,2);assert.equal(h.getWorldSummary(s).water.pipeConsumed,2);
 assert.equal(h.getActorView(s,'receiver').paid.attend,5);assert.equal(h.getActorView(s,'keeper').sent.length,0);
 assert.equal(h.getActorView(s,'keeper').body.minutes,12);
 assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
test('interrupted repairs preserve paid work and installed fitting; release returns reservation',async()=>{
 let {h,s}=await repaired();s=h.advance(s,3);s=h.interrupt(s,'keeper');let v=h.getActorView(s,'keeper');
 assert.equal(v.local.repairProgress,2);assert.equal(v.inventory.fitting.installed,1);assert.equal(v.inventory.fitting.available,0);
 s=h.request(s,'keeper',{task:'repair'});s=h.advance(s,7);s=h.request(s,'keeper',{task:'release'});s=h.advance(s,8);s=h.interrupt(s,'keeper');v=h.getActorView(s,'keeper');
 assert.equal(v.inventory.water.available,2);assert.equal(v.inventory.water.consumed,0);assert.equal(v.paid.release,1);
});
test('same-minute receiving and launch endpoints are end-inclusive',async()=>{
 let {h,s}=await repaired({launchAt:15});s=h.advance(s,10);s=h.request(s,'keeper',{task:'release'});s=h.request(s,'receiver',{task:'attend',minutes:5});s=h.advance(s,15);
 assert.equal(h.getWorldSummary(s).service.units,2);assert.equal(h.getActorView(s,'keeper').ended,false);assert.equal(h.getActorView(s,'keeper').nextBoundary.at,30);
});
test('a late receiver cannot recover water already lost',async()=>{
 let {h,s}=await repaired();s=h.advance(s,7);s=h.request(s,'keeper',{task:'release'});s=h.advance(s,12);s=h.request(s,'receiver',{task:'attend',minutes:1});s=h.advance(s,13);
 assert.equal(h.getWorldSummary(s).service.units,0);assert.equal(h.getWorldSummary(s).water.lost,2);
});
test('cart delivery and interrupted return conserve water and actual position',async()=>{
 const h=await host();let s=h.create();s=h.request(s,'receiver',{task:'cart'});s=h.advance(s,6);s=h.interrupt(s,'receiver');let v=h.getActorView(s,'receiver');
 assert.equal(v.position,10);assert.equal(v.inventory.cartWater.consumed,1);assert.equal(h.getWorldSummary(s).service.units,1);
 s=h.request(s,'receiver',{task:'travel',to:'dock'});s=h.advance(s,10);v=h.getActorView(s,'receiver');assert.equal(v.position,6);assert.equal(v.paid.travel,4);
 assert.throws(()=>h.request(s,'receiver',{task:'cart'}),{code:'NO_SUPPLY'});
});
test('receipt-local stepping pays elapsed time without forecasting inbound radio',async()=>{
 const h=await host();let s=h.create();s=h.request(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:[1]}});s=h.advance(s,1);
 assert.equal(h.getActorView(s,'keeper').nextBoundary.at,30);s=h.advance(s,20,{actorId:'keeper',stopOnReceipt:true});
 assert.equal(s.clock.now,3);assert.equal(h.getActorView(s,'keeper').inbox.length,1);assert.equal(h.getActorView(s,'keeper').body.minutes,3);
 assert.equal(h.getActorView(s,'receiver').sent[0].deliveredAt,undefined);
});
test('own acceptance survives interrupted response and never performs promised work',async()=>{
 const h=await host();let s=h.create();s=h.request(s,'keeper',{task:'propose',terms:{releaseAt:8,attendFrom:10,attendUntil:14}});s=h.advance(s,3);
 s=h.request(s,'receiver',{task:'decide',proposalId:'keeper:p1',revision:1,decision:'accept'});
 s=h.request(s,'receiver',{task:'transmit',message:{kind:'response',proposalId:'keeper:p1',revision:1,decision:'accept'}});s=h.interrupt(s,'receiver');
 let v=h.getActorView(s,'receiver');assert.equal(v.contributions[0].status,'accepted');assert.equal(v.sent.length,0);assert.equal(v.inventory.radio.available,4);assert.equal(v.paid.attend,0);
 s=h.request(s,'receiver',{task:'decide',proposalId:'keeper:p1',revision:1,decision:'withdraw'});assert.equal(h.getActorView(s,'receiver').contributions[0].status,'withdrawn');
});
test('passive reception preserves a paid job and stale reports retain source times',async()=>{
 const h=await host();let s=h.create({channelMode:'bounded',channelOverrides:{'receiver:1':6,'receiver:2':2}});
 s=h.request(s,'keeper',{task:'rest',minutes:10});s=h.request(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:[1]}});s=h.advance(s,1);
 s=h.request(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:[1]}});s=h.advance(s,7);const v=h.getActorView(s,'keeper');
 assert.equal(v.job.task,'rest');assert.equal(v.paid.rest,7);assert.deepEqual(v.inbox.map(e=>e.messageId),['receiver:m2','receiver:m1']);assert.equal(v.notebook.filter(o=>o.cue==='launchAt').every(o=>o.observedAt===0),true);
});
test('walking contact pays six minutes each way and reveals dock notice locally',async()=>{
 const h=await host();let s=h.create({launchAt:15});s=h.request(s,'keeper',{task:'travel',to:'dock'});s=h.advance(s,6);
 assert.equal(h.getActorView(s,'keeper').local.launchAt,15);s=h.request(s,'keeper',{task:'travel',to:'valve'});s=h.advance(s,12);assert.equal(h.getActorView(s,'keeper').paid.travel,12);
});
test('strict replay rejects changed hidden physics, paid body, and message arrival',async()=>{
 const h=await host();let s=h.create();s=h.request(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:[1]}});s=h.advance(s,1);const saved=h.exportState(s);
 for(const change of [x=>x.state.people.keeper.body.fatigue=.9,x=>x.state.config.launchAt=15,x=>x.state.clock.queue[0].at++]){const bad=structuredClone(saved);change(bad);assert.throws(()=>h.restoreState(bad),{code:'INVALID_SAVE'});}
 assert.deepEqual(h.restoreState(saved),s);
});
test('actor-local decisions cannot spend another actor stop and withdrawal room',async()=>{
 const h=await host();let s=h.create();s=h.request(s,'keeper',{task:'propose',terms:{releaseAt:8,attendFrom:10,attendUntil:14}});s=h.interrupt(s,'keeper');
 s=h.request(s,'keeper',{task:'decide',proposalId:'keeper:p1',revision:1,decision:'accept'});
 for(let i=0;i<200;i++){try{s=h.request(s,'keeper',{task:'rest',minutes:2});s=h.interrupt(s,'keeper');}catch(e){assert.equal(e.code,'COMMAND_LIMIT');break;}}
 s=h.request(s,'keeper',{task:'decide',proposalId:'keeper:p1',revision:1,decision:'withdraw'});s=h.request(s,'receiver',{task:'cart'});s=h.advance(s,30);
 assert.equal(h.getActorView(s,'keeper').ended,true);assert.equal(h.getWorldSummary(s).service.units,1);assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
test('successive local receipt stops replay without merging distinct observations',async()=>{
 const h=await host();let s=h.create({channelMode:'bounded',channelOverrides:{'receiver:1':2,'receiver:2':6}});
 s=h.request(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:[1]}});s=h.advance(s,1);
 s=h.request(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:[1]}});s=h.advance(s,2);
 s=h.advance(s,20,{actorId:'keeper',stopOnReceipt:true});assert.equal(s.clock.now,3);
 s=h.advance(s,20,{actorId:'keeper',stopOnReceipt:true});assert.equal(s.clock.now,8);
 assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
test('local physical service observations support voluntary cart insurance decisions',async()=>{
 let {h,s}=await repaired();s=h.advance(s,7);s=h.request(s,'receiver',{task:'attend',minutes:5});s=h.request(s,'keeper',{task:'release'});s=h.advance(s,12);
 assert.equal(h.getActorView(s,'receiver').local.serviceUnits,2);assert.equal(h.getActorView(s,'keeper').local.serviceUnits,null);
 assert.equal(h.getWorldSummary(s).water.conservedTotal,3);
});
test('physical contact availability is observable at a station and follows actual departure',async()=>{
 const h=await host();let s=h.create();assert.equal(h.getActorView(s,'receiver').local.peerPresent,false);
 s=h.request(s,'keeper',{task:'travel',to:'dock'});s=h.advance(s,6);assert.equal(h.getActorView(s,'receiver').local.peerPresent,true);
 s=h.request(s,'keeper',{task:'transmit',via:'contact',message:{kind:'report',observationIds:[1]}});s=h.request(s,'receiver',{task:'travel',to:'valve'});s=h.advance(s,7);
 assert.equal(h.getActorView(s,'keeper').local.peerPresent,false);assert.equal(h.getActorView(s,'receiver').inbox.length,0);assert.equal(h.getActorView(s,'keeper').paid.transmit,1);assert.equal(h.getActorView(s,'keeper').inventory.radio.available,4);
});
test('cart outbound receipt tells its owner whether their actual delivery counted',async()=>{
 const h=await host();let s=h.create();s=h.request(s,'receiver',{task:'cart'});s=h.advance(s,5);
 const v=h.getActorView(s,'receiver');assert.equal(v.notebook.find(o=>o.cue==='cartDelivery').value.delivered,1);assert.equal(v.job.task,'cart');
});
test('infeasible fourteen-minute inlet stays paid and cannot meet early launch',async()=>{
 let {h,s}=await repaired({inletMinutes:14,launchAt:15});s=h.advance(s,7);s=h.request(s,'keeper',{task:'release'});s=h.advance(s,15);
 assert.equal(h.getWorldSummary(s).work.dock,14);assert.equal(h.getWorldSummary(s).service.units,0);assert.equal(h.getWorldSummary(s).water.lost,2);
 assert.equal(h.getActorView(s,'receiver').paid.repair,14);assert.equal(h.getWorldSummary(s).water.conservedTotal,3);
});
test('whole-attempt Human capacity and paid recovery govern admission',async()=>{
 const h=await host();let s=h.create({bodies:{keeper:{fatigue:.95,hunger:.15}}});s=h.request(s,'keeper',{task:'inspect'});s=h.advance(s,1);
 assert.throws(()=>h.request(s,'keeper',{task:'repair'}),{code:'CAPACITY'});const before=h.getWorldSummary(s).actors.keeper.body.fatigue;
 s=h.request(s,'keeper',{task:'rest',minutes:6});s=h.advance(s,7);assert.ok(h.getWorldSummary(s).actors.keeper.body.fatigue<before);s=h.request(s,'keeper',{task:'repair'});assert.equal(h.getActorView(s,'keeper').job.task,'repair');
});
test('withdrawal after response send leaves a stale acceptance claim in flight',async()=>{
 const h=await host();let s=h.create();s=h.request(s,'keeper',{task:'propose',terms:{releaseAt:8,attendFrom:10,attendUntil:14}});s=h.advance(s,3);
 s=h.request(s,'receiver',{task:'decide',proposalId:'keeper:p1',revision:1,decision:'accept'});s=h.request(s,'receiver',{task:'transmit',message:{kind:'response',proposalId:'keeper:p1',revision:1,decision:'accept'}});s=h.advance(s,4);
 s=h.request(s,'receiver',{task:'decide',proposalId:'keeper:p1',revision:1,decision:'withdraw'});s=h.advance(s,6);
 assert.equal(h.getActorView(s,'keeper').inbox[0].message.decision,'accept');assert.equal(h.getActorView(s,'receiver').contributions[0].status,'withdrawn');assert.equal(h.getActorView(s,'receiver').paid.attend,0);
});
test('actual promised attendance fulfills without requiring a response or confirmation',async()=>{
 const h=await host();let s=h.create();s=h.request(s,'keeper',{task:'propose',terms:{releaseAt:8,attendFrom:10,attendUntil:14}});s=h.advance(s,3);
 s=h.request(s,'receiver',{task:'decide',proposalId:'keeper:p1',revision:1,decision:'accept'});s=h.advance(s,10);s=h.request(s,'receiver',{task:'attend',minutes:4});s=h.advance(s,14);
 const v=h.getActorView(s,'receiver');assert.equal(v.contributions[0].status,'fulfilled');assert.equal(v.contributions[0].paidMinutes,4);assert.equal(v.sent.length,0);assert.equal(h.getWorldSummary(s).service.units,0);
});
test('strict JSON rejects unknown fields and accessors without evaluating them',async()=>{
 const h=await host();let read=false;const bad={};Object.defineProperty(bad,'launchAt',{enumerable:true,get(){read=true;return 15;}});assert.throws(()=>h.create(bad),{code:'INVALID_COMMAND'});assert.equal(read,false);
 assert.throws(()=>h.request(h.create(),'keeper',{task:'rest',minutes:1,secret:true}),{code:'INVALID_COMMAND'});assert.throws(()=>h.restoreState({...h.exportState(h.create()),extra:true}),{code:'INVALID_SAVE'});
});
test('late cart may deliver by launch then pay its incomplete return until public horizon',async()=>{
 const h=await host();let s=h.create({launchAt:27});s=h.advance(s,22);s=h.request(s,'receiver',{task:'cart'});s=h.advance(s,30);
 const v=h.getActorView(s,'receiver');assert.equal(h.getWorldSummary(s).service.units,1);assert.equal(v.paid.cart,8);assert.equal(v.position,8);assert.equal(v.inventory.cartWater.consumed,1);assert.equal(v.job,null);assert.equal(v.ended,true);assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
test('horizon interrupts an unfinished release and restores unused owned water',async()=>{
 let {h,s}=await repaired();s=h.advance(s,29);s=h.request(s,'keeper',{task:'release'});s=h.advance(s,30);const v=h.getActorView(s,'keeper');
 assert.equal(v.paid.release,1);assert.equal(v.inventory.water.available,2);assert.equal(v.inventory.water.reserved,0);assert.equal(h.getWorldSummary(s).water.pipeConsumed,0);assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
