const STATUSES=new Set(['proposed','accepted','revised','withdrawn','fulfilled','breached']);
const TERMINAL=new Set(['withdrawn','fulfilled','breached']);
const CATALOG_FIELDS=['actors','facts','purposes','commitments','actions'];

function record(value,name,required) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))) {
    throw new Error(`Invalid ${name} object`);
  }
  const allowed=new Set(required);
  for(const key of Reflect.ownKeys(value)) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!descriptor.enumerable||!Object.hasOwn(descriptor,'value')||!allowed.has(key)) {
      throw new Error(`Unknown or non-JSON ${name} field`);
    }
  }
  for(const key of required)if(!Object.hasOwn(value,key))throw new Error(`Missing ${name} ${key}`);
}

function label(value,name) {
  if(typeof value!=='string'||value.length<1||value.length>120||value.trim()!==value)throw new Error(`Invalid ${name}`);
}

function identity(value,name) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}

function minute(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`${name} must be a nonnegative safe integer`);
}

function list(value,name) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw new Error(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==value.length+1||!keys.includes('length'))throw new Error(`Invalid ${name}`);
  for(let index=0;index<value.length;index++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name}`);
  }
  if(keys.some(key=>key!=='length'&&(typeof key!=='string'||!/^\d+$/.test(key)||Number(key)>=value.length)))throw new Error(`Invalid ${name}`);
}

function validateCatalog(catalog) {
  record(catalog,'catalog',CATALOG_FIELDS);
  for(const field of CATALOG_FIELDS) {
    const values=catalog[field];
    list(values,`catalog ${field}`);
    const ids=new Set();
    for(const id of values) {
      identity(id,`${field} ID`);
      if(ids.has(id))throw new Error(`Duplicate catalog ${field} ID`);
      ids.add(id);
    }
  }
  return catalog;
}

function known(catalog,field,id,name) {
  identity(id,name);
  if(!catalog[field].includes(id))throw new Error(`Unknown ${name}`);
}

function validateCommitment(commitment,catalog) {
  record(commitment,'commitment',['id','debtorId','creditorId','dueAt','terms','status','revision','updatedAt','outcomeId']);
  known(catalog,'commitments',commitment.id,'commitment ID');
  known(catalog,'actors',commitment.debtorId,'debtor actor ID');
  known(catalog,'actors',commitment.creditorId,'creditor actor ID');
  if(commitment.debtorId===commitment.creditorId)throw new Error('Commitment endpoints must be different');
  minute(commitment.dueAt,'Commitment due time');
  label(commitment.terms,'commitment terms');
  if(!STATUSES.has(commitment.status))throw new Error('Invalid commitment status');
  if(!Number.isSafeInteger(commitment.revision)||commitment.revision<0)throw new Error('Invalid commitment revision');
  minute(commitment.updatedAt,'Commitment update time');
  if(commitment.status==='fulfilled')label(commitment.outcomeId,'outcome ID');
  else if(commitment.outcomeId!==null)throw new Error('Only a fulfilled commitment may have an outcome ID');
  if(commitment.status==='proposed'&&(commitment.revision!==0||commitment.updatedAt!==0))throw new Error('Malformed proposed commitment');
  if(commitment.status==='revised'&&commitment.revision<1)throw new Error('Malformed revised commitment');
  return commitment;
}

function detached(commitment,catalog) {
  return structuredClone(validateCommitment(commitment,validateCatalog(catalog)));
}

function transitionInput(input,type) {
  const common=['type','actorId','at'];
  const fields=type==='revise'?[...common,'dueAt','terms']:
    type==='fulfill'?[...common,'outcomeId','completed']:common;
  record(input,`${type} transition`,fields);
}

function actorIs(input,expected,role) {
  if(input.actorId!==expected)throw new Error(`Only the ${role} may perform this transition`);
}

export function createCommitment(input,catalog) {
  const checkedCatalog=validateCatalog(catalog);
  record(input,'commitment setup',['id','debtorId','creditorId','dueAt','terms']);
  const commitment={...input,status:'proposed',revision:0,updatedAt:0,outcomeId:null};
  return detached(commitment,checkedCatalog);
}

export function transitionCommitment(commitment,input,catalog) {
  const checkedCatalog=validateCatalog(catalog);
  const next=detached(commitment,checkedCatalog);
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid commitment transition object');
  const typeDescriptor=Object.getOwnPropertyDescriptor(input,'type');
  if(!typeDescriptor||!Object.hasOwn(typeDescriptor,'value')||typeof typeDescriptor.value!=='string')throw new Error('Missing commitment transition type');
  const type=typeDescriptor.value;
  if(!['accept','revise','withdraw','fulfill','breach'].includes(type))throw new Error('Invalid commitment transition type');
  transitionInput(input,type);
  minute(input.at,'Transition time');
  if(input.at<next.updatedAt)throw new Error('Transition time must be monotonic');
  if(TERMINAL.has(next.status))throw new Error('Terminal commitment cannot transition');
  if(input.actorId!==null)known(checkedCatalog,'actors',input.actorId,'transition actor ID');
  if(next.status==='accepted'&&input.at>next.dueAt&&type!=='breach')throw new Error('Overdue accepted commitment requires a breach event');

  if(type==='accept') {
    if(!['proposed','revised'].includes(next.status))throw new Error('Only a proposed or revised commitment can be accepted');
    actorIs(input,next.debtorId,'debtor');
    if(input.at>next.dueAt)throw new Error('Commitment cannot be accepted after its deadline');
    next.status='accepted';
  } else if(type==='revise') {
    if(!['proposed','accepted','revised'].includes(next.status))throw new Error('Commitment cannot be revised from its current status');
    actorIs(input,next.creditorId,'creditor');
    minute(input.dueAt,'Revised due time');
    label(input.terms,'revised commitment terms');
    if(input.dueAt<input.at)throw new Error('Revised deadline cannot already be past due');
    if(next.revision===Number.MAX_SAFE_INTEGER)throw new Error('Commitment revision limit reached');
    next.dueAt=input.dueAt;
    next.terms=input.terms;
    next.revision+=1;
    next.status='revised';
  } else if(type==='withdraw') {
    if(!['proposed','accepted','revised'].includes(next.status))throw new Error('Commitment cannot be withdrawn from its current status');
    actorIs(input,next.creditorId,'creditor');
    next.status='withdrawn';
  } else if(type==='fulfill') {
    if(next.status!=='accepted')throw new Error('Only an accepted commitment can be fulfilled');
    if(input.actorId!==null)throw new Error('Only a host event may confirm fulfillment');
    label(input.outcomeId,'outcome ID');
    if(input.completed!==true)throw new Error('Fulfillment receipt must confirm completed true');
    next.outcomeId=input.outcomeId;
    next.status='fulfilled';
  } else {
    if(next.status!=='accepted')throw new Error('Only an accepted commitment can be breached');
    if(input.actorId!==null)throw new Error('Only a host event may mark breach');
    if(input.at<=next.dueAt)throw new Error('Breach must occur after the deadline');
    next.status='breached';
  }

  next.updatedAt=input.at;
  return detached(next,checkedCatalog);
}
