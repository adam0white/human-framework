import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,getGameView,exportGame} from '../src/games/commons.js';
import {chooseCommand,applyCommand,runApproach} from '../src/games/commons-policy.js';

test('both visible-state approaches establish the site alone and cooperatively',()=>{
  for(const solo of [false,true])for(const policy of ['build-first','stock-first']){
    const result=runApproach({solo,policy});
    assert.equal(result.complete,true,`${policy}, solo=${solo}`);
    assert.ok(result.minutes>0&&result.minutes<4000);
    assert.deepEqual(result.structures,{shelter:2,workbench:2,garden:2});
  }
});

test('the milestone persists and another completed cache does not end the worksite',()=>{
  let game=createGame();
  for(let i=0;i<600&&game.caches<2;i++)game=applyCommand(game,chooseCommand(getGameView(game),'build-first'));
  assert.equal(game.caches,2);assert.ok(game.clock.now>game.milestoneAt);
  assert.doesNotThrow(()=>exportGame(game));
});

test('the policy sees no exact body state, seed, or future output draws',()=>{
  const game=createGame(),view=getGameView(game);
  assert.equal(view.people.player.body.fatigue,.2);
  assert.equal(Object.hasOwn(view,'seed'),false);
  assert.equal(Object.hasOwn(view.people.player,'nextAttempt'),false);
  assert.throws(()=>chooseCommand(view,'full'),/Unknown/);
  assert.throws(()=>applyCommand(game,{type:'grant',food:100}),/Unknown/);
});

test('a hundred continuing projects remain recoverable, conserved, and bounded',()=>{
  let game=createGame();
  for(let i=0;i<20000&&game.caches<100;i++)game=applyCommand(game,chooseCommand(getGameView(game),'build-first'));
  assert.equal(game.caches,100);assert.equal(game.recent.length,16);
  assert.ok(game.clock.queue.length<=2);assert.ok(JSON.stringify(exportGame(game)).length<11000);
  assert.ok(game.stats.receipts.forage>0);assert.ok(game.stats.receipts.eat>0);
});
