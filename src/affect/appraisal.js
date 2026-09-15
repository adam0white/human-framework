export const APPRAISAL_VERSION='0.1.0';
const FORMAT='human-framework-appraisal';
const copy=value=>structuredClone(value);

function object(value,name,allowed,required=allowed) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.some(key=>typeof key!=='string'||!allowed.includes(key))||required.some(key=>!Object.hasOwn(value,key)))throw new Error(`Invalid ${name} fields`);
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
function id(value,name) {
  if(typeof value!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}
function humanAttemptId(value,ownerId) {
  if(typeof value!=='string'||!value.startsWith(`${ownerId}:`))throw new Error('Paid attempt owner mismatch');
  const ordinal=value.slice(ownerId.length+1);
  if(!/^[1-9][0-9]*$/.test(ordinal)||!Number.isSafeInteger(Number(ordinal)))throw new Error('Invalid paid attempt ID');
}
function minute(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`Invalid ${name}`);
}
function positive(value,name,max) {
  if(!Number.isSafeInteger(value)||value<1||value>max)throw new Error(`Invalid ${name}`);
}
function ids(values,name,max=64) {
  array(values,name,max);
  const seen=new Set();
  for(const value of values) {
    id(value,name);
    if(seen.has(value))throw new Error(`Duplicate ${name}`);
    seen.add(value);
  }
}
function json(value,seen=new WeakSet()) {
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number') {if(!Number.isFinite(value))throw new Error('Invalid appraisal JSON number');return;}
  if(typeof value!=='object'||seen.has(value))throw new Error('Appraisal state must be a JSON tree');
  seen.add(value);
  if(Array.isArray(value))array(value,'JSON array',256);
  else object(value,'JSON object',Reflect.ownKeys(value).filter(key=>typeof key==='string'));
  for(const key of Object.keys(value))json(value[key],seen);
}
function context(value) {
  object(value,'appraisal context',['id','purposeId','propositionId','checkActionId','deliberateActionId','reflectionActionId']);
  for(const key of ['id','purposeId','propositionId','checkActionId','deliberateActionId','reflectionActionId'])id(value[key],key);
}
function record(value,state) {
  object(value,'appraisal record',['id','tendency','startedAt','expiresAt','signature','lastKey','seenSignatures']);
  id(value.id,'context ID');
  if(!state.contexts.some(item=>item.id===value.id))throw new Error('Unknown appraisal context');
  if(!['none','check','deliberate'].includes(value.tendency))throw new Error('Invalid appraisal tendency');
  array(value.seenSignatures,'seen appraisal signatures',128);
  if(new Set(value.seenSignatures).size!==value.seenSignatures.length)throw new Error('Duplicate appraisal signature');
  for(const signature of value.seenSignatures)if(typeof signature!=='string'||signature.length>12000)throw new Error('Invalid appraisal signature');
  if(value.lastKey!==null&&(typeof value.lastKey!=='string'||value.lastKey.length>12000))throw new Error('Invalid last appraisal key');
  if(value.startedAt===null||value.expiresAt===null||value.signature===null) {
    if(value.startedAt!==null||value.expiresAt!==null||value.signature!==null||value.tendency!=='none')throw new Error('Incomplete appraisal concern');
  } else {
    minute(value.startedAt,'concern start');minute(value.expiresAt,'concern expiry');
    if(value.startedAt>state.now||value.expiresAt-value.startedAt!==state.maxConcernMinutes)throw new Error('Invalid appraisal concern lifetime');
    if(typeof value.signature!=='string'||!value.seenSignatures.includes(value.signature))throw new Error('Unknown appraisal concern signature');
    if(value.tendency!=='none'&&state.now>=value.expiresAt)throw new Error('Expired appraisal tendency remains active');
  }
}
function paidReceipt(receipt,state,stored=false) {
  const fields=['receiptId','at','contextId','attemptId','actionId','elapsedMinutes','selectedByActor','completed'];
  if(stored)fields.push('concernStartedAt','concernExpiresAt','concernSignature');
  object(receipt,'paid regulation receipt',fields);
  id(receipt.receiptId,'regulation receipt ID');id(receipt.contextId,'regulation context ID');humanAttemptId(receipt.attemptId,state.ownerId);id(receipt.actionId,'reflection action ID');
  minute(receipt.at,'regulation time');positive(receipt.elapsedMinutes,'paid reflection minutes',1440);
  if(receipt.at>state.now||receipt.at<receipt.elapsedMinutes)throw new Error('Invalid paid reflection interval');
  if(receipt.selectedByActor!==true)throw new Error('Paid regulation must be voluntarily selected by actor');
  if(receipt.completed!==true)throw new Error('Paid regulation requires completed host-attested attempt');
  const specification=state.contexts.find(item=>item.id===receipt.contextId);
  if(!specification||receipt.actionId!==specification.reflectionActionId)throw new Error('Wrong reflection action');
  if(receipt.elapsedMinutes<state.minReflectionMinutes)throw new Error('Paid reflection below minimum duration');
  if(stored) {
    minute(receipt.concernStartedAt,'paid concern start');minute(receipt.concernExpiresAt,'paid concern expiry');
    if(receipt.concernExpiresAt-receipt.concernStartedAt!==state.maxConcernMinutes||receipt.at-receipt.elapsedMinutes<receipt.concernStartedAt||receipt.at>=receipt.concernExpiresAt)throw new Error('Paid receipt lies outside concern lifetime');
    if(typeof receipt.concernSignature!=='string'||!state.records.find(item=>item.id===receipt.contextId)?.seenSignatures.includes(receipt.concernSignature))throw new Error('Paid receipt lacks concern evidence');
  }
}
function validate(state) {
  json(state);
  object(state,'appraisal state',['version','ownerId','now','contexts','maxConcernMinutes','minReflectionMinutes','records','receipts']);
  if(state.version!==APPRAISAL_VERSION)throw new Error('Incompatible appraisal version');
  id(state.ownerId,'appraisal owner ID');minute(state.now,'appraisal time');
  positive(state.maxConcernMinutes,'concern lifetime',1440);positive(state.minReflectionMinutes,'reflection minimum',1440);
  array(state.contexts,'appraisal contexts',16);
  const contextIds=new Set();
  for(const specification of state.contexts) {
    context(specification);
    if(contextIds.has(specification.id))throw new Error('Duplicate appraisal context');
    contextIds.add(specification.id);
  }
  array(state.records,'appraisal records',16);
  if(state.records.length!==state.contexts.length)throw new Error('Missing appraisal record');
  const recordIds=new Set();
  for(const item of state.records) {
    record(item,state);
    if(recordIds.has(item.id))throw new Error('Duplicate appraisal record');
    recordIds.add(item.id);
  }
  array(state.receipts,'regulation receipts',128);
  const receiptIds=new Set(),attemptIds=new Set();
  let prior=0;
  for(const receipt of state.receipts) {
    paidReceipt(receipt,state,true);
    if(receipt.at<prior)throw new Error('Paid regulation receipts out of order');
    if(receiptIds.has(receipt.receiptId)||attemptIds.has(receipt.attemptId))throw new Error('Duplicate paid regulation attempt or receipt');
    receiptIds.add(receipt.receiptId);attemptIds.add(receipt.attemptId);prior=receipt.at;
  }
  for(const item of state.records)if(item.tendency==='deliberate'&&!state.receipts.some(receipt=>receipt.contextId===item.id&&receipt.concernStartedAt===item.startedAt&&receipt.concernExpiresAt===item.expiresAt&&receipt.concernSignature===item.signature))throw new Error('Deliberate tendency lacks matching paid reflection receipt');
  return state;
}
function checked(state) {return copy(validate(state));}
function specification(state,idValue) {
  id(idValue,'context ID');
  const result=state.contexts.find(item=>item.id===idValue);
  if(!result)throw new Error('Unknown appraisal context');
  return result;
}
function actorViews(state,beliefView,situatedView) {
  object(beliefView,'actor belief view',['version','ownerId','now','beliefs','receiptCount','maxReceipts']);
  object(situatedView,'situated actor view',['id','now','purposes','observations','human']);
  if(beliefView.ownerId!==state.ownerId||situatedView.id!==state.ownerId)throw new Error('Appraisal view owner mismatch');
  if(beliefView.now!==state.now||situatedView.now!==state.now)throw new Error('Appraisal view time mismatch');
  array(beliefView.beliefs,'actor beliefs',64);array(situatedView.purposes,'actor purposes',64);
}
function purposeActive(situatedView,idValue) {
  const purpose=situatedView.purposes.find(item=>item.id===idValue);
  return purpose?.status==='active';
}
function signature(belief) {
  object(belief,'actor belief',['propositionId','status','value','supportingOriginIds','opposingOriginIds','effectiveReceiptIds']);
  if(!['unknown','conflict','resolved'].includes(belief.status))throw new Error('Invalid actor belief status');
  ids(belief.supportingOriginIds,'supporting origins');ids(belief.opposingOriginIds,'opposing origins');
  ids(belief.effectiveReceiptIds,'effective receipts',256);
  if(belief.status!=='resolved'&&belief.value!==null)throw new Error('Unresolved belief cannot assert truth');
  if(belief.status==='resolved'&&typeof belief.value!=='boolean')throw new Error('Resolved belief needs boolean value');
  if(belief.status==='unknown'&&(belief.supportingOriginIds.length||belief.opposingOriginIds.length||belief.effectiveReceiptIds.length))throw new Error('Unknown belief has effective origin or receipt evidence');
  if(belief.status==='conflict'&&(!belief.supportingOriginIds.length||!belief.opposingOriginIds.length||!belief.effectiveReceiptIds.length))throw new Error('Conflict belief lacks opposing origin or receipt evidence');
  if(belief.status==='resolved'&&(!belief.supportingOriginIds.length||belief.opposingOriginIds.length||!belief.effectiveReceiptIds.length))throw new Error('Resolved belief has inconsistent origin or receipt evidence');
  return JSON.stringify([belief.status,belief.value,[...belief.supportingOriginIds].sort(),[...belief.opposingOriginIds].sort()]);
}

