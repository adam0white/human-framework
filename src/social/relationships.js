export const RELATIONSHIPS_VERSION='0.1.0';
const CARE=new Set(['active','inactive']);
const KINDS=new Set(['support_completed','support_failed','repair_completed','repair_acknowledged']);
const LIMIT=256;
const copy=value=>structuredClone(value);

function object(value,name,fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Unknown ${name} field`);
  for(const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name} field`);
  }
  for(const field of fields)if(!Object.hasOwn(value,field))throw new Error(`Missing ${name} ${field}`);
}

function id(value,name) {
  if(typeof value!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}

function time(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`Invalid ${name}`);
}

function list(value,name) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)throw new Error(`Invalid ${name} array`);
  for(let n=0;n<value.length;n++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(n));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name} array`);
  }
}

function ids(value,name) {
  list(value,name);
  const seen=new Set();
  for(const item of value) {
    id(item,name);
    if(seen.has(item))throw new Error(`Duplicate ${name}`);
    seen.add(item);
  }
}

function member(value,values,name) {
  id(value,name);
  if(!values.includes(value))throw new Error(`Unknown ${name}`);
}

function validateTie(tie,ownerId,actors) {
  object(tie,'care tie',['otherId','care']);
  member(tie.otherId,actors,'other actor');
  if(tie.otherId===ownerId)throw new Error('Care tie cannot target owner');
  if(!CARE.has(tie.care))throw new Error('Invalid care designation');
}

function validateEvent(event,state) {
  object(event,'relationship event',['id','originId','occurredAt','receivedAt','sourceId','otherId','contextId','kind','outcomeId','relatedEventId']);
  id(event.id,'event ID');id(event.originId,'event origin ID');
  time(event.occurredAt,'event occurrence time');time(event.receivedAt,'event receipt time');
  if(event.occurredAt>event.receivedAt||event.receivedAt>state.now)throw new Error('Invalid event chronology');
  member(event.sourceId,state.actors,'event source');
  member(event.otherId,state.actors,'other actor');
  if(event.otherId===state.ownerId)throw new Error('Relationship event cannot target owner');
  member(event.contextId,state.contexts,'relationship context');
  if(!KINDS.has(event.kind))throw new Error('Invalid relationship event kind');
  if(event.kind==='repair_acknowledged') {
    if(event.sourceId!==state.ownerId)throw new Error('Only recipient owner may acknowledge repair');
    if(event.outcomeId!==null)throw new Error('Acknowledgment cannot attest an outcome');
  } else id(event.outcomeId,'host outcome ID');
  if(event.kind.startsWith('support_')) {
    if(event.relatedEventId!==null)throw new Error('Support event cannot refer to repair history');
  } else {
    id(event.relatedEventId,'related event ID');
    const related=state.events.find(item=>item.id===event.relatedEventId);
    if(!related||related.otherId!==event.otherId||related.contextId!==event.contextId)throw new Error('Unknown related relationship event');
    if(event.kind==='repair_completed'&&related.kind!=='support_failed')throw new Error('Repair must refer to failed aid');
    if(event.kind==='repair_acknowledged'&&related.kind!=='repair_completed')throw new Error('Acknowledgment must refer to completed repair');
    if(event.occurredAt<related.occurredAt)throw new Error('Repair sequence moved backward');
  }
}

function sameOrigin(a,b) {
  return ['originId','occurredAt','otherId','contextId','kind','outcomeId','relatedEventId'].every(field=>a[field]===b[field]);
}

function sameOutcome(a,b) {
  return ['occurredAt','otherId','contextId','kind','relatedEventId'].every(field=>a[field]===b[field]);
}

function validateState(state) {
  object(state,'relationships',['version','ownerId','now','actors','contexts','ties','events']);
  if(state.version!==RELATIONSHIPS_VERSION)throw new Error('Incompatible relationships version');
  id(state.ownerId,'owner ID');time(state.now,'relationships time');
  ids(state.actors,'actor IDs');ids(state.contexts,'context IDs');
  member(state.ownerId,state.actors,'owner actor');
  list(state.ties,'care ties');list(state.events,'events');
  if(state.events.length>LIMIT)throw new Error('Invalid relationships history limit');
  if(state.ties.length>state.actors.length-1)throw new Error('Too many care ties');
  const ties=new Set();
  for(const tie of state.ties) {
    validateTie(tie,state.ownerId,state.actors);
    if(ties.has(tie.otherId))throw new Error('Duplicate care tie');
    ties.add(tie.otherId);
  }
  const replay={...state,events:[]};
  let lastReceipt=-1;
  for(const event of state.events) {
    validateEvent(event,replay);
    if(event.receivedAt<lastReceipt)throw new Error('Relationship receipts out of order');
    if(replay.events.some(item=>item.id===event.id||item.originId===event.originId||
      event.outcomeId!==null&&item.outcomeId===event.outcomeId))throw new Error('Duplicate relationship event');
    replay.events.push(event);lastReceipt=event.receivedAt;
  }
  return state;
}

export function createRelationships(input) {
  object(input,'relationships setup',['ownerId','now','actors','contexts','ties']);
  const state={version:RELATIONSHIPS_VERSION,...copy(input),events:[]};
  return copy(validateState(state));
}

export function advanceRelationships(state,now) {
  validateState(state);time(now,'relationships time');
  if(now<state.now)throw new Error('Relationships time cannot move backward');
  return copy({...state,now});
}

export function setCareTie(state,input) {
  validateState(state);
  object(input,'care change',['actorId','otherId','care','at']);
  if(input.actorId!==state.ownerId)throw new Error('Only relationship owner may change care');
  time(input.at,'care change time');
  if(input.at!==state.now)throw new Error('Care change must occur at current actor time');
  validateTie({otherId:input.otherId,care:input.care},state.ownerId,state.actors);
  const next=copy(state),index=next.ties.findIndex(tie=>tie.otherId===input.otherId);
  if(index<0)next.ties.push({otherId:input.otherId,care:input.care});
  else next.ties[index].care=input.care;
  return next;
}

export function receiveRelationshipEvent(state,event) {
  validateState(state);validateEvent(event,state);
  const matchingId=state.events.find(item=>item.id===event.id);
  if(matchingId) {
    if(!sameOrigin(matchingId,event)||matchingId.sourceId!==event.sourceId||matchingId.receivedAt!==event.receivedAt)throw new Error('Conflicting duplicate event ID');
    return copy(state);
  }
  const origin=state.events.find(item=>item.originId===event.originId);
  if(origin) {
    if(!sameOrigin(origin,event))throw new Error('Conflicting relationship event origin');
    return copy(state);
  }
  if(event.outcomeId!==null) {
    // Outcome IDs identify one directed proposition about one partner and
    // context. Relayed copies may differ in receipt/source but cannot add a
    // second event or reinterpret the same outcome as a different proposition.
    const outcome=state.events.find(item=>item.outcomeId===event.outcomeId);
    if(outcome) {
      if(!sameOutcome(outcome,event))throw new Error('Conflicting host outcome delivery');
      return copy(state);
    }
  }
  if(event.receivedAt!==state.now)throw new Error('New relationship receipt must arrive at current actor time');
  if(state.events.length>=LIMIT)throw new Error('Relationships history limit reached');
  if(state.events.length&&event.receivedAt<state.events.at(-1).receivedAt)throw new Error('Relationship receipts out of order');
  const next=copy(state);next.events.push(copy(event));
  return next;
}

export function getRelationshipView(state,otherId,contextId) {
  validateState(state);
  member(otherId,state.actors,'other actor');
  if(otherId===state.ownerId)throw new Error('Relationship view requires another actor');
  member(contextId,state.contexts,'relationship context');
  const events=state.events.filter(item=>item.otherId===otherId&&item.contextId===contextId)
    .toSorted((a,b)=>a.occurredAt-b.occurredAt||a.id.localeCompare(b.id));
  const byId=new Map(events.map(item=>[item.id,item]));
  const unresolved=events.filter(item=>item.kind==='support_failed'&&!events.some(ack=>{
    if(ack.kind!=='repair_acknowledged')return false;
    const repair=byId.get(ack.relatedEventId);
    return repair?.kind==='repair_completed'&&repair.relatedEventId===item.id;
  }));
  const stance=unresolved.length?'guarded':events.some(item=>item.kind==='support_completed'||item.kind==='repair_acknowledged')?'open':'unknown';
  return copy({ownerId:state.ownerId,otherId,contextId,
    care:state.ties.find(item=>item.otherId===otherId)?.care??'inactive',
    stance,evidenceIds:events.map(item=>item.id)});
}

export function exportRelationships(state) {
  validateState(state);
  return copy({format:'human-framework-relationships',version:1,relationships:state});
}

export function restoreRelationships(snapshot,expectedOwnerId) {
  object(snapshot,'relationships snapshot',['format','version','relationships']);
  if(snapshot.format!=='human-framework-relationships'||snapshot.version!==1)throw new Error('Incompatible relationships snapshot');
  id(expectedOwnerId,'expected owner ID');
  validateState(snapshot.relationships);
  if(snapshot.relationships.ownerId!==expectedOwnerId)throw new Error('Relationships owner mismatch');
  return copy(snapshot.relationships);
}
