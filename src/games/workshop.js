// The workshop is the host. Only the public human boundary supplies body and practice.
import {createPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,
  exportPerson,restorePerson,assessEffort,estimateSuccess} from '../human/index.js';

export const HOST_VERSION='workshop-0.1.0';
export const POLICIES=Object.freeze(['task-aware','planned-simple','greedy']);
const DEADLINE=240,BLOCKED_MINUTES=2;
const copy=value=>structuredClone(value);
const definitions=Object.freeze({
  'take-wrench':{label:'Take the wrench',targetId:'wrench',durationMinutes:6,detail:'Carry the reusable tool. Both repairs need it.'},
  'take-seal':{label:'Collect the replacement seal',targetId:'seal',durationMinutes:12,detail:'Find the correct seal in storage. Required for a full replacement.'},
  'go-pump':{label:'Walk to the pump room',targetId:'pump-room',durationMinutes:12,detail:'Carry your items with you.'},
  'go-storage':{label:'Walk to storage',targetId:'storage',durationMinutes:12,detail:'Tools, the spare seal and meals are here.'},
  'inspect-pump':{label:'Inspect the pump',targetId:'pump',durationMinutes:10,
    detail:'Spend 10 minutes examining the seal. Completing the inspection reveals its condition and refines repair estimates.'},
  patch:{label:'Patch the existing seal',targetId:'pump',durationMinutes:35,effort:0.19,exertive:true,skill:'repair',difficulty:0.40,
    detail:'Quicker, less reliable. Keeps the spare seal. A failed attempt can be retried.'},
  replace:{label:'Replace the seal',targetId:'pump',durationMinutes:50,effort:0.27,exertive:true,skill:'repair',difficulty:0.12,
    detail:'Slower and easier. Uses the spare seal when successfully installed; a failed fitting can be retried.'},
  'test-pump':{label:'Run the pump',targetId:'pump',durationMinutes:8,effort:0.03,exertive:true,
    detail:'Verify the repaired pump under flow. Completes the task.'},
  rest:{label:'Rest',durationMinutes:15,activity:'rest',detail:'Pause here for 15 minutes. Fatigue falls; hunger keeps increasing.'},
  eat:{label:'Eat a meal',targetId:'rations',durationMinutes:10,activity:'meal',detail:'Use one storage meal after finishing it. An interrupted meal gives no relief.'}
});

// Host-local deterministic draws; presentation and diagnostics never consume them.
function random(seed,...keys) {
  let hash=2166136261;
  for(const letter of JSON.stringify([seed,...keys])){hash^=letter.charCodeAt(0);hash=Math.imul(hash,16777619);}
  hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;
  hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
  return(hash>>>0)/4294967296;
}
function requireSeed(seed) {
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error('Seed must be an unsigned 32-bit integer');
}
function requirePolicy(policy){if(!POLICIES.includes(policy))throw new Error('Unknown workshop policy');}
function requireMinutes(minutes){if(!Number.isFinite(minutes)||minutes<=0)throw new Error('Minutes must be positive and finite');}
function requireKeys(value,keys,name) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(value,key)))throw new Error(`Malformed ${name}`);
}
function personAction(id) {
  const action=definitions[id];
  return {actionId:id,targetId:action.targetId??null,durationMinutes:action.durationMinutes,
    effort:action.effort??0,exertive:action.exertive??false,activity:action.activity??'active',skill:action.skill??null};
}

export function createGame({seed=1,policy='task-aware'}={}) {
  requireSeed(seed);requirePolicy(policy);
  return {version:HOST_VERSION,seed,policy,clock:0,deadline:DEADLINE,status:'playing',location:'storage',
    person:createPerson({id:'worker',body:{fatigue:0.22,hunger:0.15},skills:{repair:0.55},observationBias:0}),
    objects:{pump:{id:'pump',location:'pump-room',status:'broken',route:null,condition:random(seed,'pump-condition')<0.5?'ordinary':'stubborn',inspection:null},
      wrench:{id:'wrench',location:'storage'},seal:{id:'seal',location:'storage'},rations:{id:'rations',location:'storage',count:2}},
    pending:null,lastEvent:{status:'ready',message:'The water pump is down. Restore it and run it before departure.',minutes:0}};
}

