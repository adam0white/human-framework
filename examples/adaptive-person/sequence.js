import {createActor,catalog,action} from './setup.js';
import {beginAdaptiveAttempt,advanceAdaptiveAttempt,finishAdaptiveAttempt,acceptAdaptiveRevision,getAdaptiveView,exportAdaptivePerson,restoreAdaptivePerson,advanceAdaptivePerson} from '../../src/adaptive/index.js';
import {createFunctionalContext,advanceFunctionalContext,recordRestriction,assessFunctionalMethod,getFunctionalNotice,exportFunctionalContext,restoreFunctionalContext} from '../../src/constraints/functional.js';
import {createInstitution,requestAccess,releaseAccess,withdrawRequest,advanceInstitution,getInstitutionOffer,exportInstitution,restoreInstitution} from '../../src/institution/access.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const now=p=>p.person.sustained.situated.now;
function paid(p,id,minutes,{cueId=null,purposeId=null,status='completed'}={}) {
 p=beginAdaptiveAttempt(p,{action:action(id,minutes),cueId,purposeId},catalog);
 if(!p.person.sustained.situated.human.pending.capacity.allowed)throw new Error('Unexpected body refusal');
 p=advanceAdaptiveAttempt(p,minutes,catalog);
 return finishAdaptiveAttempt(p,{attemptId:p.person.sustained.situated.human.pending.id,status,mealConsumed:false},catalog);
}

// Direct policies below use the same delivered observations and authored rules.
// Agreement is an expected control, not evidence of superior prediction or authoring cost.
export function runAdaptationSequence({repetitions=3,matchingCue=true,interleaveCue=false,failures=2,review=true,accept=true,restore=false,policy='candidate'}={}) {
 let person=createActor();
 let trace=[],history=[],world={routeOpen:true};
 function checkpoint(){if(!restore)return;const saved=clone({person:exportAdaptivePerson(person,catalog),trace,history,world});person=restoreAdaptivePerson(saved.person,catalog,'worker');({trace,history,world}=saved);}
 function act(id,minutes,cueId=null,purposeId=null){
  const status=id==='walk'&&!world.routeOpen?'failed':'completed';
  const startedAt=now(person);person=paid(person,id,minutes,{status,cueId,purposeId});
  const event={actionId:id,startedAt,finishedAt:now(person),status,cueId,purposeId};
  trace.push(event);history.push(event);checkpoint();
 }
 for(let i=0;i<repetitions;i++){act('walk',10,'morning','deliver');if(interleaveCue)act('cart',15,'evening','deliver');}
 const cueId=matchingCue?'morning':'evening';
 const candidate=getAdaptiveView(person,catalog,{cueId,availableActionIds:['walk','cart','review','desk']});
 const cueHistory=history.filter(e=>e.cueId==='morning').toReversed();
 const consecutive=cueHistory.findIndex(e=>e.purposeId!=='deliver'||e.actionId!=='walk'||e.status!=='completed');
 const streak=consecutive===-1?cueHistory.length:consecutive;
 const directSuggestion=matchingCue&&streak>=3?'walk':null;
 const suggestion=policy==='direct'?directSuggestion:candidate.habit.suggestedActionId;
 const habitChoice=suggestion??'cart';
 act(habitChoice,habitChoice==='walk'?10:15,matchingCue?'morning':null,'deliver');
 // Canonical route closure determines subsequent walk outcomes, independently of choice.
 world.routeOpen=false;
 for(let i=0;i<failures;i++)act('walk',10,'morning','deliver');
 const offered=policy==='direct'?history.filter(e=>e.status==='failed'&&e.actionId==='walk'&&e.cueId==='morning'&&e.purposeId==='deliver').length>=2:getAdaptiveView(person,catalog,{cueId:'morning',availableActionIds:['review']}).revisionOffers.length>0;
 if(offered&&review){act('review',5,null,'deliver');if(accept){person=acceptAdaptiveRevision(person,{revisionId:'change-work',selectedByActor:true},catalog);checkpoint();}}
 const purpose=person.person.sustained.situated.purposes.find(p=>p.id==='coordinate').status;
 const nextAction=purpose==='active'?'desk':'walk';
 act(nextAction,nextAction==='desk'?8:10,nextAction==='walk'?'morning':null,nextAction==='walk'?'deliver':'coordinate');
 return {habitChoice,revisionOffered:offered,revised:purpose==='active',nextAction,output:nextAction==='desk'?1:0,paidMinutes:now(person),trace,world,state:exportAdaptivePerson(person,catalog)};
}

