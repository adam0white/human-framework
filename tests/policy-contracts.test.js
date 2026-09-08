import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,step,getView,rankActions,runSimulation,exportReplay,replay} from '../src/core/index.js';
import {fixture} from './fixtures.js';

function solo() {
  const s=structuredClone(fixture);
  s.goalUtility=30;s.consumption=0;s.actors=s.actors.slice(0,1);
  s.actors[0].commitment=null;
  s.actors[0].priorities={duty:0,care:0,caution:0,mastery:0};
  s.actions=s.actions.filter(a=>['work','rest','eat'].includes(a.kind));
  return s;
}

function convertUnits(s,factor) {
  const converted=structuredClone(s);
  for(const key of ['target','initialProgress','consumption'])converted[key]*=factor;
  for(const action of converted.actions)if(action.kind==='work')action.output*=factor;
  return converted;
}

test('physical unit conversions preserve choices, normalized output and body outcomes for every controller',()=>{
  const s=solo();s.horizon=25;s.food=3;s.target=13;s.initialProgress=.5;s.consumption=.1;
  s.actions.push({...s.actions[0],id:'light-work',output:.7,effort:.05,difficulty:.2});
  for(const policy of ['full','baseline','planned-simple'])for(const factor of [.1,10,100])for(const seed of [7,27]) {
    const a=runSimulation(s,{seed,policy}),b=runSimulation(convertUnits(s,factor),{seed,policy});
    assert.equal(a.status,b.status);
    assert.equal(a.round,b.round);
    assert.deepEqual(a.actors,b.actors);
    assert.deepEqual(a.history.flatMap(h=>h.decisions.map(d=>d.requestedActionId)),b.history.flatMap(h=>h.decisions.map(d=>d.requestedActionId)));
    assert.ok(Math.abs(a.world.progress/s.target-b.world.progress/b.scenario.target)<1e-10);
  }
});

test('adding a dominated work option does not change existing work utility',()=>{
  const s=solo(),a=createSimulation(s),expanded=structuredClone(s);
  expanded.actions.push({...s.actions[0],id:'wasteful-work',output:.001,effort:1,difficulty:1});
  const b=createSimulation(expanded);
  for(const policy of ['full','baseline','planned-simple']) {
    const before=rankActions(getView(a,'a'),{policy}),after=rankActions(getView(b,'a'),{policy});
    for(const item of before)assert.deepEqual(after.find(x=>x.actionId===item.actionId),item);
  }
});

test('unit conversion cannot turn ten successful tenths into a missed deadline',()=>{
  const s=solo();s.target=1;s.horizon=10;s.roundMinutes=.01;s.food=0;s.hazard=0;s.initialSignal=0;
  s.actors[0].body={fatigue:0,hunger:0};s.actors[0].skills.craft=1;
  s.actions=s.actions.filter(a=>a.kind==='work');
  Object.assign(s.actions[0],{output:.1,effort:0,difficulty:0,exposure:0});
  const a=runSimulation(s,{seed:1}),b=runSimulation(convertUnits(s,10),{seed:1});
  assert.equal(a.history.flatMap(h=>h.decisions).filter(d=>d.outcome.success).length,10);
  assert.equal(a.status,'won');assert.equal(b.status,'won');assert.equal(a.round,b.round);
});

test('Full values a feasible final opportunity to complete its declared goal above recovery',()=>{
  for(const hunger of [.2,.7]) {
    const s=solo();s.target=2;s.horizon=1;s.actors[0].body={fatigue:.7,hunger};
    const state=createSimulation(s,{seed:7}),ranking=rankActions(getView(state,'a'));
    assert.equal(ranking[0].actionId,'work');
    assert.ok(ranking[0].contributions.find(c=>c.label==='Deadline opportunity').value>0);
    assert.equal(step(state).history[0].decisions[0].requestedActionId,'work');
  }
});

