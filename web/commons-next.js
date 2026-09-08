import {mountPlayNote} from './play-note.js';
import {createGame,startJob,cancelJob,requestProject,releaseProject,advanceGame,advanceToNextEvent,allocateCache,dispatchFerry,finishDay,getGameView,exportGame,restoreGame} from '/src/games/commons-next.js';
const $=id=>document.getElementById(id),SAVE='human-common-ground-before-rain-v1';
const clean=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const supplies=cost=>Object.entries(cost).map(([name,amount])=>`${amount} ${name}`).join(' + ');
let game=createGame(),playing=false,fraction=0,lastWall=performance.now();
const markup=new Map();
function html(id,value){if(markup.get(id)!==value){$(id).innerHTML=value;markup.set(id,value);}}
function pause(){playing=false;fraction=0;lastWall=performance.now();}
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(exportGame(game)));$('save-status').textContent='Saved separately on this device. Reloads start paused.';}catch{$('save-status').textContent='Device storage unavailable. Download a save to keep this afternoon.';}}
function act(operation){try{notice('');const wasWorking=Boolean(game.world.jobs.player);game=operation(game);if(getGameView(game).phase!=='packing'||wasWorking&&!game.world.jobs.player&&$('pause-idle').checked)pause();save();render();}catch(error){pause();notice(error.message);render();}}
function render(){
  const view=getGameView(game),working=view.phase==='packing',closed=view.phase==='ended';
  $('quick-start').hidden=view.elapsed>0;
  html('opening-actions',view.choices.filter(choice=>['gather-timber','gather-salvage'].includes(choice.id)).map(choice=>`<button data-job="${choice.id}" ${choice.unavailable?'disabled':''}>${choice.id==='gather-timber'?'Start gathering timber':'Start recovering salvage'} · ${choice.duration} min</button>`).join('')+`<button data-request ${view.commitment.status==='accepted'?'disabled':''}>${view.commitment.status==='accepted'?'Meryem accepted one cache':'Ask Meryem for a cache'}</button>`);
  $('clock-label').textContent=closed?'AFTERNOON COMPLETE':view.phase==='ferry'?'THE FERRY IS WAITING':view.phase==='dusk'?'DUSK HAS ARRIVED':view.departed?'UNTIL DUSK':'UNTIL THE FERRY';
  $('countdown').innerHTML=`${view.departed?view.remaining:view.ferryRemaining} <small>min</small>`;
  $('clock-detail').textContent=closed?'The day is finished. Your result is below.':`${view.elapsed} of 180 afternoon minutes used. ${view.departed?'The households can no longer receive a cache. Camp can still use supplies.':'Work pauses at the ferry so you can choose what goes aboard.'}`;
  $('timeline-progress').style.width=`${view.elapsed/180*100}%`;
  $('next-event').disabled=!working;$('play').disabled=!working;$('play').textContent=playing?'Ⅱ Pause':'▶ Play';$('play').setAttribute('aria-pressed',String(playing));
  $('time-status').textContent=!working?'Time is paused for your decision.':playing?`Playing at ${$('speed').value}×. Both people share this clock.`:`Paused. Next job or checkpoint in ${view.nextEventAt-view.now} min. Choose work, then advance time.`;
  $('checkpoint').hidden=!['ferry','dusk'].includes(view.phase);
  $('checkpoint-label').textContent=view.phase==='ferry'?'A DECISION BEFORE DEPARTURE':'WORK STOPS HERE';
  $('checkpoint-title').textContent=view.phase==='ferry'?'The ferry is ready to leave.':'The rain is here. Take stock.';
  $('checkpoint-detail').textContent=view.phase==='ferry'?`${view.availableCaches} complete ${view.availableCaches===1?'cache is':'caches are'} still available. Allocate any you want across the river below. Sending the ferry closes that option; work then resumes until dusk.`:`${view.availableCaches} complete ${view.availableCaches===1?'cache is':'caches are'} still available. You may assign them to camp below. Unfinished jobs earn no cache; remaining unassigned caches stay unused.`;
  $('continue').textContent=view.phase==='ferry'?`Send ferry · ${view.householdsEquipped} of 2 households equipped`:'Finish the day →';
  $('available').textContent=view.availableCaches;$('households').textContent=`${view.householdsEquipped} / 2`;$('nights').textContent=`${view.campNights} / 4`;
  $('ferry-state').textContent=view.departed?'Ferry departed':`${view.ferryRemaining} min to departure`;
  $('allocate-households').disabled=closed||view.departed||view.availableCaches===0||view.householdsEquipped===2;
  $('allocate-camp').disabled=closed||view.availableCaches===0||view.campNights===4;
  $('household-help').textContent=view.departed?`Ferry departed with kits for ${view.householdsEquipped} households. ${view.unprovidedHouseholds} received no kit.`:view.householdsEquipped===2?'Both households have kits reserved on the ferry.':view.availableCaches?'This cache cannot also cover two nights at camp. Allocation is final.':'Pack a complete cache to make this choice. Each one equips one household.';
  $('camp-help').textContent=view.campNights===4?'Supplies cover all four wet nights.':view.availableCaches?'This cache cannot also equip a household. Allocation is final.':'Pack a complete cache to make this choice. Each one covers two nights.';
  $('result').hidden=!closed;
  $('result-detail').textContent=`${view.householdsEquipped} of 2 households received a kit before the ferry left. Camp has supplies for ${view.campNights} of 4 wet nights.`;
  const pending=Object.values(view.people).filter(person=>person.job).map(person=>`${person.id==='player'?'Your':'Meryem’s'} ${person.job.label.toLowerCase()} (${person.job.remaining} min unfinished)`);
  $('result-left').textContent=`${view.unprovidedHouseholds} households received no kit; ${view.unprovidedNights} camp nights remain unprovided. ${view.availableCaches} complete caches were left unused.${pending.length?' Still unfinished: '+pending.join('; ')+'.':''}`;
  for(const resource of ['timber','salvage','food'])$(resource).textContent=view.stock[resource];
  for(const id of ['player','neighbor']){
    const person=view.people[id],job=person.job;
    $(`${id}-job`).textContent=job?job.label:id==='player'?'Ready for your next job':'Between jobs';
    $(`${id}-progress`).style.width=`${job?(job.duration-job.remaining)/job.duration*100:0}%`;
    $(`${id}-timing`).textContent=job?`${job.remaining} min ${working?'remaining':'paused'}${job.endsAt>game.openedAt+180?' · cannot finish before dusk':''}${Object.keys(job.cost).length?' · reserved '+supplies(job.cost):''}`:id==='player'?'Gather, pack, eat or rest.':'Her accepted project continues through recovery.';
    for(const metric of ['fatigue','hunger']){$(`${id}-${metric}`).value=person.body[metric];$(`${id}-${metric}-text`).textContent=`${Math.round(person.body[metric]*100)}%`;}
  }
  $('cancel').disabled=!working||!view.people.player.job;
  $('commitment-status').textContent=({none:'Available',accepted:'Project accepted',declined:'Declined',fulfilled:view.commitment.project==='cache'?'Cache complete':'Previous project complete',released:'Released'})[view.commitment.status];
  $('neighbor-reason').textContent=view.commitment.finishedAt!==null&&view.commitment.finishedAt<=view.openedAt?'Her previous project is complete. Ask her to finish one cache; she will gather its materials and choose her own recovery.':`“${view.commitment.reason}”`;$('request').disabled=!working;
  $('release').hidden=view.commitment.status!=='accepted';$('release').disabled=!working;
  $('response').hidden=!view.lastResponse||view.lastResponse.at<=view.openedAt&&view.lastResponse.project!=='cache';$('response').textContent=view.lastResponse?`${view.lastResponse.accepted?'Accepted':'Declined'}: ${view.lastResponse.reason}`:'';
  const cards=choices=>choices.map(choice=>`<button class="job-choice" data-job="${choice.id}" ${choice.unavailable?'disabled':''}><span class="choice-title"><strong>${choice.project?'Pack a supply cache':clean(choice.label)}</strong><span>${choice.duration} min</span></span><span class="choice-detail">${choice.unavailable&&!view.people.player.job?clean(choice.unavailable):Object.keys(choice.cost).length?'Reserve '+supplies(choice.cost):Object.keys(choice.output).length?'Bring back '+supplies(choice.output):clean(choice.detail)}</span>${working&&!view.people.player.job&&(!choice.finishesInAfternoon||!view.departed&&!choice.finishesBeforeFerry)?`<span class="choice-timing">${!choice.finishesInAfternoon?'Will remain unfinished at dusk.':'Finishes after the ferry checkpoint.'}</span>`:''}</button>`).join('');
  html('build-choices',cards(view.choices.filter(choice=>choice.project)));html('gather-choices',cards(view.choices.filter(choice=>!choice.project)));
  const entries=[...view.recent.filter(entry=>entry.at>view.openedAt),...view.allocations.map(item=>({at:item.at,message:item.destination==='camp'?'You kept a cache at camp: two wet nights supplied.':'You assigned a cache to the ferry: one household equipped.'}))];
  if(view.departed)entries.push({at:game.departedAt,message:`The ferry departed. ${view.householdsEquipped} of two households received a kit.`});
  html('journal',entries.length?entries.sort((a,b)=>b.at-a.at).slice(0,16).map(entry=>`<li><time>Afternoon +${entry.at-view.openedAt} min</time>${clean(entry.message)}</li>`).join(''):'<li>The camp is established. The afternoon begins with 2 timber, 1 salvage and 2 food. Nothing moves until you advance time.</li>');
  $('research').textContent=`Episode ${view.version}; original worksite 0.1.0; Human 0.1.0; clock 0.1.0. This synthetic opening was reached through the public build-first controller at minute ${view.openedAt}. It is not a player export. ${view.caches} caches packed this afternoon, ${view.allocations.length} allocated. ${view.stats.completed} total jobs include the paid opening. Current saves retain bounded receipts and pending jobs; they are validated for consistency, not cryptographically authenticated history.`;
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-job]');if(button)act(current=>startJob(current,button.dataset.job));else if(event.target.closest('[data-request]'))act(current=>requestProject(current,'cache'));});
$('next-event').addEventListener('click',()=>{pause();act(advanceToNextEvent);});
$('play').addEventListener('click',()=>{if(playing)pause();else{playing=true;fraction=0;lastWall=performance.now();}render();});
$('speed').addEventListener('change',()=>{fraction=0;lastWall=performance.now();render();});
$('cancel').addEventListener('click',()=>act(cancelJob));$('request').addEventListener('click',()=>act(current=>requestProject(current,'cache')));$('release').addEventListener('click',()=>act(releaseProject));
$('allocate-households').addEventListener('click',()=>act(current=>allocateCache(current,'households')));$('allocate-camp').addEventListener('click',()=>act(current=>allocateCache(current,'camp')));
$('continue').addEventListener('click',()=>{pause();act(current=>getGameView(current).phase==='ferry'?dispatchFerry(current):finishDay(current));});
$('new-run').addEventListener('click',()=>{pause();act(()=>createGame());});
$('download').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(exportGame(game),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`before-rain-afternoon-${game.world.clock.now-game.openedAt}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('load').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;pause();try{if(file.size>100000)throw new Error('This file is too large for an afternoon save.');const restored=restoreGame(JSON.parse(await file.text()));act(()=>restored);}catch(error){notice(`Save was not loaded: ${error.message}`);render();}event.target.value='';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();render();}});
setInterval(()=>{const now=performance.now(),delta=Math.min((now-lastWall)/1000,1);lastWall=now;if(!playing||document.hidden)return;fraction+=delta*Number($('speed').value);const minutes=Math.floor(fraction);if(minutes){fraction-=minutes;act(current=>advanceGame(current,$('pause-idle').checked&&current.world.jobs.player?Math.min(minutes,current.world.jobs.player.endsAt-current.world.clock.now):minutes));}},250);
try{const raw=localStorage.getItem(SAVE);if(raw)game=restoreGame(JSON.parse(raw));}catch{notice('The stored afternoon could not be loaded. A fresh paused afternoon is ready.');}
render();

mountPlayNote({container:$('session'),game:{id:'commons-next',title:'Before the rain',version:'0.1.0'},hasCompanion:true,
 onOpen:()=>{pause();render();},getContext:()=>{const v=getGameView(game);return {minute:v.elapsed,summary:[
  `Afternoon: ${v.phase}; ${v.remaining} minutes remain.`,
  `${v.caches} caches packed; ${v.availableCaches} unassigned.`,
  `${v.householdsEquipped} of 2 households equipped; ${v.campNights} of 4 wet nights supplied.`,
  `Meryem's project: ${v.commitment.status}.`
 ]};}});
