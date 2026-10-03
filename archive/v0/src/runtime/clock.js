/** Pure integer-minute scheduling. Hosts own people, decisions and event effects. */
export const CLOCK_VERSION='0.1.0';
export const CLOCK_LIMITS=Object.freeze({pendingEvents:1024,dataCharacters:16384,dataDepth:24,snapshotCharacters:1048576});

function record(value,name,required,optional=[]) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name} object`);
  for(const key of Reflect.ownKeys(value)) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!descriptor.enumerable||!Object.hasOwn(descriptor,'value')||![...required,...optional].includes(key))throw new Error(`Unknown or non-JSON ${name} field`);
  }
  for(const key of required)if(!Object.hasOwn(value,key))throw new Error(`Missing ${name} ${key}`);
}

// JSON.stringify alone silently drops undefined, properties and accessors.
// Reject those representations before producing a detached canonical JSON copy.
function jsonText(value,name,characterLimit,depthLimit) {
  const ancestors=new Set();let budget=characterLimit;
  function visit(item,depth) {
    if(depth>depthLimit)throw new Error(`${name} exceeds JSON depth limit`);
    if(--budget<0)throw new Error(`${name} exceeds JSON size limit`);
    if(item===null||typeof item==='boolean')return;
    if(typeof item==='string') {budget-=item.length;if(budget<0)throw new Error(`${name} exceeds JSON size limit`);return;}
    if(typeof item==='number') {if(!Number.isFinite(item)||Object.is(item,-0))throw new Error(`${name} requires finite JSON numbers`);return;}
    if(typeof item!=='object')throw new Error(`${name} requires JSON values`);
    if(ancestors.has(item))throw new Error(`${name} contains a JSON cycle`);
    const array=Array.isArray(item);
    if(array&&Object.getPrototypeOf(item)!==Array.prototype)throw new Error(`${name} requires plain JSON arrays`);
    if(!array&&![Object.prototype,null].includes(Object.getPrototypeOf(item)))throw new Error(`${name} requires plain JSON objects`);
    const keys=Reflect.ownKeys(item);
    if(array&&(keys.length!==item.length+1||item.length>budget))throw new Error(`${name} requires a dense JSON array within size limit`);
    ancestors.add(item);
    for(const key of keys) {
      if(array&&key==='length')continue;
      const descriptor=Object.getOwnPropertyDescriptor(item,key);
      if(typeof key!=='string'||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`${name} contains a non-JSON property`);
      if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=item.length))throw new Error(`${name} contains a non-JSON array property`);
      budget-=key.length;
      visit(descriptor.value,depth+1);
    }
    ancestors.delete(item);
  }
  visit(value,0);
  const serialized=JSON.stringify(value);
  if(serialized.length>characterLimit)throw new Error(`${name} exceeds JSON size limit`);
  return serialized;
}

function minute(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`${name} must be a nonnegative safe integer minute`);
}
function label(value,name) {
  if(typeof value!=='string'||value.length<1||value.length>120||value.trim()!==value)throw new Error(`Invalid ${name}`);
}
function eventNumber(id) {
  if(typeof id!=='string'||!/^event:[1-9]\d*$/.test(id))throw new Error('Invalid event ID');
  const number=Number(id.slice(6));
  if(!Number.isSafeInteger(number))throw new Error('Invalid event ID');
  return number;
}
function validateEvent(event,now,nextEvent) {
  record(event,'event',['id','at','type','actorId','data']);
  const sequence=eventNumber(event.id);
  if(sequence>=nextEvent)throw new Error('Event ID exceeds clock counter');
  minute(event.at,'Event time');if(event.at<=now)throw new Error('Event time must be after clock time');
  label(event.type,'event type');if(event.actorId!==null)label(event.actorId,'actor ID');
  jsonText(event.data,'Event data',CLOCK_LIMITS.dataCharacters,CLOCK_LIMITS.dataDepth);
  return sequence;
}
function validateClock(clock) {
  record(clock,'clock',['version','now','nextEvent','queue']);
  if(clock.version!==CLOCK_VERSION)throw new Error('Incompatible clock version');
  minute(clock.now,'Clock time');
  if(!Number.isSafeInteger(clock.nextEvent)||clock.nextEvent<1)throw new Error('Invalid next event counter');
  if(!Array.isArray(clock.queue)||clock.queue.length>CLOCK_LIMITS.pendingEvents)throw new Error('Pending event queue exceeds limit');
  // Includes array shape, snapshot size, prototype and accessor checks.
  const serialized=jsonText(clock,'Clock',CLOCK_LIMITS.snapshotCharacters,CLOCK_LIMITS.dataDepth+3);
  let previous=null;const ids=new Set();
  for(const event of clock.queue) {
    const sequence=validateEvent(event,clock.now,clock.nextEvent);
    if(ids.has(sequence))throw new Error('Duplicate event ID');
    ids.add(sequence);
    if(previous&&(event.at<previous.at||(event.at===previous.at&&sequence<=previous.sequence)))throw new Error('Invalid event queue order');
    previous={at:event.at,sequence};
  }
  return serialized;
}
const detach=clock=>JSON.parse(validateClock(clock));

export function createClock(input={}) {
  record(input,'clock setup',[],['now']);
  const now=Object.hasOwn(input,'now')?input.now:0;
  minute(now,'Clock time');
  return {version:CLOCK_VERSION,now,nextEvent:1,queue:[]};
}

export function scheduleEvent(clock,input) {
  const next=detach(clock);
  record(input,'event setup',['at','type'],['actorId','data']);
  if(next.queue.length>=CLOCK_LIMITS.pendingEvents)throw new Error('Pending event queue is full');
  if(next.nextEvent===Number.MAX_SAFE_INTEGER)throw new Error('Event ID space exhausted');
  const eventId=`event:${next.nextEvent++}`;
  const event={id:eventId,at:input.at,type:input.type,
    actorId:Object.hasOwn(input,'actorId')?input.actorId:null,data:Object.hasOwn(input,'data')?input.data:null};
  validateEvent(event,next.now,next.nextEvent);
  // Inserting after equal times preserves the global monotonic ID order.
  const before=next.queue.findIndex(queued=>queued.at>event.at);
  next.queue.splice(before<0?next.queue.length:before,0,event);
  return {clock:detach(next),eventId};
}

/** Canceling an absent valid ID is a no-op; event IDs are never recycled. */
export function cancelEvent(clock,eventId) {
  const next=detach(clock);eventNumber(eventId);
  next.queue=next.queue.filter(event=>event.id!==eventId);
  return next;
}

/** Stop at the earliest due timestamp, allowing the host to settle and schedule. */
export function advanceClock(clock,target) {
  const next=detach(clock);minute(target,'Target time');
  if(target<next.now)throw new Error('Clock cannot advance backward');
  if(!next.queue.length||next.queue[0].at>target) {
    next.now=target;return {clock:next,events:[]};
  }
  next.now=next.queue[0].at;
  const boundary=next.queue.findIndex(event=>event.at!==next.now);
  const events=next.queue.splice(0,boundary<0?next.queue.length:boundary);
  return {clock:next,events};
}

export function exportClock(clock) {
  return {format:'human-framework-clock',version:1,clockVersion:CLOCK_VERSION,clock:detach(clock)};
}

export function restoreClock(snapshot) {
  record(snapshot,'clock snapshot',['format','version','clockVersion','clock']);
  if(snapshot.format!=='human-framework-clock'||snapshot.version!==1||snapshot.clockVersion!==CLOCK_VERSION)throw new Error('Incompatible clock snapshot');
  return detach(snapshot.clock);
}
