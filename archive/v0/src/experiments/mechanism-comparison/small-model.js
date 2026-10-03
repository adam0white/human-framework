// Independent experimental stamina/counter model. No Human/model/runtime import.
const copy=x=>structuredClone(x),clamp=x=>Math.max(0,Math.min(1,x));
const number=(x,lo=0,hi=1)=>{if(!Number.isFinite(x)||x<lo||x>hi)throw new Error('Invalid small-model number');};
const fields=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==keys.length||Object.keys(x).some(k=>!keys.includes(k)))throw new Error('Invalid small-model fields');};
const rate=p=>p.parameters.learningPerMinute*p.learningScale;
const skill=(p,k)=>p.initialSkills[k]+(1-p.initialSkills[k])*Math.min(1,p.practice[k]*rate(p));
function validate(p) {
  fields(p,['version','stamina','initialSkills','practice','parameters','learningScale','recoveryScale','minutes','nextAttempt','pending']);
  if(p.version!=='small-1'||!p.initialSkills||!p.practice)throw new Error('Invalid small-model snapshot');
  const keys=Object.keys(p.initialSkills);if(keys.length>64||keys.some(k=>!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(k)))throw new Error('Invalid small skills');
  fields(p.practice,keys);
  fields(p.parameters,['drainPerMinute','effortWeight','restPerMinute','mealRelief','learningPerMinute']);
  for(const x of Object.values(p.parameters))number(x,Number.MIN_VALUE,1);
  number(p.learningScale,0.01,10);number(p.recoveryScale,0.01,10);
  number(p.stamina);number(p.minutes,0,1e12);number(p.nextAttempt,1,Number.MAX_SAFE_INTEGER);
  if(!Number.isSafeInteger(p.nextAttempt))throw new Error('Invalid small attempt counter');
  for(const k of Object.keys(p.initialSkills)){number(p.initialSkills[k]);number(p.practice[k],0,1/rate(p));}
  if(p.pending) {
    const a=p.pending;fields(a,['id','action','elapsedMinutes','allowed','before','practiceBefore','startedAt']);
    fields(a.practiceBefore,keys);number(a.before);number(a.startedAt,0,1e12);
    number(a.elapsedMinutes,0,a.action.durationMinutes);
    if(a.id!==`small:${p.nextAttempt-1}`||Math.abs(p.minutes-a.startedAt-a.elapsedMinutes)>1e-8)throw new Error('Inconsistent small pending time');
    const expected=transition({...p,stamina:a.before,practice:a.practiceBefore},a,a.elapsedMinutes);
    if(Math.abs(expected.stamina-p.stamina)>1e-10||Object.keys(p.practice).some(k=>Math.abs(expected.practice[k]-p.practice[k])>1e-10))throw new Error('Inconsistent small pending state');
    if(a.allowed!==allows({...p,stamina:a.before},a.action))throw new Error('Inconsistent small capacity');
  }
  return p;
}
function allows(p,a) {return !a.exertive||p.stamina+1e-12>=p.parameters.drainPerMinute*a.durationMinutes+p.parameters.effortWeight*a.effort;}
function transition(p,a,elapsed) {
  let change=-p.parameters.drainPerMinute*elapsed;
  const practice={...p.practice};
  if(a.allowed) {
    if(a.action.activity==='rest')change+=p.parameters.restPerMinute*p.recoveryScale*elapsed;
    if(a.action.activity==='active') {
      change-=p.parameters.effortWeight*a.action.effort*elapsed/a.action.durationMinutes;
      if(a.action.skill)practice[a.action.skill]=Math.min(1/rate(p),practice[a.action.skill]+elapsed);
    }
  }
  return {stamina:clamp(p.stamina+change),practice};
}
export function createSmall(input,parameters,{learningScale=1,recoveryScale=1}={}) {
  number(input.body.fatigue);number(input.body.hunger);
  return copy(validate({version:'small-1',stamina:1-(2*input.body.fatigue+input.body.hunger)/3,
    initialSkills:input.skills,practice:Object.fromEntries(Object.keys(input.skills).map(k=>[k,0])),
    parameters,learningScale,recoveryScale,minutes:0,nextAttempt:1,pending:null}));
}
export function viewSmall(p) {validate(p);return {load:2.4*(1-p.stamina),body:{stamina:p.stamina},skills:Object.fromEntries(Object.keys(p.initialSkills).map(k=>[k,skill(p,k)]))};}
export function beginSmall(p,action) {
  validate(p);if(p.pending)throw new Error('Pending small attempt');
  if(p.nextAttempt===Number.MAX_SAFE_INTEGER)throw new Error('Small attempt IDs exhausted');
  number(action.durationMinutes,0.01,1440);number(action.effort);
  if(!['active','rest','meal'].includes(action.activity)||typeof action.exertive!=='boolean'||(!action.exertive&&action.effort!==0)||
    (action.activity!=='active'&&(action.skill||action.exertive))||(action.skill&&!Object.hasOwn(p.practice,action.skill)))throw new Error('Invalid small action');
  const next=copy(p);next.pending={id:`small:${p.nextAttempt}`,action:copy(action),elapsedMinutes:0,
    allowed:allows(p,action),before:p.stamina,practiceBefore:{...p.practice},startedAt:p.minutes};next.nextAttempt++;return next;
}
export function advanceSmall(p,elapsed) {
  validate(p);if(!p.pending)throw new Error('No pending small attempt');
  number(elapsed,0,p.pending.action.durationMinutes-p.pending.elapsedMinutes);
  const next=copy(p),total=p.pending.elapsedMinutes+elapsed;
  // Compute from the attempt baseline so serialized partial intervals replay exactly.
  Object.assign(next,transition({...p,stamina:p.pending.before,practice:p.pending.practiceBefore},p.pending,total));
  next.pending.elapsedMinutes=total;next.minutes=p.pending.startedAt+total;return next;
}
export function finishSmall(p,result) {
  validate(p);const a=p.pending;if(!a||a.id!==result.attemptId)throw new Error('No matching small pending attempt');
  if(!['completed','interrupted','blocked'].includes(result.status)||(!a.allowed&&result.status!=='blocked')||(a.allowed&&result.status==='blocked'))throw new Error('Invalid small outcome');
  if(result.status==='completed'&&a.elapsedMinutes<a.action.durationMinutes)throw new Error('Incomplete small interval');
  if(result.mealConsumed&&(a.action.activity!=='meal'||result.status!=='completed'))throw new Error('Invalid small meal receipt');
  const next=copy(p);if(result.mealConsumed)next.stamina=clamp(next.stamina+p.parameters.mealRelief*p.recoveryScale);next.pending=null;return next;
}
export const exportSmall=p=>copy(validate(p));
export const restoreSmall=p=>copy(validate(p));
