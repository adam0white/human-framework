// Preregistered controls. Inputs are detached actor views and their own JSON state.
export const POLICY_VERSION='0.1.0';
const clone=structuredClone;
const available=(v,key)=>v.inventory[key]?.available??0;
const answer=(state,action,reason)=>({state,commands:action?[action.control==='interrupt'?{type:'stop'}:{type:'request',action}]:[],reason});
export function latestSource(view,source,cue){
  return view.notebook.filter(r=>r.source===source&&r.cue===cue).sort((a,b)=>a.observedAt-b.observedAt||a.receipt-b.receipt).at(-1)??null;
}
export function reportIds(view){
  const selected=new Map();
  for(const r of view.notebook)if(r.via==='local'&&!r.cue.startsWith('peerPresent:')){
    const key=`${r.source}/${r.cue}`,old=selected.get(key);
    if(!old||r.observedAt>=old.observedAt)selected.set(key,r);
  }
  return [...selected.values()].map(r=>r.receipt).slice(-32);
}
// A lower bound, never an assertion of current remote progress. The first-hop
// source times establish required work and known paid nonrepair minutes.
export function inletAttendanceLowerBound(view){
  const requirement=latestSource(view,'dock','repairMinutes:dock');
  const progress=latestSource(view,'dock','repairProgress:dock');
  if(!requirement||!progress)return null;
  const remaining=Math.max(0,requirement.value-progress.value);
  if(remaining===0)return progress.observedAt+1;
  const unavailable=new Set();
  if(requirement.observedAt>progress.observedAt)unavailable.add(requirement.observedAt-1);
  for(const envelope of view.inbox)if(envelope.sender==='receiver'&&envelope.sentAt>progress.observedAt)unavailable.add(envelope.sentAt-1);
  let work=0,minute=progress.observedAt;
  while(work<remaining){if(!unavailable.has(minute))work++;minute++;}
  return minute+1;
}
export function chooseKeeper(policyState,view,arm){
  const state=clone(policyState),v=view,wait=reason=>answer(state,null,reason);
  if(v.ended)return wait('Public horizon.');
  if(arm.id==='joint-immediate-cart')return wait('Joint immediate cart control leaves keeper supplies intact.');
  const informed=arm.id==='radio-adaptive';
  const contact=arm.id==='paid-contact';
  const launch=(informed||contact)?latestSource(v,'dock','launchAt')?.value:null;
  const attendance=informed?inletAttendanceLowerBound(v):null;
  if(v.job){
    if(informed&&v.job.task==='release'&&((launch!==null&&v.job.endsAt+3>launch)||(attendance!==null&&v.job.endsAt+3<attendance)))
      return answer(state,{control:'interrupt'},'Actual source-time evidence proves the active release arrival cannot be attended before launch; stop and retain reserved water.');
    return wait('Keep paying the active owned task.');
  }
  if(available(v,'water')===0)return wait('Owned pipe water consumed or reserved.');
  if(v.location!=='valve'){
    if(contact&&v.location==='dock'){
      if(v.local.repairMinutes===null)return answer(state,{task:'inspect'},'Pay to inspect the remote inlet while physically present.');
      if(!state.contactSent&&v.local.peerPresent){state.contactSent=true;return answer(state,{task:'transmit',via:'contact',message:{kind:'report',observationIds:reportIds(v)}},'Pay one contact minute after the actual visit.');}
    }
    return answer(state,{task:'travel',to:'valve'},'Pay the physical trip back for keeper work.');
  }
  if(v.local.repairMinutes===null)return answer(state,{task:'inspect'},'Inspect owned valve.');
  if(contact&&!state.visited&&v.local.repairMinutes===6){state.visited=true;return answer(state,{task:'travel',to:'dock'},'Use the short-valve condition for a paid six-minute contact visit.');}
  if(informed&&!state.reportSent&&available(v,'radio')>0){state.reportSent=true;return answer(state,{task:'transmit',message:{kind:'report',observationIds:reportIds(v)}},'Send own inspected absolute facts so the fixed receiver can reconsider.');}
  const remaining=Math.max(0,v.local.repairMinutes-v.local.repairProgress);
  if(launch!==null&&(v.now+remaining+5>launch||(attendance!==null&&attendance>launch)))return wait('Received or directly observed facts establish that remaining pipe service cannot meet launch.');
  if(remaining)return answer(state,{task:'repair',minutes:1},'Pay one minute of keeper repair.');
  const releaseAt=informed?Math.max(v.now,attendance===null?0:attendance-5):(arm.releaseFloor??13);
  if(v.now<releaseAt)return wait('Wait for the registered release threshold with available recovery.');
  if(v.now+5>(launch??27))return wait('Do not knowingly release after the observed or public latest possible launch.');
  return answer(state,{task:'release'},informed?'Release at a source-time feasible inlet attendance bound.':'Release at the registered fixed threshold after own repair.');
}
export function chooseJointReceiver(policyState,view,kind){
  const state=clone(policyState),v=view,wait=reason=>answer(state,null,reason);
  if(v.ended||v.job)return wait('Public horizon or active owned work.');
  const launch=v.local.launchAt;
  if(v.local.serviceUnits>=2||v.local.launchDeparted)return wait('Locally observed completed service or launch departure.');
  const cart=()=>available(v,'cartWater')>0&&v.now+5<=launch?answer(state,{task:'cart'},'Take the owned cart while its locally known launch permits delivery.'):wait('Cart unavailable or too late.');
  if(kind==='immediate-cart')return cart();
  if(v.location!=='dock')return answer(state,{task:'travel',to:'dock'},'Pay return travel to receiver station.');
  if(v.local.repairMinutes===null)return answer(state,{task:'inspect'},'Inspect before choosing cart or inlet repair.');
  const remaining=v.local.repairMinutes-v.local.repairProgress;
  if(v.now+remaining+1>launch)return cart();
  if(remaining>0)return answer(state,{task:'repair',minutes:1},'Pay owned inlet repair.');
  if(launch===15&&available(v,'cartWater')>0)return cart();
  if(v.now>=13&&v.now<Math.min(18,launch))return answer(state,{task:'attend',minutes:1},'Attend the registered window covering the early and conservative joint release thresholds.');
  if(v.now>=18)return cart();
  return wait('Wait for the joint attendance window with available recovery.');
}
