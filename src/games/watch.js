/** Before the Water: host-owned choices around the declared runtime boundary.
 * Lifecycle wiring adapts examples/maintenance-watch/host.js; that evidence stays frozen.
 */
import {
  RUNTIME_VERSION, HUMAN_VERSION, CLOCK_VERSION,
  createPerson, getPersonView, assessEffort, beginAttempt, advanceAttempt, finishAttempt, exportPerson, restorePerson,
  createClock, scheduleEvent, cancelEvent, advanceClock, exportClock, restoreClock
} from '../runtime/index.js';

export const WATCH_VERSION='0.1.0';
export const WATCH_SCENARIOS=Object.freeze({steady:{label:'Time to prepare',arrival:32,forecast:[28,36]},short:{label:'Short notice',arrival:22,forecast:[18,26]}});
export const WATCH_TASKS=Object.freeze({
  repair:{label:'Repair a gate section',detail:'Keeps the inlet working. Heavy work; each new section installs one of your parts.'},
  bypass:{label:'Prepare the diversion',detail:'Uses two parts in total. A prepared channel still needs opening.'},
  watch:{label:'Take the lookout',detail:'Find the exact surge time. A full lookout is needed before opening the diversion.'},
  open:{label:'Open the diversion',detail:'Protects the site once prepared. Water service closes for this episode.'},
  share:{label:'Hand over one part',detail:'Gives one of your parts to the other person after two paid minutes.'},
  salvage:{label:'Fetch the spare part',detail:'One part remains in the shed. Whoever fetches it owns it.'},
  rest:{label:'Rest',detail:'Six minutes of recovery. The other person can keep working.'},
  meal:{label:'Eat your meal',detail:'Four minutes. Uses your own meal only when you finish eating.'}
});
const ids=['keeper','watcher'],tasks=[...Object.keys(WATCH_TASKS),'idle'];
const clone=value=>structuredClone(value),other=actor=>actor==='keeper'?'watcher':'keeper';
const fail=(code,message)=>{const error=new Error(message);error.code=code;throw error;};
const countInstalled=state=>Math.ceil(state.repair/6)+Math.ceil(state.bypass/5);
const scenario=state=>WATCH_SCENARIOS[state.scenario];
const isWork=task=>!['rest','meal','idle'].includes(task);
function integer(value,min,max,name) {
  if(!Number.isSafeInteger(value)||value<min||value>max||Object.is(value,-0))fail('INVALID_STATE',`Invalid ${name}.`);
}
function keys(value,names,name) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==names.length||names.some(key=>!Object.hasOwn(value,key)))fail('INVALID_STATE',`Invalid ${name} fields.`);
}
function simpleJSON(value,depth=0,ancestors=new Set()) {
  if(depth>20)fail('INVALID_STATE','Save nesting exceeds limit.');
  if(value===null||typeof value==='boolean'||typeof value==='string')return;
  if(typeof value==='number'){if(!Number.isFinite(value)||Object.is(value,-0))fail('INVALID_STATE','Invalid JSON number.');return;}
  if(!value||typeof value!=='object'||ancestors.has(value))fail('INVALID_STATE','Save requires acyclic JSON.');
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  if(array?prototype!==Array.prototype:![Object.prototype,null].includes(prototype))fail('INVALID_STATE','Save requires plain JSON.');
  const names=Reflect.ownKeys(value);
  if(array&&names.length!==value.length+1)fail('INVALID_STATE','Save requires dense arrays.');
  ancestors.add(value);
  for(const key of names){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value'))fail('INVALID_STATE','Save requires JSON properties.');
    simpleJSON(d.value,depth+1,ancestors);
  }
  ancestors.delete(value);
}
function canonical(value) {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
const same=(a,b)=>canonical(a)===canonical(b);
function note(state,actor,message){state.recent.push({at:state.clock.now,actor,message});if(state.recent.length>12)state.recent.shift();}
function action(task,progress=0) {
  const durationMinutes=task==='repair'?6-progress%6:task==='bypass'?(progress===10?10:10-progress):task==='watch'||task==='rest'?6:task==='share'?2:task==='salvage'?8:task==='idle'?64:4;
  const effort=task==='repair'?durationMinutes*.16/6:task==='bypass'?durationMinutes*.012:task==='salvage'?.04:task==='open'?.03:0;
  return {actionId:task,targetId:task==='repair'?'gate':task==='bypass'||task==='open'?'diversion':task==='watch'?'channel':task==='salvage'?'shed':null,
    durationMinutes,effort,exertive:effort>0,activity:task==='rest'?'rest':task==='meal'?'meal':'active',skill:task==='repair'?'repair':task==='watch'?'watch':null};
}
function neededParts(task,progress=0){return task==='repair'?(progress%6===0?1:0):task==='bypass'?2-Math.ceil(progress/5):task==='share'?1:0;}
function dueRecord(actor,job){return {id:job.eventId,at:job.endsAt,type:'attempt-due',actorId:actor,data:{attemptId:job.attemptId,task:job.task}};}
function start(state,actor,task) {
  const startProgress=['repair','bypass'].includes(task)?state[task]:null,spec=action(task,startProgress??0);
  const person=beginAttempt(state.people[actor],spec);
  if(!person.pending.capacity.allowed)fail('CAPACITY','A blocked attempt cannot start a host job.');
  const scheduled=scheduleEvent(state.clock,{at:state.clock.now+spec.durationMinutes,type:'attempt-due',actorId:actor,data:{attemptId:person.pending.id,task}});
  state.clock=scheduled.clock;state.people[actor]=person;
  const reservedParts=neededParts(task,startProgress??0),reservedMeal=task==='meal'?1:0;
  state.parts[actor]-=reservedParts;state.food[actor]-=reservedMeal;
  state.jobs[actor]={task,startedAt:state.clock.now,endsAt:state.clock.now+spec.durationMinutes,eventId:scheduled.eventId,attemptId:person.pending.id,startProgress,reservedParts,reservedMeal};
  if(task!=='idle')state.stats.started++;
}
function stop(state,actor) {
  const job=state.jobs[actor];
  state.people[actor]=finishAttempt(state.people[actor],{attemptId:job.attemptId,status:'interrupted'});
  state.clock=cancelEvent(state.clock,job.eventId);state.parts[actor]+=job.reservedParts;state.food[actor]+=job.reservedMeal;
  if(job.task!=='idle'){state.stats.interrupted++;note(state,actor,`Stopped ${WATCH_TASKS[job.task].label.toLowerCase()} after ${state.clock.now-job.startedAt} paid minutes. Installed work remains; unused supplies return.`);}
  state.jobs[actor]=null;
}
function settle(state,event) {
  const actor=event?.actorId,job=state.jobs[actor];
  if(!job||!same(event,dueRecord(actor,job)))fail('STALE_RECEIPT','Receipt does not match a current job.');
  if(state.clock.now<job.endsAt)fail('EARLY_RECEIPT','The job has not paid its full interval.');
  if(state.clock.now!==job.endsAt)fail('STALE_RECEIPT','Receipt missed its completion boundary.');
  state.people[actor]=finishAttempt(state.people[actor],{attemptId:job.attemptId,status:'completed',mealConsumed:job.task==='meal'});
  if(job.task==='watch')state.warningAt??=state.clock.now;
  if(job.task==='open')state.divertedAt=state.clock.now;
  if(job.task==='share')state.parts[other(actor)]+=job.reservedParts;
  if(job.task==='salvage'){state.salvaged=1;state.parts[actor]++;}
  if(job.task==='meal')state.eaten[actor]++;
  if(job.task!=='idle'){
    state.stats.completed++;state.lastReceipt=clone(event);
    const detail=job.task==='watch'?` The surge arrives at minute ${scenario(state).arrival}.`:job.task==='open'?' The site is protected, and water service is now closed.':job.task==='share'?` One part now belongs to ${other(actor)==='keeper'?'you':'Deniz'}.`:'';
    note(state,actor,`Finished ${WATCH_TASKS[job.task].label.toLowerCase()}.${detail}`);
  }
  state.jobs[actor]=null;start(state,actor,'idle');
}
function expectedOutcome(state) {
  const protectedSite=state.repair===18||state.divertedAt!==null;
  return {at:scenario(state).arrival,protected:protectedSite,waterService:protectedSite&&state.divertedAt===null,
    route:state.divertedAt!==null?'diversion':state.repair===18?'gate':'unfinished',breachedSections:protectedSite?0:Math.ceil((18-state.repair)/6),
    partsRemaining:state.parts.keeper+state.parts.watcher,workMinutes:Object.entries(state.paid).filter(([task])=>isWork(task)).reduce((sum,[,minutes])=>sum+minutes,0)};
}
function arrive(state) {
  state.arrivalEventId=null;
  for(const actor of ids)stop(state,actor);
  state.outcome=expectedOutcome(state);
  note(state,'world',state.outcome.protected?(state.outcome.waterService?'The repaired gate held. The site is dry and water service continues.':'The diversion carried the surge away. The site is dry; water service is closed.'):`Water crossed ${state.outcome.breachedSections} unfinished gate section${state.outcome.breachedSections===1?'':'s'}. The site flooded.`);
}

export function createWatch({scenario:scenarioId='steady'}={}) {
  if(typeof scenarioId!=='string'||!Object.hasOwn(WATCH_SCENARIOS,scenarioId))fail('INVALID_COMMAND','Unknown preparation scenario.');
  const state={version:WATCH_VERSION,scenario:scenarioId,clock:createClock(),people:{},jobs:{},parts:{keeper:2,watcher:1},food:{keeper:1,watcher:1},eaten:{keeper:0,watcher:0},
    repair:0,bypass:0,salvaged:0,warningAt:null,divertedAt:null,arrivalEventId:null,outcome:null,stats:{requests:0,started:0,completed:0,interrupted:0},
    paid:Object.fromEntries(tasks.map(task=>[task,0])),lastResponse:null,lastReceipt:null,recent:[]};
  const scheduled=scheduleEvent(state.clock,{at:scenario(state).arrival,type:'water-arrival'});state.clock=scheduled.clock;state.arrivalEventId=scheduled.eventId;
  for(const actor of ids){state.people[actor]=createPerson({id:actor,body:{fatigue:actor==='keeper'?.55:.2,hunger:.2},skills:{repair:.2,watch:.1}});start(state,actor,'idle');}
  note(state,'world','Protect the site before the surge. Repair the gate to keep water service, or prepare and open a diversion. Nothing moves until you advance time.');
  return state;
}
function refusal(state,actor,task) {
  if(!ids.includes(actor))return ['NOT_PRESENT','No such person is here.'];
  if(state.outcome)return ['ARRIVAL_PASSED','The surge has settled this episode. Start a new attempt to choose another approach.'];
  if(state.jobs[actor].task!=='idle')return ['BUSY','I am already working. Stop my current job explicitly before asking for another.'];
  if(actor==='watcher'&&task==='repair')return ['ROLE_DECLINED','I can help with lookout, supplies and diversion, but I am not taking on gate repairs.'];
  if(task==='share'&&actor==='watcher'&&state.warningAt===null)return ['KEEPING_SPARE','I am keeping my spare until we know the surge time. Let me finish the lookout first.'];
  if(['repair','bypass'].includes(task)&&state[task]===(task==='repair'?18:10)||task==='watch'&&state.warningAt!==null||task==='open'&&state.divertedAt!==null||task==='salvage'&&state.salvaged===1)return ['ALREADY_DONE','That work is already complete.'];
  if(['repair','bypass','watch','open','salvage'].includes(task)&&ids.some(id=>state.jobs[id].task===task))return ['TARGET_BUSY','The other person already has this job. Choose different work to do alongside them.'];
  if(task==='open'&&state.bypass!==10)return ['NOT_PREPARED','Prepare the full diversion channel before opening it.'];
  if(task==='open'&&state.warningAt===null)return ['NO_WARNING','Finish the lookout before opening the diversion.'];
  const required=neededParts(task,state[task]??0);
  if(state.parts[actor]<required)return ['MISSING_PARTS',`I need ${required} available part${required===1?'':'s'} of my own. Ask for a handover or fetch the spare from the shed.`];
  if(task==='meal'&&state.food[actor]<1)return ['NO_MEAL','I have no meal left. Rest can still reduce fatigue.'];
  return null;
}
export function requestTask(input,actor,task) {
  validate(input);
  if(typeof task!=='string'||!Object.hasOwn(WATCH_TASKS,task))fail('INVALID_COMMAND','Unknown task.');
  if(typeof actor!=='string'||!actor||actor.length>80||actor.trim()!==actor)fail('INVALID_COMMAND','Invalid recipient.');
  const state=clone(input);let rejected=refusal(state,actor,task);
  if(!rejected){const capacity=assessEffort(state.people[actor].body,action(task,state[task]??0));if(!capacity.allowed)rejected=['CAPACITY',`I cannot sustain this whole job: ${capacity.causes.join(', ')}. Choose recovery, or ask the other person for lighter work.`];}
  state.stats.requests++;
  state.lastResponse={at:state.clock.now,actor,task,accepted:!rejected,code:rejected?.[0]??'ACCEPTED',reason:rejected?.[1]??`Accepted: ${WATCH_TASKS[task].label.toLowerCase()}, ${action(task,state[task]??0).durationMinutes} minutes.`};
  note(state,ids.includes(actor)?actor:'world',state.lastResponse.reason);
  if(!rejected){stop(state,actor);start(state,actor,task);}
  return validate(state);
}
export function interruptTask(input,actor) {
  validate(input);if(!ids.includes(actor)||!input.jobs[actor]||input.jobs[actor].task==='idle')fail('NOT_WORKING','There is no accepted job to stop.');
  const state=clone(input);stop(state,actor);start(state,actor,'idle');return validate(state);
}
export function receiveReceipt(input,receipt){validate(input);simpleJSON(receipt);const state=clone(input);settle(state,receipt);return validate(state);}
export function advanceTo(input,target) {
  validate(input);integer(target,input.clock.now,1000000,'target time');const state=clone(input);
  // A single canonical cadence gives bit-identical outcomes across UI clock drivers.
  while(state.clock.now<target&&!state.outcome){
    const advanced=advanceClock(state.clock,state.clock.now+1),elapsed=advanced.clock.now-state.clock.now;
    for(const actor of ids){
      const job=state.jobs[actor],task=job.task;
      state.people[actor]=advanceAttempt(state.people[actor],elapsed);state.paid[task]+=elapsed;
      if(['repair','bypass'].includes(task)){const divisor=task==='repair'?6:5,before=Math.ceil(state[task]/divisor);state[task]+=elapsed;job.reservedParts-=Math.ceil(state[task]/divisor)-before;}
    }
    state.clock=advanced.clock;
    for(const event of advanced.events){if(event.type==='water-arrival')arrive(state);else if(state.jobs[event.actorId]?.eventId===event.id)settle(state,event);}
  }
  return validate(state);
}
export function nextEvent(state){validate(state);return state.outcome?state.clock.now:state.clock.queue[0].at;}
export function getWatchView(state) {
  validate(state);
  const people=Object.fromEntries(ids.map(actor=>[actor,getPersonView(state.people[actor])]));
  const choices=Object.fromEntries(ids.map(actor=>[actor,Object.entries(WATCH_TASKS).map(([task,description])=>{
    const spec=action(task,state[task]??0),reason=refusal(state,actor,task),estimate=assessEffort(people[actor].body,spec);
    return {task,...description,duration:spec.durationMinutes,parts:neededParts(task,state[task]??0),meal:task==='meal',reason:reason?.[1]??null,code:reason?.[0]??null,capacityEstimate:estimate.allowed};
  })]));
  return clone({version:WATCH_VERSION,runtimeVersion:RUNTIME_VERSION,humanVersion:HUMAN_VERSION,clockVersion:CLOCK_VERSION,scenario:state.scenario,now:state.clock.now,
    forecast:scenario(state).forecast,arrivalAt:state.warningAt!==null||state.outcome?scenario(state).arrival:null,warningAt:state.warningAt,
    people,jobs:state.jobs,choices,parts:{...state.parts,reserved:ids.reduce((n,id)=>n+(state.jobs[id]?.reservedParts??0),0),installed:countInstalled(state),salvageAvailable:!state.salvaged&&!ids.some(id=>state.jobs[id]?.task==='salvage')},
    food:state.food,repair:state.repair,bypass:state.bypass,divertedAt:state.divertedAt,outcome:state.outcome,lastResponse:state.lastResponse,recent:state.recent});
}
function validate(state) {
  simpleJSON(state);if(JSON.stringify(state).length>65536)fail('INVALID_STATE','Save exceeds size limit.');
  keys(state,['version','scenario','clock','people','jobs','parts','food','eaten','repair','bypass','salvaged','warningAt','divertedAt','arrivalEventId','outcome','stats','paid','lastResponse','lastReceipt','recent'],'watch');
  if(state.version!==WATCH_VERSION||typeof state.scenario!=='string'||!Object.hasOwn(WATCH_SCENARIOS,state.scenario))fail('INVALID_STATE','Incompatible watch episode.');
  if(state.outcome!==null&&(!state.outcome||typeof state.outcome!=='object'||Array.isArray(state.outcome)))fail('INVALID_STATE','Invalid outcome marker.');
  restoreClock(exportClock(state.clock));integer(state.clock.now,0,scenario(state).arrival,'clock time');
  for(const name of ['people','jobs','parts','food','eaten'])keys(state[name],ids,name);
  integer(state.repair,0,18,'repair progress');integer(state.bypass,0,10,'diversion progress');integer(state.salvaged,0,1,'salvage');
  keys(state.paid,tasks,'paid minutes');for(const value of Object.values(state.paid))integer(value,0,state.clock.now*2,'paid minutes');
  if(Object.values(state.paid).reduce((sum,n)=>sum+n,0)!==state.clock.now*2||state.paid.repair!==state.repair||state.paid.bypass!==state.bypass)fail('INVALID_STATE','Paid work does not reconcile.');
  if(state.warningAt!==null){integer(state.warningAt,6,Math.min(state.clock.now,scenario(state).arrival-1),'warning time');if(state.paid.watch<6)fail('INVALID_STATE','Warning lacks paid lookout.');}
  if(state.divertedAt!==null){integer(state.divertedAt,14,Math.min(state.clock.now,scenario(state).arrival-1),'opening time');if(state.bypass!==10||state.warningAt===null||state.warningAt>state.divertedAt-4||state.paid.open<4)fail('INVALID_STATE','Diversion lacks completed preparation or lookout.');}
  if(state.salvaged&&state.paid.salvage<8)fail('INVALID_STATE','Salvage lacks paid work.');
  keys(state.stats,['requests','started','completed','interrupted'],'stats');for(const n of Object.values(state.stats))integer(n,0,1e9,'counter');
  const events=[],runningTasks=[];let reserved=0;
  for(const actor of ids){
    const snapshot=exportPerson(state.people[actor]);
    if(snapshot.componentVersion!=='0.1.1'||snapshot.person.version!=='0.1.1')fail('INVALID_STATE','This episode requires Human 0.1.1.');
    const person=restorePerson(snapshot),view=getPersonView(person),job=state.jobs[actor];
    keys(snapshot.person.skills,['repair','watch'],'skills');if(snapshot.person.observationBias!==0||view.id!==actor||view.minutes!==state.clock.now)fail('INVALID_STATE','Person and host identity/time disagree.');
    integer(state.parts[actor],0,4,'owned parts');integer(state.food[actor],0,1,'owned meals');integer(state.eaten[actor],0,1,'eaten meals');
    if(state.food[actor]+state.eaten[actor]+(job?.reservedMeal??0)!==1)fail('INVALID_STATE','Owned meal does not conserve.');
    if(state.eaten[actor]&&state.paid.meal<4)fail('INVALID_STATE','Meal lacks paid time.');
    if(state.outcome){if(job!==null||view.pending!==null)fail('INVALID_STATE','Terminal episode retains a job.');continue;}
    keys(job,['task','startedAt','endsAt','eventId','attemptId','startProgress','reservedParts','reservedMeal'],'job');
    if(!tasks.includes(job.task)||actor==='watcher'&&job.task==='repair')fail('INVALID_STATE','Invalid task assignment.');
    integer(job.startedAt,0,state.clock.now,'job start');integer(job.endsAt,state.clock.now+1,scenario(state).arrival+64,'job end');
    const task=job.task,progress=job.startProgress??0,spec=action(task,progress),elapsed=state.clock.now-job.startedAt;
    if(!view.pending||view.pending.id!==job.attemptId||view.pending.elapsedMinutes!==elapsed||view.pending.durationMinutes!==job.endsAt-job.startedAt||!same(snapshot.person.pending.action,spec)||!snapshot.person.pending.capacity.allowed)fail('INVALID_STATE','Person and job execution contract disagree.');
    if(['repair','bypass'].includes(task)){
      integer(progress,0,task==='repair'?17:9,'job progress');if(state[task]!==progress+elapsed)fail('INVALID_STATE','Partial progress and job time disagree.');
    }else if(job.startProgress!==null)fail('INVALID_STATE','Unexpected progress baseline.');
    const used=['repair','bypass'].includes(task)?Math.ceil(state[task]/(task==='repair'?6:5))-Math.ceil(progress/(task==='repair'?6:5)):0;
    if(job.reservedParts!==neededParts(task,progress)-used||job.reservedMeal!==(task==='meal'?1:0))fail('INVALID_STATE','Owned reservations do not match pending work.');
    if(task==='watch'&&state.warningAt!==null||task==='salvage'&&state.salvaged||task==='open'&&(state.bypass!==10||state.warningAt===null||state.divertedAt!==null||state.warningAt>job.startedAt)||task==='share'&&actor==='watcher'&&(state.warningAt===null||state.warningAt>job.startedAt))fail('INVALID_STATE','Job prerequisites disagree.');
    reserved+=job.reservedParts;if(task!=='idle')runningTasks.push(task);events.push(dueRecord(actor,job));
  }
  for(const task of ['repair','bypass','watch','open','salvage'])if(runningTasks.filter(t=>t===task).length>1)fail('INVALID_STATE','A single target has multiple workers.');
  if(state.parts.keeper+state.parts.watcher+reserved+countInstalled(state)!==3+state.salvaged)fail('INVALID_STATE','Parts do not conserve.');
  if(state.stats.started!==state.stats.completed+state.stats.interrupted+runningTasks.length)fail('INVALID_STATE','Job counts do not reconcile.');
  if(state.outcome){
    if(state.clock.now!==scenario(state).arrival||state.arrivalEventId!==null||!same(state.outcome,expectedOutcome(state)))fail('INVALID_STATE','Terminal outcome disagrees with world.');
  }else{
    // Arrival is always scheduled first; imported IDs must preserve tie precedence.
    if(state.clock.now>=scenario(state).arrival||state.arrivalEventId!=='event:1')fail('INVALID_STATE','Missing or reordered arrival.');
    events.push({id:state.arrivalEventId,at:scenario(state).arrival,type:'water-arrival',actorId:null,data:null});
  }
  if(state.clock.queue.length!==events.length||events.some(event=>!state.clock.queue.some(e=>same(e,event))))fail('INVALID_STATE','Queue and host receipts disagree.');
  if(state.lastResponse!==null){const r=state.lastResponse;keys(r,['at','actor','task','accepted','code','reason'],'response');integer(r.at,0,state.clock.now,'response time');
    if(typeof r.actor!=='string'||!r.actor||r.actor.length>80||!Object.hasOwn(WATCH_TASKS,r.task)||typeof r.accepted!=='boolean'||typeof r.code!=='string'||r.code.length>80||typeof r.reason!=='string'||r.reason.length>300)fail('INVALID_STATE','Invalid response.');}
  if(state.lastReceipt!==null){const r=state.lastReceipt;keys(r,['id','at','type','actorId','data'],'receipt');keys(r.data,['attemptId','task'],'receipt data');integer(r.at,0,state.clock.now,'receipt time');
    if(r.type!=='attempt-due'||!ids.includes(r.actorId)||!Object.hasOwn(WATCH_TASKS,r.data.task)||typeof r.id!=='string'||r.id.length>80||typeof r.data.attemptId!=='string'||r.data.attemptId.length>100)fail('INVALID_STATE','Invalid receipt.');}
  if(!Array.isArray(state.recent)||state.recent.length>12)fail('INVALID_STATE','Too many messages.');let previous=0;
  for(const row of state.recent){keys(row,['at','actor','message'],'message');integer(row.at,previous,state.clock.now,'message time');previous=row.at;if(![...ids,'world'].includes(row.actor)||typeof row.message!=='string'||row.message.length>300)fail('INVALID_STATE','Invalid message.');}
  return state;
}
export function exportWatch(state){validate(state);return clone({format:'before-the-water',version:1,state});}
export function restoreWatch(snapshot){simpleJSON(snapshot);keys(snapshot,['format','version','state'],'save');if(snapshot.format!=='before-the-water'||snapshot.version!==1)fail('INVALID_STATE','Incompatible Before the Water save.');return clone(validate(snapshot.state));}
