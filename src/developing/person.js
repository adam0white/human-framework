import {
  advanceSustainedPerson,beginSustainedAttempt,advanceSustainedAttempt,
  finishSustainedAttempt,getSustainedView,exportSustainedPerson,
  restoreSustainedPerson
} from '../development/index.js';
import {getSituatedView} from '../person/index.js';
import {
  advanceBeliefs,receiveEvidence,retractEvidence,getBeliefView,
  exportBeliefs,restoreBeliefs
} from '../cognition/beliefs.js';
import {
  advanceRelationships,setCareTie,receiveRelationshipEvent,
  getRelationshipView,exportRelationships,restoreRelationships
} from '../social/relationships.js';
import {
  advanceDuties,receiveDutyNotice,recordStatedIntention,
  receiveRepairOutcome,getDutyView,exportDuties,restoreDuties
} from '../meaning/duties.js';
import {
  advanceAdultCourse,recordQualification,transitionAdultRole,
  getAdultCourseView,exportAdultCourse,restoreAdultCourse
} from '../lifecourse/adult.js';
import {
  advanceAppraisal,appraiseBeliefs,getAppraisalChoiceView,
  recordPaidRegulation,exportAppraisal,restoreAppraisal
} from '../affect/appraisal.js';

export const DEVELOPING_PERSON_VERSION='0.1.0';
const FORMAT='human-framework-developing-person';
const copy=value=>structuredClone(value);

function exact(value,name,fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Invalid ${name} fields`);
  for(const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name} data`);
  }
}
function id(value,name) {
  if(typeof value!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}
function minute(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`Invalid ${name}`);
}
function lastAttempt(value,state,catalog) {
  if(value===null)return;
  if(state.sustained.situated.human.pending)throw new Error('Pending developing attempt cannot retain prior payment proof');
  exact(value,'last developing attempt',['attemptId','actionId','startedAt','finishedAt','elapsedMinutes','status']);
  id(value.actionId,'last action ID');
  if(!catalog.actions.includes(value.actionId))throw new Error('Last attempt action absent from catalog');
  if(typeof value.attemptId!=='string'||!value.attemptId.startsWith(`${state.id}:`))throw new Error('Last attempt owner mismatch');
  const ordinal=value.attemptId.slice(state.id.length+1);
  const human=state.sustained.situated.human;
  const expectedCounter=human.nextAttempt-(human.pending?2:1);
  if(!/^[1-9][0-9]*$/.test(ordinal)||!Number.isSafeInteger(Number(ordinal))||Number(ordinal)!==expectedCounter)throw new Error('Last attempt counter mismatch');
  minute(value.startedAt,'last attempt start');minute(value.finishedAt,'last attempt finish');minute(value.elapsedMinutes,'last attempt elapsed');
  if(value.startedAt+value.elapsedMinutes!==value.finishedAt||value.finishedAt>state.sustained.situated.now)throw new Error('Last attempt time mismatch');
  if(!['completed','failed','interrupted','blocked'].includes(value.status))throw new Error('Invalid last attempt status');
  if(state.sustained.situated.human.pending?.id===value.attemptId)throw new Error('Last attempt cannot still be pending');
}
function validate(state,catalog) {
  exact(state,'developing person',['version','id','sustained','beliefs','relationships','duties','course','appraisal','lastAttempt']);
  if(state.version!==DEVELOPING_PERSON_VERSION)throw new Error('Incompatible developing person version');
  id(state.id,'developing person ID');
  const sustained=exportSustainedPerson(state.sustained,catalog).person;
  const beliefs=exportBeliefs(state.beliefs).beliefs;
  const relationships=exportRelationships(state.relationships).relationships;
  const duties=exportDuties(state.duties).state;
  const course=exportAdultCourse(state.course).course;
  const appraisal=exportAppraisal(state.appraisal).appraisal;
  if([sustained.id,beliefs.ownerId,relationships.ownerId,duties.ownerId,course.actorId,appraisal.ownerId].some(owner=>owner!==state.id))throw new Error('Developing component owner mismatch');
  const now=sustained.situated.now;
  if([beliefs.now,relationships.now,duties.now,appraisal.now].some(time=>time!==now))throw new Error('Developing observed clock mismatch');
  for(const context of appraisal.contexts) {
    if(!catalog.purposes.includes(context.purposeId)||!beliefs.propositions.includes(context.propositionId)||!catalog.actions.includes(context.checkActionId)||!catalog.actions.includes(context.deliberateActionId)||!catalog.actions.includes(context.reflectionActionId))throw new Error('Appraisal context references an absent purpose, belief or action');
  }
  if(course.catalog.skills.some(skillId=>!Object.hasOwn(sustained.situated.human.skills,skillId)))throw new Error('Adult course skill absent from Human');
  lastAttempt(state.lastAttempt,state,catalog);
  return state;
}
function checked(state,catalog) {return copy(validate(state,catalog));}
function synchronize(state,to) {
  return {...state,
    beliefs:advanceBeliefs(state.beliefs,to),
    relationships:advanceRelationships(state.relationships,to),
    duties:advanceDuties(state.duties,to),
    appraisal:advanceAppraisal(state.appraisal,to)};
}
function noPending(state) {
  if(state.sustained.situated.human.pending)throw new Error('Developing component update is blocked while an attempt is pending');
}

