/** A deterministic host for ordinary days. Parameters are authored engineering values, not calibrated human claims. */
import {createPerson} from '../../src/human/v0.1.1.js';
import {createSituatedPerson,observePerson,decide} from '../../src/person/index.js';
import {createCommitment,transitionCommitment} from '../../src/person/commitments.js';
import {
  createSustainedPerson,advanceSustainedPerson,beginSustainedAttempt,
  advanceSustainedAttempt,finishSustainedAttempt,exportSustainedPerson,
  restoreSustainedPerson,
} from '../../src/development/index.js';
import {createLearning,getLearningView,learn,retrieveLearning} from '../../src/development/learning.js';

const DAY=1440;
const END=14*DAY;
const copy=value=>structuredClone(value);

export const catalog={
  actors:['learner','housemate','colleague'],
  facts:['instruction-received','supply-available','delivery-received','colleague-ready'],
  purposes:['learn','work','care','recover'],
  commitments:['household','colleague-support'],
  actions:['meal','paid-work','instruction','practice','unrelated-study','service-prep','use-retained-method','consult-source','deliver','seek-supply','acknowledge-delivery','seek-alternative','rest','recovery-service','coordinate'],
};

function validateConfig(input) {
  const defaults={driverMinutes:null,restoreAt:null,learning:'candidate',condition:'candidate',shortage:false,service:'honor',policy:'candidate'};
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid sustained sequence options');
  for(const key of Object.keys(input))if(!Object.hasOwn(defaults,key))throw new Error(`Unknown sustained sequence option ${key}`);
  const config={...defaults,...input};
  if(config.driverMinutes!==null&&(!Number.isSafeInteger(config.driverMinutes)||config.driverMinutes<1))throw new Error('Invalid driver interval');
  if(config.restoreAt!==null&&(!Number.isSafeInteger(config.restoreAt)||config.restoreAt<=0||config.restoreAt>=END))throw new Error('Invalid restore time');
  if(!['candidate','equal-time-control','no-decay-notebook'].includes(config.learning))throw new Error('Invalid learning condition');
  if(!['candidate','short-sleep','instant-sleep-recovery'].includes(config.condition))throw new Error('Invalid daily condition');
  if(typeof config.shortage!=='boolean'||!['honor','neglect','withdrawn'].includes(config.service)||!['candidate','direct'].includes(config.policy))throw new Error('Invalid sustained sequence configuration');
  return config;
}

function conditionRules(kind) {
  // This rival idealizes any ordinary sleep interval as a full fatigue reset.
  if(kind==='instant-sleep-recovery')return {awakeFatiguePerMinute:.0005,awakeHungerPerMinute:.0005,sleepFatigueRecoveryPerMinute:1,sleepHungerPerMinute:.00025};
  return undefined;
}

function makePerson(id,condition) {
  const situated=createSituatedPerson({
    human:createPerson({id,body:{fatigue:.08,hunger:.08},skills:{craft:.25}}),now:0,
    purposes:[{id:'learn',status:'active'},{id:'work',status:'active'},{id:'care',status:'active'},{id:'recover',status:'active'}],
  },catalog);
  const setup={situated,learning:createLearning({now:0,skills:['craft']})};
  const rules=conditionRules(condition);
  if(rules)setup.condition={now:0,mode:'awake',awakeMinutes:0,sleepMinutes:0,rules,version:'0.1.0'};
  return createSustainedPerson(setup,catalog);
}

const detail=commitment=>({revision:commitment.revision,debtorId:commitment.debtorId,creditorId:commitment.creditorId,dueAt:commitment.dueAt,terms:commitment.terms});