function availableIds(game) {
  if(game.pending||game.status!=='playing')return [];
  const ids=[];
  if(game.location==='storage') {
    if(game.objects.wrench.location==='storage')ids.push('take-wrench');
    if(game.objects.seal.location==='storage'&&game.objects.pump.status==='broken')ids.push('take-seal');
    if(game.objects.rations.count>0)ids.push('eat');
    ids.push('go-pump');
  } else {
    if(game.objects.pump.status==='broken'&&game.objects.pump.inspection===null)ids.push('inspect-pump');
    if(game.objects.wrench.location==='inventory'&&game.objects.pump.status==='broken') {
      ids.push('patch');if(game.objects.seal.location==='inventory')ids.push('replace');
    }
    if(game.objects.pump.status==='repaired')ids.push('test-pump');
    ids.push('go-storage');
  }
  ids.push('rest');return ids;
}

export function getActions(game) {
  const worker=getPersonView(game.person);
  return availableIds(game).map(id=>{
    const action=definitions[id],capacity=assessEffort(worker.body,personAction(id));
    const inspection=game.objects.pump.inspection;
    const conditionDifficulty=inspection?(inspection.condition==='stubborn'?0.06:0):0.03;
    let estimatedSuccess=null;
    if(action.skill) {
      estimatedSuccess=0;
      if(capacity.allowed) {
        const observed=createPerson({id:worker.id,body:worker.body,skills:worker.skills});
        const projected=advanceAttempt(beginAttempt(observed,personAction(id)),action.durationMinutes);
        estimatedSuccess=estimateSuccess({skill:projected.skills[action.skill],body:projected.body,difficulty:action.difficulty+conditionDifficulty});
      }
    }
    return {id,...copy(action),effort:action.effort??0,capacity,estimatedSuccess};
  });
}

export function getGameView(game) {
  const objects=copy(game.objects);delete objects.pump.condition;
  return {version:HOST_VERSION,clock:game.clock,deadline:game.deadline,remainingMinutes:game.deadline-game.clock,
    status:game.status,location:game.location,worker:getPersonView(game.person),objects,
    actionDurations:Object.fromEntries(Object.entries(definitions).map(([id,action])=>[id,action.durationMinutes])),
    actions:getActions(game),pending:game.pending?{actionId:game.pending.actionId,label:definitions[game.pending.actionId].label,
      elapsedMinutes:game.person.pending.elapsedMinutes,totalMinutes:game.pending.durationMinutes,
      blocked:!game.person.pending.capacity.allowed}:null,lastEvent:copy(game.lastEvent)};
}

export function startAction(game,actionId) {
  if(game.pending)throw new Error('An action is already in progress');
  if(game.status!=='playing')throw new Error('The game is finished');
  if(!availableIds(game).includes(actionId))throw new Error('Action is not available: check location and prerequisites');
  const next=copy(game),action=definitions[actionId];
  next.person=beginAttempt(game.person,personAction(actionId));
  const allowed=next.person.pending.capacity.allowed;
  next.pending={actionId,attemptId:next.person.pending.id,durationMinutes:allowed?action.durationMinutes:BLOCKED_MINUTES};
  next.lastEvent={status:allowed?'started':'blocked',message:allowed?`${action.label} started.`:
    'This effort exceeds current capacity. The attempt costs 2 idle minutes, with no repair, rest or meal.',minutes:0};
  return next;
}

