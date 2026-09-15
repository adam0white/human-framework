import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceAttention,createAttention,deliverMessage,exportAttention,
  getAttentionView,processSelectedMessage,restoreAttention,
} from '../src/experience/attention.js';
import {createBeliefs,receiveEvidence,getBeliefView} from '../src/cognition/beliefs.js';

const setup=(extra={})=>createAttention({ownerId:'actor-a',now:10,reviewActionId:'review',minReviewMinutes:5,...extra});
const message=(messageId='message-a',extra={})=>({
  messageId,contextId:'route',propositionId:'route-safe',sourceId:'sensor-a',originId:'sensor-a',
  value:false,occurredAt:8,deliveredAt:10,expiresAt:30,correctsReceiptId:null,...extra,
});
const attempt=(attemptId='actor-a:1',extra={})=>({
  ownerId:'actor-a',attemptId,actionId:'review',status:'completed',finishedAt:10,elapsedMinutes:5,...extra,
});

test('delivery is visible as metadata, while only paid selected processing yields original evidence',()=>{
  let state=deliverMessage(setup(),message());
  const inbox=getAttentionView(state);
  assert.equal(JSON.stringify(inbox).includes('route-safe'),false);
  assert.equal(JSON.stringify(inbox).includes('"value"'),false);
  assert.equal(inbox.messages[0].messageId,'message-a');
  const outcome=processSelectedMessage(state,{messageId:'message-a',selectedByActor:true,attempt:attempt()});
  assert.deepEqual(outcome.evidence,{
    receiptId:'message-a',propositionId:'route-safe',sourceId:'sensor-a',originId:'sensor-a',
    value:false,observedAt:8,receivedAt:10,expiresAt:30,correctsReceiptId:null,
  });
  state=outcome.attention;
  assert.equal(getAttentionView(state).messages[0].processedAt,10);
  let beliefs=createBeliefs({ownerId:'actor-a',now:10,propositions:['route-safe'],sources:['sensor-a']});
  beliefs=receiveEvidence(beliefs,outcome.evidence);
  assert.equal(getBeliefView(beliefs).beliefs[0].value,false);
});

test('review failure, interruption, short duration and unselected report leave inbox untouched',()=>{
  const state=deliverMessage(setup(),message());
  for(const bad of [
    {selectedByActor:false,attempt:attempt()},
    {selectedByActor:true,attempt:attempt('actor-a:2',{status:'failed'})},
    {selectedByActor:true,attempt:attempt('actor-a:3',{status:'interrupted'})},
    {selectedByActor:true,attempt:attempt('actor-a:4',{elapsedMinutes:4})},
    {selectedByActor:true,attempt:attempt('actor-a:5',{actionId:'work'})},
    {selectedByActor:true,attempt:attempt('actor-b:1',{ownerId:'actor-b'})},
  ]) {
    assert.throws(()=>processSelectedMessage(state,{messageId:'message-a',...bad}));
    assert.equal(getAttentionView(state).messages[0].processedAt,null);
  }
});

test('one completed attempt selects at most one message, and repeated origin claim does not train spam',()=>{
  let state=deliverMessage(setup(),message('one'));
  state=deliverMessage(state,message('two',{sourceId:'relay'}));
  state=deliverMessage(state,message('independent',{originId:'sensor-b',sourceId:'sensor-b'}));
  state=processSelectedMessage(state,{messageId:'one',selectedByActor:true,attempt:attempt()}).attention;
  assert.throws(()=>processSelectedMessage(state,{messageId:'two',selectedByActor:true,attempt:attempt('actor-a:2')}),/origin|duplicate|claim/i);
  assert.throws(()=>processSelectedMessage(state,{messageId:'independent',selectedByActor:true,attempt:attempt()}),/attempt|used/i);
  state=processSelectedMessage(state,{messageId:'independent',selectedByActor:true,attempt:attempt('actor-a:2')}).attention;
  assert.equal(state.processings.length,2);
});

