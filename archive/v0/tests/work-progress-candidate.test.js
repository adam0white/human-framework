import test from 'node:test';
import assert from 'node:assert/strict';
import * as work from '../src/experiments/work-progress/candidate.js';
import * as camp from '../src/experiments/work-progress/camp-candidate.js';
import {practice} from '../src/core/model.js';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
function item(){return work.prepareWorker(work.createWork({id:'beam',effort:.2,minimumDuration:6}),{workerId:'A',basisMinutes:20});}
function pay(state,workerId='A',durationReduction=0){return work.advanceWork(state,{workerId,durationReduction}).work;}

test('prospective progress retains paid fractions and the first worker basis',()=>{
  const original=item(),before=JSON.stringify(original);let state=pay(original);
  close(state.progress,.05);assert.equal(state.workers.A.minutes,1);close(state.workers.A.effort,.01);
  state=work.prepareWorker(state,{workerId:'A',basisMinutes:16});assert.equal(state.workers.A.basisMinutes,20);
  const quote=work.quoteWork(state,{workerId:'A',durationReduction:6});close(quote.fraction,1/14);assert.equal(quote.remainingMinutes,14);
  for(let n=0;n<14;n++)state=pay(state,'A',6);
  assert.equal(state.status,'complete');assert.equal(state.progress,1);assert.equal(state.workers.A.minutes,15);close(state.workers.A.effort,.2);
  assert.equal(JSON.stringify(original),before);assert(Object.isFrozen(state.workers.A));
});

test('replacement workers receive only their future work and settlement is single-use',()=>{
  let state=pay(item());state=work.prepareWorker(state,{workerId:'B',basisMinutes:18});
  for(let n=0;n<18;n++)state=pay(state,'B');
  close(state.workers.A.fraction,.05);assert.equal(state.workers.A.minutes,1);
  close(state.workers.B.fraction,.95);assert.equal(state.workers.B.minutes,18);
  const settled=work.settleWork(state);assert.deepEqual(settled.completion,{id:'beam'});
  assert.equal(settled.work.status,'settled');assert.equal(work.settleWork(settled.work).completion,null);
  assert.throws(()=>pay(settled.work));assert.throws(()=>work.settleWork(item()));
});

test('component save rejects unpaid credit, shape tricks and invalid productivity',()=>{
  const state=pay(item()),snapshot=work.exportWork(state);
  assert.deepEqual(work.restoreWork(JSON.parse(JSON.stringify(snapshot))),state);
  for(const change of [s=>s.work.progress=.9,s=>s.work.workers.A.minutes=0,s=>s.work.workers.A.effort=.15,s=>s.work.status='settled']){
    const bad=structuredClone(snapshot);change(bad);assert.throws(()=>work.restoreWork(bad));
  }
  let invoked=0;const bad=structuredClone(snapshot);Object.defineProperty(bad.work,'progress',{enumerable:true,get(){invoked++;return .05;}});
  assert.throws(()=>work.restoreWork(bad));assert.equal(invoked,0);
  assert.throws(()=>work.quoteWork(state,{workerId:'B'}));assert.throws(()=>work.quoteWork(state,{workerId:'A',durationReduction:-1}));
  assert.throws(()=>work.createWork({id:'x',effort:Infinity,minimumDuration:6}));
  assert.equal(state.workers.A.minutes,1);
});

test('open work cannot claim an extra paid minute without its minimum physical fraction',()=>{
  for(const state of [item(),pay(item())]){
    const snapshot=work.exportWork(state);snapshot.work.workers.A.minutes++;
    assert.throws(()=>work.restoreWork(snapshot));
  }
  let complete=work.prepareWorker(item(),{workerId:'B',basisMinutes:18});for(let n=0;n<20;n++)complete=pay(complete);
  const snapshot=work.exportWork(complete);snapshot.work.workers.B.minutes=1;
  assert.throws(()=>work.restoreWork(snapshot),'completion cannot attach zero-fraction credit to a nonparticipant');
});