function settle(game,status,reason) {
  const next=copy(game),pending=game.pending,id=pending.actionId,action=definitions[id];
  let message=reason,mealConsumed=false;
  if(status==='completed') {
    if(id==='patch'||id==='replace') {
      const chance=estimateSuccess({skill:next.person.skills.repair,body:next.person.body,
        difficulty:action.difficulty+(next.objects.pump.condition==='stubborn'?0.06:0)});
      if(random(next.seed,'repair',pending.attemptId,id)<chance) {
        next.objects.pump.status='repaired';next.objects.pump.route=id;
        if(id==='replace')next.objects.seal.location='installed';
        message='The repair holds. Run the pump to verify flow before departure.';
      } else {status='failed';message='The seal still leaks. Time and effort were spent, and repair practice increased. You can retry or change route.';}
    } else if(id==='inspect-pump') {
      next.objects.pump.inspection={condition:next.objects.pump.condition,inspectedAt:next.clock,attemptId:pending.attemptId};
      message=`Inspection completed. The seal is ${next.objects.pump.inspection.condition}; repair estimates now use that observed condition.`;
    } else if(id==='take-wrench') {next.objects.wrench.location='inventory';message='Wrench collected. Both repair routes are available once you reach the pump.';}
    else if(id==='take-seal') {next.objects.seal.location='inventory';message='Replacement seal collected. Carry it to the pump for the easier fitting.';}
    else if(id==='go-pump'||id==='go-storage') {next.location=id==='go-pump'?'pump-room':'storage';message=`Arrived in ${next.location==='storage'?'storage':'the pump room'}.`;}
    else if(id==='rest')message='Rest completed. Fatigue fell while time and hunger advanced.';
    else if(id==='eat') {
      if(next.location!=='storage'||next.objects.rations.count<1)throw new Error('Meal is no longer accessible');
      next.objects.rations.count--;mealConsumed=true;message='Meal finished. One ration used; hunger eased.';
    } else if(id==='test-pump') {next.objects.pump.status='running';next.status='won';message='Water is flowing. You restored the pump before departure.';}
  }
  next.person=finishAttempt(next.person,{attemptId:pending.attemptId,status,mealConsumed});
  next.pending=null;
  next.lastEvent={status,message:message??'Attempt ended.',minutes:game.person.pending.elapsedMinutes};
  if(next.clock>=next.deadline&&next.status!=='won') {
    next.status='lost';next.lastEvent.message+=' Departure time arrived before the pump was running.';
  }
  return next;
}

export function advanceTime(game,minutes) {
  requireMinutes(minutes);if(!game.pending)throw new Error('No pending action');
  const next=copy(game),remaining=next.pending.durationMinutes-next.person.pending.elapsedMinutes;
  const elapsed=Math.min(minutes,remaining,next.deadline-next.clock);
  next.person=advanceAttempt(next.person,elapsed);next.clock+=elapsed;
  const blocked=!next.person.pending.capacity.allowed;
  // Both clocks describe paid time. At an absolute boundary subtraction can
  // differ from accumulated attempt time by a few floating-point units.
  // Avoid a broad epsilon that settles before either boundary is reached.
  const actionEndsAt=next.person.pending.startedAt+next.pending.durationMinutes;
  if(next.person.pending.elapsedMinutes>=next.pending.durationMinutes||next.clock>=actionEndsAt)
    return settle(next,blocked?'blocked':'completed',blocked?'Effort stopped after 2 idle minutes. No repair, practice, rest or meal occurred. Choose your next action.':undefined);
  if(next.clock>=next.deadline)return settle(next,blocked?'blocked':'interrupted','Departure interrupted the unfinished action.');
  return next;
}

export function finishAction(game) {
  if(!game.pending)throw new Error('No pending action');
  return advanceTime(game,game.pending.durationMinutes-game.person.pending.elapsedMinutes);
}

export function interruptAction(game,reason='You stopped the action') {
  if(!game.pending)throw new Error('No pending action');
  if(typeof reason!=='string'||reason.length>300)throw new Error('Interruption reason must be text under 300 characters');
  if(!game.person.pending.capacity.allowed)return finishAction(game);
  return settle(game,'interrupted',`${reason}. Elapsed time and practice remain; unfinished world effects do not occur.`);
}

