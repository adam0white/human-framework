/** Wall time is presentation state. It is never exported with the world. */
import {createServicePlan,getServicePlanView,requestTask,interruptTask,advanceTo,nextVisibleEvent,restoreServicePlan,SERVICE_TASKS,proposePlan,interruptDiscussion,withdrawContribution} from '../src/games/service-plan.js';

/** Explain a phase-canceled receipt without rewriting frozen host history. */
export function serviceEventText(view,entry){
 if(entry.at===view.morning?.at&&view.work.divert===SERVICE_TASKS.divert.duration&&entry.message.startsWith(`Stopped ${SERVICE_TASKS.divert.label.toLowerCase()} after `))
  return 'The diversion was complete at the morning surge. Its paid work counted before the job ended.';
 return entry.message;
}

export function createSession(game=createServicePlan()){
 getServicePlanView(game);
 return {game,running:false,remainder:0,reason:game.outcome?'The day is complete. Review the two service outcomes.':'Paused. Choose your work or make a request, then advance time.'};
}
/** Start at the clinic by executing the visible paid morning, with its real replay history. */
export function createClinicSession(){
 let game=createServicePlan();
 for(const [task,until] of [['meal',4],['gate',10],['gate',16],['salvage',24],['rest',37]]){
  game=requestTask(game,'keeper',task);
  if(!game.lastResponse.accepted)throw new Error('The prepared morning could not continue: '+game.lastResponse.reason);
  game=advanceTo(game,until);
 }
 return {...createSession(game),reason:'Paused at the clinic. Morning work and supplies carry forward.'};
}
export function pauseSession(s,reason='Paused. Choosing and reading use no time.'){return {...s,running:false,remainder:0,reason};}
export function toggleSession(s){
 if(s.game.outcome)return pauseSession(s,'The day is complete. Start a new day to try another approach.');
 return s.running?pauseSession(s):{...s,running:true,remainder:0,reason:'Running. Time pauses at the next visible event.'};
}
export function commandSession(s,actor,task){
 const game=requestTask(s.game,actor,task);
 return {...pauseSession(s,game.lastResponse.reason),game};
}
export function stopSession(s,actor){
 const game=interruptTask(s.game,actor);
 return {...pauseSession(s,game.lastResponse?.reason??'Stopped. Paid work and recovery remain; unused supplies return.'),game};
}
export function proposeSession(s,terms){
 const game=proposePlan(s.game,terms);
 return {...pauseSession(s,game.lastResponse.reason),game};
}
export function interruptDiscussionSession(s,actor='keeper'){
 const game=interruptDiscussion(s.game,actor);
 return {...pauseSession(s,game.lastResponse.reason),game};
}
export function withdrawSession(s){
 const game=withdrawContribution(s.game);
 return {...pauseSession(s,game.lastResponse.reason),game};
}
/** A deliberately bounded public projection; no save, receipts or private actor state. */
export function planNoteContext(game){
 const v=getServicePlanView(game),c=v.coordination,plan=c.current;
 return {minute:v.now,summary:[
  v.morning?'Morning water '+(v.morning.waterService?'kept.':'lost.'):'Morning service pending.',
  'Actual readiness: pump '+c.readiness.pumpWork+'/12 min; inlet '+(c.readiness.supplyAvailable?'available.':'unavailable.'),
  plan?'Agreement '+plan.id+' '+plan.status+': ready by '+plan.terms.readyBy+', wait until '+plan.terms.waitUntil+', '+(plan.terms.fallback==='cart'?'cart fallback.':'no cart fallback.'):'No accepted clinic agreement.',
  plan?'Promised contribution '+plan.contribution.status+'; actual ready '+(plan.actualReadyAt===null?'not yet recorded.':'at '+plan.actualReadyAt+'.'):'No promised contribution.',
  c.pending?'Proposal '+c.pending.id+' under discussion; no answer to these terms yet.':'No discussion underway.',
  c.lastResponse?'Latest response: '+c.lastResponse.stage+' '+(c.lastResponse.accepted?'accepted':'declined or ended')+' at '+c.lastResponse.at+'.':'No plan response yet.',
  v.delivery?'Clinic received '+v.delivery.units+' of 2 units.':'No clinic delivery completed.',
  v.outcome?'Day closed at '+v.outcome.at+'.':'Day in progress.'
 ]};
}
function boundaryReason(before,game){
 if(game.outcome)return 'The clinic intake closed. Review both service outcomes below.';
 if(!getServicePlanView(before).morning&&getServicePlanView(game).morning)return 'The morning surge has passed. Your people, work and remaining supplies carry into the clinic obligation.';
 const old=getServicePlanView(before),v=getServicePlanView(game),plan=v.coordination.current;
 if(old.coordination.pending&&!v.coordination.pending)return v.coordination.lastResponse?.reason??'The discussion ended. Check the current agreement.';
 if(plan&&old.now<plan.terms.readyBy&&v.now===plan.terms.readyBy&&!v.coordination.readiness.ready)return 'The promised readiness time has arrived, but the pump and inlet are not ready. '+(plan.status==='active'?'Deniz’s agreed wait still ends at '+plan.terms.waitUntil+'.':'Check the fallback and Deniz’s next choice.');
 if(plan?.status==='active'&&old.now<plan.terms.pumpStartAt&&v.now===plan.terms.pumpStartAt&&!v.coordination.readiness.ready)return 'Your promised pump start has arrived. Choose whether to stop recovery and begin the work.';
 return 'A visible event occurred. Check the day record and each person’s work before continuing.';
}
export function stepSession(s,mode='event'){
 if(!['event','minute'].includes(mode))throw new Error('Unknown time step.');
 const game=advanceTo(s.game,mode==='event'?nextVisibleEvent(s.game):s.game.clock.now+1);
 return {...pauseSession(s,boundaryReason(s.game,game)),game};
}
export function tickSession(s,milliseconds,speed=1){
 if(!Number.isFinite(milliseconds)||milliseconds<0||![1,4].includes(speed))throw new Error('Invalid playback interval or speed.');
 if(!s.running||s.game.outcome)return s;
 const accumulated=s.remainder+Math.min(milliseconds,1000)/1000*speed,minutes=Math.floor(accumulated);
 if(!minutes)return {...s,remainder:accumulated};
 const boundary=nextVisibleEvent(s.game),game=advanceTo(s.game,Math.min(s.game.clock.now+minutes,boundary));
 if(game.clock.now===boundary||game.outcome)return {...pauseSession(s,boundaryReason(s.game,game)),game};
 return {...s,game,remainder:accumulated-minutes};
}
/** Validate completely before the caller replaces or persists the current game. */
export function importSession(s,raw){
 if(typeof raw!=='string'||raw.length>65536)throw new Error('This file is too large for a shared-promise save.');
 return createSession(restoreServicePlan(JSON.parse(raw)));
}
