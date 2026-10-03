/** Private engineering comparison. Never imported by the game or published runtime. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createSignals,requestTask,advanceTo,getSignalsView,exportSignals,restoreSignals,retainReport} from '../src/games/signals.js';
import {createMemory,advanceMemory,encodeObservation,recallObservation,exportMemory,restoreMemory} from '../src/cognition/observation-memory.js';
const root=fileURLToPath(new URL('../',import.meta.url)),protocolPath='docs/signals-comparison-protocol.md',protocolCommit='1f8b2f8';
const json=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export const CASES=Object.freeze([
 {id:'no-observation',situation:'steady',prelude:[]},
 {id:'visible-open',situation:'steady',prelude:['lookout']},
 {id:'retained-open',situation:'steady',prelude:['lookout',4]},
 {id:'visible-closed',situation:'turning',prelude:['lookout']},
 {id:'changed-report',situation:'turning',prelude:['lookout','lookout']},
 {id:'old-reply-turning',situation:'turning',prelude:['radio','lookout',6]},
 {id:'old-reply-falling',situation:'falling',prelude:['radio','lookout',6]},
 {id:'undisclosed-close',situation:'falling',prelude:['lookout',5]},
 {id:'undisclosed-open',situation:'turning',prelude:['lookout',5]},
 {id:'paid-radio',situation:'steady',prelude:['radio',6]},
 {id:'late-old-reply',situation:'falling',prelude:[16,'radio','lookout',22]},
 {id:'deadline-tie',situation:'falling',prelude:[20,'radio',26]}
]);
function choose(report){return report?.value==='open'?'canal':'ridge';}
export function runCase(condition,arm,{resume=false}={}){
 if(!['notebook','candidate','none'].includes(arm))throw new Error('Unknown provider.');
 let host=createSignals({situation:condition.situation}),provider=arm==='candidate'?createMemory({owner:'carrier',capacity:2,lifetimeMinutes:60}):null,lastSequence=0,visible=null;
 const deliveries=[],actions=[],checkpoints=[];let maxProviderBytes=JSON.stringify(provider).length;
 function providerSnapshot(){return arm==='candidate'?exportMemory(provider):json(provider);}
 function sync(){
  const now=host.clock.now;if(arm==='candidate')provider=advanceMemory(provider,now);
  visible=null;
  for(const d of host.deliveries){
   if(d.deliveredAt===now)visible=json(d);
   if(d.sequence<=lastSequence)continue;
   const {deliveredAt,...r}=d;
   if(arm==='candidate')provider=encodeObservation(provider,r,now);
   else if(arm==='notebook')provider=retainReport(provider,d);
   deliveries.push(json(d));lastSequence=d.sequence;
  }
  maxProviderBytes=Math.max(maxProviderBytes,Buffer.byteLength(JSON.stringify(provider)));
  if(resume){host=restoreSignals(json(exportSignals(host)));provider=arm==='candidate'?restoreMemory(json(exportMemory(provider))):json(provider);}
  checkpoints.push(hash({host:exportSignals(host),provider:providerSnapshot(),lastSequence,visible}));
 }
 function move(to){while(host.clock.now<to&&!host.outcome){host=advanceTo(host,host.clock.now+1);sync();}}
 function act(task){host=requestTask(host,task);actions.push({at:host.clock.now,task,response:json(host.lastResponse)});sync();if(host.lastResponse.accepted)move(host.job.endsAt);return host.lastResponse.accepted;}
 for(const command of condition.prelude){if(typeof command==='number')move(command);else if(!act(command))throw new Error(`Prelude refused: ${condition.id}/${command}`);}
 const now=host.clock.now,report=arm==='candidate'?recallObservation(provider,'landing',now):arm==='notebook'?provider:visible;
 const view=getSignalsView(host),offered=view.choices.filter(c=>['canal','ridge'].includes(c.task));
 const exposure={at:now,deliveries:json(deliveries),paid:json(host.paid),resources:json(host.resources),person:json(view.person)};
 const decision={at:now,report:json(report),task:choose(report)};
 // Only the evidence runner reads hidden landing, after the report-only decision.
 const oracleReportAgrees=report?report.value===host.landing:null;
 const firstAccepted=act(decision.task),firstAttemptFailed=host.failedCrossings>0;
 if(firstAccepted&&!host.outcome&&firstAttemptFailed)act('ridge');
 if(!host.outcome)move(32);
 return {arm,exposure,offered,decision,oracleReportAgrees,actions,outcome:json(host.outcome),paid:json(host.paid),spent:json(host.spent),maxProviderBytes,finalProvider:providerSnapshot(),finalHost:exportSignals(host),checkpointHashes:checkpoints};
}
function baseline(situation,route){let s=createSignals({situation}),firstAttemptFailed=false;s=requestTask(s,route);if(!s.lastResponse.accepted)throw new Error('Baseline refused.');s=advanceTo(s,s.job.endsAt);firstAttemptFailed=s.failedCrossings>0;if(!s.outcome&&firstAttemptFailed){s=requestTask(s,'ridge');if(s.lastResponse.accepted)s=advanceTo(s,s.job.endsAt);}if(!s.outcome)s=advanceTo(s,32);return {situation,route,firstAttemptFailed,outcome:s.outcome,spent:s.spent,paid:s.paid,finalHost:exportSignals(s)};}
export function runComparison(){
 const cases=CASES.map(condition=>{
  const arms=['notebook','candidate','none'].map(arm=>{const direct=runCase(condition,arm),resumed=runCase(condition,arm,{resume:true}),resumeEqual=JSON.stringify(direct)===JSON.stringify(resumed);if(!resumeEqual)throw new Error(`Resume diverged: ${condition.id}/${arm}`);return {...direct,resumeEqual,finalStateSha256:hash({host:direct.finalHost,provider:direct.finalProvider})};});
  for(const arm of arms)if(JSON.stringify(arm.exposure)!==JSON.stringify(arms[0].exposure)||JSON.stringify(arm.offered)!==JSON.stringify(arms[0].offered))throw new Error(`Exposure mismatch: ${condition.id}`);
  return {...condition,arms};
 });
 const baselines=['turning','falling','steady','shut'].flatMap(s=>['ridge','canal'].map(route=>baseline(s,route)));
 const summary=['notebook','candidate','none'].map(arm=>{const rows=cases.map(c=>c.arms.find(a=>a.arm===arm));return {arm,primaryDeliveries:rows.filter(r=>r.outcome.delivered).length,launchesSailed:rows.filter(r=>r.outcome.launchSailed).length,failedCrossings:rows.reduce((n,r)=>n+r.outcome.failedCrossings,0),maxProviderBytes:Math.max(...rows.map(r=>r.maxProviderBytes))};});
 return {format:'signals-representation-comparison',version:1,scope:'Twelve authored deterministic cases. Matched paid deliveries and choices; no human validity, optimization or superiority claim. Immediate route baselines are separately reported because their observation cost differs.',candidate:{capacity:2,lifetimeMinutes:60,episodeMaximum:32,expiryCannotAffectTheseCases:true},stateBytesScope:'Provider data only; shared host, delivery adapter, command log, program code and UI excluded. The public one-task notebook stores full provenance. Candidate has additional schema and receipt validation; bytes are not engineering effort.',cases,baselines,summary};
}
export async function writeEvidence(destination){
 if(typeof destination!=='string'||!destination.trim())throw new Error('An explicit new output path is required.');
 const commit=execFileSync('git',['rev-parse',`${protocolCommit}^{commit}`],{cwd:root,encoding:'utf8'}).trim();
 const original=execFileSync('git',['show',`${commit}:${protocolPath}`],{cwd:root,encoding:'utf8'}),current=await readFile(resolve(root,protocolPath),'utf8');
 if(original!==current)throw new Error('Protocol differs from its original committed bytes.');
 const files=['src/games/signals.js','scripts/signals-comparison.js','src/cognition/observation-memory.js','src/runtime/index.js','src/runtime/clock.js','src/human/v0.1.1.js','src/core/model.js'];
 const result={...runComparison(),node:process.version,protocol:{path:protocolPath,commit,sha256:hash(original),verified:true},sourceSha256:Object.fromEntries(await Promise.all(files.map(async p=>[p,hash(await readFile(resolve(root,p),'utf8'))])))};
 const path=resolve(destination);await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(result,null,2)+'\n',{flag:'wx'});return {path,summary:result.summary};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(process.argv.length!==3)throw new Error('Usage: node scripts/signals-comparison.js <new-output-path>; existing evidence is never replaced.');console.log(JSON.stringify(await writeEvidence(process.argv[2]),null,2));}
