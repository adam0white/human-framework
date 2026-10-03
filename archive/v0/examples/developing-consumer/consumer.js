/** Independent shared-tool consumer. Uses installed candidate exports only. */
import {
  createDevelopingPerson,advanceDevelopingPerson,beginDevelopingAttempt,advanceDevelopingAttempt,
  finishDevelopingAttempt,advanceDevelopingCalendar,updateDevelopingComponent,getDevelopingView,
  exportDevelopingPerson,restoreDevelopingPerson,
  createRelationships,advanceRelationships,receiveRelationshipEvent,getRelationshipView,exportRelationships,restoreRelationships,
  createDuties,createAdultCourse,availableAdultOpportunities,createAppraisal
} from 'developing-person';
import {createPerson} from 'developing-person/human';
import {createSituatedPerson} from 'developing-person/situated';
import {createSustainedPerson,createLearning} from 'developing-person/sustained';
import {createCommitment,transitionCommitment} from 'developing-person/commitments';
import {createBeliefs} from 'developing-person/cognition';

const copy=value=>JSON.parse(JSON.stringify(value));
const actors=['borrower','lender','assessor'];
const catalog={actors,facts:[],purposes:['repair'],commitments:['tool-return'],actions:['restore-tool','teach','check-tool','ask-lender','reflect']};
const adultCatalog={actors,skills:['support'],qualifications:[{id:'tool-tutor',skillId:'support',minimumSkill:.1}],
  roles:[{id:'trainee',requiredQualifications:[]},{id:'mentor',requiredQualifications:['tool-tutor']}],
  opportunities:[{id:'observe',roleId:'trainee',requiredQualifications:[]},{id:'teach',roleId:'mentor',requiredQualifications:['tool-tutor']}]};
const caseRecord={id:'entrusted-tool',source:{kind:'revelation',locator:'Quran 4:58',translationAttribution:'Mustafa Khattab, The Clear Quran'},
  interpretation:{summary:'Authored entrusted-tool return and repair case; no ruling on this fictional case',school:'Hanafi-Maturidi starting point',reviewStatus:'unreviewed'},
  requirements:[{id:'restore',requiredAmount:1}]};
const appraisalContext={id:'tool-safety',purposeId:'repair',propositionId:'tool-safe',
  checkActionId:'check-tool',deliberateActionId:'ask-lender',reflectionActionId:'reflect'};

function createBorrower(skill=.2) {
  const sustained=createSustainedPerson({situated:createSituatedPerson({human:createPerson({id:'borrower',body:{fatigue:.1,hunger:.1},skills:{support:skill}}),
    now:0,purposes:[{id:'repair',status:'active'}]},catalog),learning:createLearning({skills:['support']})},catalog);
  return createDevelopingPerson({sustained,
    beliefs:createBeliefs({ownerId:'borrower',now:0,propositions:['tool-safe'],sources:['lender','assessor']}),
    relationships:createRelationships({ownerId:'borrower',now:0,actors,contexts:['tool'],ties:[{otherId:'lender',care:'inactive'}]}),
    duties:createDuties({ownerId:'borrower',now:0,cases:[caseRecord]}),
    course:createAdultCourse({actorId:'borrower',startDay:0,ageAtStartYears:29,maxDays:730,catalog:adultCatalog}),
    appraisal:createAppraisal({ownerId:'borrower',now:0,contexts:[appraisalContext],maxConcernMinutes:30,minReflectionMinutes:5})},catalog);
}
function paid(person,actionId,minutes,skill='support') {
  person=beginDevelopingAttempt(person,{actionId,durationMinutes:minutes,activity:'active',effort:0,exertive:false,skill},catalog);
  const attemptId=person.sustained.situated.human.pending.id;
  person=advanceDevelopingAttempt(person,minutes,catalog);
  if(person.sustained.situated.human.pending.blocked)throw new Error('Paid action blocked');
  return finishDevelopingAttempt(person,{attemptId,status:'completed',mealConsumed:false},catalog);
}
function lenderEvent(id,kind,at,outcomeId,relatedEventId=null) {
  return {id,originId:`origin_${id}`,occurredAt:at,receivedAt:at,sourceId:'lender',otherId:'borrower',
    contextId:'tool',kind,outcomeId,relatedEventId};
}

