/** Explicit fresh-output private evidence runner; no deployment or network actions. */
import {resolve} from 'node:path';
import {cpus,platform,arch} from 'node:os';
import {ROOT,assertFreshOutput,writeJSON,freezeSources,verifyFreeze,checkProtocol,sourceHashes,sourceSizes,git,hash} from '../src/experiments/service-day/provenance.js';
async function main(){
 const [action,...args]=process.argv.slice(2),options={};
 if(!['freeze','run'].includes(action))throw new Error('Use freeze|run --out fresh-path [--partition development|reserved] [--freeze committed-manifest].');
 while(args.length){const key=args.shift();if(!['--out','--partition','--freeze'].includes(key)||!args.length||Object.hasOwn(options,key))throw new Error('Invalid service-day arguments.');options[key]=args.shift();}
 if(!options['--out'])throw new Error('An explicit --out path is required.');
 const output=resolve(ROOT,options['--out']);await assertFreshOutput(output);
 if(action==='freeze'){
  if(options['--partition']||options['--freeze'])throw new Error('Freeze accepts only --out.');
  await writeJSON(output,await freezeSources());process.stdout.write(`Frozen committed sources in ${output}\n`);return;
 }
 const partition=options['--partition']??'development';if(!['development','reserved'].includes(partition))throw new Error('Invalid partition.');
 if(partition==='reserved'&&!options['--freeze'])throw new Error('Reserved comparison requires a committed --freeze manifest.');
 const protocolSha256=await checkProtocol(),freeze=options['--freeze']?await verifyFreeze(resolve(ROOT,options['--freeze'])):null;
 const {runComparison,runCarryover}=await import('../src/experiments/service-day/experiment.js');
 const report=runComparison({partition,allowReserved:partition==='reserved'});
 for(const trial of report.trials){trial.initialSha256=hash(trial.initialState);trial.finalSha256=hash(trial.finalState);}
 const carryover=partition==='development'?runCarryover():null;
 const artifact={...report,carryover,provenance:{executionCommit:git(['rev-parse','HEAD']),sourceSha256:await sourceHashes(),protocolSha256,freeze},
  implementation:{sourceSizes:await sourceSizes(),note:'Both policies use the entire shared selector and helper source. Count both files for either deployed arm. Byte/line counts are implementation proxies, not measured human authoring effort. Persistent policy state is empty; null serializes to four bytes. Evidence traces are separate from active save/view budgets.'},
  runtime:{node:process.version,platform:platform(),architecture:arch(),cpu:cpus()[0]?.model??'unknown',timingMeasured:false,renderingIncluded:false},
  scope:'Authored deterministic policy/carryover cases under identical Human physics. No human-validity, Human-versus-body-model, optimality, authoring-effort or human playtest claim.'};
 await writeJSON(output,artifact);process.stdout.write(`${partition}: ${report.trials.length} trials saved to ${output}\n`);
 for(const trial of report.trials){const f=trial.final;process.stdout.write(`${trial.conditionId} / ${trial.policy}: ${trial.status}; inlet protected=${f.morning?.protected??'pending'}, water=${f.morning?.waterService??'pending'}; clinic=${f.delivery?.units??0} at ${f.delivery?.at??'undelivered'}; commands=${trial.commandCount}; refusals=${trial.refusals.length}\n`);}
}
main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
