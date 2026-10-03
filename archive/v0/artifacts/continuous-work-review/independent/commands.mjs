import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as old from '/Users/abdul/code/human-framework/.worktrees/rest-work/src/games/commons.js';
import * as w from '/Users/abdul/code/human-framework/.worktrees/rest-work/src/experiments/continuous-work/host.js';
const output=[];
for(const background of ['work','meal'])for(const mode of ['stop-first','advance-first','finish-naturally']){
 let s=w.createContinuation(old.exportGame(old.createGame()));
 s=background==='work'?w.startAssembly(s,'player','workbench'):w.beginMeal(s,'player');
 s=w.beginMeal(s,'neighbor');
 let rejected=0;
 for(let i=0;i<600;i++){
  const before=JSON.stringify(s);
  try{s=s.meals.neighbor?w.stopMeal(s,'neighbor'):w.beginMeal(s,'neighbor');}
  catch(e){assert.match(e.message,/command limit/);assert.equal(JSON.stringify(s),before);rejected++;break;}
 }
 assert.equal(rejected,1);
 s=w.restoreContinuation(JSON.parse(JSON.stringify(w.exportContinuation(s))));
 const atExhaustion={commands:s.commands.length,activeWork:s.assignments.player,meals:Object.values(s.meals).filter(Boolean).length};
 if(mode==='advance-first')s=w.advanceContinuation(s,1);
 if(mode==='finish-naturally')s=w.advanceContinuation(s,30);
 else {for(const actor of ['neighbor','player']){if(s.meals[actor])s=w.stopMeal(s,actor);if(s.assignments[actor])s=w.stopWork(s,actor);s=w.advanceContinuation(s,1);}}
 s=w.advanceContinuation(s,240-s.now);
 assert.equal(s.now,240);assert.ok(s.commands.length<=512);assert.equal(w.getContinuityView(s).nextStop.reason,'continuation-limit');
 assert.deepEqual(w.restoreContinuation(JSON.parse(JSON.stringify(w.exportContinuation(s)))),s);
 output.push({background,mode,atExhaustion,finalCommands:s.commands.length});
}
const result={node:process.version,pass:true,cases:output};console.log(JSON.stringify(result,null,2));writeFileSync(`/tmp/hf-continuous-work-review-lifecycle/commands-${process.versions.node}.json`,JSON.stringify(result,null,2));
