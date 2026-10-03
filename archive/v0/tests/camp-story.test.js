import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as camp from '../src/games/camp.js';
import * as story from '../src/games/camp-story.js';
import * as legacy from '../src/games/commons.js';
import {chooseCommand,applyCommand} from '../src/games/commons-policy.js';

const json=value=>JSON.parse(JSON.stringify(value));
function legacyMilestone(policy='build-first') {let world=legacy.createGame();for(let n=0;world.milestoneAt===null&&n<500;n++)world=applyCommand(world,chooseCommand(legacy.getGameView(world),policy));assert.notEqual(world.milestoneAt,null);return legacy.exportGame(world);}
function command(game,c) {if(c.type==='start')return story.startJob(game,c.jobId);if(c.type==='request')return story.requestProject(game,c.projectId);return story.advanceToNextEvent(game);}
function choose(view){const c=chooseCommand(view);return c.type==='start'&&c.jobId==='rest'&&!view.choices.some(item=>item.id==='rest')?{type:'advance'}:c;}
function toPhase(game,target='introduction') {for(let n=0;n<800&&story.getGameView(game).phase!==target;n++){const view=story.getGameView(game);assert.ok(['camp','packing'].includes(view.phase),view.phase);game=command(game,choose(view));}assert.equal(story.getGameView(game).phase,target);return game;}

test('new story earns its actual camp and pauses after the first milestone',()=>{
  let game=story.createGame(),control=camp.createGame();assert.deepEqual(game.world,control);
  for(let n=0;story.getGameView(game).phase==='camp'&&n<800;n++) {
    const c=choose(story.getGameView(game));
    if(c.type==='start'){game=story.startJob(game,c.jobId);control=camp.startJob(control,c.jobId);}
    else if(c.type==='request'){game=story.requestProject(game,c.projectId);control=camp.requestProject(control,c.projectId);}
    else {const before=game.world.clock.now;game=story.advanceToNextEvent(game);control=camp.advanceGame(control,game.world.clock.now-before);}
    assert.deepEqual(game.world,control);
  }
  assert.equal(story.getGameView(game).phase,'introduction');assert.equal(game.world.milestoneAt,game.world.clock.now);
  assert.deepEqual(story.restoreGame(json(story.exportGame(game))),game);
  const accepted=story.continueStory(game);assert.deepEqual(accepted.world,game.world);assert.equal(story.getGameView(accepted).phase,'packing');
  assert.throws(()=>story.continueStory(accepted),/already|introduction/i);assert.throws(()=>story.advanceGame(game,1),/introduction|continue/i);
});

test('mixed stock-first legacy migration enters the complete selected world without a canonical opening',()=>{
  const input=legacyMilestone('stock-first'),before=json(input),migrated=camp.migrateLegacyGame(input),game=story.migrateLegacyGame(input);
  assert.deepEqual(game.world,migrated);assert.deepEqual(input,before);assert.equal(input.game.people.player.pending.elapsedMinutes,4);
  assert.equal(game.world.jobs.player.id,'gather-timber');assert.equal(game.world.people.player.pending.elapsedMinutes,4);
  assert.equal(game.window.enteredAt,226);assert.equal(game.window.ferryAt,316);assert.equal(game.window.rainAt,406);
  assert.deepEqual(story.continueStory(game).world,migrated);
  assert.deepEqual(story.advanceGame(story.continueStory(game),1).world,camp.advanceGame(migrated,1));
});

test('actual legacy surplus keeps twelve earned caches and can close without empty time',()=>{
  const input=JSON.parse(readFileSync(new URL('../artifacts/user-runs/2026-09-07/common-ground-minute-1312.json',import.meta.url),'utf8'));
  let game=story.migrateLegacyGame(input),world=json(game.world);assert.equal(game.world.stock.food,13);assert.equal(game.world.caches,12);
  assert.equal(game.window.enteredAt,1312);assert.equal(game.window.ferryAt,1402);assert.equal(game.window.rainAt,1492);assert.deepEqual(game.window.production,[]);
  assert.equal(game.window.carriedCaches,12);game=story.continueStory(game);
  for(const destination of ['households','households','camp','camp'])game=story.allocateCache(game,destination);
  assert.equal(story.getGameView(game).availableCaches,8);assert.equal(story.getGameView(game).canFinish,false);
  assert.throws(()=>story.finishStory(game),/ferry/);game=story.advanceGame(game,90);assert.equal(game.world.clock.now,1402);
  assert.equal(story.getGameView(game).canFinish,false);game=story.dispatchFerry(game);assert.equal(story.getGameView(game).canFinish,true);
  world=json(game.world);game=story.finishStory(game);assert.equal(story.getGameView(game).phase,'ended');assert.deepEqual(game.world,world);
  game=story.returnToCamp(game);assert.deepEqual(game.world,world);assert.throws(()=>story.returnToCamp(game),/returned|finished/i);
  game=story.advanceGame(game,181);assert.equal(game.world.clock.now,1583);assert.equal(story.getGameView(game).phase,'camp-return');
  assert.equal(story.getGameView(game).householdsEquipped,2);assert.equal(story.getGameView(game).campNights,4);
  assert.throws(()=>story.allocateCache(game,'households'),/finished|closed/i);assert.deepEqual(story.restoreGame(json(story.exportGame(game))),game);
});

