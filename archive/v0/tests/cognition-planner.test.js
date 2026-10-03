import test from 'node:test';
import assert from 'node:assert/strict';
import {greedyPlan,plan} from '../src/cognition/planner.js';

const beliefs=(status='resolved',value=true)=>({
  version:'beliefs-0.1.0',ownerId:'actor-a',now:0,
  beliefs:[{propositionId:'route-safe',status,value:status==='resolved'?value:null,
    supportingOriginIds:status==='resolved'?['sensor-a']:status==='conflict'?['sensor-a']:[],
    opposingOriginIds:status==='conflict'?['sensor-b']:[],
    effectiveReceiptIds:status==='resolved'?['route-report']:status==='conflict'?['route-true','route-false']:[]}],
  receiptCount:status==='resolved'?1:status==='conflict'?2:0,maxReceipts:16,
});

function fixture(overrides={}) {
  return {
    actorId:'actor-a',now:0,beliefView:beliefs(),
    purposes:[{id:'duty',status:'active'},{id:'income',status:'active'}],
    resources:[{id:'money',quantity:0}],
    conditions:[{id:'tool-ready',value:false},{id:'delivered',value:false}],
    goals:[
      {id:'keep-duty',purposeId:'duty',dueAt:40,requires:[{kind:'condition',conditionId:'delivered',value:true}]},
      {id:'earn-money',purposeId:'income',dueAt:60,requires:[{kind:'resource',resourceId:'money',atLeast:1}]},
    ],
    actions:[
      {id:'collect-tool',durationMinutes:10,preconditions:[{kind:'belief',propositionId:'route-safe',value:true}],expectedEffects:{conditions:[{conditionId:'tool-ready',value:true}],resources:[]}},
      {id:'deliver',durationMinutes:20,preconditions:[{kind:'condition',conditionId:'tool-ready',value:true}],expectedEffects:{conditions:[{conditionId:'delivered',value:true}],resources:[]}},
      {id:'paid-work',durationMinutes:25,preconditions:[],expectedEffects:{conditions:[],resources:[{resourceId:'money',delta:1}]}},
    ],
    ...overrides,
  };
}

test('bounded search finds preparation before duty while the matched greedy rival takes immediate paid work',()=>{
  const input=fixture(),before=structuredClone(input);
  const searched=plan(input,{maxDepth:3,maxNodes:64,horizonMinutes:60});
  const greedy=greedyPlan(input,{maxDepth:3,maxNodes:64,horizonMinutes:60});
  assert.equal(searched.actionId,'collect-tool');
  assert.deepEqual(searched.steps.map(step=>step.actionId),['collect-tool','deliver','paid-work']);
  assert.deepEqual(searched.forecast.achievedGoals,[{goalId:'keep-duty',at:30},{goalId:'earn-money',at:55}]);
  assert.equal(greedy.actionId,'paid-work');
  assert.deepEqual(greedy.steps.map(step=>step.actionId),['paid-work']);
  assert.deepEqual(input,before,'planning does not mutate actor input or world resources');
  searched.forecast.resources[0].quantity=99;
  assert.equal(input.resources[0].quantity,0,'returned forecasts are detached');
});

test('unknown and conflicting beliefs satisfy neither positive nor negative requirements',()=>{
  for(const status of ['unknown','conflict'])for(const expected of [true,false]) {
    const input=fixture({
      beliefView:beliefs(status),goals:[{id:'inspect-route',purposeId:'duty',dueAt:10,requires:[{kind:'condition',conditionId:'delivered',value:true}]}],
      actions:[{id:'use-route',durationMinutes:5,preconditions:[{kind:'belief',propositionId:'route-safe',value:expected}],expectedEffects:{conditions:[{conditionId:'delivered',value:true}],resources:[]}}],
    });
    const result=plan(input,{maxDepth:2,maxNodes:16,horizonMinutes:10});
    assert.equal(result.actionId,null,`${status} cannot satisfy ${expected}`);
    assert.equal(result.trace.rootRejections[0].reason,'belief-unresolved');
    assert.equal(result.trace.rootRejections[0].beliefStatus,status);
  }
});

