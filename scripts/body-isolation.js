import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpus,platform,arch,release,totalmem} from 'node:os';
import {runPartition,createHost,startCommand,advanceHost,finishCommand,exportHost} from '../src/experiments/body-isolation/experiment.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const REGISTRATION='780d20d',BASE='33418c4';
const FIXED=['src/human/v0.1.1.js','src/core/model.js','src/runtime/index.js','src/runtime/clock.js'];
const HISTORICAL=['src/experiments/mechanism-comparison/experiment.js','src/experiments/mechanism-comparison/adapters.js','src/experiments/mechanism-comparison/small-model.js'];
const REGISTERED=['docs/body-isolation-protocol.md','artifacts/body-isolation/protocol.json'];
const SOURCES=[...FIXED,...HISTORICAL,...REGISTERED,'src/experiments/body-isolation/pooled-model.js','src/experiments/body-isolation/host.js','src/experiments/body-isolation/adapters.js',
  'src/experiments/body-isolation/experiment.js','scripts/body-isolation.js','tests/body-isolation.test.js'];
const hash=x=>createHash('sha256').update(x).digest('hex');
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const environment=()=>({node:process.version,platform:platform(),architecture:arch(),osRelease:release(),cpu:cpus()[0]?.model,
  logicalCpus:cpus().length,ramBytes:totalmem(),renderingIncluded:false,networkIncluded:false});
const sourceHashes=async()=>Object.fromEntries(await Promise.all(SOURCES.map(async p=>[p,hash(await readFile(resolve(ROOT,p)))])));
export const matchesFreeze=(manifest,hashes)=>manifest.format==='body-isolation-freeze'&&manifest.version===1&&
  manifest.registrationCommit===REGISTRATION&&JSON.stringify(manifest.sourceSha256)===JSON.stringify(hashes);
export async function writeNew(path,value) {await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
async function checkOriginals() {
  for(const [ref,paths] of [[BASE,FIXED],[REGISTRATION,[...REGISTERED,...HISTORICAL]]])for(const path of paths) {
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
  const adapter=await readFile(resolve(ROOT,'src/experiments/body-isolation/adapters.js'),'utf8');
  const chunk=(from,to)=>{const text=adapter.slice(adapter.indexOf(from),to?adapter.indexOf(to):adapter.length);return {utf8Bytes:Buffer.byteLength(text),nonblankLines:text.split('\n').filter(x=>x.trim()).length};};
  sizes.adapterSections={human:chunk('  human:{','  pooled:{'),pooled:chunk('  pooled:{')};
  sizes.scopeNote='Whole source files and adapter sections; model.js includes unrelated exported laboratory helpers. No minification or measured human authoring effort. The pooled snapshot retains body parameters and the same single proficiency per skill; pending baselines are lifecycle bookkeeping. Host source is duplicated from the frozen closed-registry host, counted for both integrations.';
  return sizes;
}
function stateBound(protocol) {
  const workload=protocol.performance,models={};
  for(const model of ['human','pooled']) {
    let state=createHost(model,{body:{fatigue:.1,hunger:.2},skills:{a:.2,b:.2},food:workload.food,parts:workload.parts},protocol);
    const sample=s=>Buffer.byteLength(JSON.stringify(exportHost(s)));const initialBytes=sample(state);let peakBytes=initialBytes;
    const cycle=[{kind:'a',durationMinutes:20,effort:.12},{kind:'rest',durationMinutes:20,effort:0},{kind:'meal',durationMinutes:10,effort:0}];
    for(let i=0;i<workload.commands;i++) {
      const command=cycle[i%3];state=startCommand(state,command,protocol);peakBytes=Math.max(peakBytes,sample(state));
      state=finishCommand(advanceHost(state,command.durationMinutes));peakBytes=Math.max(peakBytes,sample(state));
    }
    models[model]={initialBytes,finalBytes:sample(state),peakBytes,withinBudget:peakBytes<=workload.stateBudgetBytes,finalStats:state.stats};
  }
  return {workload,models,limitations:'Active serialized host/person state including pending attempts. No retained event history. Number/counter text grows modestly; no timing, physical-mobile or measured human authoring claim.'};
}
async function main() {
  const [action,...args]=process.argv.slice(2),options={};
  if(!['freeze','run','state'].includes(action))throw new Error('Use freeze|run|state --out path [--partition development|reserved|sensitivity] [--freeze path]');
  while(args.length){const key=args.shift();if(!['--out','--partition','--freeze'].includes(key)||!args.length||Object.hasOwn(options,key))throw new Error('Invalid arguments');options[key]=args.shift();}
  if(!options['--out'])throw new Error('--out required');
  await checkOriginals();const hashes=await sourceHashes(),output=resolve(ROOT,options['--out']);
  if(action!=='run'&&options['--partition'])throw new Error('Only run accepts --partition');
  if(action==='freeze') {
    if(options['--partition']||options['--freeze'])throw new Error('Freeze accepts only --out');
    if(git(['status','--porcelain','--',...SOURCES]))throw new Error('Commit all protocol, model, harness and test sources before freeze');
    await writeNew(output,{format:'body-isolation-freeze',version:1,registrationCommit:REGISTRATION,registrationFullCommit:git(['rev-parse',REGISTRATION]),
      baseCommit:git(['rev-parse',BASE]),sourceCommit:git(['rev-parse','HEAD']),frozenAt:new Date().toISOString(),sourceSha256:hashes});
    process.stdout.write(`Frozen committed source in ${output}\n`);return;
  }
  const partition=options['--partition']??'development';let freeze=null;
  if(action==='state'||partition!=='development'||options['--freeze']) {
    if(!options['--freeze'])throw new Error('This evaluation requires --freeze');
    freeze=JSON.parse(await readFile(resolve(ROOT,options['--freeze']),'utf8'));
    if(!matchesFreeze(freeze,hashes))throw new Error('Freeze does not match current source');
    for(const path of SOURCES)if(hash(execFileSync('git',['show',`${freeze.sourceCommit}:${path}`],{cwd:ROOT}))!==hashes[path])throw new Error('Freeze commit does not contain current source');
  }
  const protocol=JSON.parse(await readFile(resolve(ROOT,REGISTERED[1]),'utf8'));
  const result=action==='state'?stateBound(protocol):runPartition(protocol,partition,{verifiedFreeze:Boolean(freeze)});
  const counts=action==='state'?null:partition==='sensitivity'?result.map(v=>({tuning:v.tuning,...pairCounts(v.conditions)})):pairCounts(result);
  const artifact={format:'body-isolation-result',version:1,action,partition:action==='run'?partition:null,result,counts,
    provenance:{registrationCommit:REGISTRATION,executionCommit:git(['rev-parse','HEAD']),sourceSha256:hashes,freeze,resultSha256:hash(JSON.stringify(result)),executedAt:new Date().toISOString()},
    environment:environment(),sourceSize:await sourceSize()};
  await writeNew(output,artifact);process.stdout.write(`${action} ${partition}: ${output}\n${JSON.stringify(counts??result.models,null,2)}\n`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