test('coarse, minute and Next Event drivers stop identically at the ferry and retain pending work',()=>{
  let base=story.continueStory(story.migrateLegacyGame(legacyMilestone('stock-first')));
  base=story.requestProject(base,'cache');const whole=story.advanceGame(base,1440);let minute=base,event=base;
  for(let n=0;n<90;n++)minute=story.advanceGame(minute,1);
  while(story.getGameView(event).phase==='packing')event=story.advanceToNextEvent(event);
  assert.deepEqual(story.exportGame(whole),story.exportGame(minute));assert.deepEqual(story.exportGame(whole),story.exportGame(event));
  assert.equal(story.getGameView(whole).phase,'ferry');assert.equal(whole.world.clock.now,whole.window.ferryAt);
  assert.throws(()=>story.advanceGame(whole,1),/ferry/i);assert.throws(()=>story.startJob(whole,'eat'),/ferry/i);
  const dispatched=story.dispatchFerry(whole);assert.deepEqual(dispatched.world,whole.world);assert.throws(()=>story.dispatchFerry(dispatched),/departed/i);
  assert.deepEqual(story.advanceGame(dispatched,40),story.advanceGame(story.restoreGame(json(story.exportGame(dispatched))),40));
});

test('missing the ferry permits later paid camp service and retains the household loss on return',()=>{
  let game=story.continueStory(story.migrateLegacyGame(legacyMilestone()));game=story.advanceGame(game,90);
  assert.equal(game.world.caches,0);game=story.dispatchFerry(game);game=toPhase(game,'rain');
  assert.ok(game.world.caches>0);assert.throws(()=>story.allocateCache(game,'households'),/ferry|departed/i);
  while(story.getGameView(game).availableCaches&&story.getGameView(game).campNights<4)game=story.allocateCache(game,'camp');
  const before=game.world;game=story.finishStory(game);assert.deepEqual(game.world,before);assert.equal(story.getGameView(game).unprovidedHouseholds,2);
  const supplied=story.getGameView(game).campNights;assert.ok(supplied>0);game=story.returnToCamp(game);game=story.advanceGame(game,6);
  assert.equal(story.getGameView(game).unprovidedHouseholds,2);assert.equal(story.getGameView(game).campNights,supplied);
  assert.deepEqual(story.restoreGame(json(story.exportGame(game))),game);
});

test('source replay rejects forged window, receipts, allocations, continuation and world snapshots',()=>{
  const game=story.dispatchFerry(story.advanceGame(story.continueStory(story.migrateLegacyGame(legacyMilestone())),90));
  const attacks=[g=>g.window.enteredAt++,g=>g.window.ferryAt++,g=>g.window.rainAt++,g=>g.window.carriedCaches++,g=>g.window.production.push({cache:1,at:g.world.clock.now}),g=>g.window.allocations.push({cache:1,at:g.world.clock.now,destination:'camp'}),g=>g.window.departedAt--,g=>g.world.stock.food++,g=>g.returned=true,g=>g.record.commands.push({type:'continue'}),g=>g.extra=true];
  for(const mutate of attacks){const save=story.exportGame(game);mutate(save.game);assert.throws(()=>story.restoreGame(save));}
  assert.throws(()=>story.restoreGame(legacy.exportGame(legacy.createGame())),/incompatible/i);
  const copy=story.exportGame(game);copy.game.record.root.game.people.player.body.fatigue=NaN;assert.throws(()=>story.restoreGame(copy));
});

test('views and reading do not alter the saved world and expose source kernel fields',()=>{
  const game=story.migrateLegacyGame(legacyMilestone('stock-first')),before=story.exportGame(game),view=story.getGameView(game);
  for(const field of ['people','choices','work','paid','options','migration','nextStop'])assert.ok(Object.hasOwn(view,field),field);
  assert.equal(view.canAdvance,false);assert.equal(view.nextEventAt,null);assert.equal(view.canFinish,false);
  Object.values(view.people)[0].body.fatigue=0;view.stock.food=999;assert.deepEqual(story.exportGame(game),before);
  assert.ok(Object.isFrozen(game));assert.ok(Object.isFrozen(game.world));
});
