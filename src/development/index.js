import {
  beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson
} from '../human/v0.1.1.js';
import {
  advancePerson,getSituatedView,exportSituatedPerson,restoreSituatedPerson
} from '../person/index.js';
import {
  createLearning,bindLearning,advanceLearning,learn,getLearningAccessView,
  getLearningView,retrieveLearning,exportLearning,restoreLearning
} from './learning.js';
import {
  createDailyCondition,advanceDailyCondition,advanceDailyClock,restoreDailyCondition
} from './condition.js';

export const SUSTAINED_PERSON_VERSION='0.1.0';
const copy=value=>structuredClone(value);

function validateState(value,catalog) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid sustained person');
  const fields=['version','id','situated','learning','condition'];
  if(Reflect.ownKeys(value).length!==fields.length||fields.some(field=>!Object.hasOwn(value,field)))throw new Error('Invalid sustained person');
  if(value.version!==SUSTAINED_PERSON_VERSION)throw new Error('Incompatible sustained person version');
  const situated=exportSituatedPerson(value.situated,catalog).person;
  const learning=exportLearning(value.learning).learning;
  const condition=restoreDailyCondition(value.condition);
  if(value.id!==situated.id)throw new Error('Sustained person identity mismatch');
  if(learning.ownerId!==situated.id)throw new Error('Sustained learning owner mismatch');
  const now=situated.now;
  if(condition.now!==now||learning.now!==now||situated.human.minutes!==now)throw new Error('Inconsistent sustained person chronology');
  if(situated.human.pending&&condition.mode!=='awake')throw new Error('A pending attempt requires an awake condition');
  if(learning.skills.some(skillId=>!Object.hasOwn(situated.human.skills,skillId)))throw new Error('Learning skill is absent from Human skills');
  return value;
}

function detached(value,catalog) {
  return copy(validateState(value,catalog));
}

export function createSustainedPerson({situated,learning,condition}={},catalog) {
  const checkedSituated=exportSituatedPerson(situated,catalog).person;
  if(checkedSituated.now!==0||checkedSituated.human.minutes!==0)throw new Error('A new sustained person must start at zero; use restore for continuity');
  const checkedLearning=bindLearning(exportLearning(learning).learning,checkedSituated.id);
  const checkedCondition=condition===undefined?createDailyCondition({now:checkedSituated.now}):restoreDailyCondition(condition);
  return detached({version:SUSTAINED_PERSON_VERSION,id:checkedSituated.id,situated:checkedSituated,learning:checkedLearning,condition:checkedCondition},catalog);
}

export function advanceSustainedPerson(person,{to,mode}={},catalog) {
  const current=detached(person,catalog);
  if(current.situated.human.pending)throw new Error('Cannot apply daily condition during a pending attempt');
  const moved=advanceDailyCondition(current.condition,current.situated.human.body,{to,mode});
  const humanSnapshot=exportPerson(current.situated.human);
  humanSnapshot.person.body=moved.body;
  humanSnapshot.person.minutes=to;
  const human=restorePerson(humanSnapshot);
  const situated=advancePerson({...current.situated,human},to,catalog);
  const learning=advanceLearning(current.learning,to);
  return detached({...current,situated,learning,condition:moved.condition},catalog);
}

export function beginSustainedAttempt(person,action,catalog) {
  const current=detached(person,catalog);
  if(current.condition.mode!=='awake')throw new Error('A person must be awake to begin an attempt');
  if(!catalog.actions.includes(action?.actionId))throw new Error('Unknown sustained action');
  if(!Number.isSafeInteger(action?.durationMinutes)||action.durationMinutes<1)throw new Error('Sustained attempt duration must be a positive integer');
  const human=beginAttempt(current.situated.human,action);
  return detached({...current,situated:{...current.situated,human}},catalog);
}

export function advanceSustainedAttempt(person,minutes,catalog) {
  const current=detached(person,catalog);
  if(!current.situated.human.pending)throw new Error('No pending sustained attempt');
  if(!Number.isSafeInteger(minutes)||minutes<0||Object.is(minutes,-0))throw new Error('Invalid sustained attempt advance');
  const human=advanceAttempt(current.situated.human,minutes);
  const to=current.situated.now+minutes;
  if(!Number.isSafeInteger(to))throw new Error('Sustained chronology limit reached');
  const condition=advanceDailyClock(current.condition,{to,mode:'awake'});
  const situated=advancePerson({...current.situated,human},to,catalog);
  const learning=advanceLearning(current.learning,to);
  return detached({...current,situated,learning,condition},catalog);
}

export function finishSustainedAttempt(person,result,catalog) {
  const current=detached(person,catalog);
  const human=finishAttempt(current.situated.human,result);
  return detached({...current,situated:{...current.situated,human}},catalog);
}

export function getSustainedView(person,catalog) {
  const current=detached(person,catalog);
  return copy({
    id:current.id,now:current.situated.now,
    situated:getSituatedView(current.situated,catalog),
    learning:getLearningAccessView(current.learning),
    condition:current.condition
  });
}

export function exportSustainedPerson(person,catalog) {
  return copy({format:'human-framework-sustained-person',version:1,person:validateState(person,catalog)});
}

export function restoreSustainedPerson(snapshot,catalog) {
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new Error('Invalid sustained person snapshot');
  const fields=['format','version','person'];
  if(Reflect.ownKeys(snapshot).length!==fields.length||fields.some(field=>!Object.hasOwn(snapshot,field)))throw new Error('Invalid sustained person snapshot');
  if(snapshot.format!=='human-framework-sustained-person'||snapshot.version!==1)throw new Error('Incompatible sustained person snapshot');
  const person=snapshot.person;
  const situated=restoreSituatedPerson(exportSituatedPerson(person.situated,catalog),catalog);
  const learning=restoreLearning(exportLearning(person.learning));
  const condition=restoreDailyCondition(person.condition);
  return detached({...person,situated,learning,condition},catalog);
}

export {
  createDailyCondition,advanceDailyCondition,
  createLearning,bindLearning,advanceLearning,learn,getLearningAccessView,
  getLearningView,retrieveLearning,exportLearning,restoreLearning
};
