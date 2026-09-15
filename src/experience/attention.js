/** Private symbolic candidate: host-attested delivery and payment, not authenticated truth. */
export const ATTENTION_VERSION='attention-0.1.0';

const FORMAT='human-framework-attention';
const MAX_MESSAGES=128;
const stateFields=['version','ownerId','originAt','now','reviewActionId','minReviewMinutes','maxMessages','messages','processings'];
const messageFields=['messageId','contextId','propositionId','sourceId','originId','value','occurredAt','deliveredAt','expiresAt','correctsReceiptId'];
const processingFields=['messageId','attemptId','processedAt'];
const attemptFields=['ownerId','attemptId','actionId','status','finishedAt','elapsedMinutes'];
const copy=value=>structuredClone(value);

function exact(value,fields,label) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${label} fields`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Invalid ${label} fields`);
  for(const key of fields) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${label} data`);
  }
}

function setup(value) {
  const required=['ownerId','reviewActionId'],allowed=[...required,'now','minReviewMinutes','maxMessages'];
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('Invalid attention setup');
  const keys=Reflect.ownKeys(value);
  if(required.some(key=>!keys.includes(key))||keys.some(key=>typeof key!=='string'||!allowed.includes(key)))throw new Error('Invalid attention setup');
  for(const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error('Invalid attention setup data');
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
}

function id(value,label) {
  if(typeof value!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${label}`);
}
function minute(value,label) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0)||value>1e12)throw new Error(`Invalid ${label}`);
}
function attemptId(value,ownerId) {
  if(typeof value!=='string'||!value.startsWith(`${ownerId}:`)||!canonicalOrdinal(value.slice(ownerId.length+1)))throw new Error('Review attempt owner mismatch');
  const ordinal=Number(value.slice(ownerId.length+1));
  if(!Number.isSafeInteger(ordinal)||ordinal<1)throw new Error('Invalid review attempt ID');
}
function canonicalOrdinal(value) {return /^[1-9][0-9]*$/.test(value);}
function same(left,right,fields) {return fields.every(field=>left[field]===right[field]);}
function sameClaim(left,right) {
  return left.originId===right.originId&&left.propositionId===right.propositionId&&left.value===right.value&&
    left.occurredAt===right.occurredAt&&left.expiresAt===right.expiresAt&&left.correctsReceiptId===right.correctsReceiptId;
}
function sameOriginAssertion(left,right) {
  return left.originId===right.originId&&left.propositionId===right.propositionId&&left.value===right.value&&
    left.occurredAt===right.occurredAt&&left.correctsReceiptId===right.correctsReceiptId;
}

function validateMessage(message) {
  exact(message,messageFields,'attention message');
  for(const field of ['messageId','contextId','propositionId','sourceId','originId'])id(message[field],field);
  if(typeof message.value!=='boolean')throw new Error('Invalid message value');
  minute(message.occurredAt,'message occurrence');minute(message.deliveredAt,'message delivery');minute(message.expiresAt,'message expiry');
  if(message.occurredAt>message.deliveredAt)throw new Error('Message occurred in the future');
  if(message.expiresAt<=message.occurredAt)throw new Error('Message expiry must follow original occurrence');
  if(message.correctsReceiptId!==null) {
    id(message.correctsReceiptId,'corrected receipt ID');
    if(message.sourceId!==message.originId)throw new Error('Correction must be authored by its origin');
  }
}

function validateState(state) {
  exact(state,stateFields,'attention state');
  if(state.version!==ATTENTION_VERSION)throw new Error('Incompatible attention version');
  id(state.ownerId,'attention owner');id(state.reviewActionId,'review action');
  minute(state.originAt,'attention origin');minute(state.now,'attention time');
  if(state.now<state.originAt)throw new Error('Attention time precedes origin');
  if(!Number.isSafeInteger(state.minReviewMinutes)||state.minReviewMinutes<1||state.minReviewMinutes>1e12)throw new Error('Invalid minimum review minutes');
  if(!Number.isSafeInteger(state.maxMessages)||state.maxMessages<1||state.maxMessages>MAX_MESSAGES)throw new Error('Invalid message bound');
  list(state.messages,'attention messages');list(state.processings,'attention processings');
  if(state.messages.length>state.maxMessages||state.processings.length>state.messages.length)throw new Error('Attention message limit exceeded');
  const ids=new Set();let lastDelivery=state.originAt;
  for(const message of state.messages) {
    validateMessage(message);
    if(ids.has(message.messageId))throw new Error('Duplicate attention message ID');
    if(message.deliveredAt<lastDelivery||message.deliveredAt>state.now)throw new Error('Attention delivery order mismatch');
    if(state.messages.some(item=>item!==message&&sameOriginAssertion(item,message)&&item.expiresAt!==message.expiresAt))throw new Error('Forwarded origin copy expiry mismatch');
    ids.add(message.messageId);lastDelivery=message.deliveredAt;
  }
  const selected=new Set(),paid=new Set(),claims=[];let lastProcessing=state.originAt;
  for(const processing of state.processings) {
    exact(processing,processingFields,'attention processing');
    id(processing.messageId,'processed message ID');attemptId(processing.attemptId,state.ownerId);
    minute(processing.processedAt,'processing time');
    const message=state.messages.find(item=>item.messageId===processing.messageId);
    if(!message)throw new Error('Processing refers to absent message');
    if(processing.processedAt<message.deliveredAt||processing.processedAt>=message.expiresAt||processing.processedAt<lastProcessing||processing.processedAt>state.now)throw new Error('Processing time or expiry mismatch');
    if(selected.has(processing.messageId)||paid.has(processing.attemptId))throw new Error('Processing or paid attempt reused');
    if(claims.some(item=>sameClaim(item,message)))throw new Error('Duplicate origin claim processed');
    selected.add(processing.messageId);paid.add(processing.attemptId);claims.push(message);lastProcessing=processing.processedAt;
  }
  return state;
}

