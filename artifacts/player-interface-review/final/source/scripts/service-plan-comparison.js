/** Private source-bound comparison runner. Explicit fresh outputs; no network/deployment. */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {platform,arch} from 'node:os';
import {ROOT,assertFreshOutput,writeJSON,checkProtocol,freezeSources,verifyFreeze,sourceHashes,sourceSizes,git} from '../src/experiments/service-plan/provenance.js';
async function main(){
 const [action,...args]=process.argv.slice(2),options={};
 if(!['run','freeze','replay'].includes(action))throw Error('Use run|freeze|replay with --out fresh-path.');
 while(args.length){const key=args.shift();if(!['--out','--partition','--freeze','--input'].includes(key)||!args.length||Object.hasOwn(options,key))throw Error('Invalid comparison arguments.');options[key]=args.shift();}
 if(!options['--out'])throw Error('An explicit --out is required.');
 const out=resolve(ROOT,options['--out']);await assertFreshOutput(out);
 if(action==='freeze'){
  if(Object.keys(options).length!==1)throw Error('Freeze accepts only --out.');
  await writeJSON(out,await freezeSources());process.stdout.write(`Committed sources frozen in ${out}\n`);return;
 }
 const partition=options['--partition']??'development';if(!['development','reserved'].includes(partition))throw Error('Invalid partition.');
 if((partition==='reserved'||action==='replay')&&!options['--freeze'])throw Error('Reserved comparison/replay requires a committed --freeze manifest.');
 const protocolSha256=await checkProtocol(),freeze=options['--freeze']?await verifyFreeze(resolve(ROOT,options['--freeze'])):null;
 const sourceSha256=await sourceHashes();
 const {runComparison,replayTrial}=await import('../src/experiments/service-plan/experiment.js');
 if(action==='replay'){
  if(!options['--input'])throw Error('Replay requires --input evidence.');
  const artifact=JSON.parse(await readFile(resolve(ROOT,options['--input']),'utf8'));
  if(artifact.format!=='service-plan-comparison'||JSON.stringify(artifact.provenance.sourceSha256)!==JSON.stringify(sourceSha256))throw Error('Evidence source hashes do not match current frozen source.');
  const verified=[];for(const trial of artifact.trials)verified.push({id:trial.id,finalSaveSha256:await replayTrial(trial)});
  await writeJSON(out,{format:'service-plan-comparison-replay',version:1,input:options['--input'],sourceSha256,freeze,verified});
  process.stdout.write(`Replayed ${verified.length} complete compact journals.\n`);return;
 }
 if(options['--input'])throw Error('Run does not accept --input.');
 const report=await runComparison({partition,unseal:partition==='reserved'});
 const artifact={...report,provenance:{executionCommit:git(['rev-parse','HEAD']),protocolSha256,sourceSha256,freeze},implementation:{sourceSizes:await sourceSizes(),note:'Include full host plus variant transform and generated host when considering this private rival. Source counts are not measured authoring effort. Cases are prescribed interventions with differing communication/recovery exposure.'},runtime:{node:process.version,platform:platform(),architecture:arch()},scope:'Authored deterministic script cases. Distinct old/new action sets are not pooled. No general planner, human realism, enjoyment, optimality or independent authoring benefit is established.'};
 await writeJSON(out,artifact);
 for(const t of report.trials)process.stdout.write(`${t.id}: ${t.status}; clinic=${t.final.delivery?.units??0} at ${t.final.delivery?.at??'none'}; rest=${t.final.paidByActor.partner.rest}; discussion=${t.final.paidByActor.partner.discuss??0}; commands=${t.commandCount}\n`);
}
main().catch(e=>{process.stderr.write(`${e.message}\n`);process.exitCode=1;});
