import {ENGINE_VERSION,PARAMETERS,validateScenario,normalizeOptions,clone,clamp,practice,successChance,assessCapacity,actionEffort,remainingGoal} from './model.js';
import {keyedRandom} from './random.js';
import {getView} from './observation.js';
import {rankActions} from './policy.js';

export function createSimulation(scenario,options={}) {
  validateScenario(scenario);
  const s=clone(scenario),opts=normalizeOptions(options);
  const actors=s.actors.map(a=>({...clone(a),beliefs:{hazard:{estimate:s.initialSignal,confidence:s.signalConfidence,source:'initial briefing'}},support:0,lastAction:null,
    commitment:a.commitment?{...a.commitment,fulfilled:false,expired:false}:null,
    relationships:Object.fromEntries(s.actors.filter(p=>p.id!==a.id).map(p=>[p.id,0.5]))}));
  return {version:ENGINE_VERSION,scenario:s,options:opts,round:0,minutes:0,status:remainingGoal(s.initialProgress,s.target)===0?'won':'running',
    world:{progress:s.initialProgress,food:s.food,hazard:s.hazard},actors,history:[],commands:[]};
}

function validateCommand(state,command) {
  if(!command||!['auto','act'].includes(command.type))throw new Error('Invalid command');
  if(command.type==='auto')return {type:'auto'};
  if(!state.actors.some(a=>a.id===command.actorId))throw new Error('Unknown actor');
  if(!state.scenario.actions.some(a=>a.id===command.actionId))throw new Error('Unknown action');
  if(command.intention!==undefined&&(typeof command.intention!=='string'||command.intention.length>1000))throw new Error('Invalid intention');
  return {type:'act',actorId:command.actorId,actionId:command.actionId,...(command.intention!==undefined?{intention:command.intention}:{})};
}

function learn(actor,action,state) {
  const changes={};
  const transfers=[];
  if(!state.options.modules.learning||!action.skill)return {changes,direct:null,transfers};
  const before=actor.skills[action.skill];
  actor.skills[action.skill]=practice(before,state.scenario.roundMinutes);
  const delta=actor.skills[action.skill]-before;
  changes[action.skill]=delta;
  // Transfer only from this event's direct practice. Never recursively traverse a graph.
  for(const link of state.scenario.transfer??[])if(link.from===action.skill) {
    const prev=actor.skills[link.to];
    actor.skills[link.to]=clamp(prev+link.rate*delta);
    changes[link.to]=actor.skills[link.to]-prev;
    transfers.push({from:link.from,to:link.to,rate:link.rate,requestedDelta:link.rate*delta,delta:changes[link.to],provenance:link.provenance});
  }
  return {changes,direct:{skill:action.skill,delta,duration:state.scenario.roundMinutes},transfers};
}

