import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {HOST_VERSION,createGame,getGameView,applyCommand,exportGame} from '../src/games/courier.js';
import {POLICIES,chooseAction} from '../src/games/courier-policy.js';
import {HUMAN_VERSION,createPerson,beginAttempt,advanceAttempt,finishAttempt,estimateSuccess} from '../src/human/index.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const sourceFiles=['scripts/courier-benchmark.js','src/games/courier.js','src/games/courier-policy.js','src/human/index.js','src/core/model.js'];

export function runController({seed,policy}){
  let game=createGame({seed});const commands=[],events=[];
  for(let i=0;game.status==='playing';i++){
    if(i>=250)throw new Error('Controller exceeded the finite-round guard');
    const actionId=chooseAction(getGameView(game),policy),start={type:'start',actionId},finish={type:'finish'};
    commands.push(start,finish);game=applyCommand(game,start);const before=game.clock;
    game=applyCommand(game,finish);events.push({actionId,status:game.lastEvent.status,minutes:game.clock-before,endedAt:game.clock});
  }
  const view=getGameView(game);
  return {seed,policy,status:game.status,elapsedMinutes:game.clock,completionMinutes:game.status==='complete'?game.clock:null,...view.summary,
    actions:events.length,failedCrossings:events.filter(e=>e.status==='failed').length,blockedRequests:events.filter(e=>e.status==='blocked').length,
    inspectionMinutes:events.filter(e=>e.actionId.startsWith('inspect-')).reduce((sum,e)=>sum+e.minutes,0),
    restMinutes:events.filter(e=>e.actionId==='rest').reduce((sum,e)=>sum+e.minutes,0),mealsUsed:2-game.meals,
    finalSkill:game.person.skills.routecraft,parcelOutcomes:view.parcels.map(({id,owner,deliveredAt,due})=>({id,owner,deliveredAt,due})),commands,events,finalStateSha256:hash(JSON.stringify(exportGame(game)))};
}

function activity(person,{id,minutes,activity='active',effort=0,skill=null}){
  person=beginAttempt(person,{actionId:id,durationMinutes:minutes,activity,effort,exertive:effort>0,skill});
  person=advanceAttempt(person,minutes);return finishAttempt(person,{attemptId:person.pending.id,status:'completed',mealConsumed:activity==='meal'});
}
export function practiceRetest(){
  const arm=train=>{
    let person=createPerson({id:'retest',body:{fatigue:0.12,hunger:0.28},skills:{routecraft:0.36}});
    person=activity(person,{id:train?'crossing-practice':'matched-rest',minutes:44,activity:train?'active':'rest',effort:train?0.176:0,skill:train?'routecraft':null});
    person=activity(person,{id:'common-recovery',minutes:60,activity:'rest'});
    person=activity(person,{id:'common-meal',minutes:8,activity:'meal'});
    const bodyBeforeRetest=structuredClone(person.body),skillBeforeRetest=person.skills.routecraft;
    person=activity(person,{id:'common-retest',minutes:11,effort:0.086,skill:'routecraft'});
    return {bodyBeforeRetest,skillBeforeRetest,estimatedRetestSuccess:estimateSuccess({skill:person.skills.routecraft,body:person.body,difficulty:0.58})};
  };
  return {description:'44 minutes of routecraft practice versus 44 minutes rest, then identical 60-minute rest and 8-minute meal. Both have the same body at an identical 11-minute exposed-crossing retest. This isolates the implemented learning term, not human learning validity.',trainingMinutes:44,practice:arm(true),control:arm(false)};
}

export function buildBenchmark({startSeed=101,seeds=100}={}){
  if(!Number.isSafeInteger(seeds)||seeds<1||seeds>1000||!Number.isSafeInteger(startSeed)||startSeed<0||startSeed+seeds-1>4294967295)throw new Error('Invalid seed block');
  const runs=POLICIES.flatMap(policy=>Array.from({length:seeds},(_,i)=>runController({seed:startSeed+i,policy})));
  const summaries=Object.fromEntries(POLICIES.map(policy=>{
    const group=runs.filter(run=>run.policy===policy),complete=group.filter(run=>run.status==='complete');
    return [policy,{runs:group.length,completed:complete.length,meanDelivered:mean(group.map(r=>r.delivered)),meanOnTime:mean(group.map(r=>r.onTime)),meanElapsedMinutes:mean(group.map(r=>r.elapsedMinutes)),meanCompletionMinutes:mean(complete.map(r=>r.completionMinutes)),meanActions:mean(group.map(r=>r.actions)),failedCrossings:group.reduce((sum,r)=>sum+r.failedCrossings,0),blockedRequests:group.reduce((sum,r)=>sum+r.blockedRequests,0),meanInspectionMinutes:mean(group.map(r=>r.inspectionMinutes)),meanRestMinutes:mean(group.map(r=>r.restMinutes)),mealsUsed:group.reduce((sum,r)=>sum+r.mealsUsed,0)}];
  }));
  const negativeCases=[];
  for(let seed=startSeed;seed<startSeed+seeds;seed++){
    const trio=Object.fromEntries(runs.filter(r=>r.seed===seed).map(r=>[r.policy,r]));
    if(trio.reliable.delivered>trio.inspect.delivered||trio.reliable.onTime>trio.inspect.onTime)negativeCases.push({seed,claim:'Inspection is not universally better than reliable roads',reliable:{delivered:trio.reliable.delivered,onTime:trio.reliable.onTime,minutes:trio.reliable.elapsedMinutes},inspect:{delivered:trio.inspect.delivered,onTime:trio.inspect.onTime,minutes:trio.inspect.elapsedMinutes}});
    if(trio.shortest.delivered>=trio.inspect.delivered&&trio.shortest.onTime>=trio.inspect.onTime&&trio.shortest.elapsedMinutes<trio.inspect.elapsedMinutes)negativeCases.push({seed,claim:'Taking the shortest route can beat paid inspection',shortestMinutes:trio.shortest.elapsedMinutes,inspectMinutes:trio.inspect.elapsedMinutes});
  }
  return {format:'courier-strategy-benchmark',version:1,hostVersion:HOST_VERSION,humanVersion:HUMAN_VERSION,startSeed,seeds,sourceSha256:Object.fromEntries(sourceFiles.map(path=>[path,hash(readFileSync(new URL(`../${path}`,import.meta.url)))])),
    scope:'Three authored host-native route heuristics share parcel loading, nearest/urgency delivery order and recovery rules. Only route costing and inspection differ. They receive only the player view. Default body and skills are identical. No coefficients were chosen to make an inspection controller win.',
    summaries,negativeCases,practiceRetest:practiceRetest(),limitations:['Authored deterministic game outcomes, not empirical human data.','Completion-time means condition on completion; expired rounds are censored at 240 minutes.','Static exact inspection tests information cost, not changing evidence or testimony.','No human playtest or physical-mobile performance test.','Controller success does not measure enjoyment or clarity.'],runs};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const options={};let output=null;
  for(let i=2;i<process.argv.length;i++){
    const flag=process.argv[i],value=process.argv[++i];
    if(flag==='--seeds')options.seeds=Number(value);else if(flag==='--start-seed')options.startSeed=Number(value);else if(flag==='--json')output=value;else throw new Error(`Unknown argument ${flag}`);
  }
  const result=buildBenchmark(options);if(output){mkdirSync(dirname(resolve(output)),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');}
  process.stdout.write(JSON.stringify({summaries:result.summaries,negativeCases:result.negativeCases.length,practiceRetest:result.practiceRetest},null,2)+'\n');
}
