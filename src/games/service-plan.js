/** Shared Promise: direct, paid clinic agreements over the preserved Service Day physical model. */
import {RUNTIME_VERSION,HUMAN_VERSION,CLOCK_VERSION,PARAMETERS,createPerson,getPersonView,assessEffort,beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson,createClock,scheduleEvent,cancelEvent,advanceClock,exportClock,restoreClock} from '../runtime/index.js';
export const SERVICE_PLAN_VERSION='0.1.0';
export const SERVICE_SCENARIOS=Object.freeze({standard:'One service day'});
export const SERVICE_TASKS=Object.freeze({
 gate:{label:'Repair an inlet gate section',duration:6,effort:.16,detail:'One owned part per new section. Two sections preserve morning water; later repairs can still restore clinic supply.'},
 divert:{label:'Divert the morning surge',duration:6,effort:.09,detail:'One owned part. Protects the inlet but forfeits morning water; reopen after the surge for clinic supply.'},
 reopen:{label:'Reopen the inlet supply',duration:3,effort:.03,detail:'After the surge, reconnect a finished diversion to supply the clinic.'},
 pump:{label:'Repair a clinic pump section',duration:6,effort:.16,detail:'One owned part per new section. Both sections and a flowing inlet are needed for full delivery.'},
 deliver:{label:'Deliver both clinic water units',duration:6,effort:.08,detail:'Requires a repaired pump and inlet supply. All six paid minutes must finish before minute 64.'},
 cart:{label:'Carry one unit by cart',duration:18,effort:.22,detail:'The clinic can receive one load today. This fallback uses that slot for one of two requested units, independent of pump parts or inlet supply.'},
 share:{label:'Hand over one owned part',duration:2,effort:0,detail:'Transfers your reserved part to the other person only after two paid minutes.'},
 salvage:{label:'Fetch the shed spare',duration:8,effort:.04,detail:'The shed holds one part for the entire day. Eight paid minutes make it yours.'},
 rest:{label:'Rest',duration:6,effort:0,detail:'Six minutes of recovery. Stop early to keep only the recovery actually paid for.'},
 meal:{label:'Eat your meal',duration:4,effort:0,detail:'Four paid minutes. Your own meal relieves hunger once, at completion.'}
});
const DISCUSSION={label:'Discuss clinic terms',duration:2,effort:0};
const actors=['keeper','partner'],taskIds=[...Object.keys(SERVICE_TASKS),'idle','discuss'],MORNING=24,CLOSING=64,MAX_COMMANDS=256,MAX_SAVE=65536;
const copy=x=>structuredClone(x),other=a=>a==='keeper'?'partner':'keeper';
const fail=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
const canonical=x=>Array.isArray(x)?`[${x.map(canonical).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`:JSON.stringify(x);
const equal=(a,b)=>canonical(a)===canonical(b);
function int(x,min,max,label){if(!Number.isSafeInteger(x)||Object.is(x,-0)||x<min||x>max)fail('INVALID_SAVE',`Invalid ${label}.`);}
function fields(x,names,label){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==names.length||names.some(k=>!Object.hasOwn(x,k)))fail('INVALID_SAVE',`Invalid ${label} fields.`);}
function json(x,depth=0,ancestors=new Set(),budget={nodes:0}){
 if(++budget.nodes>12000||depth>20)fail('INVALID_SAVE','Save exceeds structural limits.');
 if(x===null||typeof x==='boolean')return;
 if(typeof x==='string'){if(x.length>MAX_SAVE)fail('INVALID_SAVE','Save text too large.');return;}
 if(typeof x==='number'){if(!Number.isFinite(x)||Object.is(x,-0))fail('INVALID_SAVE','Invalid JSON number.');return;}
 if(!x||typeof x!=='object'||ancestors.has(x))fail('INVALID_SAVE','Save must be acyclic plain JSON.');
 const a=Array.isArray(x),p=Object.getPrototypeOf(x),keys=Reflect.ownKeys(x);
 if(a?p!==Array.prototype||keys.length!==x.length+1:![Object.prototype,null].includes(p))fail('INVALID_SAVE','Save must be plain JSON.');
 ancestors.add(x);for(const k of keys){if(a&&k==='length')continue;const d=Object.getOwnPropertyDescriptor(x,k);if(typeof k!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||a&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=x.length))fail('INVALID_SAVE','Save cannot contain accessors, hidden properties or array holes.');json(d.value,depth+1,ancestors,budget);}ancestors.delete(x);
}
const installed=s=>Math.ceil(s.work.gate/6)+Math.ceil(s.work.divert/6)+Math.ceil(s.work.pump/6);
const supply=s=>s.work.gate===12||s.morning?.route==='diversion'&&s.reopenedAt!==null;
function spec(s,task){const t=task==='discuss'?DISCUSSION:SERVICE_TASKS[task];let duration=t?.duration??CLOSING;if(task==='gate'||task==='pump')duration=6-s.work[task]%6;if(task==='divert')duration=6-s.work.divert||6;const effort=(t?.effort??0)*duration/(t?.duration??CLOSING);return {actionId:task,targetId:['gate','divert','reopen'].includes(task)?'inlet':['pump','deliver','cart'].includes(task)?'clinic':task==='salvage'?'shed':null,durationMinutes:duration,effort,exertive:effort>0,activity:task==='rest'?'rest':task==='meal'?'meal':'active',skill:['gate','pump'].includes(task)?'repair':['deliver','cart'].includes(task)?'carry':null};}
function partCost(s,task){return ['gate','pump','divert'].includes(task)?s.work[task]%6===0?1:0:task==='share'?1:0;}
function note(s,actor,message){s.recent.push({at:s.clock.now,actor,message});if(s.recent.length>12)s.recent.shift();}
function schedule(s,event){const next=scheduleEvent(s.clock,event);s.clock=next.clock;return next.eventId;}
const envelope=(a,j)=>({id:j.eventId,at:j.endsAt,type:'attempt-due',actorId:a,data:{attemptId:j.attemptId,task:j.task}});
function start(s,a,task,origin='request'){
 const action=spec(s,task);s.people[a]=beginAttempt(s.people[a],action);if(!s.people[a].pending.capacity.allowed)fail('CAPACITY','Insufficient actual capacity for accepted work.');
 const attemptId=s.people[a].pending.id,endsAt=s.clock.now+action.durationMinutes,eventId=schedule(s,{at:endsAt,type:'attempt-due',actorId:a,data:{attemptId,task}}),reservedParts=partCost(s,task),reservedMeal=task==='meal'?1:0;
 s.parts[a]-=reservedParts;s.food[a]-=reservedMeal;
 if(['deliver','cart'].includes(task)){if(s.coordination.slot)fail('CLINIC_SLOT_USED','The clinic receiving slot is already committed.');s.coordination.slot={actor:a,route:task,departedAt:s.clock.now,arrivedAt:null,status:'in-transit'};}
s.jobs[a]={task,origin,startedAt:s.clock.now,endsAt,eventId,attemptId,startProgress:Object.hasOwn(s.work,task)?s.work[task]:null,reservedParts,reservedMeal};
}
function stop(s,a,announce=false){const j=s.jobs[a];if(!j)return;s.people[a]=finishAttempt(s.people[a],{attemptId:j.attemptId,status:'interrupted'});s.clock=cancelEvent(s.clock,j.eventId);s.parts[a]+=j.reservedParts;s.food[a]+=j.reservedMeal;s.jobs[a]=null;if(['deliver','cart'].includes(j.task)&&s.coordination.slot?.status==='in-transit')s.coordination.slot.status=s.clock.now===CLOSING?'closed':'abandoned';if(announce)note(s,a,`Stopped ${(j.task==='discuss'?DISCUSSION:SERVICE_TASKS[j.task]).label.toLowerCase()} after ${s.clock.now-j.startedAt} paid minutes. Installed work remains; unused supplies return.`);}
function initial(scenario){
 const s={version:SERVICE_PLAN_VERSION,scenario,clock:createClock(),people:{},jobs:{},parts:{keeper:2,partner:1},food:{keeper:1,partner:1},eaten:{keeper:0,partner:0},work:{gate:0,divert:0,pump:0},salvaged:0,reopenedAt:null,morning:null,delivery:null,outcome:null,paid:Object.fromEntries(taskIds.map(t=>[t,0])),paidByActor:Object.fromEntries(actors.map(a=>[a,Object.fromEntries(taskIds.map(t=>[t,0]))])),installedPartsByActor:{keeper:0,partner:0},handedOver:{keeper:0,partner:0},coordination:{readyAt:null,nextId:1,current:null,pending:null,lastResponse:null,slot:null},lastResponse:null,lastReceipt:null,recent:[],commands:[]};
 schedule(s,{at:MORNING,type:'morning'});schedule(s,{at:CLOSING,type:'closing'});
 for(const a of actors){s.people[a]=createPerson({id:a,body:{fatigue:a==='keeper'?.5:.25,hunger:a==='keeper'?.86:.78},skills:{repair:.2,carry:.1}});start(s,a,'idle','own');}
 note(s,'world','Serve the inlet at minute 24, then the clinic at minute 64. The same people, parts, meals and unfinished repairs carry through the day.');return s;
}
export function createServicePlan(input={}){json(input);fields(input,Object.hasOwn(input,'scenario')?['scenario']:[],'setup');const scenario=input.scenario??'standard';if(typeof scenario!=='string'||!Object.hasOwn(SERVICE_SCENARIOS,scenario))fail('INVALID_COMMAND','Unknown service day.');return initial(scenario);}
function refusal(s,a,task,condition=s.people[a]?.body){
 if(!actors.includes(a))return ['NOT_PRESENT','No such person is here.'];
 if(s.outcome)return ['ENDED','The service day is over. Start another day to try a different approach.'];
 if(s.jobs[a].task!=='idle')return ['BUSY','I am already working. Finish or request a stop before choosing another job.'];
 if(['gate','pump'].includes(task)&&s.work[task]===12||task==='divert'&&s.work.divert===6||task==='salvage'&&s.salvaged||task==='reopen'&&s.reopenedAt!==null)return ['ALREADY_DONE','That work is complete.'];
 if(['pump','deliver','cart','reopen'].includes(task)&&s.clock.now<MORNING)return ['NOT_OPEN','Clinic work and reopening begin after the morning surge at minute 24.'];
 if(task==='divert'&&s.clock.now>=MORNING)return ['SURGE_PASSED','The morning surge has already arrived. Finish the gate to restore later supply.'];
 if(task==='divert'&&s.work.gate===12)return ['GATE_READY','The repaired gate already protects the inlet and keeps its supply.'];
 if(task==='reopen'&&s.morning?.route!=='diversion')return ['NO_DIVERSION','Only a completed diversion needs reopening after the surge.'];
 if(['deliver','cart'].includes(task)&&s.coordination.slot)return ['CLINIC_SLOT_USED','Today’s single clinic receiving slot was committed at departure; stopping or renegotiating cannot reclaim it.'];
 if(['deliver','cart'].includes(task)&&s.delivery)return ['ALREADY_DELIVERED','The clinic has already received today’s delivery.'];
 if(task==='deliver'&&s.work.pump!==12)return ['PUMP_UNFINISHED','Both pump sections must be repaired before full delivery.'];
 if(task==='deliver'&&!supply(s))return ['NO_SUPPLY','Finish the inlet gate or reopen the completed diversion before full delivery.'];
 if(['gate','divert','reopen','pump','deliver','cart','salvage'].includes(task)&&actors.some(id=>s.jobs[id]?.task===task||['deliver','cart'].includes(task)&&['deliver','cart'].includes(s.jobs[id]?.task)))return ['TARGET_BUSY','The other person already has this work reserved. Choose another job alongside them.'];
 const cost=partCost(s,task);
 if(a==='partner'&&['gate','divert','share'].includes(task)&&s.work.pump<6&&s.parts[a]-cost<1)return ['CLINIC_RESERVE','I am keeping my last part for the clinic pump. I can help without spending it, or share a spare above that reserve.'];
 if(s.parts[a]<cost)return ['MISSING_PARTS',`I need ${cost} available part of my own. A paid handover or the shed spare can supply it.`];
 if(task==='meal'&&!s.food[a])return ['NO_MEAL','My one meal has already been eaten or reserved.'];
 const capacity=assessEffort(condition,spec(s,task));if(!capacity.allowed)return ['CAPACITY',`I cannot sustain this whole job because of ${capacity.causes.join(' and ')}. Paid rest or a meal may help.`];return null;
}
function ownChoice(s){
 const j=s.jobs.partner;if(s.outcome)return {task:null,reason:'The clinic intake has closed.',at:s.clock.now};
 if(j.task!=='idle')return {task:j.task,reason:j.origin==='own'?'I chose this work for my clinic commitment. I will finish it before accepting a different request.':'I agreed to this request and am paying its time.',at:j.endsAt};
 const plan=s.coordination.current;
 if(plan?.status==='active'){
  if(ready(s)&&s.clock.now<=57&&!refusal(s,'partner','deliver'))return {task:'deliver',reason:'The agreed pump and inlet are actually ready. I will deliver both units now.',at:s.clock.now};
  if(s.clock.now<plan.terms.waitUntil){const recovery=s.people.partner.body.hunger>=.82&&s.food.partner?'meal':s.people.partner.body.fatigue>=.55?'rest':null;if(recovery&&s.clock.now+spec(s,recovery).durationMinutes<=plan.terms.waitUntil&&!refusal(s,'partner',recovery))return {task:recovery,reason:'I can pay for recovery within the agreed waiting window.',at:s.clock.now};return {task:null,reason:`I agreed to wait for actual readiness through minute ${plan.terms.waitUntil}. ${plan.terms.fallback==='cart'?'The one-unit cart remains my fallback.':'This gives up the safe cart window.'}`,at:plan.terms.waitUntil};}
  if(plan.terms.fallback==='cart'&&s.clock.now<=45&&!refusal(s,'partner','cart'))return {task:'cart',reason:'The agreed readiness is missing. I will use the retained one-unit cart fallback.',at:s.clock.now};
 }
 const p=s.people.partner;
 if(p.body.hunger>=.82&&s.food.partner)return {task:'meal',reason:'I prefer to eat now before the later clinic work.',at:s.clock.now};
 if(p.body.fatigue>=.55)return {task:'rest',reason:'I am recovering before taking more clinic work.',at:s.clock.now};
 if(s.clock.now<MORNING)return {task:null,reason:'I am keeping one part for the clinic. I will begin pump work after the surge; compatible requests are welcome.',at:Math.min(MORNING,s.clock.now+Math.max(1,Math.ceil((.82-p.body.hunger-1e-10)/PARAMETERS.hungerPerMinute)))};
 if(s.delivery)return {task:null,reason:'The clinic delivery is complete. I am available for compatible requests.',at:CLOSING};
 for(const task of ['deliver','pump'])if(!(task==='deliver'&&s.clock.now>57)&&!refusal(s,'partner',task))return {task,reason:task==='pump'?'I will use my own part to repair the clinic pump.':'The pump and supply are ready; I will make the full clinic delivery.',at:s.clock.now};
 if(s.clock.now>=42&&s.clock.now<=45&&!refusal(s,'partner','cart'))return {task:'cart',reason:'Full delivery is not ready. I will use the remaining window to carry one clinic unit by cart.',at:s.clock.now};
 return {task:null,reason:'I need a completed pump, inlet supply or an owned spare. At minute 42 I will take the cart fallback if full delivery is still unavailable.',at:s.clock.now<42?42:CLOSING};
}
function auto(s){
 if(s.outcome)return;
 const plan=s.coordination.current;
 if(s.jobs.partner.task!=='idle'){if(plan?.status==='active'&&s.clock.now>=plan.terms.waitUntil){plan.status='expired';plan.closedAt=s.clock.now;plan.closeReason='BUSY_AT_EXPIRY';}return;}
 const decision=ownChoice(s);
 if(decision.task&&!refusal(s,'partner',decision.task)){stop(s,'partner');start(s,'partner',decision.task,'own');note(s,'partner',decision.reason);if(plan?.status==='active'&&['deliver','cart'].includes(decision.task)){plan.status=decision.task==='deliver'?'delivering':'expired';plan.closedAt=s.clock.now;plan.closeReason=decision.task==='deliver'?'FULL_DEPARTURE':'FALLBACK_DEPARTURE';}}
 if(plan?.status==='active'&&s.clock.now>=plan.terms.waitUntil){plan.status='expired';plan.closedAt=s.clock.now;plan.closeReason='WAIT_EXPIRED';}
}
function settle(s,e){
 const a=e?.actorId,j=s.jobs[a];if(!j||!equal(e,envelope(a,j)))fail('STALE_RECEIPT','Receipt does not match current owned work.');if(s.clock.now<j.endsAt)fail('EARLY_RECEIPT','The work has not paid its full interval.');if(s.clock.now!==j.endsAt)fail('STALE_RECEIPT','Receipt missed its completion boundary.');
 s.people[a]=finishAttempt(s.people[a],{attemptId:j.attemptId,status:'completed',mealConsumed:j.task==='meal'});s.jobs[a]=null;
 if(j.task==='share'){s.parts[other(a)]+=j.reservedParts;s.handedOver[a]++;}
 if(j.task==='salvage'){s.salvaged=1;s.parts[a]++;}
 if(j.task==='meal')s.eaten[a]++;
 if(j.task==='reopen')s.reopenedAt=s.clock.now;
 if(['deliver','cart'].includes(j.task)){s.delivery={at:s.clock.now,route:j.task,units:j.task==='deliver'?2:1};s.coordination.slot.status='delivered';s.coordination.slot.arrivedAt=s.clock.now;if(j.task==='deliver'&&s.coordination.current?.status==='delivering'){s.coordination.current.status='fulfilled';s.coordination.current.closedAt=s.clock.now;s.coordination.current.closeReason='FULL_ARRIVAL';}}
 if(j.task!=='idle'&&j.task!=='discuss'){s.lastReceipt=copy(e);note(s,a,`Finished ${(j.task==='discuss'?DISCUSSION:SERVICE_TASKS[j.task]).label.toLowerCase()}${['deliver','cart'].includes(j.task)?`: the clinic received ${s.delivery.units} of 2 requested water units`:''}.`);}
 start(s,a,'idle','own');
}
function morning(s){
 const gate=s.work.gate===12,divert=s.work.divert===6;s.morning={at:MORNING,protected:gate||divert,waterService:gate,route:gate?'gate':divert?'diversion':'unfinished'};
 for(const a of actors)if(s.jobs[a].task==='divert'){stop(s,a,true);start(s,a,'idle','own');}
 note(s,'world',gate?'The gate held and morning water service continued. The clinic now needs its pump and delivery.':divert?'The diversion protected the inlet. Morning water was lost; reopen supply for the clinic.':'The inlet flooded and morning water was lost. Paid gate work remains: completing it can still restore clinic supply.');
}
function closing(s){if(s.coordination.pending)interruptDiscussionRaw(s,'keeper',false,'CLOSED');if(s.coordination.current?.status==='active'||s.coordination.current?.status==='delivering'){s.coordination.current.status='expired';s.coordination.current.closedAt=CLOSING;s.coordination.current.closeReason='CLOSED';}for(const a of actors)stop(s,a);for(const e of [...s.clock.queue])s.clock=cancelEvent(s.clock,e.id);s.outcome={at:CLOSING,morningProtected:s.morning.protected,morningWater:s.morning.waterService,clinicUnits:s.delivery?.units??0,clinicRequired:2,clinicRoute:s.delivery?.route??'unfinished',allService:s.morning.waterService&&s.delivery?.units===2};note(s,'world',`The clinic intake closed with ${s.outcome.clinicUnits} of 2 requested water units. Morning service remains ${s.outcome.morningWater?'fulfilled':'missed'}.`);}
function record(s,c,replace=false){const last=s.commands.at(-1);if(c.type==='advance'&&last?.type==='advance'){last.to=c.to;return;}if(replace){s.commands[s.commands.length-1]=copy(c);return;}if(s.commands.length>=MAX_COMMANDS)fail('COMMAND_LIMIT','The saved command limit has been reached.');s.commands.push(copy(c));}
// A refusal changes two visible response channels, never physical state. Keep the
// latest entry per channel in its original order; accepted work breaks the run.
const responseFamily=c=>['propose','withdraw'].includes(c.type)?'plan':'physical';
function refusalTail(s){let i=s.commands.length;while(i>0&&s.commands[i-1].type==='refusal')i--;return i;}
function replacesResponse(s,family){return s.commands.slice(refusalTail(s)).some(c=>responseFamily(c.command)===family);}
function responseCommand(s,c,rejected){if(!rejected){record(s,c);return;}const start=refusalTail(s),tail=s.commands.slice(start).filter(x=>responseFamily(x.command)!==responseFamily(c));s.commands.splice(start);for(const entry of tail)record(s,entry);record(s,{type:'refusal',command:c});}
function replacesRefusal(s){return replacesResponse(s,'physical');}
function taskRaw(s,a,task){
 if(typeof a!=='string'||!actors.includes(a)||typeof task!=='string'||!Object.hasOwn(SERVICE_TASKS,task))fail('INVALID_COMMAND','Unknown person or task.');
 const r=refusal(s,a,task),replace=Boolean(r&&replacesRefusal(s));
 if(!replace&&s.commands.length>=MAX_COMMANDS-5)fail('COMMAND_LIMIT','No new requests remain. You can stop requested work and advance time to finish the day.');
 s.lastResponse={at:s.clock.now,actor:a,task,accepted:!r,code:r?.[0]??'ACCEPTED',reason:r?.[1]??`Agreed: ${SERVICE_TASKS[task].label.toLowerCase()}, ${spec(s,task).durationMinutes} paid minutes.`};
 if(!r){stop(s,a);start(s,a,task);note(s,a,s.lastResponse.reason);}responseCommand(s,{type:'request',actor:a,task},Boolean(r));return s;
}
function stopRaw(s,a){
 if(!actors.includes(a)||s.outcome||s.jobs[a].task==='idle')fail('NOT_WORKING','There is no current job to stop.');
 if(s.jobs[a].task==='discuss')return interruptDiscussionRaw(s,a,true);
 const j=s.jobs[a],rejected=a==='partner'&&j.origin==='own',replace=rejected&&replacesRefusal(s);
 if(!replace&&s.commands.length>=MAX_COMMANDS-2)fail('COMMAND_LIMIT','Advance time to finish the current work and reach closing.');
 s.lastResponse={at:s.clock.now,actor:a,task:j.task,accepted:!rejected,code:rejected?'OWN_COMMITMENT':'STOPPED',reason:rejected?'I chose this work for the clinic and will finish it. You can make another request when I am free.':'Stopped the agreed work; paid recovery and installed work remain.'};
 if(!rejected){stop(s,a,true);start(s,a,'idle','own');}responseCommand(s,{type:'stop',actor:a},rejected);return s;
}
function advanceRaw(s,target){
 int(target,s.clock.now,1000000,'target minute');if(s.outcome||target===s.clock.now)return s;
 while(s.clock.now<target&&!s.outcome){auto(s);const step=advanceClock(s.clock,s.clock.now+1),elapsed=step.clock.now-s.clock.now;
  for(const a of actors){const j=s.jobs[a];s.people[a]=advanceAttempt(s.people[a],elapsed);s.paid[j.task]+=elapsed;s.paidByActor[a][j.task]+=elapsed;if(Object.hasOwn(s.work,j.task)){const before=Math.ceil(s.work[j.task]/6);s.work[j.task]+=elapsed;const used=Math.ceil(s.work[j.task]/6)-before;j.reservedParts-=used;s.installedPartsByActor[a]+=used;}}
  s.clock=step.clock;for(const e of step.events){if(s.outcome)break;if(e.type==='morning')morning(s);else if(e.type==='closing')closing(s);else if(s.jobs[e.actorId]?.eventId===e.id)settle(s,e);}
  if(s.outcome)updatePlan(s);
  if(!s.outcome){if(s.coordination.pending&&s.coordination.pending.endsAt===s.clock.now)responseRaw(s,s.coordination.pending.receipt);updatePlan(s);auto(s);}
 }record(s,{type:'advance',to:s.clock.now});return s;
}
// One direct plan and one pending revision. Physical work remains host-owned.
const ready=s=>s.work.pump===12&&supply(s);
const acceptanceRule='Authored rule: Deniz listens only while both people are idle. Terms require visible inlet supply, an owned keeper part for at most one remaining pump section, and a rounded-body forecast of the declared rest and pump schedule. Short holds retain the cart through 45; later holds explicitly risk losing it. Actual work and capacity still decide delivery.';
function termsShape(t){json(t);fields(t,['pumpStartAt','readyBy','waitUntil','fallback'],'plan terms');for(const k of ['pumpStartAt','readyBy','waitUntil'])int(t[k],0,64,k);if(!['cart','none'].includes(t.fallback))fail('INVALID_COMMAND','Unknown fallback.');}
function inviteRefusal(s){
 if(s.outcome)return ['ENDED','Clinic intake is closed.'];
 if(s.coordination.slot)return ['CLINIC_SLOT_USED','A departure has already committed the clinic receiving slot. The clinic obligation cannot be renegotiated away.'];
 if(s.coordination.pending)return ['DISCUSSION_PENDING','One discussion is already underway.'];
 if(actors.some(a=>s.jobs[a].task!=='idle'))return ['BUSY','Both people must choose to be idle before discussing. I will not stop my current work to listen.'];
 if(s.clock.now<MORNING)return ['NOT_OPEN','Discuss the clinic plan after the morning surge.'];
 const end=s.clock.now+2,p=s.coordination.current;
 if(end>=CLOSING)return ['CLOSED','The discussion would not finish before intake closes.'];
 if(end>45&&!(p?.status==='active'&&p.terms.fallback==='none'&&end<=p.terms.waitUntil))return ['CART_WINDOW','I will not spend the last feasible cart window merely listening to a new proposal.'];
 return null;
}
function termRefusal(s,t){
 if(t.pumpStartAt<s.clock.now||t.readyBy<t.pumpStartAt||t.readyBy>t.waitUntil||t.waitUntil>57||t.waitUntil<s.clock.now)return ['INCOMPATIBLE_TIMES','The declared work and readiness must fit the wait, with full delivery starting by 57.'];
 if(t.fallback==='cart'?t.waitUntil>45:t.waitUntil<=45)return ['FALLBACK_TERMS','Retain the cart only through 45; a later hold must explicitly give it up.'];
 if(!supply(s))return ['NO_SUPPLY','I cannot agree to this pump schedule without a working inlet supply.'];
 const work=12-s.work.pump,needed=work?partCost(s,'pump'):0;
 if(work>6)return ['PUMP_UNFINISHED','Finish the first pump section before promising the remaining one.'];
 if(s.parts.keeper<needed)return ['MISSING_PARTS','The keeper does not own the part this promise requires. A promised transfer is not an owned part.'];
 if(t.pumpStartAt+work>t.readyBy)return ['INCOMPATIBLE_TIMES','There is not enough paid pump time between work start and the promised readiness.'];
 const body=copy(getPersonView(s.people.keeper).body),rest=t.pumpStartAt-s.clock.now;
 body.fatigue=Math.max(0,body.fatigue+(PARAMETERS.fatiguePerMinute-PARAMETERS.restPerMinute)*rest);body.hunger=Math.min(1,body.hunger+PARAMETERS.hungerPerMinute*rest);
 if(work&&!assessEffort(body,{durationMinutes:work,effort:.16*work/6,exertive:true}).allowed)return ['FORECAST_CAPACITY','The visible body estimate does not support the promised rest and pump schedule.'];
 const partner=copy(getPersonView(s.people.partner).body),wait=t.readyBy-s.clock.now;
 partner.fatigue=Math.min(1,partner.fatigue+PARAMETERS.fatiguePerMinute*wait);partner.hunger=Math.min(1,partner.hunger+PARAMETERS.hungerPerMinute*wait);
 if(!assessEffort(partner,spec(s,'deliver')).allowed)return ['DELIVERY_CAPACITY','My visible condition estimate does not support the proposed full-delivery window.'];
 if(t.fallback==='cart'&&!assessEffort(partner,spec(s,'cart')).allowed)return ['FALLBACK_CAPACITY','My visible condition estimate does not support keeping the cart fallback.'];
 return null;
}
function planResponse(s,id,stage,accepted,code,reason){s.coordination.lastResponse={at:s.clock.now,id,stage,accepted,code,reason};s.lastResponse={at:s.clock.now,actor:'partner',task:'discuss',accepted,code,reason};}
function replacesPlanRefusal(s){return replacesResponse(s,'plan');}
function proposeRaw(s,terms){
 termsShape(terms);const r=inviteRefusal(s),replace=Boolean(r&&replacesPlanRefusal(s));
 if(!replace&&s.commands.length>=MAX_COMMANDS-6)fail('COMMAND_LIMIT','No new proposals remain. Stop discussion or requested work and advance to closing.');
 if(r){planResponse(s,null,'invitation',false,...r);responseCommand(s,{type:'propose',terms},true);return s;}
 const id=`plan:${s.coordination.nextId++}`,revisionOf=s.coordination.current?.status==='active'?s.coordination.current.id:null,endsAt=s.clock.now+2;
 s.coordination.pending={id,revisionOf,createdAt:s.clock.now,endsAt,terms:copy(terms),receipt:{id,at:endsAt,participants:['keeper','partner']},invitationAccepted:true};
 for(const a of actors){stop(s,a);start(s,a,'discuss','request');}
 planResponse(s,id,'invitation',true,'LISTENING','I agree to listen for two active minutes. I have not yet agreed to these terms.');note(s,'partner',s.lastResponse.reason);record(s,{type:'propose',terms});return s;
}
function responseRaw(s,envelope){
 const p=s.coordination.pending;if(!p||!equal(envelope,p.receipt))fail('STALE_RESPONSE','Response does not match the current discussion.');
 if(s.clock.now<p.endsAt)fail('EARLY_RESPONSE','Both people must pay the complete discussion first.');
 if(s.clock.now!==p.endsAt||actors.some(a=>s.jobs[a]?.task==='discuss'))fail('STALE_RESPONSE','Discussion response missed its paid completion boundary.');
 const old=s.coordination.current,expired=p.revisionOf&&(old?.id!==p.revisionOf||old.status!=='active'||s.clock.now>=old.terms.waitUntil),r=expired?['EXPIRED','The previous waiting deadline has arrived; these late terms cannot replace it.']:termRefusal(s,p.terms);
 s.coordination.pending=null;
 if(r)planResponse(s,p.id,'terms',false,...r);
 else{s.coordination.current={id:p.id,revisionOf:p.revisionOf,createdAt:p.createdAt,respondedAt:s.clock.now,proposer:'keeper',recipient:'partner',terms:p.terms,status:'active',contribution:{status:'promised',fulfilledAt:null},actualReadyAt:null,closedAt:null,closeReason:null};planResponse(s,p.id,'terms',true,'ACCEPTED',`I agree to wait for actual readiness through ${p.terms.waitUntil}. ${p.terms.fallback==='cart'?'If needed, I keep the cart fallback.':'I explicitly give up the safe cart window.'}`);}
 note(s,'partner',s.lastResponse.reason);return s;
}
function interruptDiscussionRaw(s,a,recordCommand,code='INTERRUPTED'){
 if(!actors.includes(a))fail('INVALID_COMMAND','Unknown discussion participant.');
 const p=s.coordination.pending;if(!p)fail('NO_DISCUSSION','There is no discussion to interrupt.');
 if(recordCommand&&s.commands.length>=MAX_COMMANDS-3)fail('COMMAND_LIMIT','Advance to finish the discussion and reach closing.');
 for(const actor of actors)if(s.jobs[actor]?.task==='discuss'){stop(s,actor);start(s,actor,'idle','own');}
 s.coordination.pending=null;planResponse(s,p.id,'interruption',false,code,code==='EXPIRED'?'The existing waiting deadline arrived during discussion. Those terms still apply.':code==='CLOSED'?'Clinic intake closed before these terms could take effect.':'Discussion stopped; only the active minutes actually paid remain. Previous terms still apply.');note(s,a,s.lastResponse.reason);if(recordCommand)record(s,{type:'interrupt-discussion',actor:a});return s;
}
function withdrawRaw(s){
 const p=s.coordination.current,invalid=!p||p.status!=='active'||p.contribution.status==='fulfilled',replace=invalid&&replacesPlanRefusal(s);
 if(!replace&&s.commands.length>=MAX_COMMANDS-2)fail('COMMAND_LIMIT','Advance time to finish the day.');
 if(invalid){planResponse(s,p?.id??null,'withdrawal',false,'NO_ACTIVE_PLAN','There is no active keeper promise to withdraw. The clinic obligation remains.');responseCommand(s,{type:'withdraw'},true);return s;}
 if(s.coordination.pending)interruptDiscussionRaw(s,'keeper',false);
 p.contribution.status='withdrawn';p.contribution.fulfilledAt=null;p.status='withdrawn';p.closedAt=s.clock.now;p.closeReason='CONTRIBUTION_WITHDRAWN';planResponse(s,p.id,'withdrawal',true,'WITHDRAWN','You withdrew your promised contribution. Existing physical work continues and Deniz still owes the clinic a delivery.');note(s,'keeper',s.lastResponse.reason);record(s,{type:'withdraw'});return s;
}
function updatePlan(s){
 if(ready(s)&&s.coordination.readyAt===null)s.coordination.readyAt=s.clock.now;
 const p=s.coordination.current;if(!p)return;
 if(ready(s)&&p.actualReadyAt===null){p.actualReadyAt=s.coordination.readyAt;if(p.contribution.status==='promised'&&p.actualReadyAt<=p.terms.readyBy){p.contribution.status='fulfilled';p.contribution.fulfilledAt=p.actualReadyAt;}}
 if(p.contribution.status==='promised'&&s.clock.now>=p.terms.readyBy){p.contribution.status='missed';note(s,'world',`Plan ${p.id}: promised readiness at ${p.terms.readyBy} was not achieved.`);}
 if(p.status==='active'&&s.clock.now>=p.terms.waitUntil&&s.coordination.pending)interruptDiscussionRaw(s,'partner',false,'EXPIRED');
}
function coordinationView(s){const r=inviteRefusal(s),p=s.coordination.current,budget=s.commands.length>=MAX_COMMANDS-6;return {...copy(s.coordination),readiness:{ready:ready(s),readyAt:s.coordination.readyAt,pumpWork:s.work.pump,pumpRequired:12,supplyAvailable:supply(s),keeperOwnedParts:s.parts.keeper,keeperReservedParts:s.jobs.keeper?.reservedParts??0},discussionAvailable:!r&&!budget,discussionReason:budget?'No new proposals remain; finish the current work and advance to closing.':r?.[1]??null,canWithdraw:p?.status==='active'&&p.contribution.status!=='fulfilled'&&s.commands.length<MAX_COMMANDS-2,canInterrupt:Boolean(s.coordination.pending)&&s.commands.length<MAX_COMMANDS-3,safeWaitUntil:45,latestFullStart:57,discussionMinutes:2,acceptanceRule};}
function checkCoordination(s){
 const c=s.coordination;fields(c,['readyAt','nextId','current','pending','lastResponse','slot'],'coordination');int(c.nextId,1,MAX_COMMANDS+1,'proposal identity');if((c.readyAt!==null)!==ready(s))fail('INVALID_SAVE','Physical readiness time disagrees with work.');if(c.readyAt!==null)int(c.readyAt,24,s.clock.now,'physical readiness');
 if(c.pending){const p=c.pending;fields(p,['id','revisionOf','createdAt','endsAt','terms','receipt','invitationAccepted'],'pending plan');termsShape(p.terms);int(p.createdAt,24,s.clock.now,'proposal creation');if(p.endsAt!==p.createdAt+2||p.endsAt<=s.clock.now||p.invitationAccepted!==true||!equal(p.receipt,{id:p.id,at:p.endsAt,participants:actors})||actors.some(a=>s.jobs[a]?.task!=='discuss'||s.jobs[a].endsAt!==p.endsAt))fail('INVALID_SAVE','Pending discussion disagrees with paid participants.');}
 else if(actors.some(a=>s.jobs[a]?.task==='discuss'))fail('INVALID_SAVE','Discussion work has no proposal.');
 for(const p of [c.current,c.pending].filter(Boolean)){if(!/^plan:[1-9][0-9]*$/.test(p.id)||Number(p.id.slice(5))>=c.nextId||p.revisionOf!==null&&(!/^plan:[1-9][0-9]*$/.test(p.revisionOf)||Number(p.revisionOf.slice(5))>=Number(p.id.slice(5))))fail('INVALID_SAVE','Plan identities are not monotonic.');}
 if(c.current){const p=c.current;fields(p,['id','revisionOf','createdAt','respondedAt','proposer','recipient','terms','status','contribution','actualReadyAt','closedAt','closeReason'],'accepted plan');termsShape(p.terms);fields(p.contribution,['status','fulfilledAt'],'contribution');int(p.createdAt,24,s.clock.now,'accepted creation');int(p.respondedAt,p.createdAt+2,s.clock.now,'accepted response');if(p.proposer!=='keeper'||p.recipient!=='partner'||!['active','delivering','fulfilled','expired','withdrawn'].includes(p.status)||!['promised','fulfilled','missed','withdrawn'].includes(p.contribution.status))fail('INVALID_SAVE','Invalid agreement status.');for(const t of [p.actualReadyAt,p.closedAt,p.contribution.fulfilledAt])if(t!==null)int(t,24,s.clock.now,'plan factual time');if(p.actualReadyAt!==null&&!ready(s)||p.contribution.status==='fulfilled'&&(p.contribution.fulfilledAt!==p.actualReadyAt||p.actualReadyAt>p.terms.readyBy)||p.status==='fulfilled'&&s.delivery?.units!==2||p.status==='active'&&(s.outcome||p.closedAt!==null||s.clock.now>=p.terms.waitUntil))fail('INVALID_SAVE','Agreement facts disagree with world.');}
 if(c.lastResponse){fields(c.lastResponse,['at','id','stage','accepted','code','reason'],'plan response');int(c.lastResponse.at,0,s.clock.now,'response time');if(!['invitation','terms','interruption','withdrawal'].includes(c.lastResponse.stage)||typeof c.lastResponse.accepted!=='boolean')fail('INVALID_SAVE','Invalid plan response.');}
 if(c.slot){const t=c.slot;fields(t,['actor','route','departedAt','arrivedAt','status'],'clinic slot');int(t.departedAt,24,s.clock.now,'departure');if(!actors.includes(t.actor)||!['deliver','cart'].includes(t.route)||!['in-transit','delivered','abandoned','closed'].includes(t.status))fail('INVALID_SAVE','Invalid clinic slot.');if(t.status==='in-transit'&&s.jobs[t.actor]?.task!==t.route||t.status==='delivered'&&(!s.delivery||t.arrivedAt!==s.delivery.at||t.route!==s.delivery.route)||t.status!=='delivered'&&t.arrivedAt!==null)fail('INVALID_SAVE','Clinic slot disagrees with actual work.');}else if(s.delivery||actors.some(a=>['deliver','cart'].includes(s.jobs[a]?.task)))fail('INVALID_SAVE','Delivery has no receiving slot.');
}
export function proposePlan(s,t){check(s);return check(proposeRaw(copy(s),t));}
export function interruptDiscussion(s,a='keeper'){check(s);return check(interruptDiscussionRaw(copy(s),a,true));}
export function withdrawContribution(s){check(s);return check(withdrawRaw(copy(s)));}
export function receivePlanResponse(s,e){check(s);json(e);return check(responseRaw(copy(s),e));}
function check(s){
 json(s);if(JSON.stringify(s).length>MAX_SAVE)fail('INVALID_SAVE','Save too large.');fields(s,['version','scenario','clock','people','jobs','parts','food','eaten','work','salvaged','reopenedAt','morning','delivery','outcome','paid','paidByActor','installedPartsByActor','handedOver','coordination','lastResponse','lastReceipt','recent','commands'],'host');
 if(s.version!==SERVICE_PLAN_VERSION||s.scenario!=='standard')fail('INVALID_SAVE','Incompatible service day.');restoreClock(exportClock(s.clock));int(s.clock.now,0,CLOSING,'host time');
 for(const name of ['people','jobs','parts','food','eaten','paidByActor','installedPartsByActor','handedOver'])fields(s[name],actors,name);fields(s.work,['gate','divert','pump'],'work');fields(s.paid,taskIds,'paid time');
 int(s.work.gate,0,12,'gate');int(s.work.divert,0,6,'diversion');int(s.work.pump,0,12,'pump');int(s.salvaged,0,1,'salvage');
 for(const t of taskIds)int(s.paid[t],0,s.clock.now*2,'paid time');if(Object.values(s.paid).reduce((a,b)=>a+b,0)!==s.clock.now*2||Object.keys(s.work).some(t=>s.paid[t]!==s.work[t]))fail('INVALID_SAVE','Paid work does not reconcile.');
 const events=[];let reserved=0;
 if(s.clock.now<MORNING)events.push({id:'event:1',at:MORNING,type:'morning',actorId:null,data:null});if(s.clock.now<CLOSING)events.push({id:'event:2',at:CLOSING,type:'closing',actorId:null,data:null});
 if((s.morning===null)!==(s.clock.now<MORNING)||(s.outcome===null)!==(s.clock.now<CLOSING))fail('INVALID_SAVE','Obligation markers disagree with time.');
 for(const a of actors){fields(s.paidByActor[a],taskIds,'person paid time');for(const t of taskIds)int(s.paidByActor[a][t],0,s.clock.now,'person paid time');if(Object.values(s.paidByActor[a]).reduce((x,y)=>x+y,0)!==s.clock.now)fail('INVALID_SAVE','Person paid time does not reconcile.');int(s.installedPartsByActor[a],0,4,'installed ownership');int(s.handedOver[a],0,32,'handovers');restorePerson(exportPerson(s.people[a]));const p=s.people[a],j=s.jobs[a];if(p.id!==a||p.version!==HUMAN_VERSION||p.minutes!==s.clock.now)fail('INVALID_SAVE','Actor identity or time mismatch.');int(s.parts[a],0,4,'owned parts');int(s.food[a],0,1,'owned meal');int(s.eaten[a],0,1,'eaten meal');
  if(s.food[a]+s.eaten[a]+(j?.reservedMeal??0)!==1)fail('INVALID_SAVE','Owned meals do not conserve.');
  if(s.outcome){if(j!==null||p.pending!==null)fail('INVALID_SAVE','Ended day retains work.');continue;}
  fields(j,['task','origin','startedAt','endsAt','eventId','attemptId','startProgress','reservedParts','reservedMeal'],'job');if(!taskIds.includes(j.task)||!['own','request'].includes(j.origin))fail('INVALID_SAVE','Unknown active job.');int(j.startedAt,0,s.clock.now,'job start');int(j.endsAt,s.clock.now+1,CLOSING*2,'job end');int(j.reservedParts,0,1,'part reservation');int(j.reservedMeal,0,1,'meal reservation');
  const baseline=copy(s);if(j.startProgress!==null)baseline.work[j.task]=j.startProgress;const action=spec(baseline,j.task);
  if(!p.pending||p.pending.id!==j.attemptId||p.pending.elapsedMinutes!==s.clock.now-j.startedAt||!equal(p.pending.action,action)||j.endsAt!==j.startedAt+action.durationMinutes||!p.pending.capacity.allowed)fail('INVALID_SAVE','Job and paid attempt disagree.');
  if(Object.hasOwn(s.work,j.task)&&s.work[j.task]!==j.startProgress+s.clock.now-j.startedAt)fail('INVALID_SAVE','Partial work does not reconcile.');reserved+=j.reservedParts;events.push(envelope(a,j));
 }
 if(taskIds.some(t=>s.paid[t]!==s.paidByActor.keeper[t]+s.paidByActor.partner[t])||s.installedPartsByActor.keeper+s.installedPartsByActor.partner!==installed(s))fail('INVALID_SAVE','Public accounting does not reconcile.');
 if(s.parts.keeper+s.parts.partner+reserved+installed(s)!==3+s.salvaged)fail('INVALID_SAVE','Parts do not conserve.');
 if(s.clock.queue.length!==events.length||events.some(e=>!s.clock.queue.some(q=>equal(e,q))))fail('INVALID_SAVE','Host event queue mismatch.');
 checkCoordination(s);
 if(!Array.isArray(s.commands)||s.commands.length>MAX_COMMANDS||!Array.isArray(s.recent)||s.recent.length>12)fail('INVALID_SAVE','Bounded state exceeded.');return s;
}
export function requestTask(s,a,t){check(s);return check(taskRaw(copy(s),a,t));}
export function interruptTask(s,a){check(s);return check(stopRaw(copy(s),a));}
export function advanceTo(s,t){check(s);return check(advanceRaw(copy(s),t));}
export function nextVisibleEvent(s){check(s);if(s.outcome)return s.clock.now;const own=ownChoice(s);return Math.min(CLOSING,s.coordination.current?.status==='active'?Math.max(s.clock.now+1,s.coordination.current.terms.waitUntil):CLOSING,s.clock.now<MORNING?MORNING:CLOSING,...actors.map(a=>s.jobs[a].task==='idle'?CLOSING:s.jobs[a].endsAt),own.task&&s.jobs.partner.task==='idle'?s.clock.now+spec(s,own.task).durationMinutes:own.at>s.clock.now?own.at:CLOSING);}
export function receiveReceipt(s,e){check(s);json(e);const next=copy(s);settle(next,e);return check(next);}
export function getServicePlanView(s){
 check(s);const people=Object.fromEntries(actors.map(a=>[a,getPersonView(s.people[a])])),jobs=Object.fromEntries(actors.map(a=>{const j=s.jobs[a];return [a,j&&j.task!=='idle'?{task:j.task,startedAt:j.startedAt,endsAt:j.endsAt,origin:j.origin,reservedParts:j.reservedParts,reservedMeal:j.reservedMeal}:null];}));
 const choices=Object.fromEntries(actors.map(a=>[a,Object.entries(SERVICE_TASKS).map(([task,t])=>{const action=spec(s,task),r=refusal(s,a,task,people[a].body),capacity=assessEffort(people[a].body,action),budget=s.commands.length>=MAX_COMMANDS-5;return {task,label:t.label,detail:t.detail,duration:action.durationMinutes,parts:partCost(s,task),meal:task==='meal',available:!budget&&(!r||r[0]==='CAPACITY'),code:budget?'ACTION_BUDGET':r?.[0]??null,reason:budget?'No new requests remain; advance time to finish the day.':r?.[1]??null,finishesAt:s.clock.now+action.durationMinutes,tooLate:task==='divert'?s.clock.now+action.durationMinutes>MORNING:s.clock.now+action.durationMinutes>=CLOSING,capacityEstimate:{allowed:capacity.allowed,causes:capacity.causes}};})]));
 return copy({version:SERVICE_PLAN_VERSION,runtimeVersion:RUNTIME_VERSION,humanVersion:HUMAN_VERSION,clockVersion:CLOCK_VERSION,scenario:s.scenario,now:s.clock.now,phase:s.outcome?'ended':s.morning?'clinic':'morning',title:'Shared Promise',objective:s.morning?'Finish the clinic pump and restore inlet supply for both water units, or carry one unit by cart before minute 64.':'Protect the inlet at minute 24 and retain enough parts, condition and time for the clinic delivery at minute 64.',deadline:CLOSING,milestones:[{id:'inlet',label:'Morning inlet',at:MORNING,status:s.morning?'settled':'pending',result:s.morning},{id:'clinic',label:'Clinic intake',at:CLOSING,status:s.outcome?'settled':'pending',result:s.outcome}],people,actors:{keeper:{name:'You',role:'Inlet service and shared clinic work'},partner:{name:'Deniz',role:'Clinic commitment; owns one reserved pump part'}},jobs,choices,resources:{parts:s.parts,food:s.food,reservedParts:Object.fromEntries(actors.map(a=>[a,s.jobs[a]?.reservedParts??0])),reservedMeals:Object.fromEntries(actors.map(a=>[a,s.jobs[a]?.reservedMeal??0])),installedParts:installed(s),installedPartsByActor:s.installedPartsByActor,eaten:s.eaten,handedOver:s.handedOver,shedAvailable:!s.salvaged&&!actors.some(a=>s.jobs[a]?.task==='salvage')},work:s.work,supply:{reopenedAt:s.reopenedAt,available:supply(s)},delivery:s.delivery,morning:s.morning,partnerIntent:ownChoice(s),outcome:s.outcome,lastResponse:s.lastResponse,coordination:coordinationView(s),recent:s.recent,paid:s.paid,paidByActor:s.paidByActor,remainingCommands:Math.max(0,MAX_COMMANDS-5-s.commands.length)});
}
export function exportServicePlan(s){check(s);const {commands,...state}=copy(s);return {format:'human-service-plan',version:1,hostVersion:SERVICE_PLAN_VERSION,runtimeVersion:RUNTIME_VERSION,scenario:s.scenario,commands,state};}
export function restoreServicePlan(input){
 json(input);if(JSON.stringify(input).length>MAX_SAVE)fail('INVALID_SAVE','Save too large.');fields(input,['format','version','hostVersion','runtimeVersion','scenario','commands','state'],'save');if(input.format!=='human-service-plan'||input.version!==1||input.hostVersion!==SERVICE_PLAN_VERSION||input.runtimeVersion!==RUNTIME_VERSION||input.scenario!=='standard'||!Array.isArray(input.commands)||input.commands.length>MAX_COMMANDS)fail('INVALID_SAVE','Incompatible service-day replay.');
 const s=initial(input.scenario);
 for(const entry of input.commands){
  const wrapped=entry?.type==='refusal';if(wrapped)fields(entry,['type','command'],'refusal command');const c=wrapped?entry.command:entry;
  if(c?.type==='request'){fields(c,['type','actor','task'],'request command');taskRaw(s,c.actor,c.task);}
  else if(c?.type==='stop'){fields(c,['type','actor'],'stop command');stopRaw(s,c.actor);}
  else if(!wrapped&&c?.type==='advance'){fields(c,['type','to'],'advance command');advanceRaw(s,c.to);}
  else if(c?.type==='propose'){fields(c,['type','terms'],'propose command');proposeRaw(s,c.terms);}
  else if(!wrapped&&c?.type==='interrupt-discussion'){fields(c,['type','actor'],'discussion interruption');interruptDiscussionRaw(s,c.actor,true);}
  else if(c?.type==='withdraw'){fields(c,['type'],'withdrawal');withdrawRaw(s);}
  else fail('INVALID_SAVE','Unknown replay command.');
  if(wrapped&&s.lastResponse?.accepted!==false)fail('INVALID_SAVE','A refusal wrapper cannot conceal accepted work.');
 }
 const expected=exportServicePlan(s);
 // Earlier development saves may retain redundant refusals. Normalize only the replay journal; every saved world/envelope field must still match exactly.
 if(!equal(expected,{...input,commands:expected.commands}))fail('INVALID_SAVE','Saved world does not match its deterministic command replay.');return s;
}
