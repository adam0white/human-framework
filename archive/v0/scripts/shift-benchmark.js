import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {SHIFT_VERSION,POLICIES,createShift,getShiftView,chooseAction,applyCommand,startAction,advanceTime,finishAction,interruptAction} from '../src/games/shift.js';
const copy=v=>structuredClone(v),act=(s,id)=>finishAction(startAction(s,id));
const ORDERS=[['garden','workshop','intake'],['garden','intake','workshop'],['workshop','garden','intake'],['workshop','intake','garden'],['intake','garden','workshop'],['intake','workshop','garden']];
function fixedRoute(view,order,spare){
 const find=id=>view.actions.find(a=>a.id===id),has=id=>Boolean(find(id));
 const local=view.jobs.find(j=>j.id===view.location);
 if(local?.status==='repaired'&&find(`verify-${local.id}`)?.capacity.allowed)return `verify-${local.id}`;
 if(has('take-tools'))return 'take-tools';if(spare!=='none'&&has('take-seal'))return 'take-seal';
 const candidates=order.map(id=>view.jobs.find(j=>j.id===id)).filter(j=>j.status!=='running');
 const target=candidates.find(j=>(view.location===j.id?0:view.travelMinutes[j.id])+(j.status==='repaired'?0:j.patch.durationMinutes)+8<=view.remainingMinutes);if(!target)return null;
 const useSpare=target.id===spare&&view.inventory.seal&&target.replace.durationMinutes+8+(view.location===target.id?0:view.travelMinutes[target.id])<=view.remainingMinutes;
 const route=useSpare?'replace':'patch',duration=target.status==='repaired'?8:target[route].durationMinutes,body=view.worker.body;
 if(body.hunger>.70||body.hunger+.002*duration>.96){if(has('eat'))return 'eat';if(view.stock.meals&&has('travel-depot'))return 'travel-depot';if(body.hunger+.002*duration>1)return null;}
 if(view.location!==target.id)return `travel-${target.id}`;
 const id=target.status==='repaired'?`verify-${target.id}`:`${route}-${target.id}`,a=find(id);if(!a)return null;
 if(!a.capacity.allowed||body.fatigue>.58){if(a.capacity.causes.includes('hunger'))return view.stock.meals?'travel-depot':null;return view.remainingMinutes>=duration+8+15?'rest':a.capacity.allowed?id:null;}return id;
}
export function runShift({seed=1,policy='value-first',order=null,spare='none',record=false,initialState=null}={}){
 if(initialState&&record)throw new Error('A partial continuation cannot produce a complete replay');
 let state=initialState?copy(initialState):createShift({seed,policy});const commands=[],metrics={actions:0,repairs:0,failures:0,blocked:0,rests:0,meals:0,inspections:0,repairMinutes:0,recoveryMinutes:0};
 const dispatch=command=>{state=applyCommand(state,command);if(record)commands.push(copy(command));};
 for(let n=0;state.status==='playing'&&n<200;n++){
  const view=getShiftView(state),id=order?fixedRoute(view,order,spare):chooseAction(view,policy);
  if(!id){dispatch({type:'end'});break;}const a=view.actions.find(a=>a.id===id);if(!a)throw new Error(`Controller selected inaccessible ${id}`);
  dispatch({type:'start',actionId:id});dispatch({type:'finish'});metrics.actions++;const e=state.lastEvent;
  if(e.status==='blocked')metrics.blocked++;
  if(a.skill){metrics.repairMinutes+=e.practiceMinutes;if(['completed','failed'].includes(e.status))metrics.repairs++;if(e.status==='failed')metrics.failures++;}
  if(a.type==='rest'){metrics.recoveryMinutes+=e.minutes;if(e.status==='completed')metrics.rests++;}
  if(a.type==='meal'&&e.status==='completed')metrics.meals++;
  if(a.type==='inspect'&&e.status==='completed')metrics.inspections++;
 }
 if(state.status!=='finished')throw new Error('Controller did not terminate in 200 choices');
 const v=getShiftView(state),result={seed,strategy:order?`${order.join('>')}|seal:${spare}`:policy,finishReason:state.finishReason,restored:v.score.verifiedCount,score:v.score.total,base:v.score.base,earlyBonus:v.score.earlyBonus,minutes:state.clock,skill:state.person.skills.repair,...metrics};
 if(record)result.replay={version:SHIFT_VERSION,seed,policy,commands};return result;
}
function distribution(values){const sorted=[...values].sort((a,b)=>a-b);return {minimum:sorted[0],mean:values.reduce((a,b)=>a+b,0)/values.length,median:sorted[Math.floor(sorted.length/2)],maximum:sorted.at(-1)};}
function summaries(rows){return [...new Set(rows.map(r=>r.strategy))].map(strategy=>{const list=rows.filter(r=>r.strategy===strategy);return {strategy,n:list.length,allRestored:list.filter(r=>r.restored===3).length,partial:list.filter(r=>r.restored>0&&r.restored<3).length,none:list.filter(r=>r.restored===0).length,score:distribution(list.map(r=>r.score)),minutes:distribution(list.map(r=>r.minutes)),repairs:distribution(list.map(r=>r.repairs)),failures:distribution(list.map(r=>r.failures)),rests:distribution(list.map(r=>r.rests)),meals:distribution(list.map(r=>r.meals)),actions:distribution(list.map(r=>r.actions)),skill:distribution(list.map(r=>r.skill))};});}
export function sweepShift({firstSeed=101,count=100}={}){
 const controllers=[],routes=[];
 for(let seed=firstSeed;seed<firstSeed+count;seed++){
  for(const policy of POLICIES)controllers.push(runShift({seed,policy}));
  for(const order of ORDERS)for(const spare of ['none','garden','workshop','intake'])routes.push(runShift({seed,order,spare}));
 }
 return {controllers,controllerSummary:summaries(controllers),routes,routeSummary:summaries(routes)};
}
export function farmingProbe({firstSeed=101,count=100}={}){
 let zeroTimeRerolls=0,maximumSplitSkillDifference=0,maximumMatchedBodyDifference=0;const pairs=[];
 for(let seed=firstSeed;seed<firstSeed+count;seed++){
  const original=act(act(createShift({seed,policy:'all-patch'}),'take-tools'),'travel-garden'),completed=act(original,'patch-garden');
  let zero=copy(original);for(let i=0;i<25;i++)zero=interruptAction(startAction(zero,'patch-garden'));zero=act(zero,'patch-garden');
  if(JSON.stringify(zero.pumps)!==JSON.stringify(completed.pumps))zeroTimeRerolls++;
  let interrupted=copy(original);for(let i=0;i<2;i++)interrupted=interruptAction(advanceTime(startAction(interrupted,'patch-garden'),17.5));
  maximumSplitSkillDifference=Math.max(maximumSplitSkillDifference,Math.abs(completed.person.skills.repair-interrupted.person.skills.repair));
  maximumMatchedBodyDifference=Math.max(maximumMatchedBodyDifference,...['fatigue','hunger'].map(k=>Math.abs(completed.person.body[k]-interrupted.person.body[k])));
  const full=runShift({seed,policy:'all-patch',initialState:completed}),grind=runShift({seed,policy:'all-patch',initialState:interrupted});
  pairs.push({seed,paidTrainingMinutes:35,firstRepair:completed.pumps.garden.status,completeScore:full.score,interruptedScore:grind.score,delta:grind.score-full.score,completeRestored:full.restored,interruptedRestored:grind.restored});
 }
 return {protocol:'Complete one 35-minute garden patch versus cancel two 17.5-minute patches; equal paid repair exposure and body. Then continue all-patch. Separately insert 25 zero-time interruptions before the same repair.',zeroTimeRerolls,maximumSplitSkillDifference,maximumMatchedBodyDifference,interruptedHigher:pairs.filter(p=>p.delta>1e-9).length,interruptedLower:pairs.filter(p=>p.delta< -1e-9).length,tied:pairs.filter(p=>Math.abs(p.delta)<=1e-9).length,meanDelta:pairs.reduce((sum,p)=>sum+p.delta,0)/pairs.length,pairs};
}
function main(){
 const args=process.argv.slice(2),get=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
 if(args.some((a,i)=>i%2===0&&!['--count','--first-seed','--output'].includes(a))||args.length%2)throw new Error('Use --count N --first-seed N --output PATH');
 const count=Number(get('--count',100)),firstSeed=Number(get('--first-seed',101));
 if(!Number.isInteger(count)||count<1||count>1000||!Number.isInteger(firstSeed)||firstSeed<0||firstSeed+count-1>4294967295)throw new Error('Invalid seed count or range');
 const files=['src/games/shift.js','src/human/index.js','src/core/model.js','scripts/shift-benchmark.js'];
 const result={format:'human-pump-shift-benchmark',version:1,hostVersion:SHIFT_VERSION,provenance:{baselineCommit:'d62f84d',node:process.version,sourceSHA256:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(new URL(`../${path}`,import.meta.url))).digest('hex')]))},inputs:{firstSeed,count,shiftMinutes:480,controllers:POLICIES,orders:ORDERS,spareAllocations:['none','garden','workshop','intake'],conditionAdjustment:{ordinary:0,stubborn:.10,unobservedEstimate:.05}},...sweepShift({firstSeed,count}),farming:farmingProbe({firstSeed,count}),limitations:['Authored game curves; no human calibration or player enjoyment measurement.','Controllers share one recovery rule and omit inspection; no claim of optimal play.','Fixed order sweep tries all 6 orders and 4 spare allocations, with remaining-time fallback to other feasible jobs and patch.','Matched paid interruption continuations can diverge in later practice and paid repair ordinals; retain every paired result.']};
 const output=get('--output','artifacts/shift-benchmark.json');writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({output,controllers:result.controllerSummary,farming:{...result.farming,pairs:undefined}},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
