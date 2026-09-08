import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {restorePerson} from '../src/human/v0.1.1.js';
import {practice,PARAMETERS} from '../src/core/model.js';
import {CASES,DRIVERS,END_AT} from '../src/experiments/work-progress/cases.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const clone=value=>structuredClone(value);
export function assertJson(value,ancestors=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){assert.ok(Number.isFinite(value),'Non-finite JSON number');return;}
 assert.equal(typeof value,'object','Non-JSON value');assert.ok(!ancestors.has(value),'Cyclic JSON value');
 const array=Array.isArray(value);
 assert.ok(array?Object.getPrototypeOf(value)===Array.prototype:[Object.prototype,null].includes(Object.getPrototypeOf(value)),'Non-plain JSON object');
 const keys=Reflect.ownKeys(value);if(array)assert.equal(keys.length,value.length+1,'Sparse or extended JSON array');
 ancestors.add(value);
 for(const key of keys){
  if(array&&key==='length')continue;
  assert.equal(typeof key,'string','Symbol JSON field');const descriptor=Object.getOwnPropertyDescriptor(value,key);
  assert.ok(descriptor.enumerable&&Object.hasOwn(descriptor,'value'),'Accessor or hidden JSON field');assertJson(descriptor.value,ancestors);
 }
 ancestors.delete(value);
}
function ordered(value){if(Array.isArray(value))return '['+value.map(ordered).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+ordered(value[key])).join(',')+'}';return JSON.stringify(value);}
export function canonical(value){assertJson(value);return ordered(value);}
const relativeSources=[
 'src/experiments/work-progress/candidate.js','src/experiments/work-progress/camp-candidate.js',
 'src/experiments/work-progress/camp-direct.js','src/experiments/work-progress/camp-fixed.js',
 'src/experiments/work-progress/cases.js','scripts/work-progress-comparison.js',
 'src/runtime/index.js','src/runtime/clock.js','src/human/v0.1.1.js','src/core/model.js',
 'docs/work-progress-api.md','docs/work-progress-execution.md'
];
export async function freezeSources(){
 const sources={};
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 for(const path of relativeSources){
  const bytes=await readFile(resolve(root,path));
  const committed=execFileSync('git',['show',commit+':'+path],{cwd:root});
  assert.equal(sha(bytes),sha(committed),'Commit frozen input before recording source identity: '+path);sources[path]=sha(bytes);
 }
 return {format:'paid-work-source-freeze',version:1,commit,createdAt:new Date().toISOString(),sources};
}
export async function verifyFreeze(freeze){
 assert.equal(freeze.format,'paid-work-source-freeze');assert.equal(freeze.version,1);assert.match(freeze.commit,/^[a-f0-9]{40}$/);
 assert.deepEqual(Object.keys(freeze.sources).sort(),[...relativeSources].sort(),'freeze must cover all declared inputs');
 for(const [path,hash] of Object.entries(freeze.sources)){
  assert.equal(sha(await readFile(resolve(root,path))),hash,'Changed frozen source: '+path);
  assert.equal(sha(execFileSync('git',['show',freeze.commit+':'+path],{cwd:root})),hash,'Freeze does not match declared commit: '+path);
 }
}
function validAccounting(observation,fixture){
 assertJson(observation);
 assert.equal(Number.isSafeInteger(observation.now)&&observation.now>=0&&observation.now<=END_AT,true);
 for(const key of ['stock','spent','toolAvailable','outputs','actors','items','assignments','lastResponse'])assert.ok(Object.hasOwn(observation,key),'Missing accounting field '+key);
 assert.equal(typeof observation.toolAvailable,'boolean');
 const count=fixture.setup.items??1;
 const integer=(value,max=1440)=>assert.ok(Number.isSafeInteger(value)&&value>=0&&value<=max,'Invalid nonnegative accounting integer');
 integer(observation.outputs,count);
 for(const values of [observation.stock,observation.spent])for(const key of ['timber','salvage','toolBlank'])integer(values[key]);
 assert.equal(observation.items.length,count);
 let timber=observation.stock.timber+observation.spent.timber,salvage=observation.stock.salvage+observation.spent.salvage;
 for(const item of observation.items){
  assert.ok(item.progress>=0&&item.progress<=1);integer(item.reserved.timber,5);integer(item.reserved.salvage,1);timber+=item.reserved.timber;salvage+=item.reserved.salvage;
  const contributions=Object.values(item.contributions);
  for(const c of contributions){integer(c.minutes,observation.now);integer(c.basis);assert.ok(c.basis>=1&&c.fraction>=0&&c.fraction<=1&&c.effort>=0&&c.effort<=.2);}
  const fraction=contributions.reduce((n,c)=>n+c.fraction,0),effort=contributions.reduce((n,c)=>n+c.effort,0);
  assert.ok(Math.abs(item.progress-fraction)<1e-10,'Progress must equal paid contributions');
  assert.ok(Math.abs(effort-.2*fraction)<1e-10,'Only paid fraction earns effort');
 }
 assert.equal(timber,5*count);assert.equal(salvage,count);
 assert.equal(observation.stock.toolBlank+observation.spent.toolBlank,fixture.setup.toolArrival?1:0);
 for(const actor of ['A','B','C']){
  const {person,paid}=observation.actors[actor],p=restorePerson(person);
  for(const key of ['work','recovery','construction','hauling','crafting'])integer(paid[key],observation.now);
  const credits=observation.items.map(item=>item.contributions[actor]).filter(Boolean);
  assert.equal(credits.reduce((n,c)=>n+c.minutes,0),paid.construction,'Paid construction belongs to its worker');
  assert.ok(Math.abs(credits.reduce((n,c)=>n+c.effort,0)+paid.hauling*.01+paid.crafting*.02-paid.effort)<1e-10,'Paid effort must match actual owned tasks');
  assert.equal(p.nextAttempt,observation.now+1,'Exactly one paid Human attempt per actor-minute');
  assert.equal(p.minutes,observation.now);assert.equal(p.pending,null);
  assert.equal(paid.work+paid.recovery,observation.now);
  assert.equal(paid.work,paid.construction+paid.hauling+paid.crafting);
  assert.ok(paid.effort>=0);
  const initial=actor==='C'?{crafting:.1}:{construction:actor==='A' ? .1 : .6,hauling:.1};
  assert.deepEqual(Object.keys(p.skills).sort(),Object.keys(initial).sort());
  for(const [skill,start] of Object.entries(initial)){let expected=start;for(let i=0;i<paid[skill];i++)expected=practice(expected,1);assert.equal(p.skills[skill],expected,'Only actual paid task exposure changes practice');}
  let hunger=.2;for(let i=0;i<observation.now;i++)hunger=Math.min(1,hunger+PARAMETERS.hungerPerMinute);assert.equal(p.body.hunger,hunger,'Every minute pays actual hunger');
 }
}
export function executeHistory(api,fixture,driver,{restore=false}={}){
 assert.ok(DRIVERS.includes(driver));
 let world,cursor=0,chunk=0,restored=false;
 const records=[],checkpoints=[];
 try {
 world=api.createWorld(clone(fixture.setup));
 const record=operation=>{
  const observation=api.observe(world);validAccounting(observation,fixture);
  const snapshot=api.exportWorld(world);assertJson(snapshot);
  records.push({operation:clone(operation),observation:clone(observation),snapshot:clone(snapshot)});
  return clone(observation);
 };
 const initial=record({type:'create',setup:fixture.setup});assert.equal(initial.now,0,'Fixture starts at zero');checkpoints.push({tag:'initial',observation:initial});
 while(true){
  let now=api.observe(world).now;
  if(restore&&!restored&&now===1){
   const before=canonical(api.observe(world)),snapshot=api.exportWorld(world);world=api.restoreWorld(JSON.parse(JSON.stringify(snapshot)));
   assert.equal(canonical(api.exportWorld(world)),canonical(snapshot),'JSON round trip changes authoritative snapshot');
   assert.equal(canonical(api.observe(world)),before,'JSON round trip changes accounting');restored=true;record({type:'restore'});
  }
  while(cursor<fixture.commands.length&&fixture.commands[cursor].at===now){
   const command=fixture.commands[cursor].command;
   world=api.command(world,clone(command));
   const observation=record({type:'command',at:now,command});assert.equal(observation.now,now,'A command may not advance time');
   checkpoints.push({tag:'command-'+cursor,observation});cursor++;
  }
  if(now===END_AT)break;
  const nextCommand=fixture.commands[cursor]?.at??END_AT;
  const boundary=Math.min(nextCommand,restore&&!restored?1:END_AT,END_AT);
  let target;
  if(driver==='minute')target=now+1;
  else if(driver==='uneven')target=now+[3,1,7,2,5][chunk++%5];
  else {const event=api.nextEvent(world);assert.ok(event===null||Number.isSafeInteger(event)&&event>now,'Next event must progress');target=event??boundary;}
  target=Math.min(target,boundary);
  assert.ok(target>now,'Driver cannot stop without a command or restore');
  world=api.advanceTo(world,target);assert.equal(api.observe(world).now,target);record({type:'advance',to:target});
 }
 const final=clone(api.observe(world));
 const completed=final.items.map(item=>item.completedAt).sort((a,b)=>a-b);
 assert.deepEqual(completed,fixture.expected,'Unexpected physical completion '+fixture.id);
 assert.equal(final.outputs,fixture.expected.length);
 checkpoints.push({tag:'final',observation:clone(final)});
 return {id:fixture.id,driver,restore,records,checkpoints,final,completed};
 }catch(error){
  let snapshot=null,snapshotError=null;
  try{if(world){const candidate=api.exportWorld(world);assertJson(candidate);snapshot=clone(candidate);}}catch(failure){snapshotError=String(failure.message);}
  error.evidence={id:fixture.id,driver,restore,fixture,records,checkpoints,snapshot,snapshotError};throw error;
 }
}
export async function runMatrix(freeze){
 await verifyFreeze(freeze);
 const paths={candidate:'camp-candidate',direct:'camp-direct',fixed:'camp-fixed'},apis={};
 for(const [arm,path] of Object.entries(paths))apis[arm]=await import(pathToFileURL(resolve(root,'src/experiments/work-progress',path+'.js')).href);
 const runs=[];
 for(const fixture of CASES)for(const driver of DRIVERS)for(const restore of [false,true]){
  for(const [arm,api] of Object.entries(apis)){
   const input=arm==='fixed'?{...fixture,expected:fixture.fixed}:fixture;
   let run;try{run=executeHistory(api,input,driver,{restore});}catch(error){error.evidence={...error.evidence,arm,freeze,completedRuns:runs};throw error;}run.arm=arm;runs.push(run);
  }
 }
 try {
 for(const fixture of CASES){
  for(const driver of DRIVERS)for(const restore of [false,true]){
   const matching=runs.filter(run=>run.id===fixture.id&&run.driver===driver&&run.restore===restore);
   const a=matching.find(run=>run.arm==='candidate'),d=matching.find(run=>run.arm==='direct');
   assert.equal(canonical(a.records.map(x=>x.observation)),canonical(d.records.map(x=>x.observation)),fixture.id+' candidate/direct full observation parity');
  }
  for(const arm of Object.keys(apis)){
   const matching=runs.filter(run=>run.id===fixture.id&&run.arm===arm),baseline=matching[0];
   for(const run of matching)assert.equal(canonical(run.checkpoints),canonical(baseline.checkpoints),fixture.id+' '+arm+' synchronized driver/restore parity');
  }
 }
 }catch(error){error.evidence={phase:'cross-arm-and-driver-comparison',freeze,runs};throw error;}
 return {format:'paid-work-camp-comparison',version:1,node:process.version,createdAt:new Date().toISOString(),freeze,runs,
  summary:{histories:CASES.length,arms:Object.keys(apis),drivers:DRIVERS,restores:[false,true],records:runs.length,
   completions:CASES.map(f=>({id:f.id,prospective:f.expected,fixed:f.fixed})),scope:'Synthetic prescribed histories and repeated driver/serialization checks; not independent human samples'}};
}
export async function replayMatrix(record){
 assert.equal(record.format,'paid-work-camp-comparison');await verifyFreeze(record.freeze);
 const current=await runMatrix(record.freeze);
 assert.equal(canonical(current.runs),canonical(record.runs),'Every full saved record must replay exactly');
 return {format:'paid-work-camp-replay',version:1,node:process.version,freeze:record.freeze,replayed:record.runs.length,exact:true};
}
function option(args,name){const i=args.indexOf(name);return i<0?null:args[i+1];}
async function main(){
 const args=process.argv.slice(2),out=option(args,'--out');if(!out)throw Error('Require a fresh --out file');
 let result;
 if(args[0]==='freeze')result=await freezeSources();
 else if(args[0]==='run'){const file=option(args,'--freeze');if(!file)throw Error('Require --freeze');result=await runMatrix(JSON.parse(await readFile(resolve(file),'utf8')));}
 else if(args[0]==='replay'){const file=option(args,'--input');if(!file)throw Error('Require --input');const bytes=await readFile(resolve(file));result=await replayMatrix(JSON.parse(file.endsWith('.gz')?gunzipSync(bytes):bytes));}
 else throw Error('Use freeze, run or replay');
 await mkdir(dirname(resolve(out)),{recursive:true});const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');
 await writeFile(resolve(out),out.endsWith('.gz')?gzipSync(bytes):bytes,{flag:'wx'});
 console.log(JSON.stringify(result.summary??{format:result.format,replayed:result.replayed??null,exact:result.exact??null,out},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(async error=>{
 const out=option(process.argv.slice(2),'--out');
 if(out&&error.evidence){const path=resolve(out+'.failed.json.gz');await mkdir(dirname(path),{recursive:true});await writeFile(path,gzipSync(Buffer.from(JSON.stringify({error:error.message,evidence:error.evidence},null,2)+'\n')),{flag:'wx'}).catch(failure=>console.error('Could not write separate failure evidence: '+failure.message));}
 console.error(error.stack);process.exitCode=1;
});
