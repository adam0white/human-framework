/** Two explicit host priorities, not candidate human planning faculties. */
import {request,advance,choice,available,morningTarget,clinicTarget,partnerCommand,recover,waiting} from './shared.js';
export const POLICIES=Object.freeze(['deadline-first','reserve-clinic']);
export function chooseServiceCommand(view,policy='deadline-first'){
 if(!POLICIES.includes(policy))throw new Error('Unknown service policy.');
 if(view.outcome)return advance();
 const target=view.phase==='morning'?morningTarget(view,policy):clinicTarget(view);
 const partner=partnerCommand(view,target,policy);if(partner)return partner;
 const job=view.jobs.keeper;
 if(job){
  if(job.task==='rest'&&job.origin==='request'){
   if(view.now>=job.startedAt+3)return {type:'interrupt',actor:'keeper'};
   return advance(job.startedAt+3);
  }
  return advance();
 }
 const recovery=recover(view,target);if(recovery)return recovery;
 if(target){
  const other=view.jobs.partner;
  if(other&&(other.task===target||other.task==='deliver'||other.task==='cart'))return waiting(view);
  if(available(view,'keeper',target))return request('keeper',target);
  const need=choice(view,'keeper',target)?.parts??0;
  if(need>view.resources.parts.keeper&&view.resources.shedAvailable&&available(view,'keeper','salvage'))return request('keeper','salvage');
 }
 return waiting(view);
}
