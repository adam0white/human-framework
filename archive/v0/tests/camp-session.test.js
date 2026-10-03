import test from 'node:test';
import assert from 'node:assert/strict';
import * as story from '../src/games/camp-story.js';
import * as legacy from '../src/games/commons.js';
import {chooseCommand,applyCommand} from '../src/games/commons-policy.js';
import {createSession,pauseSession,playSession,commandSession,advanceSession,nextEventSession} from '../web/camp-session.js';
function established(){let world=legacy.createGame();for(let i=0;world.milestoneAt===null&&i<500;i++)world=applyCommand(world,chooseCommand(legacy.getGameView(world)));return story.migrateLegacyGame(legacy.exportGame(world));}

test('pause preserves paid pending work; stop is a distinct world command',()=>{
 let session=commandSession(createSession(),{type:'start',job:'build-shelter'});
 session=advanceSession(playSession(session),1);
 const before=story.exportGame(session.game),paused=pauseSession(session,'Reading.');
 assert.equal(paused.running,false);assert.deepEqual(story.exportGame(paused.game),before);
 const stopped=commandSession(paused,{type:'cancel'});
 assert.equal(story.getGameView(stopped.game).people.player.job,null);
 assert.ok(story.getGameView(stopped.game).work.shelter.progress>0);
 assert.equal(story.getGameView(stopped.game).now,1);
});
test('playback stops on actual work completion instead of spending the rest of a large tick',()=>{
 let session=commandSession(createSession(),{type:'start',job:'build-shelter'});
 const due=story.getGameView(session.game).people.player.job.endsAt;
 for(let i=0;story.getGameView(session.game).people.player.job&&i<30;i++)session=advanceSession(playSession(session),100);
 assert.equal(story.getGameView(session.game).now,due);
 assert.equal(session.running,false);
});
test('introduction and ferry are real paused boundaries; Continue and dispatch pay no hidden time',()=>{
 let session=createSession(established());const entry=story.getGameView(session.game).now;
 assert.equal(story.getGameView(playSession(session).game).phase,'introduction');assert.equal(playSession(session).running,false);
 const before=story.exportGame(session.game).game.world;
 session=commandSession(session,{type:'continue'});
 assert.deepEqual(story.exportGame(session.game).game.world,before);
 for(let i=0;story.getGameView(session.game).phase!=='ferry'&&i<100;i++)session=advanceSession(playSession(session),1000);
 assert.equal(story.getGameView(session.game).now,entry+90);assert.equal(session.running,false);
 assert.deepEqual(advanceSession(session,5).game,session.game);
 const atFerry=story.exportGame(session.game).game.world;session=commandSession(session,{type:'dispatch'});
 assert.deepEqual(story.exportGame(session.game).game.world,atFerry);
});
test('invalid commands retain the current story and surface a reason',()=>{
 const session=createSession(),before=story.exportGame(session.game);
 const failed=commandSession(session,{type:'start',job:'build-cache'});
 assert.deepEqual(story.exportGame(failed.game),before);assert.equal(failed.running,false);assert.ok(failed.error);
 assert.throws(()=>advanceSession(session,-1));
});
test('next event remains finite during available recovery and reload starts paused',()=>{
 let session=nextEventSession(createSession());const v=story.getGameView(session.game);
 assert.ok(v.now>0&&v.now<=6);assert.equal(session.running,false);
 const restored=story.restoreGame(JSON.parse(JSON.stringify(story.exportGame(session.game))));
 const loaded=createSession(restored);assert.equal(loaded.running,false);assert.deepEqual(loaded.game,session.game);
});
