import test from 'node:test';
import assert from 'node:assert/strict';
import * as camp from '../src/games/camp.js';
import * as story from '../src/games/camp-story.js';
import * as legacy from '../src/games/commons.js';
import * as rain from '../src/games/commons-next.js';
import {chooseCommand,applyCommand} from '../src/games/commons-policy.js';
import {runTwoCacheProbe} from '../artifacts/commons-next/two-cache-ferry-probe.mjs';

const json=value=>JSON.parse(JSON.stringify(value));
function milestone(policy='stock-first',before=false){let world=legacy.createGame(),previous;for(let n=0;world.milestoneAt===null&&n<500;n++){previous=world;world=applyCommand(world,chooseCommand(legacy.getGameView(world),policy));}assert.notEqual(world.milestoneAt,null);return legacy.exportGame(before?previous:world);}
function baseline(){return story.continueStory(story.migrateLegacyGame(milestone()));}

test('the first actual milestone is the same complete world across all three drivers',()=>{
  const base=story.migrateLegacyGame(milestone('stock-first',true));assert.equal(base.window,null);
  const coarse=story.advanceGame(base,1440);let minute=base,event=base;
  while(story.getGameView(minute).phase==='camp')minute=story.advanceGame(minute,1);
  while(story.getGameView(event).phase==='camp')event=story.advanceToNextEvent(event);
  assert.deepEqual(story.exportGame(coarse),story.exportGame(minute));assert.deepEqual(story.exportGame(coarse),story.exportGame(event));
  assert.equal(coarse.window.enteredAt,coarse.world.milestoneAt);assert.ok(coarse.world.jobs.player,'Busy gathering survives tied milestone settlement');
});

test('legacy Rain imports retain their existing window, paid world and settlement instead of starting again',()=>{
  const packing=rain.advanceGame(rain.startJob(rain.createGame(),'gather-salvage'),5);
  const ferry=rain.restoreGame(runTwoCacheProbe().ferrySave);
  const allocated=rain.allocateCache(ferry,'households');
  const departed=rain.dispatchFerry(allocated);
  const ended=rain.finishDay(rain.advanceGame(departed,90));
  for(const input of [packing,ferry,allocated,departed,ended]){
    const snapshot=rain.exportGame(input),before=json(snapshot),game=story.migrateLegacyRainGame(snapshot);
    assert.deepEqual(game.world,camp.migrateLegacyGame(legacy.exportGame(input.world)));
    assert.deepEqual(snapshot,before);assert.equal(game.window.enteredAt,input.openedAt);
    assert.equal(game.window.ferryAt,input.openedAt+90);assert.equal(game.window.rainAt,input.openedAt+180);
    assert.deepEqual(game.window.production.map(({at})=>({at})),input.production);assert.deepEqual(game.window.allocations,input.allocations);
    assert.equal(game.window.departedAt,input.departedAt);assert.equal(story.getGameView(game).phase,input.ended?'ended':rain.getGameView(input).phase);
    assert.deepEqual(story.restoreGame(json(story.exportGame(game))),game);
    assert.throws(()=>story.continueStory(game),/already|introduction/i);
    if(input.ended){const returned=story.returnToCamp(game);assert.equal(story.getGameView(returned).phase,'camp-return');assert.deepEqual(returned.world,game.world);}
    else if(story.getGameView(game).canAdvance)assert.deepEqual(story.advanceGame(game,1).world,camp.advanceGame(game.world,1));
  }
  assert.throws(()=>story.migrateLegacyRainGame(legacy.exportGame(legacy.createGame())),/incompatible/i);
  assert.throws(()=>story.migrateLegacyGame(rain.exportGame(packing)),/incompatible/i);
});

test('an import-root time cannot move while keeping the same original Common Ground source',()=>{
  const original=story.migrateLegacyGame(milestone()),save=story.exportGame(original);
  const later=camp.advanceGame(camp.restoreGame(save.game.record.root),1);
  save.game.world=later;save.game.record.root=camp.exportGame(later);
  for(const field of ['enteredAt','ferryAt','rainAt'])save.game.window[field]++;
  assert.throws(()=>story.restoreGame(save),/source|migration|entry/i);
});

test('a cache completing exactly at the ferry can be allocated before its inclusive dispatch',()=>{
  let game=baseline();game=story.advanceGame(game,game.world.jobs.player.endsAt-game.world.clock.now);
  const duration=story.getGameView(game).choices.find(choice=>choice.id==='build-cache').duration;
  game=story.advanceGame(game,game.window.ferryAt-duration-game.world.clock.now);
  const offered=story.getGameView(game).choices.find(choice=>choice.id==='build-cache');assert.equal(offered.unavailable,null);assert.equal(offered.finishesBeforeFerry,true);
  game=story.startJob(game,'build-cache');game=story.advanceGame(game,1440);
  assert.equal(story.getGameView(game).phase,'ferry');assert.equal(game.window.production.at(-1).at,game.window.ferryAt);
  const cache=game.window.production.at(-1).cache;game=story.allocateCache(game,'households');assert.equal(game.window.allocations.at(-1).cache,cache);
  game=story.dispatchFerry(game);assert.throws(()=>story.allocateCache(game,'households'),/departed/i);assert.deepEqual(story.restoreGame(json(story.exportGame(game))),game);
});

