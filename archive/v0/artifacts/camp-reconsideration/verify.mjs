// Independent recorded-history verification. This module never imports the comparison runner.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve,relative,dirname,join,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const options={},args=process.argv.slice(2);
for(let i=0;i<args.length;i+=2){assert(['--freeze','--summary','--out'].includes(args[i]),'Unknown argument');assert(args[i+1],'Missing argument');options[args[i].slice(2)]=args[i+1];}
assert(options.freeze&&options.summary&&options.out,'Use --freeze COMMITTED_FREEZE --summary SUMMARY.json --out NEW_AUDIT.json');
const output=resolve(options.out);assert(!existsSync(output),'Audit output already exists');
const clone=structuredClone,sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFileSync(resolve(root,path));
const git=path=>execFileSync('git',['show','HEAD:'+relative(root,resolve(root,path))],{cwd:root,maxBuffer:40e6});
function within(path){const r=relative(root,resolve(root,path));assert(r&&!isAbsolute(r)&&r!=='..'&&!r.startsWith('../'),'Expected path inside repository');return r;}
function bound(item,committed=false){within(item.path);const bytes=read(item.path);assert.equal(sha(bytes),item.sha256,'Hash: '+item.path);if(item.bytes!==undefined)assert.equal(bytes.length,item.bytes,'Bytes: '+item.path);if(committed)assert.deepEqual(bytes,git(item.path),'Committed identity: '+item.path);return bytes;}
const report={scope:'Independent API replay of frozen recorded histories only; no comparison-runner import, new condition, policy change or replacement outcome.',startedAt:new Date().toISOString(),node:process.version,verifierSha256:sha(readFileSync(fileURLToPath(import.meta.url))),counts:{administrativeRecords:0,comparisonRecords:0,prefixReplays:0,states:0,views:0,restores:0,operations:0,completionMarks:0,fixedJobRecords:0,refusals:0,versionOnlyBoundaries:0},cases:[],passed:false,failure:null};
let temporary;

