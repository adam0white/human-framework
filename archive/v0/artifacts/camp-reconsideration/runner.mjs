import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,join,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {BASE_SOURCE,BASE_ENTRY,BASE_FILES,C1_PREFIX,CANDIDATE_ENTRY,CANDIDATE_VERSION,HORIZON,TIMINGS,ARMS,PROTOCOL,HARNESS} from './cases.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const readAt=(commit,path)=>execFileSync('git',['show',`${commit}:${path}`],{maxBuffer:30e6});
const read=path=>readFileSync(path),clone=value=>structuredClone(value);
function repoPath(path){assert.equal(typeof path,'string');assert.ok(!isAbsolute(path)&&!relative(process.cwd(),resolve(path)).startsWith('..'),'Expected repository-relative path');return path;}
function materialize(files){const dir=mkdtempSync(join(tmpdir(),'hf-camp-reconsideration-'));for(const file of files){mkdirSync(dirname(join(dir,file.path)),{recursive:true});writeFileSync(join(dir,file.path),file.bytes);}writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');return dir;}
const baseSources=BASE_FILES.map(path=>{const bytes=readAt(BASE_SOURCE,path);assert.equal(sha(read(path)),sha(bytes),`Baseline source changed: ${path}`);return {path,bytes};});
const baseDir=materialize(baseSources),base=await import(pathToFileURL(join(baseDir,BASE_ENTRY)));
const runtime=await import(pathToFileURL(join(baseDir,'src/runtime/index.js')));
assert.equal(sha(read(C1_PREFIX.path)),C1_PREFIX.sha256);assert.equal(sha(readAt(BASE_SOURCE,C1_PREFIX.path)),C1_PREFIX.sha256);
const originalPrefix=JSON.parse(read(C1_PREFIX.path)).trajectory;
function fileList(){return [...BASE_FILES,...HARNESS,PROTOCOL].map(path=>({path,sha256:sha(read(path)),bytes:read(path).length}));}
function summarize(game,api,record){const view=api.getGameView(game);return {now:game.clock.now,phase:view.phase,frameAt:record.marks.find(m=>m.label==='frame-completed')?.at??null,roofAt:record.marks.find(m=>m.label==='roof-completed')?.at??null,gardenAt:record.marks.find(m=>m.label==='garden-completed')?.at??null,playerFoodTripAt:record.marks.find(m=>m.label==='player-food-trip-completed')?.at??null,stock:clone(game.stock),structures:clone(game.structures),people:clone(game.people),jobs:clone(game.jobs),work:clone(game.work),lastAssemblies:clone(game.lastAssemblies),paid:clone(game.paid),stats:clone(game.stats),commitment:clone(game.commitment),lastResponse:clone(game.lastResponse),refusalCount:record.refusals.length};}
function trajectory(api,id,initialGame=api.createGame()){
 let game=initialGame;const result={id,operations:[],states:[api.exportGame(game)],views:[api.getGameView(game)],marks:[],refusals:[],completedFixedJobs:[]};
 function act(operation){const prior=game,before=api.exportGame(game),text=JSON.stringify(game);let error=null;
  try{game=operation.kind==='advance'?api.advanceGame(game,operation.minutes):operation.kind==='next'?api.advanceToNextEvent(game):api.applyCommand(game,operation.value);}catch(e){error=e.message;}
  assert.equal(JSON.stringify(prior),text,'Input mutation');result.operations.push(clone(operation));const state=api.exportGame(game),view=api.getGameView(game);result.states.push(state);result.views.push(view);
  assert.deepEqual(api.exportGame(api.restoreGame(JSON.parse(JSON.stringify(state)))),state,'Snapshot round trip changed values');
  if(error){result.refusals.push({operationIndex:result.operations.length-1,operation:clone(operation),error,state,view});result.failure=error;throw Error(error);}
  if(operation.kind==='command'&&['request','handover'].includes(operation.value.type)&&game.lastResponse?.accepted===false)result.refusals.push({operationIndex:result.operations.length-1,operation:clone(operation),response:clone(game.lastResponse),state,view});
  for(const [project,label,target]of [['shelter','frame-completed',1],['shelter','roof-completed',2],['garden','garden-completed',2]])if(prior.structures[project]<target&&game.structures[project]>=target)result.marks.push({label,at:game.clock.now,operationIndex:result.operations.length,lastAssembly:clone(game.lastAssemblies[project])});
  if(game.clock.now>prior.clock.now)for(const actor of ['player','neighbor']){const job=prior.jobs[actor];if(job?.kind==='fixed'&&job.endsAt===game.clock.now){result.completedFixedJobs.push({actor,id:job.id,at:game.clock.now,startedAt:job.startedAt,duration:job.duration,output:clone(job.output),cost:clone(job.cost),operationIndex:result.operations.length});if(actor==='player'&&job.id==='forage')result.marks.push({label:'player-food-trip-completed',at:game.clock.now,operationIndex:result.operations.length});}}
  return game;
 }
 const command=value=>act({kind:'command',value}),advance=minutes=>act({kind:'advance',minutes});
 function finishPlayer(){for(let n=0;game.jobs.player&&game.clock.now<HORIZON&&n<200;n++)advance(1);if(game.jobs.player)throw Error('Prespecified player job did not finish by the observation horizon');}
 function finish(){result.summary=summarize(game,api,result);return result;}
 return {result,act,command,advance,finishPlayer,finish,get game(){return game;}};
}
function baselinePrefix(timing,r=trajectory(base,`${timing.id}-baseline-prefix`)){for(let i=0;i<originalPrefix.commands.length;i++){r.act(originalPrefix.commands[i]);assert.deepEqual(base.exportGame(r.game),originalPrefix.states[i+1],`Original C1 prefix state ${i+1}`);assert.deepEqual(base.getGameView(r.game),originalPrefix.views[i+1],`Original C1 prefix view ${i+1}`);}
 for(let i=0;i<1+timing.paidTripMinutes;i++)r.advance(1);const g=r.game,j=g.jobs.neighbor,w=g.work.shelter;
 assert.equal(g.clock.now,timing.cancelAt);assert.equal(g.jobs.player?.project,'shelter');assert.equal(g.structures.shelter,0);assert.equal(g.structures.workbench,1);assert.equal(g.structures.garden,1);assert.equal(g.commitment.status,'accepted');assert.equal(g.commitment.project,'shelter');assert.equal(j?.id,'gather-salvage');assert.equal(j.startedAt,85);assert.equal(j.endsAt,106);assert.equal(g.people.neighbor.pending.elapsedMinutes,timing.paidTripMinutes);
 assert.ok(g.people.neighbor.body.hunger<.65&&g.people.neighbor.body.fatigue<.68&&!g.recovering.neighbor,'Own immediate-work needs guard');
 const duration=Math.ceil((1-w.progress)*w.durationByActor.neighbor-1e-12),effort=.2*(1-w.progress),capacity=runtime.assessEffort(g.people.neighbor.body,{durationMinutes:duration,effort,exertive:true});assert.ok(capacity.allowed,'Released retained frame must be feasible');
 r.result.administrativeChecks={paidTripMinutes:timing.paidTripMinutes,remainingTripMinutes:j.endsAt-g.clock.now,remainingFrameMinutes:duration,remainingFrameEffort:effort,neighborCapacity:capacity,ownNeedsAllowWork:true,endpointPlayerCancellationExecuted:false};return r;
}
function writeNew(path,bytes){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes,{flag:'wx'});}
function writeJSON(path,value){writeNew(path,JSON.stringify(value,null,2)+'\n');}
function writeGzip(path,value){const bytes=gzipSync(JSON.stringify(value)+'\n',{level:9});writeNew(path,bytes);return {path,sha256:sha(bytes),bytes:bytes.length};}
function openOutput(path){assert.ok(path&&!existsSync(path),'Use a new output directory');mkdirSync(path,{recursive:true});}
function verifyFreeze(path){const raw=read(path),f=JSON.parse(raw);assert.equal(Buffer.compare(readAt('HEAD',relative(process.cwd(),resolve(path))),raw),0,'Freeze must be committed unchanged');const required=[...BASE_FILES,...HARNESS,PROTOCOL,CANDIDATE_ENTRY];for(const path of required)assert.ok(f.files.some(x=>x.path===path),`Freeze omits ${path}`);for(const file of f.files){repoPath(file.path);assert.equal(sha(read(file.path)),file.sha256,`Frozen working bytes: ${file.path}`);assert.equal(sha(readAt('HEAD',file.path)),file.sha256,`Frozen committed bytes: ${file.path}`);}
 repoPath(f.prefix.path);assert.equal(sha(read(f.prefix.path)),f.prefix.sha256);assert.equal(sha(readAt('HEAD',f.prefix.path)),f.prefix.sha256);const prefixSummary=JSON.parse(read(f.prefix.path));repoPath(prefixSummary.records.path);assert.equal(sha(read(prefixSummary.records.path)),prefixSummary.records.sha256);assert.equal(sha(readAt('HEAD',prefixSummary.records.path)),prefixSummary.records.sha256);const prefixes=JSON.parse(gunzipSync(read(prefixSummary.records.path)));assert.equal(prefixSummary.failure,null,'Administrative prefix failure was not admitted');return {freeze:f,freezeSha256:sha(raw),prefixSummary,prefixes};}
