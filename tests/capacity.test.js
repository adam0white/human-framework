import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,step,exportReplay,replay,getView,rankActions,assessCapacity} from '../src/core/index.js';
import {fixture} from './fixtures.js';

function exhausted({food=1,fatigue=1,hunger=.2,actions=fixture.actions}={}) {
  return {...structuredClone(fixture),food,target:100,horizon:12,actions,
    actors:[{...structuredClone(fixture.actors[0]),body:{fatigue,hunger},commitment:{actionId:'work',weight:1,dueRound:1}}]};
}

test('manual and both policies cannot manufacture work, practice, support consumption or fulfilled work promises at exhaustion',()=>{
  for(const policy of ['full','baseline'])for(const body of [true,false]) {
    const state=createSimulation(exhausted(),{seed:7,policy,modules:{body}});
    const next=step(state,{type:'act',actorId:'a',actionId:'work',intention:'Finish the repair'});
    const d=next.history[0].decisions[0];
    assert.equal(d.requestedActionId,'work');
    assert.equal(d.intention,'Finish the repair');
    assert.equal(d.actionKind,'rest');
    assert.equal(d.intervention.cause,'fatigue');
    assert.equal(next.world.progress,0);
    assert.deepEqual(next.actors[0].skills,state.actors[0].skills);
    assert.equal(next.actors[0].support,state.actors[0].support);
    assert.equal(next.actors[0].commitment.fulfilled,false);
    assert.equal(next.actors[0].commitment.expired,true);
    assert.equal(d.learning.direct,null);
    assert.equal('roll' in d.diagnostics,false);
    assert.deepEqual(replay(exportReplay(next)),next);
  }
  const state=createSimulation(exhausted(),{policy:'baseline'});
  assert.equal(step(state).history[0].decisions[0].actionKind,'rest');
});

test('capacity accounts for the whole effort before starting and never silently discards an exertion cost',()=>{
  for(const fatigue of [.784,.785,.786,.99,1]) {
    const state=createSimulation(exhausted({fatigue}));
    const next=step(state,{type:'act',actorId:'a',actionId:'work'});
    const d=next.history[0].decisions[0];
    if(fatigue<=.785) {
      assert.equal(d.actionKind,'work');
      assert.ok(Math.abs(next.actors[0].body.fatigue-(fatigue+.215))<1e-12);
    } else assert.equal(d.actionKind,'rest');
  }
});

test('recovery integrates maintenance before clipping, including at maximum fatigue',()=>{
  const state=createSimulation(exhausted());
  const next=step(state,{type:'act',actorId:'a',actionId:'rest'});
  assert.ok(Math.abs(next.actors[0].body.fatigue-.765)<1e-12);
});

test('hunger capacity is shared, respects ration availability and cannot turn a blocked request into work',()=>{
  for(const food of [0,1]) {
    const state=createSimulation(exhausted({fatigue:.1,hunger:1,food}));
    const next=step(state,{type:'act',actorId:'a',actionId:'work'});
    const d=next.history[0].decisions[0];
    assert.equal(d.intervention.cause,'hunger');
    assert.equal(d.actionKind,food?'eat':'rest');
    assert.equal(next.world.food,0);
    assert.equal(next.world.progress,0);
    assert.equal(d.learning.direct,null);
    assert.ok(Math.abs(next.actors[0].body.hunger-(food?.47:1))<1e-12);
  }
});

test('an exertion-only adapter still has built-in recovery and deterministic replays',()=>{
  const scenario=exhausted({actions:fixture.actions.filter(a=>a.kind==='work')});
  let state=createSimulation(scenario,{policy:'baseline'});
  for(let i=0;i<6;i++)state=step(state);
  const ds=state.history.flatMap(h=>h.decisions);
  assert.ok(ds.some(d=>d.actionKind==='rest'));
  assert.ok(ds.some(d=>d.actionKind==='work'));
  assert.deepEqual(replay(exportReplay(state)),state);
});

test('omitted help effort matches its explicit default in preference, execution and capacity',()=>{
  const implicit=structuredClone(fixture),explicit=structuredClone(fixture);
  delete implicit.actions.find(a=>a.kind==='help').effort;
  const a=createSimulation(implicit),b=createSimulation(explicit);
  assert.deepEqual(rankActions(getView(a,'a')),rankActions(getView(b,'a')));
  for(const state of [a,b]) {
    state.actors[0].body.fatigue=.92;
    const d=step(state,{type:'act',actorId:'a',actionId:'help'}).history[0].decisions[0];
    assert.equal(d.actionKind,'rest');
    assert.equal(d.requestedActionId,'help');
    assert.equal(d.observations.some(o=>o.kind==='assistance'),false);
  }
});

test('capacity feedback does not reveal private unexecuted requests or exact body through public events',()=>{
  const s=structuredClone(fixture);
  s.actors[0].body.fatigue=.997;s.actors[0].observationBias=-.4;
  const before=createSimulation(s);
  const view=getView(before,'a');
  assert.equal(assessCapacity(view.actor.body,view.actions[0],view.roundMinutes).allowed,true);
  const next=step(before,{type:'act',actorId:'a',actionId:'work',intention:'private request secret'});
  const own=next.history[0].decisions[0];
  assert.equal(own.intervention.cause,'fatigue');
  const publicEvent=getView(next,'b').recentEvents.find(e=>e.actorId==='a');
  assert.equal(publicEvent.actionLabel,'Forced recovery');
  assert.doesNotMatch(JSON.stringify(publicEvent),/private request secret|\.997|requestedAction/);
});

test('forced recovery preserves prepared support until a work attempt actually executes',()=>{
  const state=createSimulation(exhausted());
  state.actors[0].support=.18;
  const next=step(state,{type:'act',actorId:'a',actionId:'work'});
  assert.equal(next.actors[0].support,.18);
  const after=step(next,{type:'act',actorId:'a',actionId:'work'});
  assert.equal(after.history.at(-1).decisions[0].actionKind,'work');
  assert.equal(after.actors[0].support,0);
});
