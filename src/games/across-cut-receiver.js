/** Authored receiver policy. Its only world input is its detached actor view. */
import {assessEffort} from '../runtime/index.js';

export const RECEIVER_VERSION='0.1.1';
export const createReceiverState=()=>({version:RECEIVER_VERSION,mode:'pipe'});
const rates={inspect:.003,transmit:.003,repair:.012,attend:.006,cart:.010,meal:0};
const sustainable=(v,task,minutes)=>assessEffort(Object.fromEntries(Object.entries(v.body.body).map(([k,n])=>[k,Math.min(1,n+.025)])),{durationMinutes:minutes,effort:rates[task]*minutes,exertive:rates[task]>0}).allowed;
const absolute=new Set(['launchAt','launchDeparted','serviceUnits','repairMinutes:dock','repairProgress:dock']);

// An incomplete source-time progress fact bounds how early repair could have
// finished even if the keeper worked every minute since. A missing report and a
// completed-progress snapshot establish no such lower bound.
function upstreamTooLate(view,launch){
 const facts=view.notebook.filter(o=>o.via!=='local'&&o.source==='valve');
 const required=facts.filter(o=>o.cue==='repairMinutes:valve').sort((a,b)=>b.observedAt-a.observedAt||b.receipt-a.receipt)[0]?.value;
 if(!Number.isInteger(required))return false;
 return facts.some(o=>o.cue==='repairProgress:valve'&&o.value<required&&o.observedAt+required-o.value+2+3>launch);
}

/** Returns at most two explicit commands: stop, then request. */
export function decideReceiver(state,view){
 if(state?.version!==RECEIVER_VERSION||!['pipe','cart','done'].includes(state.mode)||view?.actorId!=='receiver')throw new Error('Invalid receiver decision input.');
 const next={...state},result=(commands,reason)=>({state:next,commands,reason});
 const enough=(n)=>view.budget.used+n+1<=view.budget.limit;
 const request=(action,reason)=>{
  const duration=action.minutes??({inspect:1,transmit:1,cart:10,meal:2}[action.task]);
  if(!enough(1))return result([],'decision-budget');
  if(!sustainable(view,action.task,duration)){
   if(!view.job&&view.inventory.meal.available&&view.body.body.hunger>.45)return result([{type:'request',action:{task:'meal'}}],'eat-before-work');
   return result([],'available-recovery');
  }
  return result([{type:'request',action}],reason);
 };
 if(view.ended)return result([],'horizon');
 if(next.mode==='done')return result([],'finished');
 if(next.mode==='cart'){
  if(view.job)return result([],'finish-cart');
  next.mode='done';return result([],'cart-finished');
 }
 // A meal is owned recovery already underway. Let consumption complete before
 // reconsidering the capacity-blocked cart; stopping it would repeatedly cancel the meal before any hunger relief.
 if(view.job?.task==='meal')return result([],'finish-owned-meal');
 if(view.local.launchDeparted||view.local.serviceUnits>=2){
  next.mode='done';return result(view.job?[{type:'stop'}]:[],'observed-service-ended');
 }
 if(view.paid.inspect===0){
  if(view.job)return result([],'finish-inspection');
  return request({task:'inspect'},'inspect-inlet');
 }
 const reported=view.sent.some(e=>e.message.kind==='report'&&e.message.observations.some(o=>o.cue==='repairMinutes:dock'));
 if(!reported){
  if(view.job)return result([],'finish-initial-report');
  const own=new Map();for(const o of view.notebook)if(o.via==='local'&&o.source==='dock'&&absolute.has(o.cue))own.set(o.cue,o);
  const observationIds=[...own.values()].map(o=>o.receipt);
  if(view.inventory.radio.available>0)return request({task:'transmit',message:{kind:'report',observationIds}},'report-local-facts');
  return result([],'no-initial-radio');
 }
 const remaining=view.local.repairMinutes-view.local.repairProgress,launch=view.local.launchAt;
 const impossible=view.now+remaining>launch||upstreamTooLate(view,launch);
 if(impossible){
  if(view.inventory.cartWater.available>0&&view.now+5<=launch){
   const count=view.job?2:1;
   if(enough(count)&&sustainable(view,'cart',10)){
    next.mode='cart';return result([...(view.job?[{type:'stop'}]:[]),{type:'request',action:{task:'cart'}}],'pipe-too-late-use-cart');
   }
   if(view.job)return result([{type:'stop'}],'pipe-too-late-recover');
   return request({task:'cart'},'pipe-too-late-use-cart');
  }
  next.mode='done';return result(view.job?[{type:'stop'}]:[],'no-timely-route');
 }
 if(view.job)return result([],'keep-paid-work');
 if(remaining>0)return request({task:'repair',minutes:1},'repair-inlet');
 return request({task:'attend',minutes:1},'attend-while-viable');
}
