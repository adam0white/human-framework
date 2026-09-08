/** Private candidate: borrow a validated host draft; retain no independent state.
 * The host owns consent, resources, effects, event dispatch and save validation.
 */
import {beginAttempt,advanceAttempt,finishAttempt,scheduleEvent,cancelEvent,advanceClock} from '../runtime/index.js';
const fail=(code,message)=>{const error=new Error(message);error.code=code;throw error;};
function canonical(value) {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
export function dueRecord(actor,job) {
  return {id:job.eventId,at:job.endsAt,type:'attempt-due',actorId:actor,data:{attemptId:job.attemptId,task:job.task}};
}
export function beginJob(state,actor,task,spec,fields) {
  if(['task','startedAt','endsAt','eventId','attemptId'].some(key=>Object.hasOwn(fields??{},key)))fail('INVALID_JOB_FIELDS','Host fields cannot replace lifecycle identity.');
  const person=beginAttempt(state.people[actor],spec);
  if(!person.pending.capacity.allowed)fail('CAPACITY','A blocked attempt cannot start a host job.');
  const endsAt=state.clock.now+spec.durationMinutes;
  const scheduled=scheduleEvent(state.clock,{at:endsAt,type:'attempt-due',actorId:actor,data:{attemptId:person.pending.id,task}});
  state.people[actor]=person;state.clock=scheduled.clock;
  state.jobs[actor]={task,startedAt:state.clock.now,endsAt,eventId:scheduled.eventId,attemptId:person.pending.id,...fields};
}
export function interruptJob(state,actor) {
  const job=state.jobs[actor];
  const person=finishAttempt(state.people[actor],{attemptId:job.attemptId,status:'interrupted'});
  const clock=cancelEvent(state.clock,job.eventId);
  state.people[actor]=person;state.clock=clock;state.jobs[actor]=null;
  return job;
}
export function completeJob(state,event,{mealConsumed=false}={}) {
  const actor=event?.actorId,job=state.jobs[actor];
  if(!job||canonical(event)!==canonical(dueRecord(actor,job)))fail('STALE_RECEIPT','Receipt does not match a current job.');
  if(state.clock.now<job.endsAt)fail('EARLY_RECEIPT','The job has not paid its full interval.');
  if(state.clock.now!==job.endsAt)fail('STALE_RECEIPT','Receipt missed its completion boundary.');
  const person=finishAttempt(state.people[actor],{attemptId:job.attemptId,status:'completed',mealConsumed});
  state.people[actor]=person;state.jobs[actor]=null;
  return job;
}
export function advanceJobs(state,actors,target) {
  const advanced=advanceClock(state.clock,target),elapsed=advanced.clock.now-state.clock.now;
  const people=actors.map(actor=>[actor,advanceAttempt(state.people[actor],elapsed)]);
  for(const [actor,person] of people)state.people[actor]=person;
  state.clock=advanced.clock;
  return {elapsed,events:advanced.events};
}
