import {createPerson,beginAttempt,advanceAttempt,finishAttempt} from '../human/v0.1.1.js';
import {createSituatedPerson,advancePerson,setPurpose,observePerson,decide,getSituatedView} from '../person/index.js';
import {createCommitment,transitionCommitment} from '../person/commitments.js';

const DAY=1440;
const copy=value=>structuredClone(value);
const factors=['instruction','accepted','observedBreach'];
const catalog={
  actors:['learner','housemate','colleague'],
  facts:['method','practice-success','delivery-received','confirmation-request','coordination-request'],
  purposes:['learn','care','work'],commitments:['delivery','supply'],
  actions:['guided-practice','basic-practice','deliver','paid-work','confirm','coordinate','acknowledge','seek-alternative','send-plan','start-together']
};
const option=(id,requiresFacts=[])=>({id,requiresFacts});
const programs={
  learning:{options:[option('guided-practice',['method']),option('basic-practice')],rules:[{id:'apply-instruction',when:{fact:{id:'method',value:true},purpose:{id:'learn',status:'active'}},actionId:'guided-practice'}],defaultActionId:'basic-practice'},
  household:{options:[option('deliver'),option('paid-work')],rules:[{id:'honor-known-responsibility',when:{commitment:{id:'delivery',status:'accepted'},purpose:{id:'care',status:'active'}},actionId:'deliver'}],defaultActionId:'paid-work'},
  collaboration:{options:[option('confirm'),option('coordinate')],rules:[{id:'confirm-after-observed-breach',when:{interaction:{actorId:'colleague',contextId:'supply',value:'breached'},purpose:{id:'work',status:'active'}},actionId:'confirm'}],defaultActionId:'coordinate'},
  housemate:{options:[option('acknowledge'),option('seek-alternative')],rules:[{id:'respond-to-delivery',when:{fact:{id:'delivery-received',value:true}},actionId:'acknowledge'}],defaultActionId:'seek-alternative'},
  colleague:{options:[option('send-plan',['confirmation-request']),option('start-together',['coordination-request'])],rules:[{id:'respond-to-confirmation-request',when:{fact:{id:'confirmation-request',value:true}},actionId:'send-plan'},{id:'respond-to-coordination-request',when:{fact:{id:'coordination-request',value:true}},actionId:'start-together'}],defaultActionId:'start-together'}
};
const stageNames=['learning','household','collaboration'];

function person(id,now=DAY) {
  return createSituatedPerson({
    human:createPerson({id,body:{fatigue:0.1,hunger:0.1},skills:{craft:0.2},observationBias:0}),
    now,purposes:[{id:'learn',status:'active'},{id:'care',status:'active'},{id:'work',status:'active'}]
  },catalog);
}

function move(session,at) {
  for(const id of catalog.actors)session.people[id]=advancePerson(session.people[id],at,catalog);
  session.now=at;
}

function observe(session,actor,input) {
  session.people[actor]=observePerson(session.people[actor],{at:session.now,channel:'communication',...input},catalog);
}

function commitmentObservation(session,id,prefix) {
  const record=session.commitments[id];
  const details={revision:record.revision,debtorId:record.debtorId,creditorId:record.creditorId,dueAt:record.dueAt,terms:record.terms};
  for(const actor of [record.debtorId,record.creditorId])observe(session,actor,{id:`${prefix}-${actor}`,source:actor===record.debtorId?record.creditorId:record.debtorId,kind:'commitment',subject:id,value:record.status,details});
}

function transition(session,id,input) {
  session.commitments[id]=transitionCommitment(session.commitments[id],{...input,at:session.now},catalog);
}

function attempt(session,actionId,duration,skill=null) {
  let human=session.people.learner.human;
  const bodyBefore=copy(human.body),skillBefore=human.skills.craft;
  human=beginAttempt(human,{actionId,targetId:null,durationMinutes:duration,effort:0,exertive:false,activity:'active',skill});
  const attemptId=human.pending.id;
  human=advanceAttempt(human,duration);
  human=finishAttempt(human,{attemptId,status:'completed',mealConsumed:false});
  session.people.learner={...session.people.learner,human};
  move(session,session.now+duration);
  return {attemptId,durationMinutes:duration,status:'completed',bodyBefore,skillBefore};
}

function baseline(session) {
  return decide(session.people.learner,programs[stageNames[session.step]],catalog);
}

function latest(session,kind,subject,contextId=null) {
  return getSituatedView(session.people.learner,catalog).observations.findLast(record=>record.kind===kind&&record.subject===subject&&(kind!=='interaction'||record.contextId===contextId))??null;
}

