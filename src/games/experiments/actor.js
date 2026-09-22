/** Shared integration only: scenarios still own world state, decisions and outcomes. */
import {createPerson} from '../../human/v0.1.1.js';
import {createSituatedPerson} from '../../person/index.js';
import {createSustainedPerson,createLearning} from '../../development/index.js';
import {createBeliefs} from '../../cognition/beliefs.js';
import {createRelationships} from '../../social/relationships.js';
import {createDuties} from '../../meaning/duties.js';
import {createAdultCourse} from '../../lifecourse/adult.js';
import {createAppraisal} from '../../affect/appraisal.js';
import {createDevelopingPerson} from '../../developing/person.js';
import {createAdaptivePerson} from '../../adaptive/person.js';
import {createHabits} from '../../adaptation/habits.js';
import {createEpisodes} from '../../experience/episodes.js';
import {createAttention} from '../../experience/attention.js';
import {createInference} from '../../experience/inference.js';
import {createExperienceWorkspace,beginExperienceAttempt,advanceExperienceAttempt,finishExperienceAttempt} from '../../experience/workspace.js';

export function createExperimentActor({id,actors,purposeIds,actionIds,propositionIds,contextIds,rules=[],skillIds=[],reviewActionId='read'}) {
 const catalog={actors,facts:[],purposes:purposeIds,commitments:[],actions:actionIds};
 const human=createPerson({id,body:{fatigue:.1,hunger:.1},skills:Object.fromEntries(skillIds.map(id=>[id,.2]))});
 const situated=createSituatedPerson({human,now:0,purposes:purposeIds.map(id=>({id,status:'active'}))},catalog);
 const person=createDevelopingPerson({
  sustained:createSustainedPerson({situated,learning:createLearning({skills:skillIds})},catalog),
  beliefs:createBeliefs({ownerId:id,now:0,propositions:propositionIds,sources:actors}),
  relationships:createRelationships({ownerId:id,now:0,actors,contexts:contextIds,ties:[]}),
  duties:createDuties({ownerId:id,now:0,cases:[]}),
  course:createAdultCourse({actorId:id,startDay:0,ageAtStartYears:30,catalog:{actors,skills:skillIds,qualifications:[],roles:[],opportunities:[]}}),
  appraisal:createAppraisal({ownerId:id,now:0,contexts:[],maxConcernMinutes:30,minReflectionMinutes:2}),
 },catalog);
 const actor=createAdaptivePerson({person,habits:createHabits({ownerId:id,now:0,habits:[],revisions:[]})},catalog);
 const propositions=[...new Set([...propositionIds,...rules.map(r=>r.then.propositionId)])];
 const workspace=createExperienceWorkspace({actor,
  episodes:createEpisodes({ownerId:id,now:0,contexts:contextIds,sources:actors,propositions:propositionIds}),
  attention:createAttention({ownerId:id,now:0,reviewActionId,minReviewMinutes:2}),
  inference:createInference({ownerId:id,propositions,rules}),
 },catalog);
 return {workspace,catalog};
}

/** The host determines the result; this helper pays actual admitted Human time. */
export function performExperimentAction(workspace,catalog,{actionId,minutes,status='completed',messageId=null,purposeId=null,skill=null}) {
 let next=beginExperienceAttempt(workspace,{action:{actionId,durationMinutes:minutes,effort:0,exertive:false,activity:actionId==='rest'?'rest':'active',skill},attentionMessageId:messageId,purposeId},catalog);
 const pending=next.actor.person.sustained.situated.human.pending;
 if(!pending.capacity.allowed)throw Error('This action is not currently within bodily capacity');
 next=advanceExperienceAttempt(next,minutes,catalog);
 return finishExperienceAttempt(next,{attemptId:pending.id,status,mealConsumed:false},catalog);
}
