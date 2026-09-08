import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {latestSource,inletAttendanceLowerBound,chooseKeeper,chooseJointReceiver} from '../artifacts/across-player/policies.mjs';
import {setupFor,hash} from '../artifacts/across-player/compare.mjs';
const inputs=JSON.parse(readFileSync(new URL('../artifacts/across-player/inputs.json',import.meta.url),'utf8'));
const record=(receipt,cue,value,observedAt,receivedAt=observedAt)=>({receipt,cue,value,source:'dock',observedAt,receivedAt,via:'radio'});
const view=()=>({actorId:'keeper',now:8,horizon:30,ended:false,inventory:{water:{available:0,reserved:2},radio:{available:4}},job:{task:'release',startedAt:7,endsAt:9,elapsed:1},local:{repairMinutes:6,repairProgress:6},location:'valve',notebook:[record(1,'repairProgress:dock',0,0,8),record(2,'repairMinutes:dock',14,1,8),record(3,'launchAt',15,0,8)],inbox:[{sender:'receiver',sentAt:2,receivedAt:8}],sent:[]});

test('preregistered scope is exactly six worlds, eight controls and four interventions',()=>{
 assert.equal(inputs.worlds.length,6);assert.equal(inputs.arms.length,8);assert.equal(inputs.interventions.length,4);
 assert.equal(inputs.worlds.length*inputs.arms.length+inputs.interventions.length,52);
 assert.equal(inputs.arms.filter(arm=>arm.receiver==='player-receiver').length,5);
 assert.equal(inputs.arms.filter(arm=>arm.family==='joint no-radio').length,3);
});
test('exogenous radio slots cover both actors independent of actual traffic',()=>{
 const setup=setupFor(inputs.worlds.find(world=>world.id==='P3'));
 assert.equal(Object.keys(setup.channelOverrides).length,60);assert.ok(Object.values(setup.channelOverrides).every(value=>value===6));
 assert.deepEqual(Object.keys(setup.channelOverrides).filter(key=>key.startsWith('keeper:')).length,30);
});
test('latest facts use source time despite old later arrival',()=>{
 const v=view();v.notebook.push(record(4,'repairProgress:dock',3,5,7),record(5,'repairProgress:dock',1,3,8));
 assert.equal(latestSource(v,'dock','repairProgress:dock').value,3);
});
test('earliest inlet attendance includes paid inspection and actual sender transmission',()=>{
 const v=view();assert.equal(inletAttendanceLowerBound(v),17);
 const state={};const before=hash(v);const decision=chooseKeeper(state,v,inputs.arms.find(arm=>arm.id==='radio-adaptive'));
 assert.deepEqual(decision.commands,[{type:'stop'}]);assert.equal(hash(v),before);assert.deepEqual(state,{});
});
test('late transmissions cannot delay an already feasible earlier completion bound',()=>{
 const v=view();v.notebook[1].value=2;v.inbox.push({sender:'receiver',sentAt:8,receivedAt:10});
 assert.equal(inletAttendanceLowerBound(v),5);
});
test('missing incoming evidence does not interrupt paid release',()=>{
 const v=view();v.notebook=[];v.inbox=[];
 assert.deepEqual(chooseKeeper({},v,inputs.arms.find(arm=>arm.id==='radio-adaptive')).commands,[]);
});
test('keeper fixed controls ignore received receiver facts',()=>{
 const v=view(),unknown=view();unknown.notebook=[];unknown.inbox=[];
 for(const arm of inputs.arms.filter(arm=>['fixed-early','fixed-conservative','cart-first-keeper'].includes(arm.id)))assert.deepEqual(chooseKeeper({},v,arm),chooseKeeper({},unknown,arm));
});
test('joint cart-first receiver protects early service with actual cart before attendance',()=>{
 const v={actorId:'receiver',now:3,horizon:30,ended:false,job:null,location:'dock',local:{launchAt:15,launchDeparted:false,serviceUnits:0,repairMinutes:2,repairProgress:2},inventory:{cartWater:{available:1}}};
 assert.deepEqual(chooseJointReceiver({},v,'joint-cart-first').commands,[{type:'request',action:{task:'cart'}}]);
 v.now=13;v.inventory.cartWater.available=0;assert.deepEqual(chooseJointReceiver({},v,'joint-cart-first').commands,[{type:'request',action:{task:'attend',minutes:1}}]);
});
