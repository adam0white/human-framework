/** Candidate host preflight for task-specific access. It does not model illness or change Human state. */
export const FUNCTIONAL_CONTEXT_VERSION='0.1.0';
const FORMAT='human-framework-functional-context';
const copy=value=>structuredClone(value);
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,79}$/;

function fail(message) {throw new Error(message);}
function exact(value,name,fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>typeof key!=='string'||!fields.includes(key)))fail(`Invalid ${name} fields`);
  for(const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))fail(`Invalid ${name} data`);
  }
}
function id(value,name) {if(typeof value!=='string'||!ID.test(value))fail(`Invalid ${name}`);}
function minute(value,name) {if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))fail(`Invalid ${name}`);}
function scalar(value,name,min=0,max=1) {if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail(`Invalid ${name}`);}
function array(value,name,max) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max||
    Reflect.ownKeys(value).length!==value.length+1)fail(`Invalid ${name} array`);
  for(let index=0;index<value.length;index++) {
    const field=Object.getOwnPropertyDescriptor(value,String(index));
    if(!field?.enumerable||!Object.hasOwn(field,'value'))fail(`Invalid ${name} array data`);
  }
}
function identifiers(value,name,max=64) {
  array(value,name,max);
  const found=new Set();
  for(const entry of value) {id(entry,name);if(found.has(entry))fail(`Duplicate ${name}`);found.add(entry);}
  return found;
}
function resources(value,name,quantityField,max=32) {
  array(value,name,max);
  const found=new Set();
  for(const entry of value) {
    exact(entry,name,['resourceId',quantityField]);id(entry.resourceId,'resource ID');
    if(found.has(entry.resourceId))fail('Duplicate resource ID');found.add(entry.resourceId);
    const amount=entry[quantityField];
    if(!Number.isSafeInteger(amount)||amount<=(quantityField==='amount'?0:-1)||Object.is(amount,-0))fail(`Invalid resource ${quantityField}`);
  }
  return found;
}
function catalog(value) {
  exact(value,'functional catalog',['actors','demands','methods']);
  const actors=identifiers(value.actors,'actor IDs',32),demands=identifiers(value.demands,'demand IDs',32);
  array(value.methods,'methods',64);
  const methodIds=new Set();
  for(const method of value.methods) {
    exact(method,'method',['id','actionId','durationMinutes','effort','exertive','skill','demandIds','resourceCosts']);
    id(method.id,'method ID');id(method.actionId,'action ID');
    if(methodIds.has(method.id))fail('Duplicate method ID');methodIds.add(method.id);
    if(!Number.isSafeInteger(method.durationMinutes)||method.durationMinutes<1||method.durationMinutes>1440)fail('Invalid integer method duration');
    scalar(method.effort,'method effort');
    if(typeof method.exertive!=='boolean'||(!method.exertive&&method.effort!==0))fail('Invalid method exertion');
    if(method.skill!==null)id(method.skill,'skill ID');
    identifiers(method.demandIds,'method demands',32);
    if(method.demandIds.some(demand=>!demands.has(demand)))fail('Unknown method demand');
    resources(method.resourceCosts,'method resource costs','amount');
  }
  return {actors,demands,methodIds};
}
function validate(state) {
  exact(state,'functional context',['version','now','catalog','events']);
  if(state.version!==FUNCTIONAL_CONTEXT_VERSION)fail('Incompatible functional context version');
  minute(state.now,'functional clock');
  const known=catalog(state.catalog);
  array(state.events,'functional history',128);
  const eventIds=new Set(),restrictions=new Map();let previousAt=-1;
  for(const event of state.events) {
    if(!event||typeof event!=='object')fail('Invalid functional event');
    if(event.kind==='restrict') {
      exact(event,'restriction event',['kind','id','actorId','demandId','sourceId','at','reviewAt']);
      id(event.actorId,'restriction actor');id(event.demandId,'restriction demand');
      if(!known.actors.has(event.actorId)||!known.demands.has(event.demandId))fail('Unknown restriction actor or demand');
      minute(event.reviewAt,'restriction review date');
      if(event.reviewAt<=event.at)fail('Review date must follow restriction');
      restrictions.set(event.id,{event,cleared:false,reviewAt:event.reviewAt});
    } else if(event.kind==='reassess') {
      exact(event,'reassessment event',['kind','id','restrictionId','sourceId','at','decision','reviewAt']);
      id(event.restrictionId,'restriction ID');
      const current=restrictions.get(event.restrictionId);
      if(!current||current.cleared)fail('Reassessment needs an active restriction');
      if(event.decision==='maintain') {
        minute(event.reviewAt,'next review date');
        if(event.reviewAt<=event.at)fail('Next review date must follow reassessment');
        current.reviewAt=event.reviewAt;
      } else if(event.decision==='clear') {
        if(event.reviewAt!==null)fail('Cleared restriction cannot retain a review date');
        current.cleared=true;
      } else fail('Invalid reassessment decision');
    } else fail('Invalid functional event kind');
    id(event.id,'event ID');id(event.sourceId,'event source');
    if(!known.actors.has(event.sourceId))fail('Unknown event source actor');
    minute(event.at,'event time');
    if(event.at<previousAt||event.at>state.now)fail('Invalid event chronology or future event');
    if(eventIds.has(event.id))fail('Duplicate functional event ID');
    eventIds.add(event.id);previousAt=event.at;
  }
  return {known,restrictions};
}
function checked(state) {validate(state);return copy(state);}

