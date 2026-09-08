import {mountPlayNote} from './play-note.js';
import {createServicePlan,getServicePlanView,exportServicePlan,SERVICE_TASKS,SERVICE_PLAN_VERSION,nextVisibleEvent} from '../src/games/service-plan.js';
import {createSession,createClinicSession,pauseSession,toggleSession,commandSession,stopSession,stepSession,tickSession,importSession,proposeSession,interruptDiscussionSession,withdrawSession,planNoteContext,serviceEventText} from './service-plan-session.js';

const $=id=>document.getElementById(id),SAVE='human-shared-promise-v1',actors=['keeper','partner'],names={keeper:'You',partner:'Deniz',world:'The day'};
const text=(id,value)=>{$(id).textContent=value;};
const node=(tag,className,value)=>{const el=document.createElement(tag);if(className)el.className=className;if(value!==undefined)el.textContent=value;return el;};
let session=createClinicSession(),lastWall=performance.now(),saveFailed=false,fallback='cart';
function notice(message){text('notice',message);$('notice').hidden=!message;}
function persist(){
 try{localStorage.setItem(SAVE,JSON.stringify(exportServicePlan(session.game)));saveFailed=false;text('save-status','Saved on this device. Reloads begin paused.');}
 catch{saveFailed=true;text('save-status','Device save unavailable. Download a save to keep this day.');}
}
function apply(update){
 const before=session.game;
 try{session=update(session);if(session.game!==before)persist();render();
  if(!before.outcome&&session.game.outcome){$('outcome').focus({preventScroll:true});$('outcome').scrollIntoView({block:'nearest',behavior:'smooth'});}
 }catch(error){session=pauseSession(session,'Paused. The action was not applied.');notice(error.message);render();}
}
const taskLabel=task=>task==='discuss'?'Discuss clinic terms':SERVICE_TASKS[task].label;
for(const actor of actors){
 for(const key of ['fatigue','hunger']){
  const label=node('label',null,key==='fatigue'?'Fatigue estimate':'Hunger estimate'),value=node('span');value.id=actor+'-'+key+'-text';
  const meter=node('meter');meter.id=actor+'-'+key;meter.min=0;meter.max=1;meter.setAttribute('aria-label',names[actor]+' '+key+' estimate');label.append(value,meter);$(actor+'-condition').append(label);
 }
 for(const [task,definition] of Object.entries(SERVICE_TASKS)){
  const button=node('button','choice');button.type='button';button.id=actor+'-'+task;
  const head=node('span','choice-heading'),title=node('span','choice-title',(actor==='partner'?'Ask: ':'')+definition.label),cost=node('span','choice-cost');cost.id=actor+'-'+task+'-cost';head.append(title,cost);
  const detail=node('span','choice-detail',definition.detail),note=node('span','choice-note');note.id=actor+'-'+task+'-reason';button.append(head,detail,note);$(actor+'-more').append(button);
  button.addEventListener('click',()=>{notice('');apply(s=>commandSession(s,actor,task));});
 }
 $(actor+'-stop').addEventListener('click',()=>{notice('');apply(s=>stopSession(s,actor));});
}
function draft(){return {pumpStartAt:Number($('pump-at').value),readyBy:Number($('ready-by').value),waitUntil:Number($('wait-until').value),fallback};}
function renderDraft(){
 const t=draft();text('proposed-summary','Proposed: after discussion, you rest until '+t.pumpStartAt+', then finish the pump by '+t.readyBy+'. Deniz waits until '+t.waitUntil+'. '+(t.fallback==='cart'?'If it is still unready, use the one-unit cart.':'If it is still unready, no cart fallback remains.'));
 $('safe-terms').setAttribute('aria-pressed',String(fallback==='cart'));$('risky-terms').setAttribute('aria-pressed',String(fallback==='none'));
}
function chooseTerms(risky){
 apply(s=>pauseSession(s,'Paused while you choose the proposed terms.'));
 fallback=risky?'none':'cart';$('pump-at').value=Math.max(session.game.clock.now+2,risky?47:39);$('ready-by').value=risky?53:45;$('wait-until').value=risky?53:45;renderDraft();
}
$('safe-terms').addEventListener('click',()=>chooseTerms(false));$('risky-terms').addEventListener('click',()=>chooseTerms(true));
for(const id of ['pump-at','ready-by','wait-until'])$(id).addEventListener('input',()=>{apply(s=>pauseSession(s,'Paused while you edit the proposed terms.'));renderDraft();});
$('propose').addEventListener('click',()=>{notice('');apply(s=>proposeSession(s,draft()));});
$('cancel-discussion').addEventListener('click',()=>{notice('');apply(interruptDiscussionSession);});
$('withdraw').addEventListener('click',()=>{notice('');apply(withdrawSession);});
$('promised-work').addEventListener('click',()=>{notice('');apply(s=>getServicePlanView(s.game).jobs.keeper?.task==='rest'?stopSession(s,'keeper'):commandSession(s,'keeper','pump'));});
function termLine(label,value){const line=node('div'),strong=node('strong',null,label+' ');line.append(strong,document.createTextNode(value));return line;}
function renderPlan(v){
 const c=v.coordination,current=c.current,pending=c.pending;
 $('plan-panel').classList.toggle('early',v.phase==='morning'&&!current&&!pending);
 const labels={active:'Accepted',delivering:'Delivery underway',fulfilled:'Delivered',expired:'Wait ended',withdrawn:'Promise withdrawn'};
 text('plan-status',current?labels[current.status]??current.status:pending?'Proposed':'No agreement');
 text('plan-current',current?'Agreement '+current.id+' · accepted at '+current.respondedAt+(current.revisionOf?' · revises '+current.revisionOf:'')+'. '+(current.closeReason??'These are the terms Deniz accepted.'):'Deniz may cart at 42. Agree a wait for your pump work.');
 $('accepted-terms').hidden=!current;$('accepted-terms').replaceChildren();
 if(current){const t=current.terms;
  $('accepted-terms').append(termLine('Your promise:', 'rest until '+t.pumpStartAt+', then finish the pump; inlet and pump ready by '+t.readyBy+'.'),termLine('Deniz agreed:', 'wait until '+t.waitUntil+'; '+(t.fallback==='cart'?'deliver if ready, otherwise take the one-unit cart.':'deliver if ready; risk losing the one-unit cart.')),termLine('Contribution:',current.contribution.status+(current.contribution.fulfilledAt!==null?' at '+current.contribution.fulfilledAt:'')+'.'+(current.actualReadyAt!==null?' Actual readiness recorded at '+current.actualReadyAt+'.':'')));
 }
 const r=c.readiness;let actual='Actually ready: '+(r.ready?'yes':'no')+' · pump '+r.pumpWork+'/'+r.pumpRequired+' min · inlet '+(r.supplyAvailable?'open':'unavailable')+'. You: '+r.keeperOwnedParts+' part'+(r.keeperOwnedParts===1?'':'s')+' available'+(r.keeperReservedParts?', '+r.keeperReservedParts+' reserved':'')+'.';
 if(c.slot)actual+=' Clinic slot: '+(c.slot.route==='cart'?'one-unit cart':'two-unit delivery')+', '+c.slot.status+'.';
 text('actual-ready',actual);
 $('pending-plan').hidden=!pending;
 if(pending){const t=pending.terms;text('pending-title',(pending.revisionOf?'Proposed revision':'Proposed terms')+' '+pending.id+' · no terms accepted yet');text('pending-detail','Proposed at '+pending.createdAt+'. Rest until '+t.pumpStartAt+'; ready by '+t.readyBy+'; wait until '+t.waitUntil+'; '+(t.fallback==='cart'?'cart fallback.':'no cart fallback.')+' Answer at '+pending.endsAt+'.'+(current?' Existing agreement '+current.id+' still applies.':''));$('discussion-progress').value=v.now-pending.createdAt;}
 $('cancel-discussion').disabled=!c.canInterrupt;
 const response=c.lastResponse;$('plan-response').hidden=!response;
 if(response){text('plan-response','Minute '+response.at+' · '+({invitation:response.accepted?'Agreed to talk':'Invitation refused',terms:response.accepted?'Terms accepted':'Terms refused',interruption:'Discussion ended',withdrawal:'Contribution withdrawn'}[response.stage]??response.stage)+': '+response.reason);$('plan-response').classList.toggle('refused',!response.accepted);}
 text('discuss-label',(current?'Discuss a revision':'Discuss a clinic plan')+' · '+c.discussionMinutes+' min each');
 text('propose',current?'Invite Deniz to revise':'Invite Deniz to discuss');$('propose').disabled=Boolean(v.outcome)||Boolean(pending);
 text('invite-reason',c.discussionAvailable?'Both people are available to consider a discussion.':c.discussionReason);
 $('withdraw').hidden=!c.canWithdraw;$('withdraw-detail').hidden=!c.canWithdraw;text('withdraw-detail','Ends your promised contribution and the agreed wait. It stops no work and does not cancel Deniz’s clinic obligation.');
 renderDraft();
}
function renderBoard(v){
 text('minute',String(v.now).padStart(2,'0'));text('objective',v.outcome?'The clinic intake has closed. The promises, work and deliveries remain in the day record.':v.phase==='morning'?'Keep morning water flowing by minute 24. Then get two units to the clinic before minute 64.':'Supply two clinic units before minute 64. Agree a wait, then do your part.');
 text('inlet-title',v.morning?v.morning.waterService?'Morning water kept':v.morning.protected?'Inlet protected · water lost':'Inlet flooded':'Keep morning water');
 text('inlet-detail','Gate '+v.work.gate+' / 12 min'+(v.work.divert===6?' · diverted':''));$('gate-progress').value=v.work.gate;
 text('clinic-title',v.delivery?v.delivery.units+' of 2 units arrived':'Two units needed');text('clinic-detail','Pump '+v.work.pump+' / 12 min'+(v.delivery?' · '+v.delivery.route:''));$('pump-progress').value=v.work.pump;
}
function mainTasks(v,actor){
 const ids=actor==='partner'?['salvage','share','pump']:v.phase==='morning'?['gate','divert']:['gate','reopen','pump','deliver','cart'];
 if(v.people[actor].body.fatigue>=.55)ids.push('rest');
 return ids.filter(task=>{const c=v.choices[actor].find(c=>c.task===task);return c&&c.code!=='ALREADY_DONE'&&!(task==='reopen'&&v.work.divert<6);});
}
function renderPeople(v){
 for(const actor of actors){const prefix=actor+'-',job=v.jobs[actor],primary=mainTasks(v,actor),p=v.people[actor];
  text(prefix+'ready',v.outcome?'Finished':job?job.task==='discuss'?'Discussing':job.origin==='own'?'Own work':'Working':'Ready');$(prefix+'ready').classList.toggle('busy',Boolean(job));
  text(prefix+'owned',v.resources.parts[actor]+' part'+(v.resources.parts[actor]===1?'':'s')+' available'+(v.resources.reservedParts[actor]?' · '+v.resources.reservedParts[actor]+' reserved':'')+' · '+v.resources.food[actor]+' meal'+(v.resources.food[actor]===1?'':'s')+' available'+(v.resources.reservedMeals[actor]?' · '+v.resources.reservedMeals[actor]+' meal reserved':''));
  for(const key of ['fatigue','hunger']){$(prefix+key).value=p.body[key];text(prefix+key+'-text',Math.round(p.body[key]*100)+'%');}
  const box=$(prefix+'job');box.replaceChildren();
  if(job){box.append(node('strong',null,(job.origin==='own'?'Chose: ':'')+taskLabel(job.task)),node('span',null,(job.endsAt-v.now)+' min left · finishes at '+job.endsAt));const bar=node('progress');bar.max=job.endsAt-job.startedAt;bar.value=v.now-job.startedAt;bar.setAttribute('aria-label',names[actor]+' current task progress');box.append(bar);}
  $(prefix+'stop').hidden=!job||job.task==='discuss'||Boolean(v.outcome);
  const response=v.lastResponse?.actor===actor&&v.lastResponse.task!=='discuss'?v.lastResponse:null;$(prefix+'response').hidden=!response;
  if(response){text(prefix+'response','Minute '+response.at+' · '+response.reason);$(prefix+'response').classList.toggle('refused',!response.accepted);}
  for(const c of v.choices[actor]){const button=$(prefix+c.task);
   button.querySelector('.choice-detail').textContent=actor==='partner'?c.detail.replaceAll('your ','their ').replaceAll('Your ','Their ').replaceAll('yours','theirs'):c.detail;
   text(prefix+c.task+'-cost',c.duration+' min'+(c.parts?' · '+c.parts+' part'+(c.parts===1?'':'s'):'')+(c.meal?' · 1 meal':''));
   text(prefix+c.task+'-reason',c.code==='CAPACITY'?'Condition estimate: demanding. Try an actual check or recover.':c.reason||(!c.capacityEstimate.allowed?'Condition estimate: recovery may be needed.':c.tooLate?'Finishes at '+c.finishesAt+'; too late for this service.':''));
   button.hidden=(c.task==='gate'&&v.work.gate===12)||(c.task==='divert'&&(v.work.divert===6||v.now>=24||v.work.gate===12))||(c.task==='reopen'&&(v.supply.reopenedAt!==null||v.now>=24&&v.work.divert<6))||(c.task==='salvage'&&!v.resources.shedAvailable)||(c.task==='meal'&&!v.resources.food[actor])||(['deliver','cart'].includes(c.task)&&Boolean(v.delivery));
   button.disabled=Boolean(v.outcome)||!c.available;button.classList.toggle('unavailable',!c.available);
   const destination=$(prefix+(primary.includes(c.task)?'choices':'more'));if(button.parentElement!==destination)destination.append(button);
  }
  const container=$(prefix+'choices');if([...container.children].map(b=>b.id).join(',')!==primary.map(task=>prefix+task).join(','))container.replaceChildren(...primary.map(task=>$(prefix+task)));
 }
 text('partner-intent',v.partnerIntent.reason);
}
function renderTime(v){
 const boundary=nextVisibleEvent(session.game),plan=v.coordination.current,pump=v.choices.keeper.find(c=>c.task==='pump');
 const due=plan?.status==='active'&&!v.coordination.readiness.ready&&v.now>=plan.terms.pumpStartAt&&(!v.jobs.keeper||v.jobs.keeper.task==='rest')&&!v.outcome;
 $('promise-action').hidden=!due;$('promised-work').disabled=v.jobs.keeper?.task==='rest'?false:!pump?.available;
 if(due){text('promise-reminder','You promised readiness by '+plan.terms.readyBy+'. Choose your work to carry it out.');text('promised-work',v.jobs.keeper?.task==='rest'?'Stop your rest to switch work':'Start your pump section · '+pump.duration+' min'+(pump.parts?' · '+pump.parts+' part':''));}
 text('time-status',session.reason);text('play',session.running?'Ⅱ Pause':'▶ Play');$('play').setAttribute('aria-pressed',String(session.running));
 for(const id of ['play','next-event','one-minute'])$(id).disabled=Boolean(v.outcome);
 text('next-event',v.outcome?'Day complete':'Next event · minute '+boundary+' →');
}
function renderOutcome(v){
 $('outcome').hidden=!v.outcome;if(!v.outcome)return;const o=v.outcome;
 text('outcome-title',o.allService?'Both services kept working.':o.clinicUnits===2?'Two clinic units arrived.':o.clinicUnits===1?'One clinic unit arrived.':'The clinic received no delivery.');
 text('outcome-detail',(o.morningWater?'Morning water service continued. ':'Morning water service was lost. ')+(o.clinicUnits===2?'Full clinic supply arrived through the inlet.':o.clinicUnits===1?'The cart supplied one of two requested units.':'Neither requested unit arrived before closing.')+' An agreement counts as delivery only when the water arrives.');$('outcome').classList.toggle('failure',!o.allService);
}
function render(){
 const v=getServicePlanView(session.game);renderBoard(v);renderPlan(v);renderPeople(v);renderTime(v);renderOutcome(v);
 $('journal').replaceChildren();for(const row of [...v.recent].reverse()){const li=node('li'),time=node('time',null,'+'+row.at+'m'),body=node('span'),name=node('strong',null,(names[row.actor]??row.actor)+' · ');body.append(name,document.createTextNode(serviceEventText(v,row)));li.append(time,body);$('journal').append(li);}
 text('researcher','Host '+v.version+'; Human/runtime '+v.humanVersion+'/'+v.runtimeVersion+'; clock '+v.clockVersion+'. '+v.remainingCommands+' player commands remain. Discussion paid: you '+v.paidByActor.keeper.discuss+' min, Deniz '+v.paidByActor.partner.discuss+' min. '+v.coordination.acceptanceRule);
 if(saveFailed)text('save-status','Device save unavailable. Download a save to keep this day.');
}
$('one-minute').addEventListener('click',()=>apply(s=>stepSession(s,'minute')));$('next-event').addEventListener('click',()=>apply(s=>stepSession(s)));
$('play').addEventListener('click',()=>{lastWall=performance.now();apply(toggleSession);});$('speed').addEventListener('change',()=>{lastWall=performance.now();apply(s=>pauseSession(s,'Speed changed. Press Play when ready.'));});
$('restart').addEventListener('click',()=>{notice('');apply(()=>$('start-mode').value==='clinic'?createClinicSession():createSession(createServicePlan()));$('new-day').open=false;window.scrollTo({top:0,behavior:'smooth'});});$('try-again').addEventListener('click',()=>{$('new-day').open=true;});
for(const details of document.querySelectorAll('details'))details.addEventListener('toggle',()=>{if(details.open)apply(s=>pauseSession(s,'Paused while you read or choose.'));});
$('download').addEventListener('click',()=>{apply(s=>pauseSession(s,'Paused for download. Your saved day resumes paused.'));try{const url=URL.createObjectURL(new Blob([JSON.stringify(exportServicePlan(session.game),null,2)],{type:'application/json'})),a=node('a');a.href=url;a.download='shared-promise-minute-'+session.game.clock.now+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){notice('Save could not be downloaded: '+error.message);}});
$('load').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;apply(s=>pauseSession(s,'Paused for import.'));try{if(file.size>65536)throw new Error('This file is too large for a shared-promise save.');const loaded=importSession(session,await file.text());notice('');apply(()=>loaded);}catch(error){notice('Save was not loaded: '+error.message);}event.target.value='';});
function leave(){lastWall=performance.now();session=pauseSession(session,'Paused because you left this tab. Press Play when you return.');persist();render();}
window.addEventListener('pagehide',leave);document.addEventListener('visibilitychange',()=>{lastWall=performance.now();if(document.hidden)leave();});
setInterval(()=>{const now=performance.now(),elapsed=now-lastWall;lastWall=now;if(session.running&&!document.hidden)apply(s=>tickSession(s,elapsed,Number($('speed').value)));},250);
try{const raw=localStorage.getItem(SAVE);if(raw)session=importSession(session,raw);}catch(error){notice('The stored day could not be loaded ('+error.message+'). A fresh paused day is ready.');}
render();mountPlayNote({container:document.querySelector('main'),game:{id:'service-plan',title:'A Shared Promise',version:SERVICE_PLAN_VERSION},hasCompanion:true,onOpen:()=>apply(s=>pauseSession(s,'Paused while you write a play note.')),getContext:()=>planNoteContext(session.game)});
