import test from 'node:test';
import assert from 'node:assert/strict';

const host=await import('../src/games/courtyard.js');
const {createGame,getGameView,playTurn,chooseNeighborAction,chooseResponse,exportGame,importGame,chooseAction}=host;
test('courtyard exposes an independently owned game boundary',()=>{
  assert.equal(typeof createGame,'function','The courtyard host is not implemented');
});
const check=test;
const water=g=>g.source+g.spilled+g.carried.player+g.carried.neighbor+g.homes.player+g.homes.neighbor;

check('a paid collection moves finite owned water once and both people pay elapsed time',()=>{
  const before=createGame({seed:7});const after=playTurn(before,'draw-careful');
  assert.equal(water(after),water(before));assert.equal(before.round,0);
  assert.equal(after.round,1);assert.equal(after.clock,10);
  assert.equal(after.people.player.minutes,10);assert.equal(after.people.neighbor.minutes,10);
  assert.equal(after.carried.player,4);assert.ok(after.source<before.source);
  assert.ok(after.people.player.skills.collection>before.people.player.skills.collection);
});
check('asking cannot seize owned water and the neighbor can accept or refuse a proposal',()=>{
  const g=createGame({seed:7});const v=getGameView(g);
  assert.equal(chooseResponse(v,'offer').accepted,true);
  assert.equal(chooseResponse(v,'borrow').accepted,true);
  const loan=playTurn(g,'borrow');
  assert.equal(loan.carried.player,4);assert.equal(loan.carried.neighbor,2);
  assert.deepEqual(loan.social.loan,{amount:2,dueRound:4,late:false});
  assert.equal(water(loan),water(g));
  const refused=playTurn(loan,'borrow');
  assert.equal(refused.lastTurn.neighbor.status,'refused');
  assert.equal(refused.carried.player,4);assert.equal(refused.carried.neighbor,2);
  assert.equal(refused.social.loan.amount,2);
});
check('a returned loan and an overdue loan have distinct observable consequences',()=>{
  const g=playTurn(createGame({seed:7}),'borrow');
  const returned=playTurn(g,'repay');
  assert.equal(returned.social.loan,null);assert.equal(returned.social.returnedOnTime,1);
  let late=g;for(let i=0;i<4;i++)late=playTurn(late,'rest');
  assert.equal(late.social.loan.late,true);assert.equal(late.social.lateLoans,1);
  const settled=playTurn(late,'repay');
  assert.equal(settled.social.loan,null);assert.equal(settled.social.returnedLate,1);
  assert.equal(settled.social.lateLoans,1);
  let boundary=g;for(let i=0;i<3;i++)boundary=playTurn(boundary,'rest');
  assert.equal(boundary.round,4);assert.equal(boundary.social.loan.late,true);
  const firstLateTurn=playTurn(boundary,'repay');
  assert.equal(firstLateTurn.social.returnedLate,1);assert.equal(firstLateTurn.social.returnedOnTime,0);
});
check('a loan still unpaid when its last allowed move ends is recorded as late immediately',()=>{
  let g=playTurn(createGame(),'borrow');
  for(let i=0;i<3;i++)g=playTurn(g,'rest');
  assert.equal(g.round,g.social.loan.dueRound);
  assert.equal(g.social.lateLoans,1);
  assert.equal(g.social.loan.late,true);
  assert.deepEqual(importGame(exportGame(g)),g);
});

