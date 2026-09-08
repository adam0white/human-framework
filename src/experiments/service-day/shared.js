/** Arithmetic over the actor-accessible view only; never imports a host or Human. */
export const request=(actor,task)=>({type:'request',actor,task});
export const advance=until=>until===undefined?{type:'advance'}:{type:'advance',until};
export const choice=(view,actor,task)=>view.choices[actor].find(c=>c.task===task);
export function available(view,actor,task){
 const last=view.lastResponse;
 return !view.jobs[actor]&&choice(view,actor,task)?.available&&!(last&&last.at===view.now&&last.actor===actor&&last.task===task&&!last.accepted);
}
export function morningTarget(view,policy){
 const inletAt=view.milestones.find(m=>m.id==='inlet').at;
 if(view.work.gate===12||view.work.divert===6)return null;
 if(view.work.gate>0||policy==='deadline-first'){
  if(view.now+12-view.work.gate<=inletAt)return 'gate';
 }
 if(view.now+6-view.work.divert<=inletAt)return 'divert';
 return null;
}
export function clinicTarget(view){
 if(view.delivery)return null;
 const deadline=view.deadline;
 if(view.supply.available){
  if(view.work.pump===12)return view.now+6<deadline?'deliver':null;
  if(view.now+(12-view.work.pump)+6<deadline)return 'pump';
 }else if(view.work.divert===6){
  if(view.now+3+(12-view.work.pump)+6<deadline)return 'reopen';
 }else if(view.work.gate>0&&view.now+(12-view.work.gate)+(12-view.work.pump)+6<deadline)return 'gate';
 return view.now+18<deadline?'cart':null;
}
export function partnerCommand(view,target,policy){
 if(view.jobs.partner)return null;
 // A gate route requires four installed parts across the two obligations.
 const gateRoute=policy==='deadline-first'&&view.phase==='morning'&&view.work.divert===0;
 if(gateRoute&&view.resources.shedAvailable&&available(view,'partner','salvage'))return request('partner','salvage');
 const need=choice(view,'keeper',target)?.parts??0;
 const reserve=view.work.pump<6?1:0;
 if(need>view.resources.parts.keeper&&view.resources.parts.partner>reserve&&available(view,'partner','share'))return request('partner','share');
 return null;
}
export function recover(view,target){
 const own=view.people.keeper.body,c=choice(view,'keeper',target),warnings=c?.capacityEstimate?.causes??[];
 const last=view.lastResponse,refused=last&&last.at===view.now&&last.actor==='keeper'&&last.task===target&&!last.accepted;
 const deadline=view.phase==='morning'?view.milestones.find(m=>m.id==='inlet').at:view.deadline-1;
 const slack=deadline-view.now-(c?.duration??0);
 if(available(view,'keeper','meal')&&slack>=4&&(own.hunger>=.80||warnings.includes('hunger')||(refused&&/hunger/i.test(last.reason))))return request('keeper','meal');
 if(available(view,'keeper','rest')&&slack>=3&&(warnings.includes('fatigue')||(refused&&last.code==='CAPACITY')))return request('keeper','rest');
 return null;
}
export function waiting(view){
 if(view.people.keeper.body.fatigue>=.60&&view.now+3<view.deadline&&available(view,'keeper','rest'))return request('keeper','rest');
 return advance();
}
