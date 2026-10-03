export const ADULT_COURSE_VERSION='0.1.0';
const FORMAT='human-framework-adult-course';
const YEAR_DAYS=365.2425;
const copy=value=>structuredClone(value);

function obj(value,name,fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${name}`);
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>typeof key!=='string'||!fields.includes(key)))throw new Error(`Invalid ${name} fields`);
  for(const key of keys)if(!Object.getOwnPropertyDescriptor(value,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))throw new Error(`Invalid ${name} data`);
  return value;
}
function list(value,name,max) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max||Reflect.ownKeys(value).length!==value.length+1)throw new Error(`Invalid ${name}`);
  for(let i=0;i<value.length;i++){const field=Object.getOwnPropertyDescriptor(value,String(i));if(!field?.enumerable||!Object.hasOwn(field,'value'))throw new Error(`Invalid ${name} array data`);}
  return value;
}
function id(value,name) {
  if(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value))throw new Error(`Invalid ${name}`);
}
function day(value,name) {
  if(!Number.isSafeInteger(value)||value<0||Object.is(value,-0))throw new Error(`Invalid ${name}`);
}
function skill(value,name) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error(`Invalid ${name}`);
}
function ids(entries,name) {
  const set=new Set();
  for(const entry of entries) {
    const key=typeof entry==='string'?entry:entry?.id;
    id(key,name);
    if(set.has(key))throw new Error(`Duplicate ${name}`);
    set.add(key);
  }
  return set;
}
function validateCatalog(value) {
  obj(value,'adult catalog',['actors','skills','qualifications','roles','opportunities']);
  ids(list(value.actors,'actors',64),'actor ID');
  const skills=ids(list(value.skills,'skills',64),'skill ID');
  const qualifications=list(value.qualifications,'qualifications',64),qIds=ids(qualifications,'qualification ID');
  for(const q of qualifications) {
    obj(q,'qualification',['id','skillId','minimumSkill']);
    if(!skills.has(q.skillId))throw new Error('Unknown qualification skill');
    skill(q.minimumSkill,'minimum skill');
  }
  const roles=list(value.roles,'roles',64),rIds=ids(roles,'role ID');
  for(const role of roles) {
    obj(role,'role',['id','requiredQualifications']);
    for(const q of ids(list(role.requiredQualifications,'role requirements',64),'qualification ID'))if(!qIds.has(q))throw new Error('Unknown role qualification');
  }
  const opportunities=list(value.opportunities,'opportunities',128);
  ids(opportunities,'opportunity ID');
  for(const opportunity of opportunities) {
    obj(opportunity,'opportunity',['id','roleId','requiredQualifications']);
    if(!rIds.has(opportunity.roleId))throw new Error('Unknown opportunity role');
    for(const q of ids(list(opportunity.requiredQualifications,'opportunity requirements',64),'qualification ID'))if(!qIds.has(q))throw new Error('Unknown opportunity qualification');
  }
  return value;
}
function json(value,seen=new WeakSet()) {
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number') { if(!Number.isFinite(value))throw new Error('Invalid adult JSON number');return; }
  if(typeof value!=='object'||seen.has(value))throw new Error('Adult state must be a JSON tree');
  seen.add(value);
  if(Array.isArray(value))list(value,'JSON array',256);
  else {
    const keys=Reflect.ownKeys(value);
    obj(value,'JSON object',keys.filter(key=>typeof key==='string'));
  }
  for(const key of Object.keys(value))json(value[key],seen);
}
function active(state) {
  const roles=new Set(),qualifications=new Set(),receipts=new Set();
  for(const event of state.events) {
    if(receipts.has(event.receiptId))throw new Error('Duplicate adult receipt');
    receipts.add(event.receiptId);
    const set=event.type==='role'?roles:qualifications,key=event.type==='role'?event.roleId:event.id;
    if(['entered','awarded'].includes(event.kind)) {
      if(set.has(key))throw new Error('Adult state already active');
      set.add(key);
    } else {
      if(!set.has(key))throw new Error('Adult state is not active');
      set.delete(key);
    }
  }
  return {roles,qualifications};
}
function validate(state) {
  json(state);
  obj(state,'adult course',['version','actorId','startDay','day','ageAtStartYears','maxDays','catalog','intervals','events']);
  if(state.version!==ADULT_COURSE_VERSION)throw new Error('Incompatible adult version');
  id(state.actorId,'actor ID');day(state.startDay,'start day');day(state.day,'current day');day(state.maxDays,'horizon');
  if(state.maxDays<1||state.maxDays>730||state.day<state.startDay||state.day-state.startDay>state.maxDays)throw new Error('Adult course horizon limit');
  if(typeof state.ageAtStartYears!=='number'||!Number.isFinite(state.ageAtStartYears)||state.ageAtStartYears<18||state.ageAtStartYears>120)throw new Error('Adult course requires age 18 or older at start');
  validateCatalog(state.catalog);
  if(!state.catalog.actors.includes(state.actorId))throw new Error('Adult course owner absent from actor catalog');
  list(state.intervals,'adult intervals',128);
  let previous=state.startDay;
  for(const interval of state.intervals) {
    obj(interval,'adult interval',['fromDay','toDay','kind']);
    day(interval.fromDay,'interval start');day(interval.toDay,'interval end');
    if(interval.fromDay!==previous||interval.toDay<=interval.fromDay||interval.toDay>state.day||!['unmodeled','observed'].includes(interval.kind))throw new Error('Invalid or overlapping adult intervals');
    previous=interval.toDay;
  }
  if(previous!==state.day)throw new Error('Adult course gaps must be explicit');
  list(state.events,'adult events',256);
  let eventDay=state.startDay;
  const roles=new Set(state.catalog.roles.map(x=>x.id));
  const qualifications=new Map(state.catalog.qualifications.map(x=>[x.id,x]));
  for(const event of state.events) {
    if(event.type==='role') {
      obj(event,'role receipt',['type','receiptId','atDay','roleId','kind','sourceId','deliveredTo']);
      if(!roles.has(event.roleId)||!['entered','exited'].includes(event.kind))throw new Error('Invalid role transition');
      id(event.sourceId,'role source ID');
      if(!state.catalog.actors.includes(event.sourceId))throw new Error('Unknown role source actor');
    } else if(event.type==='qualification') {
      const fields=['type','receiptId','atDay','id','kind','assessorId','evidenceRef','deliveredTo'];
      if(event.kind==='awarded')fields.push('assessedSkill');
      obj(event,'qualification receipt',fields);
      const specification=qualifications.get(event.id);
      if(!specification||!['awarded','revoked'].includes(event.kind))throw new Error('Invalid qualification transition');
      id(event.assessorId,'assessor ID');id(event.evidenceRef,'evidence reference');
      if(!state.catalog.actors.includes(event.assessorId))throw new Error('Unknown qualification assessor actor');
      if(event.kind==='awarded') {
        skill(event.assessedSkill,'assessed skill');
        if(event.assessedSkill<specification.minimumSkill)throw new Error('Qualification assessment below required skill');
      }
    } else throw new Error('Invalid adult event type');
    id(event.receiptId,'receipt ID');day(event.atDay,'event day');
    if(event.atDay<eventDay||event.atDay>state.day)throw new Error('Adult events out of chronology');
    if(event.deliveredTo!==state.actorId)throw new Error('Adult event delivery owner mismatch');
    eventDay=event.atDay;
  }
  active(state);
  return state;
}
function checked(state) { return copy(validate(state)); }
function append(state,event) {
  const next=checked(state);
  if(event.atDay!==next.day)throw new Error('Adult receipt must arrive at current day');
  if(next.events.length>=256)throw new Error('Adult event limit');
  if(next.events.some(x=>x.receiptId===event.receiptId))throw new Error('Duplicate adult receipt');
  next.events.push(event);
  return checked(next);
}
function actorSkills(view,state) {
  obj(view,'actor skill view',['actorId','skills']);
  if(view.actorId!==state.actorId)throw new Error('Actor skill view owner mismatch');
  obj(view.skills,'actor skills',state.catalog.skills);
  for(const key of state.catalog.skills)skill(view.skills[key],'actor skill');
  return view.skills;
}

export function createAdultCourse({actorId,startDay=0,ageAtStartYears,maxDays=730,catalog}={}) {
  return checked({version:ADULT_COURSE_VERSION,actorId,startDay,day:startDay,ageAtStartYears,maxDays,catalog:copy(catalog),intervals:[],events:[]});
}
export function advanceAdultCourse(state,{toDay,kind}={}) {
  const next=checked(state);
  day(toDay,'advance day');
  if(toDay<=next.day)throw new Error('Adult interval must advance');
  if(toDay-next.startDay>next.maxDays)throw new Error('Adult course horizon limit');
  if(!['unmodeled','observed'].includes(kind))throw new Error('Adult interval kind must be explicit');
  if(next.intervals.length>=128)throw new Error('Adult interval limit');
  next.intervals.push({fromDay:next.day,toDay,kind});next.day=toDay;
  return checked(next);
}
export function transitionAdultRole(state,receipt) {
  obj(receipt,'role receipt',['receiptId','atDay','roleId','kind','sourceId','deliveredTo']);
  return append(state,{type:'role',...copy(receipt)});
}
export function recordQualification(state,receipt,actorSkillView) {
  obj(receipt,'qualification receipt',['receiptId','atDay','id','kind','assessorId','evidenceRef','deliveredTo']);
  const next=checked(state);
  if(receipt.kind==='awarded') {
    const specification=next.catalog.qualifications.find(x=>x.id===receipt.id);
    if(!specification)throw new Error('Unknown qualification');
    const assessedSkill=actorSkills(actorSkillView,next)[specification.skillId];
    if(assessedSkill<specification.minimumSkill)throw new Error('Qualification assessment below required skill');
    return append(next,{type:'qualification',...copy(receipt),assessedSkill});
  }
  return append(next,{type:'qualification',...copy(receipt)});
}
export function getAdultCourseView(state) {
  const next=checked(state),status=active(next);
  return copy({actorId:next.actorId,day:next.day,ageYears:next.ageAtStartYears+(next.day-next.startDay)/YEAR_DAYS,
    roles:next.catalog.roles.filter(x=>status.roles.has(x.id)).map(x=>x.id),
    qualifications:next.catalog.qualifications.filter(x=>status.qualifications.has(x.id)).map(x=>x.id),
    unmodeledIntervals:next.intervals.filter(x=>x.kind==='unmodeled')});
}
export function availableAdultOpportunities(state,{actorSkillView}={}) {
  const next=checked(state),skills=actorSkills(actorSkillView,next),status=active(next);
  const qualifies=id=>{
    const q=next.catalog.qualifications.find(x=>x.id===id);
    return status.qualifications.has(id)&&skills[q.skillId]>=q.minimumSkill;
  };
  return copy(next.catalog.opportunities.map(x=>{
    if(!status.roles.has(x.roleId))return {id:x.id,eligible:false};
    const role=next.catalog.roles.find(role=>role.id===x.roleId);
    return {id:x.id,eligible:[...role.requiredQualifications,...x.requiredQualifications].every(qualifies)};
  }));
}
export function exportAdultCourse(state) {
  return copy({format:FORMAT,version:1,course:validate(state)});
}
export function restoreAdultCourse(snapshot,expectedActorId) {
  obj(snapshot,'adult snapshot',['format','version','course']);
  if(snapshot.format!==FORMAT||snapshot.version!==1)throw new Error('Incompatible adult snapshot');
  id(expectedActorId,'expected actor ID');
  const state=checked(snapshot.course);
  if(expectedActorId!==state.actorId)throw new Error('Adult course owner mismatch');
  return state;
}