test('component worker/state limits remain bounded without a transition journal',()=>{
  let state=work.createWork({id:'beam',effort:.2,minimumDuration:6});
  for(let n=0;n<16;n++){const workerId=`worker${n}`.padEnd(80,'x');state=work.prepareWorker(state,{workerId,basisMinutes:1440});state=pay(state,workerId);}
  assert.throws(()=>work.prepareWorker(state,{workerId:'extra',basisMinutes:20}));
  const bytes=JSON.stringify([state,state]).length;assert(bytes<8192,`${bytes} exceeds two-item state budget`);
  assert.equal(Object.keys(state.workers).length,16);
});

const start=(actor,item='work-1')=>({type:'start',actor,item});
const transfer=(from,to)=>({type:'handover',from,to,item:'work-1'});
const histories=[
  {id:'H1',setup:{},commands:[[0,start('A')]],at:[20],construction:[20,0]},
  {id:'H2',setup:{toolArrival:1},commands:[[0,start('A')]],at:[15],construction:[15,0]},
  {id:'H3',setup:{},commands:[[0,start('A')],[7,{type:'stop',actor:'A'}],[10,start('A')]],at:[23],construction:[20,0]},
  {id:'H4',setup:{toolArrival:1},commands:[[0,start('A')],[1,{type:'stop',actor:'A'}],[1,start('A')]],at:[15],construction:[15,0]},
  {id:'H5',setup:{},commands:[[0,start('A')],[1,transfer('A','B')]],at:[19],construction:[1,18]},
  {id:'H6',setup:{},commands:[[0,start('B')],[1,transfer('B','A')]],at:[20],construction:[19,1]},
  {id:'H7',setup:{busyB:true},commands:[[0,start('A')],[1,transfer('A','B')]],at:[20],construction:[20,0]},
  {id:'H8',setup:{items:2},commands:[[0,start('A')],[2,start('B','work-2')]],at:[20,20],construction:[20,18]}
];
function run(history,driver='chunk'){
  let world=camp.createWorld(history.setup),step=0,restored=false;
  const advance=target=>{while(camp.observe(world).now<target){const now=camp.observe(world).now;
    const stop=driver==='minute'?now+1:driver==='event'?(camp.nextEvent(world)??target):now+[3,1,7,2,5][step++%5];
    world=camp.advanceTo(world,Math.min(target,stop,now<1?1:Infinity));
    if(!restored&&camp.observe(world).now===1){world=camp.restoreWorld(JSON.parse(JSON.stringify(camp.exportWorld(world))));restored=true;}}};
  for(const [at,command] of history.commands){advance(at);world=camp.command(world,command);}
  advance(40);return world;
}
for(const history of histories)test(`${history.id} retains paid body, owned material and prescribed completion`,()=>{
  const world=run(history),view=camp.observe(world);assert.equal(view.now,40);assert.equal(view.outputs,history.at.length);
  assert.deepEqual(view.items.map(item=>item.completedAt),history.at);
  assert.deepEqual([view.actors.A.paid.construction,view.actors.B.paid.construction],history.construction);
  assert.equal(view.spent.timber,5*history.at.length);assert.equal(view.spent.salvage,history.at.length);
  assert.deepEqual(view.stock,{timber:0,salvage:0,toolBlank:0});
  for(const item of view.items){assert(item.settled);assert.deepEqual(item.reserved,{timber:0,salvage:0});}
  for(const actor of Object.values(view.actors)){assert.equal(actor.person.person.minutes,40);assert.equal(actor.person.person.nextAttempt,41);assert.equal(actor.paid.work+actor.paid.recovery,40);close(actor.person.person.body.hunger,.28);}
  close(view.actors.A.paid.effort+view.actors.B.paid.effort,.2*history.at.length+(history.setup.busyB?.04:0));
  assert.equal(view.actors.B.paid.hauling,history.setup.busyB?4:0);assert.equal(view.actors.C.paid.crafting,history.setup.toolArrival?1:0);
  assert.equal(view.toolAvailable,Boolean(history.setup.toolArrival));assert.equal(view.spent.toolBlank,history.setup.toolArrival?1:0);
  if(history.id==='H7'){assert.equal(view.lastResponse.accepted,false);assert.equal(view.lastResponse.reason,'recipient-busy');}
  assert.deepEqual(camp.observe(camp.advanceTo(world,40)),view,'repeated completion processing cannot produce twice');
});

