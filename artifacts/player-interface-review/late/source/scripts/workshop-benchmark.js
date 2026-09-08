import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {HOST_VERSION,POLICIES,createGame,getGameView,chooseAction,applyCommand,exportGame} from '../src/games/workshop.js';
import {HUMAN_VERSION} from '../src/human/index.js';

const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const sum=values=>values.reduce((total,value)=>total+value,0);
const hash=value=>createHash('sha256').update(value).digest('hex');
const actionIds=Object.keys(getGameView(createGame()).actionDurations).sort();
const actionCounts=events=>Object.fromEntries(actionIds.map(id=>[id,events.filter(event=>event.actionId===id).length]));
const repair=id=>id==='patch'||id==='replace';

// This recorder belongs to the experiment. The active host and person retain no
// transcript. Controllers receive only the same projection used by the browser.
function recorder({seed,policy}) {
  let game=createGame({seed,policy});
  const initialFood=game.objects.rations.count,commands=[],events=[];
  return {
    get game(){return game;},
    apply(command) {
      const before=game,next=applyCommand(game,command);
      commands.push(structuredClone(command));
      if(before.pending&&!next.pending)events.push({
        actionId:before.pending.actionId,attemptId:before.pending.attemptId,
        status:next.lastEvent.status,startedAt:before.person.pending.startedAt,endedAt:next.clock,
        elapsedMinutes:next.lastEvent.minutes,declaredMinutes:before.person.pending.action.durationMinutes,
        capacityAllowed:before.person.pending.capacity.allowed,
        capacityCauses:[...before.person.pending.capacity.causes],
        foodUsed:before.objects.rations.count-next.objects.rations.count
      });
      game=next;
    },
    finish() {
      if(!['won','lost'].includes(game.status)||game.pending)throw new Error('Benchmark session must reach a terminal state');
      if(game.status==='lost'&&game.clock!==game.deadline)throw new Error('A benchmark loss must terminate at the deadline');
      if(Math.abs(sum(events.map(event=>event.elapsedMinutes))-game.clock)>1e-8)throw new Error('Recorded intervals do not match elapsed host time');
      const completed=events.filter(event=>event.status==='completed');
      const blocked=events.filter(event=>!event.capacityAllowed);
      if(blocked.some(event=>event.status!=='blocked'))throw new Error('Blocked request has an inconsistent recorded result');
      const foodUsed=initialFood-game.objects.rations.count;
      if(sum(events.map(event=>event.foodUsed))!==foodUsed)throw new Error('Recorded meals do not match host inventory');
      return {seed:game.seed,policy:game.policy,status:game.status,deadlineMinutes:game.deadline,
        deadlineCensored:game.status==='lost',winningMinutes:game.status==='won'?game.clock:null,
        metrics:{
          elapsedMinutes:game.clock,requestedActions:events.length,completedActions:completed.length,
          failedActions:events.filter(event=>event.status==='failed').length,
          interruptedActions:events.filter(event=>event.status==='interrupted').length,
          repairRequests:events.filter(event=>repair(event.actionId)).length,
          successfulRepairs:completed.filter(event=>repair(event.actionId)).length,
          failedRepairs:events.filter(event=>repair(event.actionId)&&event.status==='failed').length,
          repairWorkMinutes:sum(events.filter(event=>repair(event.actionId)&&event.capacityAllowed).map(event=>event.elapsedMinutes)),
          blockedAttempts:blocked.length,blockedIdleMinutes:sum(blocked.map(event=>event.elapsedMinutes)),
          completedRestActions:completed.filter(event=>event.actionId==='rest').length,
          restMinutes:sum(events.filter(event=>event.actionId==='rest').map(event=>event.elapsedMinutes)),
          completedMeals:completed.filter(event=>event.actionId==='eat').length,
          mealMinutes:sum(events.filter(event=>event.actionId==='eat').map(event=>event.elapsedMinutes)),foodUsed
        },requestedActionCounts:actionCounts(events),completedActionCounts:actionCounts(completed),
        commands,events,finalStateSha256:hash(JSON.stringify(exportGame(game)))};
    }
  };
}

export function recordWorkshopSession({seed,policy,commands}) {
  if(!Array.isArray(commands)||commands.length>100000)throw new Error('Invalid benchmark command log');
  const recording=recorder({seed,policy});
  for(const command of commands)recording.apply(command);
  return recording.finish();
}

export function runWorkshopController({seed,policy}) {
  const recording=recorder({seed,policy});
  for(let commands=0;recording.game.status==='playing';commands++) {
    if(commands>=10000)throw new Error('Controller exceeded benchmark command guard');
    const game=recording.game;
    if(game.pending)recording.apply({type:'finish'});
    else {
      const actionId=chooseAction(getGameView(game),game.policy);
      if(!actionId)throw new Error('Controller returned no action in a playing state');
      recording.apply({type:'start',actionId});
    }
  }
  return recording.finish();
}

export function summarizeWorkshopRuns(runs) {
  if(!runs.length||runs.some(run=>!['won','lost'].includes(run.status)))throw new Error('Summary requires terminal runs');
  const wins=runs.filter(run=>run.status==='won');
  const totals=Object.fromEntries(Object.keys(runs[0].metrics).map(key=>[key,sum(runs.map(run=>run.metrics[key]))]));
  return {runCount:runs.length,wins:wins.length,completionRate:wins.length/runs.length,
    deadlineCensoredRuns:runs.length-wins.length,meanWinningMinutes:mean(wins.map(run=>run.winningMinutes)),
    totals,means:Object.fromEntries(Object.entries(totals).map(([key,total])=>[key,total/runs.length])),
    requestedActionCounts:Object.fromEntries(actionIds.map(id=>[id,sum(runs.map(run=>run.requestedActionCounts[id]))])),
    completedActionCounts:Object.fromEntries(actionIds.map(id=>[id,sum(runs.map(run=>run.completedActionCounts[id]))]))};
}