export function createAppraisal({ownerId,now=0,contexts=[],maxConcernMinutes=120,minReflectionMinutes=10}={}) {
  const records=contexts.map(item=>({id:item.id,tendency:'none',startedAt:null,expiresAt:null,signature:null,lastKey:null,seenSignatures:[]}));
  return checked({version:APPRAISAL_VERSION,ownerId,now,contexts:copy(contexts),maxConcernMinutes,minReflectionMinutes,records,receipts:[]});
}
export function advanceAppraisal(state,to) {
  const next=checked(state);minute(to,'observed appraisal time');
  if(to<next.now)throw new Error('Appraisal observed time cannot move backward');
  next.now=to;
  for(const record of next.records)if(record.expiresAt!==null&&to>=record.expiresAt)record.tendency='none';
  return checked(next);
}
export function appraiseBeliefs(state,{contextId,beliefView,situatedView}={}) {
  const next=checked(state),context=specification(next,contextId);
  actorViews(next,beliefView,situatedView);
  const belief=beliefView.beliefs.find(item=>item.propositionId===context.propositionId);
  if(!belief)throw new Error('Relevant proposition absent from actor belief view');
  const key=signature(belief),record=next.records.find(item=>item.id===contextId);
  if(!purposeActive(situatedView,context.purposeId)||belief.status==='resolved') {
    record.tendency='none';
    record.lastKey=purposeActive(situatedView,context.purposeId)?key:'inactive';
    return checked(next);
  }
  if(record.lastKey===key)return checked(next);
  if(!record.seenSignatures.includes(key)) {
    if(record.seenSignatures.length>=128)throw new Error('Appraisal evidence history limit');
    record.seenSignatures.push(key);
  }
  record.lastKey=key;
  record.signature=key;record.startedAt=next.now;record.expiresAt=next.now+next.maxConcernMinutes;
  record.tendency='check';
  return checked(next);
}
export function getAppraisalChoiceView(state,{contextId,availableActionIds,situatedView}={}) {
  const next=checked(state),context=specification(next,contextId),record=next.records.find(item=>item.id===contextId);
  object(situatedView,'situated actor view',['id','now','purposes','observations','human']);
  if(situatedView.id!==next.ownerId)throw new Error('Appraisal choice owner mismatch');
  if(situatedView.now!==next.now)throw new Error('Appraisal choice time mismatch');
  array(situatedView.purposes,'actor purposes',64);ids(availableActionIds,'available action IDs',128);
  const mode=purposeActive(situatedView,context.purposeId)?record.tendency:'none';
  const action=mode==='check'?context.checkActionId:mode==='deliberate'?context.deliberateActionId:null;
  return copy({tendency:mode,preferredActionIds:action&&availableActionIds.includes(action)?[action]:[],expiresAt:mode==='none'?null:record.expiresAt});
}
export function recordPaidRegulation(state,receipt) {
  const next=checked(state);paidReceipt(receipt,next);
  const existing=next.receipts.find(item=>item.receiptId===receipt.receiptId);
  if(existing) {
    const original={receiptId:existing.receiptId,at:existing.at,contextId:existing.contextId,attemptId:existing.attemptId,actionId:existing.actionId,elapsedMinutes:existing.elapsedMinutes,selectedByActor:existing.selectedByActor,completed:existing.completed};
    if(JSON.stringify(original)!==JSON.stringify(receipt))throw new Error('Conflicting duplicate regulation receipt');
    return next;
  }
  if(receipt.at!==next.now)throw new Error('Paid regulation must be delivered at current observed time');
  if(next.receipts.some(item=>item.attemptId===receipt.attemptId))throw new Error('Duplicate paid regulation attempt');
  const record=next.records.find(item=>item.id===receipt.contextId);
  if(!record||record.tendency!=='check'||record.startedAt===null||receipt.at-receipt.elapsedMinutes<record.startedAt||receipt.at>=record.expiresAt)throw new Error('Paid reflection requires live concern and start after concern');
  if(next.receipts.length>=128)throw new Error('Regulation receipt history limit');
  next.receipts.push({...copy(receipt),concernStartedAt:record.startedAt,concernExpiresAt:record.expiresAt,concernSignature:record.signature});record.tendency='deliberate';
  return checked(next);
}
export function exportAppraisal(state) {
  return copy({format:FORMAT,version:1,appraisal:validate(state)});
}
export function restoreAppraisal(snapshot,expectedOwnerId) {
  object(snapshot,'appraisal snapshot',['format','version','appraisal']);
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw new Error('Incompatible appraisal snapshot');
  const state=checked(snapshot.appraisal);
  if(expectedOwnerId!==state.ownerId)throw new Error('Appraisal owner mismatch');
  return state;
}
