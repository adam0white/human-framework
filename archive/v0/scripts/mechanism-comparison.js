import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpus,platform,arch,release,totalmem} from 'node:os';
import {performance} from 'node:perf_hooks';
import {runPartition,createHost,startCommand,advanceHost,finishCommand,exportHost} from '../src/experiments/mechanism-comparison/experiment.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const REGISTRATION='904b7e4',BASE='33418c4';
const FIXED=['src/human/v0.1.1.js','src/core/model.js','src/runtime/index.js','src/runtime/clock.js'];
const REGISTERED=['docs/mechanism-comparison-protocol.md','artifacts/mechanism-comparison/protocol.json'];
const SOURCES=[...FIXED,...REGISTERED,'src/experiments/mechanism-comparison/small-model.js','src/experiments/mechanism-comparison/adapters.js',
  'src/experiments/mechanism-comparison/experiment.js','scripts/mechanism-comparison.js','tests/mechanism-comparison.test.js'];
const hash=x=>createHash('sha256').update(x).digest('hex');
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const environment=()=>({node:process.version,platform:platform(),architecture:arch(),osRelease:release(),cpu:cpus()[0]?.model,
  logicalCpus:cpus().length,ramBytes:totalmem(),renderingIncluded:false,networkIncluded:false});
const sourceHashes=async()=>Object.fromEntries(await Promise.all(SOURCES.map(async p=>[p,hash(await readFile(resolve(ROOT,p)))])));
export const matchesFreeze=(manifest,hashes)=>manifest.format==='mechanism-comparison-freeze'&&manifest.version===1&&
  manifest.registrationCommit===REGISTRATION&&JSON.stringify(manifest.sourceSha256)===JSON.stringify(hashes);
