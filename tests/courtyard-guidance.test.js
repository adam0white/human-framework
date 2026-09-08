import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,getGameView,playTurn,chooseAction,exportGame} from '../src/games/courtyard.js';
import {actionGuidance,turnAccount,neighborGoal,goalGuidance} from '../web/courtyard-guide.js';

test('courtyard explains the response slot separately from an independent neighbor action',()=>{
  const view=getGameView(createGame());
  for(const id of ['offer','ask','borrow'])assert.match(actionGuidance(view,id).participation,/Meryem replies.*both action slots/);
  for(const id of ['accept','refuse','repay'])assert.match(actionGuidance(view,id).participation,/your action slot.*Meryem then chooses/);
  const spoken=playTurn(createGame(),'ask');
  const account=turnAccount(getGameView(spoken));
  assert.equal(account.minutes,10);assert.equal(account.start,0);assert.equal(account.end,10);
  assert.equal(account.neighbor.phase,'Reply to you');
  assert.match(account.neighbor.detail,/uses her action/);
  const returned=playTurn(playTurn(createGame(),'borrow'),'repay');
  assert.equal(turnAccount(getGameView(returned)).neighbor.phase,'Her own choice');
  let proposal=createGame();for(const id of ['draw-quick','draw-quick','pour'])proposal=playTurn(proposal,id);
  assert.equal(proposal.social.proposal.kind,'request');
  for(const reply of ['accept','refuse']){
    const after=playTurn(proposal,reply),account=turnAccount(getGameView(after));
    assert.equal(account.neighbor.phase,'Her own choice');
    assert.equal(after.people.player.minutes,40);assert.equal(after.people.neighbor.minutes,40);
  }
});

test('courtyard tells a player who already carries enough how many pouring moves remain',()=>{
  const view=getGameView(createGame());view.homes.player=12;view.carried.player=2;view.remainingTurns=1;
  assert.match(goalGuidance(view),/carry the 2 buckets.*1 pouring move/);
  assert.match(actionGuidance(view,'draw-careful').warning,/last move.*stay in your cans/);
  assert.match(actionGuidance(view,'ask').warning,/last move.*stay in your cans/);
});

test('courtyard distinguishes a known unavailable choice from an estimated paid capacity block',()=>{
  const game=createGame();game.people.player.body.fatigue=.96;
  const view=getGameView(game),guidance=actionGuidance(view,'pour');
  assert.equal(view.actions.find(a=>a.id==='pour').unavailable,null);
  assert.match(guidance.warning,/fatigue.*10 minutes.*no water.*no recovery/);
  const after=playTurn(game,'pour');
  assert.match(turnAccount(getGameView(after)).player.detail,/Blocked.*10 minutes.*no recovery/);
  const empty=getGameView(createGame());empty.actions.find(a=>a.id==='pour').unavailable='You have no carried water.';
  assert.equal(actionGuidance(empty,'pour').warning,null);
});

test('courtyard collection guidance warns if its visible effort leaves the next pour beyond estimated capacity',()=>{
  const game=createGame();game.people.player.body.fatigue=.73;
  const view=getGameView(game);
  assert.equal(view.actions.find(a=>a.id==='draw-quick').capacity.allowed,true);
  assert.match(actionGuidance(view,'draw-quick').warning,/pour next move.*recovery/);
});

test('Meryem’s completed household goal is visible without promising more collection for the player',()=>{
  let game=createGame();while(game.status==='playing')game=playTurn(game,chooseAction(getGameView(game),'reciprocal'));
  assert.equal(game.homes.neighbor,14);
  assert.match(neighborGoal(getGameView(game)),/Her barrel is full/);
  assert.match(neighborGoal(getGameView(game)),/does not collect.*your household/);
});

test('guidance reads detached observations and leaves save and policy results unchanged',()=>{
  let plain=createGame({seed:8}),guided=createGame({seed:8});
  assert.equal(turnAccount(getGameView(plain)),null);
  while(plain.status==='playing'){
    const view=getGameView(guided),before=structuredClone(view);
    for(const action of view.actions)actionGuidance(view,action.id);
    goalGuidance(view);neighborGoal(view);turnAccount(view);
    assert.deepEqual(view,before);
    plain=playTurn(plain,chooseAction(getGameView(plain),'reciprocal'));
    guided=playTurn(guided,chooseAction(view,'reciprocal'));
    assert.deepEqual(exportGame(guided),exportGame(plain));
  }
});