function run(restore) {
  let person=createBorrower(),lender=createRelationships({ownerId:'lender',now:0,actors,contexts:['tool'],ties:[{otherId:'borrower',care:'active'}]});
  const now=()=>person.sustained.situated.now;
  let commitment=createCommitment({id:'tool-return',debtorId:'borrower',creditorId:'lender',dueAt:0,terms:'Return the shared tool'},catalog);
  commitment=transitionCommitment(commitment,{type:'accept',actorId:'borrower',at:0},catalog);
  person=advanceDevelopingPerson(person,{to:1,mode:'awake'},catalog);
  commitment=transitionCommitment(commitment,{type:'breach',actorId:null,at:1},catalog);
  lender=advanceRelationships(lender,1);
  for(const [receiptId,sourceId,value] of [['safe-report','lender',true],['unsafe-report','assessor',false]]){
    person=updateDevelopingComponent(person,{kind:'evidence',input:{receiptId,propositionId:'tool-safe',sourceId,originId:sourceId,value,
      observedAt:1,receivedAt:1,expiresAt:50,correctsReceiptId:null}},catalog);
  }
  person=updateDevelopingComponent(person,{kind:'appraise',input:{contextId:'tool-safety'}},catalog);
  const view=()=>getDevelopingView(person,catalog,{appraisal:{contextId:'tool-safety',availableActionIds:['check-tool','ask-lender','restore-tool']}});
  const initialTendency=view().appraisal.tendency,initialBeliefStatus=view().beliefs.beliefs[0].status;
  lender=receiveRelationshipEvent(lender,lenderEvent('missed','support_failed',1,'missed_tool'));
  person=updateDevelopingComponent(person,{kind:'duty-notice',input:{id:'notice',at:1,caseId:'entrusted-tool',sourceActorId:'lender',
    understanding:'Return the shared tool and repair its damage',stance:'accepted',disclosedTo:[]}},catalog);
  person=updateDevelopingComponent(person,{kind:'intention',input:{id:'intent',at:1,caseId:'entrusted-tool',
    statement:'I will restore the tool',disclosedTo:[]}},catalog);
  const world={coins:4,toolRestored:false,teachingCompleted:0};
  const repairAction=view().duties.notices.length?'restore-tool':null;
  let compositeRestored=true;
  function checkpoint() {
    if(!restore)return;
    const snapshot=copy(exportDevelopingPerson(person,catalog));
    person=restoreDevelopingPerson(snapshot,catalog,'borrower');
    compositeRestored&&=JSON.stringify(exportDevelopingPerson(person,catalog))===JSON.stringify(snapshot);
    lender=restoreRelationships(copy(exportRelationships(lender)),'lender');
  }
  checkpoint();
  const beforeReflection=JSON.stringify(world),reflectionStart=now();
  person=paid(person,'reflect',5,null);
  person=updateDevelopingComponent(person,{kind:'regulate',input:{contextId:'tool-safety',receiptId:'tool-reflection',selectedByActor:true}},catalog);
  const reflectionPaidMinutes=now()-reflectionStart,regulatedTendency=view().appraisal.tendency;
  const beliefAfterRegulation=view().beliefs.beliefs[0].status,worldUnchangedByRegulation=JSON.stringify(world)===beforeReflection;
  checkpoint();
  const repairStart=now();
  person=paid(person,repairAction,15);
  const repairMinutes=now()-repairStart;
  world.coins-=2;world.toolRestored=true; // Only the host creates actual property/resource outcomes.
  person=updateDevelopingComponent(person,{kind:'repair',input:{id:'restore-receipt',at:now(),caseId:'entrusted-tool',kind:'restitution',
    requirementId:'restore',amount:1,outcomeId:'actual_restore',disclosedTo:['lender']}},catalog);
  person=updateDevelopingComponent(person,{kind:'repair',input:{id:'lender-response',at:now(),caseId:'entrusted-tool',kind:'recipient-response',
    recipientId:'lender',response:'deferred',disclosedTo:['borrower']}},catalog);
  const recipientResponse=view().duties.recipientResponses.at(-1).response;
  lender=advanceRelationships(lender,now());
  lender=receiveRelationshipEvent(lender,lenderEvent('restored','repair_completed',now(),'actual_restore','missed'));
  const relationshipAfter=getRelationshipView(lender,'borrower','tool').stance;
  const repairStatus=view().duties.repairs['entrusted-tool'].status;
  person=updateDevelopingComponent(person,{kind:'role',input:{receiptId:'trainee-entry',atDay:0,roleId:'trainee',
    kind:'entered',sourceId:'assessor',deliveredTo:'borrower'}},catalog);
  const opportunities=()=>availableAdultOpportunities(person.course,{actorSkillView:{actorId:'borrower',
    skills:{support:person.sustained.situated.human.skills.support}}});
  const initialOpportunity=opportunities().find(item=>item.id==='observe'&&item.eligible)?.id;
  person=advanceDevelopingCalendar(person,{toDay:365,kind:'unmodeled'},catalog);
  person=updateDevelopingComponent(person,{kind:'qualification',input:{receiptId:'tool-tutor-award',atDay:365,id:'tool-tutor',kind:'awarded',
    assessorId:'assessor',evidenceRef:'observed_tool_support',deliveredTo:'borrower'}},catalog);
  person=updateDevelopingComponent(person,{kind:'role',input:{receiptId:'mentor-entry',atDay:365,roleId:'mentor',
    kind:'entered',sourceId:'assessor',deliveredTo:'borrower'}},catalog);
  const laterOpportunity=opportunities().find(item=>item.id==='teach'&&item.eligible)?.id;
  checkpoint();
  // The calendar interval is unmodeled; no physiological time is inferred from it.
  const teachingStart=now();
  person=paid(person,laterOpportunity,20);
  world.teachingCompleted++;
  checkpoint();
  const compositeSynchronized=['beliefs','relationships','duties','appraisal'].every(key=>person[key].now===now())&&
    person.course.day===365;
  return {repairAction,repairStatus,coinsAfterRepair:world.coins,recipientResponse,relationshipAfter,
    initialOpportunity,laterOpportunity,teachingCompleted:world.teachingCompleted,initialTendency,regulatedTendency,initialBeliefStatus,
    beliefAfterRegulation,worldUnchangedByRegulation,reflectionPaidMinutes,
    actualPaidMinutes:reflectionPaidMinutes+repairMinutes+now()-teachingStart,compositeRestored,compositeSynchronized,
    state:{person:exportDevelopingPerson(person,catalog),lender:exportRelationships(lender),commitment,world}};
}
export function runConsumer() {
  const resumed=run(true),plain=run(false),resumeEqual=JSON.stringify(resumed)===JSON.stringify(plain);
  if(!resumeEqual)throw new Error('Whole developing-person restoration diverged');
  const {state,...result}=resumed;
  return {format:'developing-person-independent-consumer',...result,resumeEqual};
}
