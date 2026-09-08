import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as h from '/tmp/across-core-review/source/src/games/across-cut.js';
const root='/Users/abdul/code/human-framework';
const hostPath='/tmp/across-core-review/source/src/games/across-cut.js';
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const expected='788876ecb6b897d30224baa9f09d35996b6652408497d60b6b890a6c1c6ceaf2';
const before=sha(hostPath);
assert.equal(before,expected,'review target changed before probe run');
const results=[];
const view=(s,a='keeper')=>h.getActorView(s,a);
const req=(s,a,task,extra={})=>h.request(s,a,{task,...extra});
const report=(s,a,ids,via='radio')=>req(s,a,'transmit',{via,message:{kind:'report',observationIds:ids}});
const outcome=fn=>{try{return {accepted:true,view:view(fn())};}catch(e){return {accepted:false,code:e.code,message:e.message};}};
const roundtrip=s=>{assert.deepEqual(h.restoreState(h.exportState(s)),s);assert.deepEqual(h.getActorView(structuredClone(s),'keeper'),view(s));return s;};
function probe(name,fn){try{const evidence=fn();results.push({name,status:'passed',evidence});}catch(e){results.push({name,status:'failed',error:e.stack});process.exitCode=1;}}
probe('finding: a radio claim suppresses first-hand receipt on later arrival',()=>{
 let s=h.create();s=report(s,'receiver',[1,2,3,4]);s=h.advance(s,3);s=req(s,'keeper','travel',{to:'dock'});s=h.advance(s,9);roundtrip(s);
 const v=view(s),records=v.notebook.filter(o=>o.source==='dock'&&o.cue!=='peerPresent:dock');
 assert.equal(v.position,6);assert.equal(records.length,4);assert.ok(records.every(o=>o.via==='radio'));
 const send=outcome(()=>report(s,'keeper',[records.find(o=>o.cue==='launchAt').receipt],'contact'));
 assert.equal(send.code,'NOT_LOCAL_OBSERVATION');
 const inspected=h.advance(req(s,'keeper','inspect'),10);
 assert.equal(view(inspected).notebook.filter(o=>o.source==='dock'&&o.cue==='launchAt'&&o.via==='local').length,0);
 return {classification:'P2',now:v.now,location:v.location,records,send,paidInspectionAlsoFailsToCreateLaunchReceipt:true};
});
probe('hidden remote actions/outcomes do not alter whole keeper view, local command outcomes or receipt stop',()=>{
 let a=req(h.create({inletMinutes:2,launchAt:15,bodies:{receiver:{fatigue:.1,hunger:.1}}}),'receiver','cart');
 let b=req(h.create({inletMinutes:14,launchAt:27,bodies:{receiver:{fatigue:.3,hunger:.2}}}),'receiver','inspect');
 a=h.advance(a,1);b=h.advance(b,1);b=req(b,'receiver','repair');
 assert.deepEqual(view(a),view(b));
 const actions=[{task:'inspect'},{task:'repair'},{task:'release'},{task:'attend',minutes:2},{task:'cart'},{task:'travel',to:'dock'},{task:'rest',minutes:1},{task:'meal'},{task:'transmit',message:{kind:'report',observationIds:[1]}},{task:'transmit',via:'contact',message:{kind:'report',observationIds:[1]}}];
 for(const action of actions)assert.deepEqual(outcome(()=>h.request(a,'keeper',action)),outcome(()=>h.request(b,'keeper',action)));
 a=h.advance(a,30,{actorId:'keeper',stopOnReceipt:true});b=h.advance(b,30,{actorId:'keeper',stopOnReceipt:true});
 assert.deepEqual(view(a),view(b));assert.equal(view(a).now,30);roundtrip(a);roundtrip(b);
 assert.deepEqual([h.getWorldSummary(a).service.units,h.getWorldSummary(b).service.units],[1,0]);
 return {localActionsCompared:actions.length,stopTimes:[view(a).now,view(b).now],hiddenServiceUnits:[1,0]};
});
probe('all state entrypoints reject a forged active report origin without mutating caller',()=>{
 let s=report(h.create(),'receiver',[1]);s=h.advance(s,3);s=req(s,'keeper','rest',{minutes:8});
 const save=h.exportState(s);const incoming=save.state.actors.keeper.notebook.find(o=>o.via==='radio');incoming.via='local';
 const before=JSON.stringify(save);const operations={view:()=>h.getActorView(save.state,'keeper'),boundary:()=>h.getKnownLocalBoundary(save.state,'keeper'),request:()=>req(save.state,'receiver','inspect'),interrupt:()=>h.interrupt(save.state,'keeper'),advance:()=>h.advance(save.state,5),export:()=>h.exportState(save.state),summary:()=>h.getWorldSummary(save.state)};
 for(const [name,operation]of Object.entries(operations))assert.throws(operation,{code:'INVALID_STATE'},name);
 assert.throws(()=>h.restoreState(save),{code:'INVALID_SAVE'});assert.equal(JSON.stringify(save),before);
 return {rejectedEntrypoints:Object.keys(operations),envelopeRejected:true};
});
probe('capacity refusal preserves cart water; paid interrupted meal restores its own reservation',()=>{
 let s=h.create({bodies:{receiver:{fatigue:.99,hunger:1}}});const before=structuredClone(s);
 assert.throws(()=>req(s,'receiver','cart'),{code:'CAPACITY'});assert.deepEqual(s,before);assert.equal(view(s,'receiver').inventory.cartWater.reserved,0);
 s=req(s,'receiver','meal');s=h.advance(s,1);const mid=roundtrip(s);s=h.interrupt(s,'receiver');
 assert.equal(view(s,'receiver').inventory.meal.available,1);assert.equal(view(s,'receiver').paid.meal,1);assert.equal(view(mid,'receiver').inventory.meal.reserved,1);
 roundtrip(s);return {cartRefused:'CAPACITY',restoredMealAvailable:1,paidPartialMeal:1};
});
probe('cart interruption exactly at delivery consumes once and preserves loading endpoint',()=>{
 let s=req(h.create(),'receiver','cart');s=h.advance(s,5);s=h.interrupt(s,'receiver');roundtrip(s);
 let v=view(s,'receiver');assert.equal(v.position,11);assert.equal(v.inventory.cartWater.consumed,1);assert.equal(v.inventory.cartWater.available,0);
 s=req(s,'receiver','travel',{to:'dock'});s=h.advance(s,10);roundtrip(s);
 assert.equal(view(s,'receiver').position,6);assert.equal(view(s,'receiver').paid.travel,5);assert.equal(h.getWorldSummary(s).service.deliveries.length,1);assert.equal(h.getWorldSummary(s).water.conservedTotal,3);
 return {deliveryAt:5,stopPosition:11,returnPaidMinutes:5,deliveries:1,waterConserved:3};
});
probe('horizon-completing release owns consumed water and preserves due-after-end transit on restore',()=>{
 let s=req(h.create(),'keeper','inspect');s=h.advance(s,1);s=req(s,'keeper','repair');s=h.advance(s,28);s=req(s,'keeper','release');s=h.advance(s,30);roundtrip(s);
 const w=h.getWorldSummary(s);assert.equal(w.water.inTransit,2);assert.equal(w.water.conservedTotal,3);assert.equal(view(s).inventory.water.consumed,2);assert.equal(view(s).job,null);assert.equal(view(s).lastResult.code,'COMPLETED');
 assert.deepEqual(h.advance(s,50),s);return {ended:true,inTransit:2,conservedTotal:3};
});
probe('failed zero-time contact retains no sent envelope or charge; same-minute departure contact is paid without delivery',()=>{
 let s=h.create();const original=structuredClone(s);assert.throws(()=>report(s,'keeper',[1],'contact'),{code:'NO_CONTACT'});assert.deepEqual(s,original);
 s=req(s,'keeper','travel',{to:'dock'});s=h.advance(s,6);s=report(s,'keeper',[1],'contact');s=req(s,'receiver','travel',{to:'valve'});s=h.advance(s,7);roundtrip(s);
 assert.equal(view(s).paid.transmit,1);assert.equal(view(s).sent.length,1);assert.equal(view(s,'receiver').inbox.length,0);assert.equal(view(s).inventory.radio.available,4);
 assert.deepEqual(Object.keys(view(s).sent[0]).sort(),['message','messageId','recipient','sender','sentAt','via'].sort());return {paidTransmission:1,deliveredMessages:0,radioAvailable:4};
});
probe('plain data rejection executes no accessors and handles state variants consistently',()=>{
 let calls=0;const valid=h.exportState(h.create());const variants=[];
 const hidden=structuredClone(valid);Object.defineProperty(hidden.state,'hidden',{value:1,enumerable:false});variants.push(hidden);
 const getter=structuredClone(valid);Object.defineProperty(getter.state.actors.keeper.inventory,'water',{enumerable:true,get(){calls++;return {};}});variants.push(getter);
 const sparse=structuredClone(valid);sparse.state.actors.keeper.notebook.length+=1;variants.push(sparse);
 const cycle=structuredClone(valid);cycle.state.self=cycle.state;variants.push(cycle);
 const proto=structuredClone(valid);Object.setPrototypeOf(proto.state.actors.keeper.notebook,{[Symbol.iterator](){calls++;return [][Symbol.iterator]();}});variants.push(proto);
 const negativeZero=structuredClone(valid);negativeZero.state.clock.now=-0;variants.push(negativeZero);
 for(const x of variants){assert.throws(()=>h.restoreState(x),{code:'INVALID_SAVE'});assert.throws(()=>h.getActorView(x.state,'keeper'),{code:'INVALID_STATE'});}
 assert.equal(calls,0);return {variants:variants.length,executedAccessors:0};
});
const after=sha(hostPath);assert.equal(after,before,'review source changed during probes');
const output={scope:'Across 0.2.0 host only; eight targeted cases, no driver or user exports',node:process.version,sourceBefore:before,sourceAfter:after,contractSha256:sha('/tmp/across-core-review/core-contract.initial.md'),suppliedTestsSha256:sha('/tmp/across-core-review/core-tests.initial.js'),results};
writeFileSync('/tmp/across-core-review/probe-results.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
