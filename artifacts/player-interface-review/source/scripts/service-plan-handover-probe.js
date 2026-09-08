/** Post-review exploratory commands, outside the preregistered comparison catalogue. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT,hash,git,sourceHashes,writeJSON,assertFreshOutput} from '../src/experiments/service-plan/provenance.js';
import {runTrial} from '../src/experiments/service-plan/experiment.js';
async function main(){
 const out=process.argv[2];if(!out||process.argv.length!==3)throw Error('Supply one fresh output path.');
 await assertFreshOutput(resolve(ROOT,out));
 const ownPath='scripts/service-plan-handover-probe.js',sourceSha256={...await sourceHashes(),[ownPath]:hash(await readFile(resolve(ROOT,ownPath)))};
 const sourceCommit=git(['rev-parse','HEAD']);
 for(const [path,digest] of Object.entries(sourceSha256))assert.equal(hash(execFileSync('git',['show',`${sourceCommit}:${path}`],{cwd:ROOT})),digest,`Commit source before this exploratory probe: ${path}`);
 const ask=(at,actor,task)=>({at,command:{type:'request',actor,task}}),stop=at=>({at,command:{type:'interrupt',actor:'keeper'}}),end={at:64,command:{type:'advance',to:64}};
 const scenarios=[
  {id:'early-22',steps:[ask(0,'keeper','gate'),ask(6,'keeper','gate'),ask(12,'keeper','salvage'),ask(20,'keeper','share'),end]},
  {id:'clinic-37',steps:[ask(0,'keeper','meal'),ask(4,'keeper','gate'),ask(10,'keeper','gate'),ask(16,'keeper','salvage'),ask(24,'keeper','rest'),ask(37,'keeper','share'),end]},
  {id:'late-41',steps:[ask(0,'keeper','meal'),ask(4,'keeper','gate'),ask(10,'keeper','gate'),ask(24,'keeper','pump'),ask(30,'keeper','rest'),stop(33),ask(33,'keeper','salvage'),ask(41,'keeper','share'),end]}
 ];
 const trials=[];
 for(const scenario of scenarios)for(const arm of ['original-fixed','direct-fixed']){
  const t=await runTrial({id:`handover-${scenario.id}-${arm}`,family:scenario.id,arm,variant:'part-handover',partition:'post-review-exploratory',steps:scenario.steps});
  assert.equal(t.status,'ended');assert.equal(t.final.resources.handedOver.keeper,1);
  trials.push(t);
 }
 const report={format:'service-plan-handover-probe',version:1,scope:'Post-review exploratory prescriptions requested after Fable suggested a cheaper part handover. Not part of the registered25development/fourreserved cases, not policy tuning, and not evidence for general planning. Old/new slot rules remain distinct; both use the same ownership and actual paid action costs.',provenance:{sourceCommit,sourceSha256},runtime:{node:process.version},trials};
 await writeJSON(resolve(ROOT,out),report);
 for(const t of trials)process.stdout.write(`${t.id}: ${t.final.delivery?.units??0} units at ${t.final.delivery?.at??'none'}; keeper share=${t.final.paidByActor.keeper.share}; partner pump=${t.final.paidByActor.partner.pump}, rest=${t.final.paidByActor.partner.rest}; remaining parts=${JSON.stringify(t.final.resources.parts)}\n`);
}
main().catch(e=>{process.stderr.write(`${e.message}\n`);process.exitCode=1;});
