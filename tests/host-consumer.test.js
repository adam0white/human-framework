import test from 'node:test';
import assert from 'node:assert/strict';
import * as host from '../src/games/workshop.js';
import {createPerson,beginAttempt,advanceAttempt,estimateSuccess} from '../src/human/index.js';

const act=(game,id)=>host.finishAction(host.startAction(game,id));
const pumpRoom=seed=>act(act(host.createGame({seed}),'take-wrench'),'go-pump');
const inspect=game=>act(game,'inspect-pump');
const patchEstimate=game=>host.getGameView(game).actions.find(action=>action.id==='patch').estimatedSuccess;

test('inspection is a paid local observation, with no early condition leak or free practice',()=>{
  const storage=host.createGame({seed:1});
  assert.throws(()=>host.startAction(storage,'inspect-pump'),/available|prerequisite/i);
  const before=pumpRoom(1);
  assert.ok(host.getActions(before).some(action=>action.id==='inspect-pump'));
  assert.equal(host.getGameView(before).objects.pump.inspection,null);
  assert.equal(Object.hasOwn(host.getGameView(before).objects.pump,'condition'),false);
  const started=host.startAction(before,'inspect-pump');
  const partial=host.advanceTime(started,4);
  assert.equal(host.getGameView(partial).objects.pump.inspection,null);
  const interrupted=host.interruptAction(partial,'Inspection interrupted');
  assert.equal(interrupted.clock,before.clock+4);
  assert.equal(interrupted.objects.pump.inspection,null);
  assert.deepEqual(interrupted.person.skills,before.person.skills);
  const completed=inspect(interrupted);
  assert.equal(completed.clock,before.clock+14);
  assert.equal(completed.person.minutes,completed.clock);
  assert.deepEqual(completed.person.skills,before.person.skills);
  assert.ok(Math.abs(completed.person.body.fatigue-before.person.body.fatigue-0.021)<1e-10);
  assert.ok(Math.abs(completed.person.body.hunger-before.person.body.hunger-0.028)<1e-10);
  assert.equal(completed.objects.pump.status,'broken');
  assert.equal(completed.objects.pump.inspection.inspectedAt,completed.clock);
  assert.equal(completed.objects.pump.inspection.attemptId,`worker:${completed.person.nextAttempt-1}`);
  assert.equal(host.getGameView(completed).objects.pump.inspection.condition,completed.objects.pump.condition);
  assert.equal(Object.hasOwn(host.getGameView(completed).objects.pump,'condition'),false);
  assert.ok(!host.getActions(completed).some(action=>action.id==='inspect-pump'));
  assert.throws(()=>host.finishAction(completed),/pending/i);
});

test('different hidden conditions offer identical choices until a recorded inspection changes the estimate',()=>{
  const games=Array.from({length:30},(_,index)=>pumpRoom(index+1));
  const ordinary=games.find(game=>game.objects.pump.condition==='ordinary');
  const stubborn=games.find(game=>game.objects.pump.condition==='stubborn');
  assert.ok(ordinary&&stubborn);
  assert.deepEqual(host.getGameView(ordinary),host.getGameView(stubborn));
  const observedOrdinary=inspect(ordinary),observedStubborn=inspect(stubborn);
  assert.ok(patchEstimate(observedOrdinary)>patchEstimate(observedStubborn));
  const view=host.getGameView(observedOrdinary);
  view.objects.pump.inspection.condition='stubborn';
  assert.equal(observedOrdinary.objects.pump.inspection.condition,'ordinary');
  for(const policy of host.POLICIES) {
    const projected=host.getGameView(observedOrdinary);
    assert.equal(host.chooseAction(projected,policy),host.chooseAction(structuredClone(projected),policy));
  }
});

test('pending and completed inspection snapshots resume, and command replay reproduces the same observation',()=>{
  const commands=[{type:'start',actionId:'go-pump'},{type:'finish'},
    {type:'start',actionId:'inspect-pump'},{type:'advance',minutes:4}];
  let game=host.createGame({seed:42,policy:'greedy'});
  for(const command of commands)game=host.applyCommand(game,command);
  const resumed=host.importGame(JSON.parse(JSON.stringify(host.exportGame(game))));
  assert.deepEqual(host.finishAction(resumed),host.finishAction(game));
  commands.push({type:'finish'});game=host.finishAction(game);
  assert.deepEqual(host.importGame(host.exportGame(game)),game);
  assert.deepEqual(host.replaySession({version:host.HOST_VERSION,seed:42,policy:'greedy',commands}),game);
});