test('expired unread message stays unread; delayed processing never extends source expiry',()=>{
  let state=deliverMessage(setup(),message('short',{expiresAt:12}));
  state=advanceAttention(state,12);
  assert.equal(getAttentionView(state).messages[0].available,false);
  assert.throws(()=>processSelectedMessage(state,{messageId:'short',selectedByActor:true,attempt:attempt('actor-a:2',{finishedAt:12})}),/expired|unavailable/i);
  let other=deliverMessage(setup(),message('long',{expiresAt:20}));
  other=advanceAttention(other,15);
  const processed=processSelectedMessage(other,{messageId:'long',selectedByActor:true,attempt:attempt('actor-a:3',{finishedAt:15})});
  assert.equal(processed.evidence.receivedAt,15);
  assert.equal(processed.evidence.observedAt,8);
  assert.equal(processed.evidence.expiresAt,20);
});

test('strict owner-bound snapshot preserves processed payment, is detached and bounded',()=>{
  let state=deliverMessage(setup({maxMessages:2}),message());
  state=processSelectedMessage(state,{messageId:'message-a',selectedByActor:true,attempt:attempt()}).attention;
  state=deliverMessage(state,message('next',{occurredAt:9}));
  assert.throws(()=>deliverMessage(state,message('third',{occurredAt:7})),/limit|bound/i);
  const wire=JSON.parse(JSON.stringify(exportAttention(state)));
  const restored=restoreAttention(wire,'actor-a');
  assert.deepEqual(restored,state);
  assert.throws(()=>restoreAttention(wire,'actor-b'),/owner|actor/i);
  assert.throws(()=>processSelectedMessage(restored,{messageId:'message-a',selectedByActor:true,attempt:attempt()}),/processed|used/i);
  const view=getAttentionView(restored);view.messages[0].sourceId='changed';
  assert.equal(restored.messages[0].sourceId,'sensor-a');
  for(const mutate of [
    value=>{value.attention.messages[0].expiresAt=8;},
    value=>{value.attention.processings[0].attemptId='actor-b:1';},
    value=>{value.attention.messages[0].extra=1;},
    value=>{value.attention.processings.push(value.attention.processings[0]);},
    value=>{value.attention.processings[0].attemptId='actor-a:01';},
  ]) {
    const bad=structuredClone(wire);mutate(bad);
    assert.throws(()=>restoreAttention(bad,'actor-a'));
  }
});

test('message ID replay is exact and delivery ordering is actor-time bounded',()=>{
  const first=message();const state=deliverMessage(setup(),first);
  assert.deepEqual(deliverMessage(state,{...first}),state);
  assert.throws(()=>deliverMessage(state,{...first,value:true}),/conflict/i);
  assert.throws(()=>deliverMessage(state,message('future',{deliveredAt:11})),/current|delivery/i);
  assert.throws(()=>deliverMessage(state,message('future-event',{occurredAt:11})),/future|occurred/i);
  assert.throws(()=>deliverMessage(state,message('bad-expiry',{expiresAt:8})),/expir/i);
});

test('forwarded origin copy cannot lengthen original expiry or buy another processing',()=>{
  let state=deliverMessage(setup(),message('original',{expiresAt:15}));
  assert.throws(()=>deliverMessage(state,message('extended',{sourceId:'relay',expiresAt:30})),/expir|origin/i);
  state=deliverMessage(state,message('forwarded',{sourceId:'relay',expiresAt:15}));
  state=processSelectedMessage(state,{messageId:'original',selectedByActor:true,attempt:attempt()}).attention;
  assert.equal(getAttentionView(state).messages.find(item=>item.messageId==='forwarded').available,false);
  assert.throws(()=>processSelectedMessage(state,{messageId:'forwarded',selectedByActor:true,attempt:attempt('actor-a:2')}),/origin|duplicate/i);
});

test('processing command is strict data and cannot read accessor content',()=>{
  const state=deliverMessage(setup(),message());
  assert.throws(()=>processSelectedMessage(state,{messageId:'message-a',selectedByActor:true,attempt:attempt(),extra:true}),/command|field|data/i);
  const command={selectedByActor:true,attempt:attempt()};
  Object.defineProperty(command,'messageId',{enumerable:true,get(){throw new Error('getter ran');}});
  assert.throws(()=>processSelectedMessage(state,command),/command|field|data/i);
});

test('restore rejects a forwarded copy whose original expiry was changed in snapshot',()=>{
  let state=deliverMessage(setup(),message('one',{expiresAt:15}));
  state=deliverMessage(state,message('two',{sourceId:'relay',expiresAt:15}));
  const wire=exportAttention(state);
  wire.attention.messages[1].expiresAt=30;
  assert.throws(()=>restoreAttention(wire,'actor-a'),/expir|origin/i);
});
