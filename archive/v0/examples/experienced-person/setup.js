import {createPerson} from '../../src/human/v0.1.1.js';
import {createSituatedPerson} from '../../src/person/index.js';
import {createSustainedPerson,createLearning} from '../../src/development/index.js';
import {createBeliefs} from '../../src/cognition/beliefs.js';
import {createRelationships} from '../../src/social/relationships.js';
import {createDuties} from '../../src/meaning/duties.js';
import {createAdultCourse} from '../../src/lifecourse/adult.js';
import {createAppraisal} from '../../src/affect/appraisal.js';
import {createDevelopingPerson} from '../../src/developing/person.js';
import {createAdaptivePerson} from '../../src/adaptive/person.js';
import {createHabits} from '../../src/adaptation/habits.js';
import {createEpisodes} from '../../src/experience/episodes.js';
import {createAttention} from '../../src/experience/attention.js';
import {createInference} from '../../src/experience/inference.js';
import {createExperienceWorkspace} from '../../src/experience/workspace.js';
export const catalog={actors:['courier','dispatcher','observer'],facts:[],purposes:['deliver'],commitments:[],actions:['read','direct','detour','inspect','rest']};
export function createWorkspace(){
 const id='courier';
 const human=createPerson({id,body:{fatigue:.1,hunger:.1},skills:{navigation:.2}});
 const situated=createSituatedPerson({human,now:0,purposes:[{id:'deliver',status:'active'}]},catalog);
 const person=createDevelopingPerson({sustained:createSustainedPerson({situated,learning:createLearning({skills:['navigation']})},catalog),
  beliefs:createBeliefs({ownerId:id,now:0,propositions:['gateOpen','permitValid'],sources:catalog.actors}),
  relationships:createRelationships({ownerId:id,now:0,actors:catalog.actors,contexts:['route'],ties:[]}),
  duties:createDuties({ownerId:id,now:0,cases:[]}),
  course:createAdultCourse({actorId:id,startDay:0,ageAtStartYears:30,catalog:{actors:catalog.actors,skills:['navigation'],qualifications:[],roles:[],opportunities:[]}}),
  appraisal:createAppraisal({ownerId:id,now:0,contexts:[],maxConcernMinutes:30,minReflectionMinutes:5})},catalog);
 const actor=createAdaptivePerson({person,habits:createHabits({ownerId:id,now:0,habits:[],revisions:[]})},catalog);
 return createExperienceWorkspace({actor,
  episodes:createEpisodes({ownerId:id,now:0,contexts:['route','warehouse'],sources:catalog.actors,propositions:['gateOpen','permitValid']}),
  attention:createAttention({ownerId:id,now:0,reviewActionId:'read',minReviewMinutes:2}),
  inference:createInference({ownerId:id,propositions:['gateOpen','permitValid','directAllowed'],rules:[{ruleId:'route-permission',when:[{propositionId:'gateOpen',value:true},{propositionId:'permitValid',value:true}],then:{propositionId:'directAllowed',value:true}}]})},catalog);
}
export const action=(actionId,durationMinutes)=>({actionId,durationMinutes,effort:0,exertive:false,activity:actionId==='rest'?'rest':'active',skill:actionId==='direct'||actionId==='detour'?'navigation':null});
export const message=(messageId='gate',propositionId='gateOpen',value=true,expiresAt=100)=>({messageId,contextId:'route',propositionId,sourceId:'dispatcher',originId:'dispatcher',value,occurredAt:0,deliveredAt:0,expiresAt,correctsReceiptId:null});
export const episode=(overrides={})=>({episodeId:'past-route',eventId:'closed-trip',contextId:'route',sourceId:'courier',originId:'courier',occurredAt:0,receivedAt:0,expiresAt:100,actionId:'direct',outcomeId:'blocked-gate',facts:[{propositionId:'gateOpen',value:false}],correctsEpisodeId:null,...overrides});
