/** Private engineering candidate. Records host-attested attribution, not authenticated truth. */
export const BELIEFS_VERSION='beliefs-0.1.0';

const FORMAT='human-framework-beliefs';
const MAX_RECEIPTS=256;
const stateFields=['version','ownerId','originAt','now','propositions','sources','maxReceipts','receipts'];
const evidenceFields=['receiptId','propositionId','sourceId','originId','value','observedAt','receivedAt','expiresAt','correctsReceiptId'];
const retractionFields=['receiptId','targetReceiptId','sourceId','originId','receivedAt'];
const copy=value=>structuredClone(value);

function object(value,fields,label) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${label} fields`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Invalid ${label} fields`);
  for(const key of fields) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${label} fields`);
  }
}

function setupObject(value) {
  const required=['ownerId','propositions','sources'],allowed=[...required,'now','maxReceipts'];
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('Invalid belief setup fields');
  const keys=Reflect.ownKeys(value);
  if(keys.some(key=>typeof key!=='string'||!allowed.includes(key))||required.some(key=>!keys.includes(key)))throw new Error('Invalid belief setup fields');
  for(const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error('Invalid belief setup fields');
  }
}

function list(value,label) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw new Error(`Invalid ${label}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==value.length+1||!keys.includes('length'))throw new Error(`Invalid ${label}`);
  for(let index=0;index<value.length;index++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${label}`);
  }
  if(keys.some(key=>key!=='length'&&(!/^\d+$/.test(key)||Number(key)>=value.length)))throw new Error(`Invalid ${label}`);
}

function identity(value,label) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${label}`);
}

function time(value,label) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0)||value>1e12)throw new Error(`Invalid ${label}`);
}

function catalog(value,label) {
  list(value,label);
  if(value.length<1||value.length>256)throw new Error(`Invalid ${label} size`);
  const ids=new Set();
  for(const id of value) {
    identity(id,`${label} ID`);
    if(ids.has(id))throw new Error(`Duplicate ${label} ID`);
    ids.add(id);
  }
}

function known(id,values,label) {
  identity(id,label);
  if(!values.includes(id))throw new Error(`Unknown ${label}`);
}

function sameRecord(left,right,fields) {
  return fields.every(field=>left[field]===right[field]);
}

function claimMatches(left,right) {
  return left.propositionId===right.propositionId&&left.originId===right.originId&&
    left.observedAt===right.observedAt&&left.value===right.value;
}

function validateEvidence(receipt,state,prior) {
  object(receipt,evidenceFields,'evidence receipt');
  identity(receipt.receiptId,'receipt ID');
  known(receipt.propositionId,state.propositions,'proposition ID');
  known(receipt.sourceId,state.sources,'source ID');
  known(receipt.originId,state.sources,'origin ID');
  if(typeof receipt.value!=='boolean')throw new Error('Invalid evidence value');
  time(receipt.observedAt,'observed time');time(receipt.receivedAt,'received time');time(receipt.expiresAt,'expiration time');
  if(receipt.observedAt>receipt.receivedAt)throw new Error('Evidence is observed in the future');
  if(receipt.expiresAt<=receipt.observedAt)throw new Error('Evidence expiration must follow observation');
  if(receipt.correctsReceiptId!==null) {
    identity(receipt.correctsReceiptId,'corrected receipt ID');
    if(receipt.sourceId!==receipt.originId)throw new Error('A correction must be authored by its attributed origin source');
    const target=prior.find(event=>event.kind==='evidence'&&event.receiptId===receipt.correctsReceiptId);
    if(!target)throw new Error('Correction target must be an earlier evidence receipt');
    if(target.propositionId!==receipt.propositionId||target.originId!==receipt.originId)throw new Error('Correction target has a different proposition or origin');
    if(receipt.observedAt<target.observedAt)throw new Error('Correction observation cannot move backward');
    if(claimMatches(target,receipt))throw new Error('A correction must change the semantic claim');
  }
  const matchingClaim=prior.find(event=>event.kind==='evidence'&&claimMatches(event,receipt));
  if(matchingClaim&&matchingClaim.expiresAt!==receipt.expiresAt)throw new Error('Forwarded copies must preserve the original claim expiration');
  return receipt;
}

