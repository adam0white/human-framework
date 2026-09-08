import test from 'node:test';
import assert from 'node:assert/strict';
import * as policy from '../src/experiments/service-day/policies.js';

const deepFreeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(deepFreeze);}return value;};
function fixture(overrides={}){
 const tasks=['gate','divert','reopen','pump','deliver','cart','share','salvage','rest','meal'];
 const choice=task=>({task,duration:{gate:6,divert:6,reopen:3,pump:6,deliver:6,cart:18,share:2,salvage:8,rest:6,meal:4}[task],available:true,capacityEstimate:{allowed:true,causes:[]}});
 return {now:0,phase:'morning',deadline:64,milestones:[{id:'inlet',at:24},{id:'clinic',at:64}],people:{keeper:{body:{fatigue:.50,hunger:.85}}},jobs:{keeper:null,partner:null},choices:{keeper:tasks.map(choice),partner:tasks.map(choice)},resources:{parts:{keeper:2,partner:1},food:{keeper:1,partner:1},reservedParts:{keeper:0,partner:0},reservedMeals:{keeper:0,partner:0},installedParts:0,shedAvailable:true},work:{gate:0,divert:0,pump:0},supply:{available:false,reopenedAt:null},delivery:null,morning:null,outcome:null,lastResponse:null,...overrides};
}

test('view-only policies are exported and select explicit paid requests',()=>{
 assert.equal(typeof policy.chooseServiceCommand,'function');
 const v=deepFreeze(fixture());
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'request',actor:'partner',task:'salvage'});
 assert.deepEqual(policy.chooseServiceCommand(v,'reserve-clinic'),{type:'request',actor:'keeper',task:'meal'});
 assert.throws(()=>policy.chooseServiceCommand(v,'unknown'),/policy/i);
});

test('both small priorities can be identified from identical public information',()=>{
 const v=fixture();v.people.keeper.body.hunger=.35;v.resources.shedAvailable=false;
 assert.equal(policy.chooseServiceCommand(deepFreeze(v),'deadline-first').task,'gate');
 assert.equal(policy.chooseServiceCommand(v,'reserve-clinic').task,'divert');
 const late=fixture({now:18});late.people.keeper.body.hunger=.35;late.resources.shedAvailable=false;
 assert.equal(policy.chooseServiceCommand(late,'deadline-first').task,'divert');
});

test('the policy uses no partner body and respects accepted commitment work',()=>{
 const v=fixture({now:24,phase:'clinic',morning:{protected:true,waterService:true},supply:{available:true,reopenedAt:null}});
 v.people.keeper.body.hunger=.35;v.resources.parts.keeper=1;v.jobs.partner={task:'pump',startedAt:24,endsAt:30,origin:'own'};
 Object.defineProperty(v.people,'partner',{get(){throw new Error('Private partner condition accessed');}});
 assert.equal(policy.chooseServiceCommand(v,'deadline-first').type,'advance');
});

test('three-minute recovery is paid and interrupted explicitly before work resumes',()=>{
 const v=fixture({now:10});v.people.keeper.body.hunger=.35;v.resources.shedAvailable=false;
 v.choices.keeper.find(x=>x.task==='gate').capacityEstimate={allowed:false,causes:['fatigue']};
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'request',actor:'keeper',task:'rest'});
 v.jobs.keeper={task:'rest',startedAt:10,endsAt:16,origin:'request'};v.now=11;
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'advance',until:13});
 v.now=13;
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'interrupt',actor:'keeper'});
});

test('public refusal stops immediate repeated partner requests without free work',()=>{
 const v=fixture();v.lastResponse={at:0,actor:'partner',task:'salvage',accepted:false,code:'CAPACITY',reason:'Denied'};
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'request',actor:'keeper',task:'meal'});
});
