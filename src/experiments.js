import {ENGINE_VERSION,MODULES,PARAMETERS,createSimulation,step,getView,runSimulation} from './core/index.js';
import {scenarios,getScenario} from './scenarios/index.js';

export const VARIANTS=[
  {id:'full',label:'Full loop',options:{policy:'full'}},
  {id:'baseline',label:'Static task utility',options:{policy:'baseline'}},
  ...Object.keys(MODULES).map(module=>({id:`without-${module}`,label:{body:'No body coupling',beliefs:'No hazard updates or inspection value',commitments:'No promise weighting',learning:'No practice updates or learning value',relationships:'No relationship coupling'}[module],options:{policy:'full',modules:{[module]:false}}}))
];

const mean=values=>values.reduce((sum,v)=>sum+v,0)/values.length;

// A legible player strategy, not a fitted human model or an optimal planner.
// It directs the first person through the same one-person command used by the UI;
// any partner continues with the full policy. All inputs come from getView.
export function runRecoveryProbe(scenario,{seed=7}={}) {
  let state=createSimulation(scenario,{seed});
  const actorId=scenario.actors[0].id;
  while(state.status==='running') {
    const view=getView(state,actorId);
    const meal=view.actions.find(a=>a.kind==='eat');
    const rest=view.actions.find(a=>a.kind==='rest');
    const work=view.actions.filter(a=>a.kind==='work').sort((a,b)=>a.effort-b.effort||a.id.localeCompare(b.id,'en'))[0];
    if(!work)throw new Error('Recovery probe requires a work action');
    const chosen=view.actor.body.hunger>=0.6&&view.world.food>0&&meal?meal:
      view.actor.body.fatigue>=0.65&&rest?rest:work;
    state=step(state,{type:'act',actorId,actionId:chosen.id});
  }
  return state;
}

export function summarizeRun(state) {
  const decisions=state.history.flatMap(h=>h.decisions);
  const work=new Set(state.scenario.actions.filter(a=>a.kind==='work').map(a=>a.id));
  const kind=d=>d.actionKind??state.scenario.actions.find(a=>a.id===d.actionId)?.kind;
  const workDecisions=decisions.filter(d=>kind(d)==='work');
  return {
    objectiveProgress:state.world.progress,
    objectiveCompletion:Math.min(1,state.world.progress/state.scenario.target),
    objectiveSuccess:state.status==='won'?1:0,
    fatigue:mean(state.actors.map(a=>a.body.fatigue)),
    hunger:mean(state.actors.map(a=>a.body.hunger)),
    promisesKept:state.actors.filter(a=>a.commitment?.fulfilled).length,
    promisesExpired:state.actors.filter(a=>a.commitment?.expired).length,
    promisesPending:state.actors.filter(a=>a.commitment&&!a.commitment.fulfilled&&!a.commitment.expired).length,
    skillGain:state.actors.reduce((sum,a)=>sum+Object.entries(a.skills).reduce((g,[skill,value])=>g+value-state.scenario.actors.find(initial=>initial.id===a.id).skills[skill],0),0),
    observations:decisions.reduce((sum,d)=>sum+d.observations.filter(o=>o.kind==='hazard-report').length,0),
    decisions:decisions.length,
    workRequests:decisions.filter(d=>work.has(d.requestedActionId??d.actionId)).length,
    executedWork:workDecisions.length,
    workAttempts:workDecisions.length,
    workSuccesses:workDecisions.filter(d=>d.outcome.success).length,
    forcedRecoveries:decisions.filter(d=>d.intervention).length,
    restActions:decisions.filter(d=>kind(d)==='rest').length,
    eatActions:decisions.filter(d=>kind(d)==='eat').length,
    foodUsed:state.scenario.food-state.world.food,
    rounds:state.round,
    simulatedMinutes:state.minutes
  };
}

// Excludes policy-specific deliberation text/scores but includes observable results,
// body, beliefs, learning, commitments and random draws. Same forced actions should
// make these equal even though the full/baseline score explanations differ.
function behaviorSignature(state) {
  return JSON.stringify({round:state.round,status:state.status,world:state.world,actors:state.actors,
    events:state.history.map(h=>h.decisions.map(({actorId,requestedActionId,actionId,actionKind,intervention,observations,diagnostics,outcome,changes})=>({actorId,requestedActionId,actionId,actionKind,intervention,observations,diagnostics,outcome,changes})))});
}

function pairedDifference(full,other) {
  const values=full.map((v,i)=>v-other[i]),average=mean(values);
  const pairedSE=values.length<2?null:Math.sqrt(values.reduce((sum,v)=>sum+(v-average)**2,0)/(values.length-1)/values.length);
  return {mean:average,pairedSE,interval95:pairedSE===null?null:[average-1.96*pairedSE,average+1.96*pairedSE]};
}

