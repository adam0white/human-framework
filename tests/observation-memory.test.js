import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemory,encodeObservation,advanceMemory,recallObservation,exportMemory,restoreMemory} from '../src/cognition/observation-memory.js';

const setup=()=>createMemory({owner:'Ada',capacity:2,lifetimeMinutes:6});
const report=(sequence,cue='gate',value='left',observedAt=0)=>({sequence,observer:'Ada',source:'signal',channel:'sight',cue,value,observedAt});

test('an actor retrieves an experienced report after the cue disappears, with provenance and detached state',()=>{
  const initial=setup(),seen=encodeObservation(initial,report(1),1);
  assert.equal(recallObservation(initial,'gate',2),null);
  const recalled=recallObservation(seen,'gate',2);
  assert.equal(recalled.value,'left');assert.equal(recalled.ageMinutes,2);
  assert.equal(recalled.source,'signal');assert.equal(recalled.channel,'sight');
  recalled.value='right';assert.equal(recallObservation(seen,'gate',3).value,'left');
  assert.equal(initial.entries.length,0);
});

test('memory receives only owner observations and rejects future, decreasing, unknown and replayed deliveries',()=>{
  const seen=encodeObservation(setup(),report(1),1);
  assert.throws(()=>encodeObservation(seen,{...report(2),observer:'Bea'},2),/observer/);
  assert.throws(()=>encodeObservation(seen,report(2,'gate','right',3),2),/future/);
  assert.throws(()=>encodeObservation(seen,report(2),0),/time/);
  assert.throws(()=>encodeObservation(seen,report(1),2),/receipt/);
  assert.throws(()=>encodeObservation(seen,{...report(2),hiddenTruth:'right'},2),/field/);
  assert.throws(()=>encodeObservation(seen,{...report(2),value:{truth:'right'}},2),/value/);
  assert.throws(()=>recallObservation(seen,'gate',0),/time/);
});

test('capacity evicts oldest delivery; retrieval cannot refresh age and receipts stay rejected after eviction',()=>{
  let memory=encodeObservation(setup(),report(1),1);
  memory=encodeObservation(memory,report(2,'bell','quiet',1),2);
  assert.equal(recallObservation(memory,'gate',2).value,'left');
  memory=encodeObservation(memory,report(3,'flag','red',2),3);
  assert.equal(recallObservation(memory,'gate',3),null);
  assert.throws(()=>encodeObservation(memory,report(1),4),/receipt/);
  assert.equal(recallObservation(memory,'bell',7),null);
  const expired=advanceMemory(memory,8);
  assert.equal(expired.entries.length,0);assert.equal(expired.lastSequence,3);
  assert.throws(()=>encodeObservation(expired,report(3),8),/receipt/);
});

test('a contradictory report replaces delivery history but carries its own source rather than inferring truth',()=>{
  let memory=encodeObservation(setup(),report(1),1);
  memory=encodeObservation(memory,{...report(2,'gate','right',1),source:'visitor',channel:'testimony'},2);
  const result=recallObservation(memory,'gate',3);
  assert.equal(result.value,'right');assert.equal(result.source,'visitor');
  assert.equal(memory.entries.length,1);
  // No world input exists: an undisclosed world change cannot update the record.
  assert.deepEqual(recallObservation(memory,'gate',3),result);
});

test('expired incoming reports consume a receipt without displacing a newer still-valid report',()=>{
  let memory=encodeObservation(setup(),report(1,'gate','right',5),6);
  memory=encodeObservation(memory,report(2,'gate','left',0),6);
  assert.equal(recallObservation(memory,'gate',6).value,'right');
  assert.equal(memory.lastSequence,2);
  assert.equal(recallObservation(memory,'gate',11),null);
});

test('JSON restore validates bounds, ownership, time, sequence and cue uniqueness',()=>{
  const memory=encodeObservation(setup(),report(1),1),snapshot=exportMemory(memory);
  assert.deepEqual(restoreMemory(JSON.parse(JSON.stringify(snapshot))),memory);
  for(const change of [
    x=>x.memory.entries[0].observer='Bea',
    x=>x.memory.entries[0].observedAt=2,
    x=>x.memory.lastSequence=0,
    x=>x.memory.capacity=0,
    x=>x.memory.entries.push({...x.memory.entries[0],sequence:2}),
    x=>x.memory.extra='hidden',
    x=>x.memory.entries[0].extra='hidden',
    x=>x.memory.now=6,
    x=>x.version=2
  ]){const forged=structuredClone(snapshot);change(forged);assert.throws(()=>restoreMemory(forged));}
});

test('ten thousand unique observations keep memory bounded without retaining a receipt log',()=>{
  let memory=setup(),maxBytes=0;
  for(let n=1;n<=10000;n++){
    memory=encodeObservation(memory,report(n,`cue${n}`,'left',n-1),n);
    if(n%100===0)memory=restoreMemory(JSON.parse(JSON.stringify(exportMemory(memory))));
    maxBytes=Math.max(maxBytes,JSON.stringify(memory).length);
  }
  assert.equal(memory.entries.length,2);assert.equal(memory.lastSequence,10000);
  assert.ok(maxBytes<1000,`bounded active state: ${maxBytes} bytes`);
});
