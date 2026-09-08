import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startJob,requestProject,releaseProject,cancelJob,advanceGame,advanceToNextEvent,getGameView,exportGame,restoreGame} from '../src/games/commons.js';

test('two people work concurrently and finish distinct jobs at their own times',()=>{
  let game=startJob(createGame(),'gather-timber');
  game=requestProject(game,'shelter');
  const first=getGameView(game);
  assert.equal(first.people.player.job.id,'gather-timber');
  assert.equal(first.people.neighbor.job.id,'build-shelter');
  assert.notEqual(first.people.player.job.endsAt,first.people.neighbor.job.endsAt);
  game=advanceToNextEvent(game);
  assert.equal(getGameView(game).people.player.job,null);
  assert.ok(getGameView(game).people.neighbor.job);
  assert.equal(game.structures.shelter,0);
  assert.equal(game.stock.timber,3);
});

test('canceling a construction refunds its reserved materials and preserves only paid practice',()=>{
  const start=createGame({solo:true}),before=structuredClone(start);
  let game=startJob(start,'build-shelter');
  assert.equal(game.stock.timber,0);
  assert.equal(game.stock.salvage,1);
  assert.throws(()=>startJob(game,'build-workbench'),/busy|working/i);
  game=advanceGame(game,5);
  const practice=game.people.player.skills.construction;
  game=cancelJob(game);
  assert.deepEqual(game.stock,before.stock);
  assert.equal(game.structures.shelter,0);
  assert.ok(game.people.player.body.fatigue>before.people.player.body.fatigue);
  assert.equal(game.people.player.skills.construction,practice);
  assert.equal(game.clock.now,5);
  assert.equal(game.clock.queue.length,0);
  assert.deepEqual(start,before);
});

test('a meal reserves scarce communal food, interruption consumes none or hunger relief',()=>{
  let game=createGame({solo:true});
  game=startJob(game,'eat');
  assert.equal(game.stock.food,3);
  game=advanceGame(game,3);
  const hungry=game.people.player.body.hunger;
  game=cancelJob(game);
  assert.equal(game.stock.food,4);
  assert.equal(game.people.player.body.hunger,hungry);
  game=startJob(game,'eat');game=advanceToNextEvent(game);
  assert.equal(game.stock.food,3);
  assert.equal(game.stats.consumedFood,1);
  assert.ok(game.people.player.body.hunger<hungry);
});

test('a project response is explicit, honors accepted work, and can be withdrawn',()=>{
  let game=requestProject(createGame(),'cache');
  assert.equal(game.commitment.status,'declined');
  assert.match(game.commitment.reason,/shelter|workbench|garden/i);
  game=requestProject(game,'shelter');
  assert.equal(game.commitment.status,'accepted');
  assert.ok(game.jobs.neighbor);
  const accepted=structuredClone(game.commitment);
  game=requestProject(game,'garden');
  assert.equal(game.commitment.project,'shelter');
  assert.equal(game.commitment.acceptedAt,accepted.acceptedAt);
  assert.match(game.lastResponse.reason,/already|finish/i);
  game=releaseProject(game);
  assert.equal(game.commitment.status,'released');
  assert.equal(game.jobs.neighbor,null);
});

test('whole, one-minute, and event advances preserve an identical pending save',()=>{
  const start=requestProject(startJob(createGame(),'gather-salvage'),'shelter');
  const whole=advanceGame(start,600);
  let minute=start,event=start;
  for(let n=0;n<600;n++)minute=advanceGame(minute,1);
  while(event.clock.now<600){const end=event.clock.queue[0]?.at??600;event=advanceGame(event,Math.min(600-event.clock.now,end-event.clock.now));}
  assert.deepEqual(exportGame(whole),exportGame(minute));
  assert.deepEqual(exportGame(whole),exportGame(event));
});

test('pending concurrent construction and meal survive JSON save and resume exactly',()=>{
  let game=requestProject(startJob(createGame(),'eat'),'shelter');
  game=advanceGame(game,3);
  const restored=restoreGame(JSON.parse(JSON.stringify(exportGame(game))));
  assert.deepEqual(advanceGame(restored,250),advanceGame(game,250));
});

test('separate builders cannot spend the same supplies or reserve the same structure stage',()=>{
  let game=requestProject(createGame(),'shelter');
  assert.throws(()=>startJob(game,'build-shelter'),/already building/i);
  assert.throws(()=>startJob(game,'build-workbench'),/Needs/);
  assert.equal(game.stock.timber,0);
  game=startJob(game,'gather-salvage');
  game=advanceGame(game,7);
  assert.deepEqual(restoreGame(exportGame(game)),game);
});

test('a reachable fully hungry and exhausted worksite recovers through paid food gathering and meals',()=>{
  let game=createGame({solo:true});
  for(let n=0;n<4;n++){game=startJob(game,'eat');game=advanceToNextEvent(game);}
  game=advanceGame(game,1000);
  assert.equal(game.people.player.body.hunger,1);
  assert.equal(game.people.player.body.fatigue,1);
  assert.equal(game.stock.food,0);
  assert.throws(()=>startJob(game,'gather-timber'),/hunger|fatigue/);
  game=startJob(game,'forage');const start=game.clock.now;game=advanceToNextEvent(game);
  assert.ok(game.clock.now>start);assert.equal(game.stock.food,2);
  game=startJob(game,'eat');game=advanceToNextEvent(game);
  game=startJob(game,'rest');game=advanceToNextEvent(game);
  game=startJob(game,'gather-timber');game=advanceToNextEvent(game);
  assert.equal(game.stock.timber,7);
});

