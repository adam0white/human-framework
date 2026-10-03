/** Additive profile evidence. Original four situations and their artifact remain unchanged. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {resolve,dirname} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {createSignals,requestTask,interruptTask,advanceTo,getSignalsView,exportSignals,restoreSignals} from '../src/games/signals.js';import {runComparison} from './signals-comparison.js';
const root=fileURLToPath(new URL('../',import.meta.url)),amendmentPath='docs/superpowers/specs/2026-09-08-signals-profile-amendment.md',amendmentCommit='e2c9ce7',originalPath='artifacts/signals/2026-09-08-comparison.json';
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex'),json=x=>JSON.parse(JSON.stringify(x));
const routes=[
 {id:'clear-report',situation:'clear',commands:['radio',3,'canal']},
 {id:'clear-blind',situation:'clear',commands:['canal']},
 {id:'clear-ridge',situation:'clear',commands:['ridge']},
 {id:'tired-immediate-ridge',situation:'tired',commands:['ridge',32]},
 {id:'tired-canal',situation:'tired',commands:['canal']},
 {id:'tired-rest-ridge',situation:'tired',commands:['ridge','rest','ridge']},
 {id:'hungry-rest-only',situation:'hungry',commands:['canal','rest','canal',32]},
 {id:'hungry-meal-canal',situation:'hungry',commands:['meal','canal']},
 {id:'hungry-meal-ridge',situation:'hungry',commands:['meal','ridge']},
 {id:'hungry-interrupted-meal',situation:'hungry',commands:['rest',{start:'meal'},6,{stop:true},'canal','meal','canal']}
];
function run(route,resume=false){let state=createSignals({situation:route.situation});const trace=[];
 function checkpoint(command){if(resume)state=restoreSignals(json(exportSignals(state)));trace.push({command:json(command),view:getSignalsView(state),stateSha256:hash(exportSignals(state))});}
 function move(to){while(state.clock.now<to&&!state.outcome){state=advanceTo(state,state.clock.now+1);if(resume)state=restoreSignals(json(exportSignals(state)));}}
 checkpoint('initial');
 for(const command of route.commands){
  if(typeof command==='number')move(command);
  else if(typeof command==='string'){state=requestTask(state,command);checkpoint({request:command,response:state.lastResponse});if(state.lastResponse.accepted)move(state.job.endsAt);}
  else if(command.stop)state=interruptTask(state);
  else state=requestTask(state,command.start);
  checkpoint(command);
 }
 if(!state.outcome){move(32);checkpoint('closing');}
 return {...route,trace,outcome:state.outcome,paid:state.paid,spent:state.spent,finalHost:exportSignals(state)};
}
export function runProfileEvidence(){return {format:'signals-additive-profile-evidence',version:1,scope:'Ten authored routes. New profile conditions only; no calibrated human validity, policy optimization or cognition-superiority claim. The blind clear-connection route is faster than observing; radio is feasible, not necessary.',runs:routes.map(route=>{const direct=run(route),resumed=run(route,true),resumeEqual=JSON.stringify(direct)===JSON.stringify(resumed);if(!resumeEqual)throw new Error(`Profile resume differs: ${route.id}`);return {...direct,resumeEqual};})};}
export async function writeProfileEvidence(destination){
 if(typeof destination!=='string'||!destination.trim())throw new Error('Provide an explicit new output path.');
 const originalBytes=await readFile(resolve(root,originalPath),'utf8'),original=JSON.parse(originalBytes),current=runComparison();
 for(const key of Object.keys(current))if(JSON.stringify(current[key])!==JSON.stringify(original[key]))throw new Error(`Original comparison changed: ${key}`);
 const commit=execFileSync('git',['rev-parse',`${amendmentCommit}^{commit}`],{cwd:root,encoding:'utf8'}).trim(),committed=execFileSync('git',['show',`${commit}:${amendmentPath}`],{cwd:root,encoding:'utf8'}),amendment=await readFile(resolve(root,amendmentPath),'utf8');if(committed!==amendment)throw new Error('Design amendment changed after commitment.');
 const files=['src/games/signals.js','scripts/signals-profile-evidence.js','src/runtime/index.js','src/runtime/clock.js','src/human/v0.1.1.js','src/core/model.js'];
 const result={...runProfileEvidence(),node:process.version,originalComparisonUnchanged:true,originalArtifact:originalPath,originalArtifactSha256:hash(originalBytes),preservedComparisonFields:Object.keys(current),amendment:{path:amendmentPath,commit,sha256:hash(amendment),verified:true},sourceSha256:Object.fromEntries(await Promise.all(files.map(async file=>[file,hash(await readFile(resolve(root,file),'utf8'))])))};
 const path=resolve(destination);await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(result,null,2)+'\n',{flag:'wx'});return {path,runs:result.runs.map(r=>({id:r.id,...r.outcome,restMinutes:r.paid.rest,mealMinutes:r.paid.meal})),originalComparisonUnchanged:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(process.argv.length!==3)throw new Error('Usage: node scripts/signals-profile-evidence.js <new-output-path>');console.log(JSON.stringify(await writeProfileEvidence(process.argv[2]),null,2));}
