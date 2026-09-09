import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as baseline from '../src/games/camp-current.js';
import {assessEffort} from '../src/runtime/index.js';

const candidate=existsSync(new URL('../src/experiments/camp-reconsideration/host.js',import.meta.url))
  ?await import('../src/experiments/camp-reconsideration/host.js'):{};
const command=(api,game,type,args={})=>api.applyCommand(game,{type,...args});
// Known C1 development state only. These tests do not compare completion objectives.
const records=JSON.parse(readFileSync(new URL('../artifacts/practice-incentive/construction/comparison-initial.json',import.meta.url)));
const known=records.trajectories.find(t=>t.id==='one-minute-construction-then-garden');
const beforeCancel=()=>baseline.restoreGame(structuredClone(known.states[17]));
const imported=game=>{assert.equal(typeof candidate.fromBaseline,'function');return candidate.fromBaseline(baseline.exportGame(game));};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('candidate initialization validates baseline and changes only host version',()=>{
  const before=baseline.exportGame(beforeCancel()),saved=structuredClone(before),game=candidate.fromBaseline(before);
  assert.equal(game.version,'0.3.1-reconsideration.0');
  const expected=structuredClone(before);expected.game.version=game.version;
  assert.deepEqual(candidate.exportGame(game),expected);assert.deepEqual(before,saved);
  const invalid=structuredClone(before);invalid.game.paid.neighbor.gatheringMinutes++;
  assert.throws(()=>candidate.fromBaseline(invalid));
  assert.throws(()=>baseline.restoreGame(candidate.exportGame(game)));
  assert.throws(()=>candidate.restoreGame(before));
});

test('owned zero-elapsed supply trip changes to released assembly without output or elapsed time',()=>{
  const game=imported(beforeCancel()),before=candidate.exportGame(game),oldEvent=game.jobs.neighbor.eventId;
  assert.equal(game.people.neighbor.pending.elapsedMinutes,0);
  const next=command(candidate,game,'cancel');
  assert.equal(next.clock.now,85);assert.equal(next.jobs.player,null);assert.equal(next.jobs.neighbor.kind,'assembly');
  assert.equal(next.jobs.neighbor.project,'shelter');assert.equal(next.people.neighbor.pending,null);
  assert.deepEqual(next.stock,game.stock);assert.deepEqual(next.paid,game.paid);
  assert.deepEqual(next.people.neighbor.body,game.people.neighbor.body);
  assert.deepEqual(next.people.neighbor.skills,game.people.neighbor.skills);
  assert.equal(next.stats.canceled,game.stats.canceled+2);assert.equal(next.stats.started,game.stats.started+1);
  assert.ok(!next.clock.queue.some(e=>e.id===oldEvent));
  close(next.work.shelter.progress,game.work.shelter.progress);
  assert.equal(next.work.shelter.durationByActor.neighbor,24);
  assert.deepEqual(candidate.exportGame(game),before);
});

test('positive paid supply interruption preserves sunk practice body effort and reservation',()=>{
  const game=imported(baseline.advanceGame(beforeCancel(),3));
  assert.equal(game.people.neighbor.pending.elapsedMinutes,3);
  const next=command(candidate,game,'cancel');
  assert.equal(next.jobs.neighbor.project,'shelter');
  assert.deepEqual(next.paid,game.paid);assert.deepEqual(next.stock,game.stock);
  assert.deepEqual(next.people.neighbor.body,game.people.neighbor.body);
  assert.deepEqual(next.people.neighbor.skills,game.people.neighbor.skills);
  assert.deepEqual(next.work.shelter.cost,game.work.shelter.cost);
  assert.deepEqual(next.stats.gathered,game.stats.gathered);
  const restored=candidate.restoreGame(JSON.parse(JSON.stringify(candidate.exportGame(next))));
  assert.deepEqual(restored,next);
  const paid=candidate.advanceGame(restored,1);
  assert.equal(paid.paid.neighbor.constructionMinutes,next.paid.neighbor.constructionMinutes+1);
  assert.equal(paid.paid.neighbor.gatheringMinutes,next.paid.neighbor.gatheringMinutes);
  assert.ok(paid.work.shelter.progress>next.work.shelter.progress);
});

test('a consumed cancellation event cannot repeat at the same timestamp',()=>{
  const next=command(candidate,imported(beforeCancel()),'cancel'),saved=candidate.exportGame(next);
  assert.throws(()=>command(candidate,next,'cancel'),/No job to stop/);
  for(let i=0;i<4;i++)assert.deepEqual(candidate.advanceGame(next,0),next);
  assert.deepEqual(candidate.exportGame(next),saved);
});

test('fixed player cancellation and a different released project do not preempt owned supply',()=>{
  const free=command(baseline,beforeCancel(),'cancel');
  for(const job of ['forage','build-garden']){
    const game=imported(command(baseline,free,'start',{job})),next=command(candidate,game,'cancel');
    assert.deepEqual(next.jobs.neighbor,game.jobs.neighbor);
    assert.deepEqual(next.people.neighbor,game.people.neighbor);
    assert.deepEqual(next.paid,game.paid);assert.equal(next.stats.canceled,game.stats.canceled+1);
  }
});

test('synthetic need and recovery guards preserve the ongoing trip',()=>{
  // Intentionally altered structural fixtures, not default-origin evaluation cases.
  for(const guard of ['hunger','fatigue','recovering']){
    const snapshot=baseline.exportGame(beforeCancel()),g=snapshot.game,p=g.people.neighbor;
    if(guard==='recovering')g.recovering.neighbor=true;
    else{p.body[guard]=guard==='hunger'?.65:.68;p.pending.bodyBefore=structuredClone(p.body);p.pending.capacity=assessEffort(p.body,p.pending.action);}
    const game=imported(baseline.restoreGame(snapshot)),next=command(candidate,game,'cancel');
    assert.deepEqual(next.jobs.neighbor,game.jobs.neighbor);assert.deepEqual(next.people.neighbor,game.people.neighbor);
    assert.deepEqual(next.paid,game.paid);assert.equal(next.stats.canceled,game.stats.canceled+1);
  }
});

test('owned meal and food collection survive same-project player cancellation',()=>{
  for(const foodAvailable of [true,false]){
    let game=baseline.createGame();
    if(!foodAvailable)for(let n=0;n<4;n++)game=baseline.advanceGame(command(baseline,game,'start',{job:'eat'}),8);
    // Intentionally hungry structural fixture; all prior paid commands remain valid.
    const snapshot=baseline.exportGame(game);snapshot.game.people.neighbor.body.hunger=.65;
    game=baseline.restoreGame(snapshot);
    game=command(baseline,game,'start',{job:'build-workbench'});
    game=command(baseline,game,'request',{project:'workbench'});
    game=imported(game);
    assert.equal(game.jobs.neighbor.id,foodAvailable?'eat':'forage');
    const next=command(candidate,game,'cancel');
    assert.deepEqual(next.jobs.neighbor,game.jobs.neighbor);assert.deepEqual(next.people.neighbor,game.people.neighbor);
    assert.deepEqual(next.stock,game.stock);assert.deepEqual(next.paid,game.paid);
    assert.equal(next.stats.consumedFood,game.stats.consumedFood);
  }
});
