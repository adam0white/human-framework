import test from 'node:test';
import assert from 'node:assert/strict';
import * as host from '../src/games/workshop.js';

const act=(game,id)=>host.finishAction(host.startAction(game,id));
const ids=game=>host.getActions(game).map(a=>a.id);
const route=(seed,method)=>{
  let game=host.createGame({seed});
  game=act(game,'take-wrench');
  if(method==='replace')game=act(game,'take-seal');
  game=act(game,'go-pump');
  for(let i=0;i<9&&game.status==='playing';i++) {
    if(game.objects.pump.status==='repaired')return act(game,'test-pump');
    const actions=host.getActions(game),work=actions.find(a=>a.id===method);
    if(!work.capacity.allowed) {
      if(work.capacity.causes.includes('hunger')) {
        game=act(game,'go-storage');game=act(game,'eat');game=act(game,'go-pump');
      } else game=act(game,'rest');
    } else game=act(game,method);
  }
  return game;
};

test('host owns location, tool and part prerequisites; retrieval and travel take real time',()=>{
  let game=host.createGame({seed:1});
  assert.ok(!ids(game).includes('patch'));
  assert.throws(()=>host.startAction(game,'patch'),/available|prerequisite/i);
  game=act(game,'go-pump');
  assert.equal(game.clock,12);
  assert.ok(!ids(game).includes('eat'));
  assert.ok(!ids(game).includes('replace'));
  game=act(game,'go-storage');game=act(game,'take-wrench');game=act(game,'go-pump');
  assert.equal(game.objects.wrench.location,'inventory');
  assert.ok(ids(game).includes('patch'));
  assert.ok(!ids(game).includes('replace'));
});

test('elapsed work credits body and practice once; interrupt preserves partial time without repair',()=>{
  let game=host.createGame({seed:1});game=act(game,'take-wrench');game=act(game,'go-pump');
  const before=game.person;
  game=host.startAction(game,'patch');
  assert.throws(()=>host.startAction(game,'rest'),/pending|progress/i);
  game=host.advanceTime(game,5);
  assert.equal(game.clock,23);
  assert.equal(game.person.minutes,23);
  assert.ok(game.person.skills.repair>before.skills.repair);
  const skills=game.person.skills;
  game=host.interruptAction(game,'Power cut');
  assert.equal(game.objects.pump.status,'broken');
  assert.deepEqual(game.person.skills,skills);
  assert.equal(game.pending,null);
  assert.throws(()=>host.finishAction(game),/pending/i);
});

test('pending save resumes identically; separate commands reproduce interruptions and seeded outcomes',()=>{
  const commands=[{type:'start',actionId:'take-wrench'},{type:'finish'},
    {type:'start',actionId:'go-pump'},{type:'advance',minutes:5}];
  let game=host.createGame({seed:61,policy:'task-aware'});
  for(const command of commands)game=host.applyCommand(game,command);
  const resumed=host.importGame(JSON.parse(JSON.stringify(host.exportGame(game))));
  assert.deepEqual(host.finishAction(resumed),host.finishAction(game));
  const tail=[{type:'interrupt',reason:'External power cut'},{type:'start',actionId:'go-pump'},
    {type:'finish'},{type:'start',actionId:'patch'},{type:'finish'}];
  for(const command of tail)game=host.applyCommand(game,command);
  assert.deepEqual(host.replaySession({version:host.HOST_VERSION,seed:61,policy:'task-aware',commands:[...commands,...tail]}),game);
  assert.ok(!('commands' in host.exportGame(game)));
  assert.throws(()=>host.replaySession({version:'bogus',seed:1,policy:'task-aware',commands:[]}),/version/i);
});

test('policies receive no seed, true body, hidden condition or outcome draw',()=>{
  const one=host.createGame({seed:1}),two=host.createGame({seed:999});
  const first=host.getGameView(one),second=host.getGameView(two);
  assert.deepEqual(first,second);
  assert.equal(host.chooseAction(first,'task-aware'),host.chooseAction(second,'task-aware'));
  const text=JSON.stringify(first);
  for(const key of ['seed','condition','actual','draw','observationBias'])assert.ok(!text.includes('"'+key+'"'));
  first.worker.body.fatigue=1;
  assert.equal(one.person.body.fatigue,0.22);
});