const [mode,arg,out]=process.argv.slice(2);
if(mode==='--prefix'){
 assert.ok(arg&&!out,'Usage: --prefix NEW_DIRECTORY');openOutput(arg);const records=[],cases=[];let failure=null;
 for(const timing of TIMINGS){let r=trajectory(base,`${timing.id}-baseline-prefix`);try{baselinePrefix(timing,r);records.push(r.finish());cases.push({...timing,administrativeChecks:r.result.administrativeChecks,beforeCancelSnapshot:base.exportGame(r.game),beforeCancelView:base.getGameView(r.game)});}catch(e){failure={id:timing.id,error:e.message};if(r)records.push(r.finish());break;}}
 const archive=writeGzip(join(arg,'prefix-records.json.gz'),{sourceCommit:BASE_SOURCE,records});writeJSON(join(arg,'prefixes.json'),{sourceCommit:BASE_SOURCE,sourceFiles:fileList(),originalC1Prefix:C1_PREFIX,horizon:HORIZON,scope:'Four baseline administrative prefixes only; no nominated endpoint player cancellation or comparison arm executed. Earlier C1 prefix cancellations are replayed.',records:archive,cases,failure});if(failure)throw Error(JSON.stringify(failure));console.log(JSON.stringify({status:'administrative-prefixes-legal',cases:cases.map(c=>({id:c.id,at:c.cancelAt,paidTripMinutes:c.paidTripMinutes,remainingFrameMinutes:c.administrativeChecks.remainingFrameMinutes}))}));
}else if(mode==='--run'){
 assert.ok(arg&&out,'Usage: --run COMMITTED_FREEZE.json NEW_DIRECTORY');const bound=verifyFreeze(arg);openOutput(out);const candidateSources=bound.freeze.files.filter(file=>file.path.endsWith('.js')).map(file=>({path:file.path,bytes:read(file.path)})),candidateDir=materialize(candidateSources),candidate=await import(pathToFileURL(join(candidateDir,CANDIDATE_ENTRY)));
 const records=[],summaries=[];let failure=null;
 for(const timing of TIMINGS){for(const arm of ARMS){let r,prefix;try{const fresh=trajectory(base,`${timing.id}-baseline-prefix`);prefix=fresh.result;baselinePrefix(timing,fresh);prefix=fresh.finish();const frozen=bound.prefixes.records.find(x=>x.id===prefix.id);assert.deepEqual(prefix,frozen,'Exact baseline-produced prefix differs');const original=base.exportGame(fresh.game),api=arm==='automatic-reconsideration'?candidate:base,initial=arm==='automatic-reconsideration'?candidate.fromBaseline(original):fresh.game;
  const expected=clone(original);if(arm==='automatic-reconsideration')expected.game.version=CANDIDATE_VERSION;assert.deepEqual(api.exportGame(initial),expected,'Boundary adapter changed more than explicit host version');
  r=trajectory(api,`${timing.id}/${arm}`,initial);r.result.caseId=timing.id;r.result.arm=arm;r.result.baselinePrefix=prefix;r.result.boundary={type:arm==='automatic-reconsideration'?'fromBaseline-version-only':'unchanged-baseline',inputSnapshot:original,outputSnapshot:api.exportGame(initial),candidateAlwaysOnPrefixClaim:false};r.result.marks.push({label:'before-player-cancellation',at:initial.clock.now,operationIndex:0});
  r.command({type:'cancel'});r.result.marks.push({label:'after-player-cancellation',at:r.game.clock.now,operationIndex:r.result.operations.length});
  if(arm==='release-and-rerequest'){r.command({type:'release'});r.command({type:'request',project:'shelter'});r.result.marks.push({label:'after-existing-release-and-rerequest',at:r.game.clock.now,operationIndex:r.result.operations.length,response:clone(r.game.lastResponse)});}
  r.command({type:'start',job:'build-garden'});r.finishPlayer();r.command({type:'start',job:'forage'});r.finishPlayer();while(r.game.clock.now<HORIZON)r.advance(1);assert.equal(r.game.clock.now,HORIZON);records.push(r.finish());summaries.push({caseId:timing.id,arm,...r.result.summary});
 }catch(e){failure={caseId:timing.id,arm,error:e.message};if(r)records.push(r.finish());else if(prefix)records.push({caseId:timing.id,arm,baselinePrefix:prefix,failure:e.message});break;}}if(failure)break;}
 const archive=writeGzip(join(out,'comparison-records.json.gz'),{sourceCommit:BASE_SOURCE,freezeSha256:bound.freezeSha256,records});writeJSON(join(out,'summary.json'),{sourceCommit:BASE_SOURCE,freezeSha256:bound.freezeSha256,sourceFiles:bound.freeze.files,horizon:HORIZON,comparisonType:'Shared baseline-produced before-cancellation states; candidate version-only boundary transfer, not an always-on fresh policy rollout.',records:archive,summaries,failure});if(failure)throw Error(JSON.stringify(failure));console.log(JSON.stringify({status:'comparison-recorded',records:records.length,summary:join(out,'summary.json')}));
}else throw Error('Use --prefix NEW_DIRECTORY or --run COMMITTED_FREEZE.json NEW_DIRECTORY');
