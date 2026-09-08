import {mountPlayNote} from './play-note.js';
import {createService,getServiceView,exportService,SERVICE_TASKS,SERVICE_VERSION,nextVisibleEvent} from '../src/games/service.js';
import {createSession,pauseSession,toggleSession,commandSession,stopSession,stepSession,tickSession,importSession} from './service-session.js';

const $=id=>document.getElementById(id),SAVE='human-service-day-v1';
const actors=['keeper','partner'],names={keeper:'You',partner:'Deniz',world:'The service day'};
const text=(id,value)=>{$(id).textContent=value;};
const node=(tag,className,value)=>{const e=document.createElement(tag);if(className)e.className=className;if(value!==undefined)e.textContent=value;return e;};
let session=createSession(),lastWall=performance.now(),saveFailed=false;
function notice(message){text('notice',message);$('notice').hidden=!message;}
function persist(){
 try{localStorage.setItem(SAVE,JSON.stringify(exportService(session.game)));saveFailed=false;text('save-status','Saved on this device. Reloads begin paused.');}
 catch{saveFailed=true;text('save-status','Device save unavailable. Download a save to keep this day.');}
}
function apply(update){
 const before=session.game;
 try{
  session=update(session);if(session.game!==before)persist();render();
  if(!before.outcome&&session.game.outcome){$('outcome').focus({preventScroll:true});$('outcome').scrollIntoView({block:'nearest',behavior:'smooth'});}
 }catch(error){session=pauseSession(session,'Paused. The action was not applied.');notice(error.message);render();}
}
for(const actor of actors){
 for(const key of ['fatigue','hunger']){
  const label=node('label',null,key==='fatigue'?'Fatigue estimate':'Hunger estimate'),value=node('span');
  value.id=actor+'-'+key+'-text';const meter=node('meter');meter.id=actor+'-'+key;meter.min=0;meter.max=1;meter.setAttribute('aria-label',names[actor]+' '+key+' estimate');label.append(value,meter);$(actor+'-condition').append(label);
 }
 for(const [task,definition] of Object.entries(SERVICE_TASKS)){
  const button=node('button','choice');button.type='button';button.id=actor+'-'+task;
  const head=node('span','choice-heading'),title=node('span','choice-title',(actor==='partner'?'Ask: ':'')+definition.label),cost=node('span','choice-cost');
  cost.id=actor+'-'+task+'-cost';head.append(title,cost);
  const detail=node('span','choice-detail',definition.detail),note=node('span','choice-note');note.id=actor+'-'+task+'-reason';
  button.append(head,detail,note);$(actor+'-more').append(button);
  button.addEventListener('click',()=>{notice('');apply(s=>commandSession(s,actor,task));});
 }
 $(actor+'-stop').addEventListener('click',()=>{notice('');apply(s=>stopSession(s,actor));});
}
for(const [id,label,max] of [['inlet','Morning inlet',12],['clinic','Clinic intake',12]]){
 const li=node('li'),strong=node('strong'),detail=node('span');li.id='milestone-'+id;strong.id='milestone-'+id+'-title';detail.id='milestone-'+id+'-detail';li.append(strong,detail);$('day-line').append(li);
 const site=node('article','site');site.id='site-'+id;
 const title=node('div','site-title'),name=node('strong',null,label),value=node('span');value.id=id+'-value';title.append(name,value);
 const progress=node('progress');progress.id=id+'-progress';progress.max=max;progress.value=0;progress.setAttribute('aria-label',label+' repair progress');
 const description=node('p');description.id=id+'-detail';site.append(title,progress,description);$('sites').append(site);
}
function renderBoard(v){
 text('minute',String(v.now).padStart(2,'0'));text('objective',v.outcome?'The clinic intake is closed. Review the morning service and clinic delivery below.':v.objective);text('phase-label',v.phase==='morning'?'Morning · inlet first':v.phase==='clinic'?'Afternoon · clinic next':'Both obligations settled');
 const firstPending=v.milestones.find(m=>m.status==='pending');
 for(const m of v.milestones){
  text('milestone-'+m.id+'-title',m.label+' · minute '+m.at);
  const result=m.id==='inlet'&&v.morning?(v.morning.waterService?'Protected · morning water kept':v.morning.protected?'Protected · morning water lost':'Flooded · morning water lost'):m.id==='clinic'&&v.outcome?v.outcome.clinicUnits+' of 2 units supplied':m.id==='inlet'?'Keep morning water or divert':'Supply 2 units with the remaining kit';
  text('milestone-'+m.id+'-detail',result);$('milestone-'+m.id).classList.toggle('complete',m.status==='settled');$('milestone-'+m.id).classList.toggle('current',firstPending?.id===m.id);
 }
 text('inlet-value',v.work.gate+' / 12 min gate');$('inlet-progress').value=v.work.gate;
 text('inlet-detail',v.morning?(v.morning.waterService?'Morning service kept. ':v.morning.protected?'Diversion protected the inlet; morning service lost. ':'Morning surge flooded the inlet. ')+(v.supply.available?'Inlet supplies the clinic.':v.work.divert===6?'Reopen for the clinic: 3 min.':'Finish the gate to restore clinic supply.'):'Gate: 2 parts. Or divert: 6 min, 1 part; reopen after 24.');
 text('clinic-value',v.delivery?v.delivery.units+' / 2 units':v.work.pump+' / 12 min pump');$('clinic-progress').value=v.work.pump;
 text('clinic-detail',v.delivery?(v.delivery.route==='cart'?'Cart delivered 1 unit.':'Pipe delivery supplied 2 units.'):'Pump: 2 parts, then deliver 6 min. Or cart: 18 min, 1 unit.');
 $('site-inlet').classList.toggle('completed',Boolean(v.morning?.protected));$('site-inlet').classList.toggle('failed',Boolean(v.morning&&!v.morning.protected));$('site-clinic').classList.toggle('completed',Boolean(v.delivery));
}
function mainTasks(v,actor){
 const recovery=v.people[actor].body.hunger>=.8&&v.resources.food[actor]>0?'meal':v.people[actor].body.fatigue>=.55?'rest':null;
 const work=actor==='partner'?['salvage','share','pump']:v.phase==='morning'?['gate','divert']:[...(v.work.divert<6&&v.work.gate<12?['gate']:[]),'reopen','pump','deliver','cart'];
 return [...work,...(recovery?[recovery]:[])].filter(task=>{const c=v.choices[actor].find(c=>c.task===task);return c&&c.code!=='ALREADY_DONE'&&!(task==='reopen'&&v.work.divert<6);});
}
function renderPeople(v){
 for(const actor of actors){
  const p=v.people[actor],job=v.jobs[actor],prefix=actor+'-',primary=mainTasks(v,actor);
  text(prefix+'name',v.actors[actor].name);text(prefix+'ready',v.outcome?'Finished':job?job.origin==='own'?'Own work':'Working':'Ready');$(prefix+'ready').classList.toggle('busy',Boolean(job));
  const parts=v.resources.parts[actor],food=v.resources.food[actor],reserved=v.resources.reservedParts[actor],meal=v.resources.reservedMeals[actor];
  text(prefix+'owned',parts+' part'+(parts===1?'':'s')+' available'+(reserved?' · '+reserved+' reserved':'')+' · '+food+' meal'+(food===1?'':'s')+(meal?' · meal reserved':''));
  for(const key of ['fatigue','hunger']){$(prefix+key).value=p.body[key];text(prefix+key+'-text',Math.round(p.body[key]*100)+'%');}
  text(prefix+'job',v.outcome?'The day is complete':job?(job.origin==='own'?'Chose: ':'')+SERVICE_TASKS[job.task].label:actor==='keeper'?'Ready for your next choice':'Keeping a clinic commitment');
  text(prefix+'timing',job?(job.endsAt-v.now)+' min left · finishes at '+job.endsAt+(actor==='partner'&&job.origin==='own'?'. '+v.partnerIntent.reason:''):actor==='partner'?v.partnerIntent.reason:'Choosing uses no time. Work starts when you advance.');
  $(prefix+'progress').max=job?job.endsAt-job.startedAt:1;$(prefix+'progress').value=job?v.now-job.startedAt:0;$(prefix+'stop').hidden=!job||Boolean(v.outcome);
  const response=v.lastResponse?.actor===actor?v.lastResponse:null;$(prefix+'response').hidden=!response;
  if(response){text(prefix+'response','Minute '+response.at+' · '+(actor==='partner'?(response.accepted?'Accepted · ':'Refused · '):'')+response.reason);$(prefix+'response').classList.toggle('refused',!response.accepted);}
  for(const c of v.choices[actor]){
   const button=$(prefix+c.task);button.querySelector('.choice-detail').textContent=actor==='partner'?c.detail.replaceAll('your ', 'their ').replaceAll('Your ', 'Their ').replaceAll('yours', 'theirs'):c.detail;
   text(prefix+c.task+'-cost',c.duration+' min'+(c.parts?' · '+c.parts+' part'+(c.parts===1?'':'s'):'')+(c.meal?' · 1 meal':''));
   const capacityWarning=!c.capacityEstimate.allowed;
   const reason=c.code==='CAPACITY'?'Condition estimate: this may be too demanding. Try an actual check, or recover.':c.reason||(!c.available?'Unavailable':'');
   text(prefix+c.task+'-reason',reason||(capacityWarning?'Condition estimate: recovery may be needed. You can try for an actual check.':c.tooLate?'Finishes at '+c.finishesAt+'; too late for this service.':''));
   button.hidden=(c.task==='gate'&&v.work.gate===12)||(c.task==='divert'&&(v.work.divert===6||v.now>=24||v.work.gate===12))||(c.task==='reopen'&&(v.supply.reopenedAt!==null||v.now>=24&&v.work.divert<6))||(c.task==='salvage'&&!v.resources.shedAvailable)||(c.task==='meal'&&v.resources.food[actor]===0)||(['deliver','cart'].includes(c.task)&&Boolean(v.delivery));
   button.disabled=Boolean(v.outcome)||!c.available;button.classList.toggle('unavailable',!c.available);button.classList.toggle('capacity',capacityWarning&&c.available);
   const destination=$(prefix+(primary.includes(c.task)?'choices':'more'));if(button.parentElement!==destination)destination.append(button);
  }
  // Keep the visible work order stable across playback frames and preserve focus.
  const container=$(prefix+'choices');if([...container.children].map(b=>b.id).join(',')!==primary.map(task=>prefix+task).join(','))container.replaceChildren(...primary.map(task=>$(prefix+task)));
 }
}
function renderTime(v){
 const boundary=nextVisibleEvent(session.game),jobs=Object.values(v.jobs).filter(Boolean),jobAt=jobs.some(j=>j.endsAt===boundary),milestone=v.milestones.find(m=>m.status==='pending'&&m.at===boundary);
 text('time-mode',session.running?'Running':'Paused');text('time-status',session.reason);text('play',session.running?'Ⅱ Pause':'▶ Play');$('play').setAttribute('aria-pressed',String(session.running));
 for(const id of ['play','next-event','one-minute'])$(id).disabled=Boolean(v.outcome);
 const label=v.outcome?'Day complete':jobAt?'Finish work at '+boundary+' →':milestone?'Wait to '+milestone.label.toLowerCase()+' →':'Next decision at '+boundary+' →';
 text('next-event',label);$('next-event').classList.toggle('primary',jobs.length>0);
 text('next-explanation',v.outcome?'Both service outcomes are final.':jobs.length?'Both people advance together. Next visible boundary: minute '+boundary+'.':'You have no job underway. Advancing spends time; Deniz may choose their own work.');
}
function renderCarryover(v){
 $('carryover-panel').hidden=!v.morning;
 if(!v.morning)return;
 text('carryover-detail',v.morning.waterService?'The inlet held and morning water service continued. Both people now face the clinic intake.':v.morning.protected?'The diversion protected the inlet but cost morning water service. Reopening can restore the clinic supply.':'Morning service was lost. Completed work remains; restoring the gate can still help the clinic.');
 $('carryover-facts').replaceChildren();
 const lines=[v.resources.installedParts+' installed parts remain in the work; '+(v.resources.shedAvailable?'the shed spare is still available.':Object.values(v.jobs).some(j=>j?.task==='salvage')?'the shed spare is being fetched.':'the shed spare has been collected.'),...actors.map(a=>names[a]+': '+v.resources.parts[a]+' available parts, '+v.resources.food[a]+' meals; fatigue '+Math.round(v.people[a].body.fatigue*100)+'%, hunger '+Math.round(v.people[a].body.hunger*100)+'% (current estimates).')];
 for(const line of lines)$('carryover-facts').append(node('li',null,line));
}
function renderOutcome(v){
 $('outcome').hidden=!v.outcome;if(!v.outcome)return;const o=v.outcome;
 text('outcome-title',o.allService?'Both services kept working.':o.clinicUnits===2?'The clinic received its full supply.':o.clinicUnits===1?'One clinic unit arrived.':'The clinic intake closed without a delivery.');
 text('outcome-detail',(o.morningProtected?'The inlet was protected. ':'The morning surge flooded the inlet. ')+(o.morningWater?'Morning water service continued. ':'Morning water service was lost. ')+(o.clinicUnits===2?'Both clinic units arrived through the inlet.':o.clinicUnits===1?'The cart supplied one of two requested units.':'Neither of the two requested clinic units arrived in time.'));
 text('outcome-facts',(v.resources.parts.keeper+v.resources.parts.partner)+' available parts retained · '+(v.resources.food.keeper+v.resources.food.partner)+' meals retained · condition and completed work shown below.');
 $('outcome').classList.toggle('failure',!o.allService);
}
function render(){
 const v=getServiceView(session.game);renderBoard(v);renderPeople(v);renderTime(v);renderCarryover(v);renderOutcome(v);
 $('journal').replaceChildren();for(const row of [...v.recent].reverse()){const li=node('li'),time=node('time',null,'+'+String(row.at).padStart(2,'0')+'m'),body=node('span'),name=node('strong',null,(names[row.actor]??row.actor)+' · ');body.append(name,document.createTextNode(row.message));li.append(time,body);$('journal').append(li);}
 text('researcher','Host '+v.version+'; Human/runtime '+v.humanVersion+'/'+v.runtimeVersion+'; clock '+v.clockVersion+'. Canonical integer-minute transitions; no random draws. Direct host rules own Deniz’s clinic decisions and consent. Body values shown above are estimates. Saves verify bounded deterministic command replay. '+v.remainingCommands+' player commands remain.');
 if(saveFailed)text('save-status','Device save unavailable. Download a save to keep this day.');
}
$('one-minute').addEventListener('click',()=>apply(s=>stepSession(s,'minute')));
$('next-event').addEventListener('click',()=>apply(s=>stepSession(s)));
$('play').addEventListener('click',()=>{lastWall=performance.now();apply(toggleSession);});
$('speed').addEventListener('change',()=>{lastWall=performance.now();apply(s=>pauseSession(s,'Speed changed. Press Play when ready.'));});
$('restart').addEventListener('click',()=>{notice('');apply(()=>createSession(createService({scenario:$('situation').value})));$('new-day').open=false;window.scrollTo({top:0,behavior:'smooth'});});
$('try-again').addEventListener('click',()=>{$('new-day').open=true;});
for(const details of document.querySelectorAll('details'))details.addEventListener('toggle',()=>{if(details.open)apply(s=>pauseSession(s,'Paused while you read or choose.'));});
$('download').addEventListener('click',()=>{
 apply(s=>pauseSession(s,'Paused for download. Your saved day will resume paused.'));
 try{const url=URL.createObjectURL(new Blob([JSON.stringify(exportService(session.game),null,2)],{type:'application/json'})),a=node('a');a.href=url;a.download='service-day-minute-'+session.game.clock.now+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){notice('Save could not be downloaded: '+error.message);}
});
$('load').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;apply(s=>pauseSession(s,'Paused for import.'));
 try{if(file.size>65536)throw new Error('This file is too large for a service-day save.');const loaded=importSession(session,await file.text());notice('');apply(()=>loaded);}
 catch(error){notice('Save was not loaded: '+error.message);}event.target.value='';
});
function leave(){lastWall=performance.now();session=pauseSession(session,'Paused because you left this tab. Press Play when you return.');persist();render();}
window.addEventListener('pagehide',leave);document.addEventListener('visibilitychange',()=>{lastWall=performance.now();if(document.hidden)leave();});
setInterval(()=>{const now=performance.now(),elapsed=now-lastWall;lastWall=now;if(session.running&&!document.hidden)apply(s=>tickSession(s,elapsed,Number($('speed').value)));},250);
try{const raw=localStorage.getItem(SAVE);if(raw)session=importSession(session,raw);}catch(error){notice('The stored day could not be loaded ('+error.message+'). A fresh paused day is ready.');}
render();
mountPlayNote({container:document.querySelector('main'),game:{id:'service',title:'Service Day',version:SERVICE_VERSION},hasCompanion:true,
 onOpen:()=>apply(s=>pauseSession(s,'Paused while you write a play note.')),
 getContext:()=>{const v=getServiceView(session.game);return {minute:v.now,summary:[
  v.morning?'Morning inlet '+(v.morning.protected?'protected':'flooded')+'; water service '+(v.morning.waterService?'kept':'lost')+'.':'Morning obligation still pending.',
  'Gate work '+v.work.gate+'/12 min; pump work '+v.work.pump+'/12 min.',
  'You have '+v.resources.parts.keeper+' available parts; Deniz has '+v.resources.parts.partner+'.',
  v.delivery?'Clinic received '+v.delivery.units+' of 2 units.':'No clinic delivery completed.',
  v.jobs.partner?'Deniz is '+(v.jobs.partner.origin==='own'?'independently doing ':'doing accepted work: ')+SERVICE_TASKS[v.jobs.partner.task].label.toLowerCase()+'.':'Deniz is not currently working.',
  v.outcome?'The day ended at minute '+v.outcome.at+'.':'Day in progress.'
 ]};}});
