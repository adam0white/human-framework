import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,step,getView,rankActions,replay,exportReplay} from '../src/core/index.js';
import {fixture} from './fixtures.js';

test('one ration cannot be consumed twice by competing actors in one round',()=>{
  const s=structuredClone(fixture);
  s.actions=s.actions.filter(a=>a.kind==='eat');
  for(const a of s.actors)a.commitment=null;
  const result=step(createSimulation(s,{seed:1}));
  assert.equal(result.world.food,0);
  assert.equal(result.history[0].decisions.filter(d=>d.outcome.success).length,1);
});

test('changing an intention changes its trace but cannot manufacture output or divine approval',()=>{
  const s=createSimulation(fixture,{seed:7});
  const a=step(s,{type:'act',actorId:'a',actionId:'work',intention:'for admiration'});
  const b=step(s,{type:'act',actorId:'a',actionId:'work',intention:'to keep a promise'});
  assert.deepEqual(a.world,b.world);
  assert.deepEqual(a.actors,b.actors);
  assert.notEqual(a.history[0].decisions[0].intention,b.history[0].decisions[0].intention);
  assert.equal('intention' in getView(a,'b').recentEvents[0],false);
});

test('cycles in explicitly authored transfer cannot recursively create more practice',()=>{
  const s={...fixture,transfer:[{from:'craft',to:'survey',rate:0.5,provenance:'synthetic test only'},{from:'survey',to:'craft',rate:0.5,provenance:'synthetic test only'}]};
  const a=step(createSimulation(s,{seed:7}),{type:'act',actorId:'a',actionId:'work'}).actors[0];
  const direct=step(createSimulation(fixture,{seed:7}),{type:'act',actorId:'a',actionId:'work'}).actors[0];
  assert.equal(a.skills.craft,direct.skills.craft);
  assert.ok(Math.abs((a.skills.survey-0.4)-(direct.skills.craft-0.6)*0.5)<1e-12);
});

test('high fatigue interrupts execution of a recognized promise while preserving the requested choice',()=>{
  const s=createSimulation(fixture,{seed:1});
  s.actors[0].body.fatigue=1;s.actors[0].body.hunger=0;
  const view=getView(s,'a');
  assert.equal(rankActions(view)[0].actionId,'rest');
  assert.ok(view.actions.some(a=>a.id==='work'));
  const d=step(s,{type:'act',actorId:'a',actionId:'work'}).history[0].decisions[0];
  assert.equal(d.requestedActionId,'work');
  assert.equal(d.actionKind,'rest');
  assert.equal(d.outcome.promiseKept,false);
});

test('unknown action kinds and replay commands cannot silently fall back to a default',()=>{
  assert.throws(()=>createSimulation({...fixture,actions:[{...fixture.actions[0],kind:'pray-for-success'}]}),/Unsupported action kind/);
  const record=exportReplay(createSimulation(fixture));
  record.commands=[{type:'make-up-a-result'}];
  assert.throws(()=>replay(record),/command/i);
});

test('help chooses between partners using perceived need, not inaccessible fatigue precision',()=>{
  const s=structuredClone(fixture);
  s.actors.push({...structuredClone(s.actors[1]),id:'c',name:'Cem'});
  s.actors[1].body.fatigue=0.51;s.actors[2].body.fatigue=0.52;
  const a=createSimulation(s,{seed:1});
  s.actors[1].body.fatigue=0.52;s.actors[2].body.fatigue=0.51;
  const b=createSimulation(s,{seed:1});
  assert.deepEqual(getView(a,'a'),getView(b,'a'));
  const ca=step(a,{type:'act',actorId:'a',actionId:'help'}).history[0].decisions[0];
  const cb=step(b,{type:'act',actorId:'a',actionId:'help'}).history[0].decisions[0];
  assert.equal(ca.observations[0].recipient,cb.observations[0].recipient);
});

test('non-JSON or nonfinite scenario metadata is rejected before it can break replay',()=>{
  for(const extra of [1n,()=>1,undefined,NaN,Infinity,new Date()]) {
    assert.throws(()=>createSimulation({...fixture,extra}),/JSON|finite|plain/i);
  }
  const s={...fixture};s.extra=s;
  assert.throws(()=>createSimulation(s),/JSON|cycle/i);
});

test('commitment-weight ablation removes its ranking contribution but preserves measured promise outcomes',()=>{
  const s=createSimulation(fixture,{seed:1,modules:{commitments:false}});
  assert.ok(rankActions(getView(s,'a')).every(a=>a.contributions.every(c=>c.label!=='Recognized promise')));
  const after=step(s,{type:'act',actorId:'a',actionId:'work'});
  assert.equal(after.actors[0].commitment.fulfilled,true);
});

test('actor projections do not disclose replay seed or future random draws',()=>{
  const state=createSimulation(fixture,{seed:27});
  const view=getView(state,'a');
  assert.equal(Object.hasOwn(view.options,'seed'),false);
  assert.deepEqual(Object.keys(view.options).sort(),['modules','policy']);
});

