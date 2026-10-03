export const INSTITUTION_VERSION='0.1.0';
const FORMAT='human-framework-institution';
const copy=value=>structuredClone(value);
const idPattern=/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/;

function id(value,name) {
  if(typeof value!=='string'||!idPattern.test(value))throw new Error(`Invalid ${name}`);
}
function integer(value,name,min,max=Number.MAX_SAFE_INTEGER) {
  if(!Number.isSafeInteger(value)||value<min||value>max||Object.is(value,-0))throw new Error(`Invalid ${name}`);
}
function object(value,name,fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Invalid ${name} fields`);
  for(const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name} data`);
  }
}
function array(value,name,max) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max||Reflect.ownKeys(value).length!==value.length+1)throw new Error(`Invalid ${name}`);
  for(let i=0;i<value.length;i++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name} data`);
  }
}
function uniqueIds(value,name,max) {
  array(value,name,max);
  const seen=new Set();
  for(const item of value) {
    id(item,name);
    if(seen.has(item))throw new Error(`Duplicate ${name}`);
    seen.add(item);
  }
  return seen;
}
function reservationId(value) {
  if(typeof value!=='string'||!/^reservation:[1-9][0-9]*$/.test(value))throw new Error('Invalid reservation ID');
  const number=Number(value.slice(12));
  integer(number,'reservation number',1);
  return number;
}
function validate(state) {
  object(state,'institution',['version','facilityId','now','actors','grants','maxHoldMinutes','maxRequests','usedRequestIds','nextReservation','active','queue']);
  if(state.version!==INSTITUTION_VERSION)throw new Error('Incompatible institution version');
  id(state.facilityId,'facility ID');integer(state.now,'institution time',0);
  const actors=uniqueIds(state.actors,'actors',8),grants=uniqueIds(state.grants,'grants',8);
  for(const actor of grants)if(!actors.has(actor))throw new Error('Grant refers to unknown actor');
  integer(state.maxHoldMinutes,'maximum hold',1,1440);
  integer(state.maxRequests,'maximum requests',1,128);
  const used=uniqueIds(state.usedRequestIds,'request IDs',state.maxRequests);
  integer(state.nextReservation,'next reservation',1);
  array(state.queue,'institution queue',state.maxRequests);
  const pending=new Set();
  for(const request of state.queue) {
    object(request,'queued request',['actorId','requestId','holdMinutes']);
    if(!actors.has(request.actorId)||!grants.has(request.actorId)||!used.has(request.requestId)||pending.has(request.requestId))throw new Error('Invalid queued actor or request');
    integer(request.holdMinutes,'hold minutes',1,state.maxHoldMinutes);
    pending.add(request.requestId);
  }
  if(state.active!==null) {
    object(state.active,'active reservation',['actorId','requestId','reservationId','holdMinutes','heldAt','expiresAt']);
    const active=state.active;
    if(!actors.has(active.actorId)||!grants.has(active.actorId)||!used.has(active.requestId)||pending.has(active.requestId))throw new Error('Invalid active actor or request');
    integer(active.holdMinutes,'hold minutes',1,state.maxHoldMinutes);
    integer(active.heldAt,'hold start',0);
    integer(active.expiresAt,'hold expiry',1);
    if(active.heldAt>state.now||active.expiresAt!==active.heldAt+active.holdMinutes||active.expiresAt<=state.now)throw new Error('Invalid active reservation time');
    if(reservationId(active.reservationId)>=state.nextReservation)throw new Error('Invalid active reservation ID');
  } else if(state.queue.length)throw new Error('Queue cannot remain without an active reservation');
  return state;
}
function checked(state) { return copy(validate(state)); }
function promote(state,at) {
  while(state.active===null&&state.queue.length) {
    const next=state.queue.shift();
    if(!state.grants.includes(next.actorId))continue;
    if(state.nextReservation===Number.MAX_SAFE_INTEGER)throw new Error('Reservation ID space exhausted');
    state.active={...next,reservationId:`reservation:${state.nextReservation++}`,heldAt:at,expiresAt:at+next.holdMinutes};
  }
}

export function createInstitution({now=0,facilityId,actors,grants,maxHoldMinutes,maxRequests=16}={}) {
  return checked({version:INSTITUTION_VERSION,facilityId,now,actors:copy(actors),grants:copy(grants),maxHoldMinutes,maxRequests,usedRequestIds:[],nextReservation:1,active:null,queue:[]});
}
export function requestAccess(state,{actorId,requestId,holdMinutes}={}) {
  const next=checked(state);
  id(actorId,'actor ID');id(requestId,'request ID');
  if(!next.actors.includes(actorId))throw new Error('Unknown institution actor');
  integer(holdMinutes,'hold minutes',1,next.maxHoldMinutes);
  if(!next.grants.includes(actorId))return {state:next,decision:'denied',reservationId:null};
  if(next.usedRequestIds.includes(requestId))throw new Error('Duplicate request ID');
  if(next.usedRequestIds.length>=next.maxRequests)throw new Error('Institution request ID limit exhausted');
  next.usedRequestIds.push(requestId);
  if(next.active===null) {
    if(next.nextReservation===Number.MAX_SAFE_INTEGER)throw new Error('Reservation ID space exhausted');
    const reservationId=`reservation:${next.nextReservation++}`;
    next.active={actorId,requestId,reservationId,holdMinutes,heldAt:next.now,expiresAt:next.now+holdMinutes};
    return {state:checked(next),decision:'reserved',reservationId};
  }
  next.queue.push({actorId,requestId,holdMinutes});
  return {state:checked(next),decision:'queued',reservationId:null};
}
export function withdrawRequest(state,{actorId,requestId}={}) {
  const next=checked(state);id(actorId,'actor ID');id(requestId,'request ID');
  if(next.active?.requestId===requestId) {
    if(next.active.actorId!==actorId)throw new Error('Request owner mismatch');
    next.active=null;promote(next,next.now);
  } else {
    const index=next.queue.findIndex(request=>request.requestId===requestId);
    if(index<0)throw new Error('No pending request');
    if(next.queue[index].actorId!==actorId)throw new Error('Request owner mismatch');
    next.queue.splice(index,1);
  }
  return checked(next);
}
export function releaseAccess(state,{actorId,reservationId:givenId}={}) {
  const next=checked(state);id(actorId,'actor ID');reservationId(givenId);
  if(!next.active||next.active.reservationId!==givenId)throw new Error('No active reservation');
  if(next.active.actorId!==actorId)throw new Error('Reservation holder mismatch');
  next.active=null;promote(next,next.now);
  return checked(next);
}
export function advanceInstitution(state,to) {
  const next=checked(state);integer(to,'target time',0);
  if(to<next.now)throw new Error('Institution time cannot advance backward');
  while(next.active&&next.active.expiresAt<=to) {
    const vacancy=next.active.expiresAt;
    next.now=vacancy;next.active=null;promote(next,vacancy);
  }
  next.now=to;
  return checked(next);
}
export function setInstitutionGrant(state,{actorId,granted,at}={}) {
  id(actorId,'actor ID');integer(at,'grant time',0);
  if(typeof granted!=='boolean')throw new Error('Invalid grant status');
  const next=advanceInstitution(state,at);
  if(!next.actors.includes(actorId))throw new Error('Unknown institution actor');
  if(granted&&!next.grants.includes(actorId))next.grants.push(actorId);
  if(!granted) {
    next.grants=next.grants.filter(id=>id!==actorId);
    next.queue=next.queue.filter(request=>request.actorId!==actorId);
    if(next.active?.actorId===actorId) { next.active=null;promote(next,next.now); }
  }
  return checked(next);
}
export function getInstitutionOffer(state,actorId) {
  const next=checked(state);id(actorId,'actor ID');
  if(!next.actors.includes(actorId))throw new Error('Unknown institution actor');
  const queuePosition=next.queue.findIndex(request=>request.actorId===actorId);
  const active=next.active?.actorId===actorId?next.active:null;
  return copy({facilityId:next.facilityId,now:next.now,granted:next.grants.includes(actorId),available:next.active===null,
    hasReservation:!!active,reservationId:active?.reservationId??null,expiresAt:active?.expiresAt??null,
    queuePosition:queuePosition<0?null:queuePosition+1});
}
export function exportInstitution(state) {
  return {format:FORMAT,version:1,institution:checked(state)};
}
export function restoreInstitution(snapshot) {
  object(snapshot,'institution snapshot',['format','version','institution']);
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw new Error('Incompatible institution snapshot');
  return checked(snapshot.institution);
}