function prepareHousehold(session) {
  move(session,2*DAY);
  if(session.setup.accepted)transition(session,'delivery',{type:'accept',actorId:'learner'});
  commitmentObservation(session,'delivery','delivery-agreement');
  transition(session,'supply',{type:'accept',actorId:'colleague'});
  commitmentObservation(session,'supply','supply-agreement');
  move(session,6*DAY+1);transition(session,'supply',{type:'breach',actorId:null});
  if(session.setup.observedBreach) {
    commitmentObservation(session,'supply','supply-breach');
    observe(session,'learner',{id:'observed-supply-breach',source:'colleague',channel:'experience',kind:'interaction',subject:'colleague',value:'breached',contextId:'supply'});
  }
  move(session,7*DAY);
}

function prepareCollaboration(session,delivered) {
  move(session,7*DAY+15);
  observe(session,'housemate',{id:'delivery-observation',source:'learner',channel:'experience',kind:'fact',subject:'delivery-received',value:delivered});
  if(delivered&&session.commitments.delivery.status==='accepted') {
    transition(session,'delivery',{type:'fulfill',actorId:null,outcomeId:'delivery-receipt',completed:true});
    commitmentObservation(session,'delivery','delivery-result');
  }
  move(session,7*DAY+16);
  if(session.commitments.delivery.status==='accepted') {
    transition(session,'delivery',{type:'breach',actorId:null});
    commitmentObservation(session,'delivery','delivery-breach');
  }
  move(session,7*DAY+17);
  const response=decide(session.people.housemate,programs.housemate,catalog).actionId;
  session.world.housemateResponse=response==='acknowledge'?'acknowledged':'requested-alternative';
  move(session,13*DAY);
}

function completeCollaboration(session,actionId) {
  move(session,13*DAY+5);
  const subject=actionId==='confirm'?'confirmation-request':'coordination-request';
  observe(session,'colleague',{id:`delivered-${subject}`,source:'learner',kind:'fact',subject,value:true});
  const response=decide(session.people.colleague,programs.colleague,catalog).actionId;
  session.world.colleagueResponse=response==='send-plan'?'sent-plan':'started-together';
  move(session,14*DAY);
}

