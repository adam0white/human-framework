import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

const SOURCE='fe540daccd5e6e5e81ce850f2aef4baab902fca3';
const RUNNER='artifacts/practice-incentive/construction/runner.mjs';
const PROTOCOL='docs/practice-construction-protocol.md';
const PREFIX=[
 {kind:'command',value:{type:'start',job:'build-workbench'}},
 {kind:'command',value:{type:'request',project:'garden'}},
 {kind:'advance',minutes:22},
 {kind:'advance',minutes:4},
 {kind:'command',value:{type:'start',job:'gather-salvage'}},
 {kind:'advance',minutes:6},
 {kind:'command',value:{type:'release'}},
 {kind:'advance',minutes:16},
 {kind:'command',value:{type:'start',job:'build-garden'}},
 {kind:'command',value:{type:'request',project:'shelter'}},
 {kind:'advance',minutes:20},
 {kind:'command',value:{type:'handover',from:'neighbor',to:'player'}},
 {kind:'advance',minutes:3},
 {kind:'command',value:{type:'cancel'}},
 {kind:'advance',minutes:12},
 {kind:'command',value:{type:'handover',from:'neighbor',to:'player'}}
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const at=(commit,path)=>execFileSync('git',['show',`${commit}:${path}`],{maxBuffer:20e6});
const sources=new Map();
function visit(path){if(sources.has(path))return;const bytes=at(SOURCE,path);sources.set(path,bytes);for(const match of bytes.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))visit(relative(process.cwd(),resolve(dirname(path),match[1])));}
visit('src/games/camp-current.js');
for(const [path,bytes]of sources)assert.equal(sha(readFileSync(path)),sha(bytes),`Physical source changed: ${path}`);
const dir=mkdtempSync(join(tmpdir(),'hf-practice-construction-'));
for(const [path,bytes]of sources){mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),bytes);}
writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
const api=await import(pathToFileURL(join(dir,'src/games/camp-current.js')));
const sourceFiles=[...sources].map(([path,bytes])=>({path,sha256:sha(bytes),bytes:bytes.length}));
function summary(game){const view=api.getGameView(game);return {now:view.now,phase:view.phase,stock:game.stock,structures:game.structures,caches:game.caches,people:game.people,jobs:game.jobs,work:game.work,lastAssemblies:game.lastAssemblies,paid:game.paid,stats:game.stats,commitment:game.commitment,choices:view.choices,nextStop:view.nextStop};}
function record(id){let game=api.createGame();const out={id,commands:[],states:[api.exportGame(game)],views:[api.getGameView(game)],refusals:[],marks:[]};
 function act(command){const before=JSON.stringify(game);try{const next=command.kind==='advance'?api.advanceGame(game,command.minutes):command.kind==='next'?api.advanceToNextEvent(game):api.applyCommand(game,command.value);assert.equal(JSON.stringify(game),before,'Input mutation');game=next;out.commands.push(structuredClone(command));const state=api.exportGame(game);assert.deepEqual(api.exportGame(api.restoreGame(JSON.parse(JSON.stringify(state)))),state);out.states.push(state);out.views.push(api.getGameView(game));if(command.kind==='command'&&['request','handover'].includes(command.value.type)&&game.lastResponse?.accepted===false)out.refusals.push({commandIndex:out.commands.length-1,command,response:game.lastResponse,state,view:api.getGameView(game)});return game;}catch(error){assert.equal(JSON.stringify(game),before,'Failed command mutated input');out.refusals.push({commandIndex:out.commands.length,command,error:error.message,state:api.exportGame(game),view:api.getGameView(game)});out.unexpectedError=error.message;throw error;}}
 const command=value=>act({kind:'command',value}),advance=minutes=>act({kind:'advance',minutes});
 function mark(label){out.marks.push({label,commandIndex:out.commands.length,summary:summary(game)});}
 function finishRecord(){out.summary=summary(game);return out;}
 function prefix(){for(const step of PREFIX)act(step);assert.equal(game.clock.now,83);assert.equal(game.paid.player.constructionMinutes,45);assert.deepEqual(game.structures,{shelter:0,workbench:1,garden:1});assert.equal(game.jobs.player?.project,'shelter');assert.ok(game.work.shelter.progress>0&&game.work.shelter.progress<1);assert.equal(game.work.shelter.durationByActor.player,24);assert.equal(game.work.garden,undefined);assert.equal(game.people.player.skills.construction<.25,true);assert.equal(api.getGameView(game).choices.find(c=>c.id==='build-garden').duration,26);assert.equal(out.refusals.length,0);mark('C1-common-prefix');return game;}
 function until(time){assert.ok(time>=game.clock.now);if(time>game.clock.now)advance(time-game.clock.now);assert.equal(game.clock.now,time);}
 function completePlayer(label){for(let n=0;game.jobs.player&&n<40;n++)act({kind:'next'});assert.equal(game.jobs.player,null,`${label}: bounded completion`);mark(label);}
 return {out,act,command,advance,mark,finishRecord,prefix,until,completePlayer,get game(){return game;}};
}
function writeNew(path,payload){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(payload,null,2)+'\n',{flag:'wx'});}
function checkFreeze(path){const raw=readFileSync(path),freeze=JSON.parse(raw),relativePath=relative(process.cwd(),resolve(path));assert.equal(Buffer.compare(at('HEAD',relativePath),raw),0,'Freeze must be committed unchanged at HEAD');
 const required=[RUNNER,PROTOCOL,...sources.keys()];for(const needed of required)assert.ok(freeze.files.some(file=>file.path===needed),`Freeze omits ${needed}`);
 for(const file of freeze.files){assert.equal(sha(readFileSync(file.path)),file.sha256,`Frozen working file: ${file.path}`);assert.equal(sha(at('HEAD',file.path)),file.sha256,`Frozen committed file: ${file.path}`);}
 assert.equal(sha(readFileSync(freeze.prefix.path)),freeze.prefix.sha256,'Frozen prefix hash');assert.equal(sha(at('HEAD',freeze.prefix.path)),freeze.prefix.sha256,'Prefix must be committed');return {freeze,freezeSha256:sha(raw),prefix:JSON.parse(readFileSync(freeze.prefix.path))};}
