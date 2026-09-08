/** Actor-local first-hop factual host. No policy runs inside world transitions. */
import {createPerson,getPersonView,assessEffort,beginAttempt,advanceAttempt,finishAttempt,exportPerson,createClock,scheduleEvent,advanceClock,exportClock} from '../runtime/index.js';

export const ACROSS_CUT_VERSION='0.2.0';
export const ACTORS=Object.freeze(['keeper','receiver']);
const HORIZON=30, DECISIONS=128;
const TASKS=['availableRecovery','inspect','repair','release','attend','cart','travel','rest','meal','transmit'];
const RATES={availableRecovery:0,inspect:.003,repair:.012,release:.015,attend:.006,cart:.010,travel:.010,rest:0,meal:0,transmit:.003};
const clone=value=>structuredClone(value);
const other=a=>a==='keeper'?'receiver':'keeper';
const home=a=>a==='keeper'?'valve':'dock';
const coordinate=station=>station==='valve'?0:6;
const location=position=>position===0?'valve':position===6?'dock':'path';
function fail(code,message){throw Object.assign(new Error(message),{code});}
function actor(a){if(!ACTORS.includes(a))fail('INVALID_COMMAND','Unknown actor.');}
function integer(v,min,max,name){if(!Number.isSafeInteger(v)||Object.is(v,-0)||v<min||v>max)fail('INVALID_COMMAND',`Invalid ${name}.`);}
function fields(v,required,optional=[]){if(!v||Array.isArray(v)||typeof v!=='object')fail('INVALID_COMMAND','Expected an object.');if(Object.keys(v).some(k=>![...required,...optional].includes(k))||required.some(k=>!Object.hasOwn(v,k)))fail('INVALID_COMMAND','Unknown or missing field.');}
function json(v){
 let remaining=2000000;const ancestors=new Set();
 function visit(x,d){if(d>40||--remaining<0)fail('INVALID_COMMAND','JSON limits exceeded.');if(x===null||typeof x==='boolean')return;
  if(typeof x==='string'){remaining-=x.length;return;}
  if(typeof x==='number'){if(!Number.isFinite(x)||Object.is(x,-0))fail('INVALID_COMMAND','Expected finite JSON numbers.');return;}
  if(typeof x!=='object'||ancestors.has(x))fail('INVALID_COMMAND','Expected plain acyclic JSON.');
  const arr=Array.isArray(x);if(![arr?Array.prototype:Object.prototype,...(!arr?[null]:[])].includes(Object.getPrototypeOf(x)))fail('INVALID_COMMAND','Expected plain JSON objects.');
  const keys=Reflect.ownKeys(x);if(arr&&keys.length!==x.length+1)fail('INVALID_COMMAND','Expected dense JSON arrays.');ancestors.add(x);
  for(const k of keys){if(arr&&k==='length')continue;const desc=Object.getOwnPropertyDescriptor(x,k);if(typeof k!=='string'||!desc.enumerable||!Object.hasOwn(desc,'value')||arr&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=x.length))fail('INVALID_COMMAND','Invalid JSON property.');remaining-=k.length;visit(desc.value,d+1);}ancestors.delete(x);
 }visit(v,0);if(remaining<0)fail('INVALID_COMMAND','JSON limits exceeded.');
}
function stable(x){if(Array.isArray(x))return `[${x.map(stable).join(',')}]`;if(x&&typeof x==='object')return `{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${stable(x[k])}`).join(',')}}`;return JSON.stringify(x);}
const same=(a,b)=>stable(a)===stable(b);
function setup(options){
 json(options);fields(options,[],['valveMinutes','inletMinutes','launchAt','channelMode','channelSeed','channelOverrides','bodies']);
 const c={valveMinutes:6,inletMinutes:2,launchAt:27,channelMode:'reliable',channelSeed:0,channelOverrides:{},bodies:{keeper:{fatigue:.15,hunger:.15},receiver:{fatigue:.15,hunger:.15}},...clone(options)};
 if(![6,12].includes(c.valveMinutes)||![2,14].includes(c.inletMinutes)||![15,27].includes(c.launchAt)||!['reliable','bounded','lossy'].includes(c.channelMode))fail('INVALID_COMMAND','Invalid world configuration.');
 integer(c.channelSeed,0,2147483647,'channel seed');fields(c.channelOverrides,[],Object.keys(c.channelOverrides));
 for(const [key,v]of Object.entries(c.channelOverrides)){if(!/^(keeper|receiver):([1-9]|[12][0-9]|30)$/.test(key)||!((v===2)||(v===6&&c.channelMode!=='reliable')||(v==='loss'&&c.channelMode==='lossy')))fail('INVALID_COMMAND','Invalid exogenous channel slot.');}
 fields(c.bodies,[],ACTORS);for(const a of ACTORS){c.bodies[a]=c.bodies[a]??{fatigue:.15,hunger:.15};fields(c.bodies[a],['fatigue','hunger']);for(const n of Object.values(c.bodies[a]))if(typeof n!=='number'||n<0||n>1)fail('INVALID_COMMAND','Invalid starting body.');}
 return c;
}
function resource(n){return {available:n,reserved:0,consumed:0};}
function addObservation(s,a,o,via='local'){
 const x=s.actors[a];const record={receipt:x.nextReceipt++,cue:o.cue,value:clone(o.value),source:o.source,observedAt:o.observedAt,receivedAt:s.clock.now,via};x.notebook.push(record);return record;
}
function latestRecords(x){const map=new Map();for(const r of x.notebook){const key=`${r.source}/${r.cue}`,old=map.get(key);if(!old||r.observedAt>=old.observedAt)map.set(key,r);}return [...map.values()];}
function known(x,cue,source){return latestRecords(x).find(r=>r.cue===cue&&r.source===source)??null;}
function observeStation(s,a){
 const x=s.actors[a],station=location(x.position);if(station==='path')return;
 const observe=(cue,value)=>{const old=known(x,cue,station);if(!old||!same(old.value,value))addObservation(s,a,{cue,value,source:station,observedAt:s.clock.now});};
 if(station==='dock'){observe('launchAt',s.config.launchAt);observe('launchDeparted',s.service.departed);observe('serviceUnits',s.service.units);}
 observe(`repairProgress:${station}`,s.work[station]);
 observe(`peerPresent:${station}`,s.actors[other(a)]?.position===x.position);
}
function initial(config){
 const s={version:ACROSS_CUT_VERSION,config:clone(config),clock:createClock(),people:{},actors:{},work:{valve:0,dock:0},service:{units:0,departed:false,deliveries:[]},water:{pipeConsumed:0,cartConsumed:0,inTransit:0,lost:0,excess:0},transport:[],commands:[]};
 for(const a of ACTORS){s.people[a]=createPerson({id:a,body:config.bodies[a],skills:{repair:.2,carry:.2}});s.actors[a]={position:coordinate(home(a)),job:null,inventory:{fitting:{available:1,reserved:0,installed:0},water:resource(a==='keeper'?2:0),cartWater:resource(a==='receiver'?1:0),radio:resource(4),meal:resource(1)},notebook:[],inbox:[],sent:[],nextReceipt:1,nextMessage:1,decisions:0,paid:Object.fromEntries(TASKS.map(t=>[t,0])),lastResult:null};observeStation(s,a);}
 return s;
}
// Only this module's deeply frozen results bypass replay. Detached inputs must
// still prove their notebook origins and pending physical state by exact replay.
const trusted=new WeakSet();
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function publish(s){freeze(s);trusted.add(s);return s;}
export function create(options={}){return publish(initial(setup(options)));}
function check(s){
 if(trusted.has(s))return s;
 try{return restoreState({format:'human-across-cut',saveVersion:1,hostVersion:ACROSS_CUT_VERSION,state:s});}
 catch{fail('INVALID_STATE','Invalid Across Cut state.');}
}
function room(s,a){const x=s.actors[a];return {used:x.decisions,limit:DECISIONS,reserved:Number(Boolean(x.job))};}
function recordDecision(s,a,command){s.actors[a].decisions++;const b=room(s,a);if(b.used+b.reserved>b.limit)fail('COMMAND_LIMIT','Your remaining decision space is reserved for stopping work.');s.commands.push(clone(command));}
function local(s,a){const x=s.actors[a],station=location(x.position);return {station:station==='path'?null:station,repairMinutes:station==='path'?null:known(x,`repairMinutes:${station}`,station)?.value??null,repairProgress:station==='path'?null:known(x,`repairProgress:${station}`,station)?.value??null,launchAt:known(x,'launchAt','dock')?.value??null,launchDeparted:known(x,'launchDeparted','dock')?.value??null,serviceUnits:known(x,'serviceUnits','dock')?.value??null,peerPresent:station==='path'?null:known(x,`peerPresent:${station}`,station)?.value??false};}
function payload(s,a,message){
 fields(message,['kind','observationIds']);if(message.kind!=='report')fail('INVALID_COMMAND','Only factual reports may be transmitted.');
 if(!Array.isArray(message.observationIds)||!message.observationIds.length||message.observationIds.length>32||new Set(message.observationIds).size!==message.observationIds.length)fail('INVALID_COMMAND','Select one to 32 distinct local observations.');
 return {kind:'report',observations:message.observationIds.map(id=>{
  integer(id,1,10000,'observation receipt');const o=s.actors[a].notebook.find(o=>o.receipt===id);
  if(!o)fail('UNKNOWN_OBSERVATION','That observation has not been received.');
  if(o.via!=='local')fail('NOT_LOCAL_OBSERVATION','Only your own local observations can be reported.');
  const stationFact=['valve','dock'].includes(o.source)&&[`repairMinutes:${o.source}`,`repairProgress:${o.source}`].includes(o.cue);
  const dockFact=o.source==='dock'&&['launchAt','launchDeparted','serviceUnits'].includes(o.cue);
  const ownCartFact=a==='receiver'&&o.source==='cart'&&o.cue==='cartDelivery';
  if(!stationFact&&!dockFact&&!ownCartFact)fail('UNREPORTABLE_OBSERVATION','That observation is not an absolute reportable fact.');
  return clone(o);
 })};
}
function spec(task,duration){return {actionId:task,durationMinutes:duration,effort:RATES[task]*duration,exertive:RATES[task]>0,activity:['rest','availableRecovery'].includes(task)?'rest':task==='meal'?'meal':'active',skill:task==='repair'?'repair':['travel','cart'].includes(task)?'carry':null};}
function begin(s,a,task,duration,extra={}){
 const x=s.actors[a],action=spec(task,duration);if(!assessEffort(s.people[a].body,action).allowed)fail('CAPACITY','Your present body cannot sustain that entire requested interval.');
 s.people[a]=beginAttempt(s.people[a],action);x.job={task,startedAt:s.clock.now,endsAt:s.clock.now+duration,elapsed:0,...extra};
}
function reserve(x,name,n){if(x.inventory[name].available<n)fail('NO_SUPPLY','The required owned supply is unavailable.');x.inventory[name].available-=n;x.inventory[name].reserved+=n;}
function releaseReservation(x,name,n,consume=false){x.inventory[name].reserved-=n;x.inventory[name][consume?'consumed':'available']+=n;}
function requestRaw(s,a,input){
 actor(a);json(input);fields(input,['task'],['minutes','to','via','message']);const x=s.actors[a];if(s.clock.now===HORIZON)fail('ENDED','The public episode has ended.');
 if(x.job)fail('BUSY','Finish or stop your current work first.');
 let task=input.task,duration=0,extra={};const here=location(x.position),atHome=here===home(a);const needsHome=()=>{if(!atHome)fail('NOT_AT_STATION','This work requires your own station.');};
 if(task==='inspect'){fields(input,['task']);if(here==='path')fail('NOT_AT_STATION','Inspection requires a station.');duration=1;extra.station=here;}
 else if(task==='repair'){fields(input,['task'],['minutes']);needsHome();const knowledge=local(s,a);if(knowledge.repairMinutes===null)fail('INSPECTION_REQUIRED','Inspect your own repair first.');const remaining=knowledge.repairMinutes-knowledge.repairProgress;if(remaining<=0)fail('ALREADY_DONE','Your local repair is complete.');duration=input.minutes??remaining;integer(duration,1,remaining,'repair interval');extra.station=here;if(x.inventory.fitting.installed===0&&x.inventory.fitting.available!==1)fail('NO_SUPPLY','Your fitting is unavailable.');}
 else if(task==='release'){fields(input,['task']);needsHome();if(a!=='keeper')fail('WRONG_ROLE','Only the keeper operates the valve.');const k=local(s,a);if(k.repairMinutes===null||k.repairProgress!==k.repairMinutes)fail('NOT_READY','Your valve repair is not known complete.');duration=2;reserve(x,'water',2);}
 else if(task==='attend'){fields(input,['task','minutes']);needsHome();if(a!=='receiver')fail('WRONG_ROLE','Only the receiver attends the inlet.');duration=input.minutes;integer(duration,1,30,'attend interval');}
 else if(task==='cart'){fields(input,['task']);needsHome();if(a!=='receiver')fail('WRONG_ROLE','Only the receiver owns the fallback cart.');duration=10;reserve(x,'cartWater',1);extra.delivered=false;}
 else if(task==='travel'){fields(input,['task','to']);if(!['valve','dock'].includes(input.to))fail('INVALID_COMMAND','Unknown station.');duration=Math.abs(coordinate(input.to)-x.position);if(!duration)fail('ALREADY_THERE','You are already at that station.');extra={to:input.to,fromPosition:x.position};}
 else if(task==='rest'){fields(input,['task','minutes']);duration=input.minutes;integer(duration,1,30,'rest interval');}
 else if(task==='meal'){fields(input,['task']);duration=2;reserve(x,'meal',1);}
 else if(task==='transmit'){fields(input,['task','message'],['via']);extra.message=payload(s,a,input.message);duration=1;}
 else fail('INVALID_COMMAND','Unknown task.');
 if(task==='transmit'){extra.via=input.via??'radio';if(!['radio','contact'].includes(extra.via))fail('INVALID_COMMAND','Unknown message channel.');if(extra.via==='radio')reserve(x,'radio',1);else if(here==='path'||s.actors[other(a)].position!==x.position)fail('NO_CONTACT','The other actor is not present at your station.');extra.contactPosition=x.position;}
 begin(s,a,task,duration,extra);x.lastResult={at:s.clock.now,task:input.task,code:'STARTED'};recordDecision(s,a,{type:'request',actorId:a,action:input});return s;
}
export function request(state,actorId,action){return publish(requestRaw(clone(check(state)),actorId,action));}
function stop(s,a){
 const x=s.actors[a],j=x.job;if(!j)return;
 s.people[a]=finishAttempt(s.people[a],{attemptId:s.people[a].pending.id,status:'interrupted'});
 if(j.task==='release')releaseReservation(x,'water',2);
 if(j.task==='cart'&&!j.delivered)releaseReservation(x,'cartWater',1);
 if(j.task==='meal')releaseReservation(x,'meal',1);
 if(j.task==='transmit'&&j.via==='radio')releaseReservation(x,'radio',1);
 x.job=null;x.lastResult={at:s.clock.now,task:j.task,code:'STOPPED',paidMinutes:j.elapsed};
}
function interruptRaw(s,a){actor(a);if(!s.actors[a].job)fail('NOT_WORKING','You have no active work to stop.');stop(s,a);recordDecision(s,a,{type:'interrupt',actorId:a});return s;}
export function interrupt(state,actorId){return publish(interruptRaw(clone(check(state)),actorId));}
function schedule(s,event){s.clock=scheduleEvent(s.clock,event).clock;}
function channelDelay(s,a,time){const key=`${a}:${time}`;if(Object.hasOwn(s.config.channelOverrides,key))return s.config.channelOverrides[key];if(s.config.channelMode==='reliable')return 2;
 const hash=((Math.imul(s.config.channelSeed+1,1103515245)>>>0)+Math.imul(time,2654435761)+(a==='keeper'?101:997))>>>0;
 return (s.config.channelMode==='bounded'?[2,6]:[2,6,'loss'])[hash%(s.config.channelMode==='bounded'?2:3)];
}
function deliverMessage(s,envelope){
 const x=s.actors[envelope.recipient],receipt=x.nextReceipt++;const incoming={...clone(envelope),receivedAt:s.clock.now,receipt};x.inbox.push(incoming);
 const m=envelope.message;
 if(m.kind==='report')for(const o of m.observations)addObservation(s,envelope.recipient,o,envelope.via);
 const trace=s.transport.find(t=>t.sender===envelope.sender&&t.messageId===envelope.messageId);if(trace)trace.deliveredAt=s.clock.now;
}
function transmit(s,a,j){
 const x=s.actors[a],envelope={messageId:`${a}:m${x.nextMessage++}`,sender:a,recipient:other(a),sentAt:s.clock.now,via:j.via,message:clone(j.message)};x.sent.push(envelope);
 if(j.via==='radio'){
  releaseReservation(x,'radio',1,true);const delay=channelDelay(s,a,s.clock.now);s.transport.push({...clone(envelope),delay,deliveredAt:null});if(delay!=='loss')schedule(s,{at:s.clock.now+delay,type:'message',actorId:other(a),data:envelope});
 }else{
  const reachable=x.position===j.contactPosition&&s.actors[other(a)].position===x.position&&location(x.position)!=='path';s.transport.push({...clone(envelope),delay:reachable?0:'contact-missed',deliveredAt:null});if(reachable)deliverMessage(s,envelope);
 }
}
function waterDelivery(s,route,units){
 const canReceive=!s.service.departed&&(route==='cart'||s.work.dock===s.config.inletMinutes&&s._attending);
 let delivered=0,lost=0,excess=0;
 if(canReceive){delivered=Math.min(units,2-s.service.units);excess=units-delivered;s.service.units+=delivered;}else lost=units;
 s.water.lost+=lost;s.water.excess+=excess;s.service.deliveries.push({at:s.clock.now,route,units,delivered,lost,excess});
}
function complete(s,a){
 const x=s.actors[a],j=x.job;if(!j)return;
 s.people[a]=finishAttempt(s.people[a],{attemptId:s.people[a].pending.id,status:'completed',mealConsumed:j.task==='meal'});
 if(j.task==='inspect')addObservation(s,a,{cue:`repairMinutes:${j.station}`,value:j.station==='valve'?s.config.valveMinutes:s.config.inletMinutes,source:j.station,observedAt:s.clock.now});
 if(j.task==='release'){releaseReservation(x,'water',2,true);s.water.pipeConsumed+=2;s.water.inTransit+=2;schedule(s,{at:s.clock.now+3,type:'water',data:{units:2}});}
 if(j.task==='meal')releaseReservation(x,'meal',1,true);
 if(j.task==='transmit')transmit(s,a,j);
 x.lastResult={at:s.clock.now,task:j.task,code:'COMPLETED',paidMinutes:j.elapsed};x.job=null;
}
function payMinute(s,a){
 const x=s.actors[a],j=x.job;
 if(j){s.people[a]=advanceAttempt(s.people[a],1);j.elapsed++;x.paid[j.task]++;
  if(j.task==='repair'){if(!x.inventory.fitting.installed){x.inventory.fitting.available--;x.inventory.fitting.installed++;}s.work[j.station]++;}
  if(j.task==='travel')x.position=j.fromPosition+Math.sign(coordinate(j.to)-j.fromPosition)*j.elapsed;
  if(j.task==='cart')x.position=j.elapsed<=5?6+j.elapsed:16-j.elapsed;
 }else{s.people[a]=beginAttempt(s.people[a],spec('availableRecovery',1));s.people[a]=advanceAttempt(s.people[a],1);s.people[a]=finishAttempt(s.people[a],{attemptId:s.people[a].pending.id,status:'completed'});x.paid.availableRecovery++;}
}
function tick(s){
 const prior=Object.fromEntries(ACTORS.map(a=>[a,clone(s.actors[a].job)]));
 for(const a of ACTORS)payMinute(s,a);
 const moved=advanceClock(s.clock,s.clock.now+1);s.clock=moved.clock;
 s._attending=Boolean(prior.receiver?.task==='attend'&&s.actors.receiver.position===6);
 for(const a of ACTORS){const x=s.actors[a],j=x.job;if(j?.task==='cart'&&j.elapsed===5){j.delivered=true;releaseReservation(x,'cartWater',1,true);s.water.cartConsumed++;waterDelivery(s,'cart',1);addObservation(s,a,{cue:'cartDelivery',value:s.service.deliveries.at(-1),source:'cart',observedAt:s.clock.now});}if(j&&j.endsAt===s.clock.now)complete(s,a);}
 for(const e of moved.events)if(e.type==='water'){s.water.inTransit-=e.data.units;waterDelivery(s,'pipe',e.data.units);}
 for(const e of moved.events)if(e.type==='message')deliverMessage(s,e.data);
 if(s.clock.now===s.config.launchAt)s.service.departed=true;
 for(const a of ACTORS)observeStation(s,a);
 if(s.clock.now===HORIZON)for(const a of ACTORS)stop(s,a);
 delete s._attending;
}
function advanceRaw(s,target,options={}){
 json(options);fields(options,[],['actorId','stopOnReceipt']);integer(target,s.clock.now,1000000,'target time');if(Object.hasOwn(options,'actorId'))actor(options.actorId);if(Object.hasOwn(options,'stopOnReceipt')&&typeof options.stopOnReceipt!=='boolean')fail('INVALID_COMMAND','Invalid local stop option.');if(options.stopOnReceipt&&!options.actorId)fail('INVALID_COMMAND','A local receipt stop needs an actor.');
 const targetAt=Math.min(target,HORIZON),start=s.clock.now,receipt=options.actorId?s.actors[options.actorId].nextReceipt:null;
 while(s.clock.now<targetAt){tick(s);if(options.stopOnReceipt&&s.actors[options.actorId].nextReceipt!==receipt)break;}
 if(s.clock.now>start){const command={type:'advance',to:s.clock.now,options:clone(options)};const last=s.commands.at(-1);if(last?.type==='advance'&&!options.stopOnReceipt&&same(last.options,command.options))last.to=command.to;else s.commands.push(command);}
 return s;
}
export function advance(state,target,options={}){return publish(advanceRaw(clone(check(state)),target,options));}
export function getKnownLocalBoundary(s,a){s=check(s);actor(a);const x=s.actors[a],candidates=[{at:HORIZON,kind:'horizon'}];if(x.job)candidates.push({at:x.job.endsAt,kind:'own-work'});const launch=known(x,'launchAt','dock')?.value;if(launch>s.clock.now)candidates.push({at:launch,kind:'known-launch'});return clone(candidates.sort((x,y)=>x.at-y.at)[0]);}
export function getActorView(s,a){
 s=check(s);actor(a);const x=s.actors[a];return clone({actorId:a,now:s.clock.now,horizon:HORIZON,ended:s.clock.now===HORIZON,channel:{mode:s.config.channelMode,minDelay:2,maxDelay:s.config.channelMode==='reliable'?2:6,lossPossible:s.config.channelMode==='lossy'},body:getPersonView(s.people[a]),position:x.position,location:location(x.position),inventory:x.inventory,job:x.job,local:local(s,a),notebook:x.notebook,latest:latestRecords(x),inbox:x.inbox,sent:x.sent,paid:x.paid,lastResult:x.lastResult,budget:room(s,a),nextBoundary:getKnownLocalBoundary(s,a)});
}
export function getWorldSummary(s){
 s=check(s);const ownWater=ACTORS.reduce((sum,a)=>sum+s.actors[a].inventory.water.available+s.actors[a].inventory.water.reserved+s.actors[a].inventory.cartWater.available+s.actors[a].inventory.cartWater.reserved,0);
 return clone({researcherOnly:true,now:s.clock.now,ended:s.clock.now===HORIZON,config:s.config,work:s.work,service:s.service,water:{...s.water,owned:ownWater,conservedTotal:ownWater+s.water.inTransit+s.service.units+s.water.lost+s.water.excess},actors:Object.fromEntries(ACTORS.map(a=>[a,{body:s.people[a].body,position:s.actors[a].position,inventory:s.actors[a].inventory,paid:s.actors[a].paid}])),transport:s.transport,journalEntries:s.commands.length});
}
export function exportState(s){s=check(s);json(s);for(const a of ACTORS)exportPerson(s.people[a]);exportClock(s.clock);return clone({format:'human-across-cut',saveVersion:1,hostVersion:ACROSS_CUT_VERSION,state:s});}
export function restoreState(snapshot){
 try{
  json(snapshot);fields(snapshot,['format','saveVersion','hostVersion','state']);if(snapshot.format!=='human-across-cut'||snapshot.saveVersion!==1||snapshot.hostVersion!==ACROSS_CUT_VERSION)throw new Error('version');
  const saved=snapshot.state;if(!Array.isArray(saved.commands)||saved.commands.length>286)throw new Error('journal');let replay=initial(setup(saved.config));
  for(const c of saved.commands){if(c.type==='request'){fields(c,['type','actorId','action']);replay=requestRaw(replay,c.actorId,c.action);}else if(c.type==='interrupt'){fields(c,['type','actorId']);replay=interruptRaw(replay,c.actorId);}else if(c.type==='advance'){fields(c,['type','to','options']);replay=advanceRaw(replay,c.to,c.options);}else throw new Error('command');}
  if(!same(saved,replay))throw new Error('mismatch');return publish(replay);
 }catch{fail('INVALID_SAVE','The save does not match strict deterministic replay.');}
}