export function createDevelopingPerson({sustained,beliefs,relationships,duties,course,appraisal}={},catalog) {
  return checked({version:DEVELOPING_PERSON_VERSION,id:sustained?.id,sustained,beliefs,relationships,duties,course,appraisal,lastAttempt:null},catalog);
}
export function advanceDevelopingPerson(state,{to,mode}={},catalog) {
  const next=checked(state,catalog),sustained=advanceSustainedPerson(next.sustained,{to,mode},catalog);
  return checked(synchronize({...next,sustained},sustained.situated.now),catalog);
}
export function beginDevelopingAttempt(state,action,catalog) {
  const next=checked(state,catalog),sustained=beginSustainedAttempt(next.sustained,action,catalog);
  return checked({...next,sustained,lastAttempt:null},catalog);
}
export function advanceDevelopingAttempt(state,minutes,catalog) {
  const next=checked(state,catalog),sustained=advanceSustainedAttempt(next.sustained,minutes,catalog);
  return checked(synchronize({...next,sustained},sustained.situated.now),catalog);
}
export function finishDevelopingAttempt(state,result,catalog) {
  const next=checked(state,catalog),pending=next.sustained.situated.human.pending;
  const sustained=finishSustainedAttempt(next.sustained,result,catalog);
  const attempt={attemptId:pending.id,actionId:pending.action.actionId,startedAt:pending.startedAt,
    finishedAt:next.sustained.situated.now,elapsedMinutes:pending.elapsedMinutes,status:result.status};
  return checked({...next,sustained,lastAttempt:attempt},catalog);
}
export function advanceDevelopingCalendar(state,{toDay,kind}={},catalog) {
  const next=checked(state,catalog);noPending(next);
  return checked({...next,course:advanceAdultCourse(next.course,{toDay,kind}),lastAttempt:null},catalog);
}
export function updateDevelopingComponent(state,{kind,input}={},catalog) {
  const next=checked(state,catalog);noPending(next);
  let changed;
  switch(kind) {
    case 'evidence':changed={...next,beliefs:receiveEvidence(next.beliefs,input)};break;
    case 'retract-evidence':changed={...next,beliefs:retractEvidence(next.beliefs,input)};break;
    case 'relationship-event':changed={...next,relationships:receiveRelationshipEvent(next.relationships,input)};break;
    case 'care':changed={...next,relationships:setCareTie(next.relationships,input)};break;
    case 'duty-notice':changed={...next,duties:receiveDutyNotice(next.duties,input)};break;
    case 'intention':changed={...next,duties:recordStatedIntention(next.duties,input)};break;
    case 'repair':changed={...next,duties:receiveRepairOutcome(next.duties,input)};break;
    case 'role':changed={...next,course:transitionAdultRole(next.course,input)};break;
    case 'qualification': {
      const skills=Object.fromEntries(next.course.catalog.skills.map(skillId=>[skillId,next.sustained.situated.human.skills[skillId]]));
      changed={...next,course:recordQualification(next.course,input,{actorId:next.id,skills})};
      break;
    }
    case 'appraise': {
      exact(input,'appraisal command',['contextId']);
      changed={...next,appraisal:appraiseBeliefs(next.appraisal,{contextId:input.contextId,beliefView:getBeliefView(next.beliefs),situatedView:getSituatedView(next.sustained.situated,catalog)})};
      break;
    }
    case 'regulate': {
      exact(input,'regulation command',['contextId','receiptId','selectedByActor']);
      const attempt=next.lastAttempt;
      if(!attempt||attempt.status!=='completed')throw new Error('Paid regulation requires last completed attempt');
      if(attempt.finishedAt!==next.sustained.situated.now)throw new Error('Paid regulation requires current completed attempt');
      const receipt={receiptId:input.receiptId,at:attempt.finishedAt,contextId:input.contextId,
        attemptId:attempt.attemptId,actionId:attempt.actionId,elapsedMinutes:attempt.elapsedMinutes,
        selectedByActor:input.selectedByActor,completed:true};
      changed={...next,appraisal:recordPaidRegulation(next.appraisal,receipt)};
      break;
    }
    default:throw new Error('Unknown developing component kind');
  }
  return checked(changed,catalog);
}
export function getDevelopingView(state,catalog,{relationship=null,appraisal=null}={}) {
  const next=checked(state,catalog);
  if(relationship!==null)exact(relationship,'relationship selector',['otherId','contextId']);
  if(appraisal!==null)exact(appraisal,'appraisal selector',['contextId','availableActionIds']);
  return copy({id:next.id,now:next.sustained.situated.now,
    sustained:getSustainedView(next.sustained,catalog),beliefs:getBeliefView(next.beliefs),
    relationships:relationship?getRelationshipView(next.relationships,relationship.otherId,relationship.contextId):null,
    duties:getDutyView(next.duties),course:getAdultCourseView(next.course),
    appraisal:appraisal?getAppraisalChoiceView(next.appraisal,{...appraisal,situatedView:getSituatedView(next.sustained.situated,catalog)}):null});
}
export function exportDevelopingPerson(state,catalog) {
  return copy({format:FORMAT,version:1,person:validate(state,catalog)});
}
export function restoreDevelopingPerson(snapshot,catalog,expectedOwnerId) {
  exact(snapshot,'developing snapshot',['format','version','person']);
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw new Error('Incompatible developing snapshot');
  id(expectedOwnerId,'expected owner ID');
  const state=snapshot.person;
  validate(state,catalog);
  const restored={...state,
    sustained:restoreSustainedPerson(exportSustainedPerson(state.sustained,catalog),catalog),
    beliefs:restoreBeliefs(exportBeliefs(state.beliefs),expectedOwnerId),
    relationships:restoreRelationships(exportRelationships(state.relationships),expectedOwnerId),
    duties:restoreDuties(exportDuties(state.duties),expectedOwnerId),
    course:restoreAdultCourse(exportAdultCourse(state.course),expectedOwnerId),
    appraisal:restoreAppraisal(exportAppraisal(state.appraisal),expectedOwnerId)};
  if(restored.id!==expectedOwnerId)throw new Error('Developing snapshot owner mismatch');
  return checked(restored,catalog);
}
