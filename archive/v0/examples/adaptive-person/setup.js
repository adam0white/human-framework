import {createPerson} from '../../src/human/v0.1.1.js';
import {createSituatedPerson} from '../../src/person/index.js';
import {createSustainedPerson,createLearning} from '../../src/development/index.js';
import {createBeliefs} from '../../src/cognition/beliefs.js';
import {createRelationships} from '../../src/social/relationships.js';
import {createDuties} from '../../src/meaning/duties.js';
import {createAdultCourse} from '../../src/lifecourse/adult.js';
import {createAppraisal} from '../../src/affect/appraisal.js';
import {createDevelopingPerson} from '../../src/developing/person.js';
import {createHabits} from '../../src/adaptation/habits.js';
import {createAdaptivePerson} from '../../src/adaptive/index.js';

export const catalog={actors:['worker','peer','assessor'],facts:[],purposes:['deliver','coordinate'],commitments:[],actions:['walk','cart','desk','review','rest']};
export function createActor(id='worker') {
 const sustained=createSustainedPerson({situated:createSituatedPerson({human:createPerson({id,body:{fatigue:.1,hunger:.1},skills:{handling:.2}}),now:0,purposes:[{id:'deliver',status:'active'},{id:'coordinate',status:'withdrawn'}]},catalog),learning:createLearning({skills:['handling']})},catalog);
 const person=createDevelopingPerson({sustained,
  beliefs:createBeliefs({ownerId:id,now:0,propositions:['routeOpen'],sources:catalog.actors}),
  relationships:createRelationships({ownerId:id,now:0,actors:catalog.actors,contexts:['work'],ties:[]}),
  duties:createDuties({ownerId:id,now:0,cases:[]}),
  course:createAdultCourse({actorId:id,startDay:0,ageAtStartYears:30,catalog:{actors:catalog.actors,skills:['handling'],qualifications:[],roles:[],opportunities:[]}}),
  appraisal:createAppraisal({ownerId:id,now:0,contexts:[{id:'route',purposeId:'deliver',propositionId:'routeOpen',checkActionId:'walk',deliberateActionId:'review',reflectionActionId:'review'}],maxConcernMinutes:30,minReflectionMinutes:5})},catalog);
 return createAdaptivePerson({person,habits:createHabits({ownerId:id,now:0,habits:[{id:'morning-route',cueId:'morning',purposeId:'deliver',actions:['walk','cart'],threshold:3}],revisions:[{id:'change-work',fromPurposeId:'deliver',toPurposeId:'coordinate',cueId:'morning',failedActionIds:['walk'],reviewActionId:'review',minFailures:2,minReviewMinutes:5}]})},catalog);
}
export function action(actionId,durationMinutes) {return {actionId,durationMinutes,activity:actionId==='rest'?'rest':'active',effort:0,exertive:false,skill:actionId==='walk'||actionId==='cart'?'handling':null};}
