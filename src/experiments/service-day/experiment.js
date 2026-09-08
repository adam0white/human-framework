/** Private deterministic policy comparison; host snapshots never reach a policy. */
import {createService,getServiceView,requestTask,interruptTask,advanceTo,nextVisibleEvent,exportService,restoreService} from '../../games/service.js';
import {chooseServiceCommand,POLICIES} from './policies.js';
const copy=value=>structuredClone(value),bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
export const CONDITIONS=Object.freeze([
 {id:'fresh',partition:'development',prefix:[]},
 {id:'delay-4',partition:'development',prefix:[{type:'advance',until:4}]},
 {id:'delay-8',partition:'development',prefix:[{type:'advance',until:8}]},
 {id:'meal-first',partition:'development',prefix:[{type:'request',actor:'keeper',task:'meal'},{type:'advance',until:4}]},
 {id:'interrupted-gate',partition:'development',prefix:[{type:'request',actor:'keeper',task:'gate'},{type:'advance',until:3},{type:'interrupt',actor:'keeper'}]},
 {id:'partial-rest',partition:'development',prefix:[{type:'request',actor:'keeper',task:'rest'},{type:'advance',until:3},{type:'interrupt',actor:'keeper'}]},
 {id:'delay-14',partition:'reserved',prefix:[{type:'advance',until:14}]},
 {id:'delay-18',partition:'reserved',prefix:[{type:'advance',until:18}]},
 {id:'interrupted-diversion',partition:'reserved',prefix:[{type:'request',actor:'keeper',task:'divert'},{type:'advance',until:3},{type:'interrupt',actor:'keeper'}]}
]);
export function applyCommand(state,command){
 if(command.type==='request')return requestTask(state,command.actor,command.task);
 if(command.type==='interrupt')return interruptTask(state,command.actor);
 if(command.type==='advance')return advanceTo(state,command.until);
 throw new Error('Invalid policy command.');
}
function validate(command,now){
 const fields=command?.type==='request'?['type','actor','task']:command?.type==='interrupt'?['type','actor']:command?.type==='advance'?['type',...(Object.hasOwn(command,'until')?['until']:[])]:null;
 if(!fields||Object.keys(command).length!==fields.length||fields.some(k=>!Object.hasOwn(command,k)))throw new Error('Invalid policy command.');
 if(Object.hasOwn(command,'actor')&&!['keeper','partner'].includes(command.actor))throw new Error('Invalid policy actor.');
 if(command.type==='request'&&typeof command.task!=='string')throw new Error('Invalid policy task.');
 if(Object.hasOwn(command,'until')&&(!Number.isSafeInteger(command.until)||command.until<=now))throw new Error('Invalid policy advance.');
}
export function createCondition(id,{allowReserved=false}={}){
 const condition=CONDITIONS.find(c=>c.id===id);if(!condition)throw new Error('Unknown condition.');
 if(condition.partition==='reserved'&&!allowReserved)throw new Error('Reserved conditions remain sealed until source freeze.');
 let state=createService();
 for(const command of condition.prefix){state=applyCommand(state,command);if(command.type!=='advance'&&!state.lastResponse.accepted)throw new Error(`Illegal registered prefix ${id}: ${state.lastResponse.reason}`);}
 return state;
}
function observer(state){
 const view=getServiceView(state);
 return copy({now:view.now,morning:view.morning,delivery:view.delivery,outcome:view.outcome,work:view.work,supply:view.supply,resources:view.resources,jobs:view.jobs,paid:view.paid,paidByActor:view.paidByActor,people:view.people,partnerIntent:view.partnerIntent});
}
function policyView(state){const view=getServiceView(state);delete view.people.partner;return view;}
function deepFreeze(value){if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(deepFreeze);}return value;}
export function runTrial({conditionId='fresh',policy='deadline-first',allowReserved=false,initialState=null,resume=false,checkpoints=[24],controller=null}={}){
 if(!POLICIES.includes(policy))throw new Error('Unknown service policy.');
 let state=initialState?restoreService(copy(initialState)):createCondition(conditionId,{allowReserved});
 const initial=observer(state),start=exportService(state),commands=[],records=[],refusals=[],partnerRecords=[];
 let status='ended',zeroTime=0,maxSaveBytes=0,maxViewBytes=0,maxPendingEvents=0,lastIntent=null;
 const capture=()=>{
  const view=getServiceView(state);maxSaveBytes=Math.max(maxSaveBytes,bytes(exportService(state)));maxViewBytes=Math.max(maxViewBytes,bytes(policyView(state)));maxPendingEvents=Math.max(maxPendingEvents,state.clock.queue.length);
  const intent=JSON.stringify(view.partnerIntent);
  if(intent!==lastIntent){partnerRecords.push(copy(view.partnerIntent));lastIntent=intent;}
  if(checkpoints.includes(view.now)&&!records.some(r=>r.now===view.now))records.push(observer(state));
 };
 capture();
 while(!getServiceView(state).outcome&&commands.length<2000){
  const view=policyView(state),entry={at:view.now,view:copy(view),command:null,response:null,status:'applied',advanced:0,error:null};let phase='policy';
  try{
   const command=(controller??(v=>chooseServiceCommand(v,policy)))(deepFreeze(copy(view)));validate(command,view.now);entry.command=copy(command);phase='host';
   if(command.type==='advance'){
    const target=Math.min(view.deadline,nextVisibleEvent(state),command.until??Infinity);entry.command.until=target;
    if(target<=view.now)throw new Error('Visible event failed to advance time.');
    // Minute stepping observes automatic decisions/counters without policy calls.
    for(let minute=view.now+1;minute<=target;minute++){state=advanceTo(state,minute);if(resume)state=restoreService(copy(exportService(state)));capture();}
   }else{
    state=applyCommand(state,command);entry.response=copy(state.lastResponse);
    if(!entry.response.accepted)refusals.push(copy(entry.response));
    if(command.actor==='partner')partnerRecords.push(copy(entry.response));
    if(resume)state=restoreService(copy(exportService(state)));capture();
   }
   entry.advanced=getServiceView(state).now-view.now;zeroTime=entry.advanced?0:zeroTime+1;
  }catch(error){entry.status='error';entry.error={origin:phase,code:error.code??null,message:error.message};status=phase==='policy'?'policy-error':'host-error';}
  commands.push(entry);
  if(entry.status==='error')break;
  if(zeroTime>8){status='zero-time-limit';break;}
 }
 if(commands.length===2000&&!getServiceView(state).outcome)status='command-limit';
 const finalState=exportService(state);
 return {conditionId,policy:controller?'custom':policy,status,initialState:start,initial,commands,commandCount:commands.length,refusals,partnerRecords,checkpoints:records,final:observer(state),finalState,
  bounds:{maxSaveBytes,maxViewBytes,maxPendingEvents,persistentControllerBytes:0,serializedControllerBytes:4,saveBudget:65536,viewBudget:32768,controllerBudget:4096,withinBudget:maxSaveBytes<=65536&&maxViewBytes<=32768},
  controllerState:null};
}
export function replayTrial(trial){let state=restoreService(copy(trial.initialState));for(const entry of trial.commands){if(entry.status==='error')break;state=applyCommand(state,entry.command);}return exportService(state);}
function verifiedTrial(options){
 const direct=runTrial(options),resumed=runTrial({...options,resume:true});
 if(JSON.stringify(direct)!==JSON.stringify(resumed))throw new Error(`Resume differs: ${options.conditionId}/${options.policy}`);
 if(JSON.stringify(replayTrial(direct))!==JSON.stringify(direct.finalState))throw new Error(`Replay differs: ${options.conditionId}/${options.policy}`);
 return {...direct,resumeEqual:true,replayEqual:true};
}
export function runComparison({partition='development',allowReserved=false}={}){
 if(!['development','reserved'].includes(partition))throw new Error('Unknown comparison partition.');
 if(partition==='reserved'&&!allowReserved)throw new Error('Reserved comparison is sealed until source freeze.');
 const conditions=CONDITIONS.filter(c=>c.partition===partition),trials=conditions.flatMap(c=>POLICIES.map(policy=>verifiedTrial({conditionId:c.id,policy,allowReserved})));
 for(const condition of conditions){const paired=trials.filter(t=>t.conditionId===condition.id);if(JSON.stringify(paired[0].initialState)!==JSON.stringify(paired[1].initialState))throw new Error('Paired starting states differ.');}
 return {format:'service-day-policy-comparison',version:1,partition,conditions:copy(conditions),policies:[...POLICIES],trials};
}
export function runCarryover(){
 let shared=requestTask(createService(),'keeper','meal');if(!shared.lastResponse.accepted)throw new Error('Illegal carryover meal prefix.');shared=advanceTo(shared,4);
 const commonState=exportService(shared),branches=[];
 for(const route of ['gate','diversion']){
  let state=restoreService(copy(commonState));const prefix=[];
  const apply=command=>{state=applyCommand(state,command);prefix.push({command:copy(command),response:command.type==='advance'?null:copy(state.lastResponse)});if(command.type!=='advance'&&!state.lastResponse.accepted)throw new Error(`Illegal carryover ${route}: ${state.lastResponse.reason}`);};
  apply({type:'request',actor:'keeper',task:route==='gate'?'gate':'divert'});apply({type:'advance',until:10});
  if(route==='gate'){apply({type:'request',actor:'keeper',task:'gate'});apply({type:'advance',until:16});}
  apply({type:'advance',until:24});const beforeRequest=observer(state),view=getServiceView(state),pumpChoice=view.choices.keeper.find(c=>c.task==='pump');
  state=requestTask(state,'keeper','pump');const matchedResponse=copy(state.lastResponse);state=advanceTo(state,30);
  const afterRequest=observer(state),continuation=verifiedTrial({conditionId:`carryover-${route}`,policy:'deadline-first',initialState:exportService(state)});
  branches.push({route,commonState:copy(commonState),prefix,beforeRequest,pumpChoice,matchedResponse,afterRequest,continuation});
 }
 return {format:'service-day-carryover-branches',version:1,commonState,branches};
}