// Controllers have exactly the same projected facts and opportunities as the player.
export function chooseAction(view,policy='task-aware') {
  requirePolicy(policy);if(view.status!=='playing'||view.pending)return null;
  const has=id=>view.actions.some(action=>action.id===id),find=id=>view.actions.find(action=>action.id===id);
  if(has('test-pump')&&find('test-pump').capacity.allowed)return 'test-pump';
  const fatigue=view.worker.body.fatigue,hunger=view.worker.body.hunger;
  const duration=id=>view.actionDurations[id];
  const needsWrench=view.objects.wrench.location==='storage',needsSeal=view.objects.seal.location==='storage';
  const needsStorage=needsWrench||needsSeal;
  const replacementMinutes=duration('replace')+duration('test-pump')+
    (needsWrench?duration('take-wrench'):0)+(needsSeal?duration('take-seal'):0)+
    (view.location==='storage'?duration('go-pump'):needsStorage?duration('go-storage')+duration('go-pump'):0);
  const useSpare=policy==='task-aware'&&view.objects.pump.status==='broken'&&view.remainingMinutes>=replacementMinutes;
  const work=find(useSpare?'replace':'patch');
  const blockedHunger=work&&!work.capacity.allowed&&work.capacity.causes.includes('hunger');
  if(blockedHunger||hunger>(policy==='greedy'?0.90:0.76)) {
    if(has('eat'))return 'eat';
    if(has('go-storage')&&view.objects.rations.count>0)return 'go-storage';
  }
  if(work&&!work.capacity.allowed||policy!=='greedy'&&fatigue>0.61)return 'rest';
  if(has('take-wrench'))return 'take-wrench';
  if(useSpare&&has('take-seal'))return 'take-seal';
  if(useSpare&&needsStorage&&has('go-storage'))return 'go-storage';
  if(has('go-pump'))return 'go-pump';
  if(work)return work.id;
  if(has('test-pump'))return 'rest';
  if(has('go-storage'))return 'go-storage';
  return 'rest';
}

export function exportGame(game) {
  const snapshot=copy(game);snapshot.person=exportPerson(game.person);return snapshot;
}

