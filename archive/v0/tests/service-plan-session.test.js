import test from 'node:test';
import assert from 'node:assert/strict';
import {createServicePlan,getServicePlanView,exportServicePlan,advanceTo} from '../src/games/service-plan.js';
import {createService,exportService} from '../src/games/service.js';
import {createPlayNote} from '../web/play-note.js';
import {createSession,createClinicSession,pauseSession,toggleSession,commandSession,stopSession,stepSession,tickSession,importSession,proposeSession,interruptDiscussionSession,withdrawSession,planNoteContext,serviceEventText} from '../web/service-plan-session.js';

test('new, imported and restored sessions stay paused without offline advancement',()=>{
 let s=stepSession(commandSession(createSession(),'keeper','meal'),'minute');
 const loaded=importSession(toggleSession(s),JSON.stringify(exportServicePlan(s.game)));
 assert.deepEqual(loaded.game,s.game);assert.equal(loaded.running,false);assert.equal(loaded.remainder,0);
 assert.deepEqual(tickSession(loaded,900000),loaded);
 assert.equal(createSession().running,false);
});
test('play stops at real events while preserving unfinished simultaneous work',()=>{
 let s=commandSession(createSession(),'keeper','meal');s=commandSession(s,'partner','salvage');
 s=tickSession(toggleSession(s),1000,4);
 assert.equal(s.game.clock.now,4);assert.equal(s.running,false);assert.equal(s.remainder,0);
 assert.equal(getServicePlanView(s.game).jobs.partner.task,'salvage');
});
test('commands, refusals and interruptions pause and discard fractional time',()=>{
 for(const operation of [s=>commandSession(s,'partner','gate'),s=>pauseSession(s),s=>stopSession(s,'keeper'),s=>proposeSession(s,{pumpStartAt:39,readyBy:45,waitUntil:45,fallback:'cart'})]){
  let s=tickSession(toggleSession(commandSession(createSession(),'keeper','meal')),400);
  s=operation(s);assert.equal(s.game.clock.now,0);assert.equal(s.running,false);assert.equal(s.remainder,0);
 }
});
test('morning pauses playback, carries state and only closing ends the day',()=>{
 const before=advanceTo(createServicePlan(),23);let s=tickSession(toggleSession(createSession(before)),1000,4);
 assert.equal(s.game.clock.now,24);assert.equal(s.running,false);assert.equal(s.game.outcome,null);assert.match(s.reason,/morning|inlet/i);
 assert.notDeepEqual(s.game.people,before.people);
 s=createSession(advanceTo(s.game,64));assert.ok(s.game.outcome);assert.equal(toggleSession(s).running,false);
 assert.equal(tickSession(s,1000).game.clock.now,64);
});
test('event and minute stepping preserve the same exact world',()=>{
 let s=commandSession(createSession(),'keeper','meal'),event=stepSession(s);
 while(s.game.clock.now<event.game.clock.now)s=stepSession(s,'minute');
 assert.deepEqual(s.game,event.game);
});
test('invalid and original-control saves leave the active session untouched',()=>{
 const s=stepSession(commandSession(createSession(),'keeper','meal'),'minute'),before=JSON.stringify(s);
 for(const raw of ['{','{}','x'.repeat(65537),JSON.stringify(exportService(createService()))])assert.throws(()=>importSession(s,raw));
 assert.equal(JSON.stringify(s),before);
});
test('throttled frames cap catch-up and malformed time controls reject',()=>{
 const s=tickSession(toggleSession(createSession()),600000,1);assert.equal(s.game.clock.now,1);
 for(const elapsed of [-1,Infinity,NaN])assert.throws(()=>tickSession(s,elapsed));
 assert.throws(()=>tickSession(s,1000,3));assert.throws(()=>stepSession(s,'day'));
});
test('play-note context is a bounded explicit public projection and contains no host save',()=>{
 const s=createSession(),context=planNoteContext(s.game);
 const note=createPlayNote({game:{id:'service-plan',title:'A Shared Promise',version:'0.1.0'},context,answers:{objective:'Synthetic QA fixture: understand the promise.'},capturedAt:'2026-09-08T12:00:00.000Z'});
 assert.equal(note.context.minute,0);assert.ok(note.context.summary.length<=8);assert.ok(note.context.summary.every(row=>row.length<=240));
 for(const key of ['people','journal','commands','clock','history','answers','receipt'])assert.equal(Object.hasOwn(note.context,key),false);
 assert.match(note.context.summary.join(' '),/No accepted|No agreement/);
 assert.match(note.context.summary.join(' '),/actual|Actual|Pump/);
 assert.deepEqual(Object.keys(context).sort(),['minute','summary']);
});
test('completed diversion copy explains counted work without altering its receipt',()=>{
 const row={at:24,message:'Stopped divert the morning surge after 6 paid minutes. Installed work remains; unused supplies return.'};
 const before=structuredClone(row),v={morning:{at:24},work:{divert:6}};
 assert.match(serviceEventText(v,row),/counted|complete/);assert.deepEqual(row,before);
 assert.equal(serviceEventText({...v,work:{divert:5}},row),row.message);
});