test('inactive purposes remove their goals without changing the actor record',()=>{
  const input=fixture({purposes:[{id:'duty',status:'withdrawn'},{id:'income',status:'active'}]});
  const result=plan(input,{maxDepth:2,maxNodes:32,horizonMinutes:60});
  assert.equal(result.actionId,'paid-work');
  assert.deepEqual(result.eligibleGoalIds,['earn-money']);
  assert.deepEqual(result.inactiveGoals,[{goalId:'keep-duty',purposeId:'duty',status:'withdrawn'}]);
});

test('deadlines, horizon, and resources are applied to forecast completion without executing effects',()=>{
  const late=fixture({goals:[{id:'keep-duty',purposeId:'duty',dueAt:29,requires:[{kind:'condition',conditionId:'delivered',value:true}]}]});
  assert.equal(plan(late,{maxDepth:3,maxNodes:64,horizonMinutes:60}).actionId,null);
  assert.equal(plan(fixture(),{maxDepth:3,maxNodes:64,horizonMinutes:29}).actionId,'paid-work');
  const resourceLimited=fixture({
    resources:[{id:'part',quantity:0}],goals:[{id:'repair',purposeId:'duty',dueAt:20,requires:[{kind:'condition',conditionId:'delivered',value:true}]}],
    actions:[{id:'repair',durationMinutes:10,preconditions:[],expectedEffects:{conditions:[{conditionId:'delivered',value:true}],resources:[{resourceId:'part',delta:-1}]}}],
  });
  const blocked=plan(resourceLimited,{maxDepth:2,maxNodes:16,horizonMinutes:20});
  assert.equal(blocked.actionId,null);
  assert.equal(blocked.trace.rootRejections[0].reason,'insufficient-resource');
  assert.equal(resourceLimited.resources[0].quantity,0);
});

test('replanning consumes actual caller state rather than a prior forecast',()=>{
  const first=plan(fixture(),{maxDepth:3,maxNodes:64,horizonMinutes:60});
  assert.equal(first.actionId,'collect-tool');
  const afterFailedCollection=fixture({
    now:10,beliefView:{...beliefs('resolved',false),now:10},
    purposes:[{id:'duty',status:'active'},{id:'income',status:'active'}],
  });
  const revised=plan(afterFailedCollection,{maxDepth:3,maxNodes:64,horizonMinutes:50});
  assert.equal(revised.actionId,'paid-work');
  assert.equal(afterFailedCollection.conditions.find(item=>item.id==='tool-ready').value,false);
});

test('resource goals stop counting when later forecast effects spend the resource',()=>{
  const input=fixture({
    purposes:[{id:'fund',status:'active'},{id:'purchase',status:'active'}],
    resources:[{id:'money',quantity:0}],conditions:[{id:'purchased',value:false}],
    goals:[
      {id:'retain-fund',purposeId:'fund',dueAt:20,requires:[{kind:'resource',resourceId:'money',atLeast:3}]},
      {id:'make-purchase',purposeId:'purchase',dueAt:20,requires:[{kind:'condition',conditionId:'purchased',value:true}]},
    ],
    actions:[
      {id:'earn',durationMinutes:5,preconditions:[],expectedEffects:{conditions:[],resources:[{resourceId:'money',delta:3}]}},
      {id:'buy',durationMinutes:5,preconditions:[{kind:'resource',resourceId:'money',atLeast:3}],expectedEffects:{conditions:[{conditionId:'purchased',value:true}],resources:[{resourceId:'money',delta:-3}]}},
    ],
  });
  const result=plan(input,{maxDepth:2,maxNodes:16,horizonMinutes:20});
  assert.deepEqual(result.steps.map(step=>step.actionId),['earn']);
  assert.deepEqual(result.forecast.achievedGoals,[{goalId:'retain-fund',at:5}]);
  assert.deepEqual(greedyPlan(input,{maxDepth:2,maxNodes:16,horizonMinutes:20}).steps.map(step=>step.actionId),['earn']);
});