function validateSnapshot(api,game,record,index,label){
  const exported=api.exportGame(game);assert.deepEqual(exported,record.states[index],label+' state '+index);report.counts.states++;
  const view=api.getGameView(game);assert.deepEqual(view,record.views[index],label+' view '+index);report.counts.views++;
  const restored=api.restoreGame(JSON.parse(JSON.stringify(record.states[index])));assert.deepEqual(api.exportGame(restored),exported,label+' restored state '+index);assert.deepEqual(api.getGameView(restored),view,label+' restored view '+index);report.counts.restores++;
}
const completionDefinitions=[['shelter',1,'frame-completed'],['shelter',2,'roof-completed'],['garden',2,'garden-completed']];
function derivedEvents(before,after,index){
  const marks=[],fixed=[];
  for(const [project,level,label] of completionDefinitions){
    if(before.structures[project]<level&&after.structures[project]>=level){
      const assembly=after.lastAssemblies[project];assert(assembly&&assembly.progress===1,'Completion needs a finished assembly');
      marks.push({label,at:after.clock.now,operationIndex:index,lastAssembly:clone(assembly)});
    }
  }
  if(after.clock.now>before.clock.now){
    for(const actor of ['player','neighbor']){
      const job=before.jobs[actor];
      if(job?.kind==='fixed'&&job.endsAt===after.clock.now){
        assert(after.stats.receipts[job.id]>before.stats.receipts[job.id],'Finished task lacks its receipt');
        fixed.push({actor,id:job.id,at:after.clock.now,startedAt:job.startedAt,duration:job.duration,output:clone(job.output),cost:clone(job.cost),operationIndex:index});
        if(actor==='player'&&job.id==='forage')marks.push({label:'player-food-trip-completed',at:after.clock.now,operationIndex:index});
      }
    }
  }
  return {marks,fixed};
}
function perform(api,game,operation){
  assert(operation&&typeof operation==='object');
  if(operation.kind==='command'){assert.deepEqual(Object.keys(operation).sort(),['kind','value']);return api.applyCommand(game,operation.value);}
  if(operation.kind==='advance'){assert.deepEqual(Object.keys(operation).sort(),['kind','minutes']);return api.advanceGame(game,operation.minutes);}
  if(operation.kind==='next'){assert.deepEqual(Object.keys(operation),['kind']);return api.advanceToNextEvent(game);}
  assert.fail('Unknown recorded operation '+operation.kind);
}
function replay(api,initial,record,label){
  assert.equal(record.states.length,record.operations.length+1,label+' state count');assert.equal(record.views.length,record.states.length,label+' view count');
  let game=initial;const marks=[],fixed=[],refusals=[];validateSnapshot(api,game,record,0,label);
  for(let index=0;index<record.operations.length;index++){
    const op=record.operations[index],before=game,original=api.exportGame(before);let error=null;
    try{game=perform(api,before,op);}catch(e){error=e.message;game=before;}
    assert.deepEqual(api.exportGame(before),original,label+' mutated input '+index);validateSnapshot(api,game,record,index+1,label);report.counts.operations++;
    if(error){assert.equal(index,record.operations.length-1,'Error must end recorded trajectory');assert.equal(record.failure,error);refusals.push({operationIndex:index,operation:clone(op),error,state:api.exportGame(game),view:api.getGameView(game)});}
    else{
      if(op.kind==='command'&&['request','handover'].includes(op.value.type)&&game.lastResponse?.accepted===false)refusals.push({operationIndex:index,operation:clone(op),response:clone(game.lastResponse),state:api.exportGame(game),view:api.getGameView(game)});
      const events=derivedEvents(before,game,index+1);marks.push(...events.marks);fixed.push(...events.fixed);
    }
  }
  assert.deepEqual(refusals,record.refusals,label+' refusals');assert.deepEqual(fixed,record.completedFixedJobs,label+' fixed-task completions');
  const recordedCompletions=record.marks.filter(m=>completionDefinitions.some(d=>d[2]===m.label)||m.label==='player-food-trip-completed');assert.deepEqual(marks,recordedCompletions,label+' completion marks');
  report.counts.completionMarks+=marks.length;report.counts.fixedJobRecords+=fixed.length;report.counts.refusals+=refusals.length;
  const first=label=>marks.find(m=>m.label===label)?.at??null,summary={now:game.clock.now,phase:api.getGameView(game).phase,frameAt:first('frame-completed'),roofAt:first('roof-completed'),gardenAt:first('garden-completed'),playerFoodTripAt:first('player-food-trip-completed')};
  for(const key of ['stock','structures','people','jobs','work','lastAssemblies','paid','stats','commitment','lastResponse'])summary[key]=clone(game[key]);summary.refusalCount=refusals.length;
  assert.deepEqual(summary,record.summary,label+' independently reconstructed summary');return {game,summary,marks};
}

