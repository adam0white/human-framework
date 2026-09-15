import {createPerson} from '../../src/human/v0.1.1.js';
import {createSituatedPerson} from '../../src/person/index.js';
import {createSustainedPerson,createLearning} from '../../src/development/index.js';
import {createBeliefs} from '../../src/cognition/beliefs.js';
import {createRelationships} from '../../src/social/relationships.js';
import {createDuties} from '../../src/meaning/duties.js';
import {createAdultCourse} from '../../src/lifecourse/adult.js';
import {createAppraisal} from '../../src/affect/appraisal.js';
import {createDevelopingPerson,advanceDevelopingPerson,beginDevelopingAttempt,advanceDevelopingAttempt,finishDevelopingAttempt,updateDevelopingComponent,getDevelopingView,exportDevelopingPerson,restoreDevelopingPerson} from '../../src/developing/person.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const catalog={actors:['traveler','custodian','colleague'],facts:[],purposes:['deliver'],commitments:[],actions:['reflect','check','direct-route','alternative-route']};
export function runAppraisalSequence({regulate=true,purposeActive=true,conflict=true,expire=false,override=null,restore=false,policy='candidate'}={}) {
 const sustained=createSustainedPerson({situated:createSituatedPerson({human:createPerson({id:'traveler',body:{fatigue:.1,hunger:.1},skills:{travel:.1}}),now:0,purposes:[{id:'deliver',status:purposeActive?'active':'withdrawn'}]},catalog),learning:createLearning({skills:['travel']})},catalog);
 let actor=createDevelopingPerson({sustained,
  beliefs:createBeliefs({ownerId:'traveler',now:0,propositions:['route-open'],sources:['custodian','colleague','traveler']}),
  relationships:createRelationships({ownerId:'traveler',now:0,actors:catalog.actors,contexts:['delivery'],ties:[]}),
  duties:createDuties({ownerId:'traveler',now:0,cases:[]}),
  course:createAdultCourse({actorId:'traveler',startDay:0,ageAtStartYears:30,catalog:{actors:catalog.actors,skills:['travel'],roles:[],qualifications:[],opportunities:[]}}),
  appraisal:createAppraisal({ownerId:'traveler',now:0,contexts:[{id:'delivery',purposeId:'deliver',propositionId:'route-open',checkActionId:'check',deliberateActionId:'alternative-route',reflectionActionId:'reflect'}],maxConcernMinutes:30,minReflectionMinutes:5})
 },catalog);
 const world={routeOpen:false,delivered:false},actions=[],trace=[];
 let reflected=false;
 function command(kind,input){actor=updateDevelopingComponent(actor,{kind,input},catalog);}
 for(const [originId,value] of (conflict?[['custodian',false],['colleague',true]]:[['custodian',false]]))command('evidence',{receiptId:`${originId}-report`,propositionId:'route-open',sourceId:originId,originId,value,observedAt:0,receivedAt:0,expiresAt:120,correctsReceiptId:null});
 const now=()=>actor.sustained.situated.now;
 const views=()=>getDevelopingView(actor,catalog,{appraisal:{contextId:'delivery',availableActionIds:catalog.actions}});
 const view=()=>views().appraisal;
 function appraise(){command('appraise',{contextId:'delivery'});}
 function checkpoint(){if(restore)actor=restoreDevelopingPerson(clone(exportDevelopingPerson(actor,catalog)),catalog,'traveler');}
 function paid(actionId,durationMinutes,status='completed') {
  actor=beginDevelopingAttempt(actor,{actionId,durationMinutes,activity:'active',effort:.02,exertive:true,skill:null},catalog);
  const pending=clone(actor.sustained.situated.human.pending);
  if(!pending.capacity.allowed)throw new Error('Reference action blocked');
  actor=advanceDevelopingAttempt(actor,durationMinutes,catalog);
  actor=finishDevelopingAttempt(actor,{attemptId:pending.id,status,mealConsumed:false},catalog);
  actions.push(actionId);trace.push({attemptId:pending.id,actionId,startedAt:pending.startedAt,finishedAt:now(),status});
 }
 appraise();const before=view();checkpoint();
 if(expire){actor=advanceDevelopingPerson(actor,{to:31,mode:'awake'},catalog);appraise();}
 // The actor can decline regulation; a tendency never initiates a paid action itself.
 if(regulate&&view().tendency==='check'){
  paid('reflect',5);
  // Composite derives payment from its actual last completed Human attempt.
  command('regulate',{receiptId:'paid-reflection',contextId:'delivery',selectedByActor:true});
  reflected=true;
 }
 const after=view(),beliefAfterReflection=views().beliefs.beliefs[0].status;
 checkpoint();
 const directTendency=!purposeActive||views().beliefs.beliefs[0].status==='resolved'||now()>=30?'none':reflected?'deliberate':'check';
 const tendency=policy==='direct'?directTendency:after.tendency;
 let selected=override??(tendency==='check'?'check':'alternative-route');
 if(selected==='check'){
  paid('check',5);
  command('evidence',{receiptId:'checked-route',propositionId:'route-open',sourceId:'traveler',originId:'traveler',value:false,observedAt:now(),receivedAt:now(),expiresAt:120,correctsReceiptId:null});
  appraise();selected='alternative-route';
 }
 if(!['direct-route','alternative-route'].includes(selected))throw new Error('Unknown supplied route choice');
 const success=selected==='alternative-route'||world.routeOpen;
 paid(selected,selected==='alternative-route'?20:10,success?'completed':'failed');
 if(success)world.delivered=true;
 appraise();checkpoint();
 return {before,after,beliefAfterReflection,actions,actualMinutes:now(),delivered:world.delivered,world,trace,state:exportDevelopingPerson(actor,catalog)};
}