function resolve(state,actor,action,view) {
  const {world,scenario:s,options}=state;
  const before=clone(actor.body),observations=[],diagnostics={actualHazard:world.hazard};
  let success=true,progress=0,reason='',skills={},learning={changes:{},direct:null,transfers:[]};
  // Natural maintenance costs happen exactly once per actor, per simulated interval.
  // Integrate maintenance and the action together; clipping before recovery
  // would erase maintenance at the ceiling and give a free recovery bonus.
  actor.body.fatigue+=PARAMETERS.fatiguePerMinute*s.roundMinutes;
  actor.body.hunger+=PARAMETERS.hungerPerMinute*s.roundMinutes;
  if(action.kind==='work') {
    const chance=successChance(action,actor.skills[action.skill],before,world.hazard,options.modules.relationships?actor.support:0,options.modules.body);
    const roll=keyedRandom(options.seed,state.round,actor.id,'work-outcome');
    Object.assign(diagnostics,{chance,roll});success=roll<chance;
    progress=success?action.output:0;world.progress+=progress;
    actor.body.fatigue+=actionEffort(action);
    actor.support=0;
    learning=learn(actor,action,state);skills=learning.changes;
    reason=success?`Added ${progress} ${s.resourceLabel}.`:`The attempt did not produce a contribution.${learning.direct?' Task practice was credited.':''}`;
    // Work outcome is visible, but does not reveal the hidden cause of failure.
    observations.push({kind:'work-result',success,progress});
  } else if(action.kind==='rest') {
    actor.body.fatigue-=PARAMETERS.restPerMinute*s.roundMinutes;
    reason=clamp(actor.body.fatigue)<before.fatigue?'Rest reduced accumulated fatigue.':'Rest kept fatigue at its minimum.';
  } else if(action.kind==='eat') {
    success=world.food>=1;
    if(success) {world.food-=1;actor.body.hunger-=PARAMETERS.mealRelief;reason='Used one shared ration.';}
    else reason='No ration remained. The attempted meal still used this interval.';
  } else if(action.kind==='observe') {
    const noise=(keyedRandom(options.seed,state.round,actor.id,'observation')*2-1)*s.observationNoise*(1-0.6*actor.skills[action.skill]);
    const estimate=clamp(world.hazard+noise),weight=0.5+0.4*actor.skills[action.skill];
    const previous=actor.beliefs.hazard;
    observations.push({kind:'hazard-report',estimate,source:`${actor.name}'s inspection`,round:state.round+1});
    if(options.modules.beliefs)actor.beliefs.hazard={estimate:previous.estimate*(1-weight)+estimate*weight,confidence:clamp(previous.confidence+(1-previous.confidence)*weight),source:'direct inspection'};
    learning=learn(actor,action,state);skills=learning.changes;
    reason=options.modules.beliefs?'Inspected conditions; revised the working estimate.':'Inspected conditions; belief updating is disabled in this experiment.';
  } else if(action.kind==='help') {
    const perceivedPeer=[...view.peers].sort((a,b)=>(options.modules.body?b.body.fatigue-a.body.fatigue:0)||a.id.localeCompare(b.id,'en'))[0];
    const peer=perceivedPeer?state.actors.find(p=>p.id===perceivedPeer.id):undefined;
    success=Boolean(peer);
    if(peer&&options.modules.relationships)peer.support=clamp(peer.support+PARAMETERS.assistance);
    actor.body.fatigue+=actionEffort(action);
    reason=peer?(options.modules.relationships?`Prepared assistance for ${peer.name}'s next work attempt.`:`Attempted assistance for ${peer.name}; assistance effects are disabled.`):'No partner was available to assist.';
    if(peer)observations.push({kind:'assistance',recipient:peer.id,effective:options.modules.relationships});
  }
  actor.body.fatigue=clamp(actor.body.fatigue);
  actor.body.hunger=clamp(actor.body.hunger);
  const promise=actor.commitment;
  let kept=false;
  if(promise&&!promise.fulfilled&&!promise.expired&&promise.actionId===action.id&&state.round+1<=promise.dueRound) {promise.fulfilled=true;kept=true;}
  if(options.modules.relationships&&kept)for(const peer of state.actors)if(peer.id!==actor.id)peer.relationships[actor.id]=clamp(peer.relationships[actor.id]+PARAMETERS.trustGain);
  actor.lastAction=action.label;
  return {observations,diagnostics,learning,outcome:{success,progress,reason,promiseKept:kept},changes:{fatigue:actor.body.fatigue-before.fatigue,hunger:actor.body.hunger-before.hunger,skills}};
}

