/** Presentation-only clock policy; never saved as world state. */
import {createWatch,requestTask,interruptTask,advanceTo,nextEvent,getWatchView} from '../src/games/watch.js';
export function createSession(game=createWatch()){getWatchView(game);return {game,running:false,remainder:0,reason:game.outcome?'The water arrived. Review the outcome or try another approach.':'Paused. Choose work for either person, then advance time.'};}
export function pauseSession(session,reason='Paused. Your choices do not use time.'){return {...session,running:false,remainder:0,reason};}
export function toggleSession(session){if(session.game.outcome)return pauseSession(session,'The water arrived. Start a new episode to play again.');return session.running?pauseSession(session):{...session,running:true,remainder:0,reason:'Running. Time will pause when either person finishes a job.'};}
export function commandSession(session,actor,task){const game=requestTask(session.game,actor,task);return {...pauseSession(session,game.lastResponse.accepted?'Paused. Start the other person’s work, or advance time.':`Paused: ${game.lastResponse.reason}`),game};}
export function stopSession(session,actor){return {...pauseSession(session,'Paused. Paid work remains; unused reserved supplies returned to their owner.'),game:interruptTask(session.game,actor)};}
function moved(session,target,reason){const game=advanceTo(session.game,target);return {...pauseSession(session,game.outcome?'The water arrived. Review the outcome below.':reason),game};}
export function stepSession(session,mode='event'){
  if(!['event','minute'].includes(mode))throw new Error('Unknown time step.');
  return moved(session,mode==='event'?nextEvent(session.game):session.game.clock.now+1,mode==='event'?'Paused at the next event. Choose what happens next.':'Paused after one minute.');
}
export function tickSession(session,milliseconds,speed=1){
  if(!Number.isFinite(milliseconds)||milliseconds<0||![1,4].includes(speed))throw new Error('Invalid playback interval or speed.');
  if(!session.running||session.game.outcome)return session;
  const accumulated=session.remainder+Math.min(milliseconds,1000)/1000*speed,minutes=Math.floor(accumulated);
  if(!minutes)return {...session,remainder:accumulated};
  const game=advanceTo(session.game,Math.min(session.game.clock.now+minutes,nextEvent(session.game)));
  if(game.outcome)return {...pauseSession(session,'The water arrived. Review the outcome below.'),game};
  if(game.stats.completed>session.game.stats.completed)return {...pauseSession(session,'A job finished. Time paused so you can choose the next move.'),game};
  return {...session,game,remainder:accumulated-minutes};
}
