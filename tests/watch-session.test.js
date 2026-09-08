import test from 'node:test';
import assert from 'node:assert/strict';
import {createWatch,requestTask,advanceTo} from '../src/games/watch.js';
import {createSession,pauseSession,toggleSession,commandSession,stopSession,stepSession,tickSession} from '../web/watch-session.js';

test('new or restored browser sessions begin paused and paused frames never move time',()=>{
 const game=advanceTo(requestTask(createWatch(),'keeper','repair'),3);const session=createSession(game);
 assert.equal(session.running,false);assert.deepEqual(tickSession(session,1000,4),session);assert.equal(session.game.clock.now,3);
});
test('playback stops exactly when either worker finishes without consuming the remaining wall interval',()=>{
 let s=createSession();s=commandSession(s,'keeper','bypass');s=commandSession(s,'watcher','watch');s=toggleSession(s);
 s=tickSession(s,1000,4);assert.equal(s.game.clock.now,4);assert.equal(s.running,true);s=tickSession(s,1000,4);
 assert.equal(s.game.clock.now,6);assert.equal(s.running,false);assert.match(s.reason,/finished/);assert.equal(s.remainder,0);assert.equal(s.game.jobs.keeper.task,'bypass');
});
test('issuing, refusing, stopping and losing visibility reset playback without advancing time',()=>{
 for(const transform of [s=>commandSession(s,'watcher','repair'),s=>commandSession(s,'watcher','watch'),s=>pauseSession(s,'Tab hidden.'),s=>stopSession(s,'keeper')]){
 let s=toggleSession(commandSession(createSession(),'keeper','repair'));s=tickSession(s,400,1);s=transform(s);
 assert.equal(s.running,false);assert.equal(s.remainder,0);assert.equal(s.game.clock.now,0);
 }
});
test('event stepping and one-minute stepping reach the same state and arrival stops playback',()=>{
 let s=commandSession(commandSession(createSession(),'keeper','bypass'),'watcher','watch');const event=stepSession(s,'event');
 for(let i=0;i<6;i++)s=stepSession(s,'minute');assert.deepEqual(s.game,event.game);assert.equal(s.running,false);
 let idle=toggleSession(createSession());for(let i=0;i<40;i++)idle=tickSession(idle,1000,4);
 assert.equal(idle.game.clock.now,32);assert.equal(idle.running,false);assert.match(idle.reason,/arrived/);assert.equal(toggleSession(idle).running,false);
});
test('a throttled frame cannot catch up offline time and unsupported speed/time reject',()=>{
 let s=toggleSession(createSession());s=tickSession(s,600000,1);assert.equal(s.game.clock.now,1);
 assert.throws(()=>tickSession(s,-1,1));assert.throws(()=>tickSession(s,1000,100));assert.throws(()=>stepSession(s,'all'));
});
