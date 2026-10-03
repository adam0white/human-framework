import test from 'node:test';
import assert from 'node:assert/strict';
import {createService,getServiceView,exportService,restoreService,advanceTo} from '../src/games/service.js';
import {createSession,pauseSession,toggleSession,commandSession,stopSession,stepSession,tickSession,importSession,serviceEventText} from '../web/service-session.js';

test('completed diversion at the surge is presented as counted work without altering the saved event',()=>{
  const entry={at:24,actor:'keeper',message:'Stopped divert the morning surge after 6 paid minutes. Installed work remains; unused supplies return.'};
  const before=structuredClone(entry),v={morning:{at:24},work:{divert:6}};
  assert.match(serviceEventText(v,entry),/complete|counted/i);assert.deepEqual(entry,before);
  assert.equal(serviceEventText({...v,work:{divert:5}},entry),entry.message);
  assert.equal(serviceEventText(v,{...entry,at:12}),entry.message);
});

test('a new or restored day stays paused and never catches up offline time',()=>{
 let s=commandSession(createSession(),'keeper','meal');
 assert.equal(s.game.clock.now,0);assert.equal(s.running,false);
 assert.deepEqual(tickSession(s,900000),s);
 s=stepSession(s,'minute');
 const loaded=createSession(restoreService(JSON.parse(JSON.stringify(exportService(s.game)))));
 assert.equal(loaded.game.clock.now,1);assert.equal(loaded.running,false);
 assert.deepEqual(tickSession(loaded,900000),loaded);
});
test('play pauses at the next real event and preserves concurrent unfinished work',()=>{
 let s=commandSession(createSession(),'keeper','meal');
 s=commandSession(s,'partner','salvage');s=toggleSession(s);s=tickSession(s,1000,4);
 assert.equal(s.game.clock.now,4);assert.equal(s.running,false);assert.equal(s.remainder,0);
 assert.equal(getServiceView(s.game).jobs.partner.task,'salvage');
});
test('choice, refusal, interruption and visibility pauses clear fractional elapsed time',()=>{
 for(const transform of [s=>commandSession(s,'partner','gate'),s=>pauseSession(s,'Hidden tab.'),s=>stopSession(s,'keeper')]){
  let s=toggleSession(commandSession(createSession(),'keeper','meal'));s=tickSession(s,400);s=transform(s);
  assert.equal(s.game.clock.now,0);assert.equal(s.running,false);assert.equal(s.remainder,0);
 }
});
test('morning is a pause boundary, carries paid state forward, and only clinic closing ends the day',()=>{
 const start=advanceTo(createService(),23);let s=toggleSession(createSession(start));s=tickSession(s,1000,4);
 assert.equal(s.game.clock.now,24);assert.equal(s.running,false);assert.equal(s.game.outcome,null);
 assert.equal(getServiceView(s.game).phase,'clinic');assert.match(s.reason,/morning|inlet/i);
 assert.notDeepEqual(s.game.people,start.people);
 s=createSession(advanceTo(s.game,64));assert.ok(s.game.outcome);assert.equal(toggleSession(s).running,false);
 assert.equal(tickSession(s,1000).game.clock.now,64);
});
test('event stepping and one-minute stepping have the same host outcome',()=>{
 let base=commandSession(createSession(),'keeper','meal'),event=stepSession(base);
 for(let n=0;n<event.game.clock.now;n++)base=stepSession(base,'minute');
 assert.deepEqual(base.game,event.game);
});
test('imports are paused and malformed imports cannot mutate the valid active session',()=>{
 const s=stepSession(commandSession(createSession(),'keeper','meal'),'minute'),before=JSON.stringify(s);
 for(const raw of ['{','{}','x'.repeat(65537)])assert.throws(()=>importSession(s,raw));
 assert.equal(JSON.stringify(s),before);
 const loaded=importSession(toggleSession(s),JSON.stringify(exportService(s.game)));
 assert.equal(loaded.running,false);assert.equal(loaded.remainder,0);assert.deepEqual(loaded.game,s.game);
});
test('a throttled frame is capped and invalid step, time and speed reject',()=>{
 let s=tickSession(toggleSession(createSession()),600000,1);assert.equal(s.game.clock.now,1);
 assert.throws(()=>tickSession(s,-1));assert.throws(()=>tickSession(s,Infinity));assert.throws(()=>tickSession(s,1000,3));assert.throws(()=>stepSession(s,'day'));
});