test('a partially paid meal survives the ferry checkpoint and an explicit stop returns only its own reserved portion',()=>{
  let game=story.continueStory(story.migrateLegacyGame(milestone('build-first')));game=story.advanceGame(game,86);
  const stock=game.world.stock.food;game=story.startJob(game,'eat');game=story.advanceGame(game,20);
  assert.equal(story.getGameView(game).phase,'ferry');assert.equal(game.world.jobs.player.id,'eat');assert.equal(game.world.people.player.pending.elapsedMinutes,4);
  assert.equal(game.world.stock.food,stock-1);const paid=json(game.world.people.player.body),now=game.world.clock.now;
  const stopped=story.cancelJob(game);assert.equal(stopped.world.stock.food,stock);assert.deepEqual(stopped.world.people.player.body,paid);assert.equal(stopped.world.clock.now,now);
  assert.deepEqual(story.restoreGame(json(story.exportGame(stopped))),stopped);
  const onward=story.advanceGame(story.dispatchFerry(game),4);assert.equal(onward.world.jobs.player,null);assert.ok(onward.world.people.player.body.hunger<paid.hunger);
});

test('ordinary request exhaustion still permits unilateral stop, release, both checkpoints and saved return',()=>{
  let game=baseline();game=story.requestProject(game,'cache');
  while(game.record.commands.length<story.ORDINARY_COMMAND_LIMIT)game=story.requestProject(game,'cache');
  const limited=story.getGameView(game);assert.equal(limited.canAssign,false);assert.equal(limited.ordinaryCommandsRemaining,0);
  assert.ok(limited.choices.every(choice=>choice.unavailable));assert.equal(limited.canAdvance,true);
  assert.throws(()=>story.requestProject(game,'cache'),/budget/i);assert.throws(()=>story.startJob(game,'eat'),/budget/i);
  game=story.cancelJob(game);game=story.releaseProject(game);
  game=story.advanceGame(game,180);assert.equal(story.getGameView(game).phase,'ferry');game=story.dispatchFerry(game);
  game=story.advanceGame(game,180);assert.equal(story.getGameView(game).phase,'rain');game=story.finishStory(game);game=story.returnToCamp(game);
  assert.ok(game.record.commands.length<story.MAX_WINDOW_COMMANDS);assert.deepEqual(story.restoreGame(json(story.exportGame(game))),game);
});

test('invalid, recursive and oversized input rejects without getters, cloning expansion or world mutation',()=>{
  const game=baseline(),original=story.exportGame(game);
  for(const minutes of [-1,.5,1441,Number.MAX_SAFE_INTEGER,Infinity,NaN])assert.throws(()=>story.advanceGame(game,minutes));
  let reads=0;const getter=story.exportGame(game);Object.defineProperty(getter.game.window,'carriedCaches',{get(){reads++;return 0;},enumerable:true});assert.throws(()=>story.restoreGame(getter));assert.equal(reads,0);
  const shared=story.exportGame(game);shared.game.record.commands.push(shared.game.record.commands[0]);assert.throws(()=>story.restoreGame(shared),/unshared|tree/i);
  const cyclic=story.exportGame(game);cyclic.game.world.origin=cyclic;assert.throws(()=>story.restoreGame(cyclic),/unshared|tree/i);
  const over=story.exportGame(game);over.game.record.commands=Array.from({length:story.MAX_WINDOW_COMMANDS+1},()=>({type:'continue'}));assert.throws(()=>story.restoreGame(over),/bounded|journal/i);
  const hugeKey=story.exportGame(game);hugeKey.game['x'.repeat(2000000)]=null;assert.throws(()=>story.restoreGame(hugeKey),/size|large|bound/i);
  assert.deepEqual(story.exportGame(game),original);
});

test('window deadlines reserve numeric time and final Return exposes a stopped limit with save access',()=>{
  // A synthetic validator-only authority fixture, not evidence of earned billion-minute play.
  // The original host validates snapshots; it does not reconstruct their missing history.
  const source=milestone('build-first'),g=source.game,shift=camp.CAMP_LIMITS.worldMinutes-180-g.clock.now;
  g.clock.now+=shift;g.milestoneAt+=shift;g.stats.idleMinutes+=shift*2;
  for(const person of Object.values(g.people))person.minutes+=shift;
  for(const key of ['acceptedAt','finishedAt'])if(g.commitment[key]!==null)g.commitment[key]+=shift;
  if(g.lastResponse)g.lastResponse.at+=shift;for(const event of g.recent)event.at+=shift;
  legacy.restoreGame(source);
  const tooLate=json(source);tooLate.game.clock.now++;tooLate.game.stats.idleMinutes+=2;for(const person of Object.values(tooLate.game.people))person.minutes++;
  assert.throws(()=>story.migrateLegacyGame(tooLate),/entry time/i);
  let game=story.continueStory(story.migrateLegacyGame(source));game=story.dispatchFerry(story.advanceGame(game,1440));game=story.finishStory(story.advanceGame(game,1440));game=story.returnToCamp(game);
  const view=story.getGameView(game);assert.equal(view.now,camp.CAMP_LIMITS.worldMinutes);assert.equal(view.canAdvance,false);assert.equal(view.canAssign,false);assert.equal(view.nextEventAt,null);assert.match(view.pauseReason,/limit/i);
  assert.throws(()=>story.advanceToNextEvent(game),/limit/i);assert.deepEqual(story.restoreGame(json(story.exportGame(game))),game);
});