test('inspection saves reject malformed observations, premature timestamps and unconsumed attempt identities',()=>{
  const game=inspect(pumpRoom(3));
  const mutations=[
    save=>{delete save.objects.pump.inspection;},
    save=>{save.objects.pump.inspection.condition='unknown';},
    save=>{save.objects.pump.inspection.condition=save.objects.pump.condition==='ordinary'?'stubborn':'ordinary';},
    save=>{save.objects.pump.inspection.inspectedAt=save.clock+1;},
    save=>{save.objects.pump.inspection.inspectedAt=0;},
    save=>{save.objects.pump.inspection.attemptId=`worker:${save.person.person.nextAttempt}`;},
    save=>{save.objects.pump.inspection.attemptId='worker:1.5';},
    save=>{save.objects.pump.inspection.secret=true;},
    save=>{save.objects.pump.inspection=[];}
  ];
  for(const mutate of mutations) {
    const save=host.exportGame(game);mutate(save);
    assert.throws(()=>host.importGame(save),/pump|inspection/i);
  }
  const pending=host.exportGame(host.advanceTime(host.startAction(pumpRoom(3),'inspect-pump'),4));
  pending.objects.pump.inspection={condition:pending.objects.pump.condition,inspectedAt:pending.clock,attemptId:pending.pending.attemptId};
  assert.throws(()=>host.importGame(pending),/inspection|prerequisite/i);
  const later=host.exportGame(host.advanceTime(host.startAction(game,'rest'),4));
  later.objects.pump.inspection.inspectedAt=later.clock;
  assert.throws(()=>host.importGame(later),/inspection/i);
});

test('deadline interruption cannot complete an inspection or reveal its result',()=>{
  let game=host.createGame({seed:1});
  for(let i=0;i<15;i++)game=act(game,'rest');
  game=act(game,'go-pump');
  game=inspect(game);
  assert.equal(game.clock,240);
  assert.equal(game.status,'lost');
  assert.equal(game.objects.pump.inspection,null);
  assert.equal(game.lastEvent.status,'interrupted');
});

test('host saves reject missing workshop skills and impossible committed world effects',()=>{
  for(const mutate of [
    save=>{save.person.person.skills={};},
    save=>{save.person.person.skills.other=0.5;},
    save=>{save.person.person.id='someone-else';},
    save=>{save.status='won';save.objects.pump.status='running';save.objects.pump.route='patch';},
    save=>{save.objects.pump.status='repaired';save.objects.pump.route='patch';},
    save=>{save.objects.wrench.location='inventory';},
    save=>{save.objects.rations.count=1;}
  ]) {
    const save=host.exportGame(host.createGame({seed:1}));mutate(save);
    assert.throws(()=>host.importGame(save),/worker|skill|world|time|elapsed/i);
  }
  let won=act(pumpRoom(1),'patch');
  assert.equal(won.objects.pump.status,'repaired');
  won=act(won,'test-pump');
  assert.deepEqual(host.importGame(host.exportGame(won)),won);
  const wrongLocation=host.exportGame(won);wrongLocation.location='storage';
  assert.throws(()=>host.importGame(wrongLocation),/world|location/i);
  const tooSoon=host.exportGame(won);tooSoon.clock=50;tooSoon.person.person.minutes=50;
  assert.throws(()=>host.importGame(tooSoon),/time|elapsed/i);
});

function idleUntil(game,clock) {
  while(clock-game.clock>=15)game=act(game,'rest');
  if(clock>game.clock)game=host.interruptAction(host.advanceTime(host.startAction(game,'rest'),clock-game.clock));
  return game;
}

test('task-aware route follows a collected spare when replacement and verification fit remaining time',()=>{
  let game=idleUntil(act(host.createGame({seed:1}),'take-wrench'),158);
  assert.equal(host.chooseAction(host.getGameView(game)),'take-seal');
  game=act(game,'take-seal');
  assert.equal(host.chooseAction(host.getGameView(game)),'go-pump');
  game=act(game,'go-pump');
  assert.equal(game.deadline-game.clock,58);
  assert.equal(host.chooseAction(host.getGameView(game)),'replace');
  assert.equal(host.chooseAction(host.getGameView(game),'greedy'),'patch');
  game=host.interruptAction(host.advanceTime(host.startAction(game,'rest'),1));
  assert.equal(host.chooseAction(host.getGameView(game)),'patch');
});

