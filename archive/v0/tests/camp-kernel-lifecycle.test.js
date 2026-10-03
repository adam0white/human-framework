import test from 'node:test';
import assert from 'node:assert/strict';
import * as camp from '../src/games/camp.js';
import * as legacy from '../src/games/commons.js';
import {chooseCommand} from '../src/games/commons-policy.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('Next Event goes directly to assigned job completion when there is no earlier meaningful event',()=>{
  const g=camp.startJob(camp.createGame({solo:true}),'gather-timber');
  assert.equal(camp.getGameView(g).nextEventAt,16);
  assert.equal(camp.advanceToNextEvent(g).clock.now,16);
  assert.equal(camp.advanceToNextEvent(camp.createGame({solo:true})).clock.now,6);
});
test('taking Meryem work records her acceptance of the player relief offer',()=>{
  let g=camp.advanceGame(camp.requestProject(camp.createGame(),'workbench'),2);
  g=camp.requestHandover(g,'neighbor','player');
  assert.equal(g.lastResponse.accepted,true);assert.match(g.lastResponse.reason,/Meryem accepted your offer/i);
  assert.equal(g.jobs.neighbor,null);assert.equal(g.jobs.player.project,'workbench');
});
test('an unwilling busy neighbor can refuse handover without any paid or physical mutation',()=>{
  let g=camp.requestProject(camp.createGame(),'garden');g=camp.startJob(g,'build-workbench');
  const after=camp.requestHandover(g);assert.equal(after.lastResponse.accepted,false);
  for(const key of ['work','people','stock','paid','jobs','clock','commitment'])assert.deepEqual(after[key],g[key]);
});
test('paid practice and effort totals cannot be erased or fabricated in a snapshot',()=>{
  const original=camp.advanceGame(camp.startJob(camp.createGame({solo:true}),'build-workbench'),3);
  for(const change of [g=>g.people.player.skills.construction=.9,g=>g.paid.player.effort=0]){
    const g=structuredClone(original);change(g);assert.throws(()=>camp.exportGame(g),/practice|effort|paid/i);
  }
});
test('coordinated fabricated gathering receipts still require paid work',()=>{
  const g=camp.createGame({solo:true});g.stock.food+=2;g.stats.gathered.food+=2;g.stats.receipts.forage++;g.stats.started++;g.stats.completed++;
  assert.throws(()=>camp.exportGame(g),/paid|receipt/i);
});
test('a stopped stage resumes with no second material payment even after another worker contributes',()=>{
  let g=camp.advanceGame(camp.startJob(camp.createGame(),'build-workbench'),4);const stock=structuredClone(g.stock);
  g=camp.requestHandover(g);g=camp.advanceGame(g,2);g=camp.releaseProject(g);
  const fraction=g.work.workbench.progress;g=camp.startJob(g,'build-workbench');
  assert.deepEqual(g.stock,stock);assert.equal(g.work.workbench.progress,fraction);
  g=camp.advanceGame(g,16);assert.equal(g.structures.workbench,1);
  const receipt=g.lastAssemblies.workbench;
  close(Object.values(receipt.contributions).reduce((n,c)=>n+c.effort,0),.2);
  assert.equal(receipt.contributions.neighbor.minutes,2);
});
test('automatic recovery never feeds a hungry solo actor or relaxes hunger capacity',()=>{
  let g=camp.advanceGame(camp.createGame({solo:true}),500);
  assert.equal(g.people.player.body.hunger,1);assert.equal(g.people.player.body.fatigue,0);assert.equal(g.stock.food,4);
  assert.throws(()=>camp.startJob(g,'build-workbench'),/hunger/i);
  g=camp.advanceGame(camp.startJob(g,'forage'),14);assert.equal(g.stock.food,6);
});
test('invalid options identities oversized trees and accessors do not mutate saved state',()=>{
  assert.throws(()=>camp.createGame({recovery:'free-food'}));assert.throws(()=>camp.createGame({solo:1}));
  const g=camp.createGame();assert.throws(()=>camp.startJob(g,['forage']));assert.throws(()=>camp.requestProject(g,['shelter']));
  const save=camp.exportGame(g);save.game.recent=[{at:0,actor:'world',message:'x'.repeat(262144)}];assert.throws(()=>camp.restoreGame(save),/JSON size/i);
  assert.deepEqual(camp.createGame(),g);
});

test('the actual stock-first milestone migrates its live gather without granting a new shelter bonus',()=>{
  let old=legacy.createGame();
  for(let i=0;i<500&&old.milestoneAt===null;i++){
    const cmd=chooseCommand(legacy.getGameView(old),'stock-first');
    if(cmd.type==='start')old=legacy.startJob(old,cmd.jobId);
    else if(cmd.type==='request')old=legacy.requestProject(old,cmd.projectId);
    else old=legacy.advanceToNextEvent(old);
  }
  assert.equal(old.clock.now,226);assert.equal(old.jobs.player.id,'gather-timber');assert.equal(old.jobs.neighbor.id,'rest');
  assert.equal(old.people.player.pending.elapsedMinutes,4);assert.equal(old.jobs.player.output.timber,3);
  const g=camp.migrateLegacyGame(legacy.exportGame(old)),due=old.jobs.player.endsAt;
  assert.equal(g.jobs.player.output.timber,3);assert.equal(g.jobs.neighbor,null);assert.equal(g.jobs.player.endsAt,due);
  const future=camp.advanceGame(g,due-g.clock.now);assert.equal(future.stock.timber,g.stock.timber+3);
  assert.deepEqual(g.people.neighbor.body,old.people.neighbor.body);
});

test('fixed attempt counter reservation retains stop save and automatic progression',()=>{
  let g=camp.createGame({solo:true});g.people.player.nextAttempt=Number.MAX_SAFE_INTEGER-1e9;
  const choice=camp.getGameView(g).choices.find(c=>c.id==='eat');assert.ok(choice.unavailable);
  assert.throws(()=>camp.startJob(g,'eat'),/counter|reserved/i);
  g=camp.startJob(g,'build-workbench');g=camp.cancelJob(g);
  const future=camp.advanceGame(camp.restoreGame(camp.exportGame(g)),100);
  assert.equal(future.clock.now,100);
});
