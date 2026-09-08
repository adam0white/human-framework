/** Wall time is presentation state. It is never exported with the world. */
import {createService,getServiceView,requestTask,interruptTask,advanceTo,nextVisibleEvent,restoreService} from '../src/games/service.js';

export function createSession(game=createService()){
 getServiceView(game);
 return {game,running:false,remainder:0,reason:game.outcome?'The day is complete. Review the two service outcomes.':'Paused. Choose your work or make a request, then advance time.'};
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
function boundaryReason(before,game){
 if(game.outcome)return 'The clinic intake closed. Review both service outcomes below.';
 if(!getServiceView(before).morning&&getServiceView(game).morning)return 'The morning surge has passed. Your people, work and remaining supplies carry into the clinic obligation.';
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
 if(typeof raw!=='string'||raw.length>65536)throw new Error('This file is too large for a service-day save.');
 return createSession(restoreService(JSON.parse(raw)));
}