const [mode,arg,outPath]=process.argv.slice(2);
if(mode==='--prefix'){
 assert.ok(arg&&!outPath,'Usage: --prefix NEW_PREFIX.json');assert.equal(existsSync(arg),false,'Preserve existing prefix evidence');const r=record('C1-administrative-prefix');let failure=null;try{r.prefix();}catch(error){failure=error.message;}
 writeNew(arg,{sourceCommit:SOURCE,sourceFiles,runnerSha256:sha(readFileSync(RUNNER)),protocolSha256:sha(readFileSync(PROTOCOL)),scope:'One nominated default prefix; no comparison arms executed.',trajectory:r.finishRecord(),failure});
 if(failure)throw Error(failure);console.log(JSON.stringify({status:'prefix-legal',at:r.game.clock.now,constructionMinutes:r.game.paid.player.constructionMinutes,commands:r.out.commands.length,refusals:r.out.refusals.length}));
}else if(mode==='--run'){
 assert.ok(arg&&outPath,'Usage: --run COMMITTED_FREEZE.json NEW_OUTPUT.json');assert.equal(existsSync(outPath),false,'Preserve earlier comparison evidence');const bound=checkFreeze(arg),trajectories=[];let failure=null;
 for(const id of ['finish-woodshed-first','garden-immediately','one-minute-construction-then-garden','one-minute-recovery-then-garden']){
  const r=record(id);try{r.prefix();assert.deepEqual(r.out.states,bound.prefix.trajectory.states,'Full frozen paid prefix differs');assert.deepEqual(r.out.views,bound.prefix.trajectory.views,'Frozen player views differ');
   if(id==='finish-woodshed-first')r.completePlayer('woodshed-first-stage-complete');
   else if(id==='one-minute-construction-then-garden'){r.advance(1);r.mark('one-paid-construction-minute');r.command({type:'cancel'});}
   else{r.command({type:'cancel'});if(id==='one-minute-recovery-then-garden'){r.advance(1);r.mark('one-paid-recovery-minute');}}
   r.command({type:'start',job:'build-garden'});r.mark('new-garden-stage-admitted');r.completePlayer('garden-complete');
   r.command({type:'start',job:'forage'});r.mark('first-enhanced-food-trip-admitted');r.completePlayer('first-enhanced-food-trip-complete');
   r.until(160);r.mark('common-observation-160');
  }catch(error){failure={id,error:error.message};}trajectories.push(r.finishRecord());if(failure)break;
 }
 writeNew(outPath,{sourceCommit:SOURCE,sourceFiles,freezeSha256:bound.freezeSha256,runnerSha256:sha(readFileSync(RUNNER)),protocolSha256:sha(readFileSync(PROTOCOL)),objective:'Complete the garden and one actual garden-enhanced food trip; observe every continuing physical state at minute160.',trajectories,failure});if(failure)throw Error(JSON.stringify(failure));console.log(JSON.stringify({status:'compared',trajectories:trajectories.map(r=>({id:r.id,at:r.summary.now,commands:r.commands.length,refusals:r.refusals.length}))}));
}else throw Error('Use --prefix NEW_PREFIX.json or --run COMMITTED_FREEZE.json NEW_OUTPUT.json');