export function compareModels({seeds=100,startSeed=101}={}) {
  if(!Number.isInteger(seeds)||seeds<1||seeds>1000)throw new Error('seeds must be an integer in [1, 1000]');
  if(!Number.isInteger(startSeed)||startSeed<0||startSeed+seeds-1>4294967295)throw new Error('startSeed and seed range must fit unsigned 32-bit integers');
  const started=performance.now();
  const seedValues=Array.from({length:seeds},(_,i)=>startSeed+i);
  const results=scenarios.map(preset=>{
    const scenario=getScenario(preset.id);
    const variants=VARIANTS.map(variant=>{
      const runs=seedValues.map(seed=>{
        const before=performance.now();
        const state=runSimulation(scenario,{...variant.options,seed});
        const runtimeMs=performance.now()-before;
        return {seed,status:state.status,metrics:{...summarizeRun(state),runtimeMs}};
      });
      const means=Object.fromEntries(Object.keys(runs[0].metrics).map(metric=>[metric,mean(runs.map(r=>r.metrics[metric]))]));
      return {id:variant.id,label:variant.label,options:variant.options,means,runs};
    });
    const full=variants[0];
    const comparisons=variants.slice(1).map(other=>({against:other.id,direction:'full minus comparator',metrics:
      Object.fromEntries(Object.keys(full.means).map(metric=>[metric,pairedDifference(full.runs.map(r=>r.metrics[metric]),other.runs.map(r=>r.metrics[metric]))]))}));
    const probeRuns=seedValues.map(seed=>{
      const before=performance.now(),state=runRecoveryProbe(scenario,{seed});
      return {seed,status:state.status,metrics:{...summarizeRun(state),runtimeMs:performance.now()-before}};
    });
    const feasibilityProbe={description:'Direct the first person: eat at observed hunger >= 60% when food remains; otherwise rest at observed fatigue >= 65%; otherwise choose the lowest-effort work. Any partner uses the full policy. This is an observable, seed-independent playability probe, not an optimal or calibrated human policy.',
      means:Object.fromEntries(Object.keys(probeRuns[0].metrics).map(metric=>[metric,mean(probeRuns.map(r=>r.metrics[metric]))])),runs:probeRuns};
    // Structural null: only a single work action remains, commitments removed.
    // The complete simulation modules still operate, but choice cannot differ.
    const nullScenario={...structuredClone(scenario),id:`${scenario.id}-null`,actions:[scenario.actions.find(a=>a.kind==='work')],
      actors:scenario.actors.map(({commitment,...actor})=>actor)};
    const nullPairs=seedValues.map(seed=>{
      const fullState=runSimulation(nullScenario,{seed,policy:'full'});
      const baselineState=runSimulation(nullScenario,{seed,policy:'baseline'});
      return {seed,equal:behaviorSignature(fullState)===behaviorSignature(baselineState)};
    });
    return {id:scenario.id,title:scenario.title,target:scenario.target,horizon:scenario.horizon,roundMinutes:scenario.roundMinutes,
      variants,comparisons,feasibilityProbe,nullControl:{description:'One requested work action, no commitments, same active modules, mandatory capacity guard and keyed random draws.',
        allEqual:nullPairs.every(p=>p.equal),equalPairs:nullPairs.filter(p=>p.equal).length,pairs:nullPairs}};
  });
  return {format:'human-framework-benchmark',version:1,engineVersion:ENGINE_VERSION,seeds,seedValues,parameters:{...PARAMETERS},scenarioSnapshots:structuredClone(scenarios),
    methodology:{parameters:'Authored toy settings; no human-data calibration or tuning to make full win.',
      developmentSeeds:'Default evaluation uses 101 onward; initial manual examples use 1–20. Automated checks also exercise evaluation seeds. This is a reproducibility convention, not untouched held-out data or external empirical validation.',
      pairing:'Identical seed for each scenario/model pair; core random draws keyed by seed, round, actor and purpose. Divergent policies visit different states.',
      uncertainty:'Mean paired difference ± 1.96 × sample paired standard error; descriptive Monte Carlo variability only. Not a human-population confidence interval; small samples and multiple comparisons are exploratory.',
      runtime:'Wall-clock runtime is machine/load/order dependent; variants run in fixed order. Timing differences are descriptive, not a controlled performance comparison.',
      metrics:'Work requests are distinguished from executed work. Mandatory capacity interventions count as forced recoveries and as the actual rest/eat action; they are shared by all policies and ablations. Hazard-belief and practice ablations each disable updating and the corresponding inspection/learning value, while retaining initial beliefs/proficiency. They are coupled interventions, not isolated causal effects. Final-state progress and mean actor fatigue; promises are attempted actions by due date, not moral judgments; learning is summed task proficiency gain; observations count actual hazard reports; successful early termination shortens exposure.'},
    results,elapsedMs:performance.now()-started};
}
