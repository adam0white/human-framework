import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import * as legacy from '../src/games/commons.js';
import {makeLegacyFixture} from '../scripts/continuous-work-fixture.js';
const camp = existsSync(new URL('../src/games/camp.js',import.meta.url)) ? await import('../src/games/camp.js') : {};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const migrate=(g,options)=>camp.migrateLegacyGame(legacy.exportGame(g),options);

test('camp exposes the separately versioned full game API',()=>{
  assert.equal(typeof camp.createGame,'function');
  const g=camp.createGame(); assert.equal(g.version,'0.2.0'); assert.equal(g.people.player.version,'0.1.1');
  assert.deepEqual(camp.restoreGame(camp.exportGame(g)),g);
});
test('automatic available recovery pays real time without a job or food',()=>{
  const g=camp.createGame({solo:true}),next=camp.advanceGame(g,6);
  close(next.people.player.body.fatigue,.059); assert.equal(next.people.player.pending,null); assert.equal(next.jobs.player,null);
  assert.deepEqual(next.stock,g.stock); assert.equal(next.paid.player.recovery,6);
  const idle=camp.advanceGame(camp.createGame({solo:true,recovery:'active-idle'}),6);
  close(idle.people.player.body.fatigue,.209); assert.equal(idle.people.player.body.hunger,next.people.player.body.hunger);
  assert.equal(camp.advanceToNextEvent(g).clock.now,6);
  assert.equal(camp.advanceToNextEvent(next).clock.now,9);
});
test('full gathering pays interval before fixed output; meal reservation returns only on interruption',()=>{
  let g=camp.startJob(camp.createGame({solo:true}),'gather-timber');
  g=camp.advanceGame(g,15); assert.equal(g.stock.timber,4);
  g=camp.advanceGame(g,1); assert.equal(g.stock.timber,7); assert.equal(g.paid.player.work,16);
  g=camp.startJob(g,'eat'); assert.equal(g.stock.food,3);
  g=camp.advanceGame(g,3); const hunger=g.people.player.body.hunger;
  g=camp.cancelJob(g); assert.equal(g.stock.food,4); assert.equal(g.people.player.body.hunger,hunger);
  g=camp.advanceGame(camp.startJob(g,'eat'),8); assert.equal(g.stock.food,3); assert.equal(g.stats.consumedFood,1);
});
test('migration preserves mixed fixed gather, meal and converted rest paid state',()=>{
  for(const id of ['gather-timber','gather-salvage','forage','eat','rest']) {
    const old=legacy.advanceGame(legacy.startJob(legacy.createGame({solo:true}),id),3),g=migrate(old);
    assert.deepEqual(g.people.player.body,old.people.player.body); assert.deepEqual(g.people.player.skills,old.people.player.skills);
    assert.equal(g.clock.now,3); assert.deepEqual(g.stock,old.stock); assert.deepEqual(g.origin,legacy.exportGame(old));
    assert.equal(g.people.player.minutes,3);
    if(id==='rest'){assert.equal(g.jobs.player,null); assert.equal(g.people.player.pending,null);}
    else {assert.equal(g.jobs.player.endsAt,old.jobs.player.endsAt); assert.deepEqual(g.people.player.pending,old.people.player.pending);}
    const restored=camp.restoreGame(JSON.parse(JSON.stringify(camp.exportGame(g))));
    assert.deepEqual(camp.advanceGame(restored,25),camp.advanceGame(g,25));
  }
});
test('prospective workbench improves future physical work while snapshot is independent of recovery',()=>{
  const old=makeLegacyFixture();
  for(const recovery of ['active-idle','automatic']){
    const p=camp.advanceGame(migrate(old,{recovery,improvement:'prospective'}),15);
    const s=camp.advanceGame(migrate(old,{recovery,improvement:'snapshot'}),15);
    assert.equal(p.structures.garden,1); assert.equal(s.structures.garden,0);
    assert.equal(p.lastAssemblies.garden.completedAt,202); close(p.lastAssemblies.garden.contributions.neighbor.effort,.2);
    assert.equal(camp.advanceGame(s,5).structures.garden,1);
  }
});
test('stopping and resuming preserve material and per-worker productivity basis',()=>{
  let g=camp.advanceGame(camp.startJob(camp.createGame({solo:true}),'build-workbench'),4);
  const before=structuredClone(g.work.workbench),stock=structuredClone(g.stock),person=structuredClone(g.people.player);
  for(let i=0;i<8;i++)g=camp.startJob(camp.cancelJob(g),'build-workbench');
  assert.deepEqual(g.work.workbench,before); assert.deepEqual(g.stock,stock); assert.deepEqual(g.people.player,person);
  g=camp.advanceGame(g,18); assert.equal(g.structures.workbench,1);close(g.lastAssemblies.workbench.contributions.player.effort,.2);
});
test('handover invokes recipient choice and charges only that recipient future work',()=>{
  let g=camp.advanceGame(camp.startJob(camp.createGame(),'build-workbench'),2),before=structuredClone(g.people.player);
  g=camp.requestHandover(g); assert.equal(g.lastResponse.accepted,true); assert.equal(g.jobs.player,null); assert.equal(g.jobs.neighbor.project,'workbench');
  const future=camp.advanceGame(g,20); assert.deepEqual(future.people.player.skills,before.skills);
  close(future.lastAssemblies.workbench.contributions.player.effort,.2*2/22);
  close(future.lastAssemblies.workbench.contributions.neighbor.effort,.2*(1-2/22));
  let busy=camp.requestProject(camp.createGame(),'shelter'); busy=camp.startJob(busy,'forage');
  assert.throws(()=>camp.requestHandover(busy),/assembly/i);
});
test('neighbor accepted project gathers missing material and recovers through own decisions',()=>{
  let g=camp.requestProject(camp.createGame(),'workbench'); assert.equal(g.commitment.status,'accepted');
  g=camp.advanceGame(g,200); assert.equal(g.structures.workbench,2); assert.equal(g.commitment.status,'fulfilled');
  assert.ok(g.stats.gathered.timber>0);assert.ok(g.stats.gathered.salvage>0);assert.ok(g.paid.neighbor.recovery>0);
});
test('availability uses actual admission for the original rounded-capacity counterexample',()=>{
  let old=legacy.createGame({solo:true});
  for(let i=0;i<3;i++)old=legacy.advanceToNextEvent(legacy.startJob(old,'gather-timber'));
  old=legacy.advanceGame(old,72);
  const g=migrate(old,{recovery:'active-idle'}),choice=camp.getGameView(g).choices.find(c=>c.id==='build-workbench');
  assert.ok(choice.unavailable); assert.throws(()=>camp.startJob(g,'build-workbench'),/capacity|fatigue/i);
});
test('chunking and JSON snapshot continuation remain exact past the old fixture horizon',()=>{
  const g=camp.requestProject(camp.createGame(),'shelter');
  const whole=camp.advanceGame(g,360); let split=g;for(let i=0;i<60;i++)split=camp.advanceGame(split,6);
  assert.deepEqual(split,whole); const saved=camp.exportGame(whole);assert.deepEqual(camp.restoreGame(JSON.parse(JSON.stringify(saved))),whole);
  assert.equal(camp.advanceToNextEvent(whole).clock.now>360,true);
});
test('stop and save stay available after many same-minute assignments',()=>{
  let g=camp.startJob(camp.createGame({solo:true}),'build-workbench');
  for(let i=0;i<600;i++)g=camp.startJob(camp.cancelJob(g),'build-workbench');
  g=camp.cancelJob(g);assert.equal(g.jobs.player,null);assert.equal(camp.advanceGame(g,1000).clock.now,1000);camp.exportGame(g);
});
test('tampered ownership, contributions, counters and unsafe JSON are rejected',()=>{
  const original=camp.advanceGame(camp.startJob(camp.createGame({solo:true}),'build-workbench'),3);
  for(const change of [g=>g.stock.food++,g=>g.work.workbench.progress+=.2,g=>g.work.workbench.contributions.player.effort=0,g=>g.stats.spent.timber++,g=>g.people.player.minutes++]){
    const g=structuredClone(original);change(g);assert.throws(()=>camp.exportGame(g));
  }
  assert.throws(()=>camp.restoreGame({get format(){throw Error('getter ran');}}),/JSON|data-only/i);
  const child={x:1},dag={format:child,version:child};assert.throws(()=>camp.restoreGame(dag),/JSON|unshared/i);
});
