/** Private engineering candidate. Stores delivered claims, not world truth. */
export const MEMORY_VERSION='observation-memory-0.1.0';
const copy=value=>structuredClone(value);
const memoryKeys=['version','owner','capacity','lifetimeMinutes','now','lastSequence','entries'];
const reportKeys=['sequence','observer','source','channel','cue','value','observedAt'];

function object(value,keys,label){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    ![Object.prototype,null].includes(Object.getPrototypeOf(value))||
    Reflect.ownKeys(value).length!==keys.length||keys.some(key=>{
      const field=Object.getOwnPropertyDescriptor(value,key);
      return !field||!field.enumerable||!Object.hasOwn(field,'value');
    }))throw new Error(`Invalid ${label} fields`);
}
function integer(value,label,min,max){
  if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`Invalid ${label}`);
}
function time(value,label){
  if(!Number.isFinite(value)||value<0||value>1e12)throw new Error(`Invalid ${label} time`);
}
function identity(value,label){
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${label}`);
}
function report(value,owner,now){
  object(value,reportKeys,'observation');
  integer(value.sequence,'receipt sequence',1,Number.MAX_SAFE_INTEGER);
  if(value.observer!==owner)throw new Error('Observation belongs to another observer');
  for(const key of ['source','channel','cue'])identity(value[key],key);
  if(typeof value.value!=='string'||value.value.length<1||value.value.length>128)throw new Error('Invalid observation value');
  time(value.observedAt,'observation');
  if(value.observedAt>now)throw new Error('Observation is from the future');
}
function validate(memory){
  object(memory,memoryKeys,'memory');
  if(memory.version!==MEMORY_VERSION)throw new Error('Incompatible memory version');
  identity(memory.owner,'owner');integer(memory.capacity,'capacity',1,64);
  integer(memory.lifetimeMinutes,'lifetime',1,1000000);time(memory.now,'memory');
  integer(memory.lastSequence,'last receipt',0,Number.MAX_SAFE_INTEGER);
  if(!Array.isArray(memory.entries)||Object.getPrototypeOf(memory.entries)!==Array.prototype||
    memory.entries.length>memory.capacity||Reflect.ownKeys(memory.entries).length!==memory.entries.length+1)
    throw new Error('Invalid memory entries');
  let previous=0;const cues=new Set();
  for(let index=0;index<memory.entries.length;index++){
    const field=Object.getOwnPropertyDescriptor(memory.entries,String(index));
    if(!field||!Object.hasOwn(field,'value')||!field.enumerable)throw new Error('Invalid memory entry');
    const entry=field.value;report(entry,memory.owner,memory.now);
    if(entry.sequence<=previous||entry.sequence>memory.lastSequence)throw new Error('Inconsistent receipt order');
    if(cues.has(entry.cue))throw new Error('Duplicate memory cue');
    if(memory.now-entry.observedAt>=memory.lifetimeMinutes)throw new Error('Expired memory entry');
    cues.add(entry.cue);previous=entry.sequence;
  }
  return memory;
}
function checkNow(memory,now){
  time(now,'query');if(now<memory.now)throw new Error('Memory time cannot decrease');
}

export function createMemory({owner,capacity=4,lifetimeMinutes=60}={}){
  return validate({version:MEMORY_VERSION,owner,capacity,lifetimeMinutes,now:0,lastSequence:0,entries:[]});
}

/** Hosts call this when their time advances. Retrieval alone does not mutate. */
export function advanceMemory(memory,now){
  validate(memory);checkNow(memory,now);
  return {...copy(memory),now,entries:memory.entries.filter(entry=>now-entry.observedAt<memory.lifetimeMinutes).map(copy)};
}

/** Sequence is an actor-local host receipt high-water mark, not an audit log. */
export function encodeObservation(memory,observation,now){
  validate(memory);checkNow(memory,now);report(observation,memory.owner,now);
  if(observation.sequence<=memory.lastSequence)throw new Error('Replayed or out-of-order observation receipt');
  const next=advanceMemory(memory,now);next.lastSequence=observation.sequence;
  if(now-observation.observedAt<next.lifetimeMinutes){
    next.entries=next.entries.filter(entry=>entry.cue!==observation.cue);
    next.entries.push(copy(observation));
    if(next.entries.length>next.capacity)next.entries.shift();
  }
  return next;
}

export function recallObservation(memory,cue,now){
  validate(memory);checkNow(memory,now);identity(cue,'cue');
  const entry=memory.entries.find(item=>item.cue===cue&&now-item.observedAt<memory.lifetimeMinutes);
  return entry?{...copy(entry),ageMinutes:now-entry.observedAt}:null;
}

export function exportMemory(memory){
  validate(memory);return {format:'human-framework-observation-memory',version:1,memory:copy(memory)};
}

export function restoreMemory(snapshot){
  object(snapshot,['format','version','memory'],'memory snapshot');
  if(snapshot.format!=='human-framework-observation-memory'||snapshot.version!==1)throw new Error('Incompatible memory snapshot');
  return copy(validate(snapshot.memory));
}
