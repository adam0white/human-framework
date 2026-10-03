/** Independent verification by replaying recorded commands, not exploration controllers. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {graph,hash} from '../action-offers/provenance.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),SOURCE='f5ced4473769ceedbe10cded297599231b052bb5',EVIDENCE='78d2b29b1781c95a818e1dab91aaa6921778c40c';
const git=(ref,path)=>execFileSync('git',['show',`${ref}:${path}`],{cwd:ROOT,maxBuffer:32*1024*1024});
const artifact=path=>{const bytes=git(EVIDENCE,path);return {sha256:hash(bytes),data:JSON.parse(path.endsWith('.gz')?gunzipSync(bytes):bytes)};};
const sourceGraph=graph(ROOT,SOURCE,['src/games/camp-current.js']),dir=mkdtempSync(join(tmpdir(),'meal-record-verifier-'));
try{
 for(const [path,id]of Object.entries(sourceGraph.files)){const bytes=git(SOURCE,path);assert.equal(hash(bytes),id.sha256);mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),bytes);}
 writeFileSync(join(dir,'package.json'),'{"type":"module"}');
 const api=await import(pathToFileURL(join(dir,'src/games/camp-current.js')));
 const save=g=>api.exportGame(g),view=g=>api.getGameView(g),apply=(g,c)=>c.type==='advance'?api.advanceGame(g,c.minutes):c.type==='next'?api.advanceToNextEvent(g):api.applyCommand(g,c);
 const summaryA=g=>{const v=view(g);return {now:v.now,phase:v.phase,stock:g.stock,playerBody:g.people.player.body,neighborBody:g.people.neighbor.body,paid:g.paid,caches:g.caches,householdsEquipped:v.householdsEquipped,campNights:v.campNights,unprovidedHouseholds:v.unprovidedHouseholds,unprovidedNights:v.unprovidedNights,playerJob:v.people.player.job,neighborJob:v.people.neighbor.job,commitment:g.commitment,nextStop:v.nextStop,window:g.window};};
 const summaryB=g=>{const v=view(g);return {now:v.now,phase:v.phase,stock:g.stock,people:Object.fromEntries(Object.entries(g.people).map(([a,p])=>[a,{body:p.body,skills:p.skills,job:v.people[a].job}])),paid:g.paid,caches:g.caches,completedCache:g.lastAssemblies.cache,window:g.window,households:v.householdsEquipped,campNights:v.campNights,unprovidedNights:v.unprovidedNights};};
 const originalTraceBytes=git(SOURCE,'artifacts/camp-maintenance/release-current/earned-supply-success.json.gz'),originalTrace=JSON.parse(gunzipSync(originalTraceBytes));
 const records=[];
 function replay(initial,steps,failures,kind){
  let g=initial;const states=[g],bySave=new Map([[hash(save(g)),g]]);
  for(const step of steps){
   if(step.beforeView)assert.deepEqual(view(g),step.beforeView);
   if(step.input)assert.deepEqual(view(g),step.input);
   const before=save(g);const next=apply(g,step.command);assert.deepEqual(save(g),before);g=next;
   assert.deepEqual(save(g),step.snapshot);assert.deepEqual(save(api.restoreGame(step.snapshot)),step.snapshot);
   if(step.afterView)assert.deepEqual(view(g),step.afterView);
   states.push(g);bySave.set(hash(save(g)),g);
  }
  for(const failure of failures){
   const at=bySave.get(hash(failure.snapshot));assert(at,'Failed attempt does not reference a generated state');
   assert.deepEqual(view(at),failure.view??failure.input);const before=save(at);let caught;
   try{apply(at,failure.command);}catch(error){caught=error.message;}
   assert.equal(caught,failure.error);assert.deepEqual(save(at),before);
  }
  return {g,states,summary:kind==='A'?summaryA:summaryB};
 }
 for(const name of ['finish-meal-first','wait-task-then-meal','cancel-task-restart']){
  const path=`artifacts/meal-preflight/opportunity/run-278-v1/${name}.json.gz`,{data:r,sha256}=artifact(path);
  const initial=api.createGame();assert.deepEqual(save(initial),r.initial);for(let i=0;i<50;i++){assert.deepEqual(r.steps[i].command,originalTrace.steps[i].command);assert.deepEqual(r.steps[i].snapshot,originalTrace.steps[i].snapshot);}const verified=replay(initial,r.steps,r.failures,'A');
  for(const mark of r.marks){const g=verified.states[mark.step];assert(g);assert.deepEqual(save(g),mark.snapshot);assert.deepEqual(view(g),mark.view);assert.deepEqual(summaryA(g),mark.summary);}
  assert.deepEqual(summaryA(verified.g),r.final);
  records.push({path,sha256,id:r.id,successfulCommands:r.steps.length,verifiedRefusals:r.failures.length,marks:r.marks.length,final:summaryA(verified.g)});
 }
 for(const name of ['exploratory-b-v1','exploratory-upstream-v1']){
  const path=`artifacts/meal-preflight/atomic-rival/${name}.json.gz`,{data:r,sha256}=artifact(path);
  assert.equal(r.sourceCommit,SOURCE);assert.equal(r.trace.sha256,hash(originalTraceBytes));for(let i=0;i<r.history.length;i++){assert.deepEqual(r.history[i].command,originalTrace.steps[i].command);assert.deepEqual(r.history[i].snapshot,originalTrace.steps[i].snapshot);}let base=api.createGame();assert.deepEqual(save(base),r.initial);
  for(const [i,step]of r.history.entries()){assert.equal(step.step,i+1);base=apply(base,step.command);assert.deepEqual(save(base),step.snapshot);}
  for(const run of r.runs){
   assert.deepEqual(save(base),run.initial);const verified=replay(base,run.steps,run.errors,'B'),summaries=new Set(verified.states.map(g=>hash(summaryB(g))));
   for(const mark of Object.values(run.marks))assert(summaries.has(hash(mark)),'Mark has no corresponding generated state');
   assert.deepEqual(save(verified.g),run.final);
   records.push({path,sha256,id:run.id,prefixCommands:r.history.length,successfulCommands:run.steps.length,verifiedRefusals:run.errors.length,marks:Object.keys(run.marks).length,final:summaryB(verified.g)});
  }
 }
 assert.equal(records.length,8);assert.equal(records.reduce((n,r)=>n+r.verifiedRefusals,0),4);
 const out=process.argv[2];assert(out,'Pass an explicit fresh output path');mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify({scope:'Independent recorded-command replay on pinned physical source. Original archived prefixes plus all recorded full snapshots, before/after views, summary marks and four refusals checked; no exploration-controller code used.',node:process.version,evidenceCommit:EVIDENCE,sourceGraph,verifierSha256:hash(readFileSync(fileURLToPath(import.meta.url))),records},null,2)+'\n',{flag:'wx'});
 console.log(`Verified ${records.length} full recorded trajectories and four unchanged-state refusals on ${process.version}.`);
}finally{rmSync(dir,{recursive:true,force:true});}
