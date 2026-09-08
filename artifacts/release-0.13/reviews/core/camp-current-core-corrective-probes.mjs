import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as camp from '/Users/abdul/code/human-framework/src/games/camp-current.js';
const source='/Users/abdul/code/human-framework/src/games/camp-current.js';
const hash=()=>createHash('sha256').update(readFileSync(source)).digest('hex');
const expected='1b0842a932aff34a94a30b474edfb3f862378bc378dfb54b3be3bb44db1511b5';
assert.equal(hash(),expected);
const start=(g,job)=>camp.applyCommand(g,{type:'start',job});
const restore=g=>camp.restoreGame(JSON.parse(JSON.stringify(camp.exportGame(g))));
const results=[];
function check(name,fn){try {results.push({name,passed:true,...fn()});}catch(e){results.push({name,passed:false,error:e.message,stack:e.stack});}}
check('exact current-constructor pending meal counterexample rejects',()=>{
  const g=camp.advanceGame(start(camp.createGame(),'eat'),3),saved=camp.exportGame(g);
  saved.game.paid.player.meal=0;saved.game.paid.player.recovery=3;
  saved.game.stats.mealMinutes=0;saved.game.stats.restMinutes+=3;
  let message=null;assert.throws(()=>camp.restoreGame(saved),e=>{message=e.message;return true;});
  return {error:message};
});
check('exact current-constructor completed timber effort counterexample rejects',()=>{
  const g=camp.advanceGame(start(camp.createGame(),'gather-timber'),16),saved=camp.exportGame(g);
  saved.game.paid.player.effort=0;
  let message=null;assert.throws(()=>camp.restoreGame(saved),e=>{message=e.message;return true;});
  return {error:message};
});
check('valid meal pending and completed counterparts restore and progress',()=>{
  const pending=camp.advanceGame(start(camp.createGame(),'eat'),3),loaded=restore(pending);
  assert.deepEqual(loaded,pending);assert.equal(loaded.paid.player.meal,3);
  const finished=camp.advanceGame(loaded,5);
  assert.equal(finished.people.player.pending,null);assert.equal(finished.paid.player.meal,8);
  assert.equal(finished.stats.consumedFood,1);assert.equal(finished.stock.food,3);
  assert.deepEqual(restore(finished),finished);assert.deepEqual(finished,camp.advanceGame(pending,5));
  return {pendingAt:pending.clock.now,pendingMealMinutes:pending.paid.player.meal,finishedAt:finished.clock.now,finishedMealMinutes:finished.paid.player.meal};
});
check('valid timber pending and completed counterparts restore and progress',()=>{
  const pending=camp.advanceGame(start(camp.createGame(),'gather-timber'),15),loaded=restore(pending);
  assert.deepEqual(loaded,pending);assert.equal(loaded.stock.timber,4);
  const finished=camp.advanceGame(loaded,1);
  assert.equal(finished.people.player.pending,null);assert.equal(finished.stock.timber,7);
  assert.ok(Math.abs(finished.paid.player.effort-.13)<1e-12);assert.equal(finished.stats.receipts['gather-timber'],1);
  assert.deepEqual(restore(finished),finished);assert.deepEqual(finished,camp.advanceGame(pending,1));
  return {pendingAt:pending.clock.now,finishedAt:finished.clock.now,finishedEffort:finished.paid.player.effort};
});
assert.equal(hash(),expected);
const result={source,sourceSha256:expected,scope:'Two exact current-constructor counterexamples and valid pending/completed counterparts only',results};
writeFileSync('/tmp/camp-current-core-corrective-results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
