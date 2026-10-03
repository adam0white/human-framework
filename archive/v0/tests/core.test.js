import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,step,getView,rankActions,exportReplay,replay,runSimulation,practice,retain,keyedRandom} from '../src/core/index.js';
import {fixture} from './fixtures.js';

test('a supplied action and intention survive policy disagreement without mutating the prior state',()=>{
  const state=createSimulation(fixture,{seed:3});
  const before=structuredClone(state);
  const next=step(state,{type:'act',actorId:'a',actionId:'rest',intention:'recover'});
  assert.deepEqual(state,before);
  assert.equal(next.history[0].decisions[0].actionId,'rest');
  assert.equal(next.history[0].decisions[0].intention,'recover');
  assert.ok(next.actors[0].body.fatigue<state.actors[0].body.fatigue);
  assert.equal(next.round,1);
  assert.equal(next.minutes,10);
});

test('changing hidden hazard alone does not change the accessible view or chosen plan',()=>{
  const low=createSimulation({...fixture,hazard:0},{seed:7});
  const high=createSimulation({...fixture,hazard:1},{seed:7});
  const v=getView(low,'a');
  assert.deepEqual(v,getView(high,'a'));
  assert.equal('hazard' in v.world,false);
  assert.equal('priorities' in v.peers[0],false);
  assert.deepEqual(rankActions(v),rankActions(getView(high,'a')));
  v.actor.skills.craft=0;
  assert.equal(low.actors[0].skills.craft,0.6);
});

test('investigating costs a round and changes the next decision belief through a recorded observation',()=>{
  const state=createSimulation(fixture,{seed:2});
  const next=step(state,{type:'act',actorId:'a',actionId:'observe'});
  assert.equal(next.round,1);
  assert.ok(next.actors[0].beliefs.hazard.estimate>state.actors[0].beliefs.hazard.estimate);
  assert.ok(next.history[0].decisions[0].observations.some(o=>o.kind==='hazard-report'));
  assert.equal(getView(next,'a').actor.beliefs.hazard.estimate,next.actors[0].beliefs.hazard.estimate);
});

test('structural rejection consumes no time and empty food fails as a paid attempt',()=>{
  const state=createSimulation({...fixture,food:0},{seed:2});
  assert.throws(()=>step(state,{type:'act',actorId:'a',actionId:'imaginary'}),/action/i);
  assert.equal(state.round,0);
  const next=step(state,{type:'act',actorId:'a',actionId:'eat'});
  assert.equal(next.round,1);
  assert.equal(next.world.food,0);
  assert.equal(next.history[0].decisions[0].outcome.success,false);
});

test('practice stays bounded and retention cannot create an unpracticed gain',()=>{
  assert.equal(practice(0.2,0,1,1),0.2);
  assert.equal(practice(1,10,1,1),1);
  assert.equal(retain(0.2,10,1,0.8),0.2);
  assert.ok(Math.abs(retain(1,1,1,0)-0.36787944117144233)<1e-12);
  assert.throws(()=>practice(0.2,-1,1,1),/duration/i);
});

test('unsupported skill transfer stays absent after relevant practice',()=>{
  const next=step(createSimulation(fixture,{seed:3}),{type:'act',actorId:'a',actionId:'work'});
  assert.ok(next.actors[0].skills.craft>0.6);
  assert.equal(next.actors[0].skills.survey,0.4);
});

test('replay reproduces complete state and rejects incompatible versions',()=>{
  const state=runSimulation(fixture,{seed:27});
  assert.deepEqual(replay(JSON.parse(JSON.stringify(exportReplay(state)))),state);
  assert.throws(()=>replay({...exportReplay(state),version:999}),/version/i);
  assert.throws(()=>step(state),/finished|terminal/i);
});

test('random draws are reproducible and unrelated purposes cannot consume each other',()=>{
  const first=keyedRandom(7,'a','work',1);
  for(let i=0;i<10;i++)keyedRandom(7,'b','prose',i);
  assert.equal(keyedRandom(7,'a','work',1),first);
  assert.notEqual(keyedRandom(7,'a','work',2),first);
  assert.ok(first>=0&&first<1);
});

test('schema rejects nonfinite parameters and duplicated actor identities',()=>{
  assert.throws(()=>createSimulation({...fixture,hazard:NaN}),/hazard/i);
  assert.throws(()=>createSimulation({...fixture,actors:[fixture.actors[0],fixture.actors[0]]}),/duplicate/i);
});
