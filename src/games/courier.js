// A solo route host. Shared code owns only body, capacity and task practice.
import {createPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson,assessEffort,estimateSuccess} from '../human/index.js';

export const HOST_VERSION='courier-0.1.0';
const DEADLINE=240,BAG_CAPACITY=3,BLOCKED_MINUTES=2;
const clone=value=>structuredClone(value);
const places=[
  {id:'depot',name:'Depot',x:12,y:42},{id:'market',name:'Market',x:33,y:15},
  {id:'quay',name:'Quay',x:33,y:78},{id:'archive',name:'Archive',x:10,y:84},
  {id:'clinic',name:'Clinic',x:72,y:15},{id:'orchard',name:'Orchard',x:72,y:78},
  {id:'mill',name:'Mill',x:92,y:46}
];
const routes=[
  {id:'depot-market',from:'depot',to:'market',name:'Market lane',minutes:10},
  {id:'depot-quay',from:'depot',to:'quay',name:'Quay lane',minutes:10},
  {id:'depot-archive',from:'depot',to:'archive',name:'Archive lane',minutes:8},
  {id:'archive-quay',from:'archive',to:'quay',name:'Canal lane',minutes:8},
  {id:'market-quay',from:'market',to:'quay',name:'West bank',minutes:8},
  {id:'ridge-road',from:'market',to:'clinic',name:'Ridge road',minutes:24},
  {id:'footbridge',from:'market',to:'clinic',name:'Footbridge',minutes:11,crossing:true},
  {id:'towpath',from:'quay',to:'orchard',name:'Long towpath',minutes:24},
  {id:'lockbridge',from:'quay',to:'orchard',name:'Lock bridge',minutes:11,crossing:true},
  {id:'east-bank',from:'clinic',to:'orchard',name:'East bank',minutes:14},
  {id:'clinic-mill',from:'clinic',to:'mill',name:'Mill rise',minutes:8},
  {id:'orchard-mill',from:'orchard',to:'mill',name:'Orchard track',minutes:8}
];
const parcels=[
  {id:'medicine',name:'Medicine case',destination:'clinic',due:55},
  {id:'fabric',name:'Fabric roll',destination:'market',due:65},
  {id:'tea',name:'Tea crate',destination:'quay',due:105},
  {id:'seeds',name:'Seed box',destination:'orchard',due:175},
  {id:'tools',name:'Tool kit',destination:'mill',due:210},
  {id:'papers',name:'Archive papers',destination:'archive',due:230}
];
const placeName=id=>places.find(p=>p.id===id)?.name;
const routeById=id=>routes.find(r=>r.id===id);
const countBag=game=>Object.values(game.parcels).filter(p=>p.owner==='bag').length;
const otherEnd=(route,location)=>route.from===location?route.to:route.from;
const difficulty=condition=>condition==='calm'?0.24:0.58;

function random(seed,...keys){
  let hash=2166136261;
  for(const letter of JSON.stringify([seed,...keys])){hash^=letter.charCodeAt(0);hash=Math.imul(hash,16777619);}
  hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;
  hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
  return(hash>>>0)/4294967296;
}
function keys(value,expected,name){
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).some(k=>!expected.includes(k))||expected.some(k=>!Object.hasOwn(value,k)))throw new Error(`Malformed ${name}`);
}
function number(value,min,max,name,integer=false){if(!Number.isFinite(value)||value<min||value>max||integer&&!Number.isSafeInteger(value))throw new Error(`Invalid ${name}`);}
function seedCheck(seed){number(seed,0,4294967295,'seed',true);}
function personSpec(action){return {actionId:action.id,targetId:action.targetId??null,durationMinutes:action.minutes,effort:action.effort??0,exertive:action.kind==='travel',activity:action.kind==='rest'?'rest':action.kind==='eat'?'meal':'active',skill:action.crossing?'routecraft':null};}