test('task-aware route counts missing tools, storage detours and verification from visible state',()=>{
  const missingSeal=idleUntil(pumpRoom(2),140);
  assert.equal(host.chooseAction(host.getGameView(missingSeal)),'go-storage');
  let game=act(host.createGame({seed:2}),'go-pump');
  game=idleUntil(game,140);
  assert.equal(host.chooseAction(host.getGameView(game)),'go-storage');
  game=act(game,'go-storage');
  assert.equal(host.chooseAction(host.getGameView(game)),'take-wrench');
  game=act(game,'take-wrench');
  assert.equal(host.chooseAction(host.getGameView(game)),'take-seal');
  let tooLate=idleUntil(act(host.createGame({seed:2}),'take-wrench'),159);
  assert.equal(host.chooseAction(host.getGameView(tooLate)),'go-pump');
  tooLate=act(tooLate,'go-pump');
  assert.equal(host.chooseAction(host.getGameView(tooLate)),'patch');
});

test('observed repair forecasts include interval practice through the same public human lifecycle',()=>{
  const game=inspect(pumpRoom(2)),before=host.exportGame(game),view=host.getGameView(game);
  const action=view.actions.find(action=>action.id==='patch');
  const observed=createPerson({id:view.worker.id,body:view.worker.body,skills:view.worker.skills});
  const predicted=advanceAttempt(beginAttempt(observed,{actionId:'patch',targetId:'pump',durationMinutes:35,effort:0.19,exertive:true,activity:'active',skill:'repair'}),35);
  const expected=estimateSuccess({skill:predicted.skills.repair,body:predicted.body,difficulty:0.4});
  assert.ok(Math.abs(action.estimatedSuccess-expected)<1e-10);
  const sameView=host.exportGame(game);sameView.person.person.body.fatigue+=0.001;
  assert.deepEqual(host.getGameView(host.importGame(sameView)),view);
  const blocked=host.exportGame(game);blocked.person.person.body.fatigue=0.99;
  const work=host.getActions(host.importGame(blocked)).find(action=>action.id==='patch');
  assert.equal(work.capacity.allowed,false);
  assert.equal(work.estimatedSuccess,0);
  assert.deepEqual(host.exportGame(game),before);
});

test('fractional advances leave near-complete actions pending until their remaining time is paid',()=>{
  for(const gap of [5e-10,5e-11]) {
    const before=host.createGame({seed:1});
    const partial=host.advanceTime(host.startAction(before,'take-wrench'),6-gap);
    assert.equal(partial.clock,6-gap);
    assert.equal(partial.pending.actionId,'take-wrench');
    assert.equal(partial.objects.wrench.location,'storage');
    const restored=host.importGame(host.exportGame(partial));
    const finished=host.finishAction(restored);
    assert.equal(finished.clock,6);
    assert.equal(finished.person.minutes,6);
    assert.equal(finished.objects.wrench.location,'inventory');
    assert.equal(finished.pending,null);
  }
});

test('near-deadline fractions neither settle early nor complete an unfinished inspection at departure',()=>{
  const before=idleUntil(host.createGame({seed:1}),225);
  let rest=host.advanceTime(host.startAction(before,'rest'),15-5e-11);
  assert.equal(rest.status,'playing');
  assert.equal(rest.pending?.actionId,'rest');
  assert.ok(rest.clock<240);
  rest=host.finishAction(host.importGame(host.exportGame(rest)));
  assert.equal(rest.clock,240);
  assert.equal(rest.person.minutes,240);
  assert.equal(rest.status,'lost');
  assert.equal(rest.lastEvent.status,'completed');

  let inspection=act(before,'go-pump');
  inspection=host.advanceTime(host.startAction(inspection,'inspect-pump'),3-5e-10);
  assert.equal(inspection.status,'playing');
  assert.equal(inspection.pending.actionId,'inspect-pump');
  assert.ok(inspection.clock<240);
  inspection=host.finishAction(host.importGame(host.exportGame(inspection)));
  assert.equal(inspection.clock,240);
  assert.equal(inspection.person.minutes,240);
  assert.equal(inspection.status,'lost');
  assert.equal(inspection.lastEvent.status,'interrupted');
  assert.equal(inspection.objects.pump.inspection,null);
});

test('a verification ending fractionally after departure cannot award a late victory',()=>{
  let lateRun=idleUntil(act(pumpRoom(1),'patch'),232+5e-11);
  lateRun=act(lateRun,'test-pump');
  assert.equal(lateRun.clock,240);
  assert.equal(lateRun.status,'lost');
  assert.equal(lateRun.objects.pump.status,'repaired');
  assert.equal(lateRun.lastEvent.status,'interrupted');
});
