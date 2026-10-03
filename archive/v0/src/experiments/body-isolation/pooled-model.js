// A new pooled-body arm. Only practice is shared with frozen Human; no body shadow state.
import {practice} from '../../core/model.js';
const copy=x=>structuredClone(x),clamp=x=>Math.max(0,Math.min(1,x));
const number=(x,lo=0,hi=1)=>{if(!Number.isFinite(x)||x<lo||x>hi)throw new Error('Invalid pooled number');};
const fields=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==keys.length||Object.keys(x).some(k=>!keys.includes(k)))throw new Error('Invalid pooled fields');};
function actionSpec(a,skills) {
  fields(a,['actionId','durationMinutes','effort','exertive','activity','skill']);
  if(typeof a.actionId!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(a.actionId))throw new Error('Invalid pooled action ID');
  number(a.durationMinutes,.01,1440);number(a.effort);
  if(!['active','rest','meal'].includes(a.activity)||typeof a.exertive!=='boolean'||(!a.exertive&&a.effort!==0)||
    (a.activity!=='active'&&(a.skill!==null||a.exertive))||(a.skill!==null&&!Object.hasOwn(skills,a.skill)))throw new Error('Invalid pooled action');
}
const allows=(p,a)=>!a.exertive||p.stamina+1e-12>=p.parameters.drainPerMinute*a.durationMinutes+p.parameters.effortWeight*a.effort;
function transition(p,a,elapsed) {
  let change=-p.parameters.drainPerMinute*elapsed;const skills={...p.skills};
  if(a.allowed) {
    if(a.action.activity==='rest')change+=p.parameters.restPerMinute*p.recoveryScale*elapsed;
    if(a.action.activity==='active') {
      change-=p.parameters.effortWeight*a.action.effort*elapsed/a.action.durationMinutes;
      if(a.action.skill!==null)skills[a.action.skill]=practice(a.skillBefore,elapsed);
    }
  }
  return {stamina:clamp(a.before+change),skills};
}
function validate(p) {
  fields(p,['version','stamina','skills','parameters','recoveryScale','minutes','nextAttempt','pending']);
  if(p.version!=='pooled-body-1')throw new Error('Invalid pooled version');
  if(!p.skills||typeof p.skills!=='object'||Array.isArray(p.skills))throw new Error('Invalid pooled skills');
  const keys=Object.keys(p.skills);if(keys.length>64||keys.some(k=>!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(k)))throw new Error('Invalid pooled skills');
  for(const v of Object.values(p.skills))number(v);
  fields(p.parameters,['drainPerMinute','effortWeight','restPerMinute','mealRelief']);for(const v of Object.values(p.parameters))number(v,Number.MIN_VALUE,1);
  number(p.stamina);number(p.recoveryScale,.01,10);number(p.minutes,0,1e12);number(p.nextAttempt,1,Number.MAX_SAFE_INTEGER);
  if(!Number.isSafeInteger(p.nextAttempt))throw new Error('Invalid pooled attempt counter');
  if(p.pending!==null) {
    const a=p.pending;fields(a,['id','action','elapsedMinutes','allowed','before','skillBefore','startedAt']);actionSpec(a.action,p.skills);
    number(a.before);number(a.elapsedMinutes,0,a.action.durationMinutes);number(a.startedAt,0,1e12);
    if(p.nextAttempt<2||a.id!==`pooled:${p.nextAttempt-1}`||Math.abs(p.minutes-a.startedAt-a.elapsedMinutes)>1e-8)throw new Error('Inconsistent pooled pending time');
    if(a.action.skill===null){if(a.skillBefore!==null)throw new Error('Unexpected pooled skill baseline');}else number(a.skillBefore);
    if(a.allowed!==allows({...p,stamina:a.before},a.action))throw new Error('Inconsistent pooled capacity');
    const expected=transition(p,a,a.elapsedMinutes);
    if(Math.abs(expected.stamina-p.stamina)>1e-10||(a.action.skill!==null&&Math.abs(p.skills[a.action.skill]-(a.allowed?expected.skills[a.action.skill]:a.skillBefore))>1e-10))throw new Error('Inconsistent pooled pending state');
  }
  return p;
}
export function createPooled(input,parameters,{recoveryScale=1}={}) {
  number(input.body.fatigue);number(input.body.hunger);
  return copy(validate({version:'pooled-body-1',stamina:1-(2*input.body.fatigue+input.body.hunger)/3,
    skills:input.skills,parameters,recoveryScale,minutes:0,nextAttempt:1,pending:null}));
}
export function viewPooled(p) {validate(p);return {load:2.4*(1-p.stamina),body:{stamina:p.stamina},skills:{...p.skills}};}
export function beginPooled(p,action) {
  validate(p);if(p.pending)throw new Error('Pending pooled attempt');actionSpec(action,p.skills);
  if(p.nextAttempt===Number.MAX_SAFE_INTEGER)throw new Error('Pooled attempt IDs exhausted');
  const next=copy(p);next.pending={id:`pooled:${p.nextAttempt}`,action:copy(action),elapsedMinutes:0,allowed:allows(p,action),
    before:p.stamina,skillBefore:action.skill===null?null:p.skills[action.skill],startedAt:p.minutes};next.nextAttempt++;return next;
}
export function advancePooled(p,elapsed) {
  validate(p);if(!p.pending)throw new Error('No pending pooled attempt');number(elapsed,0,p.pending.action.durationMinutes-p.pending.elapsedMinutes);
  const next=copy(p),total=p.pending.elapsedMinutes+elapsed;Object.assign(next,transition(p,p.pending,total));
  next.pending.elapsedMinutes=total;next.minutes=p.pending.startedAt+total;return next;
}
export function finishPooled(p,result) {
  validate(p);fields(result,['attemptId','status','mealConsumed']);const a=p.pending;
  if(!a||a.id!==result.attemptId)throw new Error('No matching pooled pending attempt');
  if(!['completed','interrupted','blocked'].includes(result.status)||(!a.allowed&&result.status!=='blocked')||(a.allowed&&result.status==='blocked'))throw new Error('Invalid pooled outcome');
  if(result.status==='completed'&&a.elapsedMinutes<a.action.durationMinutes-1e-10)throw new Error('Incomplete pooled interval');
  if(typeof result.mealConsumed!=='boolean'||(result.mealConsumed&&(a.action.activity!=='meal'||result.status!=='completed')))throw new Error('Invalid pooled meal receipt');
  const next=copy(p);
  // Preserve all maintenance through a paid meal, including a depleted interval.
  if(result.mealConsumed)next.stamina=clamp(a.before-p.parameters.drainPerMinute*a.elapsedMinutes+p.parameters.mealRelief*p.recoveryScale);
  next.pending=null;return next;
}
export const exportPooled=p=>copy(validate(p));
export const restorePooled=p=>copy(validate(p));
