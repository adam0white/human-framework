export const CONDITION_VERSION='0.1.0';

export const DEFAULT_CONDITION_RULES=Object.freeze({
  awakeFatiguePerMinute:0.0005,
  awakeHungerPerMinute:0.0005,
  sleepFatigueRecoveryPerMinute:0.001,
  sleepHungerPerMinute:0.00025
});

const copy=value=>structuredClone(value);
const clamp=value=>Math.max(0,Math.min(1,value));

function finiteUnit(value,name) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)throw new Error(`Invalid ${name}`);
}

function minute(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`Invalid ${name}`);
}

function validateRules(rules) {
  if(!rules||typeof rules!=='object'||Array.isArray(rules))throw new Error('Invalid condition rules');
  const fields=['awakeFatiguePerMinute','awakeHungerPerMinute','sleepFatigueRecoveryPerMinute','sleepHungerPerMinute'];
  if(Reflect.ownKeys(rules).length!==fields.length||fields.some(field=>!Object.hasOwn(rules,field)))throw new Error('Invalid condition rules');
  for(const field of fields)finiteUnit(rules[field],`condition rule ${field}`);
  return rules;
}

function validateCondition(condition) {
  if(!condition||typeof condition!=='object'||Array.isArray(condition))throw new Error('Invalid daily condition');
  const fields=['version','now','mode','awakeMinutes','sleepMinutes','rules'];
  if(Reflect.ownKeys(condition).length!==fields.length||fields.some(field=>!Object.hasOwn(condition,field)))throw new Error('Invalid daily condition');
  if(condition.version!==CONDITION_VERSION)throw new Error('Incompatible daily condition version');
  minute(condition.now,'condition time');
  if(!['awake','sleep'].includes(condition.mode))throw new Error('Invalid condition mode');
  minute(condition.awakeMinutes,'awake minutes');minute(condition.sleepMinutes,'sleep minutes');
  if(condition.awakeMinutes+condition.sleepMinutes!==condition.now)throw new Error('Inconsistent condition elapsed time');
  validateRules(condition.rules);
  return condition;
}

function validateBody(body) {
  if(!body||typeof body!=='object'||Array.isArray(body)||Reflect.ownKeys(body).length!==2||!Object.hasOwn(body,'fatigue')||!Object.hasOwn(body,'hunger'))throw new Error('Invalid condition body');
  finiteUnit(body.fatigue,'body fatigue');finiteUnit(body.hunger,'body hunger');
  return body;
}

export function createDailyCondition({now=0,mode='awake',rules=DEFAULT_CONDITION_RULES}={}) {
  minute(now,'condition time');
  if(now!==0)throw new Error('Daily condition must start at zero');
  const condition={version:CONDITION_VERSION,now,mode,awakeMinutes:0,sleepMinutes:0,rules:copy(rules)};
  return copy(validateCondition(condition));
}

export function advanceDailyCondition(condition,body,{to,mode}) {
  validateCondition(condition);validateBody(body);minute(to,'condition advance');
  if(to<condition.now)throw new Error('Condition time cannot move backward');
  if(!['awake','sleep'].includes(mode))throw new Error('Invalid condition mode');
  const elapsed=to-condition.now,rules=condition.rules,next=copy(condition),nextBody=copy(body);
  if(mode==='awake') {
    nextBody.fatigue=clamp(body.fatigue+rules.awakeFatiguePerMinute*elapsed);
    nextBody.hunger=clamp(body.hunger+rules.awakeHungerPerMinute*elapsed);
    next.awakeMinutes+=elapsed;
  } else {
    nextBody.fatigue=clamp(body.fatigue-rules.sleepFatigueRecoveryPerMinute*elapsed);
    nextBody.hunger=clamp(body.hunger+rules.sleepHungerPerMinute*elapsed);
    next.sleepMinutes+=elapsed;
  }
  next.now=to;next.mode=mode;
  return copy({condition:validateCondition(next),body:validateBody(nextBody)});
}

/** Advance lived chronology without applying background body rules. */
export function advanceDailyClock(condition,{to,mode='awake'}) {
  validateCondition(condition);minute(to,'condition advance');
  if(to<condition.now)throw new Error('Condition time cannot move backward');
  if(!['awake','sleep'].includes(mode))throw new Error('Invalid condition mode');
  const next=copy(condition),elapsed=to-condition.now;
  if(mode==='awake')next.awakeMinutes+=elapsed;
  else next.sleepMinutes+=elapsed;
  next.now=to;next.mode=mode;
  return copy(validateCondition(next));
}

export function restoreDailyCondition(condition) {
  return copy(validateCondition(condition));
}