test('both repair routes win with retry slack and different resource/time consequences',()=>{
  const patch=route(1,'patch'),replace=route(1,'replace');
  assert.equal(patch.status,'won');assert.equal(replace.status,'won');
  assert.notEqual(patch.clock,replace.clock);
  assert.equal(patch.objects.seal.location,'storage');
  assert.equal(replace.objects.seal.location,'installed');
  assert.equal(patch.objects.pump.status,'running');
});

test('blocked exertion spends two idle minutes with no work, practice, ration or rest effect',()=>{
  let game=host.createGame({seed:1});game=act(game,'take-wrench');game=act(game,'go-pump');
  const saved=host.exportGame(game);saved.person.person.body.fatigue=0.99;
  game=host.importGame(saved);
  const before=structuredClone(game);
  game=act(game,'patch');
  assert.equal(game.clock,before.clock+2);
  assert.equal(game.person.body.fatigue,0.993);
  assert.equal(game.person.body.hunger,before.person.body.hunger+0.004);
  assert.deepEqual(game.person.skills,before.person.skills);
  assert.equal(game.objects.rations.count,2);
  assert.equal(game.objects.pump.status,'broken');
  assert.equal(game.lastEvent.status,'blocked');
});

test('only an accessible completed meal debits one ration; interrupted meals grant no relief',()=>{
  let game=host.createGame({seed:1});
  game=host.advanceTime(host.startAction(game,'eat'),5);
  assert.equal(game.objects.rations.count,2);
  const hunger=game.person.body.hunger;
  game=host.interruptAction(game,'Interrupted meal');
  assert.equal(game.person.body.hunger,hunger);
  game=act(game,'eat');
  assert.equal(game.objects.rations.count,1);
  assert.equal(game.person.body.hunger,0);
  assert.throws(()=>host.finishAction(game),/pending/i);
});

test('deadline interrupts an unfinished action and prevents late victory',()=>{
  let game=host.createGame({seed:1});
  while(game.clock<225)game=act(game,'rest');
  game=host.finishAction(host.startAction(game,'rest'));
  assert.equal(game.clock,240);
  assert.equal(game.status,'lost');
  assert.equal(game.pending,null);
  assert.throws(()=>host.startAction(game,'go-pump'),/finished|over/i);
});

test('save validation rejects versions, forged pending effects and mismatched human/host clocks',()=>{
  let save=host.exportGame(host.createGame({seed:1}));
  save.version='future';assert.throws(()=>host.importGame(save),/version/i);
  save=host.exportGame(host.createGame({seed:1}));save.clock=40;
  assert.throws(()=>host.importGame(save),/clock|minutes/i);
  save=host.exportGame(host.startAction(host.createGame({seed:1}),'take-wrench'));
  save.pending.actionId='replace';assert.throws(()=>host.importGame(save),/pending|attempt/i);
  assert.throws(()=>host.applyCommand(host.createGame({seed:1}),{type:'outcome',success:true}),/command/i);
});

test('the task-aware controller can finish many seeds without secret information',()=>{
  let wins=0;
  for(let seed=1;seed<=30;seed++) {
    let game=host.createGame({seed,policy:'task-aware'});
    for(let n=0;n<80&&game.status==='playing';n++) {
      const id=host.chooseAction(host.getGameView(game),'task-aware');
      assert.ok(id,'playing controller needs an action');game=act(game,id);
    }
    if(game.status==='won')wins++;
  }
  assert.ok(wins>=27,`only ${wins}/30 wins`);
});

test('ten thousand host commands keep active saves bounded without a transcript',()=>{
  let game=host.createGame({seed:17});
  const initialBytes=JSON.stringify(host.exportGame(game)).length;
  for(let i=0;i<5000;i++) {
    game=host.startAction(game,'take-wrench');
    game=host.interruptAction(game,'Host pause before collection');
  }
  assert.equal(game.clock,0);
  assert.equal(game.objects.wrench.location,'storage');
  assert.equal(game.person.nextAttempt,5001);
  assert.ok(JSON.stringify(host.exportGame(game)).length<initialBytes+250);
  assert.ok(!('history' in game)&&!('commands' in game));
  assert.deepEqual(host.importGame(host.exportGame(game)),game);
});
