/** Authored reference situations. These rules demonstrate software behavior, not fitted psychology. */
import {createPerson,beginAttempt,advanceAttempt,finishAttempt} from '../../src/human/v0.1.1.js';
import {createClock,scheduleEvent,advanceClock,exportClock,restoreClock} from '../../src/runtime/clock.js';
import {createSituatedPerson,advancePerson,setPurpose,observePerson,decide,exportSituatedPerson,restoreSituatedPerson} from '../../src/person/index.js';
import {createCommitment,transitionCommitment} from '../../src/person/commitments.js';
import {directDecision} from './direct-baseline.js';

export const catalog={
 actors:['learner','housemate','colleague'],facts:['method','practice-success','confirmation-request','delivery-received'],
 purposes:['learn','care','work'],commitments:['delivery','supply','other-job'],
 actions:['guided-practice','basic-practice','deliver','deliver-revised','paid-work','confirm','coordinate','send-plan','start-together','acknowledge','seek-alternative']
};
const DAY=1440;
const copy=value=>JSON.parse(JSON.stringify(value));
const option=(id,requiresFacts=[])=>({id,requiresFacts});
const programs={
 learning:{options:[option('guided-practice',['method']),option('basic-practice')],rules:[{id:'apply-instruction',when:{fact:{id:'method',value:true},purpose:{id:'learn',status:'active'}},actionId:'guided-practice'}],defaultActionId:'basic-practice'},
 household:{options:[option('deliver'),option('deliver-revised'),option('paid-work')],rules:[{id:'honor-revised-terms',when:{commitment:{id:'delivery',status:'accepted',revision:1},purpose:{id:'care',status:'active'}},actionId:'deliver-revised'},{id:'honor-known-responsibility',when:{commitment:{id:'delivery',status:'accepted'},purpose:{id:'care',status:'active'}},actionId:'deliver'}],defaultActionId:'paid-work'},
 collaboration:{options:[option('confirm'),option('coordinate')],rules:[{id:'confirm-after-observed-breach',when:{interaction:{actorId:'colleague',contextId:'supply',value:'breached'},purpose:{id:'work',status:'active'}},actionId:'confirm'}],defaultActionId:'coordinate'},
 'housemate-response':{options:[option('acknowledge'),option('seek-alternative')],rules:[{id:'respond-to-received-delivery',when:{fact:{id:'delivery-received',value:true}},actionId:'acknowledge'}],defaultActionId:'seek-alternative'},
 'colleague-response':{options:[option('send-plan'),option('start-together')],rules:[{id:'respond-to-request',when:{fact:{id:'confirmation-request',value:true}},actionId:'send-plan'}],defaultActionId:'start-together'}
};

