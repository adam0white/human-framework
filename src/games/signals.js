/** Last Light, a bounded host-owned delivery puzzle. The cognition candidate is private. */
import {RUNTIME_VERSION,HUMAN_VERSION,CLOCK_VERSION,createPerson,getPersonView,assessEffort,beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson,createClock,scheduleEvent,cancelEvent,advanceClock,exportClock,restoreClock} from '../runtime/index.js';
export const SIGNALS_VERSION='0.1.0';
export const SIGNALS_SITUATIONS=Object.freeze({turning:'Harbor I',falling:'Harbor II',steady:'Harbor III',shut:'Harbor IV',clear:'Clear connection',tired:'After the long shift',hungry:'Without lunch'});
export const SIGNALS_TASKS=Object.freeze({
 canal:{label:'Take the canal',duration:6,effort:.06,detail:'1 fare now. The landing must be open when you arrive. If closed, return with the lens after the full six minutes.'},
 ridge:{label:'Carry over the ridge',duration:14,effort:.22,detail:'No fare. More exertion, but the landing cannot block this route.'},
 lookout:{label:'Climb the lookout',duration:3,effort:.03,detail:'See the landing at completion. No radio charge; the view can change after you leave.'},
 radio:{label:'Call the landing keeper',duration:1,effort:0,detail:'1 charge on completion. The keeper observes then; the reply takes 5 more minutes to reach you.'},
 rest:{label:'Rest beside the lens',duration:4,effort:0,detail:'Four minutes of recovery. Replies can arrive while you rest.'},
 meal:{label:'Eat your meal',duration:3,effort:0,detail:'Uses the meal only when all three minutes are complete.'}
});
const DEADLINE=32,LAUNCH_DEADLINE=12,MAX_COMMANDS=192,MAX_SAVE=65536;
const timelines={turning:{initial:'closed',changes:[[4,'open'],[20,'closed']]},falling:{initial:'open',changes:[[4,'closed'],[20,'open']]},steady:{initial:'open',changes:[]},shut:{initial:'closed',changes:[]},clear:{initial:'open',changes:[]},tired:{initial:'open',changes:[]},hungry:{initial:'open',changes:[]}};
// Additive authored setups. Original situation defaults and replay fields stay unchanged.
const profiles={
 clear:{body:{fatigue:.2,hunger:.2},radioDelayMinutes:2,description:'A clear connection: the keeper’s reply takes 2 minutes after your 1-minute request. You begin rested and fed.'},
 tired:{body:{fatigue:.8,hunger:.2},radioDelayMinutes:5,description:'After a long shift, you feel very tired but have eaten. The heavier ridge may need paid rest; the canal is lighter. Radio replies take 5 minutes after the request.'},
 hungry:{body:{fatigue:.2,hunger:1},radioDelayMinutes:5,description:'You missed lunch and feel too hungry for carrying. Your meal is still in your bag. Rest reduces fatigue, but eating relieves hunger. Radio replies take 5 minutes after the request.'}
};
const copy=x=>structuredClone(x),fail=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
const canonical=x=>Array.isArray(x)?`[${x.map(canonical).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`:JSON.stringify(x);
const equal=(a,b)=>canonical(a)===canonical(b);
function int(x,min,max,label){if(!Number.isSafeInteger(x)||Object.is(x,-0)||x<min||x>max)fail('INVALID_COMMAND',`Invalid ${label}.`);}
function fields(x,names,label){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==names.length||names.some(k=>!Object.hasOwn(x,k)))fail('INVALID_SAVE',`Invalid ${label} fields.`);}
function json(x,depth=0,ancestors=new Set(),budget={nodes:0}){
 if(++budget.nodes>10000||depth>20)fail('INVALID_SAVE','Save exceeds structural limits.');
 if(x===null||typeof x==='boolean')return;
 if(typeof x==='string'){if(x.length>MAX_SAVE)fail('INVALID_SAVE','Save text too large.');return;}
 if(typeof x==='number'){if(!Number.isFinite(x)||Object.is(x,-0))fail('INVALID_SAVE','Invalid JSON number.');return;}
 if(!x||typeof x!=='object'||ancestors.has(x))fail('INVALID_SAVE','Save must be acyclic plain JSON.');
 const a=Array.isArray(x),p=Object.getPrototypeOf(x),keys=Reflect.ownKeys(x);
 if(a?p!==Array.prototype||keys.length!==x.length+1:![Object.prototype,null].includes(p))fail('INVALID_SAVE','Save must be plain JSON.');
 ancestors.add(x);for(const k of keys){if(a&&k==='length')continue;const d=Object.getOwnPropertyDescriptor(x,k);if(typeof k!=='string'||!d.enumerable||!Object.hasOwn(d,'value'))fail('INVALID_SAVE','Save cannot contain accessors or hidden properties.');json(d.value,depth+1,ancestors,budget);}ancestors.delete(x);
}
function check(s){
 json(s);if(JSON.stringify(s).length>MAX_SAVE)fail('INVALID_SAVE','Save too large.');
 fields(s,['version','situation','clock','person','job','landing','resources','spent','notebook','deliveries','inFlight','sequence','outcome','paid','failedCrossings','lastResponse','lastReceipt','recent','commands'],'host');
 if(s.version!==SIGNALS_VERSION||typeof s.situation!=='string'||!Object.hasOwn(timelines,s.situation))fail('INVALID_SAVE','Incompatible host.');
 restorePerson(exportPerson(s.person));restoreClock(exportClock(s.clock));
 if(s.person.minutes!==s.clock.now||!Array.isArray(s.commands)||s.commands.length>MAX_COMMANDS)fail('INVALID_SAVE','Host time or replay mismatch.');
}
function note(s,message){s.recent.push({at:s.clock.now,message});if(s.recent.length>8)s.recent.shift();}
function spec(task){const t=SIGNALS_TASKS[task];return {actionId:task,targetId:['canal','ridge'].includes(task)?'beacon':task==='radio'||task==='lookout'?'landing':null,durationMinutes:task==='idle'?DEADLINE:t.duration,effort:t?.effort??0,exertive:(t?.effort??0)>0,activity:task==='rest'?'rest':task==='meal'?'meal':'active',skill:task==='lookout'?'lookout':['canal','ridge'].includes(task)?'carry':null};}
function schedule(s,record){const out=scheduleEvent(s.clock,record);s.clock=out.clock;return out.eventId;}
function start(s,task){
 s.person=beginAttempt(s.person,spec(task));if(!s.person.pending.capacity.allowed)fail('CAPACITY','Insufficient actual capacity.');
 const endsAt=s.clock.now+spec(task).durationMinutes,attemptId=s.person.pending.id;
 const eventId=schedule(s,{at:endsAt,type:'attempt-due',actorId:'carrier',data:{attemptId,task}});
 s.job={task,startedAt:s.clock.now,endsAt,attemptId,eventId};
 if(task==='canal'){s.resources.fares--;s.spent.fares++;}
}
function stop(s,announce=false){
 const j=s.job;s.person=finishAttempt(s.person,{attemptId:j.attemptId,status:'interrupted'});s.clock=cancelEvent(s.clock,j.eventId);s.job=null;
 if(announce)note(s,`Stopped ${SIGNALS_TASKS[j.task].label.toLowerCase()} after ${s.clock.now-j.startedAt} paid minutes. No unfinished observation or delivery is granted${j.task==='canal'?'; the fare was already spent':''}.`);
}
function initial(situation){
 const s={version:SIGNALS_VERSION,situation,clock:createClock(),person:createPerson({id:'carrier',body:profiles[situation]?.body??{fatigue:.2,hunger:.2},skills:{carry:.15,lookout:.1}}),job:null,landing:timelines[situation].initial,resources:{fares:2,charges:3,meal:1},spent:{fares:0,charges:0,meal:0},notebook:null,deliveries:[],inFlight:[],sequence:0,outcome:null,paid:Object.fromEntries([...Object.keys(SIGNALS_TASKS),'idle'].map(k=>[k,0])),failedCrossings:0,lastResponse:null,lastReceipt:null,recent:[],commands:[]};
 schedule(s,{at:DEADLINE,type:'closing'});schedule(s,{at:LAUNCH_DEADLINE,type:'launch-closing'});
 for(const [at,value] of timelines[situation].changes)schedule(s,{at,type:'landing-change',data:{value}});
 start(s,'idle');note(s,'Deliver the lens before minute 32. The ridge is reliable; the canal needs an open landing at arrival. Choosing does not move time.');return s;
}
export function createSignals(input={}){
 json(input);fields(input,Object.keys(input).filter(k=>k==='situation'),'setup');const situation=input.situation??'turning';if(typeof situation!=='string'||!Object.hasOwn(timelines,situation))fail('INVALID_COMMAND','Unknown harbor situation.');return initial(situation);
}
/** Small task-keyed notebook rule: newest observed time, then newest receipt. */
export function retainReport(previous,incoming){return copy(!previous||incoming.observedAt>previous.observedAt||incoming.observedAt===previous.observedAt&&incoming.sequence>previous.sequence?incoming:previous);}
function deliver(s,{value,observedAt,source,channel}){
 const r={sequence:++s.sequence,observer:'carrier',source,channel,cue:'landing',value,observedAt,deliveredAt:s.clock.now};
 s.notebook=retainReport(s.notebook,r);s.deliveries.push(r);if(s.deliveries.length>8)s.deliveries.shift();
 note(s,`${source==='lookout'?'Your lookout':source==='canal-lock'?'At the canal lock':'Landing keeper reply'}: ${value}, observed at ${observedAt}; received at ${s.clock.now}${r.observedAt<s.notebook.observedAt?'. The notebook keeps your newer observation':''}.`);
}
function terminal(s,delivered,route){
 if(s.job)stop(s);for(const e of [...s.clock.queue])s.clock=cancelEvent(s.clock,e.id);s.inFlight=[];
 s.outcome={at:s.clock.now,delivered,route,launchSailed:delivered&&s.clock.now<LAUNCH_DEADLINE,failedCrossings:s.failedCrossings,faresRemaining:s.resources.fares,chargesRemaining:s.resources.charges,paidWorkMinutes:s.paid.canal+s.paid.ridge+s.paid.lookout+s.paid.radio};
 note(s,delivered?`The lens reached the beacon by the ${route} route at minute ${s.clock.now}.`:'The beacon closed at minute 32. The lens did not arrive in time.');
}
function due(s,event){
 if(event.type==='report-due'){
  const flight=s.inFlight.find(r=>r.eventId===event.id);
  if(!flight||!equal(event,{id:flight.eventId,at:flight.arrivesAt,type:'report-due',actorId:'carrier',data:{observedAt:flight.observedAt,value:flight.value}}))fail('STALE_RECEIPT','Reply does not match an outstanding paid request.');
  if(s.clock.now<flight.arrivesAt)fail('EARLY_RECEIPT','The reply has not arrived.');if(s.clock.now!==flight.arrivesAt)fail('STALE_RECEIPT','Reply missed its delivery boundary.');
  s.inFlight=s.inFlight.filter(r=>r!==flight);deliver(s,{...flight,source:'landing-keeper',channel:'radio'});s.lastReceipt=copy(event);return;
 }
 const j=s.job;
 if(!j||!equal(event,{id:j.eventId,at:j.endsAt,type:'attempt-due',actorId:'carrier',data:{attemptId:j.attemptId,task:j.task}}))fail('STALE_RECEIPT','Receipt does not match an active attempt.');
 if(s.clock.now<j.endsAt)fail('EARLY_RECEIPT','The attempt has not paid its full interval.');if(s.clock.now!==j.endsAt)fail('STALE_RECEIPT','Attempt missed its completion boundary.');
 const failed=j.task==='canal'&&s.landing==='closed';
 s.person=finishAttempt(s.person,{attemptId:j.attemptId,status:failed?'failed':'completed',mealConsumed:j.task==='meal'});s.job=null;
 if(j.task==='lookout')deliver(s,{value:s.landing,observedAt:s.clock.now,source:'lookout',channel:'direct'});
 if(j.task==='radio'){
  s.resources.charges--;s.spent.charges++;const r={observedAt:s.clock.now,value:s.landing,arrivesAt:s.clock.now+(profiles[s.situation]?.radioDelayMinutes??5)};
  r.eventId=schedule(s,{at:r.arrivesAt,type:'report-due',actorId:'carrier',data:{observedAt:r.observedAt,value:r.value}});s.inFlight.push(r);note(s,`Request sent. A reply will arrive at minute ${r.arrivesAt}, describing the keeper's observation now.`);
 }
 if(j.task==='meal'){s.resources.meal--;s.spent.meal++;}
 if(failed){s.failedCrossings++;deliver(s,{value:'closed',observedAt:s.clock.now,source:'canal-lock',channel:'direct'});note(s,'The landing was closed at arrival. You returned with the lens. Six minutes and one fare were spent.');}
 s.lastReceipt=copy(event);
 if(j.task==='ridge'||j.task==='canal'&&!failed){terminal(s,true,j.task);return;}
 start(s,'idle');
}
function reason(s,task,body=s.person.body){
 if(s.outcome)return ['ENDED','The episode has ended. Start fresh to try another route.'];
 // Leave room for advance, an optional stop, final advance, and terminal refusal.
 if(s.commands.length>=MAX_COMMANDS-4)return ['ACTION_BUDGET','No new actions remain in this journey. Advance time to finish the current action or reach closing; stopping active work is still available.'];
 if(s.job.task!=='idle')return ['BUSY','Finish or stop the current action first.'];
 if(task==='canal'&&!s.resources.fares)return ['NO_FARE','No fares remain. The ridge is still available.'];
 if(task==='radio'&&!s.resources.charges)return ['NO_CHARGE','No radio charges remain. The lookout is still available.'];
 if(task==='meal'&&!s.resources.meal)return ['NO_MEAL','The meal has been eaten.'];
 const capacity=assessEffort(body,spec(task));if(!capacity.allowed)return ['CAPACITY',`This whole action exceeds capacity (${capacity.causes.join(', ')}). Rest or eat before trying again.`];return null;
}
function record(s,command,deduplicate=false){
 const previous=s.commands.at(-1);
 if(command.type==='advance'&&previous?.type==='advance'){previous.to=command.to;return;}
 if(deduplicate&&previous?.type==='task'){s.commands[s.commands.length-1]=copy(command);return;}
 if(s.commands.length>=MAX_COMMANDS)fail('COMMAND_LIMIT','Replay command limit exceeded.');
 s.commands.push(copy(command));
}
function taskRaw(s,task,recording=true){
 if(typeof task!=='string'||!Object.hasOwn(SIGNALS_TASKS,task))fail('INVALID_COMMAND','Unknown action.');
 const rejected=reason(s,task),deduplicate=Boolean(rejected&&s.lastResponse?.accepted===false&&s.lastResponse.at===s.clock.now);
 if(rejected?.[0]==='ACTION_BUDGET')fail('COMMAND_LIMIT',rejected[1]);
 s.lastResponse={at:s.clock.now,task,accepted:!rejected,code:rejected?.[0]??'ACCEPTED',reason:rejected?.[1]??`${SIGNALS_TASKS[task].label}: ${SIGNALS_TASKS[task].duration} minutes. Advance time when ready.`};
 // Refusals do not add an unbounded activity transcript.
 if(!rejected){stop(s);start(s,task);note(s,s.lastResponse.reason);}
 if(recording)record(s,{type:'task',task},deduplicate);return s;
}
function stopRaw(s,recording=true){if(s.outcome||s.job.task==='idle')fail('NOT_WORKING','There is no active action to stop.');stop(s,true);start(s,'idle');if(recording)record(s,{type:'stop'});return s;}
function advanceRaw(s,target,recording=true){
 int(target,s.clock.now,1000000,'target time');if(s.outcome||target===s.clock.now)return s;
 while(s.clock.now<target&&!s.outcome){
  const step=advanceClock(s.clock,s.clock.now+1);s.person=advanceAttempt(s.person,step.clock.now-s.clock.now);s.paid[s.job.task]+=step.clock.now-s.clock.now;s.clock=step.clock;
  for(const e of step.events){if(s.outcome)break;if(e.type==='closing')terminal(s,false,'unfinished');else if(e.type==='launch-closing')note(s,'The evening launch stays in harbor. The overnight beacon still needs the lens before minute 32.');else if(e.type==='landing-change')s.landing=e.data.value;else due(s,e);}
 }
 if(recording)record(s,{type:'advance',to:s.clock.now});return s;
}
export function requestTask(input,task){check(input);return taskRaw(copy(input),task);}
export function interruptTask(input){check(input);return stopRaw(copy(input));}
export function advanceTo(input,target){check(input);return advanceRaw(copy(input),target);}
export function receiveReceipt(input,event){
 check(input);
 try{json(event);fields(event,['id','at','type','actorId','data'],'receipt');
  if(typeof event.id!=='string'||!/^event:[1-9]\d*$/.test(event.id)||!Number.isSafeInteger(event.at)||event.at<1||!['attempt-due','report-due'].includes(event.type)||event.actorId!=='carrier')throw new Error('Invalid receipt values.');
  fields(event.data,event.type==='report-due'?['observedAt','value']:['attemptId','task'],'receipt data');
 }catch{fail('INVALID_RECEIPT','Receipt must be a complete host event envelope.');}
 const s=copy(input);due(s,event);return s;
}
export function nextVisibleEvent(s){check(s);if(s.outcome)return s.clock.now;return Math.min(DEADLINE,s.clock.now<LAUNCH_DEADLINE?LAUNCH_DEADLINE:DEADLINE,s.job.task==='idle'?DEADLINE:s.job.endsAt,...s.inFlight.map(r=>r.arrivesAt));}
function reportView(r,now,latest){return {...copy(r),ageMinutes:now-r.observedAt,olderThanNotebook:r.observedAt<(latest?.observedAt??-1)};}
export function getSignalsView(s){
 check(s);const person=getPersonView(s.person),job=s.job&&s.job.task!=='idle'?{task:s.job.task,startedAt:s.job.startedAt,endsAt:s.job.endsAt}:null,profile=profiles[s.situation];
 const deliveries=s.deliveries.map(r=>reportView(r,s.clock.now,s.notebook)),report=s.notebook?reportView(s.notebook,s.clock.now,s.notebook):null;
 return copy({version:SIGNALS_VERSION,runtimeVersion:RUNTIME_VERSION,humanVersion:HUMAN_VERSION,clockVersion:CLOCK_VERSION,now:s.clock.now,deadline:DEADLINE,launchDeadline:LAUNCH_DEADLINE,person,job,resources:s.resources,spent:s.spent,paid:s.paid,report,currentReport:[...deliveries].reverse().find(r=>r.observedAt===s.clock.now)??null,deliveries,inFlight:s.inFlight.map(r=>({arrivesAt:r.arrivesAt})),failedCrossings:s.failedCrossings,outcome:s.outcome,lastResponse:s.lastResponse,recent:s.recent,
 ...(profile?{profile:{label:SIGNALS_SITUATIONS[s.situation],description:profile.description,radioDelayMinutes:profile.radioDelayMinutes,capacityLabel:'Capacity estimates use how you feel. Actual attempts check capacity.'}}:{}),
 choices:Object.entries(SIGNALS_TASKS).map(([task,t])=>{const refused=reason(s,task,person.body),choice={task,...t,available:!refused,code:refused?.[0]??null,reason:refused?.[1]??null,finishesAt:s.clock.now+t.duration,tooLate:s.clock.now+t.duration>=DEADLINE};
  if(profile){choice.capacityEstimate={allowed:assessEffort(person.body,spec(task)).allowed};
   if(task==='radio')choice.detail=`1 charge on completion. The keeper observes then; the reply takes ${profile.radioDelayMinutes} more minutes to reach you.`;
   if(refused?.[0]==='CAPACITY'){choice.available=true;choice.code='CAPACITY_ESTIMATE';choice.reason='Capacity estimate: recovery may be needed. You may try; the actual attempt checks capacity.';}
  }return choice;})});
}
export function exportSignals(s){check(s);const {commands,...state}=copy(s);return {format:'human-last-light',version:1,hostVersion:SIGNALS_VERSION,runtimeVersion:RUNTIME_VERSION,situation:s.situation,commands,state};}
export function restoreSignals(input){
 json(input);if(JSON.stringify(input).length>MAX_SAVE)fail('INVALID_SAVE','Save too large.');fields(input,['format','version','hostVersion','runtimeVersion','situation','commands','state'],'save');
 if(input.format!=='human-last-light'||input.version!==1||input.hostVersion!==SIGNALS_VERSION||input.runtimeVersion!==RUNTIME_VERSION||typeof input.situation!=='string'||!Object.hasOwn(timelines,input.situation)||!Array.isArray(input.commands)||input.commands.length>MAX_COMMANDS)fail('INVALID_SAVE','Incompatible or excessive replay.');
 const s=initial(input.situation);
 for(const c of input.commands){
  if(c?.type==='task'){fields(c,['type','task'],'task command');taskRaw(s,c.task);}
  else if(c?.type==='stop'){fields(c,['type'],'stop command');stopRaw(s);}
  else if(c?.type==='advance'){fields(c,['type','to'],'advance command');advanceRaw(s,c.to);}
  else fail('INVALID_SAVE','Unknown replay command.');
 }
 if(!equal(exportSignals(s),input))fail('INVALID_SAVE','Saved state does not match its deterministic replay.');return s;
}
