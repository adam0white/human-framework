import {adapters,MODELS} from './adapters.js';
// Controlled duplication of frozen host: its adapter registry is closed over.
const copy=x=>structuredClone(x),workKind=k=>['a','b'].includes(k);
const finite=(x,min=0,max=1e12)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Invalid host number');};
const fields=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==keys.length||Object.keys(x).some(k=>!keys.includes(k)))throw new Error('Invalid host fields');};
function validateCommand(c) {
  fields(c,['kind','durationMinutes','effort']);
  if(!c||!['a','b','idle','rest','meal'].includes(c.kind))throw new Error('Unknown command');
  finite(c.durationMinutes,0.01,1440);finite(c.effort,0,1);
  if(!workKind(c.kind)&&c.effort!==0)throw new Error('Non-work effort');
}
function validateHost(s) {
  fields(s,['version','model','person','minutes','food','parts','initialFood','initialParts','pending','stats','task']);
  fields(s.stats,['output','workMinutes','restMinutes','mealMinutes','idleMinutes','blockedMinutes','resourceMinutes','foodConsumed','partsConsumed','practiceMinutes','completedCommands']);
  fields(s.stats.practiceMinutes,['a','b']);for(const [k,v] of Object.entries(s.stats))if(k!=='practiceMinutes')finite(v);
  for(const v of Object.values(s.stats.practiceMinutes))finite(v);
  if(Math.abs(s.stats.practiceMinutes.a+s.stats.practiceMinutes.b-s.stats.workMinutes)>1e-8||!Number.isSafeInteger(s.stats.completedCommands))throw new Error('Inconsistent exposure/command accounting');
  fields(s.task,['difficulty','hazard','exposure','output']);for(const v of Object.values(s.task))finite(v);
  if(s.version!==1||!MODELS.includes(s.model))throw new Error('Invalid comparison host');
  finite(s.minutes);finite(s.food);finite(s.parts);
  for(const x of [s.food,s.parts,s.initialFood,s.initialParts,s.stats.foodConsumed,s.stats.partsConsumed])if(!Number.isSafeInteger(x)||x<0)throw new Error('Invalid resource count');
  if(s.food+s.stats.foodConsumed!==s.initialFood||s.parts+s.stats.partsConsumed!==s.initialParts)throw new Error('Inconsistent resource accounting');
  const total=['workMinutes','restMinutes','mealMinutes','idleMinutes','blockedMinutes','resourceMinutes'].reduce((v,k)=>v+s.stats[k],0);
  if(Math.abs(total-s.minutes)>1e-8||Math.abs(s.person.minutes-s.minutes)>1e-8)throw new Error('Inconsistent time accounting');
  if(Boolean(s.pending)!==Boolean(s.person.pending))throw new Error('Inconsistent pending host');
  if(s.pending) {
    const h=s.pending,p=s.person.pending,a=adapters[s.model];
    fields(h,['command','action','status','forecast','output']);validateCommand(h.command);
    const resource=h.status==='resource',work=workKind(h.command.kind);
    if(resource&&!((work&&s.parts===0)||(h.command.kind==='meal'&&s.food===0)))throw new Error('Inconsistent resource refusal');
    const expectedAction={actionId:resource?'resourceIdle':h.command.kind,durationMinutes:h.command.durationMinutes,
      effort:resource?0:h.command.effort,exertive:work&&!resource,activity:resource?'active':['rest','meal'].includes(h.command.kind)?h.command.kind:'active',skill:work&&!resource?h.command.kind:null};
    if(JSON.stringify(h.action)!==JSON.stringify(expectedAction)||Object.entries(expectedAction).some(([k,v])=>p.action[k]!==v))throw new Error('Inconsistent pending action');
    const expectedStatus=resource?'resource':!a.allowed(s.person)?'blocked':work?'work':h.command.kind;
    if(h.status!==expectedStatus||(h.status==='work'&&s.stats.partsConsumed<1)||(h.status==='meal'&&s.food<1))throw new Error('Inconsistent pending status/ownership');
    const forecast=work?a.forecast(a.baseline(s.person),h.command.kind,s.task):null;
    if(h.forecast!==forecast||h.output!==s.task.output)throw new Error('Inconsistent pending forecast');
  }
  return s;
}
export function createHost(model,input,protocol,tuning={}) {
  if(!MODELS.includes(model))throw new Error('Unknown model');
  return validateHost({version:1,model,person:adapters[model].create(input,protocol,tuning),minutes:0,task:copy(protocol.task),
    food:input.food,parts:input.parts,initialFood:input.food,initialParts:input.parts,pending:null,
    stats:{output:0,workMinutes:0,restMinutes:0,mealMinutes:0,idleMinutes:0,blockedMinutes:0,resourceMinutes:0,
      foodConsumed:0,partsConsumed:0,practiceMinutes:{a:0,b:0},completedCommands:0}});
}
export const inspectHost=s=>adapters[s.model].view(s.person);
export function startCommand(state,command,protocol) {
  validateHost(state);validateCommand(command);if(JSON.stringify(protocol.task)!==JSON.stringify(state.task))throw new Error('Host task changed');if(state.pending)throw new Error('Already pending');
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
export function exportHost(state) {validateHost(state);return {format:'body-isolation-host',version:1,state:{...copy(state),person:adapters[state.model].export(state.person)}};}
export function restoreHost(record) {
  fields(record,['format','version','state']);
  if(record.format!=='body-isolation-host'||record.version!==1||!MODELS.includes(record.state?.model))throw new Error('Invalid host snapshot');
  return validateHost({...copy(record.state),person:adapters[record.state.model].restore(record.state.person)});
}