export function createGame({seed=1}={}){
  seedCheck(seed);
  return {version:HOST_VERSION,seed,clock:0,deadline:DEADLINE,status:'playing',location:'depot',meals:2,
    person:createPerson({id:'courier',body:{fatigue:0.12,hunger:0.28},skills:{routecraft:0.36}}),
    parcels:Object.fromEntries(parcels.map(p=>[p.id,{owner:'depot',deliveredAt:null}])),
    crossings:Object.fromEntries(['footbridge','lockbridge'].map(id=>[id,{condition:random(seed,'condition',id)<0.5?'calm':'exposed',trials:0,report:null}])),
    pending:null,lastEvent:{status:'ready',message:'Six parcels. Three bag slots. Deliver them before the round ends; each has its own due time.',minutes:0}};
}

function available(game){
  if(game.pending||game.status!=='playing')return [];
  const actions=[];
  for(const p of parcels){
    const held=game.parcels[p.id];
    if(game.location==='depot'&&held.owner==='depot'&&countBag(game)<BAG_CAPACITY)actions.push({id:`load-${p.id}`,kind:'load',targetId:p.id,label:`Load ${p.name.toLowerCase()}`,minutes:2,detail:`One bag slot · ${placeName(p.destination)} · due ${p.due} min.`});
    if(game.location==='depot'&&held.owner==='bag')actions.push({id:`unload-${p.id}`,kind:'unload',targetId:p.id,label:`Unload ${p.name.toLowerCase()}`,minutes:2,detail:'Leave this parcel at the depot and free one bag slot.'});
    if(game.location===p.destination&&held.owner==='bag')actions.push({id:`deliver-${p.id}`,kind:'deliver',targetId:p.id,label:`Deliver ${p.name.toLowerCase()}`,minutes:3,detail:`Hand over at ${placeName(p.destination)}. ${game.clock+3<=p.due?'Still on time.':'Late delivery still counts.'}`});
  }
  for(const route of routes.filter(r=>r.from===game.location||r.to===game.location)){
    actions.push({id:`travel-${route.id}`,kind:'travel',targetId:route.id,label:`${placeName(otherEnd(route,game.location))} via ${route.name.toLowerCase()}`,destination:otherEnd(route,game.location),minutes:route.minutes,crossing:Boolean(route.crossing),effort:route.minutes*0.004+countBag(game)*0.014,
      detail:route.crossing?'A failed crossing costs the full time and effort; you stay here with every parcel.':'Reliable route if within your effort capacity. Parcels travel with you.'});
    if(route.crossing&&!game.crossings[route.id].report)actions.push({id:`inspect-${route.id}`,kind:'inspect',targetId:route.id,label:`Inspect ${route.name.toLowerCase()}`,minutes:5,detail:'Learn the fixed condition for this round. The same report is useful from either bank.'});
  }
  actions.push({id:'rest',kind:'rest',label:'Rest here',minutes:15,detail:'Recover fatigue. Time and hunger still advance.'});
  if(game.meals>0)actions.push({id:'eat',kind:'eat',targetId:'meals',label:'Eat a packed meal',minutes:8,detail:`Reduce hunger after finishing. ${game.meals} carried meal${game.meals===1?'':'s'} left; meals use no parcel slots.`});
  return actions;
}

function projectedChance(worker,action,condition){
  const spec=personSpec(action);
  if(!assessEffort(worker.body,spec).allowed)return 0;
  let person=createPerson({id:'forecast',body:worker.body,skills:worker.skills});
  person=advanceAttempt(beginAttempt(person,spec),action.minutes);
  return estimateSuccess({skill:person.skills.routecraft,body:person.body,difficulty:condition?difficulty(condition):0.41});
}

export function getActions(game){
  const worker=getPersonView(game.person);
  return available(game).map(action=>({...clone(action),capacity:assessEffort(worker.body,personSpec(action)),
    estimatedSuccess:action.crossing?projectedChance(worker,action,game.crossings[action.targetId].report?.condition):null}));
}

