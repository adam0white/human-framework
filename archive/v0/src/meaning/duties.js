export const DUTIES_VERSION='0.1.0';

const MAX_CASES=16,MAX_REQUIREMENTS=8,MAX_EVENTS=128;
const clone=value=>structuredClone(value);

function object(value,name,fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Unknown ${name} field`);
  for(const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name} field`);
  }
}

function required(value,name,fields) {
  object(value,name,fields);
  if(fields.some(key=>!Object.hasOwn(value,key)))throw new Error(`Incomplete ${name}`);
}

function list(value,name,max=MAX_EVENTS) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max)throw new Error(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==value.length+1||!keys.includes('length'))throw new Error(`Invalid ${name}`);
  for(let i=0;i<value.length;i++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error(`Invalid ${name}`);
  }
  if(keys.some(key=>key!=='length'&&(!/^\d+$/.test(key)||Number(key)>=value.length)))throw new Error(`Invalid ${name}`);
}

function id(value,name) {
  if(typeof value!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}

function label(value,name,max=240) {
  if(typeof value!=='string'||value.length<1||value.length>max||value.trim()!==value)throw new Error(`Invalid ${name}`);
}

function minute(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`Invalid ${name}`);
}

function audience(values) {
  list(values,'disclosed audiences',16);
  const seen=new Set();
  for(const viewer of values) {
    id(viewer,'viewer ID');
    if(seen.has(viewer))throw new Error('Duplicate disclosed viewer');
    seen.add(viewer);
  }
}

function caseRecord(value) {
  required(value,'duty case',['id','source','interpretation','requirements']);
  id(value.id,'case ID');
  required(value.source,'duty source',['kind','locator','translationAttribution']);
  if(!['revelation','hadith'].includes(value.source.kind))throw new Error('Invalid duty source kind');
  label(value.source.locator,'source locator',500);
  label(value.source.translationAttribution,'translation attribution',160);
  required(value.interpretation,'case interpretation',['summary','school','reviewStatus']);
  label(value.interpretation.summary,'interpretation summary',500);
  label(value.interpretation.school,'interpretive school',160);
  if(!['unreviewed','reviewed'].includes(value.interpretation.reviewStatus))throw new Error('Invalid review status');
  list(value.requirements,'case requirements',MAX_REQUIREMENTS);
  if(value.requirements.length===0)throw new Error('Duty case needs requirements');
  const seen=new Set();
  for(const requirement of value.requirements) {
    required(requirement,'repair requirement',['id','requiredAmount']);
    id(requirement.id,'requirement ID');
    if(seen.has(requirement.id))throw new Error('Duplicate requirement ID');
    seen.add(requirement.id);
    if(!Number.isSafeInteger(requirement.requiredAmount)||requirement.requiredAmount<1||requirement.requiredAmount>1_000_000)throw new Error('Invalid required amount');
  }
}

function notice(value,state) {
  required(value,'duty notice',['id','at','caseId','sourceActorId','understanding','stance','disclosedTo']);
  id(value.id,'notice ID');minute(value.at,'notice receipt time');
  if(value.at!==state.now)throw new Error('Duty notice must be delivered at current time');
  knownCase(state,value.caseId);id(value.sourceActorId,'source actor ID');
  label(value.understanding,'understood duty',500);
  if(!['accepted','uncertain','rejected'].includes(value.stance))throw new Error('Invalid understood duty stance');
  audience(value.disclosedTo);
}

function intention(value,state) {
  required(value,'stated intention',['id','at','caseId','statement','disclosedTo']);
  id(value.id,'intention ID');minute(value.at,'intention record time');
  if(value.at!==state.now)throw new Error('Intention must be recorded at current time');
  knownCase(state,value.caseId);label(value.statement,'intention statement',500);audience(value.disclosedTo);
}

function restitution(value,state) {
  required(value,'restitution outcome',['id','at','caseId','kind','requirementId','amount','outcomeId','disclosedTo']);
  id(value.id,'repair receipt ID');minute(value.at,'outcome receipt time');
  if(value.at!==state.now)throw new Error('Repair outcome must be delivered at current time');
  const dutyCase=knownCase(state,value.caseId);
  if(value.kind!=='restitution')throw new Error('Invalid restitution kind');
  id(value.requirementId,'requirement ID');
  if(!dutyCase.requirements.some(item=>item.id===value.requirementId))throw new Error('Unknown repair requirement');
  if(!Number.isSafeInteger(value.amount)||value.amount<0||value.amount>1_000_000||Object.is(value.amount,-0))throw new Error('Invalid restitution amount');
  id(value.outcomeId,'canonical outcome ID');audience(value.disclosedTo);
}

function response(value,state) {
  required(value,'recipient response',['id','at','caseId','kind','recipientId','response','disclosedTo']);
  id(value.id,'response receipt ID');minute(value.at,'response receipt time');
  if(value.at!==state.now)throw new Error('Recipient response must be delivered at current time');
  knownCase(state,value.caseId);
  if(value.kind!=='recipient-response')throw new Error('Invalid recipient response kind');
  id(value.recipientId,'recipient ID');
  if(!['accepted','refused','deferred'].includes(value.response))throw new Error('Invalid recipient response');
  audience(value.disclosedTo);
}

function knownCase(state,caseId) {
  id(caseId,'case ID');
  const found=state.cases.find(item=>item.id===caseId);
  if(!found)throw new Error('Unknown duty case');
  return found;
}

function allEvents(state) {
  return [...state.notices,...state.intentions,...state.outcomes,...state.recipientResponses];
}