test('Meryem continues an accepted project after several meals and rests, without player automation',()=>{
  let game=requestProject(createGame(),'shelter');
  game=advanceGame(game,600);
  assert.equal(game.structures.shelter,2);
  assert.equal(game.commitment.status,'fulfilled');
  assert.equal(game.commitment.project,'shelter');
  assert.ok(game.stats.restMinutes>0);
  game=requestProject(game,'garden');game=advanceGame(game,600);
  assert.equal(game.structures.garden,2);
  assert.equal(game.commitment.status,'fulfilled');
});

test('zero-minute cancel loops do not farm practice, time, output, food, or queue entries',()=>{
  let game=createGame({solo:true});const before=structuredClone(game.people.player.body),skill=structuredClone(game.people.player.skills);
  for(let n=0;n<2000;n++){game=startJob(game,'build-shelter');game=cancelJob(game);}
  assert.deepEqual(game.people.player.body,before);assert.deepEqual(game.people.player.skills,skill);
  assert.deepEqual(game.stock,{timber:4,salvage:2,food:4});assert.equal(game.clock.now,0);
  assert.equal(game.clock.queue.length,0);assert.equal(game.recent.length,16);
  assert.ok(JSON.stringify(exportGame(game)).length<8000);
});

test('strict snapshots reject forged stock, event receipts, identities, skills, and commitments',()=>{
  const active=advanceGame(requestProject(startJob(createGame(),'eat'),'shelter'),3);
  const attacks=[
    g=>g.stock.food++,g=>g.people.player.id='neighbor',g=>g.people.player.minutes++,g=>g.jobs.player.cost.food=0,
    g=>g.clock.queue[0].data.attemptId='player:999',g=>g.jobs.neighbor.duration++,g=>g.jobs.neighbor.output={timber:999},
    g=>g.people.player.skills.woodmagic=.5,g=>g.milestoneAt=0,g=>g.commitment.status='fulfilled',g=>g.recent.push({at:1000,actor:'world',message:'future'}),
    g=>g.stats.workMinutes++,g=>g.extra='unknown',g=>g.jobs.neighbor.benefits.workbench=true,g=>g.stock.timber=NaN
  ];
  for(const attack of attacks){const bad=exportGame(active);attack(bad.game);assert.throws(()=>restoreGame(bad));}
});

test('solo worksite has no neighbor jobs or consent and stays isolated',()=>{
  const game=createGame({solo:true});assert.deepEqual(Object.keys(game.people),['player']);
  assert.throws(()=>requestProject(game,'shelter'),/no neighbor/);
  assert.equal(advanceGame(game,500).clock.queue.length,0);
});

test('completed shared work fulfills a commitment while the neighbor finishes a personal meal',()=>{
  let game=createGame();
  for(const id of ['build-shelter','gather-timber','gather-timber','gather-salvage']){game=startJob(game,id);while(game.jobs.player)game=advanceToNextEvent(game);}
  game=advanceGame(game,50);game=startJob(game,'rest');while(game.jobs.player)game=advanceToNextEvent(game);
  game=requestProject(startJob(game,'build-shelter'),'shelter');game=advanceGame(game,game.jobs.player.duration);
  assert.equal(game.structures.shelter,2);assert.equal(game.jobs.neighbor.id,'eat');
  assert.equal(game.commitment.status,'fulfilled');
  const meal=structuredClone(game.jobs.neighbor);
  game=requestProject(game,'garden');assert.equal(game.lastResponse.accepted,true);
  assert.deepEqual(game.jobs.neighbor,meal);
});

test('releasing a project preserves independently chosen recovery and its reserved meal',()=>{
  let game=createGame();
  while(game.jobs.neighbor?.id!=='eat')game=advanceGame(game,1);
  game=requestProject(game,'shelter');
  const meal=structuredClone(game.jobs.neighbor),food=game.stock.food;
  game=releaseProject(game);
  assert.deepEqual(game.jobs.neighbor,meal);assert.equal(game.stock.food,food);
  game=advanceGame(game,meal.endsAt-game.clock.now);
  assert.equal(game.stats.consumedFood,1);
  assert.equal(game.commitment.status,'released');
});

test('coordinated stock and ledger edits cannot invent unpaid completed gathering',()=>{
  const snapshot=exportGame(createGame());snapshot.game.stock.timber+=100;snapshot.game.stats.gathered.timber+=100;
  assert.throws(()=>restoreGame(snapshot));
});

test('simultaneous completions settle once before Meryem chooses her next job',()=>{
  let game=requestProject(startJob(createGame(),'gather-salvage'),'workbench');
  assert.equal(game.jobs.player.endsAt,game.jobs.neighbor.endsAt);
  game=advanceToNextEvent(game);
  assert.equal(game.clock.now,22);assert.equal(game.structures.workbench,1);
  assert.equal(game.stats.receipts['gather-salvage'],1);assert.equal(game.stock.salvage,3);
  assert.equal(game.jobs.neighbor.id,'gather-timber');
  assert.equal(game.clock.queue.length,1);assert.doesNotThrow(()=>restoreGame(exportGame(game)));
});
