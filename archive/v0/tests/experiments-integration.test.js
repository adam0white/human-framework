import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPERIMENT_KINDS,EXPERIMENT_VERSION,createExperiment,chooseExperiment,
  getExperimentView,exportExperiment,restoreExperiment
} from '../src/games/experiments/index.js';

const roundTrip=state=>restoreExperiment(JSON.parse(JSON.stringify(exportExperiment(state))));
const play=(state,actions)=>actions.reduce((current,action)=>chooseExperiment(current,action),state);
const complete={
  workshop:['prepare','assemble_hand'],
  doorstep:['ask_neighbor','return_object','carry_sibling','end_evening'],
  dispatch:['inspect_a','repair_a','inspect_b','repair_b']
};

test('each host and variation continues identically after a JSON save',()=>{
  assert.deepEqual(EXPERIMENT_KINDS,['workshop','doorstep','dispatch']);
  assert.equal(EXPERIMENT_VERSION,'0.1.0');
  for(const kind of EXPERIMENT_KINDS)for(const variant of [0,1,2]){
    const initial=createExperiment(kind,variant),steps=complete[kind],split=1;
    const uninterrupted=play(initial,steps);
    const continued=play(roundTrip(play(initial,steps.slice(0,split))),steps.slice(split));
    assert.deepEqual(getExperimentView(continued),getExperimentView(uninterrupted),`${kind} variant ${variant}`);
    assert.equal(getExperimentView(continued).finished,true,`${kind} variant ${variant} finished`);
    assert.deepEqual(roundTrip(continued),continued,`${kind} variant ${variant} final save`);
  }
});

test('save envelope rejects wrong kind, version, format, and mismatched host payload',()=>{
  const saved=exportExperiment(createExperiment('workshop',1));
  assert.equal(saved.kind,'workshop');
  assert.throws(()=>restoreExperiment({...saved,kind:'unknown'}),/experiment/i);
  assert.throws(()=>restoreExperiment({...saved,version:'9.0.0'}),/save|supported/i);
  assert.throws(()=>restoreExperiment({...saved,format:'other'}),/save|supported/i);
  assert.throws(()=>restoreExperiment({...saved,kind:'dispatch'}),/match|contents/i);
  assert.throws(()=>restoreExperiment({...saved,extra:true}),/save|supported/i);
  const doorstep=exportExperiment(createExperiment('doorstep',0));
  assert.throws(()=>restoreExperiment({...doorstep,kind:'workshop'}),/snapshot|kind|experiment/i);
});

test('terminal sessions reject more choices through the shared facade',()=>{
  for(const kind of EXPERIMENT_KINDS){
    const done=play(createExperiment(kind,1),complete[kind]);
    const view=getExperimentView(done);
    assert.equal(view.finished,true,kind);
    assert.ok(view.actions.every(action=>action.disabled),kind);
    assert.throws(()=>chooseExperiment(roundTrip(done),view.actions[0].id),/finished|ended|unavailable/i,kind);
  }
});

test('offered actions charge the shared actor exactly their shown minutes',()=>{
  const cases=[['workshop','prepare'],['doorstep','read_note'],['dispatch','inspect_a']];
  for(const [kind,actionId] of cases){
    const before=createExperiment(kind,0),offered=getExperimentView(before).actions.find(action=>action.id===actionId);
    assert.equal(offered.disabled,false,`${kind} action offered`);
    const after=chooseExperiment(before,actionId),view=getExperimentView(after);
    assert.equal(view.now,offered.minutes,`${kind} modeled time`);
    assert.equal(after.workspace.actor.person.lastAttempt.elapsedMinutes,offered.minutes,`${kind} paid attempt`);
    assert.equal(after.workspace.actor.habits.receipts.at(-1).elapsedMinutes,offered.minutes,`${kind} payment receipt`);
  }
});
