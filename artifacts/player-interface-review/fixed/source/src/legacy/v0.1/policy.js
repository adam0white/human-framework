import {successChance,clamp,normalizeOptions} from './model.js';

/** Pure deliberation: this function only accepts the actor-accessible projection. */
export function rankActions(view,overrides={}) {
  const options=normalizeOptions({...view.options,...overrides,modules:{...view.options.modules,...overrides.modules}});
  const {actor,world,actions,peers}=view;
  const modules=options.modules;
  const body=modules.body?actor.body:{fatigue:0,hunger:0};
  return actions.map(action=>{
    const contributions=[];
    const add=(label,value)=>contributions.push({label,value});
    let forecast=null;
    const commitment=actor.commitment;
    if(options.policy==='baseline') {
      // Same action access/objective, fixed utility with skill; no adaptive appraisal.
      add('Fixed task utility',action.kind==='work'?action.output*(0.35+0.65*actor.skills[action.skill]):action.kind==='rest'?0.25:action.kind==='eat'?0.2:0.1);
    } else if(action.kind==='work') {
      forecast=successChance(action,actor.skills[action.skill],body,actor.beliefs.hazard.estimate,modules.relationships?actor.support:0,modules.body);
      add('Expected contribution',forecast*action.output);
      add('Effort under current strain',-action.effort*(0.6+2*body.fatigue));
      add('Perceived exposure',-actor.priorities.caution*actor.beliefs.hazard.estimate*action.exposure*0.7);
      add('Practice interest',actor.priorities.mastery*(1-actor.skills[action.skill])*0.3);
    } else if(action.kind==='rest') {
      add('Recovery need',body.fatigue*body.fatigue*3.7);
      add('Time cost',-0.15);
    } else if(action.kind==='eat') {
      add('Hunger relief',world.food>0?body.hunger*body.hunger*3.8:-1);
      add('Shared ration cost',world.food>0?-0.18:0);
    } else if(action.kind==='observe') {
      const exposure=Math.max(0,...actions.filter(a=>a.kind==='work').map(a=>a.exposure));
      const horizon=clamp((view.horizon-view.round)/4);
      add('Uncertainty worth investigating',(1-actor.beliefs.hazard.confidence)*exposure*horizon*(0.8+actor.priorities.caution)*2);
      add('Time cost',-0.15);
    } else if(action.kind==='help') {
      const peerNeed=modules.body?Math.max(0,...peers.map(p=>p.body.fatigue)):0;
      const trust=peers.length?peers.reduce((sum,p)=>sum+(actor.relationships[p.id]??0.5),0)/peers.length:0;
      add('Care and partner need',modules.relationships?actor.priorities.care*peerNeed*trust*2.5:0);
      add('Time and effort',-0.15-(action.effort??0));
    }
    if(options.policy==='full'&&modules.commitments&&commitment&&!commitment.fulfilled&&!commitment.expired&&commitment.actionId===action.id) {
      const urgency=1+1/Math.max(1,commitment.dueRound-view.round);
      add('Recognized promise',commitment.weight*actor.priorities.duty*urgency);
    }
    const score=contributions.reduce((s,x)=>s+x.value,0);
    return {actionId:action.id,score,forecast,contributions};
  }).sort((a,b)=>b.score-a.score||a.actionId.localeCompare(b.actionId,'en'));
}
