import {createPerson} from '../../src/human/v0.1.1.js';
import {createSituatedPerson} from '../../src/person/index.js';
import {createCommitment,transitionCommitment} from '../../src/person/commitments.js';
import {createSustainedPerson,createLearning,advanceSustainedPerson,beginSustainedAttempt,advanceSustainedAttempt,finishSustainedAttempt,exportSustainedPerson,restoreSustainedPerson} from '../../src/development/index.js';
import {createRelationships,advanceRelationships,receiveRelationshipEvent,getRelationshipView,exportRelationships,restoreRelationships} from '../../src/social/relationships.js';
import {createDuties,advanceDuties,receiveDutyNotice,recordStatedIntention,receiveRepairOutcome,getDutyView,getDutyPublicView,exportDuties,restoreDuties} from '../../src/meaning/duties.js';
import {createAdultCourse,advanceAdultCourse,recordQualification,transitionAdultRole,availableAdultOpportunities,getAdultCourseView,exportAdultCourse,restoreAdultCourse} from '../../src/lifecourse/adult.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const actors=['learner','neighbor','assessor'];
const catalog={actors,facts:[],purposes:['care','repair','earn'],commitments:['return'],actions:['return-item','paid-work','provide-aid','confirm-aid','assist','mentor-session','assessment','rest']};
export const dutyCases=[{id:'entrusted-item',source:{kind:'revelation',locator:'https://quran.com/4/58',translationAttribution:'Mustafa Khattab, The Clear Quran'},interpretation:{summary:'Authored entrusted-item case: return the item after a lapse; no ruling on this fictional case is claimed.',school:'Hanafi-Maturidi starting point; no case ruling',reviewStatus:'unreviewed'},requirements:[{id:'item',requiredAmount:1}]}];
const adultCatalog={actors,skills:['support'],roles:[{id:'trainee',requiredQualifications:[]},{id:'mentor',requiredQualifications:['teaching']}],qualifications:[{id:'teaching',skillId:'support',minimumSkill:.1}],opportunities:[{id:'assist',roleId:'trainee',requiredQualifications:[]},{id:'mentor-session',roleId:'mentor',requiredQualifications:['teaching']}]};

function person(skill=.1) {
 return createSustainedPerson({situated:createSituatedPerson({human:createPerson({id:'learner',body:{fatigue:.1,hunger:.1},skills:{support:skill}}),now:0,purposes:[{id:'care',status:'active'},{id:'repair',status:'active'},{id:'earn',status:'active'}]},catalog),learning:createLearning({skills:['support']})},catalog);
}
function paid(person,actionId,durationMinutes,skill=null) {
 let next=beginSustainedAttempt(person,{actionId,durationMinutes,activity:actionId==='rest'?'rest':'active',effort:actionId==='rest'?0:.1,exertive:actionId!=='rest',skill},catalog);
 next=advanceSustainedAttempt(next,durationMinutes,catalog);
 if(!next.situated.human.pending.capacity.allowed)throw new Error('Unexpected blocked action');
 return finishSustainedAttempt(next,{attemptId:next.situated.human.pending.id,status:'completed',mealConsumed:false},catalog);
}
// Competent direct notebook: same delivered events, authored care and world rules.
// It is a behavioral comparator, not an independent cost/authoring measurement.
function notebookStance(events) {
 const failures=events.filter(e=>e.kind==='support_failed');
 const repaired=new Set(events.filter(e=>e.kind==='repair_acknowledged').map(e=>events.find(r=>r.id===e.relatedEventId)?.relatedEventId));
 return failures.some(e=>!repaired.has(e.id))?'guarded':events.some(e=>e.kind==='support_completed'||e.kind==='repair_acknowledged')?'open':'unknown';
}

