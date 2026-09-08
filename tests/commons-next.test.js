import test from 'node:test';
import assert from 'node:assert/strict';
import * as old from '../src/games/commons.js';
import {chooseCommand,applyCommand} from '../src/games/commons-policy.js';
import * as next from '../src/games/commons-next.js';
function command(game,c){if(c.type==='start')return next.startJob(game,c.jobId);if(c.type==='request')return next.requestProject(game,c.projectId);return next.advanceToNextEvent(game);}
function untilCheckpoint(game,policy='build-first'){let n=0;while(next.getGameView(game).phase==='packing'&&n++<200)game=command(game,chooseCommand(old.getGameView(game.world),policy));assert.ok(n<200);return game;}

test('opening starts directly at an earned established camp without free supplies or recovery',()=>{
  assert.equal(typeof next.createGame,'function','The episode constructor must exist');
  const game=next.createGame();let control=old.createGame();while(control.milestoneAt===null)control=applyCommand(control,chooseCommand(old.getGameView(control)));
  assert.deepEqual(game.world,control);assert.equal(game.world.caches,0);assert.deepEqual(game.world.stock,{timber:2,salvage:1,food:2});
  const view=next.getGameView(game);assert.equal(view.remaining,180);assert.equal(view.ferryRemaining,90);assert.equal(view.availableCaches,0);assert.equal(view.phase,'packing');
});

test('completed caches buy competing useful outcomes and cannot be spent twice',()=>{
  const checkpoint=untilCheckpoint(next.createGame());assert.equal(checkpoint.world.caches,1);
  const ferry=next.allocateCache(checkpoint,'households'),camp=next.allocateCache(checkpoint,'camp');
  assert.equal(next.getGameView(ferry).householdsEquipped,1);assert.equal(next.getGameView(ferry).campNights,0);
  assert.equal(next.getGameView(camp).householdsEquipped,0);assert.equal(next.getGameView(camp).campNights,2);
  assert.equal(next.getGameView(ferry).availableCaches,0);assert.throws(()=>next.allocateCache(ferry,'camp'),/cache/i);
  assert.equal(checkpoint.allocations.length,0);assert.deepEqual(ferry.world,camp.world);
});

test('time stops for the ferry decision and late caches cannot equip households',()=>{
  let game=untilCheckpoint(next.createGame());const now=game.world.clock.now;assert.equal(now-game.openedAt,90);
  assert.throws(()=>next.advanceGame(game,1),/ferry/i);assert.throws(()=>next.startJob(game,'rest'),/ferry/i);
  game=next.dispatchFerry(game);assert.equal(game.departedAt,game.openedAt+90);assert.throws(()=>next.dispatchFerry(game),/departed/i);
  game=untilCheckpoint(game);assert.equal(game.world.clock.now-game.openedAt,180);
  assert.equal(next.getGameView(game).phase,'dusk');assert.throws(()=>next.allocateCache(game,'households'),/ferry/i);
  assert.throws(()=>next.advanceGame(game,1),/dusk/i);assert.throws(()=>next.dispatchFerry(next.createGame()),/checkpoint/i);
});

test('checkpoint clamping preserves pending jobs, paid work and JSON resume across drivers',()=>{
  const start=next.requestProject(next.startJob(next.createGame(),'gather-timber'),'cache');
  const whole=next.advanceGame(start,180);let minute=start;for(let i=0;i<90;i++)minute=next.advanceGame(minute,1);
  assert.deepEqual(next.exportGame(whole),next.exportGame(minute));assert.equal(whole.world.clock.now-whole.openedAt,90);
  assert.deepEqual(next.restoreGame(JSON.parse(JSON.stringify(next.exportGame(whole)))),whole);
  const resumed=next.dispatchFerry(next.restoreGame(next.exportGame(whole))),direct=next.dispatchFerry(whole);
  assert.deepEqual(next.advanceGame(resumed,80),next.advanceGame(direct,80));
});

test('Meryem retains consent, refusal and paid recovery through the wrapper',()=>{
  let game=next.requestProject(next.createGame(),'cache');assert.equal(game.world.lastResponse.accepted,true);
  game=next.requestProject(game,'cache');assert.equal(game.world.lastResponse.accepted,false);assert.equal(game.world.commitment.status,'accepted');
  game=next.advanceGame(game,5);game=next.releaseProject(game);assert.equal(game.world.commitment.status,'released');
  const before=game.world.clock.now;game=next.startJob(game,'rest');game=next.advanceGame(game,18);
  assert.equal(game.world.clock.now,before+18);assert.ok(game.world.stats.restMinutes>0);
});

