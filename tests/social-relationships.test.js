import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRelationships,setCareTie,advanceRelationships,receiveRelationshipEvent,
  getRelationshipView,exportRelationships,restoreRelationships
} from '../src/social/relationships.js';

const setup=()=>createRelationships({
  ownerId:'learner',now:0,actors:['learner','colleague','witness'],
  contexts:['equipment','travel'],ties:[{otherId:'colleague',care:'active'}]
});

function event(id,kind,at,contextId='equipment',options={}) {
  return {id,originId:options.originId??id,occurredAt:options.occurredAt??at,
    receivedAt:at,sourceId:options.sourceId??'colleague',otherId:'colleague',contextId,
    kind,outcomeId:options.outcomeId??(kind==='repair_acknowledged'?null:`receipt_${id}`),
    relatedEventId:options.relatedEventId??null};
}

test('delivered failed aid guards coordination, while hidden outcomes and other contexts do not',()=>{
  let person=setup();
  assert.deepEqual(getRelationshipView(person,'colleague','equipment'),{
    ownerId:'learner',otherId:'colleague',contextId:'equipment',care:'active',
    stance:'unknown',evidenceIds:[]});
  person=advanceRelationships(person,20);
  assert.equal(getRelationshipView(person,'colleague','equipment').stance,'unknown');
  person=receiveRelationshipEvent(person,event('failure','support_failed',20));
  assert.equal(getRelationshipView(person,'colleague','equipment').stance,'guarded');
  assert.equal(getRelationshipView(person,'colleague','travel').stance,'unknown');
});

test('completed unpromised aid opens only its context, but later failed aid remains unresolved',()=>{
  let person=advanceRelationships(setup(),10);
  person=receiveRelationshipEvent(person,event('aid','support_completed',10));
  assert.equal(getRelationshipView(person,'colleague','equipment').stance,'open');
  person=advanceRelationships(person,20);
  person=receiveRelationshipEvent(person,event('fail','support_failed',20));
  person=advanceRelationships(person,40);
  person=receiveRelationshipEvent(person,event('lateAid','support_completed',40,'equipment',{occurredAt:15}));
  assert.equal(getRelationshipView(person,'colleague','equipment').stance,'guarded');
  assert.equal(getRelationshipView(person,'colleague','travel').stance,'unknown');
});

test('actual repair needs the recipient owner to acknowledge it before stance opens',()=>{
  let person=advanceRelationships(setup(),10);
  person=receiveRelationshipEvent(person,event('fail','support_failed',10));
  person=advanceRelationships(person,30);
  person=receiveRelationshipEvent(person,event('repair','repair_completed',30,'equipment',{relatedEventId:'fail'}));
  assert.equal(getRelationshipView(person,'colleague','equipment').stance,'guarded');
  person=advanceRelationships(person,40);
  assert.throws(()=>receiveRelationshipEvent(person,event('thirdParty','repair_acknowledged',40,'equipment',{
    relatedEventId:'repair',sourceId:'witness'})),/owner|recipient/i);
  person=advanceRelationships(person,50);
  person=receiveRelationshipEvent(person,event('ack','repair_acknowledged',50,'equipment',{
    relatedEventId:'repair',sourceId:'learner'}));
  assert.equal(getRelationshipView(person,'colleague','equipment').stance,'open');
  assert.deepEqual(getRelationshipView(person,'colleague','equipment').evidenceIds,['fail','repair','ack']);
});

test('newer failure stays guarded after a duplicate outcome and old repair acknowledgment',()=>{
  let person=advanceRelationships(setup(),10);
  person=receiveRelationshipEvent(person,event('first','support_failed',10));
  person=advanceRelationships(person,20);
  person=receiveRelationshipEvent(person,event('repair','repair_completed',20,'equipment',{relatedEventId:'first'}));
  person=advanceRelationships(person,30);
  person=receiveRelationshipEvent(person,event('ack','repair_acknowledged',30,'equipment',{
    relatedEventId:'repair',sourceId:'learner'}));
  person=advanceRelationships(person,60);
  person=receiveRelationshipEvent(person,event('second','support_failed',60));
  person=advanceRelationships(person,80);
  person=receiveRelationshipEvent(person,event('relay','support_completed',80,'equipment',{
    originId:'oldAid',occurredAt:5,outcomeId:'oldOutcome',sourceId:'witness'}));
  person=receiveRelationshipEvent(person,event('relayAgain','support_completed',80,'equipment',{
    originId:'oldAid',occurredAt:5,outcomeId:'oldOutcome',sourceId:'colleague'}));
  assert.equal(getRelationshipView(person,'colleague','equipment').stance,'guarded');
  assert.equal(person.events.length,5);
});

