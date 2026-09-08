import assert from 'node:assert/strict';
import {writeFileSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as camp from '/Users/abdul/code/human-framework/src/games/camp-current.js';
const paths=['docs/camp-current-contract.md','src/games/camp-current.js','tests/camp-current.test.js'];
const hashes=Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync('/Users/abdul/code/human-framework/'+p)).digest('hex')]));
console.log(JSON.stringify({kind:'source-hashes',hashes}));
const cmd=(g,type,args={})=>camp.applyCommand(g,{type,...args});
const start=(g,job)=>cmd(g,'start',{job});
const rt=g=>camp.restoreGame(JSON.parse(JSON.stringify(camp.exportGame(g))));
const results=[];
function probe(name,fn){try {const data=fn(); results.push({name,passed:true,data});}catch(e){results.push({name,passed:false,error:e.message,stack:e.stack});}console.log(JSON.stringify(results.at(-1)));}
probe('pending meal owns its elapsed meal minutes',()=>{
  const g=camp.advanceGame(start(camp.createGame(),'eat'),3),saved=camp.exportGame(g);
  saved.game.paid.player.meal=0;saved.game.paid.player.recovery=3;
  saved.game.stats.mealMinutes=0;saved.game.stats.restMinutes+=3;
  writeFileSync('/tmp/camp-current-first-meal-counterexample.json',JSON.stringify(saved,null,2));
  assert.throws(()=>camp.restoreGame(saved),/paid|meal|time/,'current 3-minute meal with zero owned meal minutes must reject');
});
probe('restored pending meal can actually finish',()=>{
  const saved=JSON.parse(readFileSync('/tmp/camp-current-first-meal-counterexample.json'));
  const g=camp.restoreGame(saved);
  camp.advanceGame(g,5);
});
probe('completed gather owns required effort',()=>{
  const g=camp.advanceGame(start(camp.createGame(),'gather-timber'),16),saved=camp.exportGame(g);
  saved.game.paid.player.effort=0;
  writeFileSync('/tmp/camp-current-first-effort-counterexample.json',JSON.stringify(saved,null,2));
  assert.throws(()=>camp.restoreGame(saved),/paid|effort/,'completed exertive timber trip cannot have zero total paid effort');
});
probe('handover return and release retain physical work and owned practice',()=>{
  let g=camp.advanceGame(start(camp.createGame(),'build-workbench'),3);
  const original={stock:g.stock,progress:g.work.workbench.progress,people:g.people};
  g=cmd(g,'handover',{from:'player',to:'neighbor'});
  g=cmd(g,'handover',{from:'neighbor',to:'player'});
  assert.equal(g.clock.now,3);assert.deepEqual(g.people,original.people);assert.deepEqual(g.stock,original.stock);
  assert.equal(g.work.workbench.progress,original.progress);
  g=cmd(g,'release');assert.equal(g.jobs.player.project,'workbench');assert.equal(g.commitment.status,'released');
  g=camp.advanceGame(rt(g),19);assert.equal(g.structures.workbench,1);
  assert.equal(g.lastAssemblies.workbench.contributions.player.minutes,22);
  assert.equal(g.lastAssemblies.workbench.contributions.neighbor.minutes,0);
  assert.equal(g.paid.neighbor.constructionMinutes,0);assert.deepEqual(rt(g),g);
  return {now:g.clock.now,stage:g.structures.workbench};
});
probe('player readiness occurs at earliest feasible paid recovery minute',()=>{
  let saved=camp.exportGame(camp.createGame());saved.game.people.player.body.fatigue=.95;
  const g=camp.restoreGame(saved),view=camp.getGameView(g);
  assert.ok(view.choices.find(c=>c.id==='gather-timber').unavailable);
  const next=camp.advanceToNextEvent(g);
  assert.equal(next.clock.now,2);assert.equal(next.paid.player.recovery,2);
  assert.equal(camp.getGameView(next).choices.find(c=>c.id==='gather-timber').unavailable,null);
  return {nextMinute:next.clock.now,reason:view.nextStop.reason};
});
probe('single earned window pauses dispatch and rain and resumes pending work',()=>{
  let g=camp.createGame();
  for(const project of ['shelter','workbench','garden']){
    g=cmd(g,'request',{project});let n=0;
    while(g.structures[project]!==2&&n++<1000)g=camp.advanceToNextEvent(g);
    assert.equal(g.structures[project],2);
  }
  assert.equal(camp.getGameView(g).phase,'introduction');assert.equal(g.window.enteredAt,g.milestoneAt);
  assert.throws(()=>cmd(g,'dispatch'));assert.throws(()=>cmd(g,'return'));assert.throws(()=>camp.advanceGame(g,1));
  g=cmd(g,'continue');g=cmd(g,'request',{project:'cache'});
  g=camp.advanceGame(g,1440);assert.equal(g.clock.now,g.window.ferryAt);assert.equal(camp.getGameView(g).phase,'ferry');
  assert.throws(()=>cmd(g,'finish'));
  if(g.caches)g=cmd(g,'allocate',{destination:'households'});
  g=cmd(g,'dispatch');assert.throws(()=>cmd(g,'allocate',{destination:'households'}));
  g=camp.advanceGame(rt(g),1440);assert.equal(g.clock.now,g.window.rainAt);
  g=cmd(g,'finish');const before=g;g=cmd(g,'return');
  assert.deepEqual(g.people,before.people);assert.deepEqual(g.stock,before.stock);assert.deepEqual(g.jobs,before.jobs);
  const after=camp.advanceGame(rt(g),30);assert.equal(after.clock.now,g.clock.now+30);assert.deepEqual(after.window,g.window);
  assert.equal(camp.getGameView(after).phase,'camp-return');assert.deepEqual(rt(after),after);
  return {entry:g.window.enteredAt,caches:g.caches,allocations:g.window.allocations.length};
});
writeFileSync('/tmp/camp-current-core-probe-results.json',JSON.stringify({hashes,results},null,2));
