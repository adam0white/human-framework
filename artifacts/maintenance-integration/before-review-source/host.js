import {
  createPerson,getPersonView,assessEffort,beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson,
  createClock,scheduleEvent,cancelEvent,advanceClock,exportClock,restoreClock
} from 'human-framework-runtime';

export const WATCH_VERSION='0.1.0';
export const WATCH_LIMITS=Object.freeze({minutes:1000000,recent:12,snapshotCharacters:32768});
const actors=state=>state.solo?['keeper']:['keeper','watcher'];
const clone=value=>structuredClone(value);
const tasks=['repair','watch','rest','idle'];
const fail=(code,message)=>{const error=new Error(message);error.code=code;throw error;};
function integer(value,min,max,name) {
  if(!Number.isSafeInteger(value)||value<min||value>max||Object.is(value,-0))fail('INVALID_STATE','Invalid '+name);
}
function keys(value,names,name) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==names.length||names.some(key=>!Object.hasOwn(value,key)))fail('INVALID_STATE','Invalid '+name+' fields');
}
function simpleJSON(value,depth=0,ancestors=new Set()) {
  if(depth>20)fail('INVALID_STATE','Snapshot nesting exceeds limit');
  if(value===null||typeof value==='boolean'||typeof value==='string')return;
  if(typeof value==='number'){if(!Number.isFinite(value)||Object.is(value,-0))fail('INVALID_STATE','Invalid JSON number');return;}
  if(!value||typeof value!=='object'||ancestors.has(value))fail('INVALID_STATE','Snapshot requires acyclic JSON');
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  if(array?prototype!==Array.prototype:![Object.prototype,null].includes(prototype))fail('INVALID_STATE','Snapshot requires plain JSON');
  const names=Reflect.ownKeys(value);
  if(array&&names.length!==value.length+1)fail('INVALID_STATE','Snapshot requires dense arrays');
  ancestors.add(value);
  for(const key of names) {
    if(array&&key==='length')continue;
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))fail('INVALID_STATE','Snapshot requires JSON properties');
    simpleJSON(descriptor.value,depth+1,ancestors);
  }
  ancestors.delete(value);
}
function canonical(value) {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
const same=(a,b)=>canonical(a)===canonical(b);
function count(state,key) {integer(state.stats[key]+1,0,1000000000,'counter');state.stats[key]++;}
function note(state,actor,message) {
  state.recent.push({at:state.clock.now,actor,message});
  if(state.recent.length>WATCH_LIMITS.recent)state.recent.shift();
}
function action(task,startProgress=0) {
  const durationMinutes=task==='repair'?12-startProgress:task==='watch'?8:task==='rest'?6:64;
  return {actionId:task,targetId:task==='repair'?'gate':task==='watch'?'channel':null,durationMinutes,
    effort:task==='repair'?durationMinutes*.01:0,exertive:task==='repair',
    activity:task==='rest'?'rest':'active',skill:task==='repair'?'repair':task==='watch'?'watch':null};
}
function start(state,actor,task) {
  const startProgress=task==='repair'?state.repairMinutes:null,spec=action(task,startProgress??0);
  const person=beginAttempt(state.people[actor],spec);
  const scheduled=scheduleEvent(state.clock,{at:state.clock.now+spec.durationMinutes,type:'attempt-due',actorId:actor,data:{attemptId:person.pending.id,task}});
  state.clock=scheduled.clock;state.people[actor]=person;
  state.jobs[actor]={task,startedAt:state.clock.now,endsAt:state.clock.now+spec.durationMinutes,eventId:scheduled.eventId,attemptId:person.pending.id,startProgress};
  if(task==='repair'){const count=2-state.parts.spent;state.parts.available-=count;state.parts.reserved+=count;}
  if(task!=='idle'){count(state,'started');note(state,actor,'Accepted '+task+' for '+spec.durationMinutes+' minutes.');}
}
function stop(state,actor) {
  const job=state.jobs[actor];
  state.people[actor]=finishAttempt(state.people[actor],{attemptId:job.attemptId,status:'interrupted'});
  state.clock=cancelEvent(state.clock,job.eventId);
  if(job.task==='repair'){state.parts.available+=state.parts.reserved;state.parts.reserved=0;}
  if(job.task!=='idle'){count(state,'interrupted');note(state,actor,'Interrupted '+job.task+' after '+(state.clock.now-job.startedAt)+' paid minutes.');}
  state.jobs[actor]=null;
}
function dueRecord(actor,job) {
  return {id:job.eventId,at:job.endsAt,type:'attempt-due',actorId:actor,data:{attemptId:job.attemptId,task:job.task}};
}
function settle(state,event) {
  const actor=event?.actorId,job=state.jobs[actor];
  if(!job||!same(event,dueRecord(actor,job)))fail('STALE_RECEIPT','Receipt does not match an active attempt.');
  if(state.clock.now<job.endsAt)fail('EARLY_RECEIPT','The attempt has not paid its full interval.');
  if(state.clock.now!==job.endsAt)fail('STALE_RECEIPT','Receipt arrived after the active completion boundary.');
  state.people[actor]=finishAttempt(state.people[actor],{attemptId:job.attemptId,status:'completed'});
  if(job.task==='repair'&&state.parts.reserved!==0)fail('INVALID_STATE','Completed repair retains unspent parts.');
  if(job.task==='watch')state.warningAt=state.clock.now;
  if(job.task!=='idle'){
    count(state,'completed');state.lastReceipt=clone(event);
    note(state,actor,'Completed '+job.task+'.');
  }
  state.jobs[actor]=null;start(state,actor,'idle');
}
function arrive(state) {
  state.outcome={at:18,repairMinutes:state.repairMinutes,unrepairedMinutes:12-state.repairMinutes,warningAvailable:state.warningAt!==null&&state.warningAt<18};
  state.approachEventId=null;
  for(const actor of actors(state))if(state.jobs[actor].task!=='idle'){stop(state,actor);start(state,actor,'idle');}
  note(state,'world','Water arrived with '+state.outcome.unrepairedMinutes+' repair minutes still unfinished.');
}

export function createWatch({solo=false}={}) {
  if(typeof solo!=='boolean')fail('INVALID_COMMAND','solo must be boolean.');
  const state={version:WATCH_VERSION,solo,clock:createClock(),people:{},jobs:{},parts:{available:2,reserved:0,spent:0},
    repairMinutes:0,watchMinutes:0,warningAt:null,approachEventId:null,outcome:null,
    stats:{requests:0,started:0,completed:0,interrupted:0},lastResponse:null,lastReceipt:null,recent:[]};
  const scheduled=scheduleEvent(state.clock,{at:18,type:'water-arrival'});
  state.clock=scheduled.clock;state.approachEventId=scheduled.eventId;
  for(const actor of actors(state)){
    state.people[actor]=createPerson({id:actor,body:{fatigue:actor==='keeper'?.12:.2,hunger:.1},skills:{repair:.2,watch:.1}});
    start(state,actor,'idle');
  }
  return state;
}
export function requestTask(input,actor,task) {
  validate(input);if(!['repair','watch','rest'].includes(task))fail('INVALID_COMMAND','Unknown requested task.');
  if(typeof actor!=='string'||actor.length<1||actor.length>80||actor.trim()!==actor)fail('INVALID_COMMAND','Invalid recipient identifier.');
  const state=clone(input);
  let code=null,reason=null;
  if(!actors(state).includes(actor)){code='NOT_PRESENT';reason='No such person is present.';}
  else if(state.jobs[actor].task!=='idle'){code='BUSY';reason='I am already doing an accepted task. Interrupt it explicitly before asking again.';}
  else if(actor==='watcher'&&task==='repair'){code='ROLE_DECLINED';reason='I agreed to lookout work, not gate repair.';}
  else if(state.outcome&&task!=='rest'){code='ARRIVAL_PASSED';reason='The arrival has already settled this maintenance window.';}
  else if(task==='repair'&&state.repairMinutes===12){code='ALREADY_DONE';reason='The gate repair is already complete.';}
  else if(task==='watch'&&state.warningAt!==null){code='ALREADY_DONE';reason='The approaching water has already been observed.';}
  else if(task==='repair'&&state.parts.available<2-state.parts.spent){code='MISSING_PARTS';reason='The remaining parts are unavailable.';}
  else {
    const capacity=assessEffort(state.people[actor].body,action(task,state.repairMinutes));
    if(!capacity.allowed){code='CAPACITY';reason='I cannot sustain this complete interval: '+capacity.causes.join(', ')+'.';}
  }
  count(state,'requests');
  state.lastResponse={at:state.clock.now,actor,task,accepted:code===null,code:code??'ACCEPTED',reason:reason??'I accept this task.'};
  note(state,actors(state).includes(actor)?actor:'world',state.lastResponse.reason);
  if(code===null){stop(state,actor);start(state,actor,task);}
  return state;
}
export function interruptTask(input,actor) {
  validate(input);
  if(!actors(input).includes(actor)||input.jobs[actor].task==='idle')fail('NOT_WORKING','There is no accepted task to interrupt.');
  const state=clone(input);stop(state,actor);start(state,actor,'idle');return state;
}
/** Receipt delivery is checked before any host effect, including stale redelivery. */
export function receiveReceipt(input,receipt) {
  validate(input);simpleJSON(receipt);const state=clone(input);settle(state,receipt);return state;
}
export function advanceTo(input,target) {
  validate(input);integer(target,input.clock.now,WATCH_LIMITS.minutes,'target time');
  const state=clone(input);
  while(state.clock.now<target) {
    const advanced=advanceClock(state.clock,target),elapsed=advanced.clock.now-state.clock.now;
    for(const actor of actors(state)) {
      const task=state.jobs[actor].task;
      state.people[actor]=advanceAttempt(state.people[actor],elapsed);
      if(task==='repair'){
        state.repairMinutes+=elapsed;
        const spent=Math.ceil(state.repairMinutes/6),newlySpent=spent-state.parts.spent;
        state.parts.spent=spent;state.parts.reserved-=newlySpent;
      }
      if(task==='watch')state.watchMinutes+=elapsed;
    }
    state.clock=advanced.clock;
    // Arrival was scheduled first: at an exact tie it precedes completion receipts.
    for(const event of advanced.events) {
      if(event.type==='water-arrival')arrive(state);
      else if(state.jobs[event.actorId]?.eventId===event.id)settle(state,event);
    }
  }
  return state;
}
export function getWatchView(state) {
  validate(state);
  return clone({now:state.clock.now,solo:state.solo,people:Object.fromEntries(actors(state).map(actor=>[actor,getPersonView(state.people[actor])])),
    jobs:state.jobs,parts:state.parts,repairMinutes:state.repairMinutes,watchMinutes:state.watchMinutes,
    warningAt:state.warningAt,outcome:state.outcome,lastResponse:state.lastResponse,recent:state.recent});
}
function validate(state) {
  simpleJSON(state);
  if(JSON.stringify(state).length>WATCH_LIMITS.snapshotCharacters)fail('INVALID_STATE','Snapshot exceeds size limit.');
  keys(state,['version','solo','clock','people','jobs','parts','repairMinutes','watchMinutes','warningAt','approachEventId','outcome','stats','lastResponse','lastReceipt','recent'],'watch');
  if(state.version!==WATCH_VERSION||typeof state.solo!=='boolean')fail('INVALID_STATE','Incompatible maintenance watch.');
  restoreClock(exportClock(state.clock));integer(state.clock.now,0,WATCH_LIMITS.minutes,'clock time');
  const ids=actors(state);keys(state.people,ids,'people');keys(state.jobs,ids,'jobs');
  keys(state.parts,['available','reserved','spent'],'parts');
  for(const amount of Object.values(state.parts))integer(amount,0,2,'parts');
  if(state.parts.available+state.parts.reserved+state.parts.spent!==2)fail('INVALID_STATE','Parts do not conserve their initial total.');
  integer(state.repairMinutes,0,12,'repair progress');integer(state.watchMinutes,0,state.clock.now*ids.length,'lookout work');
  if(state.parts.spent!==Math.ceil(state.repairMinutes/6))fail('INVALID_STATE','Parts do not match paid repair progress.');
  if(state.warningAt!==null){integer(state.warningAt,8,17,'warning time');if(state.watchMinutes<8)fail('INVALID_STATE','Warning lacks paid lookout.');}
  keys(state.stats,['requests','started','completed','interrupted'],'stats');
  for(const count of Object.values(state.stats))integer(count,0,1000000000,'counter');
  const events=[];let running=0,repairing=0;
  for(const actor of ids) {
    const snapshot=exportPerson(state.people[actor]),person=restorePerson(snapshot),view=getPersonView(person),job=state.jobs[actor];
    keys(snapshot.person.skills,['repair','watch'],'task skills');
    if(snapshot.person.observationBias!==0)fail('INVALID_STATE','Unexpected observation setup.');
    keys(job,['task','startedAt','endsAt','eventId','attemptId','startProgress'],'job');
    if(!tasks.includes(job.task)||actor==='watcher'&&job.task==='repair')fail('INVALID_STATE','Invalid assigned task.');
    integer(job.startedAt,0,state.clock.now,'job start');integer(job.endsAt,state.clock.now+1,WATCH_LIMITS.minutes+64,'job end');
    if(view.id!==actor||view.minutes!==state.clock.now||!view.pending||view.pending.id!==job.attemptId||view.pending.actionId!==job.task||
      view.pending.elapsedMinutes!==state.clock.now-job.startedAt||view.pending.durationMinutes!==job.endsAt-job.startedAt)fail('INVALID_STATE','Person and host job timing disagree.');
    const spec=action(job.task,job.startProgress??0);
    // The supported versioned snapshot is read only here to reconcile the full
    // execution contract; the perceived view intentionally omits effort/skill.
    if(!same(snapshot.person.pending.action,spec))fail('INVALID_STATE','Person and host task contract disagree.');
    if(view.pending.targetId!==spec.targetId||view.pending.activity!==spec.activity||view.pending.durationMinutes!==spec.durationMinutes)fail('INVALID_STATE','Person and host task disagree.');
    if(job.task==='repair'){
      integer(job.startProgress,0,11,'repair baseline');
      if(state.repairMinutes!==job.startProgress+view.pending.elapsedMinutes)fail('INVALID_STATE','Pending repair progress disagrees.');
      repairing++;
    } else if(job.startProgress!==null)fail('INVALID_STATE','Unexpected repair baseline.');
    if(job.task!=='idle')running++;
    events.push(dueRecord(actor,job));
  }
  if(repairing>1||state.parts.reserved!==(repairing?2-state.parts.spent:0))fail('INVALID_STATE','Invalid repair reservation.');
  if(state.stats.started!==state.stats.completed+state.stats.interrupted+running)fail('INVALID_STATE','Task receipts do not reconcile.');
  if(state.outcome===null) {
    if(state.clock.now>=18||typeof state.approachEventId!=='string')fail('INVALID_STATE','Missing arrival receipt.');
    events.push({id:state.approachEventId,at:18,type:'water-arrival',actorId:null,data:null});
  } else {
    keys(state.outcome,['at','repairMinutes','unrepairedMinutes','warningAvailable'],'arrival outcome');
    if(state.clock.now<18||state.approachEventId!==null||!same(state.outcome,{at:18,repairMinutes:state.repairMinutes,unrepairedMinutes:12-state.repairMinutes,warningAvailable:state.warningAt!==null&&state.warningAt<18}))fail('INVALID_STATE','Inconsistent arrival outcome.');
    if(ids.some(actor=>!['rest','idle'].includes(state.jobs[actor].task)))fail('INVALID_STATE','Productive work continued after the arrival.');
  }
  if(state.clock.queue.length!==events.length||events.some(event=>!state.clock.queue.some(queued=>same(event,queued))))fail('INVALID_STATE','Host jobs and clock queue disagree.');
  if(state.lastResponse!==null){
    const response=state.lastResponse;keys(response,['at','actor','task','accepted','code','reason'],'response');
    integer(response.at,0,state.clock.now,'response time');
    if(typeof response.actor!=='string'||response.actor.length>80||!['repair','watch','rest'].includes(response.task)||typeof response.accepted!=='boolean'||typeof response.code!=='string'||response.code.length>80||typeof response.reason!=='string'||response.reason.length>300)fail('INVALID_STATE','Invalid response.');
  }
  if(state.lastReceipt!==null){
    const receipt=state.lastReceipt;keys(receipt,['id','at','type','actorId','data'],'last receipt');keys(receipt.data,['attemptId','task'],'receipt data');
    integer(receipt.at,0,state.clock.now,'receipt time');
    if(receipt.type!=='attempt-due'||!ids.includes(receipt.actorId)||!['repair','watch','rest'].includes(receipt.data.task)||typeof receipt.id!=='string'||receipt.id.length>80||typeof receipt.data.attemptId!=='string'||receipt.data.attemptId.length>100)fail('INVALID_STATE','Invalid receipt record.');
  }
  if(!Array.isArray(state.recent)||state.recent.length>WATCH_LIMITS.recent)fail('INVALID_STATE','Too many recent messages.');
  let previous=0;
  for(const entry of state.recent){
    keys(entry,['at','actor','message'],'message');integer(entry.at,previous,state.clock.now,'message time');previous=entry.at;
    if(![...ids,'world'].includes(entry.actor)||typeof entry.message!=='string'||entry.message.length>300)fail('INVALID_STATE','Invalid recent message.');
  }
  return state;
}
export function exportWatch(state) {validate(state);return clone({format:'maintenance-watch',version:1,state});}
export function restoreWatch(snapshot) {
  simpleJSON(snapshot);keys(snapshot,['format','version','state'],'snapshot');
  if(snapshot.format!=='maintenance-watch'||snapshot.version!==1)fail('INVALID_STATE','Incompatible maintenance snapshot.');
  return clone(validate(snapshot.state));
}
