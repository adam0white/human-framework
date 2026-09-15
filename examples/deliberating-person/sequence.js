/** Headless integration of sustained Human attempts, actor-bound beliefs, and bounded planning. */
import {createPerson} from '../../src/human/v0.1.1.js';
import {
  createSituatedPerson,advancePerson,setPurpose,observePerson,decide,exportSituatedPerson,restoreSituatedPerson,
} from '../../src/person/index.js';
import {createCommitment,transitionCommitment} from '../../src/person/commitments.js';
import {
  createSustainedPerson,advanceSustainedPerson,beginSustainedAttempt,advanceSustainedAttempt,finishSustainedAttempt,
  exportSustainedPerson,restoreSustainedPerson,createLearning,
} from '../../src/development/index.js';
import {
  createBeliefs,advanceBeliefs,receiveEvidence,getBeliefView,exportBeliefs,restoreBeliefs,
  PLANNER_VERSION,plan,greedyPlan,
} from '../../src/cognition/index.js';

const copy=value=>structuredClone(value);

export const catalog={
  actors:['learner','housemate'],facts:['cache-stocked','delivery-received'],purposes:['deliver-duty','paid-work'],
  commitments:['kit-delivery'],actions:['cache-pickup','alternative-supply','deliver-kit','paid-work','acknowledge-delivery','seek-alternative'],
};

const ACTIONS=[
  {id:'cache-pickup',durationMinutes:10,
    preconditions:[{kind:'belief',propositionId:'cache-stocked',value:true}],
    expectedEffects:{conditions:[],resources:[{resourceId:'kit',delta:1}]}},
  {id:'alternative-supply',durationMinutes:8,
    preconditions:[{kind:'condition',conditionId:'cache-empty-confirmed',value:true},{kind:'resource',resourceId:'money',atLeast:1}],
    expectedEffects:{conditions:[],resources:[{resourceId:'money',delta:-1},{resourceId:'kit',delta:1}]}},
  {id:'deliver-kit',durationMinutes:20,
    preconditions:[{kind:'resource',resourceId:'kit',atLeast:1}],
    expectedEffects:{conditions:[{conditionId:'kit-delivered',value:true}],resources:[{resourceId:'kit',delta:-1}]}},
  {id:'paid-work',durationMinutes:25,preconditions:[],
    expectedEffects:{conditions:[{conditionId:'paid-work-complete',value:true}],resources:[]}},
];

function validateConfig(input) {
  const defaults={policy:'bounded-search',actualCache:'empty',evidence:'reported',duty:'accepted',initialKit:0,money:1,dutyDueAt:40,restoreAfterActions:null};
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid deliberating-person options');
  for(const key of Object.keys(input))if(!Object.hasOwn(defaults,key))throw new Error(`Unknown deliberating-person option ${key}`);
  const config={...defaults,...input};
  if(!['bounded-search','greedy','direct'].includes(config.policy)||!['stocked','empty'].includes(config.actualCache)||
    !['reported','unknown','conflict','stale-after-correction'].includes(config.evidence)||!['accepted','withdrawn'].includes(config.duty))throw new Error('Invalid deliberating-person configuration');
  for(const [name,value] of [['initialKit',config.initialKit],['money',config.money],['dutyDueAt',config.dutyDueAt]])if(!Number.isSafeInteger(value)||value<0)throw new Error(`Invalid ${name}`);
  if(config.restoreAfterActions!==null&&(!Number.isSafeInteger(config.restoreAfterActions)||config.restoreAfterActions<1))throw new Error('Invalid restore action count');
  return config;
}

function makePerson() {
  const situated=createSituatedPerson({
    human:createPerson({id:'learner',body:{fatigue:.05,hunger:.05},skills:{craft:.25}}),now:0,
    purposes:[{id:'deliver-duty',status:'active'},{id:'paid-work',status:'active'}],
  },catalog);
  return createSustainedPerson({situated,learning:createLearning({now:0,skills:['craft']})},catalog);
}

function makeHousemate() {
  return createSituatedPerson({
    human:createPerson({id:'housemate',body:{fatigue:.05,hunger:.05},skills:{craft:.25}}),now:0,purposes:[],
  },catalog);
}

