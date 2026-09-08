import test from 'node:test';import assert from 'node:assert/strict';
import {createSignals,exportSignals,restoreSignals} from '../src/games/signals.js';
import {createSession,pauseSession,toggleSession,commandSession,stopSession,stepSession,tickSession} from '../web/signals-session.js';

test('reload/import starts paused, ignores offline elapsed time and never advances during choices',()=>{
 let s=createSession();assert.equal(s.running,false);s=commandSession(s,'radio');assert.equal(s.game.clock.now,0);assert.equal(s.running,false);assert.deepEqual(tickSession(s,300000),s);
 s=stepSession(s);assert.equal(s.game.clock.now,1);const loaded=createSession(restoreSignals(JSON.parse(JSON.stringify(exportSignals(s.game)))));assert.equal(loaded.running,false);assert.deepEqual(tickSession(loaded,900000),loaded);
});
test('running stops at a reply even while another action continues',()=>{
 let s=stepSession(commandSession(createSession(),'radio'));s=commandSession(s,'ridge');s=toggleSession(s);
 for(let i=0;i<7&&s.running;i++)s=tickSession(s,1000,4);
 assert.equal(s.game.clock.now,6);assert.equal(s.running,false);assert.equal(s.game.job.task,'ridge');assert.match(s.reason,/reply|report/i);
});
test('a hidden world change neither pauses playback nor appears as the next visible event',()=>{
 let s=stepSession(createSession(),'minute');assert.equal(s.game.clock.now,1);s=toggleSession(s);
 s=tickSession(s,1000,4);assert.equal(s.game.clock.now,5);assert.equal(s.running,true);assert.equal(s.game.landing,'open');
 let waiting=createSession();waiting=stepSession(waiting);assert.equal(waiting.game.clock.now,12);waiting=stepSession(waiting);assert.equal(waiting.game.clock.now,32);assert.equal(waiting.game.outcome.delivered,false);
});
test('speed changes and pauses clear fractional time; background gap is bounded',()=>{
 let s=toggleSession(createSession());s=tickSession(s,750);assert.equal(s.game.clock.now,0);assert.equal(s.remainder,.75);
 s=pauseSession(s);assert.equal(s.remainder,0);s=toggleSession(s);s=tickSession(s,100000);assert.equal(s.game.clock.now,1);assert.equal(s.running,true);
});
test('stop pays elapsed effects and terminal playback cannot restart',()=>{
 let s=commandSession(createSession(),'ridge');s=stepSession(s,'minute');s=stopSession(s);assert.equal(s.game.paid.ridge,1);assert.equal(s.running,false);
 s=stepSession(commandSession(s,'ridge'));assert.equal(s.game.clock.now,12);s=stepSession(s);assert.equal(s.game.outcome.delivered,true);assert.equal(toggleSession(s).running,false);assert.equal(tickSession(s,1000).game.clock.now,15);
 assert.throws(()=>stepSession(s,'bad'));assert.throws(()=>tickSession(s,-1));assert.throws(()=>tickSession(s,1,3));
});