test('active saves and event/minute drivers preserve exact authoritative world',()=>{
  const history=histories[1],minute=run(history,'minute'),event=run(history,'event'),chunk=run(history);
  assert.deepEqual(camp.exportWorld(minute),camp.exportWorld(event));assert.deepEqual(camp.exportWorld(minute),camp.exportWorld(chunk));
  let active=camp.command(camp.createWorld({toolArrival:1}),start('A'));active=camp.advanceTo(active,1);
  const before=JSON.stringify(active);assert.equal(camp.nextEvent(active),15);assert.equal(JSON.stringify(active),before);
  const restored=camp.restoreWorld(JSON.parse(JSON.stringify(camp.exportWorld(active))));
  assert.deepEqual(camp.exportWorld(camp.advanceTo(restored,40)),camp.exportWorld(minute));
  assert(Object.isFrozen(active.actors.A.person.body));
});

test('host preserves partial installed work on stop and pays actual recovery',()=>{
  let world=camp.command(camp.createWorld(),start('A'));world=camp.advanceTo(world,7);
  const paid=camp.observe(world),basis=paid.items[0].contributions.A.basis;
  world=camp.command(world,{type:'stop',actor:'A'});world=camp.advanceTo(world,10);
  const rested=camp.observe(world);close(rested.items[0].progress,.35);assert.deepEqual(rested.items[0].reserved,{timber:5,salvage:1});
  assert.equal(rested.actors.A.paid.construction,7);assert.equal(rested.actors.A.paid.recovery,3);
  close(paid.actors.A.person.person.body.fatigue-rested.actors.A.person.person.body.fatigue,.0705);
  world=camp.command(world,start('A'));assert.equal(camp.observe(world).items[0].contributions.A.basis,basis);
});

test('busy-worker refusal and unilateral hauling stop preserve past duty payment',()=>{
  let world=camp.command(camp.createWorld({busyB:true}),start('A'));world=camp.advanceTo(world,1);
  world=camp.command(world,transfer('A','B'));assert.equal(camp.observe(world).lastResponse.reason,'recipient-busy');
  const response=camp.observe(world).lastResponse;world=camp.command(world,{type:'stop',actor:'B'});
  assert.deepEqual(camp.observe(world).lastResponse,response);world=camp.command(world,transfer('A','B'));assert.equal(camp.observe(world).lastResponse.reason,'accepted');
  world=camp.advanceTo(world,40);const view=camp.observe(world);assert.equal(view.actors.B.paid.hauling,1);assert.equal(view.actors.B.paid.construction,18);
});

test('host rejects tampered ownership, practice and duplicate assignment without mutating input',()=>{
  const world=camp.advanceTo(camp.command(camp.createWorld(),start('A')),1),before=JSON.stringify(world);
  assert.throws(()=>camp.command(world,start('B')));assert.throws(()=>camp.command(world,{type:'stop',actor:'B'}));assert.throws(()=>camp.advanceTo(world,0));
  const snapshot=camp.exportWorld(world);
  for(const change of [s=>s.world.stock.timber=5,s=>s.world.outputs=1,s=>s.world.actors.A.paid.construction=0,s=>s.world.assignments.B='work-1',s=>s.world.items[0].work.workers.A.minutes=0]){
    const bad=structuredClone(snapshot);change(bad);assert.throws(()=>camp.restoreWorld(bad));
  }
  const view=camp.observe(world);view.items[0].progress=.9;view.actors.A.person.person.body.fatigue=0;
  assert.equal(JSON.stringify(world),before);
});

