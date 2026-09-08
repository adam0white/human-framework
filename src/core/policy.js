import {successChance,clamp,normalizeOptions,actionEffort,assessCapacity,remainingGoal} from './model.js';

/** Pure deliberation: this function only accepts the actor-accessible projection. */
export function rankActions(view,overrides={}) {
  const options=normalizeOptions({...view.options,...overrides,modules:{...view.options.modules,...overrides.modules}});
  const {actor,world,actions,peers}=view;
  const modules=options.modules;
  const body=modules.body?actor.body:{fatigue:0,hunger:0};
  const remaining=remainingGoal(world.progress,world.target,world.consumption);
  const remainingRounds=Math.max(1,view.horizon-view.round);
  // Goal value is authored independently of resource units. No action-set
  // maximum appears here: adding an unused option cannot rescale work value.
  const taskValue=output=>output/world.target*world.goalUtility;
  const plannedRecovery=options.policy==='planned-simple'?
    (body.hunger>=.6&&world.food>=1&&actions.some(a=>a.kind==='eat')?'eat':
      body.fatigue>=.65&&actions.some(a=>a.kind==='rest')?'rest':null):null;
  return actions.map(action=>{
    const contributions=[];
    const add=(label,value)=>contributions.push({label,value});
    let forecast=null;
    let selectionTier=1,selectionReason='';
    const commitment=actor.commitment;
    const capacity=assessCapacity(body,action,view.roundMinutes);
    const perceivedBlocked=options.policy==='full'&&modules.body&&!capacity.allowed;
    if(perceivedBlocked) {
      selectionTier=0;
      selectionReason=`Perceived ${capacity.causes.join(' and ')} capacity prevents this exertion.`;
    }
    if(options.policy==='baseline'||options.policy==='planned-simple') {
      // Same action access/objective, fixed utility with skill; no adaptive appraisal.
      add('Fixed task utility',action.kind==='work'?taskValue(action.output)*(0.35+0.65*actor.skills[action.skill]):action.kind==='rest'?0.25:action.kind==='eat'?0.2:0.1);
      if(options.policy==='planned-simple') {
        selectionTier=action.kind===plannedRecovery?2:action.kind==='work'?1:0;
        selectionReason=action.kind===plannedRecovery?
          `Planned ${plannedRecovery==='eat'?'meal: perceived hunger reached 60%':'rest: perceived fatigue reached 65%'}.`:
          action.kind==='work'?'Fixed work preference after planned recovery checks.':'Fallback when no work or planned recovery is available.';
      }
    } else if(action.kind==='work') {
      forecast=perceivedBlocked?0:successChance(action,actor.skills[action.skill],body,actor.beliefs.hazard.estimate,modules.relationships?actor.support:0,modules.body);
      const usefulOutput=Math.min(action.output,remaining);
      add('Expected goal progress',forecast*taskValue(usefulOutput));
      // A bounded opportunity-pressure heuristic, not a multistep planner or
      // an estimated probability of eventual victory. Own work closes a
      // fraction of the public remaining gap, including end-of-round use.
      add('Deadline opportunity',remaining>0?world.goalUtility*forecast*(usefulOutput/remaining)/remainingRounds:0);
      add('Effort under current strain',-action.effort*(0.6+2*body.fatigue));
      add('Perceived exposure',-actor.priorities.caution*actor.beliefs.hazard.estimate*action.exposure*0.7);
      add(modules.learning?'Practice interest':'Practice updates unavailable',modules.learning&&!perceivedBlocked?actor.priorities.mastery*(1-actor.skills[action.skill])*0.3:0);
    } else if(action.kind==='rest') {
      add('Recovery need',body.fatigue*body.fatigue*3.7);
      add('Time cost',-0.15);
    } else if(action.kind==='eat') {
      add('Hunger relief',world.food>0?body.hunger*body.hunger*3.8:-1);
      add('Shared ration cost',world.food>0?-0.18:0);
    } else if(action.kind==='observe') {
      const exposure=Math.max(0,...actions.filter(a=>a.kind==='work').map(a=>a.exposure));
      const horizon=clamp((view.horizon-view.round)/4);
      add(modules.beliefs?'Uncertainty worth investigating':'Inspection updates unavailable',modules.beliefs?(1-actor.beliefs.hazard.confidence)*exposure*horizon*(0.8+actor.priorities.caution)*2:0);
      add('Time cost',-0.15);
    } else if(action.kind==='help') {
      const peerNeed=modules.body?Math.max(0,...peers.map(p=>p.body.fatigue)):0;
      const trust=peers.length?peers.reduce((sum,p)=>sum+(actor.relationships[p.id]??0.5),0)/peers.length:0;
      add('Care and partner need',modules.relationships?actor.priorities.care*peerNeed*trust*2.5:0);
      add('Time and effort',-0.15-actionEffort(action));
    }
    if(options.policy==='full'&&modules.commitments&&commitment&&!commitment.fulfilled&&!commitment.expired&&commitment.actionId===action.id) {
      const urgency=1+1/Math.max(1,commitment.dueRound-view.round);
      add('Recognized promise',perceivedBlocked?0:commitment.weight*actor.priorities.duty*urgency);
    }
    const score=contributions.reduce((s,x)=>s+x.value,0);
    return {actionId:action.id,score,forecast,contributions,selectionTier,selectionReason};
  }).sort((a,b)=>b.selectionTier-a.selectionTier||b.score-a.score||a.actionId.localeCompare(b.actionId,'en'));
}