export function runDevelopingSequence(options={}) {
 const {notice=true,care=true,acknowledge=true,observeFailure=true,repairAvailable=true,qualification=true,dutyStance='accepted',restore=false,policy='candidate'}=options;
 let p=person(),actualActivityMinutes=0,modeledRecoveryMinutes=0;
 let self=createRelationships({ownerId:'learner',now:0,actors,contexts:['care','property'],ties:[{otherId:'neighbor',care:care?'active':'inactive'}]});
 let recipient=createRelationships({ownerId:'neighbor',now:0,actors,contexts:['care','property'],ties:[{otherId:'learner',care:'inactive'}]});
 let duties=createDuties({ownerId:'learner',now:0,cases:dutyCases});
 let course=createAdultCourse({actorId:'learner',startDay:0,ageAtStartYears:30,maxDays:730,catalog:adultCatalog});
 let commitment=createCommitment({id:'return',debtorId:'learner',creditorId:'neighbor',dueAt:0,terms:'Return entrusted item'},catalog);
 commitment=transitionCommitment(commitment,{type:'accept',actorId:'learner',at:0},catalog);
 p=advanceSustainedPerson(p,{to:1,mode:'awake'},catalog);
 commitment=transitionCommitment(commitment,{type:'breach',actorId:null,at:1},catalog);
 const world={coins:4,returned:0,aid:0,teaching:0,assistance:0,itemAvailable:repairAvailable};
 const received=[],notices=[],roleEvents=[],qualificationEvents=[],trace=[];
 function sync(){const now=p.situated.now;self=advanceRelationships(self,now);recipient=advanceRelationships(recipient,now);duties=advanceDuties(duties,now);}
 function deliver(event){recipient=receiveRelationshipEvent(recipient,event);received.push(clone(event));}
 function checkpoint(){if(!restore)return;p=restoreSustainedPerson(clone(exportSustainedPerson(p,catalog)),catalog);self=restoreRelationships(clone(exportRelationships(self)),'learner');recipient=restoreRelationships(clone(exportRelationships(recipient)),'neighbor');duties=restoreDuties(clone(exportDuties(duties)),'learner');course=restoreAdultCourse(clone(exportAdultCourse(course)),'learner');}
 function act(id,minutes,skill=null){const start=p.situated.now;p=paid(p,id,minutes,skill);actualActivityMinutes+=minutes;sync();trace.push({actionId:id,episodeDay:0,startedAt:start,finishedAt:p.situated.now});}
 sync();
 if(observeFailure)deliver({id:'failed-return',originId:'failed-return-origin',occurredAt:1,receivedAt:1,sourceId:'neighbor',otherId:'learner',contextId:'property',kind:'support_failed',outcomeId:'missed-return',relatedEventId:null});
 if(notice){const receipt={id:'duty-notice',at:1,caseId:'entrusted-item',sourceActorId:'neighbor',understanding:'Return entrusted property; attempt restitution after lapse',stance:dutyStance,disclosedTo:[]};duties=receiveDutyNotice(duties,receipt);notices.push(receipt);}
 const before=getRelationshipView(recipient,'learner','property').stance;
 checkpoint();
 const knowsDuty=(policy==='direct'?notices:getDutyView(duties).notices).findLast(e=>e.caseId==='entrusted-item')?.stance==='accepted';
 const selected=knowsDuty?'return-item':'paid-work';
 if(knowsDuty)duties=recordStatedIntention(duties,{id:'repair-intention',at:p.situated.now,caseId:'entrusted-item',statement:'Return what was entrusted despite losing paid work time',disclosedTo:[]});
 act(selected,15);
 // This host resolves property and resource outcomes, never the intention or predicted plan.
 if(selected==='return-item') {
  world.coins-=2;
  if(world.itemAvailable)world.returned=1;
  duties=receiveRepairOutcome(duties,{id:'return-receipt',at:p.situated.now,caseId:'entrusted-item',kind:'restitution',requirementId:'item',amount:world.returned,outcomeId:'actual-return',disclosedTo:[]});
  if(world.returned){duties=receiveRepairOutcome(duties,{id:'recipient-message',at:p.situated.now,caseId:'entrusted-item',kind:'recipient-response',recipientId:'neighbor',response:acknowledge?'accepted':'deferred',disclosedTo:[]});}
  if(world.returned&&observeFailure){
   deliver({id:'repair-completed',originId:'repair-completed-origin',occurredAt:p.situated.now,receivedAt:p.situated.now,sourceId:'neighbor',otherId:'learner',contextId:'property',kind:'repair_completed',outcomeId:'actual-return',relatedEventId:'failed-return'});
   // Recipient response is supplied independently; physical restitution cannot force it.
   if(acknowledge)deliver({id:'ack-return',originId:'ack-return-origin',occurredAt:p.situated.now,receivedAt:p.situated.now,sourceId:'neighbor',otherId:'learner',contextId:'property',kind:'repair_acknowledged',outcomeId:null,relatedEventId:'repair-completed'});
  }
 } else world.coins+=2;
 checkpoint();
 const after=getRelationshipView(recipient,'learner','property').stance;
 const careView=getRelationshipView(self,'neighbor','care');
 const support=(policy==='direct'?(care?'active':'inactive'):careView.care)==='active';
 const recipientStance=policy==='direct'?notebookStance(received):after;
 const response=support?(recipientStance==='guarded'?'request-confirmation':'accept'):'no-offer';
 if(response==='request-confirmation')act('confirm-aid',10);
 act(support?'provide-aid':'paid-work',20,'support');
 if(support){world.aid++;world.coins--;}else world.coins+=2;
 // Adult trajectory is sparse. Paid skill is carried; intervening physiology is unmodeled.
 const initialSkill=p.situated.human.skills.support;
 const adultActions=[],seams=[],assessments=[];
 function role(roleId,kind,atDay){const event={receiptId:`${roleId}-${kind}-${atDay}`,atDay,roleId,kind,sourceId:'assessor',deliveredTo:'learner'};course=transitionAdultRole(course,event);roleEvents.push(event);}
 role('trainee','entered',0);
 function skillView(){return {actorId:'learner',skills:{support:p.situated.human.skills.support}};}
 function adultAction(day){
  const recoveryStart=p.situated.now;p=paid(p,'rest',20);modeledRecoveryMinutes+=20;
  trace.push({actionId:'rest',episodeDay:day,startedAt:recoveryStart,finishedAt:p.situated.now});
  const candidates=availableAdultOpportunities(course,{actorSkillView:skillView()});
  const activeRoles=new Set();for(const e of roleEvents){if(e.kind==='entered')activeRoles.add(e.roleId);else activeRoles.delete(e.roleId);}
  let credential=false;for(const e of qualificationEvents)credential=e.kind==='awarded';
  const directMentor=activeRoles.has('mentor')&&credential&&skillView().skills.support>=.1;
  const candidateMentor=candidates.some(e=>e.id==='mentor-session'&&e.eligible);
  const id=(policy==='direct'?directMentor:candidateMentor)?'mentor-session':'assist';
  const start=p.situated.now;p=paid(p,id,30,'support');actualActivityMinutes+=30;
  adultActions.push(id);if(id==='mentor-session')world.teaching++;else world.assistance++;
  trace.push({actionId:id,episodeDay:day,startedAt:start,finishedAt:p.situated.now});
 }
 adultAction(0);sync();checkpoint();
 let ageOnlySkillChange=0;
 for(const day of [365,730]){
  const carried=p.situated.human.skills.support;
  course=advanceAdultCourse(course,{toDay:day,kind:'unmodeled'});
  ageOnlySkillChange+=p.situated.human.skills.support-carried;
  // Sparse calendar gap leaves all person state intact; it asserts no intervening physiology.
  seams.push({toDay:day,kind:'unmodeled',carriedSkill:carried,observedMinutes:p.situated.now,bodyProjection:'not advanced or interpreted across gap'});
  if(day===365&&qualification){
   const startedAt=p.situated.now;p=paid(p,'assessment',10);actualActivityMinutes+=10;sync();
   const outcome={id:'paid-support-assessment',assessorId:'assessor',day,startedAt,finishedAt:p.situated.now,assessedSkill:skillView().skills.support,passed:skillView().skills.support>=.1,rule:'authored minimum support skill 0.1'};
   assessments.push(outcome);trace.push({actionId:'assessment',episodeDay:day,startedAt,finishedAt:p.situated.now,outcomeId:outcome.id});
   if(!outcome.passed)throw new Error('Assessment did not meet qualification');
   const event={receiptId:'teaching-award',atDay:day,id:'teaching',kind:'awarded',assessorId:'assessor',deliveredTo:'learner',evidenceRef:'paid-support-assessment'};course=recordQualification(course,event,skillView());qualificationEvents.push(event);role('mentor','entered',day);}
  if(day===730&&qualification)role('mentor','exited',day);
  // All component minutes count modeled activity; calendar gaps belong only to the adult course.
  if(restore){p=restoreSustainedPerson(clone(exportSustainedPerson(p,catalog)),catalog);course=restoreAdultCourse(clone(exportAdultCourse(course)),'learner');}
  adultAction(day);sync();checkpoint();
 }
 return {repair:{action:selected,returned:world.returned,originalCommitment:commitment.status,understood:knowsDuty,progress:getDutyView(duties).repairs['entrusted-item'],observer:getDutyPublicView(duties,'neighbor')},relationship:{before,after,response},care:{action:support?'provide-aid':'paid-work',aid:world.aid,promiseRequired:false},adult:{actions:adultActions,unmodeledDays:730,ageOnlySkillChange,initialSkill,finalSkill:p.situated.human.skills.support,view:getAdultCourseView(course),seams,assessments},actualActivityMinutes,modeledRecoveryMinutes,world,trace,state:{person:exportSustainedPerson(p,catalog),self:exportRelationships(self),recipient:exportRelationships(recipient),duties:exportDuties(duties),course:exportAdultCourse(course),commitment}};
}
export function compareDevelopingSequences(){return [ ['ordinary',{}],['no-duty-notice',{notice:false}],['uncertain-duty',{dutyStance:'uncertain'}],['rejected-duty',{dutyStance:'rejected'}],['no-care',{care:false}],['no-acknowledgment',{acknowledge:false}],['hidden-failure',{observeFailure:false}],['failed-repair',{repairAvailable:false}],['no-qualification',{qualification:false}] ].map(([id,options])=>({id,candidate:runDevelopingSequence(options),direct:runDevelopingSequence({...options,policy:'direct'})}));}
