import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerson} from '../src/human/index.js';
const host=await import('../src/games/courier.js').catch(()=>({}));
const {createGame,getGameView,startAction,finishAction,advanceTime,interruptAction,exportGame,importGame,applyCommand,replaySession}=host;
const act=(game,id)=>finishAction(startAction(game,id));

test('courier host exposes a playable owned-parcel route',()=>{
  assert.equal(typeof createGame,'function','The courier host must exist');
  const game=createGame(),view=getGameView(game);
  assert.equal(game.location,'depot');assert.equal(view.parcels.length,6);assert.equal(view.places.length,7);
  assert.equal(view.bagCapacity,3);assert.equal(view.remainingMinutes,240);
  assert.ok(view.routes.length>=9);assert.equal(view.worker.id,'courier');
});

test('bag capacity, unload and destination constrain parcel ownership',()=>{
  let g=createGame();
  for(const id of ['medicine','fabric','tea'])g=act(g,`load-${id}`);
  assert.throws(()=>startAction(g,'load-seeds'),/available/);
  assert.throws(()=>startAction(g,'deliver-medicine'),/available/);
  g=act(g,'unload-tea');g=act(g,'load-papers');
  g=act(g,'travel-depot-market');g=act(g,'deliver-fabric');
  assert.equal(g.parcels.fabric.owner,'market');assert.equal(g.parcels.fabric.deliveredAt,g.clock);
  assert.throws(()=>startAction(g,'deliver-fabric'),/available/);
  assert.throws(()=>startAction(g,'load-tea'),/available/);
});

test('a direct reliable medicine route meets its due time while a quay-first detour misses it',()=>{
  let base=createGame();for(const id of ['medicine','fabric','tea'])base=act(base,`load-${id}`);
  base=act(act(base,'travel-depot-market'),'deliver-fabric');
  const direct=act(act(base,'travel-ridge-road'),'deliver-medicine');
  let detour=act(act(base,'travel-market-quay'),'deliver-tea');
  detour=act(act(act(detour,'travel-market-quay'),'travel-ridge-road'),'deliver-medicine');
  const due=getGameView(base).parcels.find(p=>p.id==='medicine').due;
  assert.ok(direct.parcels.medicine.deliveredAt<=due);
  assert.ok(detour.parcels.medicine.deliveredAt>due);
});

test('inspections cost elapsed time, resolve only on completion and never expose hidden state early',()=>{
  let g=act(createGame(),'travel-depot-market');
  const view=getGameView(g),serialized=JSON.stringify(view);
  assert.equal(view.crossings.footbridge.report,null);
  for(const field of ['seed','conditions','trials'])assert.equal(Object.hasOwn(view,field),false);
  assert.equal(serialized.includes('draw'),false);
  g=startAction(g,'inspect-footbridge');g=advanceTime(g,2);
  assert.equal(getGameView(g).crossings.footbridge.report,null);
  const stopped=interruptAction(g);assert.equal(stopped.clock,12);
  assert.equal(stopped.crossings.footbridge.report,null);
  g=act(stopped,'inspect-footbridge');
  assert.equal(g.clock,17);assert.ok(getGameView(g).crossings.footbridge.report);
  assert.throws(()=>startAction(g,'inspect-footbridge'),/available/);
});

test('pending resume is byte-identical and effects cannot be applied twice',()=>{
  let g=advanceTime(startAction(createGame({seed:51}),'load-medicine'),1);
  assert.equal(g.parcels.medicine.owner,'depot');
  const resumed=importGame(JSON.parse(JSON.stringify(exportGame(g))));
  assert.deepEqual(finishAction(resumed),finishAction(g));
  assert.throws(()=>finishAction(finishAction(g)),/pending/);
  g=act(finishAction(g),'travel-depot-market');g=advanceTime(startAction(g,'travel-footbridge'),3);
  assert.deepEqual(finishAction(importGame(exportGame(g))),finishAction(g));
});

test('unrelated actions and zero-time interruption cannot consume a crossing trial',()=>{
  let g=act(createGame({seed:9}),'travel-depot-market');
  const before=structuredClone(g.crossings);
  for(let i=0;i<10;i++)g=interruptAction(startAction(g,'travel-footbridge'));
  assert.deepEqual(g.crossings,before);
  g=act(g,'rest');g=act(g,'inspect-footbridge');
  assert.equal(g.crossings.footbridge.trials,0);assert.equal(g.crossings.lockbridge.trials,0);
  g=act(g,'travel-footbridge');assert.equal(g.crossings.footbridge.trials,1);
  assert.equal(g.crossings.lockbridge.trials,0);
});