export function createAttention(input={}) {
  setup(input);
  const {ownerId,now=0,reviewActionId,minReviewMinutes=1,maxMessages=MAX_MESSAGES}=input;
  return copy(validateState({version:ATTENTION_VERSION,ownerId,originAt:now,now,reviewActionId,minReviewMinutes,maxMessages,messages:[],processings:[]}));
}

export function advanceAttention(state,now) {
  validateState(state);minute(now,'attention time');
  if(now<state.now)throw new Error('Attention time cannot move backward');
  const next=copy(state);next.now=now;
  return copy(validateState(next));
}

export function deliverMessage(state,message) {
  validateState(state);validateMessage(message);
  const prior=state.messages.find(item=>item.messageId===message.messageId);
  if(prior) {
    if(!same(prior,message,messageFields))throw new Error('Conflicting attention message ID');
    return copy(state);
  }
  if(message.deliveredAt!==state.now)throw new Error('Message must be delivered at current attention time');
  if(state.messages.some(item=>sameOriginAssertion(item,message)&&item.expiresAt!==message.expiresAt))throw new Error('Forwarded origin copy must preserve original expiry');
  if(state.messages.length===state.maxMessages)throw new Error('Attention message limit reached');
  const next=copy(state);next.messages.push(copy(message));
  return copy(validateState(next));
}

export function processSelectedMessage(state,command={}) {
  validateState(state);exact(command,['messageId','selectedByActor','attempt'],'processing command');
  const {messageId,selectedByActor,attempt}=command;
  id(messageId,'selected message ID');
  if(selectedByActor!==true)throw new Error('Message processing requires explicit actor selection');
  exact(attempt,attemptFields,'review attempt');
  id(attempt.ownerId,'review attempt owner');attemptId(attempt.attemptId,state.ownerId);
  id(attempt.actionId,'review attempt action');minute(attempt.finishedAt,'review finish');minute(attempt.elapsedMinutes,'review duration');
  if(attempt.ownerId!==state.ownerId||attempt.actionId!==state.reviewActionId||attempt.status!=='completed'||
    attempt.finishedAt!==state.now||attempt.elapsedMinutes<state.minReviewMinutes)throw new Error('Processing requires a current completed paid review');
  const message=state.messages.find(item=>item.messageId===messageId);
  if(!message)throw new Error('Selected message is unavailable');
  if(message.deliveredAt>state.now||message.expiresAt<=state.now)throw new Error('Selected message is expired or unavailable');
  if(state.processings.some(item=>item.messageId===messageId))throw new Error('Message already processed');
  if(state.processings.some(item=>item.attemptId===attempt.attemptId))throw new Error('Paid review attempt already used');
  if(state.processings.some(item=>sameClaim(state.messages.find(message=>message.messageId===item.messageId),message)))throw new Error('Duplicate origin claim already processed');
  const next=copy(state);next.processings.push({messageId,attemptId:attempt.attemptId,processedAt:state.now});
  validateState(next);
  const evidence={receiptId:message.messageId,propositionId:message.propositionId,sourceId:message.sourceId,originId:message.originId,
    value:message.value,observedAt:message.occurredAt,receivedAt:state.now,expiresAt:message.expiresAt,correctsReceiptId:message.correctsReceiptId};
  return copy({attention:next,evidence});
}

/** An inbox selector intentionally excludes proposition, value and correction content. */
export function getAttentionView(state) {
  validateState(state);
  return copy({version:state.version,ownerId:state.ownerId,now:state.now,
    messages:state.messages.map(message=>({messageId:message.messageId,contextId:message.contextId,sourceId:message.sourceId,
      originId:message.originId,occurredAt:message.occurredAt,deliveredAt:message.deliveredAt,expiresAt:message.expiresAt,
      processedAt:state.processings.find(item=>item.messageId===message.messageId)?.processedAt??null,
      available:message.deliveredAt<=state.now&&message.expiresAt>state.now&&
        !state.processings.some(item=>item.messageId===message.messageId||sameClaim(state.messages.find(message=>message.messageId===item.messageId),message))})),
    messageCount:state.messages.length,maxMessages:state.maxMessages,processedCount:state.processings.length});
}

export function exportAttention(state) {
  validateState(state);return copy({format:FORMAT,version:1,attention:state});
}

export function restoreAttention(snapshot,expectedOwnerId) {
  exact(snapshot,['format','version','attention'],'attention snapshot');
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw new Error('Incompatible attention snapshot');
  id(expectedOwnerId,'expected attention owner');
  validateState(snapshot.attention);
  if(snapshot.attention.ownerId!==expectedOwnerId)throw new Error('Attention owner mismatch; cross-actor restoration is forbidden');
  return copy(snapshot.attention);
}