test('a relayed copy of one host outcome cannot create a second failure or repair',()=>{
  let person=advanceRelationships(setup(),10);
  person=receiveRelationshipEvent(person,event('fail','support_failed',10,'equipment',{outcomeId:'failedAttempt'}));
  person=advanceRelationships(person,50);
  person=receiveRelationshipEvent(person,event('copy','support_failed',50,'equipment',{
    occurredAt:10,outcomeId:'failedAttempt',sourceId:'witness'}));
  assert.equal(person.events.length,1);
  assert.throws(()=>receiveRelationshipEvent(person,event('conflict','support_completed',50,'equipment',{
    occurredAt:10,outcomeId:'failedAttempt'})),/conflict|outcome/i);
});

test('care tie changes only by owner decision and cannot imply aid or forgiveness',()=>{
  let person=setup();
  assert.throws(()=>setCareTie(person,{actorId:'witness',otherId:'colleague',care:'inactive',at:0}),/owner/i);
  person=setCareTie(person,{actorId:'learner',otherId:'colleague',care:'inactive',at:0});
  assert.equal(getRelationshipView(person,'colleague','equipment').care,'inactive');
  assert.equal(getRelationshipView(person,'colleague','equipment').stance,'unknown');
});

test('restore owner check, replay, duplicates, and history bound preserve contextual state',()=>{
  let person=advanceRelationships(setup(),10);
  person=receiveRelationshipEvent(person,event('fail','support_failed',10));
  let restored=restoreRelationships(JSON.parse(JSON.stringify(exportRelationships(person))),'learner');
  assert.deepEqual(restored,person);
  assert.throws(()=>restoreRelationships(exportRelationships(person),'colleague'),/owner/i);
  restored=advanceRelationships(restored,20);
  person=advanceRelationships(person,20);
  const next=event('repair','repair_completed',20,'equipment',{relatedEventId:'fail'});
  assert.deepEqual(receiveRelationshipEvent(restored,next),receiveRelationshipEvent(person,next));
  assert.throws(()=>receiveRelationshipEvent(person,event('bad','support_completed',20,'equipment',{
    sourceId:'stranger'})),/source/i);
  for(let n=0;n<255;n++){
    person=advanceRelationships(person,40+n);
    person=receiveRelationshipEvent(person,event(`aid${n}`,'support_completed',40+n,'travel'));
  }
  assert.equal(person.events.length,256);
  person=advanceRelationships(person,300);
  assert.throws(()=>receiveRelationshipEvent(person,event('overflow','support_completed',300,'travel')),/limit|history/i);
});

test('advancing an actor forbids backdated new delivery while old saved receipts still restore',()=>{
  let person=advanceRelationships(setup(),10);
  person=receiveRelationshipEvent(person,event('first','support_completed',10));
  person=advanceRelationships(person,20);
  assert.throws(()=>receiveRelationshipEvent(person,event('backdated','support_failed',19)),/receipt|current/i);
  assert.deepEqual(restoreRelationships(exportRelationships(person),'learner'),person);
});

test('restore rejects arrays with hidden fields instead of loading altered actor evidence',()=>{
  let person=advanceRelationships(setup(),10);
  person=receiveRelationshipEvent(person,event('aid','support_completed',10));
  const snapshot=exportRelationships(person);
  snapshot.relationships.events.extra='hidden';
  assert.throws(()=>restoreRelationships(snapshot,'learner'),/events|array|history/i);
});