function seedBeliefs(kind) {
  let beliefs=createBeliefs({ownerId:'learner',now:0,propositions:['cache-stocked'],sources:['housemate','supplier','learner'],maxReceipts:32});
  const add=receipt=>{beliefs=receiveEvidence(beliefs,receipt);};
  if(kind!=='unknown')add({receiptId:'housemate-cache-report',propositionId:'cache-stocked',sourceId:'housemate',originId:'housemate',value:true,observedAt:0,receivedAt:0,expiresAt:80,correctsReceiptId:null});
  if(kind==='conflict')add({receiptId:'supplier-cache-report',propositionId:'cache-stocked',sourceId:'supplier',originId:'supplier',value:false,observedAt:0,receivedAt:0,expiresAt:80,correctsReceiptId:null});
  if(kind==='stale-after-correction') {
    add({receiptId:'housemate-correction',propositionId:'cache-stocked',sourceId:'housemate',originId:'housemate',value:false,observedAt:0,receivedAt:0,expiresAt:80,correctsReceiptId:'housemate-cache-report'});
    add({receiptId:'forwarded-stale-report',propositionId:'cache-stocked',sourceId:'supplier',originId:'housemate',value:true,observedAt:0,receivedAt:0,expiresAt:80,correctsReceiptId:null});
  }
  return beliefs;
}

function predicateSatisfied(predicate,input) {
  if(predicate.kind==='belief') {
    const belief=input.beliefView.beliefs.find(entry=>entry.propositionId===predicate.propositionId);
    return belief?.status==='resolved'&&belief.value===predicate.value;
  }
  if(predicate.kind==='condition')return input.conditions.find(entry=>entry.id===predicate.conditionId)?.value===predicate.value;
  return (input.resources.find(entry=>entry.id===predicate.resourceId)?.quantity??0)>=predicate.atLeast;
}

function directPlan(input) {
  const active=new Set(input.purposes.filter(entry=>entry.status==='active').map(entry=>entry.id));
  const eligibleGoalIds=input.goals.filter(goal=>active.has(goal.purposeId)).map(goal=>goal.id);
  const inactiveGoals=input.goals.filter(goal=>!active.has(goal.purposeId)).map(goal=>({goalId:goal.id,purposeId:goal.purposeId,status:input.purposes.find(entry=>entry.id===goal.purposeId)?.status??'missing'}));
  const pickup=input.actions.find(action=>action.id==='cache-pickup');
  const alternative=input.actions.find(action=>action.id==='alternative-supply');
  const delivery=input.actions.find(action=>action.id==='deliver-kit');
  const work=input.actions.find(action=>action.id==='paid-work');
  let chosen=null;
  if(active.has('deliver-duty')&&input.now+delivery.durationMinutes<=input.goals[0].dueAt&&delivery.preconditions.every(item=>predicateSatisfied(item,input)))chosen=delivery;
  else if(active.has('deliver-duty')&&input.now+pickup.durationMinutes+delivery.durationMinutes<=input.goals[0].dueAt&&pickup.preconditions.every(item=>predicateSatisfied(item,input)))chosen=pickup;
  else if(active.has('deliver-duty')&&input.now+alternative.durationMinutes+delivery.durationMinutes<=input.goals[0].dueAt&&alternative.preconditions.every(item=>predicateSatisfied(item,input)))chosen=alternative;
  else if(active.has('paid-work')&&input.now+work.durationMinutes<=input.goals[1].dueAt)chosen=work;
  const completedGoalId=chosen?.id==='deliver-kit'?'deliver-duty':chosen?.id==='paid-work'?'paid-work':null;
  const steps=chosen?[{actionId:chosen.id,startAt:input.now,finishAt:input.now+chosen.durationMinutes,preconditions:chosen.preconditions.map(item=>({...item,status:'satisfied'})),expectedEffects:copy(chosen.expectedEffects),completedGoalIds:completedGoalId?[completedGoalId]:[]}]:[];
  const forecastConditions=copy(input.conditions),forecastResources=copy(input.resources);
  if(chosen) {
    for(const effect of chosen.expectedEffects.conditions)forecastConditions.find(entry=>entry.id===effect.conditionId).value=effect.value;
    for(const effect of chosen.expectedEffects.resources)forecastResources.find(entry=>entry.id===effect.resourceId).quantity+=effect.delta;
  }
  const finishAt=steps.at(-1)?.finishAt??input.now;
  return {version:PLANNER_VERSION,provider:'direct',actionId:chosen?.id??null,steps,forecast:{at:finishAt,conditions:forecastConditions,resources:forecastResources,
    achievedGoals:completedGoalId?[{goalId:completedGoalId,at:finishAt}]:[],unachievedGoalIds:eligibleGoalIds.filter(id=>id!==completedGoalId)},
    trace:{steps,rootRejections:[]},eligibleGoalIds,inactiveGoals,search:{maxDepth:1,maxNodes:1,horizonMinutes:80,nodesVisited:1,nodeLimitReached:false,depthPruned:false,horizonPruned:false,frontierComplete:true}};
}

