/** Private candidate composing frozen developing-person with paid habit evidence. */
import {
  beginDevelopingAttempt,advanceDevelopingAttempt,finishDevelopingAttempt,
  advanceDevelopingPerson,advanceDevelopingCalendar,updateDevelopingComponent,
  getDevelopingView,exportDevelopingPerson,restoreDevelopingPerson
} from '../developing/person.js';
import {setPurpose,getSituatedView} from '../person/index.js';
import {
  advanceHabits,recordHabitAttempt,getHabitChoiceView,getRevisionOffer,
  recordAcceptedRevision,exportHabits,restoreHabits
} from '../adaptation/habits.js';

export const ADAPTIVE_PERSON_VERSION='0.1.0';
const FORMAT='human-framework-adaptive-person';
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
function optionalId(value,name) {if(value!==null)id(value,name);}
function list(value,name,max=128) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max||Reflect.ownKeys(value).length!==value.length+1)fail(`Invalid ${name}`);
  const seen=new Set();
  for(let index=0;index<value.length;index++) {
    const field=Object.getOwnPropertyDescriptor(value,String(index));
    if(!field?.enumerable||!Object.hasOwn(field,'value'))fail(`Invalid ${name} data`);
    id(value[index],name);if(seen.has(value[index]))fail(`Duplicate ${name}`);seen.add(value[index]);
  }
}
function situated(state) {return state.person.sustained.situated;}
function human(state) {return situated(state).human;}
function validate(state,catalog) {
  exact(state,'adaptive person',['version','id','person','habits','pendingContext']);
  if(state.version!==ADAPTIVE_PERSON_VERSION)fail('Incompatible adaptive person version');
  id(state.id,'adaptive owner');
  const person=exportDevelopingPerson(state.person,catalog).person;
  const habits=exportHabits(state.habits).habits;
  if(person.id!==state.id||habits.ownerId!==state.id)fail('Adaptive component owner mismatch');
  const now=person.sustained.situated.now;
  if(habits.now!==now)fail('Adaptive component clock mismatch');
  const humanState=person.sustained.situated.human;
  for(const receipt of habits.receipts) {
    const ordinal=Number(receipt.attemptId.slice(state.id.length+1));
    if(!Number.isSafeInteger(ordinal)||ordinal<1||ordinal>=humanState.nextAttempt)fail('Habit receipt refers to future Human attempt counter');
  }
  const last=person.lastAttempt;
  if(last&&last.elapsedMinutes>0&&last.status!=='blocked') {
    const receipt=habits.receipts.at(-1);
    if(!receipt||receipt.attemptId!==last.attemptId||receipt.actionId!==last.actionId||
      receipt.at!==last.finishedAt||receipt.status!==last.status||receipt.elapsedMinutes!==last.elapsedMinutes)
      fail('Latest paid adaptive receipt mismatches developing last attempt');
  }
  for(const specification of habits.habits) {
    if(!catalog.purposes.includes(specification.purposeId)||specification.actions.some(action=>!catalog.actions.includes(action)))fail('Habit configuration absent from actor catalog');
  }
  for(const specification of habits.revisions) {
    if(!catalog.purposes.includes(specification.fromPurposeId)||!catalog.purposes.includes(specification.toPurposeId)||
      !catalog.actions.includes(specification.reviewActionId)||specification.failedActionIds.some(action=>!catalog.actions.includes(action)))fail('Revision configuration absent from actor catalog');
  }
  const pending=humanState.pending;
  if(state.pendingContext===null) {
    if(pending)fail('Pending adaptive attempt needs captured context');
  } else {
    const context=state.pendingContext;
    exact(context,'pending adaptive context',['attemptId','actionId','cueId','purposeId','startedAt']);
    if(!pending||context.attemptId!==pending.id||context.actionId!==pending.action.actionId||context.startedAt!==pending.startedAt)fail('Pending adaptive context mismatches Human attempt');
    optionalId(context.cueId,'pending cue');optionalId(context.purposeId,'pending purpose');
    if(context.purposeId!==null&&!person.sustained.situated.purposes.some(purpose=>purpose.id===context.purposeId&&purpose.status==='active'))fail('Pending purpose is not active');
  }
  return state;
}
function checked(state,catalog) {return copy(validate(state,catalog));}
function noPending(state) {if(human(state).pending)fail('Adaptive update is blocked while an attempt is pending');}

