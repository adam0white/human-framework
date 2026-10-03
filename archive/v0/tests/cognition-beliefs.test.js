import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BELIEFS_VERSION,
  advanceBeliefs,
  createBeliefs,
  exportBeliefs,
  getBeliefView,
  receiveEvidence,
  restoreBeliefs,
  retractEvidence,
} from '../src/cognition/beliefs.js';

const setup=(extra={})=>createBeliefs({
  ownerId:'actor-a',now:10,propositions:['gate-open','route-safe'],
  sources:['actor-a','sensor-a','sensor-b','relay'],...extra,
});
const evidence=(receiptId,originId,value,observedAt,extra={})=>({
  receiptId,propositionId:'gate-open',sourceId:originId,originId,value,
  observedAt,receivedAt:10,expiresAt:30,correctsReceiptId:null,...extra,
});
const belief=(state,id='gate-open')=>getBeliefView(state).beliefs.find(item=>item.propositionId===id);

test('independent conflicting reports remain conflict without fabricated confidence',()=>{
  let state=receiveEvidence(setup(),evidence('a-true','sensor-a',true,8));
  state=receiveEvidence(state,evidence('b-false','sensor-b',false,9));
  assert.deepEqual(belief(state),{
    propositionId:'gate-open',status:'conflict',value:null,
    supportingOriginIds:['sensor-a'],opposingOriginIds:['sensor-b'],
    effectiveReceiptIds:['a-true','b-false'],
  });
  assert.deepEqual(belief(state,'route-safe'),{
    propositionId:'route-safe',status:'unknown',value:null,
    supportingOriginIds:[],opposingOriginIds:[],effectiveReceiptIds:[],
  });
});

test('stale arrivals cannot overwrite newer observations and expired newest claims do not expose older claims',()=>{
  let state=receiveEvidence(setup(),evidence('new','sensor-a',false,9,{expiresAt:12}));
  state=receiveEvidence(state,evidence('late-old','sensor-a',true,4,{receivedAt:10,expiresAt:40}));
  assert.equal(belief(state).value,false);
  state=advanceBeliefs(state,12);
  assert.deepEqual(belief(state),{
    propositionId:'gate-open',status:'unknown',value:null,
    supportingOriginIds:[],opposingOriginIds:[],effectiveReceiptIds:[],
  });
  assert.equal(state.receipts.length,2,'expiration preserves the bounded provenance ledger');
});

test('forwarded copies share one origin and an origin-authored correction suppresses every copy',()=>{
  let state=receiveEvidence(setup(),evidence('direct','sensor-a',true,8));
  state=receiveEvidence(state,evidence('forwarded','sensor-a',true,8,{sourceId:'relay'}));
  assert.deepEqual(belief(state).supportingOriginIds,['sensor-a']);
  assert.deepEqual(belief(state).effectiveReceiptIds,['direct','forwarded']);
  assert.throws(()=>receiveEvidence(state,evidence('extended-forward','sensor-a',true,8,{
    sourceId:'relay',expiresAt:40,
  })),/expiration|expiry/i);

  state=receiveEvidence(state,evidence('correction','sensor-a',false,8,{correctsReceiptId:'forwarded'}));
  assert.deepEqual(belief(state),{
    propositionId:'gate-open',status:'resolved',value:false,
    supportingOriginIds:['sensor-a'],opposingOriginIds:[],effectiveReceiptIds:['correction'],
  });
  assert.equal(state.receipts.length,3);
  assert.throws(()=>receiveEvidence(state,evidence('metadata-only','sensor-a',false,8,{
    correctsReceiptId:'correction',expiresAt:40,
  })),/same claim|change/i);
  assert.throws(()=>receiveEvidence(state,evidence('relay-rewrite','sensor-a',true,9,{
    sourceId:'relay',correctsReceiptId:'correction',
  })),/origin.*author|source/i);
});

