import test from 'node:test';
import assert from 'node:assert/strict';
import * as camp from '../src/games/camp.js';
import * as story from '../src/games/camp-story.js';
import * as old from '../src/games/commons.js';
import * as rain from '../src/games/commons-next.js';
import {practice} from '../src/core/model.js';
import {chooseCommand,applyCommand} from '../src/games/commons-policy.js';
function completed(){let g=story.continueStory(story.migrateLegacyGame(old.exportGame(rain.createGame().world)));g=story.startJob(g,'forage');g=story.advanceGame(g,90);g=story.dispatchFerry(g);g=story.advanceGame(g,90);return story.exportGame(story.returnToCamp(story.finishStory(g)));}
test('Next Event stops at renewed player capacity while the other person keeps working',()=>{
 let g=camp.createGame();for(const id of ['gather-timber','gather-salvage','gather-timber','gather-salvage']){g=camp.startJob(g,id);while(g.jobs.player)g=camp.advanceGame(g,1);}
 g=camp.requestProject(g,'workbench');assert.equal(g.clock.now,74);
 assert.equal(camp.getGameView(g).nextStop.at,77);
 const ready=camp.advanceToNextEvent(g);assert.equal(ready.clock.now,77);assert.ok(ready.jobs.neighbor);
 assert.equal(camp.getGameView(ready).choices.find(c=>c.id==='gather-timber').unavailable,null);
});
test('returned camp cannot reuse lifetime attempt or clock identities from before the chapter',()=>{
 const base=completed();assert.deepEqual(story.exportGame(story.restoreGame(base)),base);
 for(const field of ['attempt','event']){const save=structuredClone(base),w=save.game.world;
  if(field==='attempt')w.people.player.nextAttempt=w.origin.game.people.player.nextAttempt;
  else w.clock.nextEvent=w.origin.game.clock.nextEvent;
  assert.throws(()=>story.restoreGame(save),/Returned camp|receipt|identity|counter/);
 }
});
test('returned camp cannot move already-paid work and practice between people',()=>{
 const save=completed(),w=save.game.world,n=w.paid.player.gatheringMinutes;assert.ok(n>0&&w.paid.neighbor.recovery>=n);
 w.paid.player.work-=n;w.paid.player.gatheringMinutes-=n;w.paid.player.recovery+=n;
 w.paid.neighbor.work+=n;w.paid.neighbor.gatheringMinutes+=n;w.paid.neighbor.recovery-=n;
 for(const id of ['player','neighbor'])w.people[id].skills.gathering=practice(w.origin.game.people[id].skills.gathering,w.paid[id].gatheringMinutes);
 assert.throws(()=>story.restoreGame(save),/Returned camp|receipt/);
});
test('story JSON rejects custom array prototypes before invoking inherited accessors',()=>{
 const save=completed();let invoked=0;const proto=Object.create(Array.prototype);
 Object.defineProperty(proto,Symbol.iterator,{get(){invoked++;throw new Error('Inherited code executed');}});
 Object.setPrototypeOf(save.game.record.commands,proto);
 assert.throws(()=>story.restoreGame(save),/JSON|prototype/);assert.equal(invoked,0);
});
test('automatic recovery rejects a redundant rest command while the explicit control can select recovery',()=>{
 const automatic=camp.createGame();assert.throws(()=>camp.startJob(automatic,'rest'),/already automatic/i);
 const control=camp.startJob(camp.createGame({recovery:'active-idle'}),'rest');assert.equal(control.clock.now,0);assert.equal(control.recovering.player,true);
});
test('closed supply windows do not advertise new work as eligible for old deadlines',()=>{
 let world=old.createGame();for(let i=0;world.caches<4&&i<1000;i++)world=applyCommand(world,chooseCommand(old.getGameView(world)));assert.ok(world.caches>=4);
 let game=story.continueStory(story.migrateLegacyGame(old.exportGame(world)));
 for(const destination of ['households','households','camp','camp'])game=story.allocateCache(game,destination);
 game=story.advanceGame(game,90);game=story.dispatchFerry(game);game=story.finishStory(game);game=story.returnToCamp(game);
 const view=story.getGameView(game);assert.ok(view.now<view.rainAt);
 assert.ok(view.choices.every(c=>!c.finishesBeforeFerry&&!c.finishesBeforeRain));
});
