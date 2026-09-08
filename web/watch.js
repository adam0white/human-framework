import {createWatch,getWatchView,exportWatch,restoreWatch,WATCH_TASKS,WATCH_SCENARIOS} from '../src/games/watch.js';
import {createSession,pauseSession,toggleSession,commandSession,stopSession,stepSession,tickSession} from './watch-session.js';
const $=id=>document.getElementById(id),SAVE='human-before-the-water-v1',names={keeper:'You',watcher:'Deniz',world:'The waterside'};
let session=createSession(),lastWall=performance.now(),saveFailed=false;
const text=(id,value)=>{$(id).textContent=value;};
function notice(message){text('notice',message);$('notice').hidden=!message;}
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(exportWatch(session.game)));saveFailed=false;text('save-status','Saved on this device. Reloads begin paused.');}catch{saveFailed=true;text('save-status','Device save unavailable. Download a save to keep this episode.');}}
function apply(update){
  const before=session.game;
  try{const next=update(session);session=next;if(next.game!==before)persist();render();if(!before.outcome&&next.game.outcome){$('outcome').focus({preventScroll:true});$('outcome').scrollIntoView({block:'nearest',behavior:'smooth'});}}
  catch(error){session=pauseSession(session,'Paused. The action was not applied.');notice(error.message);render();}
}
const shortReason={NOT_PRESENT:'Person absent',ARRIVAL_PASSED:'Episode finished',BUSY:'Already working · stop the job to switch',ROLE_DECLINED:'Declines gate repair',KEEPING_SPARE:'Keeps spare until lookout is complete',ALREADY_DONE:'Complete',TARGET_BUSY:'Other person is doing this',NOT_PREPARED:'Prepare the full diversion first',NO_WARNING:'Needs a completed lookout',MISSING_PARTS:'Needs more parts of their own',NO_MEAL:'No meal left'};
const primary={keeper:['repair','bypass','watch','open'],watcher:['watch','share','bypass','open']};
for(const actor of ['keeper','watcher']){
  for(const task of [...primary[actor],...Object.keys(WATCH_TASKS).filter(task=>!primary[actor].includes(task))]){
    const button=document.createElement('button');button.type='button';button.id=`${actor}-${task}`;button.className='choice';button.dataset.actor=actor;button.dataset.task=task;
    const heading=document.createElement('span');heading.className='choice-heading';const title=document.createElement('span');title.className='choice-title';title.textContent=(actor==='watcher'?'Ask: ':'')+WATCH_TASKS[task].label;
    const cost=document.createElement('span');cost.className='choice-cost';cost.id=`${actor}-${task}-cost`;heading.append(title,cost);
    const detail=document.createElement('span');detail.className='choice-detail';detail.textContent=actor==='watcher'?WATCH_TASKS[task].detail.replaceAll('your parts','their parts').replaceAll('your own meal','their own meal'):WATCH_TASKS[task].detail;
    const reason=document.createElement('span');reason.id=`${actor}-${task}-reason`;reason.className='choice-note';button.append(heading,detail,reason);
    $(primary[actor].includes(task)?`${actor}-choices`:`${actor}-more`).append(button);
    button.addEventListener('click',()=>{notice('');apply(s=>commandSession(s,actor,task));});
  }
  $(`${actor}-stop`).addEventListener('click',()=>apply(s=>stopSession(s,actor)));
}
function render(){
  const v=getWatchView(session.game);text('minute',String(v.now).padStart(2,'0'));text('scenario-label',WATCH_SCENARIOS[v.scenario].label);
  text('arrival',v.outcome?`Surge arrived at minute ${v.outcome.at}`:v.arrivalAt===null?`Surge expected: minute ${v.forecast[0]}–${v.forecast[1]}`:`Surge in ${v.arrivalAt-v.now} min · at minute ${v.arrivalAt}`);
  text('warning-status',v.warningAt!==null?`Lookout complete at minute ${v.warningAt}`:v.outcome?'No advance lookout completed':'Timing unconfirmed · take a lookout');
  text('gate-value',`${v.repair} / 18 min`);$('gate-progress').value=v.repair;text('bypass-value',`${v.bypass} / 10 min`);$('bypass-progress').value=v.bypass;
  text('diversion-status',v.divertedAt!==null?'Opened. Site protected; water service closed.':v.bypass===10?'Prepared. Open it before the surge: 4 minutes, after lookout.':'2 parts · 10 minutes to prepare. Then 4 minutes to open, after lookout.');
  for(let i=1;i<=3;i++){$(`gate-${i}`).classList.toggle('repaired',v.repair>=i*6);$(`gate-${i}`).classList.toggle('partial',v.repair>(i-1)*6&&v.repair<i*6);}
  $('scene-diversion').classList.toggle('prepared',v.bypass===10);$('scene-diversion').classList.toggle('open',v.divertedAt!==null);$('scene-flood').classList.toggle('flooded',Boolean(v.outcome&&!v.outcome.protected));
  text('time-status',session.reason);text('play',session.running?'Ⅱ Pause':'▶ Play');$('play').setAttribute('aria-pressed',String(session.running));
  for(const id of ['next-event','one-minute','play'])$(id).disabled=Boolean(v.outcome);
  const anyWorking=Object.values(v.jobs).some(job=>job&&job.task!=='idle');text('next-event',!v.outcome&&!anyWorking?'Wait for surge →':'Next event →');$('next-event').classList.toggle('primary',anyWorking);
  for(const actor of ['keeper','watcher']){
    const p=v.people[actor],job=v.jobs[actor],working=job&&job.task!=='idle';
    text(`${actor}-ready`,v.outcome?'Finished':working?'Working':'Ready');$(`${actor}-ready`).classList.toggle('busy',Boolean(working));
    const reserved=job?.reservedParts??0;text(`${actor}-parts`,`${v.parts[actor]} available part${v.parts[actor]===1?'':'s'}${reserved?` · ${reserved} reserved`:''}`);
    text(`${actor}-food`,`${v.food[actor]} meal${v.food[actor]===1?'':'s'}${job?.reservedMeal?' · 1 reserved':''}`);
    for(const key of ['fatigue','hunger']){$(`${actor}-${key}`).value=p.body[key];text(`${actor}-${key}-text`,`${Math.round(p.body[key]*100)}%`);}
    text(`${actor}-job`,v.outcome?'The episode has ended':working?WATCH_TASKS[job.task].label:actor==='keeper'?'Ready for your next job':'Ready for a request');
    text(`${actor}-timing`,working?`${job.endsAt-v.now} minutes left · finishes at minute ${job.endsAt}`:v.outcome?'Choose another approach in a fresh episode.':actor==='keeper'?'Choosing does not advance time.':v.warningAt===null?'Keeps their spare until a lookout is complete.':'Lookout complete. Can hand over their available spare.');
    $(`${actor}-progress`).max=working?job.endsAt-job.startedAt:1;$(`${actor}-progress`).value=working?v.now-job.startedAt:0;$(`${actor}-stop`).hidden=!working;
    const response=v.lastResponse?.actor===actor&&v.lastResponse.at===v.now?v.lastResponse:null;$(`${actor}-response`).hidden=!response;
    if(response){text(`${actor}-response`,response.reason);$(`${actor}-response`).classList.toggle('refused',!response.accepted);}
    for(const c of v.choices[actor]){
      const button=$(`${actor}-${c.task}`);text(`${actor}-${c.task}-cost`,`${c.duration} min${c.parts?` · ${c.parts} part${c.parts===1?'':'s'}`:''}${c.meal?' · 1 meal':''}`);
      text(`${actor}-${c.task}-reason`,c.code?shortReason[c.code]:!c.capacityEstimate?'Capacity estimate: recovery may be needed':'');
      button.classList.toggle('unavailable',Boolean(c.code));button.classList.toggle('done',c.code==='ALREADY_DONE');button.classList.toggle('capacity',!c.capacityEstimate&&!c.code);button.disabled=Boolean(v.outcome)||c.code==='ALREADY_DONE';
      button.title=c.reason??(!c.capacityEstimate?'Your condition estimate suggests you may need rest or food; the actual attempt checks capacity.':'');
    }
  }
  $('outcome').hidden=!v.outcome;
  if(v.outcome){
    const o=v.outcome;text('outcome-title',o.protected?(o.waterService?'The gate held. The inlet stays open.':'The site is dry. The inlet is closed.'):'The water found a way through.');
    text('outcome-detail',o.protected?(o.waterService?'Your completed repairs protected the worksite while preserving water service. The gate used three parts; unused supplies remain with their owner.':'The prepared diversion carried the surge away. Water service is suspended for this episode. Remaining supplies and condition are shown below.'): `${o.breachedSections} gate section${o.breachedSections===1?' was':'s were'} unfinished, and no diversion was open. Paid repairs reduced the breach; preparation alone could not protect the site.`);
    $('outcome').classList.toggle('failure',!o.protected);$('outcome-facts').replaceChildren();
    for(const label of [`${o.partsRemaining} spare part${o.partsRemaining===1?'':'s'} retained`,`${o.workMinutes} person-minutes of work`,`Water service: ${o.waterService?'continuing':o.protected?'closed':'interrupted'}`]){const span=document.createElement('span');span.textContent=label;$('outcome-facts').append(span);}
  }
  $('journal').replaceChildren();for(const row of [...v.recent].reverse()){const li=document.createElement('li'),time=document.createElement('time'),body=document.createElement('span'),name=document.createElement('strong');time.textContent=`+${String(row.at).padStart(2,'0')}m`;name.textContent=`${names[row.actor]} · `;body.append(name,document.createTextNode(row.message));li.append(time,body);$('journal').append(li);}
  text('researcher',`Game ${v.version}; Human/runtime ${v.humanVersion}/${v.runtimeVersion}; clock ${v.clockVersion}. Scenario: ${v.scenario}. Canonical integer-minute transitions; no random draws. ${v.parts.installed} installed parts, ${v.parts.reserved} reserved. Practice is paid but does not change host work durations.`);
  if(saveFailed)text('save-status','Device save unavailable. Download a save to keep this episode.');
}
$('next-event').addEventListener('click',()=>apply(s=>stepSession(s,'event')));$('one-minute').addEventListener('click',()=>apply(s=>stepSession(s,'minute')));$('play').addEventListener('click',()=>{lastWall=performance.now();apply(toggleSession);});
$('speed').addEventListener('change',()=>{lastWall=performance.now();apply(s=>pauseSession(s,'Speed changed. Press Play when ready.'));});
$('restart').addEventListener('click',()=>{notice('');apply(()=>createSession(createWatch({scenario:$('scenario').value})));$('new-episode').open=false;window.scrollTo({top:0,behavior:'smooth'});});
$('download').addEventListener('click',()=>{apply(s=>pauseSession(s,'Paused for download. Your saved episode will resume paused.'));try{const blob=new Blob([JSON.stringify(exportWatch(session.game),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`before-the-water-minute-${session.game.clock.now}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){notice(`Save could not be downloaded: ${error.message}`);}});
$('load').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;apply(s=>pauseSession(s,'Paused for file import.'));try{if(file.size>65536)throw new Error('This file is too large for an episode save.');const game=restoreWatch(JSON.parse(await file.text()));notice('');apply(()=>createSession(game));}catch(error){notice(`Save was not loaded: ${error.message}`);}event.target.value='';});
document.addEventListener('visibilitychange',()=>{lastWall=performance.now();if(document.hidden)apply(s=>pauseSession(s,'Paused because you left this tab. Press Play when you return.'));});
window.addEventListener('pagehide',()=>{session=pauseSession(session);persist();});
setInterval(()=>{const now=performance.now(),elapsed=now-lastWall;lastWall=now;if(!session.running||document.hidden)return;apply(s=>tickSession(s,elapsed,Number($('speed').value)));},250);
try{const raw=localStorage.getItem(SAVE);if(raw){if(raw.length>65536)throw new Error('Stored save is too large.');session=createSession(restoreWatch(JSON.parse(raw)));}}catch(error){notice(`The stored episode could not be loaded (${error.message}). A fresh paused episode is ready; download it to keep your progress.`);}
render();
