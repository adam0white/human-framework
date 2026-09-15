/** Private authored candidate. The composite derives receipts from actual Human attempts. */
export const HABITS_VERSION='0.1.0';
const FORMAT='human-framework-habits';
const MAX_CUES=16,MAX_RECEIPTS=128;
const copy=value=>structuredClone(value);

function object(value,label,fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${label}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Invalid ${label} fields`);
  for(const key of fields) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${label} data`);
  }
}
function list(value,label,max) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max||Reflect.ownKeys(value).length!==value.length+1)throw new Error(`Invalid ${label}`);
  for(let index=0;index<value.length;index++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${label} data`);
  }
}
function id(value,label) {
  if(typeof value!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${label}`);
}
function minute(value,label) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`Invalid ${label}`);
}
function positive(value,label) {
  minute(value,label);if(value===0)throw new Error(`Invalid ${label}`);
}
function ids(values,label,max=32) {
  list(values,label,max);
  const seen=new Set();
  for(const value of values) {id(value,label);if(seen.has(value))throw new Error(`Duplicate ${label}`);seen.add(value);}
  return seen;
}
function attemptIds(values,label,ownerId,max=MAX_RECEIPTS) {
  list(values,label,max);
  const seen=new Set();
  for(const value of values) {
    if(typeof value!=='string'||!value.startsWith(`${ownerId}:`)||!/^([A-Za-z][A-Za-z0-9_-]{0,79}):[1-9][0-9]*$/.test(value))throw new Error(`Invalid ${label}`);
    if(seen.has(value))throw new Error(`Duplicate ${label}`);
    seen.add(value);
  }
  return seen;
}
function habit(value) {
  object(value,'habit configuration',['id','cueId','purposeId','actions','threshold']);
  id(value.id,'habit ID');id(value.cueId,'habit cue ID');id(value.purposeId,'habit purpose ID');
  if(ids(value.actions,'habit action IDs').size===0)throw new Error('Habit needs actions');
  positive(value.threshold,'habit threshold');if(value.threshold>128)throw new Error('Habit threshold exceeds evidence bound');
}
function revision(value) {
  object(value,'revision configuration',['id','fromPurposeId','toPurposeId','cueId','failedActionIds','reviewActionId','minFailures','minReviewMinutes']);
  for(const field of ['id','fromPurposeId','toPurposeId','cueId','reviewActionId'])id(value[field],field);
  if(value.fromPurposeId===value.toPurposeId)throw new Error('Revision needs an alternative purpose');
  if(ids(value.failedActionIds,'failed action IDs').size===0)throw new Error('Revision needs failed actions');
  positive(value.minFailures,'minimum failures');positive(value.minReviewMinutes,'minimum review minutes');
  if(value.minFailures>MAX_RECEIPTS)throw new Error('Failure threshold exceeds evidence bound');
}
function paidReceipt(value,ownerId,now) {
  object(value,'paid attempt receipt',['ownerId','attemptId','at','cueId','purposeId','actionId','status','elapsedMinutes','durationMinutes']);
  if(value.ownerId!==ownerId)throw new Error('Paid receipt owner mismatch');
  if(typeof value.attemptId!=='string'||!/^([A-Za-z][A-Za-z0-9_-]{0,79}):[1-9][0-9]*$/.test(value.attemptId)||!value.attemptId.startsWith(`${ownerId}:`))throw new Error('Invalid paid attempt ID');
  minute(value.at,'paid attempt time');if(value.at>now)throw new Error('Paid receipt is in the future');
  if(value.cueId!==null)id(value.cueId,'attempt cue ID');
  if(value.purposeId!==null)id(value.purposeId,'attempt purpose ID');
  id(value.actionId,'attempt action ID');
  positive(value.durationMinutes,'attempt duration');positive(value.elapsedMinutes,'paid attempt minutes');
  if(value.elapsedMinutes>value.durationMinutes)throw new Error('Paid attempt exceeds duration');
  if(!['completed','failed','interrupted'].includes(value.status))throw new Error('Blocked or unpaid attempt cannot provide paid evidence');
  if(value.status!=='interrupted'&&value.elapsedMinutes!==value.durationMinutes)throw new Error('Completed or failed attempt needs full paid interval');
}
function accepted(value,revisions,receipts,usedFailures,ownerId,now) {
  object(value,'accepted revision',['revisionId','reviewAttemptId','at','failedAttemptIds']);
  id(value.revisionId,'accepted revision ID');
  const specification=revisions.find(item=>item.id===value.revisionId);
  if(!specification)throw new Error('Unknown accepted revision');
  minute(value.at,'acceptance time');if(value.at>now)throw new Error('Accepted revision is in the future');
  if(typeof value.reviewAttemptId!=='string'||!value.reviewAttemptId.startsWith(`${ownerId}:`))throw new Error('Accepted review owner mismatch');
  const review=receipts.find(item=>item.attemptId===value.reviewAttemptId);
  if(!review||review.actionId!==specification.reviewActionId||review.status!=='completed'||review.elapsedMinutes<specification.minReviewMinutes||review.at!==value.at)throw new Error('Accepted revision lacks paid matching review');
  const failures=attemptIds(value.failedAttemptIds,'accepted failure IDs',ownerId);
  if(failures.size<specification.minFailures)throw new Error('Accepted revision lacks failure evidence');
  const reviewIndex=receipts.findIndex(item=>item.attemptId===value.reviewAttemptId);
  const expected=receipts.slice(0,reviewIndex).filter(item=>qualifyingFailure(item,specification)&&!usedFailures.has(item.attemptId)).map(item=>item.attemptId);
  if(expected.length!==value.failedAttemptIds.length||expected.some((attemptId,index)=>attemptId!==value.failedAttemptIds[index]))throw new Error('Accepted revision must consume complete qualifying failure evidence');
  for(const failureId of failures) {
    if(usedFailures.has(failureId))throw new Error('Duplicate consumed failure evidence');
    const attempt=receipts.find(item=>item.attemptId===failureId);
    if(!attempt||attempt.at>review.at||!qualifyingFailure(attempt,specification))throw new Error('Accepted revision has unrelated failure evidence');
    usedFailures.add(failureId);
  }
}
function qualifyingFailure(attempt,specification) {
  return attempt.status==='failed'&&attempt.cueId===specification.cueId&&attempt.purposeId===specification.fromPurposeId&&specification.failedActionIds.includes(attempt.actionId);
}
function validate(state) {
  object(state,'habits state',['version','ownerId','now','habits','revisions','receipts','acceptedRevisions']);
  if(state.version!==HABITS_VERSION)throw new Error('Incompatible habits version');
  id(state.ownerId,'habits owner ID');minute(state.now,'habits time');
  list(state.habits,'habits',MAX_CUES);list(state.revisions,'revisions',MAX_CUES);
  const identifiers=new Set(),cues=new Set();
  for(const specification of state.habits) {
    habit(specification);
    if(identifiers.has(specification.id))throw new Error('Duplicate habit ID');
    identifiers.add(specification.id);cues.add(specification.cueId);
  }
  for(const specification of state.revisions) {
    revision(specification);
    if(identifiers.has(specification.id))throw new Error('Duplicate adaptation ID');
    identifiers.add(specification.id);cues.add(specification.cueId);
  }
  if(cues.size>MAX_CUES)throw new Error('Cue bound exceeded');
  list(state.receipts,'paid receipts',MAX_RECEIPTS);
  const receiptIds=new Set();let previousAt=0;
  for(const receipt of state.receipts) {
    paidReceipt(receipt,state.ownerId,state.now);
    if(receiptIds.has(receipt.attemptId))throw new Error('Duplicate paid attempt receipt');
    if(receipt.at<previousAt)throw new Error('Paid receipt chronology moved backward');
    receiptIds.add(receipt.attemptId);previousAt=receipt.at;
  }
  list(state.acceptedRevisions,'accepted revisions',MAX_RECEIPTS);
  const reviews=new Set(),usedFailures=new Set();previousAt=0;
  for(const item of state.acceptedRevisions) {
    accepted(item,state.revisions,state.receipts,usedFailures,state.ownerId,state.now);
    if(reviews.has(item.reviewAttemptId))throw new Error('Duplicate accepted review attempt');
    if(item.at<previousAt)throw new Error('Accepted revision chronology moved backward');
    reviews.add(item.reviewAttemptId);previousAt=item.at;
  }
  return state;
}
function checked(state) {return copy(validate(state));}
function situatedView(value,state) {
  const full=value&&Object.hasOwn(value,'observations');
  object(value,'situated purpose view',full?['id','now','purposes','observations','human']:['id','now','purposes']);
  if(value.id!==state.ownerId||value.now!==state.now)throw new Error('Situated purpose owner or time mismatch');
  if(full) {
    list(value.observations,'situated observations',256);
    if(!value.human||typeof value.human!=='object'||value.human.id!==state.ownerId)throw new Error('Situated Human owner mismatch');
  }
  list(value.purposes,'situated purposes',128);
  const seen=new Set();
  for(const purpose of value.purposes) {
    object(purpose,'situated purpose',['id','status']);id(purpose.id,'situated purpose ID');
    if(seen.has(purpose.id))throw new Error('Duplicate situated purpose');seen.add(purpose.id);
    if(!['active','completed','withdrawn'].includes(purpose.status))throw new Error('Invalid situated purpose status');
  }
  return new Map(value.purposes.map(item=>[item.id,item.status]));
}
function streak(state,specification) {
  let actionId=null,count=0;
  for(const item of state.receipts) {
    if(item.cueId!==specification.cueId)continue;
    if(item.status==='completed'&&item.purposeId===specification.purposeId&&specification.actions.includes(item.actionId)) {
      count=item.actionId===actionId?count+1:1;actionId=item.actionId;
    } else {count=0;actionId=null;}
  }
  return {actionId,count};
}
function outstandingFailures(state,specification) {
  const consumed=new Set(state.acceptedRevisions.flatMap(item=>item.failedAttemptIds));
  return state.receipts.filter(item=>qualifyingFailure(item,specification)&&!consumed.has(item.attemptId)).map(item=>item.attemptId);
}

