import {createPerson,getPersonView,beginAttempt,advanceAttempt,finishAttempt,exportPerson,restorePerson,assessEffort,estimateSuccess} from '../human/index.js';

export const SHIFT_VERSION='shift-0.1.0';
export const POLICIES=Object.freeze(['value-first','easy-first','all-patch']);
const DEADLINE=480,BLOCKED_MINUTES=2,copy=value=>structuredClone(value);
const JOBS=Object.freeze([
  {id:'garden',name:'Garden pump',description:'A small irrigation line. Quick access to a worn, simple seal.',basePoints:40,patch:{durationMinutes:35,effort:.17,difficulty:.32},replace:{durationMinutes:50,effort:.20,difficulty:.12},verifyMinutes:8},
  {id:'workshop',name:'Workshop pump',description:'The workshop cooling loop. A larger fitting with a longer repair.',basePoints:70,patch:{durationMinutes:55,effort:.25,difficulty:.46},replace:{durationMinutes:70,effort:.29,difficulty:.20},verifyMinutes:8},
  {id:'intake',name:'Main intake',description:'The yard’s main supply. Most service restored; the hardest seal to patch.',basePoints:100,patch:{durationMinutes:75,effort:.33,difficulty:.59},replace:{durationMinutes:95,effort:.38,difficulty:.29},verifyMinutes:8}
].map(job=>Object.freeze({...job,patch:Object.freeze(job.patch),replace:Object.freeze(job.replace)})));
const IDS=JOBS.map(j=>j.id),LOCATIONS=['depot',...IDS];
const TRAVEL=Object.freeze({depot:{garden:12,workshop:10,intake:18},garden:{depot:12,workshop:10,intake:20},workshop:{depot:10,garden:10,intake:14},intake:{depot:18,garden:20,workshop:14}});
const COMMON=Object.freeze({
 'take-tools':{label:'Take the toolkit',type:'tools',targetId:'tools',durationMinutes:6,detail:'Carry the reusable toolkit. Every repair needs it.'},
 'take-seal':{label:'Collect the spare seal',type:'seal',targetId:'seal',durationMinutes:10,detail:'Reserve the one spare. A successful replacement installs it permanently.'},
 rest:{label:'Rest here',type:'rest',durationMinutes:15,activity:'rest',detail:'Ease fatigue for 15 minutes. Hunger and the shift clock keep advancing.'},
 eat:{label:'Eat at the depot',type:'meal',targetId:'meals',durationMinutes:10,activity:'meal',detail:'Finish a meal to ease hunger. Two meals are shared across the whole shift.'}
});
function random(seed,...keys){let hash=2166136261;for(const c of JSON.stringify([seed,...keys])){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;return(hash>>>0)/4294967296;}
const condition=(seed,id)=>random(seed,'condition',id)<.5?'ordinary':'stubborn';
function requireSeed(seed){if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error('Seed must be an unsigned 32-bit integer');}
function requirePolicy(policy){if(!POLICIES.includes(policy))throw new Error('Unknown shift policy');}
function keys(value,allowed,name){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).length!==allowed.length||allowed.some(k=>!Object.hasOwn(value,k)))throw new Error(`Malformed ${name}`);}
function number(value,min,max,name){if(!Number.isFinite(value)||value<min||value>max)throw new Error(`Invalid ${name}`);}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function definition(id,location){
 if(Object.hasOwn(COMMON,id))return {id,...COMMON[id]};
 const dash=typeof id==='string'?id.indexOf('-'):-1,type=id?.slice(0,dash),targetId=id?.slice(dash+1);
 if(type==='travel'&&LOCATIONS.includes(targetId)&&TRAVEL[location]?.[targetId])return {id,type,targetId,label:`Walk to ${targetId==='depot'?'the depot':JOBS.find(j=>j.id===targetId).name.toLowerCase()}`,durationMinutes:TRAVEL[location][targetId],detail:'Carry your tools and spare. Arrival changes where you can work.'};
 const job=JOBS.find(j=>j.id===targetId);if(!job)return null;
 if(type==='inspect')return {id,type,targetId,label:'Inspect the fitting',durationMinutes:10,detail:'Reveal ordinary or stubborn condition. Refines estimates; no repair practice or score.'};
 if(type==='verify')return {id,type,targetId,label:'Verify flow',durationMinutes:8,effort:.03,exertive:true,detail:`Test the completed repair to earn ${job.basePoints} service points plus its early-service bonus.`};
 if(type==='patch'||type==='replace')return {id,type,targetId,label:type==='patch'?'Patch the seal':'Install the spare',...job[type],exertive:true,skill:'repair',verifyMinutes:8,detail:type==='patch'?'Quicker work; preserves the spare. A failed patch can be retried.':'Easier fitting, longer work. Uses the spare only if it succeeds.'};
 return null;
}
function humanAction(action){return {actionId:action.id,targetId:action.targetId??null,durationMinutes:action.durationMinutes,effort:action.effort??0,exertive:action.exertive??false,activity:action.activity??'active',skill:action.skill??null};}
function event(status,message,{minutes=0,actionId=null,skillBefore=null,skillAfter=null,practiceMinutes=0}={}){return {status,message,minutes,actionId,skillBefore,skillAfter,practiceMinutes};}
export function createShift({seed=1,policy='value-first'}={}){
 requireSeed(seed);requirePolicy(policy);
 return {version:SHIFT_VERSION,seed,policy,clock:0,deadline:DEADLINE,status:'playing',finishReason:null,location:'depot',
  person:createPerson({id:'worker',body:{fatigue:.22,hunger:.15},skills:{repair:.55}}),inventory:{tools:false,seal:0},stock:{seal:1,meals:2},
  pumps:Object.fromEntries(IDS.map(id=>[id,{status:'broken',route:null,condition:condition(seed,id),inspection:null,completedRepairs:{patch:0,replace:0},repairedAt:null,verifiedAt:null}])),pending:null,
  lastEvent:event('ready','Three pumps are down. Choose an order, share one spare, and verify useful service before the shift ends.')};
}
function availableIds(s){
 if(s.pending||s.status!=='playing')return [];
 const ids=[];
 if(s.location==='depot'){
  if(!s.inventory.tools)ids.push('take-tools');
  if(s.stock.seal&&IDS.some(id=>s.pumps[id].status==='broken'))ids.push('take-seal');
  if(s.stock.meals)ids.push('eat');
 }else{
  const p=s.pumps[s.location];
  if(p.status==='broken'){
   if(!p.inspection)ids.push(`inspect-${s.location}`);
   if(s.inventory.tools){ids.push(`patch-${s.location}`);if(s.inventory.seal)ids.push(`replace-${s.location}`);}
  }else if(p.status==='repaired')ids.push(`verify-${s.location}`);
 }
 for(const destination of LOCATIONS)if(destination!==s.location)ids.push(`travel-${destination}`);
 ids.push('rest');return ids;
}
export function getActions(s){
 const worker=getPersonView(s.person);
 return availableIds(s).map(id=>{
  const a=definition(id,s.location),capacity=assessEffort(worker.body,humanAction(a));let estimatedSuccess=null;
  if(a.skill){estimatedSuccess=0;if(capacity.allowed){const projected=advanceAttempt(beginAttempt(createPerson({id:worker.id,body:worker.body,skills:worker.skills}),humanAction(a)),a.durationMinutes),inspection=s.pumps[a.targetId].inspection;estimatedSuccess=estimateSuccess({skill:projected.skills.repair,body:projected.body,difficulty:a.difficulty+(inspection?(inspection.condition==='stubborn'?.10:0):.05)});}}
  return {...copy(a),effort:a.effort??0,capacity,estimatedSuccess};
 });
}
function score(s){let base=0,earlyBonus=0,verifiedCount=0;for(const job of JOBS){const p=s.pumps[job.id];if(p.verifiedAt!==null){base+=job.basePoints;earlyBonus+=job.basePoints*(DEADLINE-p.verifiedAt)/DEADLINE;verifiedCount++;}}return {total:base+earlyBonus,base,earlyBonus,verifiedCount,maximum:420};}
export function getShiftView(s){
 return {version:SHIFT_VERSION,clock:s.clock,deadline:DEADLINE,remainingMinutes:DEADLINE-s.clock,status:s.status,finishReason:s.finishReason,location:s.location,worker:getPersonView(s.person),inventory:copy(s.inventory),stock:copy(s.stock),
  jobs:JOBS.map(job=>{const p=s.pumps[job.id];return {...copy(job),status:p.status,route:p.route,inspection:copy(p.inspection),verifiedAt:p.verifiedAt,points:p.verifiedAt===null?0:job.basePoints*(1+(DEADLINE-p.verifiedAt)/DEADLINE)};}),score:score(s),travelMinutes:copy(TRAVEL[s.location]),actions:getActions(s),
  pending:s.pending?{actionId:s.pending.actionId,label:definition(s.pending.actionId,s.location).label,elapsedMinutes:s.person.pending.elapsedMinutes,totalMinutes:s.pending.durationMinutes,blocked:!s.person.pending.capacity.allowed}:null,lastEvent:copy(s.lastEvent)};
}
export function startAction(s,id){
 if(s.pending)throw new Error('An action is already in progress');if(s.status!=='playing')throw new Error('The shift is finished');if(!availableIds(s).includes(id))throw new Error('Action is not available: check location and prerequisites');
 const next=copy(s),a=definition(id,s.location);next.person=beginAttempt(s.person,humanAction(a));const allowed=next.person.pending.capacity.allowed;
 next.pending={actionId:id,attemptId:next.person.pending.id,durationMinutes:allowed?a.durationMinutes:BLOCKED_MINUTES};
 next.lastEvent=event(allowed?'started':'blocked',allowed?`${a.label} started.`:`This request is blocked by ${next.person.pending.capacity.causes.join(' and ')}. It costs two idle minutes, with no repair or practice.`,{actionId:id});return next;
}
function settle(s,status,message){
 const next=copy(s),pending=s.pending,a=definition(pending.actionId,s.location),before=s.person.pending.skillBefore,elapsed=s.person.pending.elapsedMinutes;let mealConsumed=false;
 if(status==='completed'){
  const p=next.pumps[a.targetId];
  if(a.type==='patch'||a.type==='replace'){
   const ordinal=p.completedRepairs[a.type]++,chance=estimateSuccess({skill:next.person.skills.repair,body:next.person.body,difficulty:a.difficulty+(p.condition==='stubborn'?.10:0)});
   if(random(next.seed,'repair',a.targetId,a.type,ordinal)<chance){p.status='repaired';p.route=a.type;p.repairedAt=next.clock;if(a.type==='replace')next.inventory.seal--;message='The fitting holds. Verify flow to restore service and earn its score.';}
   else{status='failed';message=`The seal still leaks. ${elapsed} minutes and effort were spent. Practice remains; retry, recover, or choose another job.`;}
  }else if(a.type==='inspect'){p.inspection={condition:p.condition,inspectedAt:next.clock,attemptId:pending.attemptId};message=`The fitting is ${p.condition}. The repair estimates now use this observation.`;}
  else if(a.type==='verify'){p.status='running';p.verifiedAt=next.clock;message=`${JOBS.find(j=>j.id===a.targetId).name} is running. Its service points and early bonus are secured.`;}
  else if(a.type==='travel'){next.location=a.targetId;message=`Arrived at ${a.targetId==='depot'?'the depot':JOBS.find(j=>j.id===a.targetId).name.toLowerCase()}.`;}
  else if(a.type==='tools'){next.inventory.tools=true;message='Toolkit collected. You can repair any pump.';}
  else if(a.type==='seal'){next.stock.seal--;next.inventory.seal++;message='Spare collected. Choose where to use this one easier fitting.';}
  else if(a.type==='meal'){if(next.location!=='depot'||!next.stock.meals)throw new Error('Meal is no longer accessible');next.stock.meals--;mealConsumed=true;message='Meal finished. Hunger eased; one depot meal used.';}
  else if(a.type==='rest')message='Rest completed. Fatigue eased; hunger and time advanced.';
 }
 next.person=finishAttempt(next.person,{attemptId:pending.attemptId,status,mealConsumed});next.pending=null;
 next.lastEvent=event(status,message??'Action ended.',{minutes:elapsed,actionId:a.id,skillBefore:before,skillAfter:before===null?null:next.person.skills.repair,practiceMinutes:before!==null&&s.person.pending.capacity.allowed?elapsed:0});
 if(IDS.every(id=>next.pumps[id].status==='running')){next.status='finished';next.finishReason='all-restored';}
 else if(next.clock>=DEADLINE){next.status='finished';next.finishReason='departure';}
 return next;
}
export function advanceTime(s,minutes){
 if(!Number.isFinite(minutes)||minutes<=0)throw new Error('Minutes must be positive and finite');if(!s.pending)throw new Error('No pending action');
 const next=copy(s),elapsed=Math.min(minutes,s.pending.durationMinutes-s.person.pending.elapsedMinutes,DEADLINE-s.clock);
 next.person=advanceAttempt(next.person,elapsed);next.clock+=elapsed;const blocked=!next.person.pending.capacity.allowed;
 if(next.person.pending.elapsedMinutes>=next.pending.durationMinutes||next.clock>=next.person.pending.startedAt+next.pending.durationMinutes)return settle(next,blocked?'blocked':'completed',blocked?`Blocked by ${next.person.pending.capacity.causes.join(' and ')}. Two idle minutes spent. No work or practice occurred; choose recovery or another move.`:undefined);
 if(next.clock>=DEADLINE)return settle(next,blocked?'blocked':'interrupted',blocked?`Blocked by ${next.person.pending.capacity.causes.join(' and ')}. The shift ended after ${next.person.pending.elapsedMinutes} idle minutes, with no work or practice.`:'The shift ended during this action. Paid time and practice remain; its unfinished effect does not occur.');return next;
}
export function finishAction(s){if(!s.pending)throw new Error('No pending action');return advanceTime(s,s.pending.durationMinutes-s.person.pending.elapsedMinutes);}
export function interruptAction(s,reason='You stopped the action'){
 if(!s.pending)throw new Error('No pending action');if(typeof reason!=='string'||reason.length>300)throw new Error('Interruption reason must be text under 300 characters');
 if(!s.person.pending.capacity.allowed)return finishAction(s);return settle(s,'interrupted',`${reason}. Paid time and practice remain; the unfinished effect does not occur.`);
}
export function finishShift(s){
 if(s.status!=='playing')return copy(s);let next=s.pending?interruptAction(s,'You ended the shift'):copy(s);
 if(next.status==='playing'){next.status='finished';next.finishReason='left-early';}return next;
}
// These are host heuristics over the same detached facts offered to the player.
export function chooseAction(view,policy='value-first'){
 requirePolicy(policy);if(view.status!=='playing'||view.pending)return null;
 const has=id=>view.actions.some(a=>a.id===id),find=id=>view.actions.find(a=>a.id===id),current=view.jobs.find(j=>j.id===view.location),body=view.worker.body;
 if(current?.status==='repaired'&&find(`verify-${current.id}`)?.capacity.allowed)return `verify-${current.id}`;
 if(has('take-tools'))return 'take-tools';
 if(policy!=='all-patch'&&has('take-seal'))return 'take-seal';
 const ordered=view.jobs.filter(j=>j.status!=='running').sort((a,b)=>policy==='easy-first'?a.patch.durationMinutes-b.patch.durationMinutes:b.basePoints-a.basePoints);
 const candidate=ordered.find(j=>(view.location===j.id?0:view.travelMinutes[j.id])+(j.status==='repaired'?0:j.patch.durationMinutes)+8<=view.remainingMinutes);
 if(!candidate)return null;
 const spare=policy!=='all-patch'&&view.inventory.seal&&candidate.id==='intake'&&candidate.replace.durationMinutes+8+(view.location===candidate.id?0:view.travelMinutes[candidate.id])<=view.remainingMinutes;
 const route=spare?'replace':'patch',duration=candidate.status==='repaired'?8:candidate[route].durationMinutes;
 if(body.hunger>.70||body.hunger+.002*duration>.96){
  if(has('eat'))return 'eat';if(view.stock.meals>0&&has('travel-depot'))return 'travel-depot';
  if(body.hunger+.002*duration>1)return null;
 }
 if(view.location!==candidate.id)return `travel-${candidate.id}`;
 const id=candidate.status==='repaired'?`verify-${candidate.id}`:`${route}-${candidate.id}`,a=find(id);
 if(!a)return null;if(!a.capacity.allowed||body.fatigue>.58){if(a.capacity.causes.includes('hunger'))return view.stock.meals>0?'travel-depot':null;return view.remainingMinutes>=duration+8+15?'rest':a.capacity.allowed?id:null;}
 return id;
}
export function exportShift(s){const snapshot=copy(s);snapshot.person=exportPerson(s.person);return snapshot;}
export function importShift(record){
 keys(record,['version','seed','policy','clock','deadline','status','finishReason','location','person','inventory','stock','pumps','pending','lastEvent'],'shift snapshot');
 if(record.version!==SHIFT_VERSION)throw new Error('Unsupported shift save version');requireSeed(record.seed);requirePolicy(record.policy);
 const s=copy(record);s.person=restorePerson(record.person);if(s.person.id!=='worker')throw new Error('Invalid shift worker');keys(s.person.skills,['repair'],'worker skills');
 number(s.clock,0,DEADLINE,'clock');if(s.clock!==s.person.minutes||s.deadline!==DEADLINE)throw new Error('Inconsistent host and person clock');
 if(!LOCATIONS.includes(s.location)||!['playing','finished'].includes(s.status)||![null,'all-restored','departure','left-early'].includes(s.finishReason))throw new Error('Invalid shift status or location');
 keys(s.inventory,['tools','seal'],'inventory');keys(s.stock,['seal','meals'],'stock');if(typeof s.inventory.tools!=='boolean'||![0,1].includes(s.inventory.seal)||![0,1].includes(s.stock.seal)||![0,1,2].includes(s.stock.meals))throw new Error('Invalid resources');
 keys(s.pumps,IDS,'pumps');let installed=0,minimum=(s.inventory.tools?6:0)+(s.stock.seal===0?10:0)+(2-s.stock.meals)*10,committedActions=(s.inventory.tools?1:0)+(s.stock.seal===0?1:0)+(2-s.stock.meals),visited=new Set();
 const committedBefore=s.person.pending?.startedAt??s.clock,inspectionReceipts=new Set();
 for(const job of JOBS){
  const p=s.pumps[job.id];keys(p,['status','route','condition','inspection','completedRepairs','repairedAt','verifiedAt'],'pump');keys(p.completedRepairs,['patch','replace'],'repair counters');
  if(!['broken','repaired','running'].includes(p.status)||![null,'patch','replace'].includes(p.route)||p.condition!==condition(s.seed,job.id))throw new Error('Invalid pump state');
  for(const route of ['patch','replace']){const n=p.completedRepairs[route];if(!Number.isInteger(n)||n<0||n>Math.floor(DEADLINE/job[route].durationMinutes))throw new Error('Invalid repair counter');minimum+=n*job[route].durationMinutes;committedActions+=n;if(n)visited.add(job.id);}
  if((p.status==='broken')!==(p.route===null)||(p.status==='broken')!==(p.repairedAt===null)||(p.status==='running')!==(p.verifiedAt!==null))throw new Error('Inconsistent pump outcome');
  if(p.route!==null){if(!s.inventory.tools||!p.completedRepairs[p.route])throw new Error('Repair lacks tools or paid resolution');number(p.repairedAt,6+TRAVEL.depot[job.id]+job[p.route].durationMinutes,committedBefore,'repair timestamp');if(p.route==='replace')installed++;}
  if(p.verifiedAt!==null){number(p.verifiedAt,p.repairedAt+8,committedBefore,'verification timestamp');minimum+=8;committedActions++;}
  if(p.inspection!==null){keys(p.inspection,['condition','inspectedAt','attemptId'],'inspection');const ordinal=Number(p.inspection.attemptId?.split(':')[1]);if(inspectionReceipts.has(p.inspection.attemptId)||p.inspection.condition!==p.condition||!Number.isSafeInteger(ordinal)||ordinal<2||ordinal>=s.person.nextAttempt||p.inspection.attemptId!==`worker:${ordinal}`||p.inspection.attemptId===s.person.pending?.id)throw new Error('Invalid inspection receipt');inspectionReceipts.add(p.inspection.attemptId);number(p.inspection.inspectedAt,TRAVEL.depot[job.id]+10,committedBefore,'inspection timestamp');minimum+=10;committedActions++;visited.add(job.id);}
 }
 if(s.inventory.seal+s.stock.seal+installed!==1)throw new Error('Seal conservation failed');
 if(s.location!=='depot')visited.add(s.location);
 // A minimum spanning tree is a necessary travel lower bound, regardless of order or interruptions.
 const reached=new Set(['depot']);while([...visited].some(id=>!reached.has(id))){let edge=null;for(const from of reached)for(const to of visited)if(!reached.has(to)&&(!edge||TRAVEL[from][to]<edge.cost))edge={to,cost:TRAVEL[from][to]};minimum+=edge.cost;reached.add(edge.to);committedActions++;}
 minimum+=s.person.pending?.elapsedMinutes??0;if(s.clock+1e-9<minimum||s.person.nextAttempt-1<committedActions+(s.pending?1:0))throw new Error('Insufficient elapsed time or attempts for committed effects');
 const all=IDS.every(id=>s.pumps[id].status==='running');if((s.status==='playing')!==(s.finishReason===null)||s.status==='playing'&&(s.clock===DEADLINE||all)||s.finishReason==='all-restored'&&!all||all&&s.finishReason!=='all-restored'||s.finishReason==='departure'&&s.clock!==DEADLINE||s.finishReason==='left-early'&&s.clock>=DEADLINE)throw new Error('Inconsistent terminal state');
 keys(s.lastEvent,['status','message','minutes','actionId','skillBefore','skillAfter','practiceMinutes'],'last event');const e=s.lastEvent;
 if(!['ready','started','blocked','completed','failed','interrupted'].includes(e.status)||typeof e.message!=='string'||e.message.length>700||e.actionId!==null&&(typeof e.actionId!=='string'||e.actionId.length>80))throw new Error('Invalid last event');number(e.minutes,0,DEADLINE,'event time');number(e.practiceMinutes,0,e.minutes,'practice time');for(const k of ['skillBefore','skillAfter'])if(e[k]!==null)number(e[k],0,1,k);
 if(Boolean(s.pending)!==Boolean(s.person.pending))throw new Error('Host and human pending mismatch');
 if(s.pending){keys(s.pending,['actionId','attemptId','durationMinutes'],'pending');const p=s.pending,h=s.person.pending,a=definition(p.actionId,s.location);if(!a||p.attemptId!==h.id||!equal(h.action,humanAction(a))||p.durationMinutes!==(h.capacity.allowed?a.durationMinutes:BLOCKED_MINUTES)||h.elapsedMinutes>=p.durationMinutes||s.status!=='playing')throw new Error('Invalid pending action');const check=copy(s);check.pending=null;if(!availableIds(check).includes(p.actionId))throw new Error('Pending prerequisites no longer hold');}
 return s;
}
export function applyCommand(s,command){
 if(!command||typeof command!=='object')throw new Error('Invalid command');switch(command.type){
  case 'start':keys(command,['type','actionId'],'start command');return startAction(s,command.actionId);
  case 'advance':keys(command,['type','minutes'],'advance command');return advanceTime(s,command.minutes);
  case 'finish':keys(command,['type'],'finish command');return finishAction(s);
  case 'interrupt':keys(command,['type','reason'],'interrupt command');return interruptAction(s,command.reason);
  case 'end':keys(command,['type'],'end command');return finishShift(s);
  default:throw new Error('Unknown shift command');
 }
}
export function replaySession(record){keys(record,['version','seed','policy','commands'],'session replay');if(record.version!==SHIFT_VERSION)throw new Error('Unsupported shift replay version');if(!Array.isArray(record.commands)||record.commands.length>100000)throw new Error('Invalid command log');return record.commands.reduce(applyCommand,createShift({seed:record.seed,policy:record.policy}));}