function progress(state) {
  const repairs={};
  for(const dutyCase of state.cases) {
    const requirements=dutyCase.requirements.map(item=>({id:item.id,requiredAmount:item.requiredAmount,completedAmount:0}));
    for(const outcome of state.outcomes)if(outcome.caseId===dutyCase.id) {
      const target=requirements.find(item=>item.id===outcome.requirementId);
      target.completedAmount+=outcome.amount;
      if(target.completedAmount>target.requiredAmount)throw new Error('Restitution exceeds authored requirement');
    }
    const completed=requirements.every(item=>item.completedAmount===item.requiredAmount);
    const any=requirements.some(item=>item.completedAmount>0);
    repairs[dutyCase.id]={status:completed?'completed':any?'partial':'unrepaired',requirements};
  }
  return repairs;
}

function validateState(state) {
  required(state,'duties state',['version','ownerId','now','cases','notices','intentions','outcomes','recipientResponses']);
  if(state.version!==DUTIES_VERSION)throw new Error('Incompatible duties version');
  id(state.ownerId,'duties owner ID');minute(state.now,'duties chronology');
  list(state.cases,'duty cases',MAX_CASES);
  const cases=new Set();
  for(const item of state.cases) {
    caseRecord(item);
    if(cases.has(item.id))throw new Error('Duplicate duty case');
    cases.add(item.id);
  }
  for(const field of ['notices','intentions','outcomes','recipientResponses'])list(state[field],field);
  const events=allEvents(state);
  if(events.length>MAX_EVENTS)throw new Error('Duty event history limit reached');
  const ids=new Set(),outcomeIds=new Set();
  for(const event of events) {
    if(ids.has(event.id))throw new Error('Duplicate duty event ID');
    ids.add(event.id);
  }
  const historical=(items,check)=>{
    let lastAt=-1;
    for(const item of items) {
      minute(item.at,'historical duty event time');
      if(item.at<lastAt||item.at>state.now)throw new Error('Historical duty receipts out of order');
      check(item,{...state,now:item.at});
      lastAt=item.at;
    }
  };
  historical(state.notices,notice);
  historical(state.intentions,intention);
  for(const item of state.outcomes) {
    if(outcomeIds.has(item.outcomeId))throw new Error('Duplicate canonical outcome ID');
    outcomeIds.add(item.outcomeId);
  }
  historical(state.outcomes,restitution);
  historical(state.recipientResponses,response);
  progress(state);
  return state;
}

function add(state,input,field,validator) {
  validateState(state);validator(input,state);
  const existing=allEvents(state).find(item=>item.id===input.id);
  if(existing) {
    if(field!==eventField(existing,state)||JSON.stringify(existing)!==JSON.stringify(input))throw new Error('Conflicting duplicate duty event');
    return clone(state);
  }
  if(allEvents(state).length===MAX_EVENTS)throw new Error('Duty event history limit reached');
  const next=clone(state);next[field].push(clone(input));
  validateState(next);
  return next;
}

function eventField(event,state) {
  if(state.notices.includes(event))return 'notices';
  if(state.intentions.includes(event))return 'intentions';
  if(state.outcomes.includes(event))return 'outcomes';
  return 'recipientResponses';
}

export function createDuties(input) {
  required(input,'duties setup',['ownerId','now','cases']);
  const state={version:DUTIES_VERSION,ownerId:input.ownerId,now:input.now,cases:clone(input.cases),notices:[],intentions:[],outcomes:[],recipientResponses:[]};
  return clone(validateState(state));
}

export function advanceDuties(state,now) {
  validateState(state);minute(now,'duties chronology');
  if(now<state.now)throw new Error('Duties chronology cannot move backward');
  const next=clone(state);next.now=now;
  return next;
}

export function receiveDutyNotice(state,input) {return add(state,input,'notices',notice);}
export function recordStatedIntention(state,input) {return add(state,input,'intentions',intention);}
export function receiveRepairOutcome(state,input) {
  if(input?.kind==='restitution')return add(state,input,'outcomes',restitution);
  if(input?.kind==='recipient-response')return add(state,input,'recipientResponses',response);
  throw new Error('Invalid repair outcome kind');
}

export function getDutyView(state) {
  validateState(state);
  return clone({ownerId:state.ownerId,now:state.now,cases:state.cases,notices:state.notices,intentions:state.intentions,outcomes:state.outcomes,recipientResponses:state.recipientResponses,repairs:progress(state)});
}

export function getDutyPublicView(state,viewerId) {
  validateState(state);id(viewerId,'viewer ID');
  const disclosed=values=>values.filter(item=>item.disclosedTo.includes(viewerId));
  return clone({ownerId:state.ownerId,now:state.now,notices:disclosed(state.notices),intentions:disclosed(state.intentions),outcomes:disclosed(state.outcomes),recipientResponses:disclosed(state.recipientResponses)});
}

export function exportDuties(state) {
  validateState(state);
  return clone({format:'human-framework-duties',version:1,state});
}

export function restoreDuties(snapshot,expectedOwnerId) {
  required(snapshot,'duties snapshot',['format','version','state']);id(expectedOwnerId,'expected owner ID');
  if(snapshot.format!=='human-framework-duties'||snapshot.version!==1)throw new Error('Incompatible duties snapshot');
  validateState(snapshot.state);
  if(snapshot.state.ownerId!==expectedOwnerId)throw new Error('Duties owner mismatch');
  return clone(snapshot.state);
}