export function createHabits({ownerId,now=0,habits=[],revisions=[]}={}) {
  return checked({version:HABITS_VERSION,ownerId,now,habits, revisions, receipts:[],acceptedRevisions:[]});
}
export function advanceHabits(state,to) {
  const next=checked(state);minute(to,'habits time');
  if(to<next.now)throw new Error('Habits time cannot move backward');
  return checked({...next,now:to});
}
export function recordHabitAttempt(state,receipt) {
  const next=checked(state);
  paidReceipt(receipt,next.ownerId,next.now);
  if(receipt.at!==next.now)throw new Error('Paid receipt requires current time');
  if(next.receipts.some(item=>item.attemptId===receipt.attemptId))throw new Error('Duplicate paid attempt receipt');
  return checked({...next,receipts:[...next.receipts,copy(receipt)]});
}
export function getHabitChoiceView(state,{situatedView:person,cueId,availableActionIds}={}) {
  const next=checked(state),purposes=situatedView(person,next);
  id(cueId,'current cue ID');const available=ids(availableActionIds,'available action IDs',128);
  let highest=0;
  for(const specification of next.habits) {
    if(specification.cueId!==cueId)continue;
    const value=streak(next,specification);highest=Math.max(highest,value.count);
    if(value.count>=specification.threshold&&purposes.get(specification.purposeId)==='active'&&available.has(value.actionId))
      return copy({suggestedActionId:value.actionId,habitId:specification.id,streak:value.count});
  }
  return {suggestedActionId:null,habitId:null,streak:highest};
}
export function getRevisionOffer(state,{situatedView:person,availableActionIds}={}) {
  const next=checked(state),purposes=situatedView(person,next),available=ids(availableActionIds,'available action IDs',128);
  return next.revisions.filter(specification=>purposes.get(specification.fromPurposeId)==='active'&&purposes.get(specification.toPurposeId)==='withdrawn'&&available.has(specification.reviewActionId))
    .map(specification=>({revisionId:specification.id,reviewActionId:specification.reviewActionId,failedAttemptIds:outstandingFailures(next,specification)}))
    .filter(offer=>offer.failedAttemptIds.length>=next.revisions.find(item=>item.id===offer.revisionId).minFailures);
}
export function recordAcceptedRevision(state,input,person) {
  const next=checked(state);object(input,'revision acceptance',['revisionId','reviewAttemptId','actionId','at','elapsedMinutes','selectedByActor']);
  id(input.revisionId,'revision ID');id(input.actionId,'review action ID');minute(input.at,'acceptance time');positive(input.elapsedMinutes,'review minutes');
  if(input.selectedByActor!==true)throw new Error('Purpose revision must be explicitly selected by actor');
  if(input.at!==next.now)throw new Error('Purpose revision requires current time');
  const specification=next.revisions.find(item=>item.id===input.revisionId);
  if(!specification)throw new Error('Unknown revision configuration');
  const review=next.receipts.at(-1);
  if(!review||review.attemptId!==input.reviewAttemptId||review.at!==input.at||review.actionId!==input.actionId||input.actionId!==specification.reviewActionId||review.elapsedMinutes!==input.elapsedMinutes||review.status!=='completed'||review.elapsedMinutes<specification.minReviewMinutes)throw new Error('Purpose revision requires latest matching paid completed review receipt');
  const offer=getRevisionOffer(next,{situatedView:person,availableActionIds:[specification.reviewActionId]}).find(item=>item.revisionId===input.revisionId);
  if(!offer)throw new Error('Purpose revision has no current offer or failure evidence');
  const acceptedRecord={revisionId:input.revisionId,reviewAttemptId:input.reviewAttemptId,at:input.at,failedAttemptIds:offer.failedAttemptIds};
  return checked({...next,acceptedRevisions:[...next.acceptedRevisions,acceptedRecord]});
}
export function exportHabits(state) {return copy({format:FORMAT,version:1,habits:validate(state)});}
export function restoreHabits(snapshot,expectedOwnerId) {
  object(snapshot,'habits snapshot',['format','version','habits']);
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw new Error('Incompatible habits snapshot');
  id(expectedOwnerId,'expected owner ID');
  const state=checked(snapshot.habits);
  if(state.ownerId!==expectedOwnerId)throw new Error('Habits snapshot owner mismatch');
  return state;
}
