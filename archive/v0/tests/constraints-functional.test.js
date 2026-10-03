import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFunctionalContext, recordRestriction, reassessRestriction,
  advanceFunctionalContext, assessFunctionalMethod, getFunctionalNotice,
  exportFunctionalContext, restoreFunctionalContext
} from '../src/constraints/functional.js';

const actors=['ada','clinic'];
const demands=['handCarry','routeAccess'];
const methods=[
  {id:'handDelivery',actionId:'deliver',durationMinutes:10,effort:.2,exertive:true,skill:'delivery',demandIds:['handCarry'],resourceCosts:[]},
  {id:'cartDelivery',actionId:'deliver',durationMinutes:22,effort:.05,exertive:true,skill:'delivery',demandIds:[],resourceCosts:[{resourceId:'cart',amount:1}]}
];
const initial=()=>createFunctionalContext({now:0,actors,demands,methods});
const restrict=state=>recordRestriction(state,{id:'r1',actorId:'ada',demandId:'handCarry',sourceId:'clinic',at:state.now,reviewAt:10});
const assess=(state,methodId,resources=[])=>assessFunctionalMethod(state,{actorId:'ada',methodId,resources});

test('a functional restriction refuses only a demanding method without changing the actor body or skill',()=>{
  const before=assess(initial(),'handDelivery');
  const state=restrict(initial());
  assert.equal(before.available,true);
  assert.deepEqual(assess(state,'handDelivery'),{
    available:false,reasonIds:['r1'],
    action:{actionId:'deliver',targetId:null,durationMinutes:10,effort:.2,exertive:true,activity:'active',skill:'delivery'},
    resourceCosts:[]
  });
  assert.deepEqual(assess(state,'cartDelivery',[{resourceId:'cart',quantity:1}]),{
    available:true,reasonIds:[],
    action:{actionId:'deliver',targetId:null,durationMinutes:22,effort:.05,exertive:true,activity:'active',skill:'delivery'},
    resourceCosts:[{resourceId:'cart',amount:1}]
  });
});

test('a method needing a tool refuses shortage and never reserves world resources',()=>{
  const state=restrict(initial());
  const resources=[{resourceId:'cart',quantity:0}];
  assert.deepEqual(assess(state,'cartDelivery',resources).reasonIds,['resource:cart']);
  assert.deepEqual(resources,[{resourceId:'cart',quantity:0}]);
  assert.deepEqual(assess(state,'cartDelivery',[{resourceId:'cart',quantity:1}]).reasonIds,[]);
});

test('review date and clock advancement never clear a restriction without a sourced reassessment',()=>{
  let state=advanceFunctionalContext(restrict(initial()),11);
  assert.deepEqual(assess(state,'handDelivery').reasonIds,['r1']);
  state=reassessRestriction(state,{id:'review1',restrictionId:'r1',sourceId:'clinic',at:11,decision:'maintain',reviewAt:20});
  assert.deepEqual(assess(advanceFunctionalContext(state,21),'handDelivery').reasonIds,['r1']);
  state=advanceFunctionalContext(state,22);
  state=reassessRestriction(state,{id:'review2',restrictionId:'r1',sourceId:'clinic',at:22,decision:'clear',reviewAt:null});
  assert.deepEqual(assess(state,'handDelivery').reasonIds,[]);
});

test('notices are explicit detached reports and do not put knowledge in the host context',()=>{
  const state=restrict(initial());
  assert.deepEqual(getFunctionalNotice(state,{actorId:'ada',noticeId:'r1'}),{
    noticeId:'r1',restrictionId:'r1',actorId:'ada',demandId:'handCarry',sourceId:'clinic',at:0,reviewAt:10,decision:'restrict'
  });
  assert.equal(getFunctionalNotice(state,{actorId:'clinic',noticeId:'r1'}),null);
  const notice=getFunctionalNotice(state,{actorId:'ada',noticeId:'r1'});
  notice.demandId='routeAccess';
  assert.equal(getFunctionalNotice(state,{actorId:'ada',noticeId:'r1'}).demandId,'handCarry');
  assert.equal(Object.hasOwn(state,'actorKnowledge'),false);
});

test('overlapping restrictions remain effective until both are explicitly cleared and review notices identify their restriction',()=>{
  let state=restrict(initial());
  state=recordRestriction(state,{id:'r2',actorId:'ada',demandId:'handCarry',sourceId:'clinic',at:0,reviewAt:10});
  assert.deepEqual(assess(state,'handDelivery').reasonIds,['r1','r2']);
  state=advanceFunctionalContext(state,11);
  state=reassessRestriction(state,{id:'clear1',restrictionId:'r1',sourceId:'clinic',at:11,decision:'clear',reviewAt:null});
  assert.deepEqual(getFunctionalNotice(state,{actorId:'ada',noticeId:'clear1'}),{
    noticeId:'clear1',restrictionId:'r1',actorId:'ada',demandId:'handCarry',sourceId:'clinic',at:11,reviewAt:null,decision:'clear'
  });
  assert.deepEqual(assess(state,'handDelivery').reasonIds,['r2']);
  state=reassessRestriction(state,{id:'clear2',restrictionId:'r2',sourceId:'clinic',at:11,decision:'clear',reviewAt:null});
  assert.equal(assess(state,'handDelivery').available,true);
});

test('sustained attempts require integer method duration and snapshot arrays reject extra properties and accessors',()=>{
  assert.throws(()=>createFunctionalContext({now:0,actors,demands,methods:[{...methods[0],durationMinutes:1.5}]}),/duration|integer/i);
  const extra=exportFunctionalContext(initial());extra.context.catalog.actors.extra='ada';
  assert.throws(()=>restoreFunctionalContext(extra,actors),/array|actor|data/i);
  const getter=exportFunctionalContext(initial());
  Object.defineProperty(getter.context.catalog.methods,'0',{get(){return methods[0]},enumerable:true});
  assert.throws(()=>restoreFunctionalContext(getter,actors),/array|method|data/i);
  const history=exportFunctionalContext(restrict(initial()));history.context.events.extra='r1';
  assert.throws(()=>restoreFunctionalContext(history,actors),/array|history|data/i);
});

test('restored history preserves refusal and rejects a forged future review',()=>{
  const state=advanceFunctionalContext(restrict(initial()),12);
  assert.deepEqual(restoreFunctionalContext(exportFunctionalContext(state),actors),state);
  const snapshot=exportFunctionalContext(state);
  snapshot.context.events[0].at=13;
  assert.throws(()=>restoreFunctionalContext(snapshot,actors),/future|chronology|review/i);
  assert.throws(()=>restoreFunctionalContext(exportFunctionalContext(state),['other']),/actor|owner/i);
});
