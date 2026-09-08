// Bounded source/state/latency measurement, separate from the behavior comparison.
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir,cpus,platform,release,arch} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {verifyStaticModules} from './public-module-graph.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const size=value=>Buffer.byteLength(JSON.stringify(value));
const quantile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
function parseOption(name){const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];}
async function measure(freeze){
 assert.match(freeze.commit,/^[a-f0-9]{40}$/);
 const stage=await mkdtemp(join(tmpdir(),'hf-work-measure-')),sources=new Map();
 try{
  await writeFile(join(stage,'package.json'),'{"type":"module"}\n');
  for(const [path,sha] of Object.entries(freeze.sources)){
   if(!path.startsWith('src/')||!path.endsWith('.js'))continue;
   assert.ok(!path.split('/').includes('..'));
   const bytes=execFileSync('git',['show',freeze.commit+':'+path],{cwd:root});
   assert.equal(hash(bytes),sha,'Frozen Git bytes differ '+path);
   sources.set(path,bytes);await mkdir(dirname(join(stage,path)),{recursive:true});await writeFile(join(stage,path),bytes);
  }
  const graph=verifyStaticModules([...sources].map(([path,bytes])=>({path,source:bytes.toString()})));
  const reachable=entry=>{const seen=new Set(),visit=p=>{if(seen.has(p))return;seen.add(p);for(const edge of graph.staticEdges)if(edge.from===p)visit(edge.to);};visit(entry);return [...seen].sort();};
  const sourceCost=files=>({files:files.map(path=>({path,bytes:sources.get(path).length,nonblankLines:sources.get(path).toString().split('\n').filter(line=>line.trim()).length,sha256:hash(sources.get(path))})),
   bytes:files.reduce((n,p)=>n+sources.get(p).length,0),nonblankLines:files.reduce((n,p)=>n+sources.get(p).toString().split('\n').filter(line=>line.trim()).length,0)});
  const arms={};
  for(const [name,file] of [['candidate','camp-candidate'],['direct','camp-direct'],['fixed','camp-fixed']]){
   const entry='src/experiments/work-progress/'+file+'.js',api=await import(pathToFileURL(join(stage,entry)).href);
   const durations=[],rows=[];let maxSnapshotBytes=0,maxItemBytes=0,workTransitions=0;
   for(let cycle=0;cycle<12;cycle++){
    let world=api.createWorld({items:2});world=api.command(world,{type:'start',actor:'A',item:'work-1'});
    for(let minute=1;minute<=20;minute++){
     if(minute===3)world=api.command(world,{type:'start',actor:'B',item:'work-2'});
     const before=api.observe(world),started=performance.now();world=api.advanceTo(world,minute);const elapsedMs=performance.now()-started;
     const observation=api.observe(world),snapshot=api.exportWorld(world);
     const work=observation.actors.A.paid.construction+observation.actors.B.paid.construction-before.actors.A.paid.construction-before.actors.B.paid.construction;
     workTransitions+=work;assert.equal(work,minute<=2?1:2);
     const snapshotBytes=size(snapshot),itemBytes=size(snapshot.world.items);
     maxSnapshotBytes=Math.max(maxSnapshotBytes,snapshotBytes);maxItemBytes=Math.max(maxItemBytes,itemBytes);
     rows.push({cycle,minute,workTransitions:work,elapsedMs,snapshotBytes,itemBytes,warmup:cycle===0});
     if(cycle>0)durations.push(elapsedMs);
    }
    assert.equal(api.observe(world).outputs,2);
   }
   assert.equal(workTransitions,456);
   arms[name]={source:sourceCost(reachable(entry)),workTransitions,measuredAdvanceCalls:durations.length,
    medianMs:quantile(durations,.5),p95Ms:quantile(durations,.95),maxMs:Math.max(...durations),
    budgetMs:5,passesBudget:quantile(durations,.95)<=5,maxSnapshotBytes,maxItemBytes,rows};
  }
  const work=await import(pathToFileURL(join(stage,'src/experiments/work-progress/candidate.js')).href);
  const human=await import(pathToFileURL(join(stage,'src/human/v0.1.1.js')).href);
  const wide=[];
  for(let item=0;item<2;item++){
   let state=work.createWork({id:'item'+String(item)+'x'.repeat(75),effort:.2345678901234567,minimumDuration:6});
   for(let index=0;index<16;index++){
    const id='worker'+String(index).padStart(2,'0')+'x'.repeat(72);
    state=work.prepareWorker(state,{workerId:id,basisMinutes:17});
    const quote=work.quoteWork(state,{workerId:id});
    let person=human.createPerson({id,body:{fatigue:.2,hunger:.2},skills:{work:.1}});
    assert.ok(human.assessEffort(person.body,{durationMinutes:quote.remainingMinutes,effort:quote.remainingEffort,exertive:true}).allowed);
    person=human.beginAttempt(person,{actionId:'work',targetId:state.id,durationMinutes:1,effort:quote.effort,exertive:true,skill:'work'});
    person=human.advanceAttempt(person,1);person=human.finishAttempt(person,{attemptId:person.pending.id,status:'completed'});
    assert.equal(person.minutes,1);state=work.advanceWork(state,{workerId:id}).work;
   }
   wide.push(work.exportWork(state));
  }
  const wideBytes=size(wide);
  return {format:'paid-work-cost-probe',version:1,createdAt:new Date().toISOString(),node:process.version,
   machine:{platform:platform(),release:release(),arch:arch(),cpu:cpus()[0]?.model},sourceFreeze:freeze,
   measurementScriptSha256:hash(await readFile(fileURLToPath(import.meta.url))),
   scope:'12 two-item worlds per arm; first world is warmup. One-minute host advance includes 3 Human payments, validation and settlement; excludes rendering, observation/export and initial setup. No randomized performance order; local timings are descriptive, not a causal speed ranking.',
   arms,wideComponent:{bytes:wideBytes,budgetBytes:8192,passesBudget:wideBytes<=8192,items:2,contributorsPerItem:16,idLength:80,additionalPaidWorkTransitions:32,
    note:'Separate component shape fixture with real one-minute Human payments, basis17, fractional amounts and long IDs; not a worst-case byte-size proof or a full 16-person camp.',
    snapshots:wide},totalRealWorkTransitions:{candidate:488,direct:456,fixed:456},
   cautions:['Actual static dependency closure is counted, including any unused runtime exports transitively imported by an adapter.','Source length and local timings are not measured human authoring effort.','Rival first-assignment metadata and generic candidate contributor limits differ; report validation obligations separately.']};
 }finally{await rm(stage,{recursive:true,force:true});}
}
const freezePath=parseOption('--freeze'),out=parseOption('--out');
if(!freezePath||!out)throw Error('Require --freeze and fresh --out');
const result=await measure(JSON.parse(await readFile(resolve(freezePath),'utf8')));
await writeFile(resolve(out),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,source:result.sourceFreeze.commit,arms:Object.fromEntries(Object.entries(result.arms).map(([k,v])=>[k,{bytes:v.source.bytes,lines:v.source.nonblankLines,p95Ms:v.p95Ms,maxSnapshotBytes:v.maxSnapshotBytes,workTransitions:v.workTransitions}])),wideComponentBytes:result.wideComponent.bytes},null,2));