function validateRetraction(receipt,state,prior) {
  object(receipt,retractionFields,'retraction receipt');
  identity(receipt.receiptId,'receipt ID');identity(receipt.targetReceiptId,'retracted receipt ID');
  known(receipt.sourceId,state.sources,'source ID');known(receipt.originId,state.sources,'origin ID');
  time(receipt.receivedAt,'received time');
  if(receipt.sourceId!==receipt.originId)throw new Error('A retraction must be authored by its attributed origin source');
  const target=prior.find(event=>event.kind==='evidence'&&event.receiptId===receipt.targetReceiptId);
  if(!target)throw new Error('Retraction target must be an earlier evidence receipt');
  if(target.originId!==receipt.originId)throw new Error('Retraction target has a different origin');
  return receipt;
}

function validateState(state) {
  object(state,stateFields,'belief state');
  if(state.version!==BELIEFS_VERSION)throw new Error('Incompatible belief version');
  identity(state.ownerId,'belief owner ID');time(state.originAt,'belief origin time');time(state.now,'belief time');
  if(state.now<state.originAt)throw new Error('Belief time precedes its origin');
  catalog(state.propositions,'propositions');catalog(state.sources,'sources');
  if(!Number.isSafeInteger(state.maxReceipts)||state.maxReceipts<1||state.maxReceipts>MAX_RECEIPTS)throw new Error(`Belief max receipts must be between 1 and ${MAX_RECEIPTS}`);
  list(state.receipts,'belief receipts');
  if(state.receipts.length>state.maxReceipts)throw new Error('Belief receipt limit exceeded');
  const ids=new Set(),prior=[];let lastReceived=state.originAt;
  for(const event of state.receipts) {
    if(!event||typeof event!=='object')throw new Error('Invalid belief receipt');
    const kindDescriptor=Object.getOwnPropertyDescriptor(event,'kind');
    if(!kindDescriptor?.enumerable||!Object.hasOwn(kindDescriptor,'value'))throw new Error('Invalid belief receipt kind');
    const fields=event.kind==='evidence'?['kind',...evidenceFields]:event.kind==='retraction'?['kind',...retractionFields]:null;
    if(!fields)throw new Error('Invalid belief receipt kind');
    object(event,fields,'belief receipt');
    const input=Object.fromEntries(fields.slice(1).map(field=>[field,event[field]]));
    if(event.kind==='evidence')validateEvidence(input,state,prior);
    else validateRetraction(input,state,prior);
    if(ids.has(event.receiptId))throw new Error('Duplicate belief receipt ID');
    if(event.receivedAt<lastReceived||event.receivedAt>state.now)throw new Error('Belief receipts are out of received order');
    ids.add(event.receiptId);prior.push(event);lastReceived=event.receivedAt;
  }
  return state;
}

function validateArrival(state,input,kind) {
  const prior=state.receipts;
  if(kind==='evidence')validateEvidence(input,state,prior);
  else validateRetraction(input,state,prior);
  const existing=prior.find(event=>event.receiptId===input.receiptId);
  if(existing) {
    const fields=kind==='evidence'?evidenceFields:retractionFields;
    if(existing.kind!==kind||!sameRecord(existing,input,fields))throw new Error('Conflicting belief receipt ID');
    return true;
  }
  if(input.receivedAt!==state.now)throw new Error('Evidence must be received at the current belief time');
  if(state.receipts.length===state.maxReceipts)throw new Error('Belief receipt limit reached');
  return false;
}

export function createBeliefs(input={}) {
  setupObject(input);
  const {ownerId,now=0,propositions,sources,maxReceipts=MAX_RECEIPTS}=input;
  const state={version:BELIEFS_VERSION,ownerId,originAt:now,now,propositions:copy(propositions),sources:copy(sources),maxReceipts,receipts:[]};
  return copy(validateState(state));
}

