// Independent API replay; imports neither comparison runner nor its summaries.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as camp from '../../src/games/camp-current.js';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const [output,...inputs]=process.argv.slice(2);
assert.ok(output&&inputs.length,'Usage: replay.mjs NEW_OUTPUT.json INPUT.json ...');
const apply=(game,op)=>op.kind==='advance'?camp.advanceGame(game,op.minutes):op.kind==='next'?camp.advanceToNextEvent(game):camp.applyCommand(game,op.value);
let stateChecks=0,viewChecks=0,refusalChecks=0,markChecks=0;
function summary(record,game,view,states){
 for(const [key,value] of Object.entries(record)){
  if(key==='status')continue;
  if(key==='objective'){
   const first=states.find(state=>state.game.stock.timber>=value.heldTimberAtLeast)?.game.clock.now??null;
   assert.equal(value.firstReachedAt,first);assert.equal(value.met,game.stock.timber>=value.heldTimberAtLeast);
  }else if(['now','phase','choices','nextStop'].includes(key))assert.deepEqual(value,view[key],`Summary ${key}`);
  else {assert.ok(Object.hasOwn(game,key),`Unverified summary key ${key}`);assert.deepEqual(value,game[key],`Summary ${key}`);}
 }
}
const files=[];
for(const input of inputs){
 const bytes=readFileSync(input),envelope=JSON.parse(bytes);
 for(const source of envelope.sourceFiles??[])assert.equal(hash(readFileSync(source.path)),source.sha256,`Source ${source.path}`);
 const records=envelope.trajectories??[envelope.trajectory];
 const checked=[];
 for(const record of records){
  assert.ok(record);let game=camp.createGame();const states=[],views=[];
  assert.equal(record.states.length,record.commands.length+1);assert.equal(record.views.length,record.states.length);
  function check(index){const state=camp.exportGame(game),view=camp.getGameView(game);assert.deepEqual(state,record.states[index]);assert.deepEqual(view,record.views[index]);assert.deepEqual(camp.exportGame(camp.restoreGame(JSON.parse(JSON.stringify(state)))),state);states.push(state);views.push(view);stateChecks++;viewChecks++;}
  check(0);
  for(const [i,op] of record.commands.entries()){
   const before=camp.exportGame(game);
   try{game=apply(game,op);}catch(error){const refusal=record.refusals.find(r=>r.atStep===i);assert.ok(refusal,'Unexpected refusal');assert.equal(error.message,refusal.message);assert.deepEqual(camp.exportGame(game),before);refusalChecks++;}
   check(i+1);
  }
  for(const refusal of record.refusals){
   if(refusal.commandIndex===record.commands.length&&refusal.error){const before=camp.exportGame(game);assert.throws(()=>apply(game,refusal.command),error=>error.message===refusal.error);assert.deepEqual(camp.exportGame(game),before);refusalChecks++;}
   else if(refusal.response){const state=states[refusal.commandIndex+1];assert.deepEqual(state.game.lastResponse,refusal.response);assert.equal(refusal.response.accepted,false);refusalChecks++;}
  }
  summary(record.summary,game,views.at(-1),states);
  for(const mark of record.marks??[]){const at=mark.commandIndex;assert.ok(states[at]);summary(mark.summary,states[at].game,views[at],states.slice(0,at+1));markChecks++;}
  checked.push({id:record.id,commands:record.commands.length,states:record.states.length,refusals:record.refusals.length,finalMinute:game.clock.now});
 }
 files.push({input,sha256:hash(bytes),trajectories:checked});
}
const report={status:'passed',node:process.version,scope:'Independent direct API replay of every recorded state/view, JSON restore, summary physical fields/objective, marks and recorded refusals. No new comparison conditions.',stateChecks,viewChecks,markChecks,refusalChecks,files,verifierSha256:hash(readFileSync(new URL(import.meta.url)))};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,stateChecks,viewChecks,markChecks,refusalChecks,trajectories:files.reduce((n,f)=>n+f.trajectories.length,0)}));
