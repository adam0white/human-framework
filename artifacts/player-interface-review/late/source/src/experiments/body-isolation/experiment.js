import {MODELS} from './adapters.js';
import {createHost,inspectHost,startCommand,advanceHost,finishCommand,exportHost,restoreHost} from './host.js';
import {scheduleFor,compareRuns as frozenCompare} from '../mechanism-comparison/experiment.js';
export * from './host.js';
export {scheduleFor};
const copy=x=>structuredClone(x);
export function compareRuns(human,pooled,protocol) {
  const result=frozenCompare(human,pooled,protocol);
  result.disagreements=result.disagreements.map(({small,...rest})=>({...rest,pooled:small}));
  result.diagnostics=diagnose(human,pooled,protocol);
  return result;
}
const summary=s=>({minutes:s.minutes,food:s.food,parts:s.parts,stats:copy(s.stats),view:inspectHost(s)});
function runOne(model,condition,commands,protocol,tuning) {
  let state=createHost(model,condition,protocol,tuning);const trace=[];
  for(const command of commands) {
    state=startCommand(state,command,protocol);
    const entry={command:copy(command),status:state.pending.status,forecast:state.pending.forecast,action:copy(state.pending.action)};
    state=finishCommand(advanceHost(state,command.durationMinutes));trace.push({...entry,end:summary(state)});
  }
  return {initialInput:copy({body:condition.body,skills:condition.skills,food:condition.food,parts:condition.parts,task:protocol.task}),
    offered:copy(commands),trace,final:summary(state),state};
}
export function runSchedule(condition,protocol,tuning={}) {
  const commands=scheduleFor(condition),human=runOne('human',condition,commands,protocol,tuning),pooled=runOne('pooled',condition,commands,protocol,tuning);
  return {id:condition.id,kind:'schedule',human,pooled,comparison:compareRuns(human,pooled,protocol)};
}
export function runRetest(condition,protocol,tuning={}) {
  const r=protocol.retest,arms={};
  for(const arm of ['a','b','idle']) {
    const commands=[...Array.from({length:r.exposureIntervals},()=>({kind:arm,durationMinutes:r.exposureMinutes,effort:arm==='idle'?0:r.exposureEffort})),
      {kind:'rest',durationMinutes:r.restMinutes,effort:0},{kind:'meal',durationMinutes:r.mealMinutes,effort:0}];
    arms[arm]={};
    for(const model of MODELS) {
      const exposure=runOne(model,condition,commands,protocol,tuning),retests={};
      for(const task of ['a','b']) {
        let branch=restoreHost(JSON.parse(JSON.stringify(exportHost(exposure.state))));
        branch=startCommand(branch,{kind:task,durationMinutes:r.testMinutes,effort:r.testEffort},protocol);
        const status=branch.pending.status,forecast=branch.pending.forecast;
        branch=finishCommand(advanceHost(branch,r.testMinutes));retests[task]={status,forecast,final:summary(branch)};
      }
      arms[arm][model]={exposure,endpoint:summary(exposure.state),retests};
    }
    const comparison=compareRuns(arms[arm].human.exposure,arms[arm].pooled.exposure,protocol);
    comparison.retests=Object.fromEntries(['a','b'].map(k=>[k,{sameAdmission:arms[arm].human.retests[k].status===arms[arm].pooled.retests[k].status,
      forecastDifference:arms[arm].pooled.retests[k].forecast-arms[arm].human.retests[k].forecast}]));
    comparison.equivalent&&=Object.values(comparison.retests).every(t=>t.sameAdmission&&Math.abs(t.forecastDifference)<=protocol.equivalence.retestForecastAbsoluteDifference);
    arms[arm].comparison=comparison;
  }
  return {id:condition.id,kind:'retest',arms};
}
// CLI supplies this only after checking committed source bytes against its freeze manifest.
export function runPartition(protocol,partition,{verifiedFreeze=false}={}) {
  if(!['development','reserved','sensitivity'].includes(partition))throw new Error('Unknown partition');
  if(partition!=='development'&&!verifiedFreeze)throw new Error('Reserved/sensitivity results require verified freeze');
  const run=(conditions,tuning)=>conditions.map(c=>c.kind==='retest'?runRetest(c,protocol,tuning):runSchedule(c,protocol,tuning));
  return partition==='sensitivity'?protocol.sensitivity.map(tuning=>({tuning,conditions:run([...protocol.development,...protocol.reserved],tuning)})):
    run(protocol[partition],{});
}

// Arithmetic diagnostics describe authored causes; they do not infer human mechanisms.
function diagnose(human,pooled,protocol) {
  const initial=run=>({skills:run.initialInput.skills,load:1.6*run.initialInput.body.fatigue+.8*run.initialInput.body.hunger});
  let hBefore=initial(human),pBefore=initial(pooled);
  const d={matchedExposureChecks:0,maxMatchedExposureSkillError:0,maxCumulativePracticeError:0,maxForecastLogitResidual:0,
    jointOutputGap:0,pooledOnlyOutput:0,humanOnlyOutput:0,boundaryEndpointCounts:{human:0,pooled:0},workSteps:[]};
  const logit=p=>Math.log(p/(1-p));
  for(let i=0;i<human.trace.length;i++) {
    const h=human.trace[i],p=pooled.trace[i];
    for(const [model,run,entry] of [['human',human,h],['pooled',pooled,p]]) {
      if(Object.values(entry.end.view.body).some(v=>v===0||v===1))d.boundaryEndpointCounts[model]++;
      for(const skill of ['a','b']) {
        const expected=run.initialInput.skills[skill]+(1-run.initialInput.skills[skill])*(1-Math.exp(-.0052*entry.end.stats.practiceMinutes[skill]));
        d.maxCumulativePracticeError=Math.max(d.maxCumulativePracticeError,Math.abs(expected-entry.end.view.skills[skill]));
      }
    }
    for(const skill of ['a','b'])if(h.end.stats.practiceMinutes[skill]===p.end.stats.practiceMinutes[skill]) {
      d.matchedExposureChecks++;d.maxMatchedExposureSkillError=Math.max(d.maxMatchedExposureSkillError,Math.abs(h.end.view.skills[skill]-p.end.view.skills[skill]));
    }
    if(['a','b'].includes(h.command.kind)) {
      const skill=h.command.kind,skillLogitGap=4*(pBefore.skills[skill]-hBefore.skills[skill]),bodyLogitGap=-(pBefore.load-hBefore.load);
      const residual=logit(p.forecast)-logit(h.forecast)-skillLogitGap-bodyLogitGap;
      d.maxForecastLogitResidual=Math.max(d.maxForecastLogitResidual,Math.abs(residual));
      d.workSteps.push({step:i+1,skill,humanStatus:h.status,pooledStatus:p.status,skillLogitGap,bodyLogitGap,residual});
      if(h.status==='work'&&p.status==='work')d.jointOutputGap+=(p.forecast-h.forecast)*protocol.task.output;
      else if(h.status==='work')d.humanOnlyOutput+=h.forecast*protocol.task.output;
      else if(p.status==='work')d.pooledOnlyOutput+=p.forecast*protocol.task.output;
    }
    hBefore=h.end.view;pBefore=p.end.view;
  }
  return d;
}
