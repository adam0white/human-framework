/** Private complete camp-shaped consumer of the candidate, not the released Camp host. */
import * as work from './candidate.js';
import {createPerson,assessEffort,beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson,HUMAN_VERSION} from '../../human/v0.1.1.js';
import {practice} from '../../core/model.js';

export const HOST_VERSION='0.1.0';
const ACTORS=['A','B','C'],WORKERS=['A','B'],END=1000000,EPS=1e-10,copy=structuredClone,trusted=new WeakSet();
const fail=message=>{throw new Error(message);};
function json(value){
  const seen=new Set();let budget=32768;
  function visit(v,depth){
    if(depth>16||--budget<0)fail('Host snapshot exceeds bound');
    if(v===null||typeof v==='boolean')return;
    if(typeof v==='string'){budget-=v.length;if(budget<0||v.length>160)fail('Host string exceeds bound');return;}
    if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('Invalid host number');return;}
    if(typeof v!=='object'||seen.has(v))fail('Host requires an unshared JSON tree');seen.add(v);
    const array=Array.isArray(v),keys=Reflect.ownKeys(v);
    if(array?Object.getPrototypeOf(v)!==Array.prototype:![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('Host requires plain JSON');
    if(array&&(v.length>100||keys.length!==v.length+1))fail('Host requires dense bounded arrays');
    for(const key of keys){
      if(array&&key==='length')continue;const field=Object.getOwnPropertyDescriptor(v,key);
      if(typeof key!=='string'||!field.enumerable||!Object.hasOwn(field,'value')||array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=v.length))fail('Host requires data-only fields');
      budget-=key.length;visit(field.value,depth+1);
    }
  }visit(value,0);
}
function fields(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('Invalid host fields');}
function integer(value,min,max){if(!Number.isSafeInteger(value)||value<min||value>max||Object.is(value,-0))fail('Invalid host integer');}
function close(a,b){if(typeof a!=='number'||!Number.isFinite(a)||Math.abs(a-b)>EPS)fail('Inconsistent host accounting');}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function seal(world){freeze(world);trusted.add(world);return world;}
function setup(input={}){
  json(input);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['toolArrival','busyB','items'].includes(key)))fail('Invalid host setup');
  const result={toolArrival:input.toolArrival??null,busyB:input.busyB??false,items:input.items??1};
  if(![null,1].includes(result.toolArrival)||typeof result.busyB!=='boolean'||![1,2].includes(result.items))fail('Invalid host setup');return result;
}
const skillStart=id=>id==='C'?{crafting:.1}:{construction:id==='A'?.1:.6,hauling:.1};
const payment=()=>({work:0,recovery:0,effort:0,construction:0,hauling:0,crafting:0});
const itemById=(world,id)=>world.items.find(item=>item.work.id===id)??fail('Unknown owned item');
const quote=(world,item,actor)=>work.quoteWork(item.work,{workerId:actor,durationReduction:world.toolAvailable?6:0});
function prepared(world,item,actor){return work.prepareWorker(item.work,{workerId:actor,basisMinutes:20-Math.floor(world.actors[actor].person.skills.construction*4)});}
function capable(person,quote){return assessEffort(person.body,{durationMinutes:quote.remainingMinutes,effort:quote.remainingEffort,exertive:true}).allowed;}

// Necessary per-item rate/chronology checks for this host's one known tool event.
// No replay is inferred: the first and terminal contributors are bounded possibilities.
function validItemRates(world,item){
  const contributors=Object.entries(item.work.workers).filter(([,worker])=>worker.minutes>0);
  const minutes=contributors.reduce((sum,[,worker])=>sum+worker.minutes,0),done=item.completedAt!==null;
  const at=done?item.completedAt:world.now;if(minutes>at)return false;
  const faster=world.setup.toolArrival===1&&at>1;
  // An item with one exposure every elapsed minute must include the slow minute 1.
  const first=faster?[...(minutes<at?[null]:[]),...contributors.map(([id])=>id)]:[null];
  const last=done?contributors.map(([id])=>id):[null];
  return first.some(firstId=>last.some(lastId=>contributors.every(([id,worker])=>{
    const slow=1/worker.basisMinutes,rate=faster?1/Math.max(6,worker.basisMinutes-6):slow;
    const full=worker.minutes*rate-(firstId===id?rate-slow:0);
    if(id!==lastId)return Math.abs(worker.fraction-full)<=EPS;
    // A worker whose only exposure was minute 1 cannot also finish after other work.
    if(firstId===id&&worker.minutes===1&&minutes>1)return false;
    const finalRate=firstId===id&&worker.minutes===1?slow:rate;
    return worker.fraction<=full+EPS&&worker.fraction>full-finalRate;
  })));
}

