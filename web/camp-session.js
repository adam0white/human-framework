import * as story from '../src/games/camp-story.js';
export function createSession(game=story.createGame()){
 story.getGameView(game);return {game,running:false,reason:'Choose a job. Available time lets you recover.',error:null};
}
export function pauseSession(session,reason='Paused. Your work is kept.') {return {...session,running:false,reason,error:null};}
export function playSession(session){const view=story.getGameView(session.game);return {...session,running:view.canAdvance,reason:view.canAdvance?'Time is moving. You can pause or stop work.':view.pauseReason,error:null};}
const operations={
 start:(game,c)=>story.startJob(game,c.job),cancel:game=>story.cancelJob(game),
 request:(game,c)=>story.requestProject(game,c.project),release:game=>story.releaseProject(game),
 handover:(game,c)=>story.requestHandover(game,c.from,c.to),continue:game=>story.continueStory(game),
 allocate:(game,c)=>story.allocateCache(game,c.destination),dispatch:game=>story.dispatchFerry(game),
 finish:game=>story.finishStory(game),return:game=>story.returnToCamp(game),
};
export function commandSession(session,command){
 try{
  if(!command||!Object.hasOwn(operations,command.type))throw new Error('Unknown camp command.');
  const game=operations[command.type](session.game,command),view=story.getGameView(game);
  const reply=['request','release','handover'].includes(command.type)?view.lastResponse?.reason:null;
  return {game,running:false,reason:reply??view.pauseReason??'Your choice is recorded. Advance time when ready.',error:null};
 }catch(error){return {...session,running:false,reason:error.message,error:error.message};}
}
const jobIdentity=job=>job?`${job.id}:${job.startedAt}:${job.workId??''}`:null;
function boundary(before,after){
  if(before.phase!==after.phase||!after.canAdvance)return after.pauseReason??'The next part of your story is ready.';
  if(!before.people.player.job&&!after.people.player.job&&after.choices.some(choice=>!choice.unavailable&&before.choices.find(old=>old.id===choice.id)?.unavailable))return 'You are ready for another kind of work.';
 for(const id of ['player','neighbor']){
  const prior=before.people[id],next=after.people[id];if(!prior||!next)continue;
  if(jobIdentity(prior.job)!==jobIdentity(next.job))return id==='player'?'Your work reached a decision point.':'Meryem has finished or chosen her next work.';
  if(!next.job&&prior.body.fatigue>0&&next.body.fatigue===0)return id==='player'?'You have recovered your strength.':'Meryem has recovered her strength.';
 }
 return null;
}
export function advanceSession(session,minutes){
 if(!Number.isSafeInteger(minutes)||minutes<0||minutes>1440)throw new Error('Advance a whole number of minutes from 0 to 1440.');
 let result={...session,error:null};
 for(let i=0;i<minutes;i++){
  const before=story.getGameView(result.game);
  if(!before.canAdvance)return {...result,running:false,reason:before.pauseReason};
  try{
   const game=story.advanceGame(result.game,1),after=story.getGameView(game),reason=boundary(before,after);
   result={...result,game};if(reason)return {...result,running:false,reason};
  }catch(error){return {...result,running:false,reason:error.message,error:error.message};}
 }
 return result;
}
export function nextEventSession(session){
 try{
  const before=story.getGameView(session.game);if(!before.canAdvance)return pauseSession(session,before.pauseReason);
  const game=story.advanceToNextEvent(session.game),after=story.getGameView(game);
  return {game,running:false,reason:boundary(before,after)??'Paused at the next work or recovery boundary.',error:null};
 }catch(error){return {...session,running:false,reason:error.message,error:error.message};}
}