export function createAdaptivePerson({person,habits}={},catalog) {
  return checked({version:ADAPTIVE_PERSON_VERSION,id:person?.id,person,habits,pendingContext:null},catalog);
}
export function beginAdaptiveAttempt(state,{action,cueId=null,purposeId=null}={},catalog) {
  const next=checked(state,catalog);noPending(next);
  optionalId(cueId,'attempt cue');optionalId(purposeId,'attempt purpose');
  if(purposeId!==null&&!situated(next).purposes.some(purpose=>purpose.id===purposeId&&purpose.status==='active'))fail('Attempt purpose must be active at start');
  const person=beginDevelopingAttempt(next.person,action,catalog),pending=person.sustained.situated.human.pending;
  const pendingContext={attemptId:pending.id,actionId:pending.action.actionId,cueId,purposeId,startedAt:pending.startedAt};
  return checked({...next,person,pendingContext},catalog);
}
export function advanceAdaptiveAttempt(state,minutes,catalog) {
  const next=checked(state,catalog);
  if(!next.pendingContext)fail('No pending adaptive attempt');
  const person=advanceDevelopingAttempt(next.person,minutes,catalog),to=person.sustained.situated.now;
  return checked({...next,person,habits:advanceHabits(next.habits,to)},catalog);
}
export function finishAdaptiveAttempt(state,result,catalog) {
  const next=checked(state,catalog),pending=human(next).pending,context=next.pendingContext;
  if(!pending||!context)fail('No pending adaptive attempt');
  const person=finishDevelopingAttempt(next.person,result,catalog);
  let habits=next.habits;
  if(result.status!=='blocked'&&pending.elapsedMinutes>0) {
    habits=recordHabitAttempt(habits,{ownerId:next.id,attemptId:pending.id,at:person.sustained.situated.now,
      cueId:context.cueId,purposeId:context.purposeId,actionId:context.actionId,status:result.status,
      elapsedMinutes:pending.elapsedMinutes,durationMinutes:pending.action.durationMinutes});
  }
  return checked({...next,person,habits,pendingContext:null},catalog);
}
export function advanceAdaptivePerson(state,{to,mode}={},catalog) {
  const next=checked(state,catalog);noPending(next);
  const person=advanceDevelopingPerson(next.person,{to,mode},catalog);
  return checked({...next,person,habits:advanceHabits(next.habits,person.sustained.situated.now)},catalog);
}
export function advanceAdaptiveCalendar(state,{toDay,kind}={},catalog) {
  const next=checked(state,catalog);noPending(next);
  return checked({...next,person:advanceDevelopingCalendar(next.person,{toDay,kind},catalog)},catalog);
}
export function updateAdaptiveComponent(state,{kind,input}={},catalog) {
  const next=checked(state,catalog);noPending(next);
  return checked({...next,person:updateDevelopingComponent(next.person,{kind,input},catalog)},catalog);
}
export function acceptAdaptiveRevision(state,{revisionId,selectedByActor}={},catalog) {
  const next=checked(state,catalog);noPending(next);id(revisionId,'revision ID');
  const specification=next.habits.revisions.find(item=>item.id===revisionId);
  if(!specification)fail('Unknown adaptive revision');
  const last=next.person.lastAttempt,review=next.habits.receipts.at(-1),now=situated(next).now;
  if(!last||last.status!=='completed'||last.finishedAt!==now||last.actionId!==specification.reviewActionId||
    !review||review.attemptId!==last.attemptId||review.at!==now||review.status!=='completed')fail('Adaptive revision requires latest actual paid review');
  const habits=recordAcceptedRevision(next.habits,{revisionId,reviewAttemptId:last.attemptId,actionId:last.actionId,
    at:now,elapsedMinutes:last.elapsedMinutes,selectedByActor},getSituatedView(situated(next),catalog));
  let selected=situated(next);
  selected=setPurpose(selected,{id:specification.fromPurposeId,status:'withdrawn'},catalog);
  selected=setPurpose(selected,{id:specification.toPurposeId,status:'active'},catalog);
  const person={...next.person,sustained:{...next.person.sustained,situated:selected}};
  return checked({...next,person,habits},catalog);
}
export function getAdaptiveView(state,catalog,{cueId=null,availableActionIds=[]}={}) {
  const next=checked(state,catalog);optionalId(cueId,'view cue');list(availableActionIds,'available actions');
  const situatedView=getSituatedView(situated(next),catalog);
  return copy({id:next.id,now:situated(next).now,developing:getDevelopingView(next.person,catalog),
    habit:cueId===null?{suggestedActionId:null,habitId:null,streak:0}:
      getHabitChoiceView(next.habits,{situatedView,cueId,availableActionIds}),
    revisionOffers:getRevisionOffer(next.habits,{situatedView,availableActionIds})});
}
export function exportAdaptivePerson(state,catalog) {
  return copy({format:FORMAT,version:1,person:checked(state,catalog)});
}
export function restoreAdaptivePerson(snapshot,catalog,expectedOwnerId) {
  exact(snapshot,'adaptive snapshot',['format','version','person']);
  if(snapshot.format!==FORMAT||snapshot.version!==1)fail('Incompatible adaptive snapshot');
  id(expectedOwnerId,'expected adaptive owner');
  const state=checked(snapshot.person,catalog);
  if(state.id!==expectedOwnerId)fail('Adaptive snapshot owner mismatch');
  const person=restoreDevelopingPerson(exportDevelopingPerson(state.person,catalog),catalog,expectedOwnerId);
  const habits=restoreHabits(exportHabits(state.habits),expectedOwnerId);
  return checked({...state,person,habits},catalog);
}
