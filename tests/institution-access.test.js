import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInstitution, requestAccess, withdrawRequest, releaseAccess,
  advanceInstitution, setInstitutionGrant, getInstitutionOffer,
  exportInstitution, restoreInstitution,
} from '../src/institution/access.js';

const setup=()=>createInstitution({now:0,facilityId:'bench',actors:['ada','ben'],grants:['ada','ben'],maxHoldMinutes:30});
const request=(state,actorId,requestId,holdMinutes=10)=>requestAccess(state,{actorId,requestId,holdMinutes});

test('each actor can occupy the single bench and a queued choice prevents immediate reclaim',()=>{
  let s=setup();
  const a=request(s,'ada','a1');s=a.state;
  assert.equal(a.decision,'reserved');
  const b=request(s,'ben','b1');s=b.state;
  assert.equal(b.decision,'queued');
  assert.equal(getInstitutionOffer(s,'ben').queuePosition,1);
  s=releaseAccess(s,{actorId:'ada',reservationId:a.reservationId});
  assert.equal(getInstitutionOffer(s,'ben').hasReservation,true);
  assert.equal(request(s,'ada','a2').decision,'queued');
  const reverse=request(setup(),'ben','b2');
  assert.equal(reverse.decision,'reserved');
  assert.equal(request(reverse.state,'ada','a3').decision,'queued');
});

test('permission is canonical host state, separate from an actor credential',()=>{
  let s=createInstitution({now:0,facilityId:'bench',actors:['ada','ben'],grants:['ada'],maxHoldMinutes:30});
  const denied=request(s,'ben','b1');
  assert.equal(denied.decision,'denied');
  s=denied.state;
  assert.equal(getInstitutionOffer(s,'ben').granted,false);
  s=setInstitutionGrant(s,{actorId:'ben',granted:true,at:0});
  assert.equal(request(s,'ben','b2').decision,'reserved');
});

test('unauthorized requests cannot exhaust the allowed request budget',()=>{
  let s=createInstitution({now:0,facilityId:'bench',actors:['ada','ben'],grants:['ada'],maxHoldMinutes:30,maxRequests:1});
  for(const requestId of ['b1','b2']) {
    const denied=request(s,'ben',requestId);
    assert.equal(denied.decision,'denied');s=denied.state;
  }
  const allowed=request(s,'ada','a1');
  assert.equal(allowed.decision,'reserved');
  assert.equal(allowed.state.usedRequestIds.length,1);
});

test('withdrawal removes queue place and an active request, promoting FIFO',()=>{
  let s=setup();
  const a=request(s,'ada','a1');s=a.state;
  s=request(s,'ben','b1').state;
  s=withdrawRequest(s,{actorId:'ben',requestId:'b1'});
  s=releaseAccess(s,{actorId:'ada',reservationId:a.reservationId});
  const second=request(s,'ada','a2');s=second.state;
  assert.equal(second.decision,'reserved');
  s=request(s,'ben','b2').state;
  s=withdrawRequest(s,{actorId:'ada',requestId:'a2'});
  assert.equal(getInstitutionOffer(s,'ben').hasReservation,true);
});

test('large and segmented advancement give the same downstream expiry times',()=>{
  let s=setup();
  s=request(s,'ada','a1',5).state;
  s=request(s,'ben','b1',7).state;
  s=request(s,'ada','a2',3).state;
  const jump=advanceInstitution(s,20);
  const segmented=advanceInstitution(advanceInstitution(advanceInstitution(s,5),12),20);
  assert.deepEqual(jump,segmented);
  assert.equal(jump.active,null);
  assert.deepEqual(jump.queue,[]);
  const atBoundary=advanceInstitution(s,5);
  assert.equal(atBoundary.active.actorId,'ben');
  assert.equal(atBoundary.active.heldAt,5);
  assert.equal(atBoundary.active.expiresAt,12);
});

test('revocation at a future time expires earlier holds, cancels the holder, and promotes permitted queue',()=>{
  let s=setup();
  s=request(s,'ada','a1',20).state;
  s=request(s,'ben','b1',10).state;
  s=setInstitutionGrant(s,{actorId:'ada',granted:false,at:3});
  assert.equal(s.now,3);
  assert.equal(s.active.actorId,'ben');
  assert.equal(s.active.heldAt,3);
  assert.equal(getInstitutionOffer(s,'ada').granted,false);
  assert.throws(()=>setInstitutionGrant(s,{actorId:'ada',granted:true,at:2}),/backward|retroactive/i);
});

test('request IDs cannot be reused after release; capacity and owner errors reject',()=>{
  let s=setup();
  const a=request(s,'ada','a1');s=a.state;
  assert.throws(()=>request(s,'ben','a1'),/duplicate/i);
  assert.throws(()=>releaseAccess(s,{actorId:'ben',reservationId:a.reservationId}),/owner|holder/i);
  s=releaseAccess(s,{actorId:'ada',reservationId:a.reservationId});
  assert.throws(()=>request(s,'ada','a1'),/duplicate/i);
  assert.throws(()=>createInstitution({now:0,facilityId:'bench',actors:Array.from({length:9},(_,i)=>`a${i}`),grants:[],maxHoldMinutes:30}),/actor/i);
});

test('snapshot restores live reservations and rejects inconsistent authority',()=>{
  let s=setup();s=request(s,'ada','a1').state;s=request(s,'ben','b1').state;
  assert.deepEqual(restoreInstitution(JSON.parse(JSON.stringify(exportInstitution(s)))),s);
  const bad=exportInstitution(s);bad.institution.active.actorId='unknown';
  assert.throws(()=>restoreInstitution(bad),/actor|holder|invalid/i);
});