export function runDeliberatingPerson(input={}) {
  const config=validateConfig(input);
  let person=makePerson(),housemate=makeHousemate(),beliefs=seedBeliefs(config.evidence),now=0;
  let commitment=createCommitment({id:'kit-delivery',debtorId:'learner',creditorId:'housemate',dueAt:config.dutyDueAt,terms:'Deliver one prepared kit'},catalog);
  commitment=transitionCommitment(commitment,{type:'accept',actorId:'learner',at:0},catalog);
  if(config.duty==='withdrawn') {
    commitment=transitionCommitment(commitment,{type:'withdraw',actorId:'housemate',at:0},catalog);
    person={...person,situated:setPurpose(person.situated,{id:'deliver-duty',status:'withdrawn'},catalog)};
  }
  const initialView=getBeliefView(beliefs).beliefs[0];
  let conditions={
    'cache-empty-confirmed':initialView.status==='resolved'&&initialView.value===false,
    'kit-delivered':false,'paid-work-complete':false,
  };
  const world={cacheUnits:config.actualCache==='stocked'?1:0,kit:config.initialKit,money:config.money,wages:0,deliveries:0,alternativePurchases:0,recipientResponses:0};
  const attempts=[],deliberations=[],recipientDecisions=[],checkpoints=[];
  let restored=false;

  function plannerInput() {
    return {actorId:'learner',now,beliefView:getBeliefView(beliefs),purposes:copy(person.situated.purposes),
      resources:[{id:'kit',quantity:world.kit},{id:'money',quantity:world.money}],
      conditions:Object.entries(conditions).map(([id,value])=>({id,value})),
      goals:[
        {id:'deliver-duty',purposeId:'deliver-duty',dueAt:config.dutyDueAt,requires:[{kind:'condition',conditionId:'kit-delivered',value:true}]},
        {id:'paid-work',purposeId:'paid-work',dueAt:80,requires:[{kind:'condition',conditionId:'paid-work-complete',value:true}]},
      ],actions:copy(ACTIONS)};
  }
  function choose(state) {
    if(config.policy==='greedy')return greedyPlan(state,{maxDepth:6,maxNodes:256,horizonMinutes:80});
    if(config.policy==='direct')return directPlan(state);
    return plan(state,{maxDepth:6,maxNodes:256,horizonMinutes:80});
  }
  function attempt(actionId) {
    const action=ACTIONS.find(entry=>entry.id===actionId),startedAt=now;
    person=beginSustainedAttempt(person,{actionId,targetId:null,durationMinutes:action.durationMinutes,effort:.02,exertive:true,activity:'active',skill:null},catalog);
    person=advanceSustainedAttempt(person,action.durationMinutes,catalog);now+=action.durationMinutes;
    beliefs=advanceBeliefs(beliefs,now);
    let succeeded=true;
    if(actionId==='cache-pickup')succeeded=world.cacheUnits>0;
    else if(actionId==='alternative-supply')succeeded=world.money>0&&conditions['cache-empty-confirmed'];
    else if(actionId==='deliver-kit')succeeded=world.kit>0;
    person=finishSustainedAttempt(person,{attemptId:person.situated.human.pending.id,status:succeeded?'completed':'failed',mealConsumed:false},catalog);
    if(actionId==='cache-pickup') {
      if(succeeded){world.cacheUnits--;world.kit++;}else conditions['cache-empty-confirmed']=true;
      beliefs=receiveEvidence(beliefs,{receiptId:`cache-attempt-${attempts.length+1}`,propositionId:'cache-stocked',sourceId:'learner',originId:'learner',value:succeeded,observedAt:now,receivedAt:now,expiresAt:80,correctsReceiptId:null});
    } else if(succeeded&&actionId==='alternative-supply') {world.money--;world.kit++;world.alternativePurchases++;}
    else if(succeeded&&actionId==='deliver-kit') {
      world.kit--;world.deliveries++;conditions['kit-delivered']=true;
      commitment=transitionCommitment(commitment,{type:'fulfill',actorId:null,at:now,outcomeId:'kit-delivery-receipt',completed:true},catalog);
      person={...person,situated:setPurpose(person.situated,{id:'deliver-duty',status:'completed'},catalog)};
      housemate=advancePerson(housemate,now,catalog);
      housemate=observePerson(housemate,{id:'kit-delivery-observed',at:now,source:'learner',channel:'experience',kind:'fact',subject:'delivery-received',value:true},catalog);
      const response=decide(housemate,{options:[{id:'acknowledge-delivery',requiresFacts:['delivery-received']},{id:'seek-alternative',requiresFacts:[]}],
        rules:[{id:'acknowledge-received-kit',when:{fact:{id:'delivery-received',value:true}},actionId:'acknowledge-delivery'}],defaultActionId:'seek-alternative'},catalog);
      recipientDecisions.push({at:now,...response});world.recipientResponses++;
    } else if(succeeded&&actionId==='paid-work') {
      world.wages++;conditions['paid-work-complete']=true;
      person={...person,situated:setPurpose(person.situated,{id:'paid-work',status:'completed'},catalog)};
    }
    if(commitment.status==='accepted'&&now>commitment.dueAt)commitment=transitionCommitment(commitment,{type:'breach',actorId:null,at:now},catalog);
    const record={actionId,status:succeeded?'completed':'failed',startedAt,completedAt:now,worldAfter:copy(world),commitmentAfter:commitment.status};
    attempts.push(record);
  }
  function restoreCheckpoint() {
    const wire=JSON.parse(JSON.stringify({person:exportSustainedPerson(person,catalog),housemate:exportSituatedPerson(housemate,catalog),beliefs:exportBeliefs(beliefs),commitment,world,conditions,now,attempts,deliberations,recipientDecisions}));
    person=restoreSustainedPerson(wire.person,catalog);beliefs=restoreBeliefs(wire.beliefs,'learner');
    housemate=restoreSituatedPerson(wire.housemate,catalog);commitment=wire.commitment;Object.assign(world,wire.world);conditions=wire.conditions;now=wire.now;
    attempts.splice(0,attempts.length,...wire.attempts);deliberations.splice(0,deliberations.length,...wire.deliberations);
    recipientDecisions.splice(0,recipientDecisions.length,...wire.recipientDecisions);
    checkpoints.push({at:now,afterActionId:attempts.at(-1).actionId});restored=true;
  }

  for(let index=0;index<8;index++) {
    const state=plannerInput(),chosen=choose(state);
    deliberations.push({at:now,beliefs:state.beliefView,worldBefore:{kit:world.kit,money:world.money},plan:copy(chosen)});
    if(chosen.actionId===null) {
      if(commitment.status==='accepted') {
        const breachAt=Math.max(now,commitment.dueAt+1);
        person=advanceSustainedPerson(person,{to:breachAt,mode:'awake'},catalog);
        housemate=advancePerson(housemate,breachAt,catalog);beliefs=advanceBeliefs(beliefs,breachAt);now=breachAt;
        commitment=transitionCommitment(commitment,{type:'breach',actorId:null,at:now},catalog);
      }
      break;
    }
    attempt(chosen.actionId);
    if(!restored&&config.restoreAfterActions===attempts.length)restoreCheckpoint();
  }
  return copy({version:'deliberating-person-host-0.1.0',now,person,housemate,beliefs:getBeliefView(beliefs),commitment,
    purposes:person.situated.purposes,world,conditions,deliberations,attempts,recipientDecisions,checkpoints});
}