function validate(world){
  if(trusted.has(world))return world;json(world);
  fields(world,['version','setup','now','stock','spent','toolAvailable','outputs','actors','items','assignments','lastResponse']);
  if(world.version!==HOST_VERSION)fail('Incompatible host version');fields(world.setup,['toolArrival','busyB','items']);setup(world.setup);integer(world.now,0,END);
  for(const key of ['stock','spent']){fields(world[key],['timber','salvage','toolBlank']);for(const value of Object.values(world[key]))integer(value,0,10);}
  fields(world.actors,ACTORS);fields(world.assignments,ACTORS);integer(world.outputs,0,world.setup.items);
  if(typeof world.toolAvailable!=='boolean'||!Array.isArray(world.items)||world.items.length!==world.setup.items)fail('Invalid owned world');
  let reservedTimber=0,reservedSalvage=0,settled=0;const credit=Object.fromEntries(ACTORS.map(id=>[id,{minutes:0,effort:0}])),assigned=new Set();
  for(const [index,item] of world.items.entries()){
    fields(item,['work','reserved','completedAt']);work.restoreWork({format:'paid-durable-work',version:1,work:item.work});
    const physical=item.work;if(physical.id!==`work-${index+1}`||physical.effort!==.2||physical.minimumDuration!==6||physical.status==='complete')fail('Invalid host work definition or unsettled completion');
    fields(item.reserved,['timber','salvage']);const started=Object.keys(physical.workers).length>0,done=physical.status==='settled';
    if(item.reserved.timber!==(started&&!done?5:0)||item.reserved.salvage!==(started&&!done?1:0))fail('Invalid installed material');
    if(done){integer(item.completedAt,1,world.now);settled++;}else if(item.completedAt!==null)fail('Unfinished item has a completion time');
    reservedTimber+=item.reserved.timber;reservedSalvage+=item.reserved.salvage;
    for(const [id,contribution] of Object.entries(physical.workers)){
      if(!WORKERS.includes(id))fail('Invalid construction worker');
      const person=world.actors[id]?.person,initial=skillStart(id).construction;
      if(!person?.skills)fail('Invalid worker');
      integer(contribution.basisMinutes,20-Math.floor(person.skills.construction*4),20-Math.floor(initial*4));
      credit[id].minutes+=contribution.minutes;credit[id].effort+=contribution.effort;
    }
    if(!validItemRates(world,item))fail('Item rate or completion chronology contradicts paid work/tool availability');
  }
  if(world.outputs!==settled||world.spent.timber!==5*settled||world.spent.salvage!==settled||world.stock.timber+reservedTimber+world.spent.timber!==5*world.setup.items||world.stock.salvage+reservedSalvage+world.spent.salvage!==world.setup.items)fail('Host material/output conservation failed');
  const supplied=world.setup.toolArrival===1,delivered=supplied&&world.now>=1;
  if(world.toolAvailable!==delivered||world.stock.toolBlank!==(supplied&&!delivered?1:0)||world.spent.toolBlank!==(delivered?1:0)||world.assignments.C!==(supplied&&!delivered?'crafting':null))fail('Inconsistent owned supplier setup');
  for(const id of ACTORS){
    const actor=world.actors[id];fields(actor,['person','paid']);const person=restorePerson(exportPerson(actor.person)),paid=actor.paid,initial=skillStart(id);
    if(person.version!==HUMAN_VERSION||person.id!==id||person.minutes!==world.now||person.nextAttempt!==world.now+1||person.pending!==null||person.observationBias!==0)fail('Inconsistent paid person identity/time');
    fields(person.skills,Object.keys(initial));fields(paid,['work','recovery','effort','construction','hauling','crafting']);
    for(const key of ['work','recovery','construction','hauling','crafting'])integer(paid[key],0,world.now);
    if(typeof paid.effort!=='number'||paid.effort<0||paid.effort>world.now)fail('Invalid paid effort');
    if(paid.work+paid.recovery!==world.now||paid.work!==paid.construction+paid.hauling+paid.crafting||paid.construction!==credit[id].minutes||id!=='B'&&paid.hauling||id!=='C'&&paid.crafting)fail('Inconsistent per-worker paid minutes');
    if(id==='B'&&paid.hauling>(world.setup.busyB?Math.min(4,world.now):0)||id==='C'&&paid.crafting!==(delivered?1:0))fail('Invalid duty/supplier payment');
    close(paid.effort,credit[id].effort+.01*paid.hauling+.02*paid.crafting);
    for(const [skill,baseline] of Object.entries(initial))close(person.skills[skill],practice(baseline,paid[skill]));
    close(person.body.hunger,Math.min(1,.2+.002*world.now));
    const assignment=world.assignments[id];
    if(assignment==='hauling'){
      if(id!=='B'||!world.setup.busyB||world.now>=4||paid.hauling!==world.now)fail('Invalid active hauling duty');
    }else if(assignment==='crafting'){if(id!=='C'||!supplied||world.now!==0)fail('Invalid active supplier');}
    else if(assignment!==null){
      if(!WORKERS.includes(id)||assigned.has(assignment))fail('Duplicate/invalid assignment');assigned.add(assignment);
      const item=itemById(world,assignment);if(item.work.status!=='open'||!Object.hasOwn(item.work.workers,id))fail('Invalid assigned worker');
      const plan=quote(world,item,id);if(world.now+plan.remainingMinutes>END||!capable(person,plan))fail('Incapable assigned worker or insufficient world time');
    }
  }
  if(world.lastResponse!==null){const response=world.lastResponse;fields(response,['at','item','from','to','accepted','reason']);integer(response.at,0,world.now);itemById(world,response.item);
    if(!WORKERS.includes(response.from)||!WORKERS.includes(response.to)||response.from===response.to||typeof response.accepted!=='boolean'||!['accepted','recipient-busy','recipient-capacity'].includes(response.reason)||response.accepted!==(response.reason==='accepted'))fail('Invalid consent response');}
  return world;
}
export function createWorld(input={}){
  const config=setup(input),world={version:HOST_VERSION,setup:config,now:0,stock:{timber:5*config.items,salvage:config.items,toolBlank:config.toolArrival?1:0},spent:{timber:0,salvage:0,toolBlank:0},toolAvailable:false,outputs:0,
    actors:Object.fromEntries(ACTORS.map(id=>[id,{person:createPerson({id,body:{fatigue:.2,hunger:.2},skills:skillStart(id),observationBias:0}),paid:payment()}])),
    items:Array.from({length:config.items},(_,index)=>({work:work.createWork({id:`work-${index+1}`,effort:.2,minimumDuration:6}),reserved:{timber:0,salvage:0},completedAt:null})),
    assignments:{A:null,B:config.busyB?'hauling':null,C:config.toolArrival?'crafting':null},lastResponse:null};
  return seal(validate(world));
}
export function command(world,input){
  validate(world);json(input);const next=copy(world);
  if(input?.type==='start'){
    fields(input,['type','actor','item']);if(!WORKERS.includes(input.actor)||next.assignments[input.actor]!==null)fail('Worker is unavailable');
    const item=itemById(next,input.item);if(Object.values(next.assignments).includes(input.item))fail('Item already has a worker');
    const basis=prepared(next,item,input.actor),plan=work.quoteWork(basis,{workerId:input.actor,durationReduction:next.toolAvailable?6:0});
    if(next.now+plan.remainingMinutes>END)fail('Insufficient remaining world time');
    if(!capable(next.actors[input.actor].person,plan))fail('Insufficient whole-remaining-work capacity');
    if(!Object.keys(item.work.workers).length){if(next.stock.timber<5||next.stock.salvage<1)fail('Missing owned material');next.stock.timber-=5;next.stock.salvage--;item.reserved={timber:5,salvage:1};}
    item.work=basis;next.assignments[input.actor]=input.item;
  }else if(input?.type==='stop'){
    fields(input,['type','actor']);if(!WORKERS.includes(input.actor)||next.assignments[input.actor]===null)fail('No controllable assignment to stop');
    next.assignments[input.actor]=null;
  }else if(input?.type==='handover'){
    fields(input,['type','from','to','item']);if(!WORKERS.includes(input.from)||!WORKERS.includes(input.to)||input.from===input.to||next.assignments[input.from]!==input.item)fail('Invalid work offer');
    const item=itemById(next,input.item);let reason='recipient-busy',basis;
    if(next.assignments[input.to]===null){basis=prepared(next,item,input.to);const plan=work.quoteWork(basis,{workerId:input.to,durationReduction:next.toolAvailable?6:0});reason=next.now+plan.remainingMinutes<=END&&capable(next.actors[input.to].person,plan)?'accepted':'recipient-capacity';}
    if(reason==='accepted'){item.work=basis;next.assignments[input.from]=null;next.assignments[input.to]=input.item;}
    next.lastResponse={at:next.now,item:input.item,from:input.from,to:input.to,accepted:reason==='accepted',reason};
  }else fail('Unknown host command');
  return seal(validate(next));
}
function pay(person,action){
  let next=beginAttempt(person,{durationMinutes:1,targetId:null,effort:0,exertive:false,skill:null,...action});
  if(!next.pending.capacity.allowed)fail('Insufficient capacity for the actual paid minute');
  next=advanceAttempt(next,1);return finishAttempt(next,{attemptId:next.pending.id,status:'completed'});
}
function minute(world){
  for(const id of ACTORS){
    const actor=world.actors[id],assignment=world.assignments[id];
    if(assignment==='hauling'||assignment==='crafting'){
      const hauling=assignment==='hauling',effort=hauling?.01:.02,skill=hauling?'hauling':'crafting';
      actor.person=pay(actor.person,{actionId:hauling?'haul':'craft',activity:'active',skill,effort,exertive:true});actor.paid.work++;actor.paid[skill]++;actor.paid.effort+=effort;
    }else if(assignment!==null){
      const item=itemById(world,assignment),plan=quote(world,item,id);
      actor.person=pay(actor.person,{actionId:'construct',targetId:assignment,activity:'active',skill:'construction',effort:plan.effort,exertive:true});
      item.work=work.advanceWork(item.work,{workerId:id,durationReduction:world.toolAvailable?6:0}).work;
      actor.paid.work++;actor.paid.construction++;actor.paid.effort+=plan.effort;
    }else{actor.person=pay(actor.person,{actionId:'recover',activity:'rest'});actor.paid.recovery++;}
  }
  world.now++;
  for(const item of world.items)if(item.work.status==='complete'){
    const settled=work.settleWork(item.work);item.work=settled.work;
    if(settled.completion){world.outputs++;item.completedAt=world.now;world.spent.timber+=item.reserved.timber;world.spent.salvage+=item.reserved.salvage;item.reserved={timber:0,salvage:0};for(const id of WORKERS)if(world.assignments[id]===item.work.id)world.assignments[id]=null;}
  }
  if(world.assignments.C==='crafting'){world.assignments.C=null;world.stock.toolBlank--;world.spent.toolBlank++;world.toolAvailable=true;}
  if(world.assignments.B==='hauling'&&world.now===4)world.assignments.B=null;
}
export function advanceTo(world,at){validate(world);integer(at,world.now,END);if(at-world.now>1440)fail('A single advance is limited to 1440 minutes');const next=copy(world);while(next.now<at)minute(next);return seal(validate(next));}
export function nextEvent(world){
  validate(world);const events=[];
  for(const id of ACTORS){const assigned=world.assignments[id];if(assigned==='crafting')events.push(1);else if(assigned==='hauling')events.push(4);else if(assigned!==null)events.push(world.now+quote(world,itemById(world,assigned),id).remainingMinutes);}
  return events.length?Math.min(...events):null;
}
export function observe(world){
  validate(world);return copy({now:world.now,stock:world.stock,spent:world.spent,toolAvailable:world.toolAvailable,outputs:world.outputs,
    actors:Object.fromEntries(ACTORS.map(id=>[id,{person:exportPerson(world.actors[id].person),paid:world.actors[id].paid}])),
    items:world.items.map(item=>({id:item.work.id,progress:item.work.progress,completedAt:item.completedAt,settled:item.work.status==='settled',reserved:item.reserved,
      contributions:Object.fromEntries(Object.entries(item.work.workers).map(([id,c])=>[id,{basis:c.basisMinutes,minutes:c.minutes,fraction:c.fraction,effort:c.effort}]))})),
    assignments:world.assignments,lastResponse:world.lastResponse});
}
export function exportWorld(world){validate(world);return copy({format:'work-progress-camp-candidate',version:1,world});}
export function restoreWorld(snapshot){json(snapshot);fields(snapshot,['format','version','world']);if(snapshot.format!=='work-progress-camp-candidate'||snapshot.version!==1)fail('Incompatible host snapshot');return seal(copy(validate(snapshot.world)));}
