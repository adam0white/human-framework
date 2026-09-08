import {createGame,startJob,requestProject,advanceToNextEvent,advanceGame,getGameView,PROJECTS} from './commons.js';
export const APPROACHES=['build-first','stock-first'];
/** Authored game controllers. They consume only the public, rounded observation. */
export function chooseCommand(view,approach='build-first') {
  if(!APPROACHES.includes(approach))throw new Error('Unknown Common Ground approach');
  const can=id=>view.choices.find(c=>c.id===id&&!c.unavailable),start=id=>({type:'start',jobId:id});
  const order=approach==='build-first'?['workbench','garden','shelter']:['shelter','garden','workbench'];
  const remaining=order.filter(p=>view.structures[p]<2);
  if(!view.solo&&view.commitment.status!=='accepted')return {type:'request',projectId:remaining.at(-1)??'cache'};
  if(view.people.player.job)return {type:'advance'};
  const body=view.people.player.body;
  if(body.hunger>=.60)return start(can('eat')?'eat':'forage');
  if(body.fatigue>=.65)return start('rest');
  const assigned=view.commitment.status==='accepted'?view.commitment.project:null;
  const target=remaining.find(p=>p!==assigned)??remaining[0]??'cache';
  const build=can(`build-${target}`);
  if(approach==='stock-first') {
    if(view.stock.food<3)return start('forage');
    if(view.stock.timber<9&&can('gather-timber'))return start('gather-timber');
    if(view.stock.salvage<6&&can('gather-salvage'))return start('gather-salvage');
  }
  if(build)return start(build.id);
  const cost=PROJECTS[target].stages[target==='cache'?0:view.structures[target]].cost;
  for(const [r,n] of Object.entries(cost))if(view.stock[r]<n){const id=r==='timber'?'gather-timber':'gather-salvage';if(can(id))return start(id);}
  if(view.people.neighbor?.job?.id===`build-${target}`)return {type:'advance'};
  // Capacity forecasts can be conservative by one observation step. Recovery
  // is an explicit paid command, never a substituted or cost-free attempt.
  if(body.hunger>.45)return start(can('eat')?'eat':'forage');
  return start('rest');
}
export function applyCommand(game,command) {
  if(command.type==='start')return startJob(game,command.jobId);
  if(command.type==='request')return requestProject(game,command.projectId);
  if(command.type==='advance')return game.clock.queue.length?advanceToNextEvent(game):advanceGame(game,1);
  throw new Error('Unknown Common Ground command');
}
export function runApproach({solo=false,policy='build-first',maxMinutes=4000}={}) {
  let game=createGame({solo}),commands=0;
  while(game.milestoneAt===null&&game.clock.now<maxMinutes&&commands<5000){game=applyCommand(game,chooseCommand(getGameView(game),policy));commands++;}
  return {policy,solo,complete:game.milestoneAt!==null,minutes:game.clock.now,milestoneAt:game.milestoneAt,commands,structures:game.structures,stock:game.stock,pendingJobs:Object.values(game.jobs).filter(Boolean).map(j=>({id:j.id,remaining:j.endsAt-game.clock.now,reserved:j.cost})),stats:game.stats};
}