const sourceFiles=['scripts/workshop-benchmark.js','src/games/workshop.js','src/human/index.js','src/core/model.js'];
const sourceIdentity=()=>Object.fromEntries(sourceFiles.map(path=>[path,hash(readFileSync(new URL(`../${path}`,import.meta.url)))]));

export function compareWorkshopControllers({seeds=100,startSeed=101}={}) {
  if(!Number.isInteger(seeds)||seeds<1||seeds>1000)throw new Error('seeds must be an integer in [1, 1000]');
  if(!Number.isInteger(startSeed)||startSeed<0||startSeed+seeds-1>4294967295)throw new Error('startSeed and seed range must fit unsigned 32-bit integers');
  const sourceSha256=sourceIdentity(),seedValues=Array.from({length:seeds},(_,i)=>startSeed+i);
  const results=POLICIES.map(policy=>{
    const runs=seedValues.map(seed=>runWorkshopController({seed,policy}));
    return {policy,...summarizeWorkshopRuns(runs),runs};
  });
  if(JSON.stringify(sourceSha256)!==JSON.stringify(sourceIdentity()))throw new Error('Benchmark source changed while the comparison was running');
  return {format:'human-framework-workshop-benchmark',version:1,hostVersion:HOST_VERSION,humanComponentVersion:HUMAN_VERSION,
    generatedAt:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch},
    sourceSha256,seeds,seedValues,deadlineMinutes:createGame().deadline,
    methodology:{
      scenario:'The host-owned Before departure workshop; default initial state and deadline. No game or human runtime changes are made by this experiment.',
      controllers:'The three existing host-local controllers receive only getGameView. They are distinct from the laboratory Full, baseline and planned-simple policies.',
      seeds:'Identical seeds are used across controllers. Seeds 101-200 are a reproducibility convention, not untouched held-out data. Host outcomes are keyed by seed, attempt identity and action; divergent paths can encounter different draws.',
      execution:'Choose one accessible action, record start, then record finish; repeat until victory or deadline. There are no discretionary partial advances or interruptions in controller runs. Deadline interruption remains active. A command guard fails loudly rather than counting an unfinished run as a loss.',
      elapsedTime:'means.elapsedMinutes averages observed elapsed host minutes over every run. Losses end at the 240-minute deadline and are right-censored for time to successful completion. This is the mean time until success or deadline, not an estimate of eventual completion time for losses. meanWinningMinutes includes wins only and is null if there are none.',
      actions:'requestedActionCounts counts every started attempt, including blocked, failed and interrupted attempts. completedActionCounts counts only completed outcomes. A failed repair means a fully elapsed repair that did not hold; blocked work and deadline-interrupted repairs are not failed repair outcomes. repairWorkMinutes includes allowed repair effort, including partial work at a deadline.',
      recovery:'blockedAttempts counts capacity-blocked requests; blockedIdleMinutes sums their actual idle interruption time, capped by the deadline. The host never turns these automatically into rest or food. completedRestActions and completedMeals count completed actions; restMinutes and mealMinutes include interrupted intervals. foodUsed is the authoritative initial-minus-final ration count, checked against recorded consumption.',
      recording:'Commands and settled-attempt events live only in this separate benchmark artifact. Each run includes a SHA-256 of its final exportGame snapshot, reproducible by replaySession using hostVersion, seed, policy and commands.',
      interpretation:'Descriptive authored-game outcomes only. No runtime performance measurement or inference about human validity or playtest clarity is provided.'
    },results};
}

const usage='Usage: node scripts/workshop-benchmark.js [--seeds N] [--start-seed N] [--json FILE]';
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args=process.argv.slice(2),seen=new Set();
    let seeds=100,startSeed=101,file='artifacts/workshop-benchmark.json';
    if(args.includes('--help'))console.log(usage);
    else {
      while(args.length) {
        const flag=args.shift();if(seen.has(flag))throw new Error(`Duplicate option: ${flag}`);seen.add(flag);
        if(['--seeds','--start-seed'].includes(flag)) {
          const raw=args.shift();if(!/^\d+$/.test(raw??''))throw new Error(`${flag} must be an integer`);
          if(flag==='--seeds')seeds=Number(raw);else startSeed=Number(raw);
        } else if(flag==='--json') {
          file=args.shift();if(!file||file.startsWith('--'))throw new Error('--json requires a file path');
        } else throw new Error(`Unknown option: ${flag}`);
      }
      const result=compareWorkshopControllers({seeds,startSeed}),path=resolve(file);
      mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(result,null,2)+'\n');
      for(const row of result.results)console.log(`${row.policy}: ${row.wins}/${row.runCount} wins; observed mean ${row.means.elapsedMinutes.toFixed(2)} min (${row.deadlineCensoredRuns} deadline-censored); winning mean ${row.meanWinningMinutes===null?'n/a':row.meanWinningMinutes.toFixed(2)} min; ${row.totals.failedRepairs} failed repairs; ${row.totals.blockedAttempts} blocked attempts / ${row.totals.blockedIdleMinutes} idle min; ${row.totals.foodUsed} rations.`);
      console.log(`Saved ${path}; seeds ${startSeed}-${startSeed+seeds-1}.`);
    }
  } catch(error){console.error(`${error.message}\n${usage}`);process.exitCode=1;}
}
