import {createExperimentActor,performExperimentAction} from './actor.js';
import {deliverExperienceMessage,receiveExperienceEpisode,getExperienceView} from '../../experience/workspace.js';
import {createInstitution,requestAccess,advanceInstitution,getInstitutionOffer} from '../../institution/access.js';

const VERSION=1,FORMAT='human-framework-maintenance-experiment';
const ID='maker',PEER='peer',DEADLINE=30,MAX_COMMANDS=32;
const copy=value=>structuredClone(value);
const now=state=>state.workspace.actor.person.sustained.situated.now;
const variantWorld={workshop:[{fitStandard:false,peerHold:9},{fitStandard:true,peerHold:0},{fitStandard:false,peerHold:12}],dispatch:[{stock:false,aFault:'bypass',bFault:'reset'},{stock:true,aFault:'standard',bFault:'reset'},{stock:false,aFault:'bypass',bFault:'replace'}]};
const ids=['read','prepare','request_machine','wait_5','read_notice','assemble_machine','assemble_hand','assemble_adjusted','read_stock','read_stock_update','inspect_a','inspect_b','repair_a','repair_b','end_shift'];
function checkedKind(kind,variant){if(!Object.hasOwn(variantWorld,kind)||!Number.isInteger(variant)||variant<0||variant>2)throw Error('Invalid experiment kind or variation');}
function message(id,propositionId,value,correctsReceiptId=null){return {messageId:id,contextId:'dispatch',propositionId,sourceId:'dispatcher',originId:'dispatcher',value,occurredAt:0,deliveredAt:0,expiresAt:100,correctsReceiptId};}
function createBase(kind,variant){
 checkedKind(kind,variant);
 const props=kind==='workshop'?['fitReliable']:['stockAvailable','rapidMethod'];
 const contexts=kind==='workshop'?['workshop']:['dispatch'];
 const rules=kind==='dispatch'?[{ruleId:'stock-route',when:[{propositionId:'stockAvailable',value:true}],then:{propositionId:'rapidMethod',value:true}}]:[];
 const {workspace:initial,catalog}=createExperimentActor({id:ID,actors:[ID,PEER,'dispatcher'],purposeIds:['finish'],actionIds:ids,propositionIds:props,contextIds:contexts,rules});
 let workspace=initial;
 if(kind==='workshop'){
  workspace=receiveExperienceEpisode(workspace,{episodeId:'earlier-fit',eventId:'earlier-job',contextId:'workshop',sourceId:ID,originId:ID,occurredAt:0,receivedAt:0,expiresAt:100,actionId:'assemble_machine',outcomeId:'failed-fit',facts:[{propositionId:'fitReliable',value:false}],correctsEpisodeId:null},catalog);
  workspace=deliverExperienceMessage(workspace,{messageId:'tool_notice',contextId:'workshop',propositionId:'fitReliable',sourceId:PEER,originId:PEER,value:variant===1,occurredAt:0,deliveredAt:0,expiresAt:100,correctsReceiptId:null},catalog);
 }else{
  workspace=deliverExperienceMessage(workspace,message('stock','stockAvailable',variant!==1),catalog);
  workspace=deliverExperienceMessage(workspace,message('stock_update','stockAvailable',variant===1,'stock'),catalog);
 }
 let institution=null;
 if(kind==='workshop'){
  institution=createInstitution({facilityId:'shared_tool',actors:[ID,PEER],grants:[ID,PEER],now:0,maxHoldMinutes:20,maxRequests:8});
  const hold=variantWorld.workshop[variant].peerHold;
  if(hold)institution=requestAccess(institution,{actorId:PEER,requestId:'peer_shift',holdMinutes:hold}).state;
 }
 return {format:FORMAT,version:VERSION,kind,variant,commands:[],workspace,institution,world:{completed:0,failed:0},history:[],prepared:false,observed:[],requested:false};
}
function actorView(s){return getExperienceView(s.workspace,s.catalog,{contextId:s.kind==='workshop'?'workshop':'dispatch'});}
function withCatalog(s){return {...s,catalog:{actors:[ID,PEER,'dispatcher'],facts:[],purposes:['finish'],commitments:[],actions:ids}};}
function knowledge(s){const v=actorView(s);return {v,rapid:v.reasoning.conclusions.find(c=>c.propositionId==='rapidMethod')?.status==='true',stockFalse:v.reasoning.conclusions.find(c=>c.propositionId==='stockAvailable')?.status==='false'};}
function observedFault(s,job){const episode=actorView(s).memories.episodes.find(e=>e.eventId.startsWith(`job${job}event`)&&e.outcomeId.startsWith('observed-'));return episode?.outcomeId.slice('observed-'.length)??null;}
function reportText(message){
 if(message.messageId==='tool_notice')return `Peer tool notice: standard fit ${message.value?'worked':'failed'} on their last piece.`;
 if(message.messageId==='stock_update')return `Dispatcher correction: standard part ${message.value?'available':'unavailable'} for job A.`;
 return `Original dispatcher stock report: standard part ${message.value?'available':'unavailable'} for job A.`;
}
function offers(s){
 const time=now(s),finish=s.world.completed>=(s.kind==='workshop'?1:2)||time>=DEADLINE;
 const opts=[];
 const add=(id,label,minutes,description,blocked=false,reason='')=>opts.push({id,label,minutes,description,disabled:finish||blocked||time+minutes>DEADLINE,reason:finish?'Session finished':time+minutes>DEADLINE?'Past deadline':blocked?reason:''});
 if(s.kind==='workshop'){
  const offer=getInstitutionOffer(s.institution,ID),prior=knowledge(s).v.memories.episodes.some(e=>e.outcomeId==='failed-fit');
  add('prepare','Prepare materials',3,'Sort and mark the pieces before assembly.',s.prepared,'Already prepared');
  add('request_machine','Request shared tool',1,'Spend one minute to join the reservation queue.',s.requested,'Request already placed');
  add('wait_5','Wait five minutes',5,'Let the shared tool queue advance.');
  add('read_notice','Read tool notice',2,'Spend two minutes to inspect the peer notice.',s.workspace.attention.processings.some(p=>p.messageId==='tool_notice'),'Notice already read');
  add('assemble_machine','Assemble with shared tool',8,prior?'Earlier use failed on fit; this method may repeat that failure.':'Fast assembly requires a current reservation.',!s.prepared||!offer.hasReservation,!s.prepared?'Prepare the materials first':'Wait for your reservation');
  add('assemble_hand','Assemble by hand',12,'Use the slower hand method after preparation.',!s.prepared,'Prepare the materials first');
  add('assemble_adjusted','Adjust tool fit and assemble',9,'Use the shared tool with an adjusted fit. Requires a reservation through all 9 minutes.',!s.prepared||!offer.hasReservation,!s.prepared?'Prepare the materials first':'Wait for your reservation');
 }else{
  const {rapid,stockFalse}=knowledge(s),correctionRead=s.workspace.attention.processings.some(p=>p.messageId==='stock_update');
  add('read_stock','Read stock report',2,'Spend two minutes reading the original parts report.',s.workspace.attention.processings.some(p=>p.messageId==='stock'),'Report already read');
  add('read_stock_update','Read stock correction',2,'Spend two minutes reading the corrected parts report.',!s.workspace.attention.processings.some(p=>p.messageId==='stock')||s.workspace.attention.processings.some(p=>p.messageId==='stock_update'),'Read original report first, or correction already read');
  for(const job of ['a','b']){
   add(`inspect_${job}`,`Inspect job ${job.toUpperCase()}`,3,'Paid inspection records the observed fault.',s.observed.includes(job)||s.observed.includes(`done_${job}`),'Already inspected or completed');
   const fault=observedFault(s,job);
   add(`repair_${job}`,`Repair job ${job.toUpperCase()}`,6,fault?`Inspection supports the ${fault} method.`:job==='a'?(stockFalse?`${correctionRead?'The read correction':'The original read report'} favors the alternate part method.`:rapid?'The read report suggests the rapid part method.':'Choose now or inspect the fault first.'):'Choose now or inspect the fault first.',s.observed.includes(`done_${job}`),'Job already completed');
  }
 }
 add('end_shift','End shift',DEADLINE-time,`Account for the remaining ${DEADLINE-time} minutes and close the shift.`);
 return opts;
}
function appendEpisode(s,job,outcome,propositionId,value){
 const at=now(s),n=s.history.length+1;
 s.workspace=receiveExperienceEpisode(s.workspace,{episodeId:`event${n}`,eventId:`job${job}event${n}`,contextId:s.kind==='workshop'?'workshop':'dispatch',sourceId:ID,originId:ID,occurredAt:at,receivedAt:at,expiresAt:100,actionId:s.kind==='workshop'?'assemble_machine':`repair_${job}`,outcomeId:outcome,facts:[{propositionId,value}],correctsEpisodeId:null},s.catalog);
}
function apply(s,id){
 const offer=offers(s).find(a=>a.id===id);if(!offer||offer.disabled)throw Error(`Action unavailable: ${id}`);
 const at=now(s),world=variantWorld[s.kind][s.variant],note=[];
 let status='completed',messageId=null;
 if(id==='read_notice')messageId='tool_notice';
 if(id==='read_stock')messageId='stock';
 if(id==='read_stock_update')messageId='stock_update';
 if(s.kind==='workshop'){
  if((id==='assemble_machine'||id==='assemble_adjusted')&&getInstitutionOffer(s.institution,ID).expiresAt<at+offer.minutes)status='failed';
  if(id==='assemble_machine'&&!world.fitStandard)status='failed';
 }else if(id.startsWith('repair_')){
  const job=id.at(-1),{rapid,stockFalse}=knowledge(s);
  const method=observedFault(s,job)??(job==='a'?(stockFalse?'bypass':rapid?'standard':'standard'):'reset');
  if(method!==world[`${job}Fault`]||(job==='a'&&method==='standard'&&!world.stock))status='failed';
 }
 s.workspace=performExperimentAction(s.workspace,s.catalog,{actionId:messageId?'read':id,minutes:offer.minutes,status,messageId,purposeId:'finish'});
 if(s.institution)s.institution=advanceInstitution(s.institution,now(s));
 if(id==='request_machine'){
  const result=requestAccess(s.institution,{actorId:ID,requestId:'maker_request',holdMinutes:20});s.institution=result.state;s.requested=true;note.push(result.decision==='queued'?'Joined the queue.':'Reservation granted.');
 }else if(id==='prepare'){s.prepared=true;note.push('Materials prepared.');}
 else if(id.startsWith('inspect_')){const job=id.at(-1);s.observed.push(job);appendEpisode(s,job,`observed-${world[`${job}Fault`]}`,s.kind==='dispatch'?'stockAvailable':'fitReliable',s.kind==='dispatch'?world.stock:world.fitStandard);note.push(`Inspection of job ${job.toUpperCase()} recorded the fault.`);}
 else if(id.startsWith('assemble_')||id.startsWith('repair_')){
  const job=id.at(-1);
  if(status==='completed'){s.world.completed++;if(s.kind==='dispatch')s.observed.push(`done_${job}`);note.push('Work completed.');}
  else{s.world.failed++;note.push('Attempt failed after paid work.');appendEpisode(s,job,'failed-attempt',s.kind==='workshop'?'fitReliable':'stockAvailable',s.kind==='workshop'?false:world.stock);}
 }else if(id.startsWith('read_'))note.push(reportText(s.workspace.attention.messages.find(m=>m.messageId===messageId)));
 else if(id==='end_shift')note.push('The remaining shift passed without another completed job.');
 else note.push('Time passed.');
 s.history.push({at,text:`${offer.label}: ${note.join(' ')}`});
 s.commands.push(id);
 return s;
}
function replay(kind,variant,commands){let s=withCatalog(createBase(kind,variant));for(const id of commands)apply(s,id);delete s.catalog;return s;}
function commandsOf(value){if(!value||typeof value!=='object'||!Array.isArray(value.commands)||value.commands.length>MAX_COMMANDS||value.commands.some(id=>typeof id!=='string'||!ids.includes(id)))throw Error('Invalid command history');return value.commands;}
export function createWorkshop(kind='workshop',variant=0){return replay(kind,variant,[]);}
export function chooseWorkshop(state,actionId){const commands=commandsOf(state);checkedKind(state.kind,state.variant);if(commands.length>=MAX_COMMANDS)throw Error('Session command limit reached');return replay(state.kind,state.variant,[...commands,actionId]);}
export function getWorkshopView(state){
 const s=withCatalog(replay(state.kind,state.variant,commandsOf(state))),time=now(s),v=actorView(s),finished=s.world.completed>=(s.kind==='workshop'?1:2)||time>=DEADLINE;
 const inbox=v.inbox.messages.map(m=>({id:m.messageId,label:m.messageId==='tool_notice'?'Tool notice':m.messageId==='stock_update'?'Stock correction':'Stock report',text:m.processedAt===null?null:reportText(s.workspace.attention.messages.find(x=>x.messageId===m.messageId))}));
 const facts=[];
 if(s.kind==='workshop'){
  if(v.memories.episodes.some(e=>e.outcomeId==='failed-fit'))facts.push('You remember an earlier machine fit failure.');
  const grant=getInstitutionOffer(s.institution,ID);
  facts.push(grant.hasReservation?`Your tool reservation expires at minute ${grant.expiresAt}.`:grant.queuePosition?`You are position ${grant.queuePosition} in the tool queue.`:grant.available?'Shared tool available for request.':'The peer holds the shared tool.');
  if(s.prepared)facts.push('Materials are prepared.');
 }else{
  for(const job of ['a','b']){const fault=observedFault(s,job);if(fault)facts.push(`Job ${job.toUpperCase()} inspection: ${fault==='replace'?'replacement':fault} method indicated.`);}
  for(const c of v.reasoning.conclusions){
   if(c.propositionId==='stockAvailable'&&c.status==='true')facts.push('Read reports indicate the standard part is available for job A.');
   if(c.propositionId==='stockAvailable'&&c.status==='false')facts.push(`${s.workspace.attention.processings.some(p=>p.messageId==='stock_update')?'The read correction':'The original read report'} says the standard part is unavailable for job A.`);
   if(c.propositionId==='rapidMethod'&&c.status==='true')facts.push('The read stock report supports trying the standard part method for job A.');
  }
 }
 const title=s.kind==='workshop'?'Shared workshop':'Repair dispatch';
 const last=s.history.at(-1)?.text??'Choose the next paid action.';
 const summary=finished?`${s.world.completed>=(s.kind==='workshop'?1:2)?'Work complete.':'Shift deadline reached.'} ${last}`:last;
 return {kind:s.kind,title,subtitle:s.kind==='workshop'?'One shared tool, one finished piece':'Two repair jobs, reports may be corrected',objective:s.kind==='workshop'?'Finish one piece before minute 30.':'Finish both repairs before minute 30.',now:time,deadline:DEADLINE,finished,summary,metrics:[{label:'Completed',value:s.world.completed},{label:'Failed attempts',value:s.world.failed},{label:'Minutes left',value:DEADLINE-time}],facts,messages:inbox,actions:offers(s),history:copy(s.history),scene:{location:s.kind==='workshop'?'Shared workshop':'Repair desk',people:[{name:'You',status:finished?'Shift ended':'Working'},{name:s.kind==='workshop'?'Peer':'Dispatcher',status:s.kind==='workshop'?(s.institution.active?.actorId===PEER?'Using tool':'Available'):'Reports delivered'}],objects:s.kind==='workshop'?[{name:'Shared tool',status:s.institution.active?.actorId===ID?'Reserved for you':s.institution.active?.actorId===PEER?'Held by peer':'Free'},{name:'Materials',status:s.prepared?'Prepared':'Unprepared'}]:[{name:'Job A',status:s.observed.includes('done_a')?'Complete':'Open'},{name:'Job B',status:s.observed.includes('done_b')?'Complete':'Open'}]}};
}
export function exportWorkshop(state){const canonical=replay(state.kind,state.variant,commandsOf(state));return copy({format:FORMAT,version:VERSION,state:canonical});}
export function restoreWorkshop(snapshot){if(!snapshot||snapshot.format!==FORMAT||snapshot.version!==VERSION||!snapshot.state)throw Error('Invalid experiment snapshot');const canonical=replay(snapshot.state.kind,snapshot.state.variant,commandsOf(snapshot.state));if(JSON.stringify(snapshot.state)!==JSON.stringify(canonical))throw Error('Experiment snapshot does not match command history');return canonical;}