export function step(state,command={type:'auto'}) {
  if(state.version!==ENGINE_VERSION)throw new Error('Incompatible engine version');
  if(state.status!=='running')throw new Error('Simulation is finished');
  const canonical=validateCommand(state,command),next=clone(state),decisions=[];
  // Stable serial scheduling is part of the manifest: later actors see earlier public effects.
  for(const actor of next.actors) {
    const view=getView(next,actor.id),scores=rankActions(view),external=canonical.type==='act'&&canonical.actorId===actor.id;
    const actionId=external?canonical.actionId:scores[0].actionId;
    const requested=next.scenario.actions.find(a=>a.id===actionId);
    const intention=external?(canonical.intention??`Attempt ${requested.label.toLowerCase()}`):`Attempt ${requested.label.toLowerCase()}`;
    const actualBefore=clone(actor.body),capacity=assessCapacity(actualBefore,requested,next.scenario.roundMinutes);
    let action=requested,intervention=null;
    if(!capacity.allowed) {
      const hungry=capacity.causes.includes('hunger'),canEat=hungry&&next.world.food>=1;
      // Reserved IDs cannot collide with validated scenario action IDs. Recovery
      // exists even in adapters that offer only exertive choices.
      action=canEat?{id:'_eat',label:'Eat to recover',kind:'eat'}:{id:'_rest',label:'Forced recovery',kind:'rest'};
      intervention={cause:hungry?'hunger':'fatigue',reason:hungry?
        (canEat?'Hunger reached the exertion limit; this interval was used to eat.':'Hunger prevents exertion and no ration remains; this recovery interval cannot relieve hunger.'):
        'There was not enough fatigue capacity to complete the exertion; this interval was used to recover.'};
    }
    const result=resolve(next,actor,action,view);
    result.diagnostics.capacity={...capacity,actualBefore};
    if(intervention)result.outcome.reason=`${intervention.reason} ${result.outcome.reason}`;
    const phaseTrace=[
      {phase:'observe',text:`Working conditions estimate: ${Math.round(view.actor.beliefs.hazard.estimate*100)}%; confidence proxy ${Math.round(view.actor.beliefs.hazard.confidence*100)}%.`},
      {phase:'understand',text:`Perceived fatigue ${Math.round(view.actor.body.fatigue*100)}%; ${view.world.food} shared ration(s) available.`},
      {phase:'weigh',text:`Compared ${scores.length} attempts using ${next.options.policy} policy.`},
      {phase:'choose',text:external?'Player supplied this choice.':`Selected ${requested.label.toLowerCase()} from the recorded ranking.`},
      {phase:'attempt',text:`Intention: ${intention}`},
      {phase:'resolve',text:result.outcome.reason},
      {phase:'learn',text:result.learning.direct?`Direct practice in ${result.learning.direct.skill}.${result.learning.transfers.length?` Separate transfer effects recorded for ${result.learning.transfers.map(t=>t.to).join(', ')}.`:''}`:'No skill practice was credited.'}
    ];
    decisions.push({actorId:actor.id,actorName:actor.name,requestedActionId:requested.id,requestedActionLabel:requested.label,
      actionId:action.id,actionLabel:action.label,actionKind:action.kind,intervention,intention,source:external?'player':'policy',scores,...result,phaseTrace});
  }
  next.round++;next.minutes=next.round*next.scenario.roundMinutes;
  // Due dates concern the promised attempt, regardless of success; no moral-worth inference.
  for(const actor of next.actors) {
    const c=actor.commitment;
    if(c&&!c.fulfilled&&!c.expired&&next.round>=c.dueRound) {
      c.expired=true;
      if(next.options.modules.relationships)for(const peer of next.actors)if(peer.id!==actor.id)peer.relationships[actor.id]=clamp(peer.relationships[actor.id]-PARAMETERS.trustLoss);
    }
  }
  next.world.progress=Math.max(0,next.world.progress-next.scenario.consumption);
  next.status=remainingGoal(next.world.progress,next.scenario.target)===0?'won':next.round>=next.scenario.horizon?'lost':'running';
  next.commands.push(canonical);
  next.history.push({round:next.round,minutes:next.minutes,decisions,world:{progress:next.world.progress,food:next.world.food},status:next.status});
  return next;
}

export function runSimulation(scenario,options={}) {
  let state=createSimulation(scenario,options);
  while(state.status==='running')state=step(state);
  return state;
}
export function exportReplay(state) {
  return clone({format:'human-framework-replay',version:1,engineVersion:ENGINE_VERSION,scenario:state.scenario,options:state.options,commands:state.commands});
}
export function replay(record) {
  if(!record||record.format!=='human-framework-replay'||record.version!==1||record.engineVersion!==ENGINE_VERSION)throw new Error('Incompatible replay format or version');
  if(!Array.isArray(record.commands)||record.commands.length>120)throw new Error('Invalid replay commands');
  let state=createSimulation(record.scenario,record.options);
  for(const command of record.commands)state=step(state,command);
  return state;
}
