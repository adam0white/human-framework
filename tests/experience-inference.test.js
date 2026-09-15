import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceBeliefs,createBeliefs,getBeliefView,receiveEvidence,retractEvidence} from '../src/cognition/beliefs.js';
import {createInference,exportInference,inferBeliefs,restoreInference} from '../src/experience/inference.js';

const propositions=['route-wet','bridge-open','route-safe','delivery-possible','warning'];
const rules=[
  {ruleId:'safe',when:[{propositionId:'bridge-open',value:true},{propositionId:'route-wet',value:false}],then:{propositionId:'route-safe',value:true}},
  {ruleId:'unsafe',when:[{propositionId:'route-wet',value:true}],then:{propositionId:'route-safe',value:false}},
  {ruleId:'deliver',when:[{propositionId:'route-safe',value:true}],then:{propositionId:'delivery-possible',value:true}},
  {ruleId:'warn',when:[{propositionId:'route-safe',value:false}],then:{propositionId:'warning',value:true}},
];
const config=()=>createInference({ownerId:'actor-a',propositions,rules});
const ledger=()=>createBeliefs({ownerId:'actor-a',now:10,propositions,sources:['sensor-a','sensor-b']});
const report=(receiptId,propositionId,value,originId='sensor-a',expiresAt=30)=>({
  receiptId,propositionId,value,sourceId:originId,originId,observedAt:9,receivedAt:10,expiresAt,correctsReceiptId:null,
});
const conclusion=(state,id,ruleset=config())=>inferBeliefs(ruleset,getBeliefView(state)).conclusions.find(item=>item.propositionId===id);

test('unknown and explicit false stay distinct; conjunction and chain require exact signed premises',()=>{
  let state=ledger();
  assert.equal(conclusion(state,'route-safe').status,'unknown');
  state=receiveEvidence(state,report('wet-false','route-wet',false));
  assert.equal(conclusion(state,'route-safe').status,'unknown');
  state=receiveEvidence(state,report('bridge-true','bridge-open',true));
  const safe=conclusion(state,'route-safe');
  assert.equal(safe.status,'true');
  assert.deepEqual(safe.supports,[{
    value:true,propositionIds:['bridge-open','route-wet'],originIds:['sensor-a'],evidenceIds:['bridge-true','wet-false'],ruleIds:['safe'],
  }]);
  assert.equal(conclusion(state,'delivery-possible').status,'true');
  assert.deepEqual(conclusion(state,'delivery-possible').supports[0].ruleIds,['deliver','safe']);
  assert.equal(conclusion(state,'warning').status,'unknown');
  const original=getBeliefView(state).beliefs.find(item=>item.propositionId==='route-safe');
  assert.equal(original.status,'unknown','derived output does not mutate original evidence');
});

test('explicit false conclusion fires a negative premise, without inferring unrelated negations',()=>{
  let state=ledger();state=receiveEvidence(state,report('wet-true','route-wet',true));
  assert.equal(conclusion(state,'route-safe').status,'false');
  assert.equal(conclusion(state,'warning').status,'true');
  assert.equal(conclusion(state,'delivery-possible').status,'unknown');
});

test('contradictory active rules produce conflict and block every downstream premise',()=>{
  let state=ledger();
  for(const receipt of [report('wet-false','route-wet',false),report('bridge-true','bridge-open',true)])state=receiveEvidence(state,receipt);
  const opposing=createInference({ownerId:'actor-a',propositions,rules:[...rules,{
    ruleId:'contra',when:[{propositionId:'bridge-open',value:true}],then:{propositionId:'route-safe',value:false},
  }]});
  assert.equal(conclusion(state,'route-safe',opposing).status,'conflict');
  assert.deepEqual(conclusion(state,'route-safe',opposing).supports.map(path=>path.value),[false,true]);
  assert.equal(conclusion(state,'delivery-possible',opposing).status,'unknown');
  assert.equal(conclusion(state,'warning',opposing).status,'unknown');
});

test('conflicted original premise blocks inference and exposes provenance without false receipt assignment',()=>{
  let state=ledger();
  state=receiveEvidence(state,report('wet-false','route-wet',false,'sensor-a'));
  state=receiveEvidence(state,report('wet-true','route-wet',true,'sensor-b'));
  state=receiveEvidence(state,report('bridge-true','bridge-open',true));
  assert.equal(conclusion(state,'route-safe').status,'unknown');
  const wet=conclusion(state,'route-wet');
  assert.equal(wet.status,'conflict');
  assert.deepEqual(wet.effectiveReceiptIds,['wet-false','wet-true']);
  assert.deepEqual(wet.supports.map(path=>path.evidenceIds),[[],[]]);
});