test('negative transfer is recorded as a transfer effect, never as practice of the target skill',()=>{
  const s={...fixture,transfer:[{from:'craft',to:'survey',rate:-0.5,provenance:'synthetic interference fixture'}]};
  const d=step(createSimulation(s),{type:'act',actorId:'a',actionId:'work'}).history[0].decisions[0];
  assert.ok(d.changes.skills.survey<0);
  assert.equal(d.learning.direct.skill,'craft');
  assert.equal(d.learning.transfers[0].to,'survey');
  assert.equal(d.learning.transfers[0].provenance,'synthetic interference fixture');
  assert.ok(d.learning.transfers[0].delta<0);
});

test('body-coupling ablation removes peer fatigue from assistance preference',()=>{
  const a=createSimulation(fixture,{modules:{body:false}});
  const b=structuredClone(a);
  a.actors[1].body.fatigue=0;b.actors[1].body.fatigue=1;
  assert.deepEqual(rankActions(getView(a,'a')),rankActions(getView(b,'a')));
});

test('partial ranking options preserve the current policy and unaffected modules',()=>{
  const view=getView(createSimulation(fixture,{modules:{learning:false}}),'a');
  const baseline=rankActions(view,{policy:'baseline'});
  assert.deepEqual(baseline,rankActions(view,{...view.options,policy:'baseline'}));
  const noBody=rankActions(view,{modules:{body:false}});
  assert.deepEqual(noBody,rankActions(view,{...view.options,modules:{...view.options.modules,body:false}}));
  assert.ok(noBody.some(a=>a.contributions.some(c=>c.label==='Recognized promise')));
  assert.equal(view.options.modules.body,true);
  assert.equal(view.options.modules.learning,false);
  assert.throws(()=>rankActions(view,{policy:'guess'}),/policy/i);
  assert.throws(()=>rankActions(view,{modules:{body:'false'}}),/module/i);
  assert.throws(()=>rankActions(view,{modules:{telepathy:true}}),/module/i);
});

test('a failed action with learning disabled does not claim that practice was credited',()=>{
  const s=structuredClone(fixture);
  s.actors[0].skills.craft=0;
  s.actors[0].body.fatigue=.6;
  s.actions.find(a=>a.id==='work').difficulty=1;
  const d=step(createSimulation(s,{seed:7,modules:{learning:false}}),{type:'act',actorId:'a',actionId:'work'}).history[0].decisions[0];
  assert.equal(d.outcome.success,false);
  assert.equal(d.learning.direct,null);
  assert.doesNotMatch(d.outcome.reason,/practice/i);
});

test('disabled assistance records a paid attempt without claiming effective support',()=>{
  const state=createSimulation(fixture,{modules:{relationships:false}});
  const after=step(state,{type:'act',actorId:'a',actionId:'help'});
  const d=after.history[0].decisions[0];
  assert.equal(after.actors[1].support,0);
  assert.equal(d.observations[0].effective,false);
  assert.ok(d.changes.fatigue>0);
  assert.match(d.outcome.reason,/disabled/i);
  assert.doesNotMatch(d.outcome.reason,/Prepared assistance/i);
});

test('disabled belief learning removes the value assigned to unusable inspection updates',()=>{
  const active=getView(createSimulation(fixture),'a');
  const disabled=getView(createSimulation(fixture,{modules:{beliefs:false}}),'a');
  const inspection=view=>rankActions(view).find(a=>a.actionId==='observe');
  assert.ok(inspection(active).score>0);
  assert.ok(inspection(disabled).score<=0);
  assert.equal(inspection(disabled).contributions.find(c=>c.label==='Inspection updates unavailable').value,0);
  const before=createSimulation(fixture,{modules:{beliefs:false}});
  const after=step(before,{type:'act',actorId:'a',actionId:'observe'});
  assert.equal(after.round,1,'inspection remains requestable and costs its interval');
  assert.deepEqual(after.actors[0].beliefs,before.actors[0].beliefs);
  assert.ok(after.history[0].decisions[0].observations.some(o=>o.kind==='hazard-report'));
});

test('disabled practice learning removes its expected gain contribution but retains skill-based work',()=>{
  const active=getView(createSimulation(fixture),'a');
  const disabled=getView(createSimulation(fixture,{modules:{learning:false}}),'a');
  const work=view=>rankActions(view).find(a=>a.actionId==='work');
  assert.ok(work(active).contributions.find(c=>c.label==='Practice interest').value>0);
  assert.equal(work(disabled).contributions.find(c=>c.label==='Practice updates unavailable')?.value,0);
  assert.equal(work(active).forecast,work(disabled).forecast);
  const before=createSimulation(fixture,{modules:{learning:false}});
  const after=step(before,{type:'act',actorId:'a',actionId:'work'});
  assert.equal(after.history[0].decisions[0].actionKind,'work');
  assert.equal(after.history[0].decisions[0].learning.direct,null);
  assert.deepEqual(after.actors[0].skills,before.actors[0].skills);
});