export function createShowcase(input={}) {
  try {wire(input);} catch {throw new Error('Invalid showcase setup');}
  if(!input||typeof input!=='object'||Array.isArray(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw new Error('Invalid showcase setup');
  if(Reflect.ownKeys(input).some(key=>typeof key!=='string'||!factors.includes(key)))throw new Error('Unknown showcase option');
  const setup={instruction:true,accepted:true,observedBreach:true,...input};
  for(const factor of factors)if(typeof setup[factor]!=='boolean')throw new Error(`Invalid ${factor}`);
  const session={
    version:'0.1.0',step:0,now:DAY,setup:copy(setup),
    people:Object.fromEntries(catalog.actors.map(id=>[id,person(id)])),
    commitments:{
      delivery:createCommitment({id:'delivery',debtorId:'learner',creditorId:'housemate',dueAt:7*DAY+15,terms:'Deliver one prepared item to the household before you leave in 15 minutes'},catalog),
      supply:createCommitment({id:'supply',debtorId:'colleague',creditorId:'learner',dueAt:6*DAY,terms:'Supply the shared materials by the end of day 6'},catalog)
    },
    world:{produced:0,delivered:0,wages:0,confirmationRequests:0,coordinationRequests:0,housemateResponse:null,colleagueResponse:null},
    history:[],lastOutcome:null
  };
  if(setup.instruction)observe(session,'learner',{id:'instruction-method',at:1,source:'colleague',channel:'instruction',kind:'fact',subject:'method',value:true});
  return copy(session);
}

function applyChoice(source,actionId) {
  const session=copy(source);
  if(session.step===3)throw new Error('Showcase is completed');
  const visible=stageView(session).choices.map(choice=>choice.id);
  if(!visible.includes(actionId))throw new Error('Invalid action for current scene');
  const stage=stageNames[session.step],base=baseline(session);
  const decision=decide(session.people.learner,programs[stage],catalog,actionId);
  const duration=[10,15,5][session.step],attemptRecord=attempt(session,actionId,duration,session.step===0?'craft':null);
  let outcome,receipt=null;
  if(session.step===0) {
    session.world.produced=actionId==='guided-practice'?2:1;
    observe(session,'learner',{id:'practice-result',source:'learner',channel:'experience',kind:'fact',subject:'practice-success',value:true});
    session.people.learner=setPurpose(session.people.learner,{id:'learn',status:'completed'},catalog);
    outcome={title:'Practice completed',text:`You used ${actionId==='guided-practice'?'the guided method and prepared 2 items':'basic practice and prepared 1 item'} in 10 minutes.`};
    prepareHousehold(session);
  } else if(session.step===1) {
    const delivered=actionId==='deliver'&&session.world.produced>0;
    if(delivered)session.world.delivered=1;else session.world.wages=1;
    prepareCollaboration(session,delivered);
    if(delivered&&session.commitments.delivery.status==='fulfilled')receipt={actorId:null,outcomeId:'delivery-receipt',completed:true};
    outcome=delivered?{title:'Item delivered',text:receipt?'The housemate received 1 item. A fulfillment receipt records the kept promise.':'The housemate received 1 item.'}:{title:'Paid work completed',text:'You took 15 minutes of paid work. The item was not delivered, and the housemate requested an alternative.'};
  } else {
    if(actionId==='confirm')session.world.confirmationRequests++;else session.world.coordinationRequests++;
    completeCollaboration(session,actionId);
    outcome=actionId==='confirm'?{title:'Confirmation requested',text:'The colleague received your request and sent a plan.'}:{title:'Coordination started',text:'The colleague received your request and started the work with you.'};
  }
  session.history.push({stage,day:[1,7,13][session.step],choice:actionId,baseline:base.actionId,decision,attempt:attemptRecord,bodyBefore:attemptRecord.bodyBefore,skillBefore:attemptRecord.skillBefore,outcome:copy(outcome),receipt});
  session.lastOutcome=outcome;session.step++;
  return copy(session);
}

const choiceText={
  'guided-practice':['Use the guided method','10 minutes; prepare 2 items with the method you were taught.'],
  'basic-practice':['Practice the basic way','10 minutes; prepare 1 item.'],
  deliver:['Deliver one prepared item','15 minutes; the housemate will receive an item if one is available.'],
  'paid-work':['Take paid work','15 minutes; earn one wage unit and leave the household item undelivered.'],
  confirm:['Ask for confirmation first','5 minutes; send a confirmation request before starting.'],
  coordinate:['Coordinate now','5 minutes; ask to start the work together now.']
};

function stageView(session) {
  const base=baseline(session).actionId;
  const instruction=latest(session,'fact','method')?.value===true;
  const delivery=latest(session,'commitment','delivery');
  const observedBreach=latest(session,'interaction','colleague','supply')?.value==='breached';
  const supply=latest(session,'commitment','supply');
  const ids=session.step===0?(instruction?['guided-practice','basic-practice']:['basic-practice']):session.step===1?['deliver','paid-work']:['confirm','coordinate'];
  const known=session.step===0?
    [{label:'Method',text:instruction?'A colleague taught you a guided method.':'You have not received a guided method.'},{label:'Time',text:'You have 10 minutes to practice.'}]:
    session.step===1?
      [{label:'Prepared items',text:`You have ${session.world.produced}.`},{label:'Household responsibility',text:delivery?.value==='accepted'?`You promised your housemate: “${delivery.details.terms}.”`:'No household responsibility was accepted.'},{label:'Time',text:'You have one 15-minute window before leaving.'}]:
      [{label:'Supply history',text:observedBreach?'You observed that the colleague missed the shared-materials commitment on day 6.':`You last knew the supply promise as ${supply?.value??'unknown'}; no later outcome was delivered to you.`},{label:'Time',text:'Either request takes 5 minutes.'}];
  return {day:[1,7,13][session.step],title:['Learn a method','Meet the afternoon','Coordinate the work'][session.step],situation:['A short practice window is open.','You have one 15-minute window before leaving: deliver the household item or take paid work.','You and your colleague are ready to begin the shared task.'][session.step],known,choices:ids.map(id=>({id,label:choiceText[id][0],detail:choiceText[id][1],recommended:id===base}))};
}

function comparison(session) {
  const changed={...session.setup,observedBreach:!session.setup.observedBreach};
  let alternate=createShowcase(changed);
  alternate=applyChoice(alternate,session.history[0].choice);
  alternate=applyChoice(alternate,session.history[1].choice);
  const actual=session.history[2].baseline,other=baseline(alternate).actionId;
  const actualLabel=choiceText[actual][0],otherLabel=choiceText[other][0],chosenLabel=choiceText[session.history[2].choice][0];
  const text=session.setup.observedBreach?
    `With the missed supply commitment observed, the baseline suggestion was “${actualLabel}.” Without that observation, it was “${otherLabel}.” You chose “${chosenLabel}” independently.`:
    `Without an observed missed supply commitment, the baseline suggestion was “${actualLabel}.” If that event had been observed, it was “${otherLabel}.” You chose “${chosenLabel}” independently.`;
  return {title:'One earlier event, a different suggestion',text};
}

function wire(value,ancestors=new Set()) {
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'&&Number.isFinite(value))return;
  if(typeof value!=='object'||ancestors.has(value))throw new Error('Invalid wire value');
  ancestors.add(value);
  if(Array.isArray(value)) {
    if(Object.getPrototypeOf(value)!==Array.prototype)throw new Error('Invalid wire array');
    const keys=Reflect.ownKeys(value);
    if(keys.length!==value.length+1||!keys.includes('length'))throw new Error('Invalid wire array');
    for(let index=0;index<value.length;index++) {
      const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
      if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error('Invalid wire array');
      wire(descriptor.value,ancestors);
    }
    if(keys.some(key=>key!=='length'&&(typeof key!=='string'||!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length)))throw new Error('Invalid wire array');
  } else {
    if(![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('Invalid wire object');
    for(const key of Reflect.ownKeys(value)) {
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(typeof key!=='string'||!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error('Invalid wire object');
      wire(descriptor.value,ancestors);
    }
  }
  ancestors.delete(value);
}

function equal(left,right) {
  if(Object.is(left,right))return true;
  if(!left||!right||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return false;
  const leftKeys=Object.keys(left),rightKeys=Object.keys(right);
  return leftKeys.length===rightKeys.length&&leftKeys.every(key=>Object.hasOwn(right,key)&&equal(left[key],right[key]));
}

function validateSession(source) {
  try {
    wire(source);
    if(!source||source.version!=='0.1.0'||!Array.isArray(source.history)||source.history.length>3)throw new Error('shape');
    let rebuilt=createShowcase(source.setup);
    for(const entry of source.history)rebuilt=applyChoice(rebuilt,entry.choice);
    if(!equal(source,rebuilt))throw new Error('state');
    return rebuilt;
  } catch {
    throw new Error('Invalid showcase session');
  }
}

export function chooseShowcase(source,actionId) {
  const session=validateSession(source);
  if(session.step===3)throw new Error('Showcase is completed');
  return applyChoice(session,actionId);
}

export function getShowcaseView(source) {
  const session=validateSession(source);
  const replayFactors=factors.filter(factor=>session.setup[factor]);
  if(session.step<3) {
    const scene=stageView(session);
    const delivery=latest(session,'commitment','delivery');
    const items=session.world.produced-(session.step===2?session.world.delivered:0);
    const responsibility=delivery?.value==='accepted'?'Household promise accepted':delivery?.value==='fulfilled'?'Household promise fulfilled':delivery?.value==='breached'?'Household promise breached':'No household promise accepted';
    const carry=session.step===0?[]:[{label:'Prepared items',text:`${items} prepared item${items===1?'':'s'}${session.step===2?` ${items===1?'remains':'remain'}`:''}`},{label:'Responsibility',text:responsibility}];
    if(session.step===2)carry.push({label:'Interaction evidence',text:latest(session,'interaction','colleague','supply')?.value==='breached'?'Observed missed supply commitment':'No relevant observed history'});
    return copy({step:session.step,complete:false,...scene,lastOutcome:session.lastOutcome?copy(session.lastOutcome):null,carry,summary:[],comparison:null,progressLabel:`Decision ${session.step+1} of 3`,replayFactors});
  }
  const last=session.history[2].outcome;
  const instruction=latest(session,'fact','method')?.value===true;
  const learned=session.history[0].choice==='guided-practice'?'Guided method received and practiced':instruction?'Guided method received; basic practice chosen':'Basic practice completed without the guided method';
  const delivery=latest(session,'commitment','delivery');
  const observedBreach=latest(session,'interaction','colleague','supply')?.value==='breached';
  const remaining=session.world.produced-session.world.delivered;
  return copy({step:3,complete:true,day:14,title:'Three moments carried forward',situation:'The run is complete. These are the actual choices, outputs, and responses.',known:[],choices:[],lastOutcome:copy(last),carry:[{label:'Knowledge',text:learned},{label:'Purpose and commitment',text:delivery?.value==='fulfilled'||delivery?.value==='breached'?`Household commitment ended ${delivery.value}`:'No household commitment was accepted'},{label:'Prepared items remaining',text:`${remaining} item${remaining===1?'':'s'} ${remaining===1?'remains':'remain'}`},{label:'Interaction evidence',text:observedBreach?'Missed supply commitment was observed':'No missed supply commitment was observed'}],summary:[{label:'Prepared',text:`${session.world.produced} prepared item${session.world.produced===1?'':'s'}`},{label:'Household',text:session.world.delivered?'1 item delivered':`${session.world.wages} paid work unit; no item delivered`},{label:'Coordination',text:session.history[2].choice==='confirm'?'Confirmation requested; colleague sent a plan':'Immediate coordination; colleague started together'}],comparison:comparison(session),progressLabel:'Complete · 3 of 3',replayFactors});
}

export function replayWithout(source,factor) {
  if(!factors.includes(factor))throw new Error('Invalid replay factor');
  const session=validateSession(source);
  if(!session.setup[factor])throw new Error('Replay factor is already absent');
  return createShowcase({...session.setup,[factor]:false});
}
