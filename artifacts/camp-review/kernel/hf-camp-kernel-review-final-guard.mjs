import * as C from '/Users/abdul/code/human-framework/src/games/camp.js';
import assert from 'node:assert/strict';
import {test} from 'node:test';
test('automatic recovery rejects rest and preserves exact input',()=>{
 const g=C.createGame(),before=structuredClone(g);
 assert.ok(!C.getGameView(g).choices.some(c=>c.id==='rest'));
 assert.throws(()=>C.startJob(g,'rest'),/automatic|active-idle/i);
 assert.deepEqual(g,before);
});
test('active-idle recovery remains selectable without elapsed time and detaches input',()=>{
 const g=C.createGame({solo:true,recovery:'active-idle'}),before=structuredClone(g);
 assert.equal(C.getGameView(g).choices.find(c=>c.id==='rest').unavailable,null);
 const h=C.startJob(g,'rest');
 assert.deepEqual(g,before);assert.notStrictEqual(h,g);
 assert.equal(h.clock.now,g.clock.now);assert.equal(h.jobs.player,null);assert.equal(h.recovering.player,true);
 assert.ok(C.advanceGame(h,1).people.player.body.fatigue<g.people.player.body.fatigue);
 assert.doesNotThrow(()=>C.startJob(h,'gather-timber'));
});
test('active-idle busy rejection also leaves its input exact',()=>{
 const g=C.startJob(C.createGame({solo:true,recovery:'active-idle'}),'gather-timber'),before=structuredClone(g);
 assert.throws(()=>C.startJob(g,'rest'),/stop|current job/i);
 assert.deepEqual(g,before);
});
