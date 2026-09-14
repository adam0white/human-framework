import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommitment,transitionCommitment} from '../src/person/commitments.js';

const catalog={
  actors:['learner','housemate','colleague'],
  facts:['method'],purposes:['learn'],commitments:['delivery'],actions:['deliver']
};
const proposed=()=>createCommitment({
  id:'delivery',debtorId:'learner',creditorId:'housemate',dueAt:10,terms:'deliver supper'
},catalog);
const accepted=()=>transitionCommitment(proposed(),{type:'accept',actorId:'learner',at:1},catalog);

test('only the debtor can accept a proposed commitment',()=>{
  assert.throws(()=>transitionCommitment(proposed(),{type:'accept',actorId:'housemate',at:1},catalog),/debtor/);
  assert.deepEqual(accepted(),{
    id:'delivery',debtorId:'learner',creditorId:'housemate',dueAt:10,
    terms:'deliver supper',status:'accepted',revision:0,updatedAt:1,outcomeId:null
  });
});

test('a creditor revision changes terms and requires debtor reacceptance',()=>{
  const revised=transitionCommitment(accepted(),{
    type:'revise',actorId:'housemate',at:2,dueAt:12,terms:'deliver breakfast'
  },catalog);
  assert.deepEqual(revised,{
    id:'delivery',debtorId:'learner',creditorId:'housemate',dueAt:12,
    terms:'deliver breakfast',status:'revised',revision:1,updatedAt:2,outcomeId:null
  });
  assert.throws(()=>transitionCommitment(revised,{type:'fulfill',actorId:null,at:3,outcomeId:'meal:1',completed:true},catalog),/accepted/);
  assert.equal(transitionCommitment(revised,{type:'accept',actorId:'learner',at:3},catalog).status,'accepted');
});

test('only the creditor can withdraw a nonterminal commitment',()=>{
  assert.throws(()=>transitionCommitment(accepted(),{type:'withdraw',actorId:'learner',at:2},catalog),/creditor/);
  assert.equal(transitionCommitment(accepted(),{type:'withdraw',actorId:'housemate',at:2},catalog).status,'withdrawn');
});

test('fulfillment requires a completed host receipt and persists its outcome identity',()=>{
  assert.throws(()=>transitionCommitment(accepted(),{type:'fulfill',actorId:null,at:2,outcomeId:'meal:1',completed:false},catalog),/completed/);
  assert.throws(()=>transitionCommitment(accepted(),{type:'fulfill',actorId:null,at:2,outcomeId:'',completed:true},catalog),/outcome/);
  assert.throws(()=>transitionCommitment(accepted(),{type:'fulfill',actorId:'learner',at:2,outcomeId:'meal:1',completed:true},catalog),/host/);
  const fulfilled=transitionCommitment(accepted(),{type:'fulfill',actorId:null,at:2,outcomeId:'meal:1',completed:true},catalog);
  assert.equal(fulfilled.status,'fulfilled');
  assert.equal(fulfilled.updatedAt,2);
  assert.equal(fulfilled.outcomeId,'meal:1');
  assert.throws(()=>transitionCommitment(structuredClone(fulfilled),{type:'breach',actorId:null,at:11},catalog),/[Tt]erminal/);
});

test('only a host event after the deadline can mark an accepted commitment breached',()=>{
  assert.throws(()=>transitionCommitment(accepted(),{type:'breach',actorId:'learner',at:11},catalog),/host/);
  assert.throws(()=>transitionCommitment(accepted(),{type:'breach',actorId:null,at:10},catalog),/deadline/);
  assert.equal(transitionCommitment(accepted(),{type:'breach',actorId:null,at:11},catalog).status,'breached');
});

test('transitions are monotonic, terminal, and leave their inputs unchanged',()=>{
  const source=accepted();
  const before=structuredClone(source);
  const withdrawn=transitionCommitment(source,{type:'withdraw',actorId:'housemate',at:2},catalog);
  assert.deepEqual(source,before);
  assert.notEqual(withdrawn,source);
  assert.throws(()=>transitionCommitment(source,{type:'withdraw',actorId:'housemate',at:0},catalog),/monotonic/);
  assert.throws(()=>transitionCommitment(withdrawn,{type:'revise',actorId:'housemate',at:3,dueAt:12,terms:'new'},catalog),/[Tt]erminal/);
});

test('expired commitments cannot be accepted or changed after acceptance',()=>{
  assert.throws(()=>transitionCommitment(proposed(),{type:'accept',actorId:'learner',at:11},catalog),/deadline|past due/);
  assert.throws(()=>transitionCommitment(proposed(),{type:'revise',actorId:'housemate',at:2,dueAt:1,terms:'already late'},catalog),/deadline|past due/);
  for(const transition of [
    {type:'revise',actorId:'housemate',at:11,dueAt:12,terms:'delay'},
    {type:'withdraw',actorId:'housemate',at:11},
    {type:'fulfill',actorId:null,at:11,outcomeId:'meal:late',completed:true}
  ])assert.throws(()=>transitionCommitment(accepted(),transition,catalog),/breach|overdue/);
});

test('strict schemas reject unknown fields, unknown IDs, and malformed records',()=>{
  assert.throws(()=>createCommitment({id:'delivery',debtorId:'learner',creditorId:'learner',dueAt:10,terms:'same'},catalog),/different/);
  assert.throws(()=>createCommitment({id:'unknown',debtorId:'learner',creditorId:'housemate',dueAt:10,terms:'x'},catalog),/commitment/);
  assert.throws(()=>createCommitment({id:'delivery',debtorId:'learner',creditorId:'alien',dueAt:10,terms:'x'},catalog),/actor/);
  assert.throws(()=>createCommitment({id:'delivery',debtorId:'learner',creditorId:'housemate',dueAt:10,terms:'x',extra:true},catalog),/field/);
  assert.throws(()=>transitionCommitment(proposed(),{type:'accept',actorId:'learner',at:1,extra:true},catalog),/field/);
  assert.throws(()=>transitionCommitment({...proposed(),status:'invented'},{type:'accept',actorId:'learner',at:1},catalog),/status/);
  assert.throws(()=>transitionCommitment({...proposed(),revision:-1},{type:'accept',actorId:'learner',at:1},catalog),/revision/);
  assert.throws(()=>transitionCommitment({...proposed(),outcomeId:'forged'},{type:'accept',actorId:'learner',at:1},catalog),/outcome/);
});

test('catalog validation matches the situated-person boundary',()=>{
  const minimal={actors:['learner','housemate'],facts:[],purposes:[],commitments:['delivery'],actions:[]};
  assert.equal(createCommitment({id:'delivery',debtorId:'learner',creditorId:'housemate',dueAt:1,terms:'x'},minimal).status,'proposed');

  const extra=[];extra.note='hidden';
  assert.throws(()=>createCommitment({id:'delivery',debtorId:'learner',creditorId:'housemate',dueAt:1,terms:'x'},{...minimal,actions:extra}),/catalog actions/);
  const accessor=[];Object.defineProperty(accessor,'0',{get(){throw new Error('getter executed');},enumerable:true});accessor.length=1;
  assert.throws(()=>createCommitment({id:'delivery',debtorId:'learner',creditorId:'housemate',dueAt:1,terms:'x'},{...minimal,actions:accessor}),/catalog actions/);

  for(const invalid of ['1delivery','delivery item','delivery.']) {
    assert.throws(()=>createCommitment({id:invalid,debtorId:'learner',creditorId:'housemate',dueAt:1,terms:'x'},{...minimal,commitments:[invalid]}),/commitments? ID/);
  }
});