test('deadline valuation does not erase explicitly competing commitments when goal utility is low',()=>{
  const s=solo();s.target=2;s.horizon=1;s.goalUtility=0;
  s.actors[0].body={fatigue:.2,hunger:.2};s.actors[0].priorities.duty=1;
  s.actors[0].commitment={actionId:'rest',weight:1,dueRound:1};
  const choice=rankActions(getView(createSimulation(s),'a'))[0];
  assert.equal(choice.actionId,'rest');
  assert.equal(choice.contributions.find(c=>c.label==='Recognized promise').value,2);
});

test('deadline opportunity depends on remaining rounds and work remaining after consumption',()=>{
  const s=solo();s.target=10;s.initialProgress=8;s.horizon=10;
  const state=createSimulation(s),early=getView(state,'a'),late={...early,round:9};
  const opportunity=view=>rankActions(view).find(a=>a.actionId==='work').contributions.find(c=>c.label==='Deadline opportunity').value;
  assert.ok(opportunity(late)>opportunity(early));
  assert.ok(opportunity({...late,world:{...late.world,consumption:2}})<opportunity(late));
  assert.equal(opportunity({...late,world:{...late.world,progress:10}}),0);
  assert.ok(opportunity({...late,world:{...late.world,progress:10,consumption:1}})>0);
});

test('a deadline does not turn perceived blocked work into productive work or consult hidden body',()=>{
  const s=solo();s.target=2;s.horizon=1;s.actors[0].body={fatigue:1,hunger:.2};
  const state=createSimulation(s),view=getView(state,'a'),ranking=rankActions(view);
  assert.equal(ranking[0].actionId,'rest');
  const work=ranking.find(a=>a.actionId==='work');
  assert.equal(work.forecast,0);
  assert.equal(work.selectionTier,0);
  assert.equal(work.contributions.find(c=>c.label==='Deadline opportunity').value,0);
  const hidden=structuredClone(state);hidden.actors[0].body.fatigue=.997;
  assert.deepEqual(getView(hidden,'a'),view);
  assert.deepEqual(rankActions(getView(hidden,'a')),ranking);
});

test('planned-simple chooses recovery independently for every actor and retains fixed work order',()=>{
  const s=structuredClone(fixture);s.goalUtility=30;s.food=2;
  for(const actor of s.actors)actor.commitment=null;
  s.actors[0].body={fatigue:.1,hunger:.6};s.actors[1].body={fatigue:.65,hunger:.2};
  const first=step(createSimulation(s,{seed:7,policy:'planned-simple'}));
  assert.deepEqual(first.history[0].decisions.map(d=>d.requestedActionId),['eat','rest']);
  assert.ok(first.history[0].decisions.every(d=>d.intervention===null));
  const second=step(first);
  assert.deepEqual(second.history[1].decisions.map(d=>d.requestedActionId),['work','work']);
  assert.deepEqual(replay(exportReplay(second)),second);
});

test('planned-simple handles missing recovery affordances without inventing choices',()=>{
  const s=solo();s.food=0;s.actors[0].body={fatigue:.1,hunger:.9};
  assert.equal(rankActions(getView(createSimulation(s,{policy:'planned-simple'}),'a'))[0].actionId,'work');
  s.actions=s.actions.filter(a=>a.kind==='work');s.actors[0].body.fatigue=.9;
  assert.equal(step(createSimulation(s,{policy:'planned-simple'})).history[0].decisions[0].actionKind,'rest');
});

test('goal utility is an explicit dimensionless scenario contract',()=>{
  const s=solo();delete s.goalUtility;
  assert.throws(()=>createSimulation(s),/goalUtility/);
  for(const value of [-1,Infinity,'30',null])assert.throws(()=>createSimulation({...s,goalUtility:value}),/goalUtility|finite/);
  assert.equal(getView(createSimulation({...s,goalUtility:0}),'a').world.goalUtility,0);
});
