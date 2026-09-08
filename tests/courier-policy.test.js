import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,getGameView,startAction,finishAction,advanceTime,interruptAction,exportGame,importGame} from '../src/games/courier.js';
const policies=await import('../src/games/courier-policy.js').catch(()=>({}));
const run=(seed,policy)=>{
  let g=createGame({seed});const actions=[];
  for(let i=0;g.status==='playing'&&i<200;i++){
    const id=policies.chooseAction(getGameView(g),policy);actions.push(id);
    g=finishAction(startAction(g,id));
    assert.deepEqual(importGame(exportGame(g)),g);
  }
  return {g,actions};
};
test('route controllers choose only available actions and finish finite rounds',()=>{
  assert.equal(typeof policies.chooseAction,'function','Host route controllers must exist');
  for(const policy of policies.POLICIES)for(let seed=1;seed<=20;seed++){
    const {g,actions}=run(seed,policy);assert.notEqual(g.status,'playing');assert.ok(actions.length>=20);assert.ok(actions.length<100);
    assert.ok(getGameView(g).summary.delivered>=3);assert.equal(policies.chooseAction(getGameView(g),policy),null);
  }
});
test('reliable and shortcut strategies retain different actual route consequences',()=>{
  const reliable=run(1,'reliable'),quick=run(1,'shortest'),informed=run(1,'inspect');
  assert.equal(reliable.actions.some(a=>['travel-footbridge','travel-lockbridge'].includes(a)),false);
  assert.ok(quick.actions.some(a=>['travel-footbridge','travel-lockbridge'].includes(a)));
  assert.ok(informed.actions.some(a=>a.startsWith('inspect-')));
  assert.notDeepEqual(reliable.actions,quick.actions);
});
test('controller decisions are repeatable, view-only and invalid names are rejected',()=>{
  const view=getGameView(createGame());
  for(const policy of policies.POLICIES)assert.equal(policies.chooseAction(view,policy),policies.chooseAction(structuredClone(view),policy));
  assert.throws(()=>policies.chooseAction(view,'full'),/policy/);
  assert.equal(readFileSync(new URL('../src/games/courier-policy.js',import.meta.url),'utf8').includes('game.seed'),false);
});

test('the final delivery completing exactly at the deadline counts',()=>{
  let g=createGame();
  while(!(getGameView(g).summary.delivered===5&&getGameView(g).actions.some(a=>a.kind==='deliver'))){
    g=finishAction(startAction(g,policies.chooseAction(getGameView(g),'reliable')));
  }
  while(g.clock+15<=237)g=finishAction(startAction(g,'rest'));
  if(g.clock<237)g=interruptAction(advanceTime(startAction(g,'rest'),237-g.clock));
  const delivery=getGameView(g).actions.find(a=>a.kind==='deliver');
  g=finishAction(startAction(g,delivery.id));assert.equal(g.clock,240);assert.equal(g.status,'complete');
  assert.equal(getGameView(g).summary.delivered,6);assert.deepEqual(importGame(exportGame(g)),g);
});
