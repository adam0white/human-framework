/** Private actor-owned historical episodes. Host-attested reports are not authenticated truth. */
export const EPISODES_VERSION='episodes-0.1.0';
const FORMAT='human-framework-episodes';
const MAX_RECORDS=128;
const stateFields=['version','ownerId','originAt','now','contexts','sources','propositions','maxRecords','records'];
const episodeFields=['episodeId','eventId','contextId','sourceId','originId','occurredAt',
  'receivedAt','expiresAt','actionId','outcomeId','facts','correctsEpisodeId'];
const retractionFields=['recordId','targetEpisodeId','sourceId','originId','receivedAt'];
const setupFields=['ownerId','now','contexts','sources','propositions','maxRecords'];
const copy=value=>structuredClone(value);
function object(value,fields,label,required=fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||
    ![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error(`Invalid ${label} fields`);
  const keys=Reflect.ownKeys(value);
  if(keys.some(key=>typeof key!=='string'||!fields.includes(key))||
    required.some(key=>!keys.includes(key)))throw Error(`Invalid ${label} fields`);
  for(const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw Error(`Invalid ${label} data fields`);
  }
}
function list(value,label,max) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max)
    throw Error(`Invalid ${label} or ${label} limit exceeded`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==value.length+1||!keys.includes('length'))throw Error(`Invalid ${label} fields`);
  for(let index=0;index<value.length;index++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw Error(`Invalid ${label} data`);
  }
  if(keys.some(key=>key!=='length'&&(!/^\d+$/.test(key)||Number(key)>=value.length)))
    throw Error(`Invalid ${label} fields`);
}
function id(value,label) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))
    throw Error(`Invalid ${label}`);
}
function time(value,label) {
  if(!Number.isSafeInteger(value)||Object.is(value,-0)||value<0||value>1e12)throw Error(`Invalid ${label}`);
}
function known(value,catalog,label) {
  id(value,label);
  if(!catalog.includes(value))throw Error(`Unknown ${label}`);
}
function catalog(value,label) {
  list(value,label,128);
  if(value.length<1)throw Error(`Invalid ${label} size`);
  const ids=new Set();
  for(const item of value) {
    id(item,`${label} ID`);
    if(ids.has(item))throw Error(`Duplicate ${label} ID`);
    ids.add(item);
  }
}
function nullableId(value,label) {if(value!==null)id(value,label);}
function eventKey(record) {return `${record.originId}:\u0000${record.eventId}`;}
function sameContent(a,b) {
  return a.contextId===b.contextId&&a.occurredAt===b.occurredAt&&
    a.expiresAt===b.expiresAt&&a.actionId===b.actionId&&a.outcomeId===b.outcomeId&&
    a.facts.length===b.facts.length&&a.facts.every((fact,index)=>
      fact.propositionId===b.facts[index].propositionId&&fact.value===b.facts[index].value);
}
function sameRecord(a,b) {
  if(a.kind!==b.kind)return false;
  if(a.kind==='episode')return episodeFields.every(field=>field==='facts'?
    a.facts.length===b.facts.length&&a.facts.every((fact,index)=>
      fact.propositionId===b.facts[index].propositionId&&fact.value===b.facts[index].value):
    a[field]===b[field]);
  return retractionFields.every(field=>a[field]===b[field]);
}
function recordId(record) {return record.kind==='episode'?record.episodeId:record.recordId;}
function validateEpisode(episode,state,prior) {
  object(episode,episodeFields,'episode');
  id(episode.episodeId,'episode ID');id(episode.eventId,'event ID');
  known(episode.contextId,state.contexts,'context ID');
  known(episode.sourceId,state.sources,'source ID');known(episode.originId,state.sources,'origin ID');
  time(episode.occurredAt,'occurrence time');time(episode.receivedAt,'delivery time');
  time(episode.expiresAt,'expiry time');
  if(episode.occurredAt>episode.receivedAt)throw Error('Episode occurred in the future');
  if(episode.expiresAt<=episode.occurredAt)throw Error('Episode expiry must follow occurrence');
  nullableId(episode.actionId,'action ID');nullableId(episode.outcomeId,'outcome ID');
  nullableId(episode.correctsEpisodeId,'corrected episode ID');
  list(episode.facts,'episode facts',16);
  const factIds=new Set();
  for(const fact of episode.facts) {
    object(fact,['propositionId','value'],'episode fact');
    known(fact.propositionId,state.propositions,'proposition ID');
    if(typeof fact.value!=='boolean')throw Error('Invalid episode fact value');
    if(factIds.has(fact.propositionId))throw Error('Duplicate episode proposition');
    factIds.add(fact.propositionId);
  }
  if(episode.actionId===null&&episode.outcomeId===null&&episode.facts.length===0)
    throw Error('Episode needs action, outcome or attributed facts');
  const previous=prior.filter(record=>record.kind==='episode'&&eventKey(record)===eventKey(episode));
  if(episode.correctsEpisodeId!==null) {
    if(episode.sourceId!==episode.originId)throw Error('Correction must be authored by its origin source');
    const target=prior.find(record=>record.kind==='episode'&&record.episodeId===episode.correctsEpisodeId);
    if(!target)throw Error('Correction target must be an earlier episode');
    if(eventKey(target)!==eventKey(episode)||target.contextId!==episode.contextId||
      target.occurredAt!==episode.occurredAt)throw Error('Correction must preserve target event attribution');
    const latest=previous.filter(record=>record.correctsEpisodeId!==null).at(-1);
    if(latest&&latest!==target)
      throw Error('Correction target is superseded');
    if(episode.expiresAt!==target.expiresAt)throw Error('Correction cannot refresh event expiry');
    if(sameContent(target,episode))throw Error('Correction must change the semantic event');
  } else if(previous.length) {
    const original=previous.find(record=>record.correctsEpisodeId===null);
    if(original&&episode.expiresAt!==original.expiresAt)
      throw Error('Forwarded event cannot refresh original expiry');
    if(!original||!sameContent(original,episode))
      throw Error('Same origin event conflicts without an attributed correction');
  }
}
function validateRetraction(retraction,state,prior) {
  object(retraction,retractionFields,'episode retraction');
  id(retraction.recordId,'retraction ID');id(retraction.targetEpisodeId,'target episode ID');
  known(retraction.sourceId,state.sources,'source ID');known(retraction.originId,state.sources,'origin ID');
  time(retraction.receivedAt,'retraction delivery time');
  if(retraction.sourceId!==retraction.originId)throw Error('Retraction must be authored by its origin source');
  const target=prior.find(record=>record.kind==='episode'&&record.episodeId===retraction.targetEpisodeId);
  if(!target)throw Error('Retraction target must be an earlier episode');
  if(target.originId!==retraction.originId)throw Error('Retraction target has a different origin');
}
function validateState(state) {
  object(state,stateFields,'episode state');
  if(state.version!==EPISODES_VERSION)throw Error('Incompatible episode version');
  id(state.ownerId,'episode owner ID');time(state.originAt,'episode origin time');
  time(state.now,'episode time');
  if(state.now<state.originAt)throw Error('Episode time precedes origin');
  catalog(state.contexts,'contexts');catalog(state.sources,'sources');catalog(state.propositions,'propositions');
  if(!Number.isSafeInteger(state.maxRecords)||state.maxRecords<1||state.maxRecords>MAX_RECORDS)
    throw Error(`Episode max records must be between 1 and ${MAX_RECORDS}`);
  list(state.records,'episode records',state.maxRecords);
  const ids=new Set(),prior=[];let lastArrival=state.originAt;
  for(const record of state.records) {
    const descriptor=record&&typeof record==='object'&&
      Object.getOwnPropertyDescriptor(record,'kind');
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))
      throw Error('Invalid episode record kind data');
    const kind=descriptor.value;
    const fields=kind==='episode'?episodeFields:kind==='retraction'?retractionFields:null;
    if(!fields)throw Error('Invalid episode record kind');
    object(record,['kind',...fields],'episode record');
    const input=Object.fromEntries(fields.map(field=>[field,record[field]]));
    if(record.kind==='episode')validateEpisode(input,state,prior);
    else validateRetraction(input,state,prior);
    if(ids.has(recordId(record)))throw Error('Duplicate episode record ID');
    if(record.receivedAt<lastArrival||record.receivedAt>state.now)
      throw Error('Episode records are out of delivery order');
    ids.add(recordId(record));prior.push(record);lastArrival=record.receivedAt;
  }
  return state;
}
function validateArrival(state,input,kind) {
  const fields=kind==='episode'?episodeFields:retractionFields;
  object(input,fields,'episode arrival');
  if(kind==='episode') {
    list(input.facts,'episode facts',16);
    for(const fact of input.facts)object(fact,['propositionId','value'],'episode fact');
  }
  const key=kind==='episode'?input.episodeId:input.recordId;
  const existing=state.records.find(record=>recordId(record)===key);
  if(existing) {
    if(!sameRecord(existing,{kind,...input}))throw Error('Conflicting episode record ID');
    return true;
  }
  if(kind==='episode')validateEpisode(input,state,state.records);
  else validateRetraction(input,state,state.records);
  if(input.receivedAt!==state.now)throw Error('Episode must be received at current actor time');
  if(state.records.length>=state.maxRecords)throw Error('Episode record limit reached');
  return false;
}
export function createEpisodes(input) {
  object(input,setupFields,'episode setup',['ownerId','contexts','sources','propositions']);
  const {ownerId,now=0,contexts,sources,propositions,maxRecords=MAX_RECORDS}=input;
  const state={version:EPISODES_VERSION,ownerId,originAt:now,now,
    contexts:copy(contexts),sources:copy(sources),propositions:copy(propositions),maxRecords,records:[]};
  return copy(validateState(state));
}
export function advanceEpisodes(state,now) {
  validateState(state);time(now,'episode time');
  if(now<state.now)throw Error('Episode time cannot move backward');
  return copy(validateState({...copy(state),now}));
}
export function recordEpisode(state,episode) {
  validateState(state);
  if(validateArrival(state,episode,'episode'))return copy(state);
  const next=copy(state);next.records.push({kind:'episode',...copy(episode)});
  return copy(validateState(next));
}
export function retractEpisode(state,retraction) {
  validateState(state);
  if(validateArrival(state,retraction,'retraction'))return copy(state);
  const next=copy(state);next.records.push({kind:'retraction',...copy(retraction)});
  return copy(validateState(next));
}
export function queryEpisodes(state,input) {
  validateState(state);
  object(input,['contextId','limit'],'episode query',['contextId']);
  known(input.contextId,state.contexts,'context ID');
  const limit=input.limit??8;
  if(!Number.isSafeInteger(limit)||limit<1||limit>32)throw Error('Episode query limit must be 1 to 32');
  const active=new Map(),withdrawn=new Set();
  for(const record of state.records) {
    if(record.kind==='retraction') {
      const target=state.records.find(item=>item.kind==='episode'&&item.episodeId===record.targetEpisodeId);
      withdrawn.add(eventKey(target));
    } else if(record.correctsEpisodeId!==null)active.set(eventKey(record),record);
    else if(!active.has(eventKey(record)))active.set(eventKey(record),record);
  }
  const episodes=[...active].filter(([key,record])=>!withdrawn.has(key)&&
    record.contextId===input.contextId&&record.expiresAt>state.now)
    .map(([key,record])=>({record,index:state.records.indexOf(record)}))
    .sort((a,b)=>b.record.occurredAt-a.record.occurredAt||b.index-a.index)
    .slice(0,limit).map(({record})=>copy(record));
  return copy({version:state.version,ownerId:state.ownerId,now:state.now,
    contextId:input.contextId,episodes,recordCount:state.records.length,maxRecords:state.maxRecords});
}
export function exportEpisodes(state) {
  validateState(state);return copy({format:FORMAT,version:1,episodes:state});
}
export function restoreEpisodes(snapshot,ownerId) {
  object(snapshot,['format','version','episodes'],'episode snapshot');
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw Error('Incompatible episode snapshot');
  id(ownerId,'expected episode owner ID');validateState(snapshot.episodes);
  if(snapshot.episodes.ownerId!==ownerId)throw Error('Episode owner mismatch; cross-actor restoration is forbidden');
  return copy(snapshot.episodes);
}