export function getGameView(game){
  const delivered=parcels.filter(p=>game.parcels[p.id].deliveredAt!==null);
  return {version:HOST_VERSION,clock:game.clock,deadline:DEADLINE,remainingMinutes:DEADLINE-game.clock,status:game.status,location:game.location,meals:game.meals,bagCapacity:BAG_CAPACITY,
    worker:getPersonView(game.person),places:clone(places),routes:clone(routes),parcels:parcels.map(p=>({...clone(p),...clone(game.parcels[p.id])})),
    crossings:Object.fromEntries(Object.entries(game.crossings).map(([id,c])=>[id,{report:clone(c.report)}])),
    actions:getActions(game),pending:game.pending?{actionId:game.pending.actionId,label:game.pending.label,elapsedMinutes:game.person.pending.elapsedMinutes,totalMinutes:game.pending.durationMinutes,blocked:!game.person.pending.capacity.allowed}:null,
    summary:{delivered:delivered.length,total:parcels.length,onTime:delivered.filter(p=>game.parcels[p.id].deliveredAt<=p.due).length,late:delivered.filter(p=>game.parcels[p.id].deliveredAt>p.due).length,undelivered:parcels.length-delivered.length},lastEvent:clone(game.lastEvent)};
}

export function startAction(game,actionId){
  if(game.pending)throw new Error('An action is already pending');
  if(game.status!=='playing')throw new Error('The round is finished');
  const action=available(game).find(a=>a.id===actionId);
  if(!action)throw new Error('Action is not available here');
  const next=clone(game);next.person=beginAttempt(game.person,personSpec(action));
  const allowed=next.person.pending.capacity.allowed;
  next.pending={actionId,attemptId:next.person.pending.id,durationMinutes:allowed?action.minutes:BLOCKED_MINUTES,label:action.label};
  next.lastEvent={status:allowed?'started':'blocked',message:allowed?`${action.label} started.`:`This journey exceeds your capacity because of ${next.person.pending.capacity.causes.join(' and ')}. It costs two idle minutes, with no movement or recovery.`,minutes:0};
  return next;
}

function pendingAction(game){const base=clone(game);base.pending=null;return available(base).find(a=>a.id===game.pending.actionId);}
function settle(game,status,message){
  const next=clone(game),pending=game.pending,action=pendingAction(game);let mealConsumed=false;
  if(status==='completed'){
    if(action.kind==='travel'){
      let success=true;
      if(action.crossing){
        const crossing=next.crossings[action.targetId];
        const chance=estimateSuccess({skill:next.person.skills.routecraft,body:next.person.body,difficulty:difficulty(crossing.condition)});
        // Only a fully paid, allowed resolution consumes this crossing's trial.
        // Interrupted/blocked attempts and unrelated actions leave its draw intact.
        success=random(next.seed,'crossing-trial',action.targetId,crossing.trials)<chance;crossing.trials++;
      }
      if(success){next.location=action.destination;message=`Arrived at ${placeName(next.location)}. ${countBag(next)} parcel${countBag(next)===1?'':'s'} in your bag.`;}
      else{status='failed';message=`The crossing proved too difficult. You returned to ${placeName(next.location)} with all parcels; ${action.minutes} minutes and effort were spent. Routecraft practice remains.`;}
    }else if(action.kind==='inspect'){
      const crossing=next.crossings[action.targetId];crossing.report={condition:crossing.condition,observedAt:next.clock};
      message=`${routeById(action.targetId).name} is ${crossing.condition}. This condition stays fixed for the round; crossing estimates now use your inspection.`;
    }else if(action.kind==='load'){next.parcels[action.targetId].owner='bag';message=`${parcels.find(p=>p.id===action.targetId).name} is in your bag.`;}
    else if(action.kind==='unload'){next.parcels[action.targetId].owner='depot';message='Parcel left at the depot. One bag slot is free.';}
    else if(action.kind==='deliver'){
      const p=parcels.find(p=>p.id===action.targetId);next.parcels[p.id]={owner:p.destination,deliveredAt:next.clock};
      message=`${p.name} delivered to ${placeName(p.destination)} ${next.clock<=p.due?'on time':`${next.clock-p.due} minutes late`}.`;
    }else if(action.kind==='eat'){next.meals--;mealConsumed=true;message='Packed meal finished. Hunger eased; one meal used.';}
    else message='Rest finished. Fatigue eased; hunger and the round clock advanced.';
  }
  next.person=finishAttempt(next.person,{attemptId:pending.attemptId,status,mealConsumed});next.pending=null;
  next.lastEvent={status,message:message??'Action stopped. Elapsed costs and practice remain; unfinished parcel, movement and inspection effects do not occur.',minutes:game.person.pending.elapsedMinutes};
  if(Object.values(next.parcels).every(p=>p.deliveredAt!==null))next.status='complete';
  else if(next.clock>=DEADLINE){next.status='expired';next.lastEvent.message+=' The round has ended. Completed deliveries count.';}
  return next;
}