try{
  const freezeBytes=read(options.freeze);assert.deepEqual(freezeBytes,git(options.freeze),'Freeze must be committed unchanged');const freeze=JSON.parse(freezeBytes);report.freezeSha256=sha(freezeBytes);report.freezePath=within(options.freeze);
  const required=['src/core/model.js','src/games/camp-current.js','src/human/v0.1.1.js','src/runtime/clock.js','src/runtime/index.js','src/experiments/camp-reconsideration/host.js'];
  assert.equal(new Set(freeze.files.map(f=>f.path)).size,freeze.files.length,'Duplicate freeze path');for(const path of required)assert(freeze.files.some(f=>f.path===path),'Missing frozen API source '+path);
  for(const file of freeze.files)bound(file,true);
  temporary=mkdtempSync(join(tmpdir(),'hf-reconsideration-independent-'));
  for(const file of freeze.files.filter(f=>f.path.startsWith('src/')&&f.path.endsWith('.js'))){const path=join(temporary,within(file.path));mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bound(file,true));}
  writeFileSync(join(temporary,'package.json'),'{"type":"module"}\n');
  const baseline=await import(pathToFileURL(join(temporary,'src/games/camp-current.js'))),candidate=await import(pathToFileURL(join(temporary,'src/experiments/camp-reconsideration/host.js'))),runtime=await import(pathToFileURL(join(temporary,'src/runtime/index.js')));
  assert.equal(baseline.CAMP_VERSION,'0.3.0');assert.equal(candidate.CAMP_VERSION,'0.3.1-reconsideration.0');
  const administrative=JSON.parse(bound(freeze.prefix,true)),prefixArchive=JSON.parse(gunzipSync(bound(administrative.records,true)));assert.equal(administrative.failure,null);assert.equal(administrative.horizon,240);assert.equal(prefixArchive.records.length,4);
  const original=JSON.parse(bound(administrative.originalC1Prefix)).trajectory;
  const timings=[['R0-known-zero',0,85],['R1-paid-one',1,86],['R8-paid-eight',8,93],['R15-paid-fifteen',15,100]],arms=['finish-current','release-and-rerequest','automatic-reconsideration'];
  const prefixes=new Map();
  for(const [id,paidTrip,at] of timings){
    const record=prefixArchive.records.find(r=>r.id===id+'-baseline-prefix');assert(record,'Missing administrative prefix '+id);assert(!prefixes.has(id));
    const expectedOps=[...original.commands,...Array.from({length:paidTrip+1},()=>({kind:'advance',minutes:1}))];assert.deepEqual(record.operations,expectedOps,'Exact nominated prefix operations '+id);
    assert.deepEqual(record.states.slice(0,original.states.length),original.states,'Original C1 states '+id);assert.deepEqual(record.views.slice(0,original.views.length),original.views,'Original C1 views '+id);
    const replayed=replay(baseline,baseline.createGame(),record,id+' administrative');const g=replayed.game,w=g.work.shelter,j=g.jobs.neighbor;
    assert.equal(g.clock.now,at);assert.equal(g.jobs.player.project,'shelter');assert.equal(j.id,'gather-salvage');assert.equal(j.startedAt,85);assert.equal(j.endsAt,106);assert.equal(g.people.neighbor.pending.elapsedMinutes,paidTrip);assert.equal(g.structures.workbench,1);assert.equal(g.structures.shelter,0);assert.equal(g.structures.garden,1);assert.equal(g.commitment.status,'accepted');assert.equal(g.commitment.project,'shelter');
    const remainingFrame=Math.ceil((1-w.progress)*w.durationByActor.neighbor-1e-12),effort=.2*(1-w.progress),capacity=runtime.assessEffort(g.people.neighbor.body,{durationMinutes:remainingFrame,effort,exertive:true});
    const checks={paidTripMinutes:paidTrip,remainingTripMinutes:106-at,remainingFrameMinutes:remainingFrame,remainingFrameEffort:effort,neighborCapacity:capacity,ownNeedsAllowWork:g.people.neighbor.body.hunger<.65&&g.people.neighbor.body.fatigue<.68&&!g.recovering.neighbor,endpointPlayerCancellationExecuted:false};assert(capacity.allowed&&checks.ownNeedsAllowWork);assert.deepEqual(record.administrativeChecks,checks);
    const descriptor=administrative.cases.find(c=>c.id===id);assert.equal(descriptor.cancelAt,at);assert.equal(descriptor.paidTripMinutes,paidTrip);assert.deepEqual(descriptor.administrativeChecks,checks);assert.deepEqual(descriptor.beforeCancelSnapshot,baseline.exportGame(g));assert.deepEqual(descriptor.beforeCancelView,baseline.getGameView(g));
    prefixes.set(id,{record,game:g});report.counts.administrativeRecords++;
  }
  const summaryBytes=read(options.summary),summary=JSON.parse(summaryBytes);report.summaryPath=within(options.summary);report.summarySha256=sha(summaryBytes);assert.equal(summary.freezeSha256,report.freezeSha256);assert.equal(summary.failure,null);assert.equal(summary.horizon,240);assert.deepEqual(summary.sourceFiles,freeze.files);
  const archiveBytes=bound(summary.records),archive=JSON.parse(gunzipSync(archiveBytes));report.recordsSha256=sha(archiveBytes);assert.equal(archive.freezeSha256,report.freezeSha256);assert.equal(archive.records.length,12);assert.equal(summary.summaries.length,12);
  const expectedIds=timings.flatMap(([id])=>arms.map(arm=>id+'/'+arm));assert.deepEqual(archive.records.map(r=>r.id).sort(),[...expectedIds].sort(),'Exact 12 record identities');
  for(const record of archive.records){
    const prefix=prefixes.get(record.caseId);assert(prefix);assert(arms.includes(record.arm));assert.equal(record.id,record.caseId+'/'+record.arm);assert.deepEqual(record.baselinePrefix,prefix.record,'Embedded frozen prefix');
    const repeated=replay(baseline,baseline.createGame(),record.baselinePrefix,record.id+' embedded prefix');report.counts.prefixReplays++;
    const input=baseline.exportGame(repeated.game);assert.deepEqual(record.boundary.inputSnapshot,input);const useCandidate=record.arm==='automatic-reconsideration',api=useCandidate?candidate:baseline;
    const savedInput=clone(input),initial=useCandidate?candidate.fromBaseline(input):repeated.game;assert.deepEqual(input,savedInput,'Initializer input mutation');
    const expected=clone(input);if(useCandidate)expected.game.version='0.3.1-reconsideration.0';assert.deepEqual(api.exportGame(initial),expected,'Version-only policy boundary');assert.deepEqual(record.boundary.outputSnapshot,expected);assert.equal(record.boundary.candidateAlwaysOnPrefixClaim,false);assert.equal(record.boundary.type,useCandidate?'fromBaseline-version-only':'unchanged-baseline');if(useCandidate)report.counts.versionOnlyBoundaries++;
    const intervention=[{kind:'command',value:{type:'cancel'}},...(record.arm==='release-and-rerequest'?[{kind:'command',value:{type:'release'}},{kind:'command',value:{type:'request',project:'shelter'}}]:[])];assert.deepEqual(record.operations.slice(0,intervention.length),intervention,'Prespecified intervention');
    let cursor=intervention.length;assert.deepEqual(record.operations[cursor++],{kind:'command',value:{type:'start',job:'build-garden'}});while(record.states[cursor].game.jobs.player){assert.deepEqual(record.operations[cursor],{kind:'advance',minutes:1});cursor++;}
    assert.deepEqual(record.operations[cursor++],{kind:'command',value:{type:'start',job:'forage'}});while(record.states[cursor].game.jobs.player){assert.deepEqual(record.operations[cursor],{kind:'advance',minutes:1});cursor++;}
    for(;cursor<record.operations.length;cursor++){assert.equal(record.states[cursor].game.jobs.player,null);assert.deepEqual(record.operations[cursor],{kind:'advance',minutes:1});}
    const replayed=replay(api,initial,record,record.id);assert.equal(replayed.game.clock.now,240);assert.equal(replayed.game.structures.workbench,1);assert.equal(replayed.game.jobs.player,null);
    const expectedBoundaryMarks=[{label:'before-player-cancellation',at:initial.clock.now,operationIndex:0},{label:'after-player-cancellation',at:initial.clock.now,operationIndex:1}];
    if(record.arm==='release-and-rerequest')expectedBoundaryMarks.push({label:'after-existing-release-and-rerequest',at:initial.clock.now,operationIndex:3,response:clone(record.states[3].game.lastResponse)});
    assert.deepEqual(record.marks.filter(m=>!completionDefinitions.some(d=>d[2]===m.label)&&m.label!=='player-food-trip-completed'),expectedBoundaryMarks,'Event/intervention marks');
    const compact=summary.summaries.filter(s=>s.caseId===record.caseId&&s.arm===record.arm);assert.equal(compact.length,1);assert.deepEqual(compact[0],{caseId:record.caseId,arm:record.arm,...replayed.summary});
    report.cases.push({caseId:record.caseId,arm:record.arm,frameAt:replayed.summary.frameAt,roofAt:replayed.summary.roofAt,gardenAt:replayed.summary.gardenAt,foodAt:replayed.summary.playerFoodTripAt,now:replayed.game.clock.now,refusals:record.refusals.length,operations:record.operations.length});report.counts.comparisonRecords++;
  }
  assert.equal(report.counts.versionOnlyBoundaries,4);report.passed=true;
}catch(error){report.failure={message:error.message,stack:error.stack};}
finally{if(temporary)rmSync(temporary,{recursive:true,force:true});report.finishedAt=new Date().toISOString();mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:report.passed,node:report.node,counts:report.counts,failure:report.failure,output},null,2));}
if(!report.passed)process.exitCode=1;