test('whole-action capacity rejects an unfit start or recipient without installing or moving work',()=>{
  // Synthetic current-body snapshots exercise guards unreachable in these comfortable histories.
  const unfit=camp.exportWorld(camp.createWorld());unfit.world.actors.A.person.body.fatigue=.99;
  const world=camp.restoreWorld(unfit),before=JSON.stringify(world);
  assert.throws(()=>camp.command(world,start('A')),/remaining-work capacity/);assert.equal(JSON.stringify(world),before);
  let active=camp.advanceTo(camp.command(camp.createWorld(),start('A')),1);
  const snapshot=camp.exportWorld(active);snapshot.world.actors.B.person.body.fatigue=.99;active=camp.restoreWorld(snapshot);
  const prior=camp.observe(active),refused=camp.observe(camp.command(active,transfer('A','B')));
  assert.equal(refused.lastResponse.reason,'recipient-capacity');assert.equal(refused.lastResponse.accepted,false);
  assert.deepEqual(refused.items,prior.items);assert.deepEqual(refused.actors,prior.actors);assert.deepEqual(refused.assignments,prior.assignments);
});

test('actual one-minute capacity failure discards earlier actors provisional payment and tool effects',()=>{
  const snapshot=camp.exportWorld(camp.command(camp.createWorld({toolArrival:1}),start('A')));
  snapshot.world.actors.C.person.body.fatigue=.99;
  const world=camp.restoreWorld(snapshot),before=JSON.stringify(world);
  assert.throws(()=>camp.advanceTo(world,1),/actual paid minute/);assert.equal(JSON.stringify(world),before);
  assert.equal(camp.observe(world).toolAvailable,false);assert.equal(camp.observe(world).stock.toolBlank,1);
});

test('next event includes paid supplier and hauling completion and becomes null after their end',()=>{
  let world=camp.createWorld({toolArrival:1,busyB:true});const before=JSON.stringify(world);
  assert.equal(camp.nextEvent(world),1);assert.equal(JSON.stringify(world),before);
  world=camp.advanceTo(world,1);assert.equal(camp.nextEvent(world),4);
  world=camp.advanceTo(world,4);assert.equal(camp.nextEvent(world),null);
});

test('host bounds each advance and rejects new work past the numeric endpoint',()=>{
  const initial=camp.createWorld();let extended;
  assert.doesNotThrow(()=>{extended=camp.advanceTo(initial,1440);});
  assert.throws(()=>camp.advanceTo(initial,1441));assert.equal(camp.observe(extended).now,1440);
  assert.equal(camp.observe(extended).actors.A.person.person.body.hunger,1);
  // A synthetic authoritative current snapshot tests the numeric endpoint,
  // without simulating or claiming a million-minute earned history.
  const snapshot=camp.exportWorld(initial),at=999999;snapshot.world.now=at;
  for(const actor of Object.values(snapshot.world.actors)){
    actor.person.minutes=at;actor.person.nextAttempt=at+1;
    actor.person.body={fatigue:0,hunger:1};actor.paid.recovery=at;
  }
  const nearEnd=camp.restoreWorld(snapshot),before=JSON.stringify(nearEnd);
  assert.throws(()=>camp.command(nearEnd,start('A')),/world time/);
  assert.equal(JSON.stringify(nearEnd),before);
  const ended=camp.advanceTo(nearEnd,1000000);assert.equal(camp.observe(ended).now,1000000);
  assert.equal(camp.nextEvent(ended),null);assert.throws(()=>camp.advanceTo(ended,1000001));
});

test('review regression: completed work has only one possible terminal fractional minute',()=>{
  for(const rows of [
    [['A',1,1,.5],['B',1,1,.5]],
    [['A',2,1,.25],['B',2,1,.25],['C',10,1,.5]]
  ]){
    let state=work.createWork({id:'piece',effort:.2,minimumDuration:1});
    for(const [workerId,basisMinutes] of rows)state=work.prepareWorker(state,{workerId,basisMinutes});
    const snapshot=work.exportWork(state);snapshot.work.progress=1;snapshot.work.status='complete';
    for(const [id,,minutes,fraction] of rows)Object.assign(snapshot.work.workers[id],{minutes,fraction,effort:.2*fraction});
    assert.throws(()=>work.restoreWork(snapshot));
  }
});

