/** Compact post-review validation; original policies, harness and evidence stay frozen. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT,hash,git,assertFreshOutput,writeJSON,freezeSources,verifyFreeze} from '../src/experiments/service-day/provenance.js';
const VALIDATOR='scripts/service-day-final-validation.js';
const HOST_FIX='0a48e9fb058b3c2011ac77d5c0267f6c908f7e90';
const extract=t=>t.commands.map(({view,...entry})=>entry);
function maximumZeroTimeStreak(trial){let current=0,maximum=0;for(const entry of trial.commands){current=entry.advanced===0?current+1:0;maximum=Math.max(maximum,current);}return maximum;}
function checkTrial(original,current){
 assert.equal(original.conditionId,current.conditionId);assert.equal(original.policy,current.policy);
 assert.deepEqual(original.initialState,current.initialState);assert.deepEqual(original.finalState,current.finalState);
 assert.deepEqual(original.initial,current.initial);assert.deepEqual(original.final,current.final);
 assert.deepEqual(extract(original),extract(current));assert.deepEqual(original.partnerRecords,current.partnerRecords);
 return {conditionId:current.conditionId,policy:current.policy,status:current.status,
  equality:{initialSave:true,finalSave:true,finalWorld:true,servicesPaidResources:true,decisionsAndResponses:true,partnerRecords:true},
  originalInitialSha256:hash(original.initialState),finalSaveSha256:hash(current.finalState),finalWorldSha256:hash(current.finalState.state),decisionResponseSha256:hash(extract(current)),
  service:{morning:current.final.morning,delivery:current.final.delivery,outcome:current.final.outcome},resources:current.final.resources,paidByActor:current.final.paidByActor,
  maximumExecutedZeroTimeStreak:maximumZeroTimeStreak(current),resumeEqual:current.resumeEqual,replayEqual:current.replayEqual,
  replayInputs:{initialState:current.initialState,commands:current.commands.map(entry=>entry.command)}};
}
async function main(){
 const [action,...args]=process.argv.slice(2),options={};
 if(!['freeze','run'].includes(action))throw new Error('Use freeze|run --out fresh-path [--freeze committed-manifest].');
 while(args.length){const key=args.shift();if(!['--out','--freeze'].includes(key)||!args.length||Object.hasOwn(options,key))throw new Error('Invalid validation arguments.');options[key]=args.shift();}
 if(!options['--out'])throw new Error('An explicit --out path is required.');
 const output=resolve(ROOT,options['--out']);await assertFreshOutput(output);
 const source=await readFile(resolve(ROOT,VALIDATOR)),validatorSha256=hash(source);
 if(hash(execFileSync('git',['show',`HEAD:${VALIDATOR}`],{cwd:ROOT}))!==validatorSha256)throw new Error('Commit the validator before binding or executing it.');
 if(hash(await readFile(resolve(ROOT,'src/games/service.js')))!==hash(execFileSync('git',['show',`${HOST_FIX}:src/games/service.js`],{cwd:ROOT})))throw new Error('Expected the explicit reviewed host fix.');
 if(action==='freeze'){
  if(options['--freeze'])throw new Error('Freeze accepts only --out.');
  await writeJSON(output,{...await freezeSources(),validation:{path:VALIDATOR,sha256:validatorSha256},hostFix:HOST_FIX});
  process.stdout.write(`Final host and compact validator frozen in ${output}\n`);return;
 }
 if(!options['--freeze'])throw new Error('A committed final-host --freeze manifest is required.');
 const freeze=await verifyFreeze(resolve(ROOT,options['--freeze']));
 assert.deepEqual(freeze.validation,{path:VALIDATOR,sha256:validatorSha256});assert.equal(freeze.hostFix,HOST_FIX);
 assert.equal(hash(execFileSync('git',['show',`${freeze.sourceCommit}:${VALIDATOR}`],{cwd:ROOT})),validatorSha256);
 const {runComparison,runCarryover}=await import('../src/experiments/service-day/experiment.js');
 const originals={},referenceArtifacts=[],trials=[];
 for(const partition of ['development','reserved']){
  const path=`artifacts/service-day/${partition}.json`,bytes=await readFile(resolve(ROOT,path));originals[partition]=JSON.parse(bytes);
  referenceArtifacts.push({path,sha256:hash(bytes)});
  const current=runComparison({partition,allowReserved:partition==='reserved'});
  assert.equal(originals[partition].trials.length,current.trials.length);
  trials.push(...current.trials.map((trial,i)=>({partition,...checkTrial(originals[partition].trials[i],trial)})));
 }
 const originalCarryover=originals.development.carryover,currentCarryover=runCarryover();
 assert.deepEqual(originalCarryover.commonState,currentCarryover.commonState);
 const carryover=currentCarryover.branches.map((branch,i)=>{
  const original=originalCarryover.branches[i];assert.equal(original.route,branch.route);
  for(const key of ['commonState','prefix','beforeRequest','pumpChoice','matchedResponse','afterRequest'])assert.deepEqual(original[key],branch[key]);
  return {route:branch.route,commonState:branch.commonState,prefix:branch.prefix,matchedRequest:{type:'request',actor:'keeper',task:'pump',at:24},matchedResponse:branch.matchedResponse,commonAdvanceTo:30,
   commonStateSha256:hash(branch.commonState),beforeRequest:branch.beforeRequest,afterRequest:branch.afterRequest,continuation:checkTrial(original.continuation,branch.continuation)};
 });
 const maximum=Math.max(...trials.map(t=>t.maximumExecutedZeroTimeStreak),...carryover.map(b=>b.continuation.maximumExecutedZeroTimeStreak));
 await writeJSON(output,{format:'service-day-final-host-validation',version:1,scope:'Post-unsealing validation of final host refusal coalescing. No policy/harness tuning or new reserved evidence. Full checkpoint views are referenced by artifact hashes rather than repeated.',
  provenance:{executionCommit:git(['rev-parse','HEAD']),freeze,referenceArtifacts,validatorSha256},trials,carryover,
  frozenHarnessLimitation:{registrationMaximumZeroTimeCommands:8,actualDispatchesBeforeTrip:9,tripOccurs:'After dispatching the ninth consecutive zero-time command because the check is zeroTime > 8.',maximumInTheseTrialsAndCarryover:maximum,reportedResultsAffected:maximum>8,note:'A pathological custom controller can execute a ninth command, including any allowed effects, before the watchdog ends its partial trial. Original harness is preserved; this is not an exact eight-command admission limit.'}});
 process.stdout.write(`Verified ${trials.length} original trials and ${carryover.length} carryover branches; maximum executed zero-time streak ${maximum}. Saved compact evidence to ${output}\n`);
}
main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
