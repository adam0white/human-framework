export const ENGINE_VERSION='0.3.0';
export const MODULES=Object.freeze({body:true,beliefs:true,commitments:true,learning:true,relationships:true});
// Engineering defaults for microgames. None is an empirical estimate or a spiritual metric.
export const PARAMETERS=Object.freeze({
  fatiguePerMinute:0.0015,hungerPerMinute:0.002,restPerMinute:0.025,
  mealRelief:0.55,learningPerMinute:0.008,practiceQuality:0.65,
  assistance:0.18,trustGain:0.025,trustLoss:0.04
});
export const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
export const clone=x=>structuredClone(x);
export const actionEffort=action=>action.kind==='work'?action.effort:action.kind==='help'?(action.effort??0.08):0;
// Compare the completion boundary in relative units. Accumulating 0.1 ten
// times must not miss a goal that succeeds after converting to integer units.
export function remainingGoal(progress,target,consumption=0) {
  const gap=target-progress+consumption;
  return gap/target<=1e-12?0:gap;
}

// A simulation capacity contract, shared by all controllers and module ablations.
// Forecasts may use perceived body; execution must use actual body. These proxy
// ceilings do not assert a clinical threshold for fatigue, hunger or agency.
export function assessCapacity(body,action,roundMinutes) {
  const exertive=['work','help'].includes(action.kind);
  const fatigueCost=PARAMETERS.fatiguePerMinute*roundMinutes+actionEffort(action);
  const hungerCost=PARAMETERS.hungerPerMinute*roundMinutes;
  const projectedFatigue=body.fatigue+fatigueCost,projectedHunger=body.hunger+hungerCost;
  const causes=[];
  if(exertive&&projectedFatigue>1+1e-12)causes.push('fatigue');
  if(exertive&&projectedHunger>1+1e-12)causes.push('hunger');
  return {allowed:causes.length===0,causes,fatigueCost,hungerCost,projectedFatigue,projectedHunger};
}