export function advanceTime(game,minutes){
  number(minutes,Number.MIN_VALUE,1440,'advance minutes');
  if(!game.pending)throw new Error('No pending action');
  const next=clone(game),remaining=game.pending.durationMinutes-game.person.pending.elapsedMinutes;
  const elapsed=Math.min(minutes,remaining,DEADLINE-game.clock);
  next.person=advanceAttempt(next.person,elapsed);next.clock+=elapsed;
  const blocked=!next.person.pending.capacity.allowed;
  if(next.person.pending.elapsedMinutes>=next.pending.durationMinutes||next.clock>=next.person.pending.startedAt+next.pending.durationMinutes)return settle(next,blocked?'blocked':'completed',blocked?`Journey blocked by ${next.person.pending.capacity.causes.join(' and ')} after two idle minutes. No movement, practice or recovery occurred.`:undefined);
  if(next.clock>=DEADLINE)return settle(next,blocked?'blocked':'interrupted',blocked?`The round ended during a journey blocked by ${next.person.pending.capacity.causes.join(' and ')}. Only ${next.person.pending.elapsedMinutes} idle minutes were paid; no movement or recovery occurred.`:'The round ended during this action. Its unfinished world effects did not occur.');
  return next;
}
export function finishAction(game){if(!game.pending)throw new Error('No pending action');return advanceTime(game,game.pending.durationMinutes-game.person.pending.elapsedMinutes);}
export function interruptAction(game){if(!game.pending)throw new Error('No pending action');return game.person.pending.capacity.allowed?settle(game,'interrupted'):finishAction(game);}
export function endRound(game){
  if(game.status!=='playing')return clone(game);
  const next=game.pending?interruptAction(game):clone(game);
  if(next.status==='playing'){
    next.status='ended';const delivered=Object.values(next.parcels).filter(p=>p.deliveredAt!==null).length;
    next.lastEvent={status:'ended',message:`${game.pending?next.lastEvent.message+' ':''}You ended the round. ${delivered} completed deliver${delivered===1?'y is':'ies are'} retained.`,minutes:game.pending?next.lastEvent.minutes:0};
  }
  return next;
}
export function exportGame(game){const save=clone(game);save.person=exportPerson(game.person);return save;}