test('zero-time interruption repeats the exact next paid crossing outcome',()=>{
  for(let seed=1;seed<=30;seed++){
    const g=act(createGame({seed}),'travel-depot-market');let stopped=g;
    for(let i=0;i<5;i++)stopped=interruptAction(startAction(stopped,'travel-footbridge'));
    const direct=act(g,'travel-footbridge'),resumed=act(stopped,'travel-footbridge');
    assert.equal(resumed.lastEvent.status,direct.lastEvent.status);assert.equal(resumed.location,direct.location);
    assert.deepEqual(resumed.person.body,direct.person.body);assert.deepEqual(resumed.person.skills,direct.person.skills);
  }
});

test('shared practice is task-specific and interrupted paid effort is retained',()=>{
  let g=act(createGame(),'travel-depot-market'),skill=g.person.skills.routecraft;
  g=act(g,'rest');g=act(g,'inspect-footbridge');assert.equal(g.person.skills.routecraft,skill);
  g=advanceTime(startAction(g,'travel-footbridge'),5);
  assert.ok(g.person.skills.routecraft>skill);
  const practiced=g.person.skills.routecraft;g=interruptAction(g);
  assert.equal(g.person.skills.routecraft,practiced);assert.equal(g.location,'market');
});

test('deadline keeps delivered parcels and interrupts unfinished host effects',()=>{
  let g=act(act(act(createGame(),'load-fabric'),'travel-depot-market'),'deliver-fabric');
  while(g.status==='playing')g=act(g,'rest');
  assert.equal(g.clock,240);assert.equal(g.status,'expired');assert.equal(getGameView(g).summary.delivered,1);
  assert.equal(g.parcels.fabric.owner,'market');assert.equal(g.pending,null);
  assert.throws(()=>startAction(g,'rest'),/finished/);
});

test('deadline midway through loading gives no parcel to the bag',()=>{
  let g=createGame();for(let i=0;i<15;i++)g=act(g,'rest');
  g=interruptAction(advanceTime(startAction(g,'rest'),14));assert.equal(g.clock,239);
  g=act(g,'load-medicine');assert.equal(g.status,'expired');assert.equal(g.clock,240);
  assert.equal(g.parcels.medicine.owner,'depot');assert.equal(g.lastEvent.status,'interrupted');
});

test('ending early retains delivered and late counts without waiting or granting unfinished effects',()=>{
  let g=act(act(act(act(createGame(),'load-fabric'),'load-tea'),'travel-depot-market'),'deliver-fabric');
  for(let i=0;i<6;i++)g=act(g,'rest');g=act(act(g,'travel-market-quay'),'deliver-tea');
  const view=getGameView(g);g=host.endRound(g);
  assert.equal(g.status,'ended');assert.equal(g.clock,118);assert.deepEqual(getGameView(g).summary,view.summary);
  assert.equal(view.summary.onTime,1);assert.equal(view.summary.late,1);
  assert.equal(g.pending,null);assert.deepEqual(getGameView(g).actions,[]);
  assert.deepEqual(host.endRound(g),g);assert.deepEqual(importGame(exportGame(g)),g);
  assert.throws(()=>startAction(g,'rest'),/finished/);
  let pending=advanceTime(startAction(createGame(),'load-medicine'),1);
  pending=host.endRound(pending);assert.equal(pending.status,'ended');assert.equal(pending.clock,1);
  assert.equal(pending.parcels.medicine.owner,'depot');assert.equal(pending.pending,null);
  assert.deepEqual(importGame(exportGame(pending)),pending);
});

test('ending a partial crossing retains only paid practice and replays exactly',()=>{
  const commands=[{type:'start',actionId:'travel-depot-market'},{type:'finish'},{type:'start',actionId:'travel-footbridge'},{type:'advance',minutes:4},{type:'end'}];
  const g=commands.reduce(applyCommand,createGame({seed:37}));
  assert.equal(g.status,'ended');assert.equal(g.clock,14);assert.equal(g.location,'market');
  assert.ok(g.person.skills.routecraft>0.36);assert.equal(g.crossings.footbridge.trials,0);
  assert.deepEqual(replaySession({version:host.HOST_VERSION,seed:37,commands}),g);
  assert.deepEqual(importGame(exportGame(g)),g);
  assert.throws(()=>applyCommand(createGame(),{type:'end',score:99}),/Malformed/);
});

