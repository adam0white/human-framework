import {createMemory,encodeObservation,recallObservation,exportMemory,restoreMemory,MEMORY_VERSION} from '../src/cognition/observation-memory.js';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cpus,platform,arch} from 'node:os';
import {execFileSync} from 'node:child_process';

const opposite=value=>value==='left'?'right':'left';
const conditions=['visible','delayed','one-distractor','two-distractors','expired','corrected','undisclosed-change'];
const bytes=value=>Buffer.byteLength(JSON.stringify(value));

function protocol(condition,target){
  const deliveries=[{sequence:1,observer:'Ada',source:'signal',channel:'sight',cue:'gate',
    value:condition==='corrected'?opposite(target):target,observedAt:0}];
  if(condition==='one-distractor'||condition==='two-distractors')
    deliveries.push({...deliveries[0],sequence:2,cue:'bell',value:'quiet',observedAt:1});
  if(condition==='two-distractors')
    deliveries.push({...deliveries[0],sequence:3,cue:'flag',value:'red',observedAt:2});
  if(condition==='corrected')
    deliveries.push({...deliveries[0],sequence:2,value:target,observedAt:1});
  return {deliveries,queryAt:condition==='expired'?6:condition==='two-distractors'?3:condition==='visible'?1:2,
    visible:condition==='visible'?target:null,oracle:condition==='undisclosed-change'?opposite(target):target};
}

// The three choice providers receive a report stream and the same visible cue.
// None receives the scoring oracle or the condition name.
function chooseMemory(deliveries,visible,queryAt,resume=false){
  let state=createMemory({owner:'Ada',capacity:2,lifetimeMinutes:6});
  for(const delivery of deliveries){
    state=encodeObservation(state,delivery,delivery.observedAt+1);
    if(resume)state=restoreMemory(JSON.parse(JSON.stringify(exportMemory(state))));
  }
  const recalled=recallObservation(state,'gate',queryAt);
  return {state,choice:visible??recalled?.value??'left',stateBytes:bytes(state),retainedReports:state.entries.length,
    paidObservationMinutes:deliveries.length};
}
function chooseNotebook(deliveries,visible){
  const state=Object.create(null);
  for(const delivery of deliveries)state[delivery.cue]=delivery.value;
  return {choice:visible??state.gate??'left',stateBytes:bytes(state),retainedReports:Object.keys(state).length,
    paidObservationMinutes:deliveries.length};
}
function chooseNone(deliveries,visible){
  return {choice:visible??'left',stateBytes:bytes(null),retainedReports:0,paidObservationMinutes:deliveries.length};
}

export function runObservationMemoryProbe(){
  const cases=[];
  for(const condition of conditions)for(const initialTarget of ['left','right']){
    const {deliveries,visible,queryAt,oracle}=protocol(condition,initialTarget);
    const arms={memory:chooseMemory(deliveries,visible,queryAt),notebook:chooseNotebook(deliveries,visible),none:chooseNone(deliveries,visible)};
    const resumed=chooseMemory(deliveries,visible,queryAt,true);
    const resumeIdentical=JSON.stringify(resumed)===JSON.stringify(arms.memory);
    const resumeStateSha256=createHash('sha256').update(JSON.stringify(resumed.state)).digest('hex');
    delete arms.memory.state;
    for(const result of Object.values(arms))result.correct=result.choice===oracle;
    cases.push({condition,initialTarget,queryAt,visible,oracle,deliveries,arms,resumeIdentical,resumeStateSha256});
  }
  const correct=Object.fromEntries(['memory','notebook','none'].map(arm=>[arm,cases.filter(row=>row.arms[arm].correct).length]));
  const maxStateBytes=Object.fromEntries(['memory','notebook','none'].map(arm=>[arm,Math.max(...cases.map(row=>row.arms[arm].stateBytes))]));
  return {protocolVersion:1,memoryVersion:MEMORY_VERSION,cases,summary:{trials:cases.length,correct,maxStateBytes},boundCheck:runMemoryBoundCheck(),
    limits:['Authored capacity and expiry, not fitted human mechanisms.','Notebook has no capacity or expiry constraint; this compares engineering alternatives, not an isolated capacity effect.',
      'Identical prescribed one-minute observations; no physiological cost model or human timing measured.','Saved-state bytes exclude program code and full host state.','Structural validation cannot prove the truth or real occurrence of reports.']};
}

function runMemoryBoundCheck(){
  let state=createMemory({owner:'Ada',capacity:2,lifetimeMinutes:6}),maxStateBytes=bytes(state),maxEntries=0;
  const notebook=Object.create(null);
  for(let sequence=1;sequence<=10000;sequence++){
    const delivery={sequence,observer:'Ada',source:'signal',channel:'sight',cue:`cue${sequence}`,value:'left',observedAt:sequence-1};
    state=encodeObservation(state,delivery,sequence);notebook[delivery.cue]=delivery.value;
    maxStateBytes=Math.max(maxStateBytes,bytes(state));maxEntries=Math.max(maxEntries,state.entries.length);
  }
  const restored=restoreMemory(JSON.parse(JSON.stringify(exportMemory(state))));
  const resumeStateIdentical=JSON.stringify(restored)===JSON.stringify(state);
  if(maxEntries>2||maxStateBytes>=1000||state.lastSequence!==10000||!resumeStateIdentical)throw new Error('Observation memory bounded-state contract failed');
  return {deliveries:10000,maxEntries,maxStateBytes,lastReceipt:state.lastSequence,resumeStateIdentical,
    notebookFinalStateBytes:bytes(notebook),note:'Different contracts: the notebook retains all 10000 cues, the candidate only two recent claims. Byte count is not evidence that forgetting improves decisions.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const root=fileURLToPath(new URL('../',import.meta.url));
  const preregistrationCommit=execFileSync('git',['rev-parse','d3ed0d1'],{cwd:root,encoding:'utf8'}).trim();
  const files=['docs/superpowers/specs/2026-09-08-observation-memory-design.md','src/cognition/observation-memory.js','scripts/observation-memory-probe.js'];
  const sources=await Promise.all(files.map(async path=>({path,sha256:createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')})));
  const original=execFileSync('git',['show',`${preregistrationCommit}:${files[0]}`],{cwd:root});
  if(createHash('sha256').update(original).digest('hex')!==sources[0].sha256)throw new Error('Preregistered memory protocol changed; use a dated amendment');
  const result={...runObservationMemoryProbe(),recordedAt:new Date().toISOString(),preregistrationCommit,preregistrationVerified:true,sources,
    environment:{node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model}};
  const output=process.argv[2];
  if(output){await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(resolve(output),JSON.stringify(result,null,2)+'\n',{flag:'wx'});}
  console.log(JSON.stringify({output:output??null,summary:result.summary,boundCheck:result.boundCheck},null,2));
}