test('retraction and expiry remove support on recomputation, while original receipt history remains',()=>{
  let state=ledger();
  state=receiveEvidence(state,report('wet-false','route-wet',false));
  state=receiveEvidence(state,report('bridge-true','bridge-open',true,'sensor-a',12));
  assert.equal(conclusion(state,'delivery-possible').status,'true');
  const expired=advanceBeliefs(state,12);
  assert.equal(conclusion(expired,'delivery-possible').status,'unknown');
  assert.equal(expired.receipts.length,2);
  state=retractEvidence(state,{receiptId:'withdraw',targetReceiptId:'wet-false',sourceId:'sensor-a',originId:'sensor-a',receivedAt:10});
  assert.equal(conclusion(state,'delivery-possible').status,'unknown');
  assert.equal(state.receipts.length,3);
});

test('validation rejects identity, unknown references, cycles and exhausted budgets',()=>{
  assert.throws(()=>inferBeliefs(config(),getBeliefView(createBeliefs({ownerId:'actor-b',now:10,propositions,sources:['sensor-a']}))),/owner/i);
  assert.throws(()=>createInference({ownerId:'actor-a',propositions,rules:[rules[0],rules[0]]}),/duplicate.*rule/i);
  assert.throws(()=>createInference({ownerId:'actor-a',propositions,rules:[{ruleId:'missing',when:[{propositionId:'unknown',value:true}],then:{propositionId:'route-safe',value:true}}]}),/unknown.*proposition/i);
  assert.throws(()=>createInference({ownerId:'actor-a',propositions,rules:[
    {ruleId:'a',when:[{propositionId:'route-safe',value:true}],then:{propositionId:'warning',value:true}},
    {ruleId:'b',when:[{propositionId:'warning',value:true}],then:{propositionId:'route-safe',value:true}},
  ]}),/cycle/i);
  assert.throws(()=>createInference({ownerId:'actor-a',propositions,rules:Array.from({length:33},(_,i)=>({ruleId:`r${i}`,when:[{propositionId:'route-wet',value:true}],then:{propositionId:'route-safe',value:true}}))}),/rule.*limit/i);
  assert.throws(()=>createInference({ownerId:'actor-a',propositions:Array.from({length:65},(_,i)=>`p${i}`),rules:[]}),/proposition.*limit/i);
});

test('catalog and snapshots are strict detached data, and output is deterministic',()=>{
  const inference=config(),state=ledger(),view=getBeliefView(state);
  const first=inferBeliefs(inference,view);
  assert.deepEqual(first,inferBeliefs(JSON.parse(JSON.stringify(inference)),JSON.parse(JSON.stringify(view))));
  first.conclusions[0].supports.push({});
  assert.deepEqual(inferBeliefs(inference,view).conclusions[0].supports,[]);
  assert.throws(()=>inferBeliefs(inference,{...view,hidden:true}),/view.*fields/i);
  assert.throws(()=>createInference({ownerId:'actor-a',propositions,rules,hidden:true}),/setup.*fields/i);
  const getter={ownerId:'actor-a',propositions};
  Object.defineProperty(getter,'rules',{enumerable:true,get(){throw new Error('getter ran');}});
  assert.throws(()=>createInference(getter),/fields|data/i);
  const snapshot=JSON.parse(JSON.stringify(exportInference(inference)));
  assert.deepEqual(restoreInference(snapshot,'actor-a'),inference);
  assert.throws(()=>restoreInference(snapshot,'actor-b'),/owner/i);
  assert.throws(()=>restoreInference({...snapshot,hidden:true},'actor-a'),/snapshot.*fields/i);
  snapshot.inference.rules[0].when[0].value='true';
  assert.throws(()=>restoreInference(snapshot,'actor-a'),/value/i);
});

test('bounded support expansion fails explicitly instead of truncating a derivation',()=>{
  const propositions=Array.from({length:8},(_,i)=>`base${i}`)
    .concat(Array.from({length:8},(_,i)=>`derived${i}`),'final');
  const rules=Array.from({length:8},(_,i)=>Array.from({length:2},(_,j)=>({
    ruleId:`branch${i}_${j}`,when:[{propositionId:`base${i}`,value:true}],then:{propositionId:`derived${i}`,value:true},
  }))).flat();
  rules.push({ruleId:'combine',when:Array.from({length:8},(_,i)=>({propositionId:`derived${i}`,value:true})),then:{propositionId:'final',value:true}});
  rules.push({ruleId:'extra',when:[{propositionId:'base0',value:true}],then:{propositionId:'final',value:true}});
  const setup=createInference({ownerId:'actor-a',propositions,rules});
  let state=createBeliefs({ownerId:'actor-a',now:10,propositions:propositions.slice(0,8),sources:['sensor-a']});
  for(let i=0;i<8;i++)state=receiveEvidence(state,report(`receipt${i}`,`base${i}`,true));
  assert.throws(()=>inferBeliefs(setup,getBeliefView(state)),/support limit/i);
});