function assertJSON(value,path='scenario',ancestors=new Set(),depth=0) {
  if(depth>24)throw new Error(`${path} exceeds JSON depth limit`);
  if(value===null||typeof value==='boolean'||typeof value==='string')return;
  if(typeof value==='number') {if(!Number.isFinite(value))throw new Error(`${path} must be finite JSON data`);return;}
  if(typeof value!=='object')throw new Error(`${path} must contain only JSON values`);
  if(ancestors.has(value))throw new Error(`${path} contains a JSON cycle`);
  if(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw new Error(`${path} must use plain JSON objects`);
  ancestors.add(value);
  for(const [key,item] of Object.entries(value))assertJSON(item,`${path}.${key}`,ancestors,depth+1);
  ancestors.delete(value);
}

export function finite(value,name,min=0,max=1) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`${name} must be finite in [${min}, ${max}]`);
}
function identifier(s,name) {if(typeof s!=='string'||! /^[a-z][a-z0-9-]{0,63}$/.test(s))throw new Error(`Invalid ${name}`);}
function text(s,name) {if(typeof s!=='string'||s.length>5000)throw new Error(`Invalid ${name}`);}
function unique(items,name) {if(new Set(items).size!==items.length)throw new Error(`Duplicate ${name}`);}
export function validateScenario(s) {
  if(!s||typeof s!=='object')throw new Error('Scenario must be an object');
  assertJSON(s);
  identifier(s.id,'scenario id');
  for(const name of ['title','brief','objective','resourceLabel'])text(s[name],name);
  for(const name of ['hazard','initialSignal','signalConfidence','observationNoise'])finite(s[name],name);
  finite(s.target,'target',0.01,100000);finite(s.initialProgress,'initialProgress',0,s.target);
  finite(s.goalUtility,'goalUtility',0,100000);
  finite(s.food,'food',0,100000);if(!Number.isInteger(s.food))throw new Error('food must be an integer');
  finite(s.consumption,'consumption',0,100000);
  finite(s.roundMinutes,'roundMinutes',0.01,1440);finite(s.horizon,'horizon',1,120);
  if(!Number.isInteger(s.horizon))throw new Error('horizon must be an integer');
  for(const [list,limit] of [['skills',64],['actions',64],['actors',16]])if(!Array.isArray(s[list])||s[list].length<1||s[list].length>limit)throw new Error(`Invalid ${list}`);
  s.skills.forEach(k=>identifier(k,'skill'));unique(s.skills,'skills');
  unique(s.actions.map(a=>a.id),'actions');unique(s.actors.map(a=>a.id),'actors');
  for(const a of s.actions) {
    identifier(a.id,'action id');text(a.label,'action label');text(a.description,'action description');
    if(!['work','rest','eat','observe','help'].includes(a.kind))throw new Error(`Unsupported action kind: ${a.kind}`);
    if(['work','observe'].includes(a.kind)&&!s.skills.includes(a.skill))throw new Error(`Unknown action skill: ${a.skill}`);
    if(a.kind==='work')for(const k of ['difficulty','effort','exposure'])finite(a[k],`action ${k}`);
    if(a.kind==='work')finite(a.output,'action output',0,10000);
    if(a.effort!==undefined)finite(a.effort,'action effort');
  }
  for(const a of s.actors) {
    identifier(a.id,'actor id');text(a.name,'actor name');text(a.role,'actor role');
    if(!a.body||!a.skills||!a.priorities)throw new Error('Actor needs body, skills and priorities');
    for(const k of ['fatigue','hunger'])finite(a.body[k],k);
    for(const k of s.skills)finite(a.skills[k],`skill ${k}`);
    if(Object.keys(a.skills).some(k=>!s.skills.includes(k)))throw new Error('Unknown actor skill');
    for(const k of ['duty','care','caution','mastery'])finite(a.priorities[k],`priority ${k}`);
    if(a.observationBias!==undefined)finite(a.observationBias,'observationBias',-1,1);
    if(a.commitment) {
      if(!s.actions.some(x=>x.id===a.commitment.actionId))throw new Error('Unknown commitment action');
      finite(a.commitment.weight,'commitment weight');finite(a.commitment.dueRound,'commitment dueRound',1,s.horizon);
      if(!Number.isInteger(a.commitment.dueRound))throw new Error('commitment dueRound must be an integer');
    }
  }
  if(s.transfer!==undefined&&!Array.isArray(s.transfer))throw new Error('transfer must be an array');
  const links=new Set();
  for(const t of s.transfer??[]) {
    if(!s.skills.includes(t.from)||!s.skills.includes(t.to)||t.from===t.to)throw new Error('Invalid transfer skills');
    finite(t.rate,'transfer rate',-1,1);text(t.provenance,'transfer provenance');
    const key=`${t.from}/${t.to}`;if(links.has(key))throw new Error('Duplicate transfer link');links.add(key);
  }
  return s;
}
export function normalizeOptions(options={}) {
  const seed=options.seed??1;finite(seed,'seed',0,4294967295);
  if(!Number.isInteger(seed))throw new Error('seed must be an integer');
  const policy=options.policy??'full';if(!['full','baseline','planned-simple'].includes(policy))throw new Error('Unknown policy');
  const modules={...MODULES};
  for(const [k,v] of Object.entries(options.modules??{})) {
    if(!Object.hasOwn(MODULES,k)||typeof v!=='boolean')throw new Error(`Invalid module ${k}`);
    modules[k]=v;
  }
  return {seed,policy,modules};
}
export function practice(skill,duration,quality=PARAMETERS.practiceQuality,rate=PARAMETERS.learningPerMinute) {
  finite(skill,'skill');finite(duration,'duration',0,1e9);finite(quality,'quality');finite(rate,'rate',0,1e6);
  return skill+(1-skill)*(-Math.expm1(-rate*quality*duration));
}
export function retain(skill,duration,rate=0,floor=0) {
  finite(skill,'skill');finite(duration,'duration',0,1e9);finite(rate,'rate',0,1e6);finite(floor,'floor');
  const r=Math.min(floor,skill);return r+(skill-r)*Math.exp(-rate*duration);
}
export function successChance(action,skill,body,hazard,support=0,bodyCoupling=true) {
  const load=bodyCoupling?1.6*body.fatigue+0.8*body.hunger:0;
  const logit=1.25+4*(skill-action.difficulty)-load-2*hazard*action.exposure+support;
  return 1/(1+Math.exp(-logit));
}
