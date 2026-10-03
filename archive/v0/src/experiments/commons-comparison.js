import {createGame,getGameView,startJob,requestProject,cancelJob,advanceGame,advanceToNextEvent,exportGame} from '../games/commons.js';
import {chooseCommand as chooseExisting} from '../games/commons-policy.js';
import {PROJECTS} from '../games/commons.js';

export const COMPARISON_VERSION='1.0.0';
export const POLICIES=Object.freeze(['build-first','stock-first','project-pull']);
export const CONDITIONS=Object.freeze([
  {id:'fresh',family:'fresh',partition:'development',prefix:[]},
  {id:'delayed-120',family:'moderate-delay',partition:'development',prefix:[{type:'idle',minutes:120}]},
  {id:'delayed-240',family:'moderate-delay',partition:'development',prefix:[{type:'idle',minutes:240}]},
  {id:'supplied',family:'preparation',partition:'development',prefix:[{type:'complete',jobId:'gather-timber'},{type:'complete',jobId:'gather-timber'},{type:'complete',jobId:'gather-salvage'}]},
  {id:'interrupted',family:'interruption',partition:'development',prefix:[{type:'interrupt',jobId:'build-shelter',minutes:9}]},
  {id:'food-spent',family:'depletion',partition:'development',prefix:Array.from({length:4},()=>({type:'complete',jobId:'eat'}))},
  {id:'abandoned-660',family:'abandoned',partition:'reserved',prefix:[{type:'idle',minutes:660}]},
  {id:'abandoned-1020',family:'abandoned',partition:'reserved',prefix:[{type:'idle',minutes:1020}]}
]);
const copy=value=>structuredClone(value),resourceFor={timber:'gather-timber',salvage:'gather-salvage'};
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const delta=(value,start)=>Object.fromEntries(Object.entries(value).map(([key,n])=>[key,typeof n==='number'?n-start[key]:delta(n,start[key])]));
const checkInteger=(n,min,max,label)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(`Invalid ${label}`);};

/** Stateless host-native rival. Everything read is in the existing public view. */
export function chooseRival(view) {
  const order=['workbench','shelter','garden'],remaining=order.filter(p=>view.structures[p]<2);
  const priority=remaining[0]??'cache';
  if(!view.solo&&view.commitment.status!=='accepted')return {type:'request',projectId:priority};
  if(view.people.player.job)return {type:'advance'};
  const choices=new Map(view.choices.map(c=>[c.id,c])),available=id=>choices.has(id)&&!choices.get(id).unavailable;
  const start=id=>({type:'start',jobId:id}),body=view.people.player.body;
  if(body.hunger>=.75)return start(available('eat')?'eat':'forage');
  if(body.fatigue>=.75)return start('rest');
  if(view.stock.food===0&&body.hunger>=.50)return start('forage');
  const focus=view.commitment.status==='accepted'?view.commitment.project:priority;
  const peer=view.people.neighbor?.job;
  // Forecast only guaranteed base deliveries visible from the job name. A
  // pending trip may predate a newly completed woodshed or garden bonus.
  const incoming={timber:peer?.id==='gather-timber'?3:0,salvage:peer?.id==='gather-salvage'?3:0};
  const targets=[...new Set([focus,...remaining,...(remaining.length?[]:['cache'])])];
  for(const target of targets) {
    const id=`build-${target}`,lock=peer?.id===id;
    if(available(id))return start(id);
    const stageIndex=target==='cache'?0:view.structures[target]+Number(lock);
    const recipe=PROJECTS[target].stages[stageIndex];
    if(!recipe)continue;
    const gathers=Object.entries(recipe.cost).flatMap(([resource,need])=>{
      const action=choices.get(resourceFor[resource]),gap=need-view.stock[resource];
      if(gap<=0||!action||!available(action.id))return [];
      if(incoming[resource]>=gap&&peer.remaining<=action.duration)return [];
      return [{id:action.id,minutes:Math.ceil(gap/action.output[resource])*action.duration}];
    }).sort((a,b)=>b.minutes-a.minutes||a.id.localeCompare(b.id));
    if(gathers.length)return start(gathers[0].id);
  }
  // When the accepted builder is occupied, prepare shared food or recover
  // instead of inventing authority to cancel the neighbor's chosen activity.
  if(view.stock.food<2)return start('forage');
  if(body.hunger>=.45&&available('eat'))return start('eat');
  if(body.fatigue>=.35)return start('rest');
  if(view.nextEventAt!==null)return {type:'advance'};
  // A rounded capacity forecast can close an action before the thresholds
  // above. Recovery is still an explicit, paid job, not a harness substitution.
  return start(body.hunger>=.40&&available('eat')?'eat':'rest');
}

export function createCondition(conditionId,{solo=false}={}) {
  const condition=CONDITIONS.find(c=>c.id===conditionId);if(!condition)throw new Error('Unknown condition');
  let game=createGame({solo});
  for(const command of condition.prefix) {
    if(command.type==='idle')game=advanceGame(game,command.minutes);
    else {
      game=startJob(game,command.jobId);
      if(command.type==='interrupt'){game=advanceGame(game,command.minutes);game=cancelJob(game);}
      else while(game.jobs.player)game=advanceToNextEvent(game);
    }
  }
  return game;
}