const safe={pumpStartAt:39,readyBy:45,waitUntil:45,fallback:'cart'},risk={pumpStartAt:47,readyBy:53,waitUntil:53,fallback:'none'};
test('clinic entry replays a paid morning and preserves exact ownership, condition and save history',()=>{
 const s=createClinicSession(),v=getServicePlanView(s.game);
 assert.equal(v.now,37);assert.equal(s.running,false);assert.equal(v.morning.waterService,true);assert.equal(v.work.gate,12);assert.equal(v.work.pump,6);assert.equal(v.resources.parts.keeper,1);
 assert.ok(v.paidByActor.keeper.rest>0);assert.ok(v.paidByActor.partner.pump>0);
 assert.deepEqual(importSession(s,JSON.stringify(exportServicePlan(s.game))).game,s.game);
 assert.notDeepEqual(v.people, getServicePlanView(createServicePlan()).people);
});
test('paid unfinished discussions import exactly and interruption pauses both people without agreement',()=>{
 let s=proposeSession(createClinicSession(),safe);s=stepSession(s,'minute');
 assert.equal(s.game.clock.now,38);assert.equal(getServicePlanView(s.game).coordination.current,null);
 s=importSession(toggleSession(s),JSON.stringify(exportServicePlan(s.game)));
 const paid=getServicePlanView(s.game).paidByActor;
 s=interruptDiscussionSession(tickSession(toggleSession(s),400));
 assert.equal(s.running,false);assert.equal(s.remainder,0);assert.equal(s.game.clock.now,38);
 assert.equal(getServicePlanView(s.game).coordination.pending,null);assert.deepEqual(getServicePlanView(s.game).paidByActor,paid);
});
test('the response boundary pauses play and distinguishes accepted promise from actual readiness',()=>{
 let s=proposeSession(createClinicSession(),safe);s=tickSession(toggleSession(s),1000,4);
 assert.equal(s.game.clock.now,39);assert.equal(s.running,false);
 const v=getServicePlanView(s.game);assert.equal(v.coordination.current.status,'active');assert.equal(v.coordination.readiness.ready,false);assert.equal(v.delivery,null);
 const context=planNoteContext(s.game);assert.match(context.summary.join(' '),/Agreement.*active/);assert.match(context.summary.join(' '),/no cart|cart fallback/);
});
test('refused and interrupted revision keep current exact terms; withdrawn contribution leaves paid work running',()=>{
 let s=stepSession(proposeSession(createClinicSession(),safe)),current=getServicePlanView(s.game).coordination.current;
 s=stepSession(proposeSession(s,{...risk,pumpStartAt:53}));
 assert.equal(getServicePlanView(s.game).coordination.lastResponse.accepted,false);assert.deepEqual(getServicePlanView(s.game).coordination.current,current);
 s=stepSession(proposeSession(s,risk),'minute');s=interruptDiscussionSession(s);
 assert.deepEqual(getServicePlanView(s.game).coordination.current,current);
 s=commandSession(s,'keeper','pump');const job=getServicePlanView(s.game).jobs.keeper;
 s=withdrawSession(tickSession(toggleSession(s),400));assert.equal(s.running,false);assert.equal(s.remainder,0);
 assert.equal(getServicePlanView(s.game).coordination.current.status,'withdrawn');assert.deepEqual(getServicePlanView(s.game).jobs.keeper,job);
});
test('a promised readiness miss pauses play before a longer accepted wait expires',()=>{
 let s=stepSession(proposeSession(createClinicSession(),{pumpStartAt:39,readyBy:45,waitUntil:53,fallback:'none'}));
 s=tickSession(toggleSession(s),1000,4);s=tickSession(s,1000,4);
 assert.equal(s.game.clock.now,45);assert.equal(s.running,false);assert.equal(getServicePlanView(s.game).coordination.current.status,'active');
 assert.match(s.reason,/promised.*readiness|ready.*promise/i);assert.match(s.reason,/53/);
});
test('event stepping pauses a paid rest at the promised work start and explains that choice',()=>{
 let s=stepSession(proposeSession(createClinicSession(),safe));s=commandSession(s,'keeper','rest');s=stepSession(stepSession(s,'minute'),'minute');s=stopSession(s,'keeper');
 s=stepSession(proposeSession(s,risk));s=commandSession(s,'keeper','rest');s=stepSession(s);
 assert.equal(s.game.clock.now,47);assert.equal(s.running,false);assert.equal(getServicePlanView(s.game).jobs.keeper.task,'rest');assert.match(s.reason,/promised.*pump|pump.*start/i);
 const paid=getServicePlanView(s.game).paidByActor.keeper.rest;s=stopSession(s,'keeper');assert.equal(getServicePlanView(s.game).paidByActor.keeper.rest,paid);
});
