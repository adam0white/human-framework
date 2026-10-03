export const LEARNING_VERSION='0.1.0';

const FORMAT='human-framework-learning';
const RULE='authored-exponential-retention-v1';
const KINDS=['instruction','practice','retrieval'];
const MAX_ITEMS=64;
const DEFAULT_CONFIG=Object.freeze({
  rule:RULE,
  halfLifeMinutes:43200,
  gainPerMinute:Object.freeze({instruction:.01,practice:.006,retrieval:.008}),
  maxAccessibility:1,
  evidenceHorizonMinutes:129600,
  recentEvidenceLimit:8,
  maxReceipts:512,
});

const copy=value=>structuredClone(value);

function object(value,name,keys) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name} JSON data`);
  const own=Reflect.ownKeys(value);
  if(own.some(key=>typeof key!=='string'||!keys.includes(key)))throw new Error(`Unknown ${name} field`);
  for(const key of own) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name} JSON data`);
  }
  return value;
}

function list(value,name) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw new Error(`Invalid ${name} JSON data`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==value.length+1||!keys.includes('length'))throw new Error(`Invalid ${name} JSON data`);
  for(let index=0;index<value.length;index++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name} JSON data`);
  }
  if(keys.some(key=>key!=='length'&&(typeof key!=='string'||!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length)))throw new Error(`Invalid ${name} JSON data`);
  return value;
}

function assertJsonTree(value,seen=new WeakSet()) {
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number') {
    if(!Number.isFinite(value))throw new Error('Learning data must contain finite JSON numbers');
    return;
  }
  if(typeof value!=='object')throw new Error('Learning state must be JSON data only');
  if(seen.has(value))throw new Error('Learning state must be an unshared JSON data tree');
  seen.add(value);
  if(Array.isArray(value))list(value,'array');
  else object(value,'object',Reflect.ownKeys(value).filter(key=>typeof key==='string'));
  for(const key of Object.keys(value))assertJsonTree(value[key],seen);
}

function identity(value,name) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}

function receiptIdentity(value) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9:_-]{0,119}$/.test(value))throw new Error('Invalid receiptId');
}

function minute(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`${name} must be a nonnegative safe integer`);
}

function positiveInteger(value,name,maximum=Number.MAX_SAFE_INTEGER) {
  if(!Number.isSafeInteger(value)||value<=0||value>maximum)throw new Error(`Invalid ${name}`);
}

function positiveNumber(value,name) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw new Error(`Invalid ${name}`);
}

function validateSkills(skills) {
  list(skills,'skills');
  const seen=new Set();
  for(const id of skills) {
    identity(id,'skill ID');
    if(seen.has(id))throw new Error('Duplicate skill ID');
    seen.add(id);
  }
  if(skills.length>MAX_ITEMS)throw new Error(`Learning supports at most ${MAX_ITEMS} skills`);
  return skills;
}

function makeConfig(input={}) {
  object(input,'learning config',['rule','halfLifeMinutes','gainPerMinute','maxAccessibility','evidenceHorizonMinutes','recentEvidenceLimit','maxReceipts']);
  const gains={...DEFAULT_CONFIG.gainPerMinute};
  if(Object.hasOwn(input,'gainPerMinute')) {
    object(input.gainPerMinute,'learning gains',KINDS);
    Object.assign(gains,input.gainPerMinute);
  }
  return {
    ...DEFAULT_CONFIG,
    ...input,
    gainPerMinute:gains,
  };
}

function validateConfig(config) {
  object(config,'learning config',['rule','halfLifeMinutes','gainPerMinute','maxAccessibility','evidenceHorizonMinutes','recentEvidenceLimit','maxReceipts']);
  for(const field of ['rule','halfLifeMinutes','gainPerMinute','maxAccessibility','evidenceHorizonMinutes','recentEvidenceLimit','maxReceipts'])if(!Object.hasOwn(config,field))throw new Error(`Missing learning config ${field}`);
  if(config.rule!==RULE)throw new Error('Incompatible learning rule');
  positiveNumber(config.halfLifeMinutes,'learning half-life');
  positiveNumber(config.maxAccessibility,'maximum accessibility');
  positiveInteger(config.evidenceHorizonMinutes,'evidence horizon');
  positiveInteger(config.recentEvidenceLimit,'recent evidence limit',64);
  positiveInteger(config.maxReceipts,'receipt limit',4096);
  object(config.gainPerMinute,'learning gains',KINDS);
  for(const kind of KINDS) {
    if(!Object.hasOwn(config.gainPerMinute,kind))throw new Error(`Missing ${kind} gain`);
    positiveNumber(config.gainPerMinute[kind],`${kind} gain`);
  }
  return config;
}

function validateReceipt(receipt,state,priorReceipts=[]) {
  const common=['receiptId','itemId','skillId','kind','attributedTo','startedAt','completedAt','elapsedMinutes','completed'];
  const instruction=[...common,'sourceFactValue'];
  object(receipt,'learning receipt',receipt?.kind==='instruction'?instruction:common);
  for(const field of common)if(!Object.hasOwn(receipt,field))throw new Error(`Missing learning receipt ${field}`);
  receiptIdentity(receipt.receiptId);
  for(const field of ['itemId','skillId','attributedTo'])identity(receipt[field],field);
  if(!state.skills.includes(receipt.skillId))throw new Error('Unknown learning skill ID');
  if(!KINDS.includes(receipt.kind))throw new Error('Invalid learning kind');
  if(receipt.completed!==true)throw new Error('Learning opportunity must be completed');
  minute(receipt.startedAt,'Learning start');minute(receipt.completedAt,'Learning completion');
  positiveInteger(receipt.elapsedMinutes,'positive learning elapsed minutes');
  if(receipt.completedAt-receipt.startedAt!==receipt.elapsedMinutes)throw new Error('Learning elapsed evidence does not match its interval');
  if(receipt.startedAt<state.originAt||receipt.completedAt>state.now)throw new Error('Learning interval lies outside elapsed chronology');
  if(receipt.kind==='instruction') {
    if(!Object.hasOwn(receipt,'sourceFactValue')||typeof receipt.sourceFactValue!=='boolean')throw new Error('Instruction requires a reported sourceFactValue');
  }
  for(const prior of priorReceipts) {
    if(prior.receiptId===receipt.receiptId)throw new Error('Learning receipt ID has already been used');
    if(receipt.startedAt<prior.completedAt&&receipt.completedAt>prior.startedAt)throw new Error('Paid learning intervals cannot overlap');
  }
  return receipt;
}

function decayed(item,at,config) {
  return item.anchoredAccessibility*Math.pow(2,-(at-item.anchoredAt)/config.halfLifeMinutes);
}

function applyReceipt(items,receipt,config) {
  let item=items.find(entry=>entry.id===receipt.itemId);
  if(!item) {
    if(items.length===MAX_ITEMS)throw new Error(`Learning supports at most ${MAX_ITEMS} items`);
    item={id:receipt.itemId,skillId:receipt.skillId,sourceFactValue:null,anchoredAccessibility:0,anchoredAt:receipt.completedAt};
    items.push(item);
  } else if(item.skillId!==receipt.skillId)throw new Error('Learning item cannot change skill');
  if(receipt.kind==='instruction') {
    if(item.sourceFactValue!==null&&item.sourceFactValue!==receipt.sourceFactValue)throw new Error('Conflicting source value requires a distinct learning item');
    item.sourceFactValue=receipt.sourceFactValue;
  }
  item.anchoredAccessibility=Math.min(config.maxAccessibility,
    decayed(item,receipt.completedAt,config)+receipt.elapsedMinutes*config.gainPerMinute[receipt.kind]);
  item.anchoredAt=receipt.completedAt;
}

function validateItem(item,state) {
  object(item,'learning item',['id','skillId','sourceFactValue','anchoredAccessibility','anchoredAt']);
  for(const field of ['id','skillId','sourceFactValue','anchoredAccessibility','anchoredAt'])if(!Object.hasOwn(item,field))throw new Error(`Missing learning item ${field}`);
  identity(item.id,'learning item ID');identity(item.skillId,'learning item skill ID');
  if(!state.skills.includes(item.skillId))throw new Error('Unknown learning item skill ID');
  if(item.sourceFactValue!==null&&typeof item.sourceFactValue!=='boolean')throw new Error('Invalid reported source fact value');
  if(typeof item.anchoredAccessibility!=='number'||!Number.isFinite(item.anchoredAccessibility)||item.anchoredAccessibility<=0||item.anchoredAccessibility>state.config.maxAccessibility)throw new Error('Invalid anchored accessibility');
  minute(item.anchoredAt,'Learning item anchor');
  if(item.anchoredAt>state.now)throw new Error('Learning item is anchored in the future');
}

function validateState(state) {
  assertJsonTree(state);
  object(state,'learning state',['version','ownerId','originAt','now','skills','config','items','receipts']);
  for(const field of ['version','ownerId','originAt','now','skills','config','items','receipts'])if(!Object.hasOwn(state,field))throw new Error(`Missing learning state ${field}`);
  if(state.version!==LEARNING_VERSION)throw new Error('Incompatible learning version');
  if(state.ownerId!==null)identity(state.ownerId,'learning owner ID');
  minute(state.originAt,'Learning origin');minute(state.now,'Learning chronology');
  if(state.now<state.originAt)throw new Error('Learning chronology precedes its origin');
  validateSkills(state.skills);validateConfig(state.config);
  if(state.now-state.originAt>state.config.evidenceHorizonMinutes)throw new Error('Learning evidence horizon exceeded');
  list(state.items,'learning items');list(state.receipts,'learning receipts');
  if(state.items.length>MAX_ITEMS)throw new Error(`Learning supports at most ${MAX_ITEMS} items`);
  if(state.receipts.length>state.config.maxReceipts)throw new Error('Learning receipt limit exceeded');

  const rebuilt=[];let priorCompletion=state.originAt;
  for(let index=0;index<state.receipts.length;index++) {
    const receipt=validateReceipt(state.receipts[index],state,state.receipts.slice(0,index));
    if(receipt.completedAt<priorCompletion)throw new Error('Learning receipts are out of chronological order');
    applyReceipt(rebuilt,receipt,state.config);priorCompletion=receipt.completedAt;
  }
  const ids=new Set();
  for(const item of state.items) {
    validateItem(item,state);
    if(ids.has(item.id))throw new Error('Duplicate learning item ID');
    ids.add(item.id);
  }
  if(JSON.stringify(rebuilt)!==JSON.stringify(state.items))throw new Error('Learning item state does not match its paid evidence');
  return state;
}

export function createLearning({ownerId=null,now=0,skills=[],config={}}={}) {
  if(ownerId!==null)identity(ownerId,'learning owner ID');
  minute(now,'Learning chronology');validateSkills(skills);
  const state={version:LEARNING_VERSION,ownerId,originAt:now,now,skills:copy(skills),config:makeConfig(config),items:[],receipts:[]};
  return copy(validateState(state));
}

export function bindLearning(state,ownerId) {
  validateState(state);identity(ownerId,'learning owner ID');
  if(state.ownerId!==null) {
    if(state.ownerId!==ownerId)throw new Error('Learning owner mismatch');
    return copy(state);
  }
  if(state.receipts.length!==0||state.items.length!==0)throw new Error('Only empty uncredited learning may be bound');
  const next=copy(state);next.ownerId=ownerId;
  return copy(validateState(next));
}

export function advanceLearning(state,now) {
  validateState(state);minute(now,'Learning chronology');
  if(now<state.now)throw new Error('Learning chronology cannot move backward');
  if(now-state.originAt>state.config.evidenceHorizonMinutes)throw new Error('Learning evidence horizon exceeded');
  const next=copy(state);next.now=now;
  return next;
}

export function learn(state,event) {
  validateState(state);
  if(state.receipts.length===state.config.maxReceipts)throw new Error('Learning receipt limit reached');
  validateReceipt(event,state,state.receipts);
  if(event.completedAt!==state.now)throw new Error('Learning receipt must complete at the current chronology');
  const next=copy(state),receipt=copy(event);
  applyReceipt(next.items,receipt,next.config);next.receipts.push(receipt);
  return copy(validateState(next));
}

/** Researcher/evidence diagnostic view. It exposes attributed source records. */
export function getLearningView(state) {
  validateState(state);
  const items=state.items.map(item=>({
    id:item.id,
    skillId:item.skillId,
    sourceFactValue:item.sourceFactValue,
    accessibility:decayed(item,state.now,state.config),
    lastEvidenceAt:item.anchoredAt,
    recentEvidence:state.receipts.filter(receipt=>receipt.itemId===item.id).slice(-state.config.recentEvidenceLimit).map(receipt=>({
      receiptId:receipt.receiptId,
      kind:receipt.kind,
      attributedTo:receipt.attributedTo,
      startedAt:receipt.startedAt,
      completedAt:receipt.completedAt,
      elapsedMinutes:receipt.elapsedMinutes,
    })),
  }));
  return copy({
    version:state.version,
    ownerId:state.ownerId,
    now:state.now,
    rule:{
      name:state.config.rule,
      halfLifeMinutes:state.config.halfLifeMinutes,
      gainPerMinute:state.config.gainPerMinute,
      maxAccessibility:state.config.maxAccessibility,
    },
    items,
    receiptCount:state.receipts.length,
  });
}

/** Actor-safe retention metadata without source values or evidence receipts. */
export function getLearningAccessView(state) {
  validateState(state);
  const items=state.items.map(item=>({
    id:item.id,
    skillId:item.skillId,
    accessibility:decayed(item,state.now,state.config),
    lastEvidenceAt:item.anchoredAt,
  }));
  return copy({version:state.version,ownerId:state.ownerId,now:state.now,items});
}

export function retrieveLearning(state,itemId,{minimumAccessibility}={}) {
  validateState(state);identity(itemId,'learning item ID');
  if(typeof minimumAccessibility!=='number'||!Number.isFinite(minimumAccessibility)||minimumAccessibility<=0||minimumAccessibility>state.config.maxAccessibility)throw new Error('Invalid retrieval accessibility threshold');
  const item=state.items.find(entry=>entry.id===itemId);
  if(!item)return {itemId,accessible:false,sourceFactValue:null,accessibility:0};
  const accessibility=decayed(item,state.now,state.config),accessible=accessibility>=minimumAccessibility;
  return copy({itemId,accessible,sourceFactValue:accessible?item.sourceFactValue:null,accessibility});
}

export function exportLearning(state) {
  validateState(state);
  return copy({format:FORMAT,version:1,learning:state});
}

export function restoreLearning(snapshot) {
  assertJsonTree(snapshot);
  object(snapshot,'learning snapshot',['format','version','learning']);
  for(const field of ['format','version','learning'])if(!Object.hasOwn(snapshot,field))throw new Error(`Missing learning snapshot ${field}`);
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw new Error('Incompatible learning snapshot');
  return copy(validateState(snapshot.learning));
}