export function runOpportunitySequence({notice=true,accommodation=true,resource=true,peerQueues=true,peerWithdraws=false,restore=false,policy='candidate'}={}) {
 let worker=createActor(),peer=createActor('peer');
 let functional=createFunctionalContext({now:0,actors:catalog.actors,demands:['carry'],methods:[
  {id:'ordinary',actionId:'walk',durationMinutes:10,effort:0,exertive:false,skill:'handling',demandIds:['carry'],resourceCosts:[]},
  {id:'accommodated',actionId:'cart',durationMinutes:15,effort:0,exertive:false,skill:'handling',demandIds:[],resourceCosts:[{resourceId:'cart-credit',amount:1}]}
 ]});
 functional=recordRestriction(functional,{id:'carry-limit',actorId:'worker',demandId:'carry',sourceId:'assessor',at:0,reviewAt:5});
 let institution=createInstitution({now:0,facilityId:'desk',actors:catalog.actors,grants:['worker','peer'],maxHoldMinutes:30});
 let world={cartCredits:resource?1:0,deliveries:0,workerOutput:0,peerOutput:0},received=[],trace=[];
 if(notice)received.push({...getFunctionalNotice(functional,{actorId:'worker',noticeId:'carry-limit'}),receivedAt:0});
 function checkpoint(){if(!restore)return;const saved=clone({worker:exportAdaptivePerson(worker,catalog),peer:exportAdaptivePerson(peer,catalog),functional:exportFunctionalContext(functional),institution:exportInstitution(institution),world,received,trace});worker=restoreAdaptivePerson(saved.worker,catalog,'worker');peer=restoreAdaptivePerson(saved.peer,catalog,'peer');functional=restoreFunctionalContext(saved.functional,catalog.actors);institution=restoreInstitution(saved.institution);({world,received,trace}=saved);}
 function sync(to){if(now(worker)<to)worker=advanceAdaptivePerson(worker,{to,mode:'awake'},catalog);if(now(peer)<to)peer=advanceAdaptivePerson(peer,{to,mode:'awake'},catalog);functional=advanceFunctionalContext(functional,to);institution=advanceInstitution(institution,to);checkpoint();}
 const methodId=received.length&&accommodation?'accommodated':'ordinary';
 const before=clone(worker);
 const assessment=assessFunctionalMethod(functional,{actorId:'worker',methodId,resources:[{resourceId:'cart-credit',quantity:world.cartCredits}]});
 const directAvailable=methodId==='accommodated'&&world.cartCredits>=1;
 const allowed=policy==='direct'?directAvailable:assessment.available;
 if(allowed){worker=paid(worker,assessment.action.actionId,assessment.action.durationMinutes,{purposeId:'deliver'});world.cartCredits-=assessment.resourceCosts.reduce((sum,c)=>sum+c.amount,0);world.deliveries++;sync(now(worker));}
 trace.push({kind:'method',methodId,allowed,paidMinutes:now(worker),bodyUnchangedWhenRefused:allowed?null:JSON.stringify(before)===JSON.stringify(worker)});
 checkpoint();
 // Merely reaching a review date cannot remove the restriction.
 const restrictionStillActive=!assessFunctionalMethod(functional,{actorId:'worker',methodId:'ordinary',resources:[]}).available;
 let reservation=requestAccess(institution,{actorId:'worker',requestId:'worker-first',holdMinutes:30});institution=reservation.state;
 const directQueue=[];let directHolder='worker';
 if(peerQueues){institution=requestAccess(institution,{actorId:'peer',requestId:'peer-first',holdMinutes:10}).state;directQueue.push('peer');}
 if(peerQueues&&peerWithdraws){institution=withdrawRequest(institution,{actorId:'peer',requestId:'peer-first'});directQueue.pop();}
 const reservationWithoutOutput=world.workerOutput===0&&world.peerOutput===0;
 // Grant and hold must cover the complete actual attempt; host resolves output only afterwards.
 const offer=getInstitutionOffer(institution,'worker');
 if(!offer.hasReservation||offer.expiresAt<now(worker)+8)throw new Error('Worker does not hold required interval');
 worker=paid(worker,'desk',8,{purposeId:'deliver'});world.workerOutput++;sync(now(worker));
 institution=releaseAccess(institution,{actorId:'worker',reservationId:reservation.reservationId});directHolder=directQueue.shift()??null;
 checkpoint();
 const promoted=getInstitutionOffer(institution,'peer').hasReservation;
 if(policy==='direct'&&promoted!==(directHolder==='peer'))throw new Error('Direct FIFO mismatch');
 const second=requestAccess(institution,{actorId:'worker',requestId:'worker-second',holdMinutes:10});institution=second.state;
 const secondDecision=policy==='direct'?(directHolder===null?'reserved':'queued'):second.decision;
 if(secondDecision!==second.decision)throw new Error('Direct allocation mismatch');
 if(promoted){const peerOffer=getInstitutionOffer(institution,'peer');if(peerOffer.expiresAt<now(peer)+8)throw new Error('Peer interval unavailable');peer=paid(peer,'desk',8,{purposeId:'deliver'});world.peerOutput++;sync(now(peer));institution=releaseAccess(institution,{actorId:'peer',reservationId:peerOffer.reservationId});}
 trace.push({kind:'facility',peerQueues,peerWithdraws,promoted,secondDecision,reservationWithoutOutput});checkpoint();
 return {methodId,allowed,restrictionStillActive,promoted,secondDecision,world,received,trace,now:now(worker),state:{worker:exportAdaptivePerson(worker,catalog),peer:exportAdaptivePerson(peer,catalog),functional:exportFunctionalContext(functional),institution:exportInstitution(institution)}};
}
export function compareAdaptiveSequences(){return [
 ['learned-habit',runAdaptationSequence,{}],['interleaved-cue',runAdaptationSequence,{interleaveCue:true}],['insufficient-repetition',runAdaptationSequence,{repetitions:2}],['different-cue',runAdaptationSequence,{matchingCue:false}],['one-failure',runAdaptationSequence,{failures:1}],['no-review',runAdaptationSequence,{review:false}],['declined-revision',runAdaptationSequence,{accept:false}],
 ['accommodated-access',runOpportunitySequence,{}],['undelivered-notice',runOpportunitySequence,{notice:false}],['no-accommodation',runOpportunitySequence,{accommodation:false}],['no-resource',runOpportunitySequence,{resource:false}],['no-peer-request',runOpportunitySequence,{peerQueues:false}],['peer-withdrawal',runOpportunitySequence,{peerWithdraws:true}]
 ].map(([id,run,options])=>({id,candidate:run(options),direct:run({...options,policy:'direct'}),restored:run({...options,restore:true})}));}
