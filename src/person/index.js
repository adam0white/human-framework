import {exportPerson,getPersonView} from '../human/v0.1.1.js';

export const SITUATED_PERSON_VERSION='0.1.0';

const purposeStatuses=['active','completed','withdrawn'];
const channels=['instruction','experience','communication'];
const commitmentStatuses=['proposed','accepted','fulfilled','revised','withdrawn','breached'];
const interactionValues=['fulfilled','breached','repaired'];
const catalogFields=['actors','facts','purposes','commitments','actions'];
const copy=value=>structuredClone(value);

function object(value,name,keys) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name}`);
  const own=Reflect.ownKeys(value);
  if(own.some(key=>typeof key!=='string'||!keys.includes(key)))throw new Error(`Unknown ${name} field`);
  for(const key of own) {
    const field=Object.getOwnPropertyDescriptor(value,key);
    if(!field?.enumerable||!Object.hasOwn(field,'value'))throw new Error(`Invalid ${name} field`);
  }
}

function identity(value,name) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}

function time(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`Invalid ${name}`);
}

function list(value,name) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw new Error(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==value.length+1||!keys.includes('length'))throw new Error(`Invalid ${name}`);
  for(let index=0;index<value.length;index++) {
    const key=String(index),field=Object.getOwnPropertyDescriptor(value,key);
    if(!field?.enumerable||!Object.hasOwn(field,'value'))throw new Error(`Invalid ${name}`);
  }
  if(keys.some(key=>key!=='length'&&(!/^\d+$/.test(key)||Number(key)>=value.length)))throw new Error(`Invalid ${name}`);
  return value;
}

function uniqueIds(value,name) {
  list(value,`catalog ${name}`);
  const found=new Set();
  for(const id of value) {
    identity(id,`${name} ID`);
    if(found.has(id))throw new Error(`Duplicate catalog ${name} ID`);
    found.add(id);
  }
}

function validateCatalog(catalog) {
  object(catalog,'catalog',catalogFields);
  for(const field of catalogFields) {
    if(!Object.hasOwn(catalog,field))throw new Error(`Missing catalog ${field}`);
    uniqueIds(catalog[field],field);
  }
  return catalog;
}

function member(id,values,name) {
  identity(id,name);
  if(!values.includes(id))throw new Error(`Unknown ${name}`);
}

function purpose(value,catalog) {
  object(value,'purpose',['id','status']);
  if(!Object.hasOwn(value,'id')||!Object.hasOwn(value,'status'))throw new Error('Incomplete purpose');
  member(value.id,catalog.purposes,'purpose ID');
  if(!purposeStatuses.includes(value.status))throw new Error('Invalid purpose status');
  return value;
}

function commitmentDetails(value,catalog) {
  object(value,'commitment details',['revision','debtorId','creditorId','dueAt','terms']);
  for(const field of ['revision','debtorId','creditorId','dueAt','terms'])if(!Object.hasOwn(value,field))throw new Error('Incomplete commitment details');
  if(!Number.isSafeInteger(value.revision)||value.revision<0||Object.is(value.revision,-0))throw new Error('Invalid commitment revision');
  member(value.debtorId,catalog.actors,'commitment debtor ID');
  member(value.creditorId,catalog.actors,'commitment creditor ID');
  if(value.debtorId===value.creditorId)throw new Error('Commitment endpoints must be different');
  time(value.dueAt,'commitment due time');
  if(typeof value.terms!=='string'||value.terms.length<1||value.terms.length>120||value.terms.trim()!==value.terms)throw new Error('Invalid commitment terms');
}

function observation(value,catalog,now) {
  object(value,'observation',['id','at','source','channel','kind','subject','value','details','contextId']);
  for(const field of ['id','at','source','channel','kind','subject','value'])if(!Object.hasOwn(value,field))throw new Error('Incomplete observation');
  identity(value.id,'observation ID');time(value.at,'observation time');
  if(value.at>now)throw new Error('Future observation');
  member(value.source,catalog.actors,'observation source');
  if(!channels.includes(value.channel))throw new Error('Invalid observation channel');
  if(value.kind==='fact') {
    if(Object.hasOwn(value,'details')||Object.hasOwn(value,'contextId'))throw new Error('Fact observation has unrelated fields');
    member(value.subject,catalog.facts,'fact subject');
    if(typeof value.value!=='boolean')throw new Error('Invalid fact value');
  } else if(value.kind==='commitment') {
    if(!Object.hasOwn(value,'details')||Object.hasOwn(value,'contextId'))throw new Error('Invalid commitment observation fields');
    member(value.subject,catalog.commitments,'commitment subject');
    if(!commitmentStatuses.includes(value.value))throw new Error('Invalid commitment value');
    commitmentDetails(value.details,catalog);
  } else if(value.kind==='interaction') {
    if(!Object.hasOwn(value,'contextId')||Object.hasOwn(value,'details'))throw new Error('Invalid interaction observation fields');
    member(value.subject,catalog.actors,'interaction subject');
    member(value.contextId,catalog.commitments,'interaction context ID');
    if(!interactionValues.includes(value.value))throw new Error('Invalid interaction value');
  } else throw new Error('Invalid observation kind');
  return value;
}

function detachedHuman(value,catalog) {
  const human=exportPerson(value).person;
  member(human.id,catalog.actors,'person actor ID');
  return human;
}

function purposes(value,catalog) {
  list(value,'purposes');
  const purposeIds=new Set();
  for(const record of value) {
    purpose(record,catalog);
    if(purposeIds.has(record.id))throw new Error('Duplicate purpose');
    purposeIds.add(record.id);
  }
}

function validateState(value,catalog) {
  object(value,'situated person',['version','id','human','now','purposes','observations']);
  for(const field of ['version','id','human','now','purposes','observations'])if(!Object.hasOwn(value,field))throw new Error('Incomplete situated person');
  if(value.version!==SITUATED_PERSON_VERSION)throw new Error('Incompatible situated person version');
  const human=detachedHuman(value.human,catalog);
  member(value.id,catalog.actors,'person actor ID');
  if(value.id!==human.id)throw new Error('Situated person identity mismatch');
  time(value.now,'person chronology');
  purposes(value.purposes,catalog);
  list(value.observations,'observations');
  const observations=new Map(),commitmentRevisions=new Map();let lastAt=-1;
  for(const record of value.observations) {
    observation(record,catalog,value.now);
    if(observations.has(record.id))throw new Error('Duplicate observation ID in state');
    if(record.at<lastAt)throw new Error('Observations out of received order');
    if(record.kind==='commitment') {
      const prior=commitmentRevisions.get(record.subject);
      if(prior!==undefined&&record.details.revision<prior)throw new Error('Commitment observation revision moved backward');
      commitmentRevisions.set(record.subject,record.details.revision);
    }
    observations.set(record.id,record);lastAt=record.at;
  }
  return value;
}

export function createSituatedPerson(input,catalog) {
  validateCatalog(catalog);
  object(input,'situated person setup',['human','now','purposes']);
  for(const field of ['human','now','purposes'])if(!Object.hasOwn(input,field))throw new Error('Incomplete situated person setup');
  const human=detachedHuman(input.human,catalog);time(input.now,'person chronology');purposes(input.purposes,catalog);
  const state={version:SITUATED_PERSON_VERSION,id:human.id,human,now:input.now,purposes:copy(input.purposes),observations:[]};
  return copy(validateState(state,catalog));
}

export function advancePerson(person,now,catalog) {
  validateCatalog(catalog);validateState(person,catalog);time(now,'person chronology');
  if(now<person.now)throw new Error('Person chronology cannot move backward');
  const next=copy(person);next.now=now;
  return next;
}

export function setPurpose(person,input,catalog) {
  validateCatalog(catalog);validateState(person,catalog);purpose(input,catalog);
  const next=copy(person),index=next.purposes.findIndex(record=>record.id===input.id);
  if(index===-1)next.purposes.push(copy(input));
  else next.purposes[index]=copy(input);
  return next;
}

export function observePerson(person,input,catalog) {
  validateCatalog(catalog);validateState(person,catalog);observation(input,catalog,person.now);
  const existing=person.observations.find(record=>record.id===input.id);
  if(existing) {
    const common=['id','at','source','channel','kind','subject','value','contextId'];
    const sameDetails=existing.details===undefined&&input.details===undefined||
      existing.details!==undefined&&input.details!==undefined&&
      ['revision','debtorId','creditorId','dueAt','terms'].every(field=>existing.details[field]===input.details[field]);
    const identical=common.every(field=>existing[field]===input[field])&&sameDetails;
    if(!identical)throw new Error('Conflicting duplicate observation');
    return copy(person);
  }
  const last=person.observations.at(-1);
  if(last&&input.at<last.at)throw new Error('Observation is older than last received observation');
  if(input.kind==='commitment') {
    const prior=person.observations.findLast(record=>record.kind==='commitment'&&record.subject===input.subject);
    if(prior&&input.details.revision<prior.details.revision)throw new Error('Commitment observation revision moved backward');
  }
  const next=copy(person);next.observations.push(copy(input));
  return next;
}

export function getSituatedView(person,catalog) {
  validateCatalog(catalog);validateState(person,catalog);
  return copy({id:person.id,now:person.now,purposes:person.purposes,observations:person.observations,human:getPersonView(person.human)});
}

export function exportSituatedPerson(person,catalog) {
  validateCatalog(catalog);validateState(person,catalog);
  return copy({format:'human-framework-situated-person',version:1,person});
}

export function restoreSituatedPerson(snapshot,catalog) {
  validateCatalog(catalog);
  object(snapshot,'situated person snapshot',['format','version','person']);
  for(const field of ['format','version','person'])if(!Object.hasOwn(snapshot,field))throw new Error('Incomplete situated person snapshot');
  if(snapshot.format!=='human-framework-situated-person'||snapshot.version!==1)throw new Error('Incompatible situated person snapshot');
  validateState(snapshot.person,catalog);
  return copy(snapshot.person);
}

function latestObservation(person,kind,subject,contextId=null) {
  return person.observations.findLast(record=>record.kind===kind&&record.subject===subject&&
    (kind!=='interaction'||record.contextId===contextId))??null;
}

function validateOption(value,catalog) {
  object(value,'decision option',['id','requiresFacts']);
  for(const field of ['id','requiresFacts'])if(!Object.hasOwn(value,field))throw new Error('Incomplete decision option');
  member(value.id,catalog.actions,'option action ID');uniqueIds(value.requiresFacts,'required facts');
  for(const id of value.requiresFacts)member(id,catalog.facts,'required fact ID');
}

function validatePredicate(value,type,catalog) {
  if(type==='fact') {
    object(value,'fact predicate',['id','value']);member(value.id,catalog.facts,'fact predicate ID');
    if(typeof value.value!=='boolean')throw new Error('Invalid fact predicate value');
  } else if(type==='purpose') {
    object(value,'purpose predicate',['id','status']);member(value.id,catalog.purposes,'purpose predicate ID');
    if(!purposeStatuses.includes(value.status))throw new Error('Invalid purpose predicate status');
  } else if(type==='commitment') {
    object(value,'commitment predicate',['id','status','revision']);member(value.id,catalog.commitments,'commitment predicate ID');
    if(!commitmentStatuses.includes(value.status))throw new Error('Invalid commitment predicate status');
    if(Object.hasOwn(value,'revision')&&(!Number.isSafeInteger(value.revision)||value.revision<0||Object.is(value.revision,-0)))throw new Error('Invalid commitment predicate revision');
  } else {
    object(value,'interaction predicate',['actorId','contextId','value']);member(value.actorId,catalog.actors,'interaction predicate actor ID');
    member(value.contextId,catalog.commitments,'interaction predicate context ID');
    if(!interactionValues.includes(value.value))throw new Error('Invalid interaction predicate value');
  }
}

function validateRule(value,catalog,optionIds) {
  object(value,'decision rule',['id','when','actionId']);
  for(const field of ['id','when','actionId'])if(!Object.hasOwn(value,field))throw new Error('Incomplete decision rule');
  identity(value.id,'rule ID');member(value.actionId,catalog.actions,'rule action ID');
  if(!optionIds.has(value.actionId))throw new Error('Rule action is absent from options');
  object(value.when,'rule condition',['fact','purpose','commitment','interaction']);
  const types=Object.keys(value.when);
  if(types.length===0)throw new Error('Rule condition must be nonempty');
  for(const type of types)validatePredicate(value.when[type],type,catalog);
}

function decisionInput(input,catalog) {
  object(input,'decision',['options','rules','defaultActionId']);
  for(const field of ['options','rules','defaultActionId'])if(!Object.hasOwn(input,field))throw new Error('Incomplete decision');
  list(input.options,'decision options');list(input.rules,'decision rules');
  const optionIds=new Set();
  for(const option of input.options) {
    validateOption(option,catalog);
    if(optionIds.has(option.id))throw new Error('Duplicate decision option ID');
    optionIds.add(option.id);
  }
  const ruleIds=new Set();
  for(const rule of input.rules) {
    validateRule(rule,catalog,optionIds);
    if(ruleIds.has(rule.id))throw new Error('Duplicate decision rule ID');
    ruleIds.add(rule.id);
  }
  member(input.defaultActionId,catalog.actions,'default action ID');
  if(!optionIds.has(input.defaultActionId))throw new Error('Default action is absent from options');
  return optionIds;
}

function matchRule(person,rule) {
  const evidence=[];
  for(const type of ['fact','purpose','commitment','interaction']) {
    const predicate=rule.when[type];if(!predicate)continue;
    if(type==='purpose') {
      const record=person.purposes.find(item=>item.id===predicate.id);
      if(!record||record.status!==predicate.status)return null;
      evidence.push(`purpose:${predicate.id}`);
      continue;
    }
    const subject=type==='interaction'?predicate.actorId:predicate.id;
    const record=latestObservation(person,type,subject,type==='interaction'?predicate.contextId:null);
    const expected=type==='fact'?predicate.value:predicate.status??predicate.value;
    if(!record||record.value!==expected)return null;
    if(type==='commitment'&&Object.hasOwn(predicate,'revision')&&record.details.revision!==predicate.revision)return null;
    evidence.push(record.id);
  }
  return evidence;
}

export function decide(person,input,catalog,externalActionId=null) {
  validateCatalog(catalog);validateState(person,catalog);
  const optionIds=decisionInput(input,catalog);
  if(externalActionId!==null) {
    identity(externalActionId,'external action ID');
    if(!optionIds.has(externalActionId))throw new Error('External action is absent from options');
  }
  const noticedOptions=input.options.filter(option=>option.requiresFacts.every(id=>latestObservation(person,'fact',id)?.value===true)).map(option=>option.id);
  // This is an explicitly supplied actor choice among authored options. It may
  // bypass the NPC view's knowledge preconditions, but the policy input still
  // cannot contain unknown world facts.
  if(externalActionId!==null)return copy({actionId:externalActionId,provider:'external',ruleId:null,evidence:[],noticedOptions});
  for(const rule of input.rules) {
    const evidence=matchRule(person,rule);
    if(evidence&&noticedOptions.includes(rule.actionId))return copy({actionId:rule.actionId,provider:'baseline',ruleId:rule.id,evidence,noticedOptions});
  }
  if(noticedOptions.includes(input.defaultActionId))return copy({actionId:input.defaultActionId,provider:'baseline',ruleId:null,evidence:[],noticedOptions});
  return copy({actionId:null,provider:'pending',ruleId:null,evidence:[],noticedOptions});
}

// Canonical host records remain separate from actor-local observations.
export {createCommitment,transitionCommitment} from './commitments.js';