export function runSustainedPerson(input={}) {
  const config=validateConfig(input);
  let people=Object.fromEntries(catalog.actors.map(id=>[id,makePerson(id,config.condition)]));
  let now=0,checkpointDone=false;
  const checkpoints=[],decisions=[],attempts=[],days=Array.from({length:14},(_,day)=>({day,opportunities:[]}));
  const world={food:126,deliverySupplies:config.shortage?0:1,completedWork:0,wages:0,deliveries:0,alternativeRequests:0,acknowledgements:0,recoveryServices:0,mealReceipts:[]};
  const metrics={learningMinutes:0,delayedAccessibility:0};
  let commitments={
    household:createCommitment({id:'household',debtorId:'learner',creditorId:'housemate',dueAt:8*DAY+850,terms:'Deliver the prepared household supply'},catalog),
    'colleague-support':createCommitment({id:'colleague-support',debtorId:'colleague',creditorId:'learner',dueAt:12*DAY,terms:'Confirm availability for recovery work'},catalog),
  };
  const serviceProgram={options:[{id:'deliver',requiresFacts:['supply-available']},{id:'seek-supply',requiresFacts:[]},{id:'paid-work',requiresFacts:[]}],rules:[{id:'honor-known-duty',when:{commitment:{id:'household',status:'accepted'}},actionId:'deliver'}],defaultActionId:'seek-supply'};
  const recipientProgram={options:[{id:'acknowledge-delivery',requiresFacts:['delivery-received']},{id:'seek-alternative',requiresFacts:[]}],rules:[{id:'acknowledge-observed-delivery',when:{fact:{id:'delivery-received',value:true}},actionId:'acknowledge-delivery'}],defaultActionId:'seek-alternative'};

  function modeAt(actor,at) {
    const day=Math.floor(at/DAY),within=at%DAY;
    if(config.condition==='short-sleep'&&actor==='learner'&&day===6)return within>=1380?'sleep':'awake';
    return within>=960?'sleep':'awake';
  }
  function maybeRestore(activeActor=null) {
    if(checkpointDone||config.restoreAt===null||now!==config.restoreAt)return;
    const pendingActionId=activeActor?people[activeActor].situated.human.pending?.action.actionId??null:null;
    people=Object.fromEntries(Object.entries(people).map(([id,state])=>[id,restoreSustainedPerson(JSON.parse(JSON.stringify(exportSustainedPerson(state,catalog))),catalog)]));
    checkpoints.push({at:now,pendingActionId});checkpointDone=true;
  }
  function nextStep(target) {
    let step=config.driverMinutes===null?target:Math.min(target,now+config.driverMinutes);
    if(!checkpointDone&&config.restoreAt!==null&&config.restoreAt>now&&config.restoreAt<step)step=config.restoreAt;
    return step;
  }
  function advanceAll(target,activeActor=null) {
    while(now<target) {
      const step=nextStep(target);
      for(const actor of catalog.actors) {
        people[actor]=actor===activeActor?
          advanceSustainedAttempt(people[actor],step-now,catalog):
          advanceSustainedPerson(people[actor],{to:step,mode:modeAt(actor,now)},catalog);
      }
      now=step;maybeRestore(activeActor);
    }
  }
  function observe(actor,event) {
    people[actor]={...people[actor],situated:observePerson(people[actor].situated,{at:now,...event},catalog)};
  }
  function notifyCommitment(id,receipt) {
    const value=commitments[id];
    for(const actor of [value.debtorId,value.creditorId])observe(actor,{id:`${receipt}-${actor}`,source:actor===value.debtorId?value.creditorId:value.debtorId,channel:'communication',kind:'commitment',subject:id,value:value.status,details:detail(value)});
  }
  function recordDecision(id,actor,actionId,reason,evidence=[],capacityAllowed=true) {
    const entry={id,actor,at:now,actionId,reason,evidence,capacityAllowed};decisions.push(entry);return entry;
  }
  function chooseSituated(id,actor,program,externalActionId=null) {
    const choice=decide(people[actor].situated,program,catalog,externalActionId);
    return recordDecision(id,actor,choice.actionId,choice.provider,choice.evidence,true);
  }
  function perform({id,actor='learner',actionId,duration,activity='active',effort=0,skill=null,status='completed',mealConsumed=false,interruptAt=null,reason='scheduled',evidence=[]}) {
    const spec={actionId,targetId:null,durationMinutes:duration,effort,exertive:effort!==0,activity,skill};
    people[actor]=beginSustainedAttempt(people[actor],spec,catalog);
    const pending=people[actor].situated.human.pending;
    const allowed=pending.capacity.allowed;
    const choice=recordDecision(id,actor,actionId,reason,evidence,allowed);
    choice.bodyBefore=copy(pending.bodyBefore);choice.capacity=copy(pending.capacity);
    if(!allowed) {
      people[actor]=finishSustainedAttempt(people[actor],{attemptId:pending.id,status:'blocked',mealConsumed:false},catalog);
      advanceAll(now+duration);
      attempts.push({id,actor,actionId,startedAt:now-duration,completedAt:now,status:'blocked',capacityAllowed:false});
      return {allowed:false,startedAt:now-duration,completedAt:now,status:'blocked'};
    }
    const startedAt=now,elapsed=interruptAt??duration;
    advanceAll(now+elapsed,actor);
    const attemptId=people[actor].situated.human.pending.id;
    const actualStatus=interruptAt===null?status:'interrupted';
    people[actor]=finishSustainedAttempt(people[actor],{attemptId,status:actualStatus,mealConsumed:interruptAt===null&&mealConsumed},catalog);
    if(interruptAt!==null)advanceAll(startedAt+duration);
    const result={id,actor,actionId,startedAt,completedAt:startedAt+elapsed,status:actualStatus,capacityAllowed:true};
    attempts.push(result);return {allowed:true,...result};
  }
  function retain(result,receiptId,itemId,kind,sourceFactValue) {
    if(result.status!=='completed')return;
    const event={receiptId,itemId,skillId:'craft',kind,attributedTo:kind==='instruction'?'colleague':'learner',startedAt:result.startedAt,completedAt:result.completedAt,elapsedMinutes:result.completedAt-result.startedAt,completed:true};
    if(kind==='instruction')event.sourceFactValue=sourceFactValue;
    people.learner={...people.learner,learning:learn(people.learner.learning,event)};
  }
  function learningAccess() {
    const item=getLearningView(people.learner.learning).items.find(entry=>entry.id==='service-method');
    if(config.policy==='direct'||config.learning==='no-decay-notebook'){
      const instructed=people.learner.situated.observations.findLast(record=>record.kind==='fact'&&record.subject==='instruction-received')?.value===true;
      return {accessible:instructed,sourceFactValue:instructed?item?.sourceFactValue??null:null,accessibility:instructed?1:0};
    }
    return retrieveLearning(people.learner.learning,'service-method',{minimumAccessibility:.5});
  }
  function addEvent(at,id,handler) {events.push({at,id,handler});}
  const events=[];
  for(let day=0;day<14;day++) {
    for(const [mealIndex,base] of [30,300,850].entries())for(const [actorIndex,actor] of catalog.actors.entries())addEvent(day*DAY+base+actorIndex*20,`meal-${day}-${mealIndex}-${actor}`,()=>{
      days[day].opportunities.push('meal');const consumed=world.food>0;
      const id=`meal-${day}-${mealIndex}-${actor}`;
      const result=perform({id,actor,actionId:'meal',duration:20,activity:'meal',mealConsumed:consumed,reason:consumed?'available food':'no food receipt'});
      if(result.status==='completed'&&consumed){world.food--;world.mealReceipts.push({id:`meal-receipt-${day}-${mealIndex}-${actor}`,actor,at:result.completedAt,units:1});}
    });
    if([0,1,2,3,4,7,8,9,10,11].includes(day))addEvent(day*DAY+90,`work-${day}`,()=>{
      days[day].opportunities.push('paid-work');
      const result=perform({id:`work-${day}`,actionId:'paid-work',duration:180,effort:.08,reason:'scheduled paid work'});
      if(result.status==='completed'){world.completedWork++;world.wages++;}
    });
    if(day!==6)addEvent(day*DAY+700,`rest-${day}`,()=>{
      days[day].opportunities.push('recovery');perform({id:`rest-${day}`,actionId:'rest',duration:20,activity:'rest',reason:'ordinary recovery'});
    });
  }
  addEvent(400,'instruction',()=>{
    days[0].opportunities.push('learning');
    const result=perform({id:'instruction',actionId:'instruction',duration:30,reason:'attributed instruction'});
    observe('learner',{id:'instruction-observation',source:'colleague',channel:'instruction',kind:'fact',subject:'instruction-received',value:true});
    retain(result,'instruction-receipt','service-method','instruction',true);metrics.learningMinutes+=30;
  });
  for(const day of [1,3,6])addEvent(day*DAY+400,`practice-${day}`,()=>{
    days[day].opportunities.push('learning');
    const control=config.learning==='equal-time-control',actionId=control?'unrelated-study':'practice';
    const result=perform({id:`practice-${day}`,actionId,duration:30,skill:control?null:'craft',reason:control?'equal time without method reinforcement':'spaced method practice'});
    if(!control)retain(result,`practice-receipt-${day}`,'service-method','practice');metrics.learningMinutes+=30;
  });
  addEvent(2*DAY+700,'accept-household-duty',()=>{
    days[2].opportunities.push('service');
    commitments.household=transitionCommitment(commitments.household,{type:'accept',actorId:'learner',at:now},catalog);notifyCommitment('household','household-accepted');
  });
  addEvent(3*DAY+650,'interrupted-preparation',()=>{
    days[3].opportunities.push('service');perform({id:'interrupted-preparation',actionId:'service-prep',duration:45,effort:.04,interruptAt:20,reason:'housemate interruption'});
  });
  addEvent(6*DAY+700,'recovery-rest',()=>{
    days[6].opportunities.push('recovery');perform({id:'recovery-rest',actionId:'rest',duration:60,activity:'rest',reason:'chosen recovery'});
  });
  addEvent(7*DAY+400,'shortage-world-event',()=>{world.deliverySupplies=config.shortage?0:1;});
  addEvent(7*DAY+450,'pre-shortage-choice',()=>recordDecision('pre-shortage-choice','learner','deliver','accepted household duty',['household-accepted-learner']));
  addEvent(7*DAY+500,'shortage-message',()=>observe('learner',{id:'supply-message',source:'housemate',channel:'communication',kind:'fact',subject:'supply-available',value:world.deliverySupplies>0}));
  addEvent(7*DAY+540,'shortage-response',()=>{
    days[7].opportunities.push('service');
    const hasSupply=people.learner.situated.observations.findLast(record=>record.subject==='supply-available')?.value===true;
    const actionId=hasSupply?'deliver':'seek-supply';
    perform({id:'shortage-response',actionId,duration:180,effort:.15,reason:'communicated supply state',evidence:['supply-message']});
  });
  addEvent(8*DAY+600,'household-delivery',()=>{
    days[8].opportunities.push('service');
    if(config.service==='withdrawn'){
      commitments.household=transitionCommitment(commitments.household,{type:'withdraw',actorId:'housemate',at:now},catalog);notifyCommitment('household','household-withdrawn');return;
    }
    const supplyKnown=people.learner.situated.observations.findLast(record=>record.subject==='supply-available')?.value===true;
    const choice=config.policy==='direct'?
      recordDecision('household-delivery','learner',config.service==='neglect'?'paid-work':people.learner.situated.observations.findLast(record=>record.kind==='commitment'&&record.subject==='household')?.value==='accepted'&&supplyKnown?'deliver':'seek-supply','direct rule',supplyKnown?['supply-message']:[]):
      chooseSituated('household-delivery','learner',serviceProgram,config.service==='neglect'?'paid-work':null);
    if(choice.actionId!=='deliver'){observe('housemate',{id:'delivery-not-received',source:'learner',channel:'communication',kind:'fact',subject:'delivery-received',value:false});return;}
    const result=perform({id:'household-delivery-attempt',actionId:'deliver',duration:120,reason:'situated duty choice',evidence:choice.evidence});
    if(result.status==='completed'){world.deliverySupplies--;world.deliveries++;commitments.household=transitionCommitment(commitments.household,{type:'fulfill',actorId:null,at:now,outcomeId:'household-delivery-receipt',completed:true},catalog);notifyCommitment('household','household-fulfilled');observe('housemate',{id:'delivery-received',source:'learner',channel:'experience',kind:'fact',subject:'delivery-received',value:true});}
  });
  addEvent(8*DAY+730,'housemate-response',()=>{
    const received=people.housemate.situated.observations.findLast(record=>record.subject==='delivery-received')?.value===true;
    const choice=config.policy==='direct'?recordDecision('housemate-response','housemate',received?'acknowledge-delivery':'seek-alternative','direct rule',received?['delivery-received']:[]):chooseSituated('housemate-response','housemate',recipientProgram);
    if(choice.actionId==='seek-alternative')world.alternativeRequests++;else world.acknowledgements++;
  });
  addEvent(8*DAY+851,'household-deadline',()=>{
    if(commitments.household.status==='accepted'){commitments.household=transitionCommitment(commitments.household,{type:'breach',actorId:null,at:now},catalog);notifyCommitment('household','household-breached');}
  });
  addEvent(10*DAY+500,'late-retrieval',()=>{
    days[10].opportunities.push('learning');const access=learningAccess();metrics.delayedAccessibility=access.accessibility;
    const actionId=access.accessible&&access.sourceFactValue===true?'use-retained-method':'consult-source';
    const result=perform({id:'late-retrieval',actionId,duration:20,reason:config.learning==='no-decay-notebook'?'direct no-decay notebook':'current retained access',evidence:actionId==='use-retained-method'?['instruction-receipt','practice-receipt-6']:[]});
    if(result.status==='completed')world.completedWork+=actionId==='use-retained-method'?2:1;
    if(actionId==='use-retained-method'&&config.learning!=='no-decay-notebook')retain(result,'retrieval-receipt','service-method','retrieval');
  });
  addEvent(12*DAY+500,'recovery-service',()=>{
    days[12].opportunities.push('recovery','service');
    const result=perform({id:'recovery-service',actionId:'recovery-service',duration:90,effort:.18,reason:'later recovery and continuing identity'});
    if(result.status==='completed')world.recoveryServices++;
  });

  for(let day=0;day<14;day++) {addEvent(day*DAY+960,`sleep-${day}`,()=>{});addEvent((day+1)*DAY,`wake-${day}`,()=>{});}
  if(config.condition==='short-sleep')addEvent(6*DAY+1380,'short-sleep-start',()=>{});
  events.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
  for(const event of events){if(event.at>END)continue;advanceAll(event.at);event.handler();}
  advanceAll(END);
  return copy({version:'sustained-person-host-0.1.0',now,people,commitments,world,metrics,days,decisions,attempts,checkpoints});
}