export function importGame(record){
  keys(record,['version','seed','clock','deadline','status','location','meals','person','parcels','crossings','pending','lastEvent'],'courier save');
  if(JSON.stringify(record).length>16000)throw new Error('Courier save exceeds size limit');
  if(record.version!==HOST_VERSION)throw new Error('Unsupported courier save version');seedCheck(record.seed);
  const next=clone(record);next.person=restorePerson(record.person);
  number(next.clock,0,DEADLINE,'clock');number(next.meals,0,2,'meals',true);
  if(next.deadline!==DEADLINE||next.person.minutes!==next.clock||next.person.id!=='courier'||next.person.observationBias!==0)throw new Error('Invalid host/person contract');
  keys(next.person.skills,['routecraft'],'courier skills');
  if(next.person.skills.routecraft<0.36)throw new Error('Invalid routecraft baseline');
  if(!places.some(p=>p.id===next.location)||!['playing','complete','expired','ended'].includes(next.status))throw new Error('Invalid location/status');
  keys(next.parcels,parcels.map(p=>p.id),'parcels');
  for(const p of parcels){
    const held=next.parcels[p.id];keys(held,['owner','deliveredAt'],'parcel');
    if(!['depot','bag',p.destination].includes(held.owner)||(held.owner===p.destination)!==(held.deliveredAt!==null))throw new Error('Invalid parcel ownership');
    if(held.deliveredAt!==null)number(held.deliveredAt,5,next.person.pending?.startedAt??next.clock,'delivery time');
  }
  if(countBag(next)>BAG_CAPACITY)throw new Error('Overfilled parcel bag');
  const all=Object.values(next.parcels).every(p=>p.deliveredAt!==null);
  if((next.status==='complete')!==all||next.status==='expired'&&next.clock!==DEADLINE||['playing','ended'].includes(next.status)&&next.clock===DEADLINE)throw new Error('Inconsistent terminal outcome');
  keys(next.crossings,['footbridge','lockbridge'],'crossings');
  for(const [id,crossing] of Object.entries(next.crossings)){
    keys(crossing,['condition','trials','report'],'crossing');
    if(crossing.condition!==(random(next.seed,'condition',id)<0.5?'calm':'exposed'))throw new Error('Invalid crossing condition');
    number(crossing.trials,0,Math.floor(next.clock/11),'crossing trials',true);
    if(crossing.report!==null){keys(crossing.report,['condition','observedAt'],'crossing report');if(crossing.report.condition!==crossing.condition)throw new Error('Invalid observation');number(crossing.report.observedAt,5,next.person.pending?.startedAt??next.clock,'observation time');}
  }
  const committedMinutes=Object.values(next.parcels).reduce((sum,p)=>sum+(p.deliveredAt!==null?5:p.owner==='bag'?2:0),0)+
    (2-next.meals)*8+Object.values(next.crossings).reduce((sum,c)=>sum+c.trials*11+(c.report?5:0),0)+
    (next.person.pending?.elapsedMinutes??0);
  if(next.clock+1e-9<committedMinutes)throw new Error('Insufficient paid time for committed effects');
  keys(next.lastEvent,['status','message','minutes'],'last event');
  if(!['ready','started','completed','interrupted','blocked','failed','ended'].includes(next.lastEvent.status)||(next.lastEvent.status==='ended')!==(next.status==='ended')||typeof next.lastEvent.message!=='string'||next.lastEvent.message.length>650)throw new Error('Invalid event');
  number(next.lastEvent.minutes,0,24,'event minutes');
  if(Boolean(next.pending)!==Boolean(next.person.pending))throw new Error('Pending host/person mismatch');
  if(next.pending){
    keys(next.pending,['actionId','attemptId','durationMinutes','label'],'pending action');
    const action=pendingAction(next),human=next.person.pending;
    if(!action||next.status!=='playing'||next.pending.attemptId!==human.id||next.pending.label!==action.label||JSON.stringify(human.action)!==JSON.stringify(personSpec(action))||next.pending.durationMinutes!==(human.capacity.allowed?action.minutes:BLOCKED_MINUTES)||human.elapsedMinutes>=next.pending.durationMinutes)throw new Error('Invalid pending action');
  }
  return next;
}

export function applyCommand(game,command){
  if(!command||typeof command!=='object')throw new Error('Malformed command');
  if(command.type==='start'){keys(command,['type','actionId'],'start command');return startAction(game,command.actionId);}
  if(command.type==='advance'){keys(command,['type','minutes'],'advance command');return advanceTime(game,command.minutes);}
  if(command.type==='finish'){keys(command,['type'],'finish command');return finishAction(game);}
  if(command.type==='interrupt'){keys(command,['type'],'interrupt command');return interruptAction(game);}
  if(command.type==='end'){keys(command,['type'],'end command');return endRound(game);}
  throw new Error('Unknown courier command');
}
export function replaySession(record){
  keys(record,['version','seed','commands'],'courier replay');
  if(record.version!==HOST_VERSION||!Array.isArray(record.commands)||record.commands.length>10000)throw new Error('Invalid courier replay');
  return record.commands.reduce(applyCommand,createGame({seed:record.seed}));
}