export async function writeNew(path,value) {await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
async function checkOriginals() {
  for(const [ref,paths] of [[BASE,FIXED],[REGISTRATION,REGISTERED]])for(const path of paths) {
    const original=execFileSync('git',['show',`${ref}:${path}`],{cwd:ROOT});
    if(hash(original)!==hash(await readFile(resolve(ROOT,path))))throw new Error(`Frozen source or preregistration changed: ${path}`);
  }
}
function pairCounts(conditions) {
  const rows=conditions.flatMap(c=>c.kind==='schedule'?[{id:c.id,...c.comparison}]:Object.entries(c.arms).map(([arm,v])=>({id:`${c.id}/${arm}`,...v.comparison})));
  return {pairs:rows.length,equivalent:rows.filter(r=>r.equivalent).length,divergent:rows.filter(r=>!r.equivalent).length,rows};
}
async function sourceSize() {
  const sizes={};
  for(const path of SOURCES.filter(p=>p.endsWith('.js'))) {
    const text=await readFile(resolve(ROOT,path),'utf8');sizes[path]={utf8Bytes:Buffer.byteLength(text),nonblankLines:text.split('\n').filter(x=>x.trim()).length};
  }
  const adapter=await readFile(resolve(ROOT,'src/experiments/mechanism-comparison/adapters.js'),'utf8');
  const chunk=(from,to)=>{const text=adapter.slice(adapter.indexOf(from),to?adapter.indexOf(to):adapter.length);return {utf8Bytes:Buffer.byteLength(text),nonblankLines:text.split('\n').filter(x=>x.trim()).length};};
  sizes.adapterSections={human:chunk('  human:{','  small:{'),small:chunk('  small:{')};
  sizes.scopeNote='Whole source files and adapter sections; model.js includes unrelated exported laboratory helpers. No minification or measured human authoring effort. The small snapshot retains parameters and counter baselines for independent resume.';
  return sizes;
}
const quantile=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor((xs.length-1)*q))];
function timedRun(model,protocol,count,sampleState) {
  const p=protocol.performance;
  const condition={body:{fatigue:0.1,hunger:0.2},skills:{a:0.2,b:0.2},food:p.food,parts:p.parts};
  const cycle=[{kind:'a',durationMinutes:20,effort:0.12},{kind:'rest',durationMinutes:20,effort:0},{kind:'meal',durationMinutes:10,effort:0}];
  let state=createHost(model,condition,protocol),samples=[],peakBytes=0,firstBytes=0,lastBytes=0;
  const sample=s=>{const bytes=Buffer.byteLength(JSON.stringify(exportHost(s)));peakBytes=Math.max(peakBytes,bytes);return bytes;};
  if(sampleState)firstBytes=sample(state);
  for(let i=0;i<count;i++) {
    const command=cycle[i%cycle.length],start=performance.now();
    state=startCommand(state,command,protocol);
    const started=performance.now();
    if(sampleState)sample(state);
    const afterSample=performance.now();
    state=finishCommand(advanceHost(state,command.durationMinutes));
    samples.push(started-start+performance.now()-afterSample);
    if(sampleState)lastBytes=sample(state);
  }
  return {commands:count,totalMs:samples.reduce((a,b)=>a+b,0),p50Ms:quantile(samples,0.5),p95Ms:quantile(samples,0.95),maxMs:Math.max(...samples),
    firstStateBytes:firstBytes,lastStateBytes:lastBytes,peakStateBytes:peakBytes,finalStats:state.stats};
}
function benchmark(protocol) {
  const results={human:[],small:[]},p=protocol.performance;
  for(const model of ['human','small'])timedRun(model,protocol,p.warmupCommands,false);
  for(let repeat=0;repeat<p.repeats;repeat++)for(const model of repeat%2?['small','human']:['human','small'])results[model].push(timedRun(model,protocol,p.commands,true));
  return {environment:environment(),workload:p,models:Object.fromEntries(Object.entries(results).map(([model,runs])=>[model,{runs,
    medianTotalMs:quantile(runs.map(r=>r.totalMs),0.5),medianP95Ms:quantile(runs.map(r=>r.p95Ms),0.5),peakStateBytes:Math.max(...runs.map(r=>r.peakStateBytes)),
    allP95WithinBudget:runs.every(r=>r.p95Ms<=p.p95BudgetMs),stateWithinBudget:runs.every(r=>r.peakStateBytes<=p.stateBudgetBytes)}])),
    limitations:'Node desktop microbenchmark. Clock scheduling, UI, rendering, network, trace/report serialization and package startup excluded. Active snapshot sampling/serialization is timed outside command work but can influence GC/cache effects. Includes host and model lifecycle validation, not just formulas. No measured mobile performance or human effort.'};
}
async function main() {
  const [action,...args]=process.argv.slice(2),options={};
  if(!['freeze','run','performance'].includes(action))throw new Error('Use freeze|run|performance --out path [--partition development|reserved|sensitivity] [--freeze path]');
  while(args.length){const key=args.shift();if(!['--out','--partition','--freeze'].includes(key)||!args.length||Object.hasOwn(options,key))throw new Error('Invalid arguments');options[key]=args.shift();}
  if(!options['--out'])throw new Error('--out required');
  await checkOriginals();const hashes=await sourceHashes(),output=resolve(ROOT,options['--out']);
  if(action==='freeze') {
    if(options['--partition']||options['--freeze'])throw new Error('Freeze accepts only --out');
    if(git(['status','--porcelain','--',...SOURCES]))throw new Error('Commit all protocol, model, harness and test sources before freeze');
    await writeNew(output,{format:'mechanism-comparison-freeze',version:1,registrationCommit:REGISTRATION,registrationFullCommit:git(['rev-parse',REGISTRATION]),
      baseCommit:git(['rev-parse',BASE]),sourceCommit:git(['rev-parse','HEAD']),frozenAt:new Date().toISOString(),sourceSha256:hashes});
    process.stdout.write(`Frozen committed source in ${output}\n`);return;
  }
  const partition=options['--partition']??'development';let freeze=null;
  if(action==='performance'||partition!=='development'||options['--freeze']) {
    if(!options['--freeze'])throw new Error('This evaluation requires --freeze');
    freeze=JSON.parse(await readFile(resolve(ROOT,options['--freeze']),'utf8'));
    if(!matchesFreeze(freeze,hashes))throw new Error('Freeze does not match current source');
    for(const path of SOURCES)if(hash(execFileSync('git',['show',`${freeze.sourceCommit}:${path}`],{cwd:ROOT}))!==hashes[path])throw new Error('Freeze commit does not contain current source');
  }
  const protocol=JSON.parse(await readFile(resolve(ROOT,REGISTERED[1]),'utf8'));
  const result=action==='performance'?benchmark(protocol):runPartition(protocol,partition,{verifiedFreeze:Boolean(freeze)});
  const counts=action==='performance'?null:partition==='sensitivity'?result.map(v=>({tuning:v.tuning,...pairCounts(v.conditions)})):pairCounts(result);
  const artifact={format:'mechanism-comparison-result',version:1,action,partition:action==='run'?partition:null,result,counts,
    provenance:{registrationCommit:REGISTRATION,executionCommit:git(['rev-parse','HEAD']),sourceSha256:hashes,freeze,resultSha256:hash(JSON.stringify(result)),executedAt:new Date().toISOString()},
    environment:environment(),sourceSize:await sourceSize()};
  await writeNew(output,artifact);process.stdout.write(`${action} ${partition}: ${output}\n${JSON.stringify(counts??result.models,null,2)}\n`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