export function importGame(record) {
  requireKeys(record,['version','seed','policy','clock','deadline','status','location','person','objects','pending','lastEvent'],'game snapshot');
  if(record.version!==HOST_VERSION)throw new Error('Unsupported workshop save version');
  requireSeed(record.seed);requirePolicy(record.policy);
  const next=copy(record);next.person=restorePerson(record.person);
  if(next.person.id!=='worker')throw new Error('Invalid workshop worker');
  requireKeys(next.person.skills,['repair'],'workshop worker skills');
  if(!Number.isFinite(next.clock)||next.clock<0||next.clock>DEADLINE||next.clock!==next.person.minutes||next.deadline!==DEADLINE)throw new Error('Invalid host clock or person minutes');
  if(!['storage','pump-room'].includes(next.location)||!['playing','won','lost'].includes(next.status))throw new Error('Invalid game status or location');
  requireKeys(next.objects,['pump','wrench','seal','rations'],'objects');
  requireKeys(next.objects.pump,['id','location','status','route','condition','inspection'],'pump');
  for(const key of ['wrench','seal'])requireKeys(next.objects[key],['id','location'],key);
  requireKeys(next.objects.rations,['id','location','count'],'rations');
  const {pump,wrench,seal,rations}=next.objects;
  if(pump.id!=='pump'||pump.location!=='pump-room'||!['broken','repaired','running'].includes(pump.status)||![null,'patch','replace'].includes(pump.route)||!['ordinary','stubborn'].includes(pump.condition))throw new Error('Invalid pump');
  if(pump.inspection!==null) {
    requireKeys(pump.inspection,['condition','inspectedAt','attemptId'],'pump inspection');
    const {condition,inspectedAt,attemptId}=pump.inspection;
    const prefix=`${next.person.id}:`;
    const number=typeof attemptId==='string'&&attemptId.startsWith(prefix)?Number(attemptId.slice(prefix.length)):NaN;
    const latestInspectionTime=next.person.pending?.startedAt??next.clock;
    if(condition!==pump.condition||!Number.isFinite(inspectedAt)||inspectedAt<definitions['go-pump'].durationMinutes+definitions['inspect-pump'].durationMinutes||inspectedAt>latestInspectionTime||!Number.isSafeInteger(number)||number<2||number>=next.person.nextAttempt||attemptId!==`${prefix}${number}`||next.person.pending?.id===attemptId)throw new Error('Invalid pump inspection');
  }
  if(wrench.id!=='wrench'||!['storage','inventory'].includes(wrench.location)||seal.id!=='seal'||!['storage','inventory','installed'].includes(seal.location))throw new Error('Invalid tool or part ownership');
  if(rations.id!=='rations'||rations.location!=='storage'||!Number.isInteger(rations.count)||rations.count<0||rations.count>2)throw new Error('Invalid rations');
  if((pump.status==='broken')!==(pump.route===null)||(seal.location==='installed')!==(pump.route==='replace')||(next.status==='won')!==(pump.status==='running')||next.status==='lost'&&next.clock!==DEADLINE||next.status==='playing'&&next.clock===DEADLINE)throw new Error('Inconsistent world outcome');
  if(pump.status!=='broken'&&wrench.location!=='inventory'||next.status==='won'&&next.location!=='pump-room')throw new Error('Inconsistent world location or tool');
  // Necessary lower bounds on committed effects, not proof of an entire history.
  const visitedPump=next.location==='pump-room'||pump.status!=='broken'||pump.inspection!==null;
  const minimumElapsed=(wrench.location==='inventory'?definitions['take-wrench'].durationMinutes:0)+
    (seal.location!=='storage'?definitions['take-seal'].durationMinutes:0)+
    (2-rations.count)*definitions.eat.durationMinutes+
    (visitedPump?definitions['go-pump'].durationMinutes:0)+
    (visitedPump&&next.location==='storage'?definitions['go-storage'].durationMinutes:0)+
    (pump.inspection?definitions['inspect-pump'].durationMinutes:0)+
    (pump.route?definitions[pump.route].durationMinutes:0)+
    (pump.status==='running'?definitions['test-pump'].durationMinutes:0)+
    (next.person.pending?.elapsedMinutes??0);
  if(next.clock+1e-9<minimumElapsed)throw new Error('Insufficient elapsed time for committed world effects');
  requireKeys(next.lastEvent,['status','message','minutes'],'last event');
  if(typeof next.lastEvent.status!=='string'||next.lastEvent.status.length>30||typeof next.lastEvent.message!=='string'||next.lastEvent.message.length>700||!Number.isFinite(next.lastEvent.minutes)||next.lastEvent.minutes<0)throw new Error('Invalid last event');
  if(Boolean(next.pending)!==Boolean(next.person.pending))throw new Error('Host and human pending attempt mismatch');
  if(next.pending) {
    requireKeys(next.pending,['actionId','attemptId','durationMinutes'],'pending action');
    const pending=next.pending,human=next.person.pending,action=definitions[pending.actionId];
    if(!action||pending.attemptId!==human.id||JSON.stringify(human.action)!==JSON.stringify(personAction(pending.actionId))||pending.durationMinutes!==(human.capacity.allowed?action.durationMinutes:BLOCKED_MINUTES)||human.elapsedMinutes>=pending.durationMinutes||next.status!=='playing')throw new Error('Invalid pending attempt');
    const check=copy(next);check.pending=null;
    if(!availableIds(check).includes(pending.actionId))throw new Error('Pending action prerequisites no longer hold');
  }
  return next;
}

export function applyCommand(game,command) {
  if(!command||typeof command!=='object')throw new Error('Invalid command');
  switch(command.type) {
    case 'start':requireKeys(command,['type','actionId'],'start command');return startAction(game,command.actionId);
    case 'advance':requireKeys(command,['type','minutes'],'advance command');return advanceTime(game,command.minutes);
    case 'finish':requireKeys(command,['type'],'finish command');return finishAction(game);
    case 'interrupt':requireKeys(command,['type','reason'],'interrupt command');return interruptAction(game,command.reason);
    default:throw new Error('Unknown workshop command');
  }
}

export function replaySession(record) {
  requireKeys(record,['version','seed','policy','commands'],'session replay');
  if(record.version!==HOST_VERSION)throw new Error('Unsupported workshop replay version');
  if(!Array.isArray(record.commands)||record.commands.length>100000)throw new Error('Invalid command log');
  return record.commands.reduce(applyCommand,createGame({seed:record.seed,policy:record.policy}));
}