test('condition goals retain their first achievement only while the condition remains true',()=>{
  const input=fixture({
    purposes:[{id:'protect',status:'active'},{id:'open',status:'active'}],resources:[],
    conditions:[{id:'protected',value:false},{id:'opened',value:false}],
    goals:[
      {id:'stay-protected',purposeId:'protect',dueAt:5,requires:[{kind:'condition',conditionId:'protected',value:true}]},
      {id:'open-door',purposeId:'open',dueAt:20,requires:[{kind:'condition',conditionId:'opened',value:true}]},
    ],
    actions:[
      {id:'protect',durationMinutes:5,preconditions:[],expectedEffects:{conditions:[{conditionId:'protected',value:true}],resources:[]}},
      {id:'open',durationMinutes:5,preconditions:[],expectedEffects:{conditions:[{conditionId:'protected',value:false},{conditionId:'opened',value:true}],resources:[]}},
    ],
  });
  const result=plan(input,{maxDepth:3,maxNodes:32,horizonMinutes:20});
  assert.deepEqual(result.steps.map(step=>step.actionId),['protect']);
  assert.deepEqual(result.forecast.achievedGoals,[{goalId:'stay-protected',at:5}]);
  assert.deepEqual(greedyPlan(input,{maxDepth:3,maxNodes:32,horizonMinutes:20}).steps.map(step=>step.actionId),['protect']);
});

test('node limits and action order produce exact deterministic traces',()=>{
  const input=fixture();
  const one=plan(input,{maxDepth:3,maxNodes:4,horizonMinutes:60});
  const two=plan(structuredClone(input),{maxDepth:3,maxNodes:4,horizonMinutes:60});
  assert.deepEqual(one,two);
  assert.deepEqual(one.search,{
    maxDepth:3,maxNodes:4,horizonMinutes:60,nodesVisited:4,
    nodeLimitReached:true,depthPruned:false,horizonPruned:false,frontierComplete:false,
  });
  assert.throws(()=>plan(input,{maxDepth:9,maxNodes:4,horizonMinutes:60}),/maxDepth|depth/i);
  assert.throws(()=>plan(input,{maxDepth:3,maxNodes:4097,horizonMinutes:60}),/maxNodes|nodes/i);
  assert.throws(()=>plan(input,{maxDepth:3,maxNodes:4,horizonMinutes:10081}),/horizon/i);
});

test('planner rejects foreign or stale belief views and malformed duplicate vocabularies',()=>{
  assert.throws(()=>plan(fixture({actorId:'actor-b'})),/owner|actor/i);
  assert.throws(()=>plan(fixture({now:1})),/belief.*time|chronology/i);
  assert.throws(()=>plan(fixture({resources:[{id:'money',quantity:0},{id:'money',quantity:1}]})),/duplicate.*resource/i);
  assert.throws(()=>plan(fixture({actions:Array.from({length:33},(_,index)=>({id:`action-${index}`,durationMinutes:1,preconditions:[],expectedEffects:{conditions:[],resources:[]}}))})),/action.*limit|actions/i);
});

test('validation rejects accessor-bearing records without executing them',()=>{
  let executed=false;
  const hostile={quantity:0};
  Object.defineProperty(hostile,'id',{enumerable:true,get(){executed=true;throw new Error('getter executed');}});
  assert.throws(()=>plan(fixture({resources:[hostile]})),/resource|fields|invalid/i);
  assert.equal(executed,false);
});

test('planner accepts only belief provenance shapes produced by the belief resolver',()=>{
  for(const mutate of [
    view=>{view.beliefs[0].supportingOriginIds=[];view.beliefs[0].effectiveReceiptIds=[];view.receiptCount=0;},
    view=>{view.beliefs[0].opposingOriginIds=['sensor-b'];},
    view=>{view.beliefs[0].supportingOriginIds.push('sensor-a');},
    view=>{view.beliefs[0].effectiveReceiptIds.push('route-report');},
    view=>{view.receiptCount=0;},
  ]) {
    const view=beliefs();mutate(view);
    assert.throws(()=>plan(fixture({beliefView:view})),/belief|origin|receipt|provenance/i);
  }
  const unknown=beliefs('unknown');unknown.beliefs[0].effectiveReceiptIds=['suppressed'];unknown.receiptCount=1;
  assert.throws(()=>plan(fixture({beliefView:unknown})),/belief|receipt|provenance/i);
});