export function runConnectedPerson(input={}) {
 const defaults={instruction:true,carePurpose:true,acceptResponsibility:true,interaction:true,householdChoice:null,hiddenObstacle:false,restoreBetween:true,stepMinutes:null,responsibilityChange:null,policy:'candidate',irrelevantObservation:false,irrelevantInteraction:false};
 for(const key of Object.keys(input))if(!Object.hasOwn(defaults,key))throw new Error(`Unknown sequence option ${key}`);
 const config={...defaults,...input};
 for(const key of ['instruction','carePurpose','acceptResponsibility','interaction','hiddenObstacle','restoreBetween','irrelevantObservation','irrelevantInteraction'])if(typeof config[key]!=='boolean')throw new Error(`Invalid ${key}`);
 if(config.stepMinutes!==null&&(!Number.isSafeInteger(config.stepMinutes)||config.stepMinutes<1))throw new Error('Invalid chronology step');
 if(![null,'deliver','paid-work'].includes(config.householdChoice)||![null,'revise','withdraw'].includes(config.responsibilityChange)||!['candidate','direct'].includes(config.policy))throw new Error('Invalid sequence configuration');
 const people=Object.fromEntries(catalog.actors.map(id=>[id,createSituatedPerson({human:createPerson({id,body:{fatigue:0.1,hunger:0.1},skills:{craft:0.2},observationBias:0}),now:0,purposes:[{id:'learn',status:'active'},{id:'care',status:'active'},{id:'work',status:'active'}]},catalog)]));
 const commitments={delivery:createCommitment({id:'delivery',debtorId:'learner',creditorId:'housemate',dueAt:7*DAY+60,terms:'Deliver one prepared item'},catalog),supply:createCommitment({id:'supply',debtorId:'colleague',creditorId:'learner',dueAt:6*DAY,terms:'Supply shared materials'},catalog)};
 const world={produced:0,delivered:0,wages:0,confirmations:0,plans:0,coordinated:0,alternativeRequests:0,deliveryPlace:null};
 const decisions=[],events=[];
 let clock=createClock();
 function observe(actor,id,source,kind,subject,value,channel='communication',extra={}) {
  people[actor]=observePerson(people[actor],{id,at:clock.now,source,channel,kind,subject,value,...extra},catalog);
 }
 function notifyCommitment(id,eventId) {
  const c=commitments[id];
  for(const actor of [c.debtorId,c.creditorId])observe(actor,`${eventId}-${actor}`,actor===c.debtorId?c.creditorId:c.debtorId,'commitment',id,c.status,'communication',{details:{revision:c.revision,debtorId:c.debtorId,creditorId:c.creditorId,dueAt:c.dueAt,terms:c.terms}});
 }
 function transition(id,type,actorId,extra={}) {
  commitments[id]=transitionCommitment(commitments[id],{type,actorId,at:clock.now,...extra},catalog);
 }
 function choose(actor,stage,external=null) {
  const decision=config.policy==='candidate'?decide(people[actor],programs[stage],catalog,external):directDecision(people[actor],stage,external);
  decisions.push({stage,actor,at:clock.now,bodyBefore:copy(people[actor].human.body),decision});
  return decision.actionId;
 }
 function begin(actor,action,duration,skill=null) {
  people[actor]={...people[actor],human:beginAttempt(people[actor].human,{actionId:action,targetId:null,durationMinutes:duration,effort:0,exertive:false,activity:'active',skill})};
 }
 function finish(actor,success=true) {
  let human=people[actor].human;
  human=advanceAttempt(human,human.pending.action.durationMinutes);
  human=finishAttempt(human,{attemptId:human.pending.id,status:success?'completed':'failed',mealConsumed:false});
  people[actor]={...people[actor],human};
 }
 const handlers={
  instruction(){
   if(config.instruction)observe('learner','instruction-method','colleague','fact','method',true,'instruction');
   if(config.irrelevantObservation)observe('learner','irrelevant-receipt','housemate','fact','delivery-received',false);
  },
  learning(){begin('learner',choose('learner','learning'),10,'craft');},
  'learning-result'(){
   const action=people.learner.human.pending.action.actionId;
   const success=!config.hiddenObstacle;
   finish('learner',success);
   world.produced=success?(action==='guided-practice'?2:1):0;
   observe('learner','practice-result','learner','fact','practice-success',success,'experience');
   people.learner=setPurpose(people.learner,{id:'learn',status:'completed'},catalog);
  },
  agreements(){
   if(config.acceptResponsibility)transition('delivery','accept','learner');
   notifyCommitment('delivery','delivery-agreement');
   transition('supply','accept','colleague');notifyCommitment('supply','supply-agreement');
  },
  'agreement-change'(){
   if(config.responsibilityChange==='revise'){
    transition('delivery','revise','housemate',{dueAt:7*DAY+60,terms:'Deliver one item at the revised meeting place'});notifyCommitment('delivery','delivery-revision');
    transition('delivery','accept','learner');notifyCommitment('delivery','delivery-reacceptance');
   }else if(config.responsibilityChange==='withdraw'){
    transition('delivery','withdraw','housemate');notifyCommitment('delivery','delivery-withdrawal');
   }
  },
  'supply-deadline'(){
   transition('supply','breach',null);
   // The canonical outcome does not itself inform the learner.
   if(config.interaction){
    const c=commitments.supply;
    observe('learner','supply-breach-view','colleague','commitment','supply','breached','communication',{details:{revision:c.revision,debtorId:c.debtorId,creditorId:c.creditorId,dueAt:c.dueAt,terms:c.terms}});
    observe('learner','observed-supply-breach','colleague','interaction','colleague','breached','experience',{contextId:'supply'});
   }
   if(config.irrelevantInteraction)observe('learner','unrelated-colleague-success','housemate','interaction','colleague','fulfilled','communication',{contextId:'other-job'});
  },
  household(){
   if(!config.carePurpose)people.learner=setPurpose(people.learner,{id:'care',status:'withdrawn'},catalog);
   begin('learner',choose('learner','household',config.householdChoice),15);
  },
  'household-result'(){
   const action=people.learner.human.pending.action.actionId;
   const deliveryAttempt=['deliver','deliver-revised'].includes(action);
   const delivered=deliveryAttempt&&world.produced>0;
   finish('learner',!deliveryAttempt||delivered);
   if(delivered){
    world.delivered=1;world.deliveryPlace=action==='deliver-revised'?'revised meeting place':'original meeting place';
    if(commitments.delivery.status==='accepted')transition('delivery','fulfill',null,{outcomeId:'delivery-receipt',completed:true});
    notifyCommitment('delivery','delivery-result');
   }else if(action==='paid-work')world.wages=1;
   observe('housemate','delivery-observation','learner','fact','delivery-received',delivered,'experience');
  },
  'delivery-deadline'(){
   if(commitments.delivery.status==='accepted'){
    transition('delivery','breach',null);notifyCommitment('delivery','delivery-breach');
   }
  },
  'housemate-response'(){if(choose('housemate','housemate-response')==='seek-alternative')world.alternativeRequests++;},
  collaboration(){begin('learner',choose('learner','collaboration'),5);},
  'collaboration-result'(){
   const action=people.learner.human.pending.action.actionId;finish('learner');
   if(action==='confirm')world.confirmations++;else world.coordinated++;
   observe('colleague','coordination-message','learner','fact','confirmation-request',action==='confirm');
  },
  'colleague-response'(){if(choose('colleague','colleague-response')==='send-plan')world.plans++;},
  end(){}
 };
 // Communication is instantaneous at these authored boundaries; physical attempts occupy explicit intervals.
 const timeline=[[1,'instruction'],[DAY,'learning'],[DAY+10,'learning-result'],[2*DAY,'agreements'],[4*DAY,'agreement-change'],[6*DAY+1,'supply-deadline'],[7*DAY,'household'],[7*DAY+15,'household-result'],[7*DAY+61,'delivery-deadline'],[7*DAY+62,'housemate-response'],[13*DAY,'collaboration'],[13*DAY+5,'collaboration-result'],[13*DAY+6,'colleague-response'],[14*DAY,'end']];
 for(const [at,type] of timeline)clock=scheduleEvent(clock,{at,type}).clock;
 while(clock.now<14*DAY){
  const target=config.stepMinutes===null?14*DAY:Math.min(14*DAY,clock.now+config.stepMinutes);
  const moved=advanceClock(clock,target);clock=moved.clock;
  for(const actor of catalog.actors)people[actor]=advancePerson(people[actor],clock.now,catalog);
  for(const event of moved.events){handlers[event.type]();events.push({at:clock.now,type:event.type});}
  if(config.restoreBetween){
   for(const actor of catalog.actors)people[actor]=restoreSituatedPerson(copy(exportSituatedPerson(people[actor],catalog)),catalog);
   clock=restoreClock(copy(exportClock(clock)));
  }
 }
 return {version:'connected-person-0.1.0',now:clock.now,people,commitments,world,decisions,events};
}

export function runComparisons(){
 const variations=[['connected',{}],['without-instruction',{instruction:false}],['without-acceptance',{acceptResponsibility:false}],['without-observed-interaction',{interaction:false}],['external-neglect',{householdChoice:'paid-work'}],['revised-responsibility',{responsibilityChange:'revise'}],['withdrawn-responsibility',{responsibilityChange:'withdraw'}],['hidden-obstacle',{hiddenObstacle:true}]];
 const cases=variations.map(([name,config])=>{
  const result=runConnectedPerson(config),direct=runConnectedPerson({...config,policy:'direct'});
  const actions=result.decisions.map(d=>d.decision.actionId);
  return {name,world:result.world,actions,trace:result.decisions,directBaselineMatches:JSON.stringify([result.world,actions])===JSON.stringify([direct.world,direct.decisions.map(d=>d.decision.actionId)])};
 });
 return {format:'connected-person-comparison',version:1,cases,claims:{empiricalValidation:false,continuousPhysiology:false,baselineSuperiority:false,demonstrated:['attributed knowledge affects attempted method','known responsibility affects action with override','delivered interaction evidence affects coordination','separate recipient response','person persistence across dated episodes']}};
}
