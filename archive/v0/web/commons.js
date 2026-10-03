import {createGame,startJob,cancelJob,requestProject,releaseProject,advanceGame,advanceToNextEvent,getGameView,exportGame,restoreGame,PROJECTS} from '/src/games/commons.js';
import {chooseCommand,applyCommand} from '/src/games/commons-policy.js';
const $=id=>document.getElementById(id),SAVE='human-common-ground-v1';
let game=createGame(),playing=false,lastWall=performance.now(),fraction=0;
const clean=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=minute=>`${String(Math.floor((minute+480)%1440/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
const markupCache=new Map();
function html(id,markup){if(markupCache.get(id)!==markup){$(id).innerHTML=markup;markupCache.set(id,markup);}}
const supplies=cost=>Object.entries(cost).map(([r,n])=>`${n} ${r}`).join(' + ');
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(exportGame(game)));$('save-status').textContent='Saved on this device. Reloads start paused.';}catch{$('save-status').textContent='Device storage unavailable. Download a save to keep this worksite.';}}
function pause(){playing=false;fraction=0;lastWall=performance.now();}
function act(command){try{notice('');const hadJob=Boolean(game.jobs.player);game=command(game);if(hadJob&&!game.jobs.player&&$('pause-idle').checked)pause();save();render();}catch(error){pause();notice(error.message);render();}}
function render(){
  const view=getGameView(game);$('day').textContent=`DAY ${Math.floor((view.now+480)/1440)+1}`;$('clock').textContent=time(view.now);$('elapsed').textContent=`${view.now} minutes elapsed`;
  for(const r of ['timber','salvage','food'])$(r).textContent=view.stock[r];
  $('play').textContent=playing?'Ⅱ Pause':'▶ Play';$('play').setAttribute('aria-pressed',String(playing));$('play').disabled=!playing&&view.nextEventAt===null;
  $('next-event').disabled=view.nextEventAt===null;
  $('time-status').textContent=playing?`Playing at ${$('speed').value}×. Both people share this clock.`:view.nextEventAt===null?'Paused. Choose a job, then advance time.':`Paused. Next event in ${view.nextEventAt-view.now} min. Jobs resume when you advance time.`;
  $('progress-label').textContent=`${Object.values(view.structures).reduce((a,b)=>a+b,0)} / 6 stages`;
  $('projects').innerHTML=Object.entries(PROJECTS).filter(([id])=>id!=='cache').map(([id,p])=>{const n=view.structures[id];return `<article class="project"><div class="project-top"><span>${p.label}</span><span class="stage-dots" aria-label="${n} of 2 stages complete"><i class="${n>0?'done':''}"></i><i class="${n>1?'done':''}"></i></span></div><p>${p.benefit}</p><p class="next-stage">${n===2?'Complete and useful':`${n===0?'First':'Next'}: ${p.stages[n].label} · ${supplies(p.stages[n].cost)}`}</p></article>`;}).join('');
  for(const id of ['shelter','workbench','garden'])$(`scene-${id}`).setAttribute('class',`structure stage-${view.structures[id]}`);
  $('milestone').hidden=view.milestoneAt===null;$('milestone-detail').textContent=`Established after ${view.milestoneAt} minutes. ${view.caches} supply ${view.caches===1?'cache':'caches'} packed. Keep gathering or build another cache.`;
  for(const id of ['player','neighbor']){const person=view.people[id];if(!person)continue;const j=person.job;$(`${id}-job`).textContent=j?j.label:id==='player'?'Ready to choose a job':'Between jobs';$(`${id}-timing`).textContent=j?`${j.remaining} min remaining · finishes ${time(j.endsAt)}${Object.keys(j.cost).length?` · reserved ${supplies(j.cost)}`:''}`:id==='player'?'Your next choice is yours.':'Available time still affects her condition.';$(`${id}-progress`).style.width=`${j?(j.duration-j.remaining)/j.duration*100:0}%`;for(const metric of ['fatigue','hunger']){$(`${id}-${metric}`).value=person.body[metric];$(`${id}-${metric}-text`).textContent=`${Math.round(person.body[metric]*100)}%`;}}
  $('cancel').disabled=!view.people.player.job;$('choice-status').textContent=view.people.player.job?'working':'ready';$('neighbor-card').hidden=view.solo;
  $('commitment-status').textContent=({none:'available',accepted:'project accepted',declined:'declined',fulfilled:'project complete',released:'released'})[view.commitment.status];$('neighbor-reason').textContent=`“${view.commitment.reason}”`;
  $('release').hidden=view.commitment.status!=='accepted';$('request').disabled=view.solo;
  $('response').hidden=!view.lastResponse;$('response').textContent=view.lastResponse?`${view.lastResponse.accepted?'Accepted':'Declined'} at ${time(view.lastResponse.at)}: ${view.lastResponse.reason}`:'';
  const cards=choices=>choices.map(c=>`<button class="job-choice" data-job="${c.id}" ${c.unavailable?'disabled':''}><span class="choice-title"><strong>${clean(c.label)}</strong><span>${c.duration} min</span></span><span class="choice-detail">${c.unavailable&& !view.people.player.job?clean(c.unavailable):Object.keys(c.cost).length?`Reserve ${supplies(c.cost)}`:Object.keys(c.output).length?`Bring back ${supplies(c.output)}`:clean(c.detail)}</span></button>`).join('');
  $('quick-start').hidden=view.now>0||Boolean(view.people.player.job);html('opening-jobs',cards(view.choices.filter(c=>['gather-timber','build-shelter'].includes(c.id))));
  html('gather-choices',cards(view.choices.filter(c=>!c.project)));html('build-choices',cards(view.choices.filter(c=>c.project)));
  $('journal').innerHTML=view.recent.length?[...view.recent].reverse().map(e=>`<li><time>Day ${Math.floor((e.at+480)/1440)+1} · ${time(e.at)}</time>${clean(e.message)}</li>`).join(''):'<li>The clearing is ready. Nothing moves until you advance time.</li>';
  const suggestion=chooseCommand(view,$('approach').value);$('suggestion').textContent=suggestion.type==='start'?`Next suggestion: ${view.choices.find(c=>c.id===suggestion.jobId).label}.`:suggestion.type==='request'?`Next suggestion: ask Meryem to finish the ${PROJECTS[suggestion.projectId].label.toLowerCase()}.`:'Next suggestion: advance to the next event.';
  $('research').textContent=`Game ${view.version}; Human 0.1.0. ${view.stats.completed} completed jobs, ${view.stats.canceled} canceled. Across all people: ${view.stats.workMinutes} work minutes, ${view.stats.restMinutes} rest, ${view.stats.mealMinutes} eating, ${view.stats.idleMinutes} idle. Your gathering practice: ${Math.round(view.people.player.skills.gathering*100)}%; construction: ${Math.round(view.people.player.skills.construction*100)}%. These are authored simulation values, not empirical measurements.`;
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-job]');if(button)act(g=>startJob(g,button.dataset.job));});
$('next-event').addEventListener('click',()=>{pause();act(advanceToNextEvent);});
$('play').addEventListener('click',()=>{if(playing)pause();else{playing=true;lastWall=performance.now();fraction=0;}render();});
$('speed').addEventListener('change',()=>{fraction=0;lastWall=performance.now();render();});
$('cancel').addEventListener('click',()=>act(cancelJob));$('request').addEventListener('click',()=>act(g=>requestProject(g,$('request-target').value)));$('release').addEventListener('click',()=>act(releaseProject));
$('approach').addEventListener('change',render);$('suggest').addEventListener('click',()=>{pause();act(g=>applyCommand(g,chooseCommand(getGameView(g),$('approach').value)));});
$('new-run').addEventListener('click',()=>{pause();act(()=>createGame({solo:$('solo').checked}));});
$('download').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(exportGame(game),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`common-ground-minute-${game.clock.now}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('load').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;pause();try{if(file.size>100000)throw new Error('This file is too large for a worksite save.');const restored=restoreGame(JSON.parse(await file.text()));act(()=>restored);}catch(error){notice(`Save was not loaded: ${error.message}`);render();}event.target.value='';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();render();}});
setInterval(()=>{const now=performance.now(),delta=Math.min((now-lastWall)/1000,1);lastWall=now;if(!playing||document.hidden)return;fraction+=delta*Number($('speed').value);const minutes=Math.floor(fraction);if(minutes){fraction-=minutes;act(g=>advanceGame(g,$('pause-idle').checked&&g.jobs.player?Math.min(minutes,g.jobs.player.endsAt-g.clock.now):minutes));}},250);
try{const raw=localStorage.getItem(SAVE);if(raw)game=restoreGame(JSON.parse(raw));}catch{notice('The stored worksite could not be loaded. A fresh paused worksite is ready.');}
render();