export function createFunctionalContext({now,actors,demands,methods}={}) {
  return checked({version:FUNCTIONAL_CONTEXT_VERSION,now,catalog:{actors,demands,methods},events:[]});
}
export function advanceFunctionalContext(state,to) {
  const next=checked(state);minute(to,'advance time');
  if(to<next.now)fail('Functional clock cannot reverse');
  next.now=to;return checked(next);
}
export function recordRestriction(state,{id:restrictionId,actorId,demandId,sourceId,at,reviewAt}={}) {
  const next=checked(state);
  if(at!==next.now)fail('Restriction must be recorded at current time');
  next.events.push({kind:'restrict',id:restrictionId,actorId,demandId,sourceId,at,reviewAt});
  return checked(next);
}
export function reassessRestriction(state,{id:reviewId,restrictionId,sourceId,at,decision,reviewAt}={}) {
  const next=checked(state);
  if(at!==next.now)fail('Reassessment must be recorded at current time');
  next.events.push({kind:'reassess',id:reviewId,restrictionId,sourceId,at,decision,reviewAt});
  return checked(next);
}
export function assessFunctionalMethod(state,{actorId,methodId,resources:availableResources}={}) {
  const next=checked(state),{known,restrictions}=validate(next);
  id(actorId,'assessment actor');id(methodId,'assessment method');
  if(!known.actors.has(actorId))fail('Unknown assessment actor');
  const method=next.catalog.methods.find(item=>item.id===methodId);
  if(!method)fail('Unknown assessment method');
  const reported=availableResources??[];
  resources(reported,'available resources','quantity');
  const quantities=new Map(reported.map(item=>[item.resourceId,item.quantity]));
  const reasonIds=[];
  for(const [restrictionId,current] of restrictions) {
    if(!current.cleared&&current.event.actorId===actorId&&method.demandIds.includes(current.event.demandId))reasonIds.push(restrictionId);
  }
  for(const cost of method.resourceCosts) {
    if((quantities.get(cost.resourceId)??0)<cost.amount)reasonIds.push(`resource:${cost.resourceId}`);
  }
  return copy({available:reasonIds.length===0,reasonIds,
    action:{actionId:method.actionId,targetId:null,durationMinutes:method.durationMinutes,effort:method.effort,
      exertive:method.exertive,activity:'active',skill:method.skill},resourceCosts:method.resourceCosts});
}
export function getFunctionalNotice(state,{actorId,noticeId}={}) {
  const next=checked(state);id(actorId,'notice actor');id(noticeId,'notice ID');
  if(!next.catalog.actors.includes(actorId))fail('Unknown notice actor');
  const event=next.events.find(item=>item.id===noticeId);
  if(!event)return null;
  const restriction=event.kind==='restrict'?event:next.events.find(item=>item.kind==='restrict'&&item.id===event.restrictionId);
  if(restriction.actorId!==actorId)return null;
  return copy({noticeId:event.id,restrictionId:restriction.id,actorId,demandId:restriction.demandId,sourceId:event.sourceId,
    at:event.at,reviewAt:event.reviewAt,decision:event.kind==='restrict'?'restrict':event.decision});
}
export function exportFunctionalContext(state) {
  return copy({format:FORMAT,version:1,context:checked(state)});
}
export function restoreFunctionalContext(snapshot,expectedActors) {
  exact(snapshot,'functional snapshot',['format','version','context']);
  if(snapshot.format!==FORMAT||snapshot.version!==1)fail('Incompatible functional snapshot');
  const state=checked(snapshot.context);
  if(!Array.isArray(expectedActors)||expectedActors.length!==state.catalog.actors.length||
    expectedActors.some((actor,index)=>actor!==state.catalog.actors[index]))fail('Functional actor owner mismatch');
  return state;
}
