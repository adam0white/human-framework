import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,openSync,appendFileSync} from 'node:fs';
import {dirname,resolve,relative,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';

// One upstream atomic counterplan. This is unavailable after already reaching 381.
const SOURCE='f5ced4473769ceedbe10cded297599231b052bb5';
const TRACE='artifacts/camp-maintenance/release-current/earned-supply-success.json.gz';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const output=resolve(process.argv[2]??'artifacts/meal-preflight/atomic-rival/exploratory-upstream-v1.json.gz');
mkdirSync(dirname(output),{recursive:true});
const attempts=openSync(output+'.attempts.jsonl','wx');
const sha=x=>createHash('sha256').update(x).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,maxBuffer:8*1024*1024});
const readAt=path=>git('show',`${SOURCE}:${path}`);
const sourceDir=mkdtempSync(join(tmpdir(),'hf-meal-atomic-upstream-')),sources=[];
function capture(path){
  if(sources.some(f=>f.path===path))return;const bytes=readAt(path);
  sources.push({path,bytes:bytes.length,sha256:sha(bytes),gitBlob:git('rev-parse',`${SOURCE}:${path}`).toString().trim()});
  mkdirSync(dirname(join(sourceDir,path)),{recursive:true});writeFileSync(join(sourceDir,path),bytes);
  for(const match of bytes.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))capture(relative(ROOT,resolve(ROOT,dirname(path),match[1])));
}
capture('src/games/camp-current.js');writeFileSync(join(sourceDir,'package.json'),'{"type":"module"}\n');
const api=await import(pathToFileURL(join(sourceDir,'src/games/camp-current.js')));
const traceBytes=readAt(TRACE),trace=JSON.parse(gunzipSync(traceBytes));
const apply=(g,c)=>c.type==='advance'?api.advanceGame(g,c.minutes):c.type==='next'?api.advanceToNextEvent(g):api.applyCommand(g,c);
const history=[];let g=api.createGame();assert.deepEqual(api.exportGame(g),trace.initial);
for(const [index,entry]of trace.steps.slice(0,68).entries()){
  g=apply(g,entry.command);assert.deepEqual(api.exportGame(g),entry.snapshot,`Prefix step ${index+1}`);
  history.push({step:index+1,command:entry.command,snapshot:api.exportGame(g)});
}
assert.equal(g.clock.now,365);
const run={id:'upstream-whole-meal-365-373-before-task-383',initial:api.exportGame(g),steps:[],errors:[],marks:{}};
const act=(command,label=null)=>{const prior=g,before=JSON.stringify(g),input=api.getGameView(g);
  try{g=apply(g,command);assert.equal(JSON.stringify(prior),before,'Input mutation');const step={command,label,input,snapshot:api.exportGame(g)};run.steps.push(step);appendFileSync(attempts,JSON.stringify({status:'success',...step})+'\n');}
  catch(e){const error={command,label,input,error:e.message,snapshot:api.exportGame(g)};run.errors.push(error);appendFileSync(attempts,JSON.stringify({status:'error',...error})+'\n');throw e;}
};
const mark=label=>{const v=api.getGameView(g);run.marks[label]={now:v.now,phase:v.phase,stock:g.stock,people:Object.fromEntries(Object.entries(g.people).map(([a,p])=>[a,{body:p.body,skills:p.skills,job:v.people[a].job}])),paid:g.paid,caches:g.caches,completedCache:g.lastAssemblies.cache,window:g.window,households:v.householdsEquipped,campNights:v.campNights,unprovidedNights:v.unprovidedNights};};
const advanceTo=time=>{assert.ok(time>=g.clock.now);if(time>g.clock.now)act({type:'advance',minutes:time-g.clock.now});};
mark('upstream-start');act({type:'start',job:'eat'});advanceTo(373);mark('whole-meal-complete');
advanceTo(383);mark('intervening-cache-completion');
act({type:'allocate',destination:'camp'},'Allocate third cache');act({type:'request',project:'cache'},'Request final cache');
act({type:'start',job:'build-cache'});advanceTo(403);act({type:'allocate',destination:'camp'});mark('all-supply-needs-covered');
advanceTo(404);mark('rain');act({type:'finish'});act({type:'return'});advanceTo(411);mark('common-post-meal-time');advanceTo(420);mark('final');
run.final=api.exportGame(g);
assert.equal(run.marks['all-supply-needs-covered'].campNights,4);
assert.equal(run.marks['all-supply-needs-covered'].now,403);
assert.equal(run.marks['whole-meal-complete'].now,373);
assert.equal(run.errors.length,0);
const result={status:'exploratory upstream counterplan; not available at already reached minute381; no candidate',createdAt:new Date().toISOString(),sourceCommit:SOURCE,sources,trace:{path:TRACE,sha256:sha(traceBytes),gitBlob:git('rev-parse',`${SOURCE}:${TRACE}`).toString().trim(),prefixThrough:68,matchedSnapshots:69},runner:{path:relative(ROOT,fileURLToPath(import.meta.url)),sha256:sha(readFileSync(fileURLToPath(import.meta.url)))},node:process.version,execPath:process.execPath,initial:trace.initial,history,runs:[run]};
writeFileSync(output,gzipSync(JSON.stringify(result)),{flag:'wx'});
console.log(JSON.stringify({output,sha256:sha(readFileSync(output)),prefixMatched:69,marks:run.marks},null,2));