test('origin-authored retraction suppresses direct and forwarded copies without deleting provenance',()=>{
  let state=receiveEvidence(setup(),evidence('direct','sensor-a',true,8));
  state=receiveEvidence(state,evidence('forwarded','sensor-a',true,8,{sourceId:'relay'}));
  state=retractEvidence(state,{
    receiptId:'withdrawal',targetReceiptId:'direct',sourceId:'sensor-a',originId:'sensor-a',receivedAt:10,
  });
  assert.equal(belief(state).status,'unknown');
  assert.equal(state.receipts.length,3);
  assert.throws(()=>retractEvidence(state,{
    receiptId:'relay-withdrawal',targetReceiptId:'direct',sourceId:'relay',originId:'sensor-a',receivedAt:10,
  }),/origin.*author|source/i);
});

test('same-origin ties conflict, while explicit correction and later expiry remain deterministic',()=>{
  let state=receiveEvidence(setup(),evidence('same-true','sensor-a',true,8));
  state=receiveEvidence(state,evidence('same-false','sensor-a',false,8));
  assert.equal(belief(state).status,'conflict');
  assert.deepEqual(belief(state).supportingOriginIds,['sensor-a']);
  assert.deepEqual(belief(state).opposingOriginIds,['sensor-a']);
  state=receiveEvidence(state,evidence('fixed','sensor-a',true,9,{
    correctsReceiptId:'same-false',expiresAt:20,
  }));
  assert.equal(belief(state).value,true);
  const whole=advanceBeliefs(state,20);
  let split=advanceBeliefs(state,15);split=advanceBeliefs(split,20);
  assert.deepEqual(split,whole);
  assert.equal(belief(whole).status,'unknown');
});

test('event IDs are idempotent only for identical events and arrivals occur at actor time',()=>{
  const first=evidence('same','sensor-a',true,8);
  const state=receiveEvidence(setup(),first);
  assert.deepEqual(receiveEvidence(state,{...first}),state);
  assert.throws(()=>receiveEvidence(state,{...first,value:false}),/conflicting|receipt/i);
  assert.throws(()=>receiveEvidence(state,evidence('future-delivery','sensor-a',true,9,{receivedAt:11})),/current|received/i);
  assert.throws(()=>receiveEvidence(state,evidence('future-observation','sensor-a',true,11)),/future|observed/i);
  assert.throws(()=>receiveEvidence(state,evidence('unknown-source','missing',true,8)),/source|origin/i);
});

test('bounded strict snapshots restore only for their actor and continue exactly',()=>{
  assert.throws(()=>createBeliefs({ownerId:'actor-a',now:0,propositions:['p'],sources:['s'],hidden:true}),/setup|field/i);
  let state=setup({maxReceipts:2});
  state=receiveEvidence(state,evidence('one','sensor-a',true,8));
  state=receiveEvidence(state,evidence('two','sensor-b',true,9));
  assert.throws(()=>receiveEvidence(state,evidence('three','actor-a',true,10)),/limit|receipts/i);
  const wire=JSON.parse(JSON.stringify(exportBeliefs(state)));
  const restored=restoreBeliefs(wire,'actor-a');
  assert.equal(restored.version,BELIEFS_VERSION);
  assert.deepEqual(restored,state);
  assert.deepEqual(advanceBeliefs(restored,25),advanceBeliefs(state,25));
  assert.throws(()=>restoreBeliefs(wire,'actor-b'),/owner|actor/i);

  for(const mutate of [
    value=>{value.beliefs.propositions.push('gate-open');},
    value=>{value.beliefs.receipts[0].originId='missing';},
    value=>{value.beliefs.receipts[0].observedAt=20;},
    value=>{value.extra=true;},
  ]) {
    const bad=structuredClone(wire);mutate(bad);assert.throws(()=>restoreBeliefs(bad,'actor-a'));
  }
  const getter={format:'human-framework-beliefs',version:1};
  Object.defineProperty(getter,'beliefs',{enumerable:true,get(){throw new Error('getter executed');}});
  assert.throws(()=>restoreBeliefs(getter,'actor-a'),/fields|JSON|data/i);
});