check('blocked lifting spends its ten minutes without water, practice or recovery substitution',()=>{
  let g=createGame({seed:5});
  for(const action of ['draw-quick','pour','draw-quick','pour'])g=playTurn(g,action);
  const skill=g.people.player.skills.collection,carried=g.carried.player;
  const blocked=playTurn(g,'draw-quick');
  assert.equal(blocked.lastTurn.player.status,'blocked');
  assert.equal(blocked.lastTurn.player.amount,0);assert.equal(blocked.carried.player,carried);
  assert.equal(blocked.people.player.skills.collection,skill);
  assert.ok(blocked.people.player.body.fatigue>=g.people.player.body.fatigue);
  assert.equal(blocked.people.player.minutes-g.people.player.minutes,10);
});
check('the meal is owned, consumed once, and hunger relief needs the host receipt',()=>{
  const g=createGame();const ate=playTurn(g,'eat');
  assert.equal(ate.meals.player,0);assert.ok(ate.people.player.body.hunger<g.people.player.body.hunger);
  assert.throws(()=>playTurn(ate,'eat'),/meal is gone/);
  assert.equal(ate.round,1);
});
check('ignoring a neighbor proposal expires its offer without silently transferring it',()=>{
  let g=createGame();
  for(let i=0;i<18&&!g.social.proposal;i++)g=playTurn(g,chooseAction(getGameView(g),'self-sufficient'));
  assert.ok(g.social.proposal);const carried=g.carried.player;
  const ignored=playTurn(g,'rest');
  assert.equal(ignored.social.proposal,null);assert.equal(ignored.social.ignored,1);
  assert.equal(ignored.carried.player,carried);
});
check('relationship memory changes a response only through observed exchange facts',()=>{
  const v=getGameView(createGame());
  v.social.given.player=2;
  assert.equal(chooseResponse(v,'ask').accepted,true);
  v.socialMemory=false;
  assert.equal(chooseResponse(v,'ask').accepted,false);
  v.socialMemory=true;v.social.lateLoans=1;
  assert.equal(chooseResponse(v,'borrow').accepted,false);
  v.socialMemory=false;
  assert.equal(chooseResponse(v,'borrow').accepted,true);
});
check('arbitrary legal choices preserve resumable finite state across seed families',()=>{
  for(let seed=0;seed<40;seed++){
    let g=createGame({seed,profile:seed%2?'scarce':'standard'});
    while(g.status==='playing'){
      const options=getGameView(g).actions.filter(a=>!a.unavailable);
      g=playTurn(g,options[(seed*11+g.round*7)%options.length].id);
      assert.deepEqual(importGame(exportGame(g)),g);
    }
  }
});
check('gift consent follows recipient capacity and a refusal does not consume either inventory',()=>{
  const g=createGame();const v=getGameView(g);
  v.carried.neighbor=6;
  assert.equal(chooseResponse(v,'offer').accepted,false);
  const gifted=playTurn(g,'offer');
  assert.equal(gifted.carried.player,0);assert.equal(gifted.carried.neighbor,6);
  assert.equal(gifted.social.given.player,2);assert.equal(gifted.lastTurn.neighbor.status,'accepted');
});
check('neighbor can initiate a request from visible shortage and it can be refused without a transfer',()=>{
  const view=getGameView(createGame());view.source=0;view.carried.neighbor=0;view.carried.player=4;
  assert.equal(chooseNeighborAction(view),'request');
  let g=createGame({seed:3,profile:'scarce'});
  let proposal=null;
  for(let i=0;i<18&&g.status==='playing';i++){
    g=playTurn(g,chooseAction(getGameView(g),'self-sufficient'));
    if(g.social.proposal?.kind==='request'){proposal=g;break;}
  }
  assert.ok(proposal,'a neighbor in shortage should actually request help');
  const before=proposal.carried.player;const refused=playTurn(proposal,'refuse');
  assert.equal(refused.carried.player,before);
  assert.equal(refused.social.refusedByPlayer,1);
});
check('controllers receive public observations without seed or exact body and return detached views',()=>{
  const g=createGame();const v=getGameView(g);
  assert.equal('seed' in v,false);assert.equal('people' in v,false);
  assert.equal('observationBias' in v.player,false);
  v.carried.player=999;assert.equal(g.carried.player,2);
  const changed=structuredClone(g);changed.seed=900;
  assert.deepEqual(getGameView(changed),getGameView(g));
  assert.equal(chooseNeighborAction(getGameView(changed)),chooseNeighborAction(getGameView(g)));
});
check('all controllers terminate after eighteen bounded turns and conserve source water',()=>{
  for(const profile of ['standard','scarce','plentiful'])for(const policy of ['self-sufficient','reciprocal','generous']){
    let g=createGame({seed:21,profile});const total=water(g);
    while(g.status==='playing'){
      g=playTurn(g,chooseAction(getGameView(g),policy));
      assert.equal(water(g),total);assert.ok(g.carried.player<=6&&g.carried.neighbor<=6);
      assert.ok(JSON.stringify(exportGame(g)).length<7000);
    }
    assert.equal(g.round,18);assert.equal(g.clock,180);
    assert.throws(()=>playTurn(g,'rest'),/finished/);
  }
});
check('save restores at every turn and rejects manufactured water, unknown versions and mismatched clocks',()=>{
  let g=createGame({seed:19});
  for(let i=0;i<18;i++){
    const restored=importGame(JSON.parse(JSON.stringify(exportGame(g))));
    assert.deepEqual(restored,g);
    const action=chooseAction(getGameView(g),'reciprocal');
    assert.deepEqual(playTurn(restored,action),playTurn(g,action));
    g=playTurn(g,action);
  }
  for(const mutate of [s=>s.source++,s=>s.version='999',s=>s.clock--,s=>s.people.player.person.pending={},s=>s.social.loan={amount:200,dueRound:1,late:false}]){
    const s=exportGame(g);mutate(s);assert.throws(()=>importGame(s));
  }
  assert.throws(()=>playTurn(createGame(),'steal'),/Unknown/);
  assert.throws(()=>createGame({seed:NaN}),/seed/);
});
check('saves reject impossible paid-action histories even when total water is conserved',()=>{
  const poured=exportGame(playTurn(createGame(),'rest'));
  poured.homes={player:6,neighbor:0};poured.carried={player:0,neighbor:0};
  assert.throws(()=>importGame(poured),/history|ownership/);
  const doubleGift=exportGame(playTurn(createGame(),'offer'));doubleGift.social.given.neighbor=2;
  assert.throws(()=>importGame(doubleGift),/history|ownership/);
});
check('saves cannot silently move carried water between owners without a recorded exchange',()=>{
  const moved=exportGame(playTurn(createGame(),'rest'));
  moved.carried.player++;moved.carried.neighbor--;
  assert.throws(()=>importGame(moved),/ownership/);
});
check('the final move deposits carried water instead of collecting water that cannot be stored in time',()=>{
  let game=createGame({seed:34});
  for(const action of ['draw-careful','eat','rest','draw-quick','ask','pour','accept','pour','draw-quick','refuse','draw-careful','rest','ask','pour','rest','rest','borrow'])game=playTurn(game,action);
  assert.equal(game.round,17);assert.equal(game.carried.player,2);assert.equal(game.homes.player,7);
  assert.equal(chooseAction(getGameView(game),'reciprocal'),'pour');
  assert.equal(playTurn(game,chooseAction(getGameView(game),'reciprocal')).homes.player,9);
});
check('a gift-first route and an on-time loan route both leave two complete household barrels',()=>{
  for(const opening of [['offer'],['borrow','pour','draw-careful','repay']]){
    let game=createGame({seed:1});for(const action of opening)game=playTurn(game,action);
    while(game.status==='playing')game=playTurn(game,chooseAction(getGameView(game),'reciprocal'));
    assert.equal(game.status,'both-ready');assert.equal(game.social.loan,null);
    assert.ok(game.social.given.player>0||game.social.returnedOnTime>0);
  }
});
check('Meryem also uses her final remaining turn to pour usable water instead of asking or collecting',()=>{
  let game=createGame({seed:0});
  for(const action of ['eat','ask','rest','ask','offer','borrow','repay','borrow','pour','borrow','borrow','rest','ask','rest','draw-quick','borrow','borrow'])game=playTurn(game,action);
  assert.equal(game.round,17);assert.equal(game.carried.neighbor,2);assert.equal(game.homes.neighbor,6);
  assert.equal(chooseNeighborAction(getGameView(game)),'pour');
  const finished=playTurn(game,'rest');assert.equal(finished.lastTurn.neighbor.actionId,'pour');
  assert.equal(finished.homes.neighbor,8);
});
