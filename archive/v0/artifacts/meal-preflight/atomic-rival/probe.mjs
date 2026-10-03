import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, openSync, appendFileSync} from 'node:fs';
import {dirname, resolve, relative, join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {gunzipSync, gzipSync} from 'node:zlib';

// Exploratory atomic controls only. No edited state, candidate or changed physics.
const SOURCE='f5ced4473769ceedbe10cded297599231b052bb5';
const TRACE='artifacts/camp-maintenance/release-current/earned-supply-success.json.gz';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const output=resolve(process.argv[2]??'artifacts/meal-preflight/atomic-rival/exploratory-b.json.gz');
mkdirSync(dirname(output),{recursive:true});
const attempts=openSync(output+'.attempts.jsonl','wx');
const sha=x=>createHash('sha256').update(x).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,maxBuffer:8*1024*1024});
const readAt=path=>git('show',`${SOURCE}:${path}`);
const sourceDir=mkdtempSync(join(tmpdir(),'hf-meal-atomic-rival-'));
const sources=[];
function capture(path){
  if(sources.some(f=>f.path===path))return;
  const bytes=readAt(path);
  sources.push({path,bytes:bytes.length,sha256:sha(bytes),gitBlob:git('rev-parse',`${SOURCE}:${path}`).toString().trim()});
  mkdirSync(dirname(join(sourceDir,path)),{recursive:true});writeFileSync(join(sourceDir,path),bytes);
  for(const match of bytes.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))capture(relative(ROOT,resolve(ROOT,dirname(path),match[1])));
}
capture('src/games/camp-current.js');
writeFileSync(join(sourceDir,'package.json'),'{"type":"module"}\n');
const api=await import(pathToFileURL(join(sourceDir,'src/games/camp-current.js')));
const traceBytes=readAt(TRACE),trace=JSON.parse(gunzipSync(traceBytes));
const apply=(g,c)=>c.type==='advance'?api.advanceGame(g,c.minutes):c.type==='next'?api.advanceToNextEvent(g):api.applyCommand(g,c);
const history=[];let base=api.createGame();
assert.deepEqual(api.exportGame(base),trace.initial);
for(const [index,entry]of trace.steps.slice(0,69).entries()){
  base=apply(base,entry.command);assert.deepEqual(api.exportGame(base),entry.snapshot,`Prefix step ${index+1}`);
  history.push({step:index+1,command:entry.command,snapshot:api.exportGame(base)});
}
assert.equal(base.clock.now,381);
const summary=g=>{const v=api.getGameView(g);return {now:v.now,phase:v.phase,stock:g.stock,people:Object.fromEntries(Object.entries(g.people).map(([a,p])=>[a,{body:p.body,skills:p.skills,job:v.people[a].job}])),paid:g.paid,caches:g.caches,completedCache:g.lastAssemblies.cache,window:g.window,households:v.householdsEquipped,campNights:v.campNights,unprovidedNights:v.unprovidedNights};};
const runs=[];
function arm(id){
  let g=base;const result={id,initial:api.exportGame(base),steps:[],marks:{},errors:[]};runs.push(result);
  const act=(command,label=null,{allowError=false}={})=>{
    const prior=g,before=JSON.stringify(g),input=api.getGameView(g);
    try{g=apply(g,command);assert.equal(JSON.stringify(prior),before,'Input mutation');const step={command,label,input,snapshot:api.exportGame(g)};result.steps.push(step);appendFileSync(attempts,JSON.stringify({arm:id,status:'success',...step})+'\n');}
    catch(e){const failure={command,label,input,error:e.message,snapshot:api.exportGame(g)};result.errors.push(failure);appendFileSync(attempts,JSON.stringify({arm:id,status:'error',...failure})+'\n');assert.equal(JSON.stringify(g),before,'Failed command changed state');if(!allowError)throw e;}
    return g;
  };
  const mark=label=>result.marks[label]=summary(g);
  const at=()=>g.clock.now;
  const advanceTo=time=>{assert.ok(time>=g.clock.now);if(time>g.clock.now)act({type:'advance',minutes:time-g.clock.now});};
  const eventActions=()=>{act({type:'allocate',destination:'camp'},'Allocate third cache');act({type:'request',project:'cache'},'Request final cache');};
  const finishAndReturn=()=>{act({type:'finish'},'Close supply window with actual coverage');act({type:'return'},'Return with unchanged physical state');};
  const done=()=>{mark('final');result.final=api.exportGame(g);};
  return {act,mark,at,advanceTo,eventActions,finishAndReturn,done};
}

{
  const r=arm('task-before-meal-at-381');
  r.act({type:'start',job:'build-cache'},'Already occupied until Meryem completes her cache',{allowError:true});
  r.done();
}
{
  const r=arm('finish-meal-first');
  r.act({type:'start',job:'eat'});r.advanceTo(383);r.mark('intervening-cache-completion');r.eventActions();
  r.advanceTo(389);r.mark('meal-complete');r.act({type:'start',job:'build-cache'});r.advanceTo(404);r.mark('rain');
  r.finishAndReturn();r.advanceTo(409);r.mark('late-cache-complete');r.advanceTo(420);r.done();
}
{
  const r=arm('cancel-task-restart');
  r.act({type:'start',job:'eat'});r.advanceTo(383);r.mark('intervening-cache-completion');r.eventActions();
  r.act({type:'cancel'});r.mark('reservation-returned');r.act({type:'start',job:'build-cache'});r.advanceTo(403);
  r.act({type:'allocate',destination:'camp'});r.mark('all-supply-needs-covered');r.act({type:'start',job:'eat'});
  r.advanceTo(404);r.mark('rain-with-meal');r.finishAndReturn();r.advanceTo(411);r.mark('full-meal-complete');r.advanceTo(420);r.done();
}
{
  const r=arm('wait-recover-task-full-meal');
  r.advanceTo(383);r.mark('intervening-cache-completion');r.eventActions();
  r.act({type:'start',job:'build-cache'});r.advanceTo(403);r.act({type:'allocate',destination:'camp'});
  r.mark('all-supply-needs-covered');r.act({type:'start',job:'eat'});r.advanceTo(404);r.mark('rain-with-meal');
  r.finishAndReturn();r.advanceTo(411);r.mark('full-meal-complete');r.advanceTo(420);r.done();
}
assert.equal(runs[0].errors.length,1);
assert.match(runs[0].errors[0].error,/already building/);
assert.equal(runs[1].marks.rain.campNights,2);
for(const run of runs.slice(2)){
  assert.equal(run.marks['all-supply-needs-covered'].now,403);
  assert.equal(run.marks['all-supply-needs-covered'].campNights,4);
  assert.equal(run.marks['full-meal-complete'].people.player.job,null);
}
const result={status:'exploratory; no retained-progress candidate executed; no final case freeze',createdAt:new Date().toISOString(),sourceCommit:SOURCE,sources,trace:{path:TRACE,sha256:sha(traceBytes),gitBlob:git('rev-parse',`${SOURCE}:${TRACE}`).toString().trim(),prefixThrough:69,matchedSnapshots:70},runner:{path:relative(ROOT,fileURLToPath(import.meta.url)),sha256:sha(readFileSync(fileURLToPath(import.meta.url)))},node:process.version,execPath:process.execPath,initial:trace.initial,history,runs};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,gzipSync(JSON.stringify(result)),{flag:'wx'});
console.log(JSON.stringify({output,sha256:sha(readFileSync(output)),prefixMatched:70,runs:runs.map(r=>({id:r.id,errors:r.errors.map(e=>e.error),marks:r.marks}))},null,2));
