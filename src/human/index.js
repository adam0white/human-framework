import {PARAMETERS,practice,successChance,assessCapacity,clamp,finite} from '../core/model.js';

export const HUMAN_VERSION='0.1.0';
export {PARAMETERS};
const copy=value=>structuredClone(value);
const activities=['active','rest','meal'];

function object(value,name,keys) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name}`);
  if(Object.keys(value).some(key=>!keys.includes(key)))throw new Error(`Unknown ${name} field`);
}
function identity(value,name) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}
function body(value) {
  object(value,'body',['fatigue','hunger']);
  finite(value.fatigue,'fatigue');finite(value.hunger,'hunger');
}
function skills(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('Invalid skills');
  if(Object.keys(value).length>64)throw new Error('Too many skills');
  for(const [key,level] of Object.entries(value)) {identity(key,'skill');finite(level,`skill ${key}`);}
}

/** The caller supplies actual body for execution, perceived body for forecasting. */
export function assessEffort(condition,{durationMinutes,effort=0,exertive=false}) {
  body(condition);finite(durationMinutes,'durationMinutes',0.01,1440);finite(effort,'effort');
  if(typeof exertive!=='boolean'||(!exertive&&effort!==0))throw new Error('Effort requires exertion');
  return assessCapacity(condition,{kind:exertive?'work':'observe',effort},durationMinutes);
}

export function estimateSuccess({skill,body:condition,difficulty,hazard=0,exposure=0}) {
  body(condition);finite(skill,'skill');finite(difficulty,'difficulty');finite(hazard,'hazard');finite(exposure,'exposure');
  return successChance({difficulty,exposure},skill,condition,hazard);
}

function actionSpec(input,knownSkills) {
  object(input,'attempt',['actionId','targetId','durationMinutes','effort','exertive','activity','skill']);
  const action={actionId:input.actionId,targetId:input.targetId??null,durationMinutes:input.durationMinutes,
    effort:input.effort??0,exertive:input.exertive??false,activity:input.activity??'active',skill:input.skill??null};
  identity(action.actionId,'actionId');if(action.targetId!==null)identity(action.targetId,'targetId');
  finite(action.durationMinutes,'durationMinutes',0.01,1440);finite(action.effort,'effort');
  if(typeof action.exertive!=='boolean'||(!action.exertive&&action.effort!==0))throw new Error('Effort requires exertion');
  if(!activities.includes(action.activity))throw new Error('Unknown human activity');
  if(action.activity!=='active'&&(action.exertive||action.effort||action.skill!==null))throw new Error('Recovery cannot claim exertion or practice');
  if(action.skill!==null) {
    identity(action.skill,'practice skill');
    if(!Object.hasOwn(knownSkills,action.skill))throw new Error('Unknown practice skill');
  }
  return action;
}

function validatePerson(person) {
  object(person,'person',['version','id','body','skills','observationBias','minutes','nextAttempt','pending']);
  if(person.version!==HUMAN_VERSION)throw new Error('Incompatible human component version');
  identity(person.id,'person id');body(person.body);skills(person.skills);
  finite(person.observationBias,'observationBias',-1,1);finite(person.minutes,'minutes',0,1e12);
  finite(person.nextAttempt,'nextAttempt',1,Number.MAX_SAFE_INTEGER);
  if(!Number.isSafeInteger(person.nextAttempt))throw new Error('Invalid attempt counter');
  if(person.pending!==null) {
    const pending=person.pending;
    object(pending,'pending',['id','action','elapsedMinutes','capacity','bodyBefore','skillBefore','startedAt']);
    if(person.nextAttempt<2||pending.id!==`${person.id}:${person.nextAttempt-1}`)throw new Error('Inconsistent pending attempt ID');
    const action=actionSpec(pending.action,person.skills);
    finite(pending.elapsedMinutes,'elapsedMinutes',0,action.durationMinutes);
    if(pending.elapsedMinutes>person.minutes+1e-9)throw new Error('Pending duration exceeds elapsed person time');
    body(pending.bodyBefore);
    finite(pending.startedAt,'attempt start',0,1e12);
    if(Math.abs(person.minutes-(pending.startedAt+pending.elapsedMinutes))>1e-8)throw new Error('Inconsistent elapsed person time');
    const expected=assessEffort(pending.bodyBefore,action);
    if(JSON.stringify(expected)!==JSON.stringify(pending.capacity))throw new Error('Inconsistent pending capacity');
    const duration=pending.elapsedMinutes,allowed=expected.allowed;
    const fatigue=clamp(pending.bodyBefore.fatigue+PARAMETERS.fatiguePerMinute*duration+
      (allowed&&action.activity==='active'?action.effort*duration/action.durationMinutes:0)-
      (allowed&&action.activity==='rest'?PARAMETERS.restPerMinute*duration:0));
    const hunger=clamp(pending.bodyBefore.hunger+PARAMETERS.hungerPerMinute*duration);
    if(Math.abs(person.body.fatigue-fatigue)>1e-10||Math.abs(person.body.hunger-hunger)>1e-10)throw new Error('Inconsistent pending body state');
    if(action.skill!==null) {
      finite(pending.skillBefore,'practice before');
      const expectedSkill=allowed?practice(pending.skillBefore,duration):pending.skillBefore;
      if(Math.abs(person.skills[action.skill]-expectedSkill)>1e-10)throw new Error('Inconsistent pending practice');
    } else if(pending.skillBefore!==null)throw new Error('Unexpected practice baseline');
  }
  return person;
}

export function createPerson(input) {
  object(input,'person setup',['id','body','skills','observationBias']);
  return copy(validatePerson({version:HUMAN_VERSION,id:input.id,body:input.body,skills:input.skills,
    observationBias:input.observationBias??0,minutes:0,nextAttempt:1,pending:null}));
}

/** A detached observation, never the authoritative capacity assessment. */
export function getPersonView(person) {
  validatePerson(person);
  const pending=person.pending;
  return copy({id:person.id,body:{fatigue:clamp(Math.round((person.body.fatigue+person.observationBias)*20)/20),
    hunger:clamp(Math.round(person.body.hunger*20)/20)},skills:person.skills,minutes:person.minutes,
    pending:pending?{id:pending.id,actionId:pending.action.actionId,targetId:pending.action.targetId,
      activity:pending.action.activity,durationMinutes:pending.action.durationMinutes,elapsedMinutes:pending.elapsedMinutes}:null});
}

export function beginAttempt(person,input) {
  validatePerson(person);if(person.pending)throw new Error('An attempt is already pending');
  if(person.nextAttempt===Number.MAX_SAFE_INTEGER)throw new Error('Attempt ID space exhausted');
  const action=actionSpec(input,person.skills),next=copy(person);
  next.pending={id:`${person.id}:${person.nextAttempt}`,action,elapsedMinutes:0,
    capacity:assessEffort(person.body,action),bodyBefore:copy(person.body),
    skillBefore:action.skill===null?null:person.skills[action.skill],startedAt:person.minutes};
  next.nextAttempt++;
  return next;
}

/** Advance only actual elapsed time. The host owns world time and task effects. */
export function advanceAttempt(person,minutes) {
  validatePerson(person);if(!person.pending)throw new Error('No pending attempt');
  finite(minutes,'elapsed advance',0,1440);
  const pending=person.pending,action=pending.action,remaining=action.durationMinutes-pending.elapsedMinutes;
  if(minutes>remaining+1e-10)throw new Error('Advance exceeds remaining attempt duration');
  const elapsed=Math.min(minutes,remaining),next=copy(person);
  let fatigue=person.body.fatigue+PARAMETERS.fatiguePerMinute*elapsed;
  if(pending.capacity.allowed) {
    if(action.activity==='rest')fatigue-=PARAMETERS.restPerMinute*elapsed;
    if(action.activity==='active') {
      fatigue+=action.effort*elapsed/action.durationMinutes;
      if(action.skill!==null)next.skills[action.skill]=practice(person.skills[action.skill],elapsed);
    }
  }
  next.body={fatigue:clamp(fatigue),hunger:clamp(person.body.hunger+PARAMETERS.hungerPerMinute*elapsed)};
  next.minutes+=elapsed;next.pending.elapsedMinutes=Math.min(action.durationMinutes,pending.elapsedMinutes+elapsed);
  finite(next.minutes,'minutes',0,1e12);
  return next;
}

/** A confirmed host result consumes one attempt. It never resolves a host object. */
export function finishAttempt(person,result) {
  validatePerson(person);
  object(result,'outcome',['attemptId','status','mealConsumed']);
  const pending=person.pending;
  if(!pending||pending.id!==result.attemptId)throw new Error('No matching pending attempt');
  if(!['completed','failed','interrupted','blocked'].includes(result.status))throw new Error('Invalid completion status');
  const consumed=result.mealConsumed??false;
  if(typeof consumed!=='boolean')throw new Error('Invalid meal receipt');
  if(consumed&&(pending.action.activity!=='meal'||result.status!=='completed'))throw new Error('Meal receipt requires completed meal');
  if(!pending.capacity.allowed&&result.status!=='blocked')throw new Error('Blocked exertion cannot execute');
  if(pending.capacity.allowed&&result.status==='blocked')throw new Error('Allowed attempt cannot report capacity blockage');
  if(['completed','failed'].includes(result.status)&&pending.elapsedMinutes<pending.action.durationMinutes-1e-10)throw new Error('Attempt interval is incomplete');
  const next=copy(person);
  // Keep the interval's maintenance even if the visible hunger reached its
  // ceiling while the meal was in progress. Receipt and relief occur once.
  if(consumed)next.body.hunger=clamp(pending.bodyBefore.hunger+PARAMETERS.hungerPerMinute*pending.elapsedMinutes-PARAMETERS.mealRelief);
  next.pending=null;
  return next;
}

export function exportPerson(person) {
  validatePerson(person);
  return copy({format:'human-framework-person',version:1,componentVersion:HUMAN_VERSION,person});
}

export function restorePerson(record) {
  object(record,'person snapshot',['format','version','componentVersion','person']);
  if(record.format!=='human-framework-person'||record.version!==1||record.componentVersion!==HUMAN_VERSION)throw new Error('Incompatible person snapshot');
  return copy(validatePerson(record.person));
}
