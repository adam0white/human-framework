/** Independently authored community-session scheduling consumer; installed exports only. */
import {createBeliefs,advanceBeliefs,receiveEvidence,getBeliefView,exportBeliefs,restoreBeliefs,plan} from 'deliberating-person';
import {createPerson} from 'deliberating-person/human';
import {createSituatedPerson,setPurpose} from 'deliberating-person/situated';
import {createSustainedPerson,advanceSustainedPerson,beginSustainedAttempt,advanceSustainedAttempt,finishSustainedAttempt,exportSustainedPerson,restoreSustainedPerson,createLearning} from 'deliberating-person/sustained';
import {createCommitment,transitionCommitment} from 'deliberating-person/commitments';

const catalog={actors:['organizer','community'],facts:[],purposes:['host-session','earn'],commitments:['session'],actions:['primary-room','fallback-room','paid-admin']};
const copy=value=>JSON.parse(JSON.stringify(value));
const roomAction=(id,durationMinutes,creditCost,preconditions=[])=>({id,durationMinutes,preconditions,expectedEffects:{conditions:[{conditionId:'ready',value:true}],resources:[{resourceId:'credits',delta:-creditCost}]}});
const actions=[roomAction('primary-room',10,1,[{kind:'belief',propositionId:'main-open',value:true}]),roomAction('fallback-room',20,2),{id:'paid-admin',durationMinutes:20,preconditions:[],expectedEffects:{conditions:[],resources:[{resourceId:'credits',delta:3}]}}];
const goals=[{id:'prepare-session',purposeId:'host-session',dueAt:35,requires:[{kind:'condition',conditionId:'ready',value:true}]},{id:'fund-next-session',purposeId:'earn',dueAt:60,requires:[{kind:'resource',resourceId:'credits',atLeast:3}]}];

function run(restore) {
  let person=createSustainedPerson({situated:createSituatedPerson({human:createPerson({id:'organizer',body:{fatigue:.1,hunger:.1},skills:{admin:.2}}),now:0,purposes:[{id:'host-session',status:'active'},{id:'earn',status:'active'}]},catalog),learning:createLearning({skills:['admin']})},catalog);
  let beliefs=createBeliefs({ownerId:'organizer',propositions:['main-open'],sources:['custodian','relay']});
  let obligation=createCommitment({id:'session',debtorId:'organizer',creditorId:'community',dueAt:35,terms:'Prepare a room for the community session'},catalog);
  obligation=transitionCommitment(obligation,{type:'accept',actorId:'organizer',at:0},catalog);
  const world={credits:2,ready:false,readyAt:null};
  function advance(to) {person=advanceSustainedPerson(person,{to,mode:'awake'},catalog);beliefs=advanceBeliefs(beliefs,to);}
  function report(receiptId,value,observedAt,sourceId='custodian') {beliefs=receiveEvidence(beliefs,{receiptId,propositionId:'main-open',sourceId,originId:'custodian',value,observedAt,receivedAt:person.situated.now,expiresAt:120,correctsReceiptId:null});}
  function input() {return {actorId:'organizer',now:person.situated.now,beliefView:getBeliefView(beliefs),purposes:person.situated.purposes,resources:[{id:'credits',quantity:world.credits}],conditions:[{id:'ready',value:world.ready}],goals,actions};}
  const options={maxDepth:3,maxNodes:128,horizonMinutes:60};
  report('open-initial',true,0);
  const before=JSON.stringify(world),initial=plan(input(),options);
  const forecastMutatedWorld=JSON.stringify(world)!==before;
  advance(5);report('closed-current',false,5);
  advance(10);report('open-delayed',true,1,'relay');
  const staleArrivalIgnored=getBeliefView(beliefs).beliefs[0].status==='resolved'&&getBeliefView(beliefs).beliefs[0].value===false;
  if(restore){person=restoreSustainedPerson(copy(exportSustainedPerson(person,catalog)),catalog);beliefs=restoreBeliefs(copy(exportBeliefs(beliefs)),'organizer');}
  const revised=plan(input(),options);
  const history=[];
  for(let count=0;count<3;count++) {
    const proposed=plan(input(),options);if(proposed.actionId===null)break;
    const action=actions.find(item=>item.id===proposed.actionId),startedAt=person.situated.now;
    person=beginSustainedAttempt(person,{actionId:action.id,durationMinutes:action.durationMinutes,activity:'active',effort:0,exertive:false,skill:null},catalog);
    person=advanceSustainedAttempt(person,action.durationMinutes,catalog);
    person=finishSustainedAttempt(person,{attemptId:person.situated.human.pending.id,status:'completed',mealConsumed:false},catalog);
    beliefs=advanceBeliefs(beliefs,person.situated.now);
    // Actual host accounting is separate from the proposed forecast.
    if(action.id==='paid-admin'){world.credits+=3;person={...person,situated:setPurpose(person.situated,{id:'earn',status:'completed'},catalog)};}
    else {
      const cost=action.id==='primary-room'?1:2;
      if(world.credits<cost)throw new Error('Unaffordable actual reservation');
      world.credits-=cost;world.ready=true;world.readyAt??=person.situated.now;
      if(obligation.status==='accepted')obligation=transitionCommitment(obligation,{type:'fulfill',actorId:null,at:person.situated.now,outcomeId:'room-reservation',completed:true},catalog);
      person={...person,situated:setPurpose(person.situated,{id:'host-session',status:'completed'},catalog)};
    }
    history.push({actionId:action.id,startedAt,finishedAt:person.situated.now});
  }
  return {initialAction:initial.actionId,replannedAction:revised.actionId,staleArrivalIgnored,forecastMutatedWorld,commitmentStatus:obligation.status,readyAt:world.readyAt,credits:world.credits,history,finalState:{person,beliefs,obligation,world}};
}
export function runConsumer() {
  const resumed=run(true),uninterrupted=run(false);
  const resumeEqual=JSON.stringify(resumed)===JSON.stringify(uninterrupted);
  if(!resumeEqual)throw new Error('Resumed cognition diverged');
  const {finalState,...result}=resumed;
  return {format:'deliberating-person-independent-consumer',...result,resumeEqual};
}
