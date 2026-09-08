import {adapters,MODELS} from './adapters.js';
const copy=x=>structuredClone(x),workKind=k=>['a','b'].includes(k);
const finite=(x,min=0,max=1e12)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Invalid host number');};
function validateCommand(c) {
  if(!c||!['a','b','idle','rest','meal'].includes(c.kind))throw new Error('Unknown command');
  finite(c.durationMinutes,0.01,1440);finite(c.effort,0,1);
  if(!workKind(c.kind)&&c.effort!==0)throw new Error('Non-work effort');
}
function validateHost(s) {
  if(s.version!==1||!MODELS.includes(s.model))throw new Error('Invalid comparison host');
  finite(s.minutes);finite(s.food);finite(s.parts);
  for(const x of [s.food,s.parts,s.initialFood,s.initialParts,s.stats.foodConsumed,s.stats.partsConsumed])if(!Number.isSafeInteger(x)||x<0)throw new Error('Invalid resource count');
  if(s.food+s.stats.foodConsumed!==s.initialFood||s.parts+s.stats.partsConsumed!==s.initialParts)throw new Error('Inconsistent resource accounting');
  const total=['workMinutes','restMinutes','mealMinutes','idleMinutes','blockedMinutes','resourceMinutes'].reduce((v,k)=>v+s.stats[k],0);
  if(Math.abs(total-s.minutes)>1e-8||Math.abs(s.person.minutes-s.minutes)>1e-8)throw new Error('Inconsistent time accounting');
  if(Boolean(s.pending)!==Boolean(s.person.pending))throw new Error('Inconsistent pending host');
  return s;
}
export function createHost(model,input,protocol,tuning={}) {
  if(!MODELS.includes(model))throw new Error('Unknown model');
  return validateHost({version:1,model,person:adapters[model].create(input,protocol,tuning),minutes:0,
    food:input.food,parts:input.parts,initialFood:input.food,initialParts:input.parts,pending:null,
    stats:{output:0,workMinutes:0,restMinutes:0,mealMinutes:0,idleMinutes:0,blockedMinutes:0,resourceMinutes:0,
      foodConsumed:0,partsConsumed:0,practiceMinutes:{a:0,b:0},completedCommands:0}});
}
export const inspectHost=s=>adapters[s.model].view(s.person);
export function startCommand(state,command,protocol) {
  validateHost(state);validateCommand(command);if(state.pending)throw new Error('Already pending');
  const next=copy(state),work=workKind(command.kind),resource=(work&&state.parts===0)||(command.kind==='meal'&&state.food===0);
  const action={actionId:resource?'resourceIdle':command.kind,durationMinutes:command.durationMinutes,
    effort:resource?0:command.effort,exertive:work&&!resource,activity:resource?'active':['rest','meal'].includes(command.kind)?command.kind:'active',
    skill:work&&!resource?command.kind:null};
  const adapter=adapters[state.model];next.person=adapter.begin(state.person,action);
  const allowed=adapter.allowed(next.person),status=resource?'resource':!allowed?'blocked':work?'work':command.kind;
  const forecast=work?adapter.forecast(state.person,command.kind,protocol.task):null;
  if(status==='work'){next.parts--;next.stats.partsConsumed++;}
  next.pending={command:copy(command),action,status,forecast,output:protocol.task.output};
  return validateHost(next);
}
export function advanceHost(state,minutes) {
  validateHost(state);if(!state.pending)throw new Error('No pending host command');
  const next=copy(state);next.person=adapters[state.model].advance(state.person,minutes);next.minutes=next.person.minutes;
  next.stats[`${state.pending.status}Minutes`]+=minutes;
  if(state.pending.status==='work')next.stats.practiceMinutes[state.pending.command.kind]+=minutes;
  return validateHost(next);
}
export function finishCommand(state,interrupted=false) {
  validateHost(state);if(!state.pending)throw new Error('No pending host command');
  const {status,forecast,output}=state.pending,p=state.person.pending;
  if(!interrupted&&p.elapsedMinutes<p.action.durationMinutes-1e-10)throw new Error('Incomplete host interval');
  const next=copy(state),consumed=status==='meal'&&!interrupted;
  next.person=adapters[state.model].finish(state.person,{attemptId:p.id,status:status==='blocked'?'blocked':interrupted?'interrupted':'completed',mealConsumed:consumed});
  if(consumed){next.food--;next.stats.foodConsumed++;}
  if(status==='work'&&!interrupted)next.stats.output+=forecast*output;
  next.stats.completedCommands++;next.pending=null;return validateHost(next);
}
export const executeCommand=(state,command,protocol)=>finishCommand(advanceHost(startCommand(state,command,protocol),command.durationMinutes));
export function exportHost(state) {validateHost(state);return {format:'mechanism-comparison-host',version:1,state:{...copy(state),person:adapters[state.model].export(state.person)}};}
export function restoreHost(record) {
  if(record.format!=='mechanism-comparison-host'||record.version!==1||!MODELS.includes(record.state?.model))throw new Error('Invalid host snapshot');
  return validateHost({...copy(record.state),person:adapters[record.state.model].restore(record.state.person)});
}
const summary=s=>({minutes:s.minutes,food:s.food,parts:s.parts,stats:copy(s.stats),view:inspectHost(s)});
const decode=([kind,durationMinutes,effort])=>({kind,durationMinutes,effort});
export const scheduleFor=c=>Array.from({length:c.repeat},()=>c.cycle.map(decode)).flat();
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
export function compareRuns(human,small,protocol) {
  if(JSON.stringify(human.offered)!==JSON.stringify(small.offered)||JSON.stringify(human.initialInput)!==JSON.stringify(small.initialInput))throw new Error('Unmatched protocol inputs');
  const disagreements=[],forecastDiffs=[];
  for(let i=0;i<human.trace.length;i++) {
    const a=human.trace[i],b=small.trace[i];
    if(a.status!==b.status)disagreements.push({step:i+1,human:a.status,small:b.status});
    if(a.status==='work'&&b.status==='work')forecastDiffs.push(Math.abs(a.forecast-b.forecast));
  }
  const outputDifference=small.final.stats.output-human.final.stats.output;
  const offeredOutput=human.offered.filter(c=>workKind(c.kind)).length*protocol.task.output;
  const meanForecastDifference=forecastDiffs.length?forecastDiffs.reduce((a,b)=>a+b,0)/forecastDiffs.length:0;
  const sameResources=human.final.food===small.final.food&&human.final.parts===small.final.parts;
  return {equivalent:disagreements.length===0&&sameResources&&Math.abs(outputDifference)<=protocol.equivalence.outputFractionOfOffered*offeredOutput+1e-12&&meanForecastDifference<=protocol.equivalence.meanForecastAbsoluteDifference,
    outputDifference,offeredOutput,meanForecastDifference,jointlyAdmittedWork:forecastDiffs.length,disagreements,sameResources};
}
export function runSchedule(condition,protocol,tuning={}) {
  const commands=scheduleFor(condition),human=runOne('human',condition,commands,protocol,tuning),small=runOne('small',condition,commands,protocol,tuning);
  return {id:condition.id,kind:'schedule',human,small,comparison:compareRuns(human,small,protocol)};
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
    const comparison=compareRuns(arms[arm].human.exposure,arms[arm].small.exposure,protocol);
    comparison.retests=Object.fromEntries(['a','b'].map(k=>[k,{sameAdmission:arms[arm].human.retests[k].status===arms[arm].small.retests[k].status,
      forecastDifference:arms[arm].small.retests[k].forecast-arms[arm].human.retests[k].forecast}]));
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