test('dusk permits final allocation and records unused supplies and unfinished work without rewarding either',()=>{
  let game=untilCheckpoint(next.dispatchFerry(untilCheckpoint(next.createGame())));
  assert.equal(game.world.caches,3);game=next.allocateCache(next.allocateCache(game,'camp'),'camp');
  assert.throws(()=>next.allocateCache(game,'camp'),/covered|complete/i);
  const finished=next.finishDay(game),view=next.getGameView(finished);assert.equal(view.phase,'ended');assert.equal(view.campNights,4);assert.equal(view.householdsEquipped,0);assert.equal(view.availableCaches,1);
  assert.deepEqual(finished.world,game.world);assert.throws(()=>next.allocateCache(finished,'camp'),/ended/i);assert.throws(()=>next.finishDay(next.createGame()),/dusk/i);
  assert.deepEqual(next.restoreGame(next.exportGame(finished)),finished);
});

test('old saves and forged allocations, deadlines, production or ended state reject',()=>{
  assert.throws(()=>next.restoreGame(old.exportGame(old.createGame())),/incompatible/i);
  const checkpoint=next.allocateCache(untilCheckpoint(next.createGame()),'households');
  const attacks=[g=>g.allocations.push({...g.allocations[0]}),g=>g.allocations[0].at=g.openedAt-1,g=>g.allocations[0].destination='other',g=>g.allocations[0].cache=99,g=>g.production[0].at=g.world.clock.now+1,g=>g.openedAt++,g=>g.departed=true,g=>g.ended=true,g=>g.world.stock.food++,g=>g.extra=true];
  for(const attack of attacks){const snap=next.exportGame(checkpoint);attack(snap.game);assert.throws(()=>next.restoreGame(snap));}
});

test('allocation decisions do not alter underlying Human, resources, consent or paid time',()=>{
  let game=next.createGame(),control=structuredClone(game.world),n=0;
  while(next.getGameView(game).phase!=='dusk'&&n++<300){
    if(next.getGameView(game).phase==='ferry'){game=next.allocateCache(game,'households');game=next.dispatchFerry(game);continue;}
    const c=chooseCommand(old.getGameView(control));
    if(c.type==='advance'){
      const before=game.world.clock.now;game=next.advanceToNextEvent(game);control=old.advanceGame(control,game.world.clock.now-before);
    }else{game=command(game,c);control=applyCommand(control,c);}
    assert.deepEqual(old.exportGame(game.world),old.exportGame(control));
  }
  assert.ok(n<300);assert.equal(next.getGameView(game).householdsEquipped,1);
});

test('a paid food and recovery opening can miss the ferry without reducing total cache production',()=>{
  let delayed=next.createGame();
  for(const job of ['rest','eat','forage']){delayed=next.startJob(delayed,job);while(delayed.world.jobs.player)delayed=next.advanceToNextEvent(delayed);}
  const quick=untilCheckpoint(next.createGame()),slow=untilCheckpoint(delayed);
  assert.equal(quick.world.caches,1);assert.equal(slow.world.caches,0);
  const quickEnd=untilCheckpoint(next.dispatchFerry(quick)),slowEnd=untilCheckpoint(next.dispatchFerry(slow));
  assert.equal(quickEnd.world.caches,3);assert.equal(slowEnd.world.caches,3);
  assert.equal(quickEnd.world.stock.food,2);assert.equal(slowEnd.world.stock.food,4);
  assert.throws(()=>next.allocateCache(slowEnd,'households'),/ferry/);
});

test('the executable comparison preserves equal physical output and reports the missed-ferry counterexample',async()=>{
  const comparison=await import('../scripts/commons-next-comparison.js');
  assert.equal(typeof comparison.runComparison,'function','The bounded comparison must execute');
  const report=comparison.runComparison();assert.equal(report.runs.length,6);assert.ok(report.runs.every(run=>run.originalWorldMatched));
  const delayed=report.runs.find(run=>run.approach==='recover-and-stock-food'&&run.destination==='households-first');
  assert.equal(delayed.atFerry.caches,0);assert.equal(delayed.atDusk.caches,3);assert.equal(delayed.outcome.householdsEquipped,0);
});