test('review regression: a terminal minute must add strictly positive physical work',()=>{
  let state=work.prepareWorker(work.createWork({id:'piece',effort:.2,minimumDuration:1}),{workerId:'A',basisMinutes:1});
  state=pay(state);const snapshot=work.exportWork(state);snapshot.work.workers.A.minutes=2;
  assert.throws(()=>work.restoreWork(snapshot));
  let multi=work.createWork({id:'piece',effort:.2,minimumDuration:1});
  for(const [workerId,basisMinutes] of [['A',2],['B',5],['C',10]])multi=work.prepareWorker(multi,{workerId,basisMinutes});
  const forged=work.exportWork(multi);forged.work.progress=1;forged.work.status='complete';
  for(const [id,minutes,fraction] of [['A',2,.5],['B',2,.4],['C',1,.1]])Object.assign(forged.work.workers[id],{minutes,fraction,effort:.2*fraction});
  assert.throws(()=>work.restoreWork(forged),'A cannot attach a zero-work second minute to its one full half-stage');
});

test('review regression: invented final exposure cannot grant host construction practice',()=>{
  const original=camp.advanceTo(camp.command(camp.createWorld(),start('A')),21),snapshot=camp.exportWorld(original),world=snapshot.world;
  world.items[0].work.workers.A.minutes=21;world.items[0].completedAt=21;
  Object.assign(world.actors.A.paid,{work:21,recovery:0,construction:21});world.actors.A.person.skills.construction=practice(.1,21);
  assert.throws(()=>camp.restoreWorld(snapshot));assert.equal(camp.observe(original).actors.A.paid.construction,20);
});

test('review regression: host progress cannot use unavailable or retroactive tool productivity',()=>{
  for(const [setup,at,fraction] of [[{},1,1/6],[{toolArrival:1},1,1/14],[{toolArrival:1},2,2/14]]){
    const original=camp.advanceTo(camp.command(camp.createWorld(setup),start('A')),at),snapshot=camp.exportWorld(original),world=snapshot.world;
    world.items[0].work.progress=fraction;world.items[0].work.workers.A.fraction=fraction;
    world.items[0].work.workers.A.effort=.2*fraction;world.actors.A.paid.effort=.2*fraction;
    assert.throws(()=>camp.restoreWorld(snapshot));
  }
});

test('review regression: completion time must accommodate sequential paid item minutes',()=>{
  const original=camp.advanceTo(camp.command(camp.createWorld(),start('A')),20),snapshot=camp.exportWorld(original);
  snapshot.world.items[0].completedAt=1;assert.throws(()=>camp.restoreWorld(snapshot));
});

test('corrected rate checks preserve late starts and a legitimate transferred final partial minute',()=>{
  let late=camp.advanceTo(camp.createWorld({toolArrival:1}),1);late=camp.command(late,start('A'));late=camp.advanceTo(late,15);
  assert.equal(camp.observe(late).items[0].completedAt,15);
  assert.deepEqual(camp.restoreWorld(JSON.parse(JSON.stringify(camp.exportWorld(late)))),late);
  let transferred=camp.command(camp.createWorld({toolArrival:1}),start('A'));transferred=camp.advanceTo(transferred,1);
  transferred=camp.command(transferred,transfer('A','B'));transferred=camp.advanceTo(transferred,13);
  const view=camp.observe(transferred);assert.equal(view.items[0].completedAt,13);
  assert.equal(view.items[0].contributions.A.minutes,1);assert.equal(view.items[0].contributions.B.minutes,12);
  close(view.items[0].contributions.B.fraction,.95);
  assert.deepEqual(camp.restoreWorld(JSON.parse(JSON.stringify(camp.exportWorld(transferred)))),transferred);
});

test('corrected component explicitly rejects the original work version without migration',()=>{
  const current=work.exportWork(item()),previous=structuredClone(current);previous.work.version='0.1.0';
  assert.throws(()=>work.restoreWork(previous),/version/);
  assert.deepEqual(work.restoreWork(current),item());
});