export function advanceBeliefs(state,now) {
  validateState(state);time(now,'belief time');
  if(now<state.now)throw new Error('Belief time cannot move backward');
  const next=copy(state);next.now=now;
  return copy(validateState(next));
}

export function receiveEvidence(state,receipt) {
  validateState(state);
  if(validateArrival(state,receipt,'evidence'))return copy(state);
  const next=copy(state);next.receipts.push({kind:'evidence',...copy(receipt)});
  return copy(validateState(next));
}

export function retractEvidence(state,retraction) {
  validateState(state);
  if(validateArrival(state,retraction,'retraction'))return copy(state);
  const next=copy(state);next.receipts.push({kind:'retraction',...copy(retraction)});
  return copy(validateState(next));
}

function suppressedClaims(receipts) {
  const claims=[];
  for(const event of receipts) {
    let target=null;
    if(event.kind==='evidence'&&event.correctsReceiptId!==null)target=receipts.find(item=>item.kind==='evidence'&&item.receiptId===event.correctsReceiptId);
    if(event.kind==='retraction')target=receipts.find(item=>item.kind==='evidence'&&item.receiptId===event.targetReceiptId);
    if(target&&!claims.some(item=>claimMatches(item,target)))claims.push(target);
  }
  return claims;
}

function resolveBelief(state,propositionId,suppressed) {
  const active=[];
  for(const originId of state.sources) {
    const reports=state.receipts.filter(event=>event.kind==='evidence'&&event.propositionId===propositionId&&event.originId===originId);
    if(reports.length===0)continue;
    const newestObservedAt=Math.max(...reports.map(report=>report.observedAt));
    for(const report of reports) {
      if(report.observedAt!==newestObservedAt||report.expiresAt<=state.now||suppressed.some(claim=>claimMatches(claim,report)))continue;
      active.push(report);
    }
  }
  const trueOrigins=state.sources.filter(originId=>active.some(report=>report.originId===originId&&report.value));
  const falseOrigins=state.sources.filter(originId=>active.some(report=>report.originId===originId&&!report.value));
  const effectiveReceiptIds=active.map(report=>report.receiptId);
  if(trueOrigins.length===0&&falseOrigins.length===0)return {propositionId,status:'unknown',value:null,supportingOriginIds:[],opposingOriginIds:[],effectiveReceiptIds:[]};
  if(trueOrigins.length>0&&falseOrigins.length>0)return {propositionId,status:'conflict',value:null,supportingOriginIds:trueOrigins,opposingOriginIds:falseOrigins,effectiveReceiptIds};
  const value=trueOrigins.length>0;
  return {propositionId,status:'resolved',value,supportingOriginIds:value?trueOrigins:falseOrigins,opposingOriginIds:[],effectiveReceiptIds};
}

/** Diagnostic provenance view. Consumers should branch only on resolved value. */
export function getBeliefView(state) {
  validateState(state);
  const suppressed=suppressedClaims(state.receipts);
  return copy({
    version:state.version,ownerId:state.ownerId,now:state.now,
    beliefs:state.propositions.map(propositionId=>resolveBelief(state,propositionId,suppressed)),
    receiptCount:state.receipts.length,maxReceipts:state.maxReceipts,
  });
}

export function exportBeliefs(state) {
  validateState(state);return copy({format:FORMAT,version:1,beliefs:state});
}

export function restoreBeliefs(snapshot,ownerId) {
  object(snapshot,['format','version','beliefs'],'belief snapshot');
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw new Error('Incompatible belief snapshot');
  identity(ownerId,'expected belief owner ID');
  validateState(snapshot.beliefs);
  if(snapshot.beliefs.ownerId!==ownerId)throw new Error('Belief owner mismatch; cross-actor restoration is forbidden');
  return copy(snapshot.beliefs);
}
