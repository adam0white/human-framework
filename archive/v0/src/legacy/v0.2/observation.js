import {clone,clamp} from './model.js';

export function perceivedBody(actor) {
  const bias=actor.observationBias??0;
  return {fatigue:clamp(Math.round((actor.body.fatigue+bias)*20)/20),hunger:clamp(Math.round(actor.body.hunger*20)/20)};
}
export function getView(state,actorId) {
  const actor=state.actors.find(a=>a.id===actorId);
  if(!actor)throw new Error('Unknown actor');
  const s=state.scenario;
  return clone({
    scenario:{id:s.id,title:s.title,subtitle:s.subtitle??'',brief:s.brief,objective:s.objective,hazardLabel:s.hazardLabel??'Conditions',theme:s.theme??'courier'},
    round:state.round,minutes:state.minutes,horizon:s.horizon,roundMinutes:s.roundMinutes,status:state.status,
    options:{policy:state.options.policy,modules:state.options.modules},
    world:{progress:state.world.progress,target:s.target,food:state.world.food,resourceLabel:s.resourceLabel},
    actor:{id:actor.id,name:actor.name,role:actor.role,body:perceivedBody(actor),skills:actor.skills,beliefs:actor.beliefs,priorities:actor.priorities,commitment:actor.commitment,relationships:actor.relationships,support:actor.support},
    peers:state.actors.filter(a=>a.id!==actorId).map(a=>({id:a.id,name:a.name,role:a.role,lastAction:a.lastAction,body:perceivedBody(a)})),
    actions:s.actions,
    recentEvents:state.history.flatMap(h=>h.decisions.map(d=>({round:h.round,actorId:d.actorId,actorName:d.actorName,actionLabel:d.actionLabel,outcome:d.outcome}))).slice(-16)
  });
}