test('a blocked journey costs idle time and grants no movement, recovery or practice',()=>{
  let g=createGame();
  while(getGameView(g).actions.find(a=>a.id==='travel-depot-market').capacity.allowed){
    g=act(g,'travel-depot-market');g=act(g,'travel-depot-market');
  }
  const before=structuredClone(g);g=act(g,'travel-depot-market');
  assert.equal(g.clock,before.clock+2);assert.equal(g.location,before.location);
  assert.equal(g.lastEvent.status,'blocked');assert.ok(g.person.body.fatigue>=before.person.body.fatigue);
  assert.match(g.lastEvent.message,/fatigue/i);
  assert.equal(g.person.skills.routecraft,before.person.skills.routecraft);
});

test('blocked feedback names hunger from the public capacity assessment',()=>{
  const g=createGame();
  // Offline capacity fixture: the production round still uses its normal body.
  g.person=createPerson({id:'courier',body:{fatigue:0.12,hunger:0.99},skills:{routecraft:0.36}});
  const pending=startAction(g,'travel-depot-market');assert.match(pending.lastEvent.message,/hunger/i);
  const ended=host.endRound(pending);assert.equal(ended.clock,2);assert.equal(ended.status,'ended');
  assert.match(ended.lastEvent.message,/hunger/i);assert.equal(ended.location,'depot');
});

test('ending a blocked last-minute request preserves deadline status and the assessed cause',()=>{
  let g=createGame();g.person=createPerson({id:'courier',body:{fatigue:0.12,hunger:0.99},skills:{routecraft:0.36}});
  for(let i=0;i<15;i++)g=act(g,'rest');g=interruptAction(advanceTime(startAction(g,'rest'),14));
  const ended=host.endRound(startAction(g,'travel-depot-market'));
  assert.equal(ended.status,'expired');assert.equal(ended.clock,240);assert.match(ended.lastEvent.message,/hunger/i);
  assert.equal(ended.lastEvent.minutes,1);assert.equal(ended.location,'depot');assert.deepEqual(importGame(exportGame(ended)),ended);
});

test('meals are owned, completed once, and interrupted meals give no relief',()=>{
  let g=createGame();const initial=g.person.body.hunger;
  g=interruptAction(advanceTime(startAction(g,'eat'),3));
  assert.equal(g.meals,2);assert.ok(g.person.body.hunger>=initial);
  g=act(g,'eat');assert.equal(g.meals,1);assert.ok(g.person.body.hunger<initial);
  g=act(g,'eat');assert.equal(g.meals,0);assert.throws(()=>startAction(g,'eat'),/available/);
});

test('separate command replay reproduces an interrupted active save',()=>{
  const commands=[{type:'start',actionId:'load-medicine'},{type:'advance',minutes:1},{type:'interrupt'},{type:'start',actionId:'load-fabric'},{type:'finish'},{type:'start',actionId:'travel-depot-market'},{type:'advance',minutes:3}];
  const g=commands.reduce(applyCommand,createGame({seed:37}));
  assert.deepEqual(replaySession({version:host.HOST_VERSION,seed:37,commands}),g);
  assert.ok(JSON.stringify(exportGame(g)).length<12000);assert.equal(Object.hasOwn(g,'commands'),false);
});

test('malformed saves reject overfilled bag, hidden condition changes, clocks and forged pending effects',()=>{
  const clean=exportGame(createGame());
  const mutations=[s=>s.clock++,s=>s.meals=99,s=>s.crossings.footbridge.condition='invented',s=>s.crossings.footbridge.trials=-1,s=>s.extra=[],s=>Object.values(s.parcels).forEach(p=>p.owner='bag'),s=>s.status='complete',s=>s.meals=0,s=>s.person.person.skills.routecraft=0.2];
  for(const mutate of mutations){const save=structuredClone(clean);mutate(save);assert.throws(()=>importGame(save));}
  const save=exportGame(startAction(createGame(),'load-fabric'));save.pending.actionId='load-medicine';
  assert.throws(()=>importGame(save));
  const ended=exportGame(host.endRound(createGame()));ended.clock=240;ended.person.person.minutes=240;
  assert.throws(()=>importGame(ended),/terminal/);
  const pending=exportGame(startAction(createGame(),'load-medicine'));pending.status='ended';
  assert.throws(()=>importGame(pending),/pending|event/);
});