function observation(game,start) {
  const view=getGameView(game),reserved={timber:0,salvage:0,food:0};
  for(const p of Object.values(view.people))for(const [r,n] of Object.entries(p.job?.cost??{}))reserved[r]+=n;
  return {elapsed:view.now-start.clock.now,worldMinute:view.now,milestoneAt:view.milestoneAt,milestoneElapsed:view.milestoneAt===null?null:view.milestoneAt-start.clock.now,
    stages:Object.values(view.structures).reduce((a,b)=>a+b,0),structures:view.structures,caches:view.caches,stock:view.stock,reserved,
    people:view.people,commitment:view.commitment,deltaStats:delta(view.stats,start.stats),activeSaveBytes:bytes(exportGame(game)),pendingEvents:game.clock.queue.length};
}
function validateCommand(command) {
  const fields=command?.type==='start'?['type','jobId']:command?.type==='request'?['type','projectId']:command?.type==='advance'?['type']:null;
  if(!fields||Object.keys(command).length!==fields.length||fields.some(k=>!Object.hasOwn(command,k)))throw new Error('Invalid policy command');
  if(command.type==='start'&&typeof command.jobId!=='string'||command.type==='request'&&typeof command.projectId!=='string')throw new Error('Invalid policy command identifier');
}

/** The dispatcher never repairs a rejected policy action or hides partial trials. */
export function runTrial({conditionId='fresh',solo=false,policy='project-pull',controller=null,budgetMinutes=1440,checkpoints=[120,480,1440],allowReserved=false}={}) {
  checkInteger(budgetMinutes,1,100000,'trial budget');
  if(!Array.isArray(checkpoints))throw new Error('Invalid checkpoints');
  for(const n of checkpoints)checkInteger(n,1,100000,'checkpoint');
  if(!POLICIES.includes(policy))throw new Error('Unknown comparison policy');
  const condition=CONDITIONS.find(c=>c.id===conditionId);if(!condition)throw new Error('Unknown condition');
  if(condition.partition==='reserved'&&!allowReserved)throw new Error('Reserved condition is sealed until source freeze');
  const start=createCondition(conditionId,{solo});let game=copy(start);
  const at=[...new Set([...checkpoints.filter(n=>n<=budgetMinutes),budgetMinutes])].sort((a,b)=>a-b),records=[];
  const choose=controller??(view=>policy==='project-pull'?chooseRival(view):chooseExisting(view,policy));
  const commands=[],initial=observation(game,start),end=start.clock.now+budgetMinutes;
  let maxSaveBytes=initial.activeSaveBytes,maxViewBytes=0,maxPendingEvents=game.clock.queue.length,zeroTime=0,status='budget',rejectedCommands=0;
  const capture=()=>{const current=observation(game,start);maxSaveBytes=Math.max(maxSaveBytes,current.activeSaveBytes);maxPendingEvents=Math.max(maxPendingEvents,current.pendingEvents);if(at.includes(current.elapsed)&&!records.some(r=>r.elapsed===current.elapsed))records.push(current);};
  while(game.clock.now<end&&commands.length<10000) {
    const view=getGameView(game);maxViewBytes=Math.max(maxViewBytes,bytes(view));
    const entry={at:view.now,elapsed:view.now-start.clock.now,command:null,advanced:0,status:'applied',error:null,errorOrigin:null,response:null};
    let phase='policy';
    try {
      const command=choose(copy(view));validateCommand(command);entry.command=copy(command);phase='host';
      if(command.type==='start')game=startJob(game,command.jobId);
      else if(command.type==='request'){game=requestProject(game,command.projectId);entry.response=copy(getGameView(game).lastResponse);}
      else {
        const target=Math.min(end,view.nextEventAt??view.now+1);
        // Checkpoint observations never call a policy, preserving the same
        // completion-to-completion decision opportunities as the native driver.
        while(game.clock.now<target) {
          const boundary=at.map(n=>n+start.clock.now).find(n=>n>game.clock.now&&n<target)??target;
          game=advanceGame(game,Math.min(1440,boundary-game.clock.now));capture();
        }
      }
      entry.advanced=game.clock.now-view.now;zeroTime=entry.advanced?0:zeroTime+1;
    } catch(error) {entry.status='rejected';entry.error=error.message;entry.errorOrigin=phase;rejectedCommands++;status=phase==='host'?'rejected-command':'policy-error';}
    commands.push(entry);capture();
    if(['rejected-command','policy-error'].includes(status))break;
    if(zeroTime>8){status='zero-time-loop';break;}
  }
  if(commands.length>=10000&&game.clock.now<end&&status==='budget')status='command-limit';
  return {conditionId,family:condition.family,partition:condition.partition,solo,policy:controller?'custom':policy,budgetMinutes,status,rejectedCommands,
    initial,checkpoints:records,final:observation(game,start),commands,commandCount:commands.length,maxSaveBytes,maxViewBytes,maxPendingEvents,
    initialState:exportGame(start),finalState:exportGame(game)};
}

export function runComparison({partition='development',allowReserved=false,budgetMinutes=1440,checkpoints=[120,480,1440]}={}) {
  if(!['development','reserved','all'].includes(partition))throw new Error('Unknown comparison partition');
  if(partition!=='development'&&!allowReserved)throw new Error('Reserved comparison is sealed until source freeze');
  const conditions=CONDITIONS.filter(c=>partition==='all'||c.partition===partition);
  return {comparisonVersion:COMPARISON_VERSION,partition,budgetMinutes,checkpoints:copy(checkpoints),conditions:copy(conditions),
    trials:conditions.flatMap(condition=>[true,false].flatMap(solo=>POLICIES.map(policy=>runTrial({conditionId:condition.id,solo,policy,budgetMinutes,checkpoints,allowReserved}))))};
}
