/** Source-frozen boundary comparison. CLI run/replay always reconstruct Git bytes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {decide} from './policy.mjs';
import {hash,makeFreeze,loadFrozen} from './provenance.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const clone=structuredClone;
const json=x=>JSON.parse(JSON.stringify(x));
export const FORMAT='action-offer-comparison';
const reportIds=view=>view.reportableObservations.slice(-32).map(o=>o.receipt);
export function offersFor(view,definition,api){
  if(definition.host==='camp')return view.choices.filter(o=>o.id===definition.target).map(o=>({...o,capacityUncertain:false,action:{type:'start',job:o.id}}));
  if(definition.policy==='report'){
    const ids=reportIds(view),via=definition.via;
    const status=api.view.reportOffer?api.view.reportOffer(view,ids.length,via):{unavailable:api.view.reportUnavailable(view,ids.length,via),capacityUncertain:false};
    return [{id:`report-${via}`,duration:1,...status,action:{task:'transmit',via,message:{kind:'report',observationIds:ids}}}];
  }
  const ids={inspect:['inspect'],repair:['repair-full','repair-one'],release:['release']}[definition.policy];
  return ids.map(id=>view.choices.find(o=>o.id===id));
}
function acrossPhysical(game,api){
  const summary=api.host.getWorldSummary(game.host);
  return {now:summary.now,actors:clone(summary.actors),work:clone(summary.work),service:clone(summary.service),water:clone(summary.water),transport:clone(summary.transport)};
}
function campPhysical(game,api){
  const v=api.camp.getGameView(game);
  return {now:v.now,actors:Object.fromEntries(['player','neighbor'].map(a=>[a,{body:clone(game.people[a].body),paid:clone(v.paid[a])}])),stock:clone(v.stock),work:clone(v.work),structures:clone(v.structures),caches:v.caches,service:null};
}
function differences(before,after){
  const paidDelta={};
  for(const [actor,p] of Object.entries(after.actors))paidDelta[actor]=Object.fromEntries(Object.entries(p.paid).map(([key,n])=>[key,n-before.actors[actor].paid[key]]));
  return {elapsed:after.now-before.now,paid:paidDelta,bodies:Object.fromEntries(Object.keys(after.actors).map(actor=>[actor,{before:before.actors[actor].body,after:after.actors[actor].body}]))};
}
export function runCase(api,inputs,definition,arm){
  const camp=definition.host==='camp',engine=camp?api.camp:api.player;
  const setup=camp?{}:{...clone(inputs.defaults),...clone(definition.setup??{}),bodies:{keeper:{fatigue:definition.fatigue,hunger:.15},receiver:{fatigue:.15,hunger:.15}}};
  let game=engine.createGame(setup);
  const view=()=>engine.getGameView(game),save=()=>engine.exportGame(game),physical=()=>camp?campPhysical(game,api):acrossPhysical(game,api);
  const initialSave=save(),initial=physical(),prefix=[],events=[];
  function change(command,log,phase){
    const before=hash(save());let error=null;
    try{game=command.type==='advance'?engine.advanceGame(game,command.minutes):engine.applyCommand(game,command);}
    catch(caught){error={code:caught.code??null,message:caught.message};assert.equal(hash(save()),before,'A failed deliberate action must leave the entire saved state unchanged.');}
    log.push({phase,at:view().now,command:clone(command),error,beforeSaveSha256:before,afterSaveSha256:hash(save())});
    return error;
  }
  const request=action=>camp?action:{type:'request',action};
  const job=()=>camp?view().people.player.job:view().job;
  function prefixRequest(action){
    assert.equal(change(request(action),prefix,'prefix'),null,'Every common prescribed prefix must be legal.');
    while(job())assert.equal(change({type:'advance',minutes:1},prefix,'prefix'),null);
  }
  for(const step of definition.prefix)for(let n=0;n<(step.repeat??1);n++){
    if(camp)prefixRequest({type:'start',job:step.job});
    else if(step.task==='start-stop-rest'){
      assert.equal(change(request({task:'rest',minutes:1}),prefix,'prefix'),null);
      assert.equal(change({type:'stop'},prefix,'prefix'),null);
    }else prefixRequest(step.task==='report'?{task:'transmit',via:'radio',message:{kind:'report',observationIds:reportIds(view())}}:step);
  }
  const entrySave=save(),entry=physical(),entryView=view(),start=entry.now,cap=Math.min(camp?1e9:30,start+definition.maxMinutes);
  let goalAt=null,termination=null,requests=0,refusals=0,uncertainRequests=0,uncertainAdmissions=0,unavailableWaitMinutes=0,refusalRecoveryMinutes=0,structuralBlocks=0;
  const complete=()=>{
    const v=view();
    if(camp)return !job()&&v.stats.receipts[definition.target]>entryView.stats.receipts[definition.target];
    if(definition.policy==='inspect')return v.paid.inspect>entryView.paid.inspect&&!v.job;
    if(definition.policy==='report')return v.paid.transmit>entryView.paid.transmit&&!v.job;
    if(definition.policy==='repair')return v.local.repairProgress===v.local.repairMinutes;
    return v.paid.release>=entryView.paid.release+2&&!v.job;
  };
  while(view().now<cap){
    if(complete()){
      goalAt??=view().now;
      if(!definition.toHorizon){termination='goal';break;}
      assert.equal(change({type:'advance',minutes:1},events,'after-goal'),null);continue;
    }
    const input=view(),offers=offersFor(input,definition,api),callerView=camp?{...input,job:input.people.player.job}:input;
    // Give the caller only its task/channel choice, never the fixture's starting
    // actual body, world setup, hidden launch selector, prefix or evaluation cap.
    const callerTask={host:definition.host,...(camp?{}:{policy:definition.policy,...(definition.via?{via:definition.via}:{})})};
    const decision=decide(clone(callerView),clone(offers),callerTask,arm);
    events.push({phase:'decision',at:input.now,input:clone(input),offers:clone(offers),task:clone(callerTask),decision:clone(decision),saveSha256:hash(save())});
    if(decision.kind==='blocked'){structuralBlocks++;termination=decision.reason;break;}
    if(decision.kind==='request'){
      requests++;if(decision.offer.capacityUncertain===true)uncertainRequests++;
      const error=change(request(decision.offer.action),events,'deliberate-request');
      if(error){
        refusals++;
        assert.equal(change({type:'advance',minutes:1},events,'refusal-recovery'),null);
        refusalRecoveryMinutes++;
        continue;
      }
      if(decision.offer.capacityUncertain===true)uncertainAdmissions++;
    }
    if(decision.kind==='wait')unavailableWaitMinutes++;
    assert.equal(change({type:'advance',minutes:1},events,decision.kind==='wait'?'unavailable-recovery':'pay-work'),null);
  }
  if(complete())goalAt??=view().now;
  termination??=view().now===30&&!camp?'horizon':goalAt!==null?'goal':'registered-cap';
  const endpoint=physical(),finalSave=save();
  // Both current hosts promise round-trip recipes/snapshots, including all paid prefix work.
  assert.deepEqual(engine.exportGame(engine.restoreGame(json(finalSave))),finalSave);
  if(!camp)for(const actor of ['keeper','receiver'])assert.equal(Object.values(endpoint.actors[actor].paid).reduce((a,b)=>a+b,0),endpoint.now);
  return {id:`${definition.id}/${arm}`,caseId:definition.id,arm,host:definition.host,setup,initialSave,initial,prefix,entrySave,entry,events,endpoint,finalSave,
    initialSaveSha256:hash(initialSave),entrySaveSha256:hash(entrySave),finalSaveSha256:hash(finalSave),
    metrics:{goalAt,termination,requests,refusals,uncertainRequests,uncertainAdmissions,unavailableWaitMinutes,refusalRecoveryMinutes,structuralBlocks,prefix:differences(initial,entry),evaluation:differences(entry,endpoint)}};
}
export function runSuite({api,inputs}){
  return {format:FORMAT,version:1,inputsSha256:hash(inputs),records:inputs.cases.flatMap(definition=>inputs.arms.map(arm=>runCase(api[arm==='conservative'?'baseline':'candidate'],inputs,definition,arm)))};
}
export function summarize(result){
  const cases=[...new Set(result.records.map(r=>r.caseId))];
  return {format:'action-offer-summary',version:1,cases:cases.map(id=>{
    const [a,b]=result.records.filter(r=>r.caseId===id);
    return {id,arms:[a,b].map(r=>({arm:r.arm,...r.metrics,work:r.endpoint.work,service:r.endpoint.service,water:r.endpoint.water??null,stock:r.endpoint.stock??null})),deltaTryMinusConservative:{elapsed:b.metrics.evaluation.elapsed-a.metrics.evaluation.elapsed,unavailableWaitMinutes:b.metrics.unavailableWaitMinutes-a.metrics.unavailableWaitMinutes,refusalRecoveryMinutes:b.metrics.refusalRecoveryMinutes-a.metrics.refusalRecoveryMinutes,refusals:b.metrics.refusals-a.metrics.refusals,serviceUnits:a.endpoint.service?b.endpoint.service.units-a.endpoint.service.units:null},endpointEqual:hash(a.endpoint)===hash(b.endpoint)};
  })};
}
function readArtifact(path){const bytes=readFileSync(path);return JSON.parse(path.endsWith('.gz')?gunzipSync(bytes):bytes);}
function fresh(path,value){const bytes=JSON.stringify(value)+'\n';mkdirSync(dirname(path),{recursive:true});writeFileSync(path,path.endsWith('.gz')?gzipSync(bytes,{level:9}):bytes,{flag:'wx'});}
async function main(){
  const [command,...args]=process.argv.slice(2),options={};
  while(args.length){const key=args.shift();assert.ok(['--out','--freeze','--input','--commit'].includes(key)&&args.length&&!Object.hasOwn(options,key));options[key]=args.shift();}
  assert.ok(options['--out'],'Explicit fresh --out required.');
  if(command==='freeze'){
    assert.ok(options['--commit']&&Object.keys(options).length===2);fresh(resolve(ROOT,options['--out']),makeFreeze(ROOT,options['--commit']));process.stdout.write('Committed source graph frozen; no outcomes executed.\n');return;
  }
  assert.ok(['run','replay','summarize'].includes(command));
  if(command==='summarize'){assert.ok(options['--input']&&Object.keys(options).length===2);fresh(resolve(ROOT,options['--out']),summarize(readArtifact(resolve(ROOT,options['--input']))));return;}
  assert.ok(options['--freeze']&&!options['--commit']);
  const freeze=readArtifact(resolve(ROOT,options['--freeze'])),loaded=await loadFrozen(ROOT,freeze);
  try{
    const result=loaded.runner.runSuite(loaded),provenance={freeze,freezeSha256:hash(freeze)};
    if(command==='run'){
      assert.equal(Object.keys(options).length,2);fresh(resolve(ROOT,options['--out']),{...result,provenance,execution:{node:process.version,platform:process.platform,arch:process.arch}});
      for(const r of result.records)process.stdout.write(`${r.id}: goal=${r.metrics.goalAt}, wait=${r.metrics.unavailableWaitMinutes}, refusals=${r.metrics.refusals}, service=${r.endpoint.service?.units??'n/a'}\n`);
    }else{
      assert.ok(options['--input']&&Object.keys(options).length===3);const inputPath=resolve(ROOT,options['--input']),evidence=readArtifact(inputPath);
      assert.deepEqual(evidence.provenance,provenance);const {execution,...withoutExecution}=evidence;
      assert.deepEqual(withoutExecution,{...result,provenance},'Exact source-bound inputs, decisions, failures, prefixes, outputs and all registered record ordering must replay.');
      fresh(resolve(ROOT,options['--out']),{format:'action-offer-replay',version:1,inputSha256:hash(readFileSync(inputPath)),freezeSha256:hash(freeze),candidateCommit:freeze.candidate.commit,node:process.version,records:result.records.map(r=>({id:r.id,finalSaveSha256:r.finalSaveSha256}))});
      process.stdout.write(`Exactly replayed ${result.records.length} full records.\n`);
    }
  }finally{rmSync(loaded.directory,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(`${error.stack}\n`);process.exitCode=1;});
