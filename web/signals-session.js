/** Presentation clock policy. Wall time and playback are never part of a saved host. */
import {createSignals,getSignalsView,requestTask,interruptTask,advanceTo,nextVisibleEvent} from '../src/games/signals.js';
export function createSession(game=createSignals()){getSignalsView(game);return {game,running:false,remainder:0,reason:game.outcome?'Episode complete. Review the journey below.':'Paused. Choose a route or an observation, then advance time.'};}
export function pauseSession(s,reason='Paused. Choosing and reading use no time.'){return {...s,running:false,remainder:0,reason};}
export function toggleSession(s){if(s.game.outcome)return pauseSession(s,'Episode complete. Start fresh to try another route.');return s.running?pauseSession(s):{...s,running:true,remainder:0,reason:'Running. A completed action or delivered reply will pause time.'};}
export function commandSession(s,task){const game=requestTask(s.game,task);return {...pauseSession(s,game.lastResponse.reason),game};}
export function stopSession(s){return {...pauseSession(s,'Stopped. Paid time, effort and any spent fare remain.'),game:interruptTask(s.game)};}
export function stepSession(s,mode='event'){
 if(!['event','minute'].includes(mode))throw new Error('Unknown time step.');
 const game=advanceTo(s.game,mode==='event'?nextVisibleEvent(s.game):s.game.clock.now+1);
 return {...pauseSession(s,game.outcome?'Episode complete. Review the journey below.':game.sequence>s.game.sequence?'A report arrived. Its observation time may be older than its delivery time.':s.game.clock.now<12&&game.clock.now>=12?'The evening launch stays in harbor. The overnight beacon still needs the lens.':'Paused. Choose the next move when ready.'),game};
}
export function tickSession(s,milliseconds,speed=1){
 if(!Number.isFinite(milliseconds)||milliseconds<0||![1,4].includes(speed))throw new Error('Invalid playback interval or speed.');
 if(!s.running||s.game.outcome)return s;
 const accumulated=s.remainder+Math.min(milliseconds,1000)/1000*speed,minutes=Math.floor(accumulated);
 if(!minutes)return {...s,remainder:accumulated};
 const boundary=nextVisibleEvent(s.game),game=advanceTo(s.game,Math.min(s.game.clock.now+minutes,boundary));
 if(game.clock.now===boundary)return {...pauseSession(s,game.outcome?'Episode complete. Review the journey below.':game.sequence>s.game.sequence?'A report arrived. Read its source and observation time.':s.game.clock.now<12&&game.clock.now>=12?'The evening launch stays in harbor. The overnight beacon still needs the lens.':'Your action finished. Time paused for your next choice.'),game};
 return {...s,game,remainder:accumulated-minutes};
}
