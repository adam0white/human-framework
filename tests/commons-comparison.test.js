import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,getGameView,exportGame,restoreGame,startJob,advanceGame} from '../src/games/commons.js';
import {CONDITIONS,createCondition,chooseRival,runTrial,runComparison} from '../src/experiments/commons-comparison.js';

const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};

test('every development condition is legal, reproducible, and independent of policy choice',()=>{
  for(const condition of CONDITIONS.filter(c=>c.partition==='development'))for(const solo of [false,true]){
    const a=createCondition(condition.id,{solo}),b=createCondition(condition.id,{solo});
    assert.deepEqual(a,b);assert.deepEqual(restoreGame(exportGame(a)),a);
    assert.equal(a.solo,solo);
  }
  assert.equal(createCondition('food-spent',{solo:true}).stock.food,0);
  const interrupted=createCondition('interrupted',{solo:true});
  assert.equal(interrupted.clock.now,9);assert.equal(interrupted.stats.canceled,1);
  assert.equal(interrupted.structures.shelter,0);assert.deepEqual(interrupted.stock,{timber:4,salvage:2,food:4});
});

test('rival accepts only the detached public view and cannot mutate it or the world',()=>{
  const game=createGame(),before=structuredClone(game),view=freeze(getGameView(game));
  assert.equal(chooseRival(view).type,'request');
  assert.deepEqual(game,before);
  const solo=freeze(getGameView(createGame({solo:true})));
  assert.equal(chooseRival(solo).type,'start');
  assert.equal(Object.hasOwn(solo,'clock'),false);assert.equal(Object.hasOwn(solo.people.player,'nextAttempt'),false);
});

test('reserved trials require deliberate unsealing rather than being part of default development',()=>{
  assert.throws(()=>runTrial({conditionId:'abandoned-660',solo:true,policy:'project-pull'}),/reserved|sealed/i);
  assert.throws(()=>runComparison({partition:'reserved'}),/reserved|sealed/i);
});

test('checkpoints use exact time budgets without altering underlying command opportunities',()=>{
  const result=runTrial({conditionId:'fresh',solo:true,policy:'project-pull',budgetMinutes:120,checkpoints:[17,61,120]});
  assert.deepEqual(result.checkpoints.map(c=>c.elapsed),[17,61,120]);
  assert.equal(result.final.elapsed,120);
  const without=runTrial({conditionId:'fresh',solo:true,policy:'project-pull',budgetMinutes:120,checkpoints:[120]});
  assert.deepEqual(result.commands,without.commands);assert.deepEqual(result.final,without.final);
});

test('command rejection and zero-time request loops remain explicit partial outcomes',()=>{
  const illegal=runTrial({conditionId:'fresh',solo:true,controller:()=>({type:'start',jobId:'build-garden'}),budgetMinutes:120});
  assert.equal(illegal.status,'rejected-command');assert.equal(illegal.final.elapsed,0);
  assert.equal(illegal.rejectedCommands,1);assert.equal(illegal.final.deltaStats.workMinutes,0);
  const loop=runTrial({conditionId:'fresh',solo:false,controller:()=>({type:'request',projectId:'cache'}),budgetMinutes:120});
  assert.equal(loop.status,'zero-time-loop');assert.equal(loop.final.elapsed,0);
  assert.equal(loop.commands.length,9);assert.equal(loop.final.deltaStats.consumedFood,0);
});

test('a prescribed legal command prefix reproduces exactly under the comparison dispatcher',()=>{
  const plan=[{type:'start',jobId:'gather-timber'},{type:'advance'}];let i=0;
  const trial=runTrial({conditionId:'fresh',solo:true,controller:()=>plan[i++]??{type:'advance'},budgetMinutes:16,checkpoints:[5,16]});
  const expected=advanceGame(startJob(createGame({solo:true}),'gather-timber'),16);
  assert.deepEqual(trial.finalState,exportGame(expected));
  assert.equal(trial.final.deltaStats.receipts['gather-timber'],1);
});

test('all three fresh-world controllers remain live through ongoing production and keep active state bounded',()=>{
  for(const policy of ['build-first','stock-first','project-pull'])for(const solo of [true,false]){
    const trial=runTrial({policy,solo});
    assert.equal(trial.status,'budget');assert.equal(trial.rejectedCommands,0);
    assert.equal(trial.final.elapsed,1440);assert.ok(trial.final.caches>0);
    assert.ok(trial.maxSaveBytes<11000);assert.ok(trial.maxPendingEvents<=(solo?1:2));
  }
});

test('capacity rejection grants no mandatory rest, meal, or fabricated elapsed work',()=>{
  const trial=runTrial({solo:true,controller:view=>view.people.player.job?{type:'advance'}:{type:'start',jobId:'gather-timber'}});
  assert.equal(trial.status,'rejected-command');assert.equal(trial.rejectedCommands,1);
  assert.match(trial.commands.at(-1).error,/fatigue/);assert.equal(trial.commands.at(-1).errorOrigin,'host');
  assert.equal(trial.final.deltaStats.restMinutes,0);assert.equal(trial.final.deltaStats.mealMinutes,0);
  assert.equal(trial.final.deltaStats.consumedFood,0);
  assert.equal(trial.commands.at(-1).advanced,0);assert.equal(trial.final.elapsed,trial.commands.at(-1).elapsed);
});

test('invalid policy commands and exceptions are distinguished from host rejection',()=>{
  const trial=runTrial({controller:()=>({type:'grant',food:100})});
  assert.equal(trial.status,'policy-error');assert.equal(trial.commands[0].errorOrigin,'policy');
  assert.equal(trial.final.elapsed,0);assert.deepEqual(trial.finalState,trial.initialState);
});
