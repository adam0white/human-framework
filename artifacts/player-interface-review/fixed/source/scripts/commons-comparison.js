import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpus,arch,platform} from 'node:os';
import {runComparison,COMPARISON_VERSION,POLICIES} from '../src/experiments/commons-comparison.js';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),BASE='9bd93c6';
const PHYSICS=['src/games/commons.js','src/human/index.js','src/core/model.js','src/runtime/clock.js'];
const POLICYSOURCE=['src/games/commons-policy.js','src/experiments/commons-comparison.js','scripts/commons-comparison.js'];
const SOURCES=[...PHYSICS,...POLICYSOURCE],REGISTRATION='artifacts/commons-comparison/preregistration.md';
const hash=value=>createHash('sha256').update(value).digest('hex');
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const sourceHashes=async()=>Object.fromEntries(await Promise.all(SOURCES.map(async p=>[p,hash(await readFile(resolve(ROOT,p)))])));
const fail=message=>{throw new Error(message);};
async function checkFrozenWorld() {
  for(const p of [...PHYSICS,'src/games/commons-policy.js']){
    const reference=execFileSync('git',['show',`${BASE}:${p}`],{cwd:ROOT});
    if(hash(reference)!==hash(await readFile(resolve(ROOT,p))))fail(`Frozen source changed: ${p}`);
  }
}
async function writeJSON(path,value){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n');}
function policySize(text,name,nextName){const start=text.indexOf(`export function ${name}(`),end=text.indexOf(`export function ${nextName}(`,start+1);const body=text.slice(start,end<0?undefined:end).trim();return {lines:body.split('\n').length,utf8Bytes:Buffer.byteLength(body)};}
function pairSummary(trials){
  const pairs=[];
  for(const rival of trials.filter(t=>t.policy==='project-pull'))for(const policy of POLICIES.filter(p=>p!=='project-pull')) {
    const baseline=trials.find(t=>t.conditionId===rival.conditionId&&t.solo===rival.solo&&t.policy===policy);
    if(rival.inputSha256!==baseline.inputSha256)fail('Comparison input states are not identical');
    const a=rival.final,b=baseline.final;
    pairs.push({conditionId:rival.conditionId,solo:rival.solo,baseline:policy,rivalStatus:rival.status,baselineStatus:baseline.status,
      bothEstablished:a.milestoneElapsed!==null&&b.milestoneElapsed!==null,
      milestoneMinutesSaved:a.milestoneElapsed!==null&&b.milestoneElapsed!==null?b.milestoneElapsed-a.milestoneElapsed:null,
      cacheDifference:a.caches-b.caches,workMinutesDifference:a.deltaStats.workMinutes-b.deltaStats.workMinutes,
      restMinutesDifference:a.deltaStats.restMinutes-b.deltaStats.restMinutes,foodConsumedDifference:a.deltaStats.consumedFood-b.deltaStats.consumedFood,
      commandDifference:rival.commandCount-baseline.commandCount});
  }
  return pairs;
}
async function main(){
  const [action,...args]=process.argv.slice(2),options={};
  if(!['run','freeze'].includes(action))fail('Use: node scripts/commons-comparison.js run|freeze --out path [--partition development|reserved] [--freeze manifest]');
  while(args.length){const key=args.shift();if(!['--out','--partition','--freeze'].includes(key)||!args.length||Object.hasOwn(options,key))fail('Invalid comparison arguments');options[key]=args.shift();}
  if(!options['--out'])fail('--out is required');
  const output=resolve(ROOT,options['--out']);await checkFrozenWorld();
  const hashes=await sourceHashes(),registrationSha256=hash(await readFile(resolve(ROOT,REGISTRATION)));
  if(action==='freeze') {
    if(options['--partition']||options['--freeze'])fail('Freeze accepts only --out');
    if(git(['status','--porcelain','--',...SOURCES,REGISTRATION]))fail('Commit all policy, harness, and registration sources before freezing');
    try{await readFile(output);fail('Refusing to overwrite an existing freeze manifest');}catch(error){if(error.code!=='ENOENT')throw error;}
    const manifest={format:'commons-comparison-freeze',version:1,comparisonVersion:COMPARISON_VERSION,baseCommit:git(['rev-parse',BASE]),sourceCommit:git(['rev-parse','HEAD']),frozenAt:new Date().toISOString(),registrationSha256,sourceSha256:hashes};
    await writeJSON(output,manifest);process.stdout.write(`Frozen committed sources in ${output}\n`);return;
  }
  const partition=options['--partition']??'development';if(!['development','reserved'].includes(partition))fail('Partition must be development or reserved');
  let freeze=null;
  if(partition==='reserved'||options['--freeze']) {
    if(!options['--freeze'])fail('Reserved evaluation requires --freeze with a committed-source manifest');
    freeze=JSON.parse(await readFile(resolve(ROOT,options['--freeze']),'utf8'));
    if(freeze.format!=='commons-comparison-freeze'||freeze.version!==1||freeze.comparisonVersion!==COMPARISON_VERSION||freeze.registrationSha256!==registrationSha256||JSON.stringify(freeze.sourceSha256)!==JSON.stringify(hashes))fail('Freeze manifest does not match current policy, harness, physics, and registration');
  }
  const report=runComparison({partition,allowReserved:partition==='reserved'});
  const trials=report.trials.map(trial=>({...trial,inputSha256:hash(JSON.stringify(trial.initialState)),finalSha256:hash(JSON.stringify(trial.finalState)),
    noTimeCommandCount:trial.commands.filter(c=>c.advanced===0).length,declinedRequests:trial.commands.filter(c=>c.response?.accepted===false).length,capacityRejectedCommands:trial.commands.filter(c=>c.status==='rejected'&&/fatigue|hunger/.test(c.error??'')).length}));
  const rivalSource=await readFile(resolve(ROOT,'src/experiments/commons-comparison.js'),'utf8'),existingSource=await readFile(resolve(ROOT,'src/games/commons-policy.js'),'utf8');
  const artifact={...report,trials,provenance:{baseCommit:git(['rev-parse',BASE]),executionCommit:git(['rev-parse','HEAD']),sourceSha256:hashes,registrationSha256,freeze},
    runtime:{node:process.version,platform:platform(),architecture:arch(),cpu:cpus()[0]?.model??'unknown',timingMeasured:false,renderingIncluded:false},
    policySize:{projectPull:policySize(rivalSource,'chooseRival','createCondition'),existingSharedChooseFunction:policySize(existingSource,'chooseCommand','applyCommand'),note:'Source formatting and shared code affect these code-size proxies. They are not measured authoring effort or cognitive complexity.'},pairs:pairSummary(trials)};
  await writeJSON(output,artifact);
  process.stdout.write(`${partition}: ${trials.length} trials saved to ${output}\n`);
  for(const t of trials)process.stdout.write(`${t.conditionId.padEnd(15)} ${t.solo?'solo':'team'} ${t.policy.padEnd(12)} status=${t.status} milestone=${t.final.milestoneElapsed??'unfinished'} caches=${t.final.caches} commands=${t.commandCount} rejected=${t.rejectedCommands}\n`);
}
main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
