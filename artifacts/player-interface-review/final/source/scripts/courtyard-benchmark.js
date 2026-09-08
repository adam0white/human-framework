import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {COURTYARD_VERSION,PROFILES,POLICIES,createGame,getGameView,chooseAction,playTurn,exportGame} from '../src/games/courtyard.js';
import {HUMAN_VERSION} from '../src/human/index.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const sources=['src/games/courtyard.js','src/games/courtyard-session.js','src/human/index.js','src/core/model.js','src/core/random.js','scripts/courtyard-benchmark.js'];
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
const stderr=values=>values.length<2?null:Math.sqrt(values.reduce((sum,v)=>sum+(v-mean(values))**2,0)/(values.length-1)/values.length);

export function runCourtyardController({seed,profile='standard',policy='reciprocal',socialMemory=true}) {
  let game=createGame({seed,profile,socialMemory});const actions=[];let accepted=0,refused=0,blocked=0;
  while(game.status==='playing') {
    const action=chooseAction(getGameView(game),policy);actions.push(action);game=playTurn(game,action);
    if(game.lastTurn.player.status==='accepted')accepted++;
    if(game.lastTurn.player.status==='refused')refused++;
    if(game.lastTurn.player.status==='blocked')blocked++;
  }
  return {seed,profile,policy,socialMemory,status:game.status,rounds:game.round,playerStored:game.homes.player,neighborStored:game.homes.neighbor,
    playerReady:game.homes.player===14,neighborReady:game.homes.neighbor===14,bothReady:game.status==='both-ready',
    sourceRemaining:game.source,spilled:game.spilled,accepted,refused,blocked,given:game.social.given,lateLoans:game.social.lateLoans,
    actions,finalStateSha256:hash(JSON.stringify(exportGame(game)))};
}

export function compareCourtyardControllers({seeds=50,startSeed=101}={}) {
  if(!Number.isSafeInteger(seeds)||seeds<1||seeds>1000)throw new Error('seeds must be an integer in [1, 1000]');
  if(!Number.isSafeInteger(startSeed)||startSeed<0||startSeed+seeds-1>4294967295)throw new Error('Invalid benchmark seed range');
  const seedValues=Array.from({length:seeds},(_,i)=>startSeed+i),rows=[];
  for(const profile of Object.keys(PROFILES))for(const policy of POLICIES)for(const socialMemory of [true,false])for(const seed of seedValues)
    rows.push(runCourtyardController({seed,profile,policy,socialMemory}));
  const summaries=[];
  for(const profile of Object.keys(PROFILES))for(const policy of POLICIES)for(const socialMemory of [true,false]) {
    const group=rows.filter(r=>r.profile===profile&&r.policy===policy&&r.socialMemory===socialMemory);
    summaries.push({profile,policy,socialMemory,runs:seeds,playerReady:group.filter(r=>r.playerReady).length,
      neighborReady:group.filter(r=>r.neighborReady).length,bothReady:group.filter(r=>r.bothReady).length,
      meanPlayerStored:mean(group.map(r=>r.playerStored)),meanNeighborStored:mean(group.map(r=>r.neighborStored)),
      meanSpilled:mean(group.map(r=>r.spilled)),meanAccepted:mean(group.map(r=>r.accepted)),meanRefused:mean(group.map(r=>r.refused))});
  }
  const comparisons=[];
  for(const profile of Object.keys(PROFILES))for(const policy of POLICIES) {
    const pairs=seedValues.map(seed=>{
      const a=rows.find(r=>r.profile===profile&&r.policy===policy&&r.seed===seed&&r.socialMemory),b=rows.find(r=>r.profile===profile&&r.policy===policy&&r.seed===seed&&!r.socialMemory);
      return {seed,playerStoredDelta:a.playerStored-b.playerStored,neighborStoredDelta:a.neighborStored-b.neighborStored,
        bothReadyDelta:Number(a.bothReady)-Number(b.bothReady),actionsIdentical:JSON.stringify(a.actions)===JSON.stringify(b.actions)};
    });
    comparisons.push({profile,policy,contrast:'exchange memory on minus off',pairs,
      meanPlayerStoredDelta:mean(pairs.map(p=>p.playerStoredDelta)),playerStoredMonteCarloSE:stderr(pairs.map(p=>p.playerStoredDelta)),
      meanNeighborStoredDelta:mean(pairs.map(p=>p.neighborStoredDelta)),
      bothReadyGains:pairs.filter(p=>p.bothReadyDelta>0).length,bothReadyLosses:pairs.filter(p=>p.bothReadyDelta<0).length,
      exactActionNulls:pairs.filter(p=>p.actionsIdentical).length});
  }
  return {format:'courtyard-benchmark',version:1,hostVersion:COURTYARD_VERSION,humanVersion:HUMAN_VERSION,
    sourceSha256:Object.fromEntries(sources.map(path=>[path,hash(readFileSync(new URL(`../${path}`,import.meta.url)))])),
    design:{seedValuesAre:'authored exploratory seed blocks, not human observations',turns:18,minutesPerTurn:10,targetPerHousehold:14,profiles:PROFILES,
      policyContrast:'All policies use the same recovery and collection rule. Self-sufficient refuses exchanges; reciprocal accepts usable offers and gives surplus; generous also accepts requests before its own barrel is full.',
      memoryContrast:'Only recorded gifts and late-loan history are ignored. Ownership, capacity, time, consent and current loan obligations remain.',
      limitations:['No claim of empirical human calibration or theological evaluation.','Player settles first and Meryem observes that result before choosing.','Fixed profiles and these seeds are exploratory, not held-out conditions.','Automatic policies do not borrow; loan consequences are tested by prescribed choices.','An action-null pair need not have an identical save: the diagnostic switch is stored.']},
    seedValues,summaries,comparisons,negativeCases:rows.filter(r=>!r.bothReady).map(r=>({seed:r.seed,profile:r.profile,policy:r.policy,socialMemory:r.socialMemory,status:r.status,playerStored:r.playerStored,neighborStored:r.neighborStored})),rows};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [count='50',start='101',output='artifacts/courtyard-benchmark.json',...extra]=process.argv.slice(2);
    if(extra.length||!/^\d+$/.test(count)||!/^\d+$/.test(start))throw new Error('Usage: node scripts/courtyard-benchmark.js [seeds] [startSeed] [output]');
    const result=compareCourtyardControllers({seeds:Number(count),startSeed:Number(start)}),file=resolve(output);
    mkdirSync(dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(result,null,2)+'\n');
    process.stdout.write(JSON.stringify({output:file,summaries:result.summaries,negativeCases:result.negativeCases.length},null,2)+'\n');
  } catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
