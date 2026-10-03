import * as story from '../src/games/camp-story.js';
import {PROJECTS} from '../src/games/camp.js';
import {createSession,pauseSession,playSession,commandSession,advanceSession,nextEventSession} from './camp-session.js';
import * as slots from './camp-slots.js';

const $=id=>document.getElementById(id),names={player:'You',neighbor:'Meryem'},tabs=['work','people','camp','journal','save'];
const put=(id,value)=>{const node=$(id),text=String(value??'');if(node.textContent!==text)node.textContent=text;};
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const amount=values=>Object.entries(values??{}).map(([key,n])=>n+' '+key).join(' + ');
const percent=value=>Math.round(value*100)+'%';
let book=slots.createBook(),session=createSession(),selected='work',protectedStorage=false,storedBackup=null,pendingImport=null,importEpoch=0;
let lastWall=performance.now(),fraction=0,wasPhase=null,lastMessage='',unread=false,choiceSignature='';
function showNotice(message){put('notice',message);$('notice').hidden=!message;}
function resetWall(){lastWall=performance.now();fraction=0;}
function stamp(){return Math.max(Date.now(),book.slots.find(s=>s.id===book.activeId)?.updatedAt??0);}
function persist(){
 if(protectedStorage){put('save-warning','Stored stories are protected because they could not be read. Download this camp to keep new work.');$('save-warning').hidden=false;return false;}
 try{localStorage.setItem(slots.STORAGE_KEY,slots.serializeBook(book));$('save-warning').hidden=true;put('save-status','Saved on this device. Reloading resumes the same story, paused.');return true;}
 catch{put('save-warning','Device storage is unavailable or full. Download this story before leaving.');$('save-warning').hidden=false;put('save-status','The current camp is still here in memory. Download it to keep your work.');return false;}
}
function keepCurrent(){
 try{book=book.activeId?slots.updateActive(book,session.game,stamp()):slots.addStory(book,session.game,{id:crypto.randomUUID(),at:Date.now()});persist();}
 catch(error){put('save-warning','This camp could not be stored: '+error.message+' Download it before leaving.');$('save-warning').hidden=false;}
}
function adopt(next,{focus=false}={}){
 const priorFocus=document.activeElement,changed=next.game!==session.game;session=next;if(!session.running)resetWall();
 if(changed)keepCurrent();showNotice(next.error??'');render({focus});
 if(focus&&priorFocus!==document.body&&(document.activeElement===document.body||!document.activeElement.getClientRects().length))selectPanel('work',{focus:true,pauseTime:false});
}
function pause(reason='Paused while you read or choose.'){session=pauseSession(session,reason);resetWall();render();}
function selectPanel(id,{focus=false,pauseTime=true}={}){
 if(pauseTime){session=pauseSession(session,'Paused while you read or choose.');resetWall();}
 selected=id;
 for(const name of tabs){const active=id===name;$('panel-'+name).hidden=!active;$('tab-'+name).setAttribute('aria-selected',String(active));$('tab-'+name).tabIndex=active?0:-1;}
 if(id==='journal'){unread=false;$('tab-journal').classList.remove('has-update');$('tab-journal').removeAttribute('aria-label');}
 if(focus)$('tab-'+id).focus({preventScroll:true});
 if(id==='save')renderSlots();
 put('play',session.running?'Ⅱ Pause':'▶ Play');$('play').setAttribute('aria-pressed',String(session.running));put('time-status',session.reason);
}
function perform(command){adopt(commandSession(session,command),{focus:true});if(command.type==='start'&&!session.error&&story.getGameView(session.game).canAdvance)$('next-event').focus({preventScroll:true});}
function recommend(view){return ['shelter','workbench','garden'].find(id=>view.structures[id]<2)??'cache';}
function choiceButton(choice){
 const button=node('button',undefined,'camp-choice');button.type='button';button.dataset.job=choice.id;button.disabled=Boolean(choice.unavailable);
 const heading=node('span',undefined,'choice-heading'),title=node('strong',choice.label),duration=node('span',choice.duration+' min','choice-cost');heading.append(title,duration);
 const detail=choice.unavailable??(Object.keys(choice.cost).length?'Reserve '+amount(choice.cost):Object.keys(choice.output).length?'Bring back '+amount(choice.output):choice.detail);
 button.append(heading,node('span',detail,'choice-detail'));return button;
}
function renderChoices(view){
 const target=$('project').value,project=PROJECTS[target],stage=view.structures[target]??0,work=view.work[target];
 const choices=view.choices.filter(c=>c.id==='build-'+target||['gather-timber','gather-salvage','forage'].includes(c.id));
 choices.sort((a,b)=>Number(!a.project)-Number(!b.project));
 const signature=JSON.stringify(choices);
 if(signature!==choiceSignature){$('work-choices').replaceChildren(...choices.map(choiceButton));choiceSignature=signature;}
 put('work-heading',work?'Continue the '+project.label.toLowerCase():target==='cache'?'Pack useful supplies':stage===2?'The '+project.label.toLowerCase()+' is built':project.stages[stage]?.label??'Choose useful work');
 put('work-hint',work?Math.round(work.progress*100)+'% of this stage is kept at the site.':target==='shelter'?'A dry woodshed saves more usable timber from later trips.':target==='workbench'?(view.options.improvement==='prospective'?'Good tools shorten future assembly work, including work already underway.':'Snapshot control: ongoing work keeps its initial productivity.'):target==='garden'?'A garden makes later food gathering more productive.':'Each finished cache can serve one household or two camp nights.');
}
function renderPeople(view){
 for(const id of ['player','neighbor']){const p=view.people[id];for(const key of ['fatigue','hunger']){put(id+'-'+key+'-label',percent(p.body[key]));$(id+'-'+key).value=p.body[key];}
  put(id+'-job',names[id]+': '+(p.job?p.job.label:p.availableActivity==='recovery'?'recovering while available':'available'));
  put(id+'-timing',p.job?p.job.remaining+' min left':'');
 }
 const own=view.people.player,neighbor=view.people.neighbor,eat=view.choices.find(c=>c.id==='eat');
 put('player-activity',own.job?'Work in progress':'Available');
 put('recovery-note',own.job?'You can stop this job; paid time stays paid.':own.availableActivity==='recovery'?'You recover automatically while available. Next Event gives you a finite stopping point.':'This camp uses the active-idle comparison rule.');
 $('eat').disabled=!eat||Boolean(eat.unavailable);$('eat').title=eat?.unavailable??'Reserve one portion and spend eight minutes eating.';
 $('recover-mode').hidden=view.options.recovery!=='active-idle';$('recover-mode').disabled=!view.canAssign||Boolean(own.job)||own.availableActivity==='recovery';
 put('commitment-status',({none:'Available',accepted:'Project accepted',declined:'Declined',fulfilled:'Project complete',released:'Released'})[view.commitment.status]??view.commitment.status);
 put('neighbor-reason',view.commitment.reason);put('response',view.lastResponse?.reason??'');
 $('request').disabled=!view.canAssign;$('offer-work').hidden=!own.job?.project;$('take-work').hidden=!neighbor.job?.project;
 $('offer-work').disabled=!view.canAssign;$('take-work').disabled=!view.canAssign||Boolean(own.job);
 $('stop').hidden=!own.job;$('release').hidden=view.commitment.status!=='accepted';
 document.querySelector('.hud-stops').hidden=$('stop').hidden&&$('release').hidden;
}
function renderCamp(view){
 const activeWindow=Boolean(view.window),projects=$('projects');projects.hidden=activeWindow&&view.phase!=='camp-return';$('camp-scene').hidden=activeWindow&&view.phase!=='camp-return';
 projects.replaceChildren(...['shelter','workbench','garden'].map(id=>{const p=PROJECTS[id],card=node('article',undefined,'project');card.append(node('h3',p.label),node('strong',view.structures[id]+' / 2 stages'),node('p',id==='workbench'&&view.options.improvement==='prospective'?'Improves the assembly work still ahead.':p.benefit));const w=view.work[id];if(w)card.append(node('p',Math.round(w.progress*100)+'% of the current stage retained'));return card;}));
 for(const id of ['shelter','workbench','garden'])$('scene-'+id).setAttribute('class',view.structures[id]===2?'complete':view.structures[id]||view.work[id]?.progress?'started':'');
 $('supplies').hidden=!activeWindow||['introduction','ended','camp-return'].includes(view.phase);
 put('cache-count',view.availableCaches+' available');put('household-count',view.householdsEquipped+' / 2 kits');put('camp-count',view.campNights+' / 4 nights');
 put('household-state',view.departed?'The ferry has left. These kits were sent; later caches stay at camp.':'Allocated kits are ready for the ferry. They leave when you dispatch it.');
 $('allocate-households').disabled=!view.availableCaches||view.departed||view.householdsEquipped>=2||view.phase==='introduction';
 $('allocate-camp').disabled=!view.availableCaches||view.campNights>=4||view.phase==='introduction';
 const chapter=({introduction:['A new use for the camp','Before the rain','Two households need kits on the next ferry. Your camp needs supplies for four wet nights. One cache can only go one way. Your actual people, supplies and unfinished jobs continue here.'],ferry:['The ferry is waiting','What goes aboard?','Allocate the completed caches you want to send, then dispatch the ferry. Unfinished work stays in progress.'],rain:['The supply window closes','Keep what can still help','The ferry has left. Allocate any remaining caches to camp, then close this chapter. Your people and unfinished work stay with you.']})[view.phase];
 $('chapter').hidden=!chapter;
 if(chapter){put('chapter-label',chapter[0]);put('chapter-title',chapter[1]);put('chapter-detail',chapter[2]);put('carried-detail','Camp minute '+view.now+'. '+view.availableCaches+' completed caches available. '+(view.phase==='introduction'?'Ferry in 90 minutes; rain in 180.':''));}
 $('story-result').hidden=!['ended','camp-return'].includes(view.phase);
 put('result-title',view.phase==='camp-return'?'The camp is still yours.':'The work stays with you.');
 put('result-detail',view.householdsEquipped+' household kits sent; '+view.campNights+' wet nights provisioned. '+view.unprovidedHouseholds+' households and '+view.unprovidedNights+' camp nights remain unprovided. '+view.availableCaches+' caches are still available. These are settled choices; returning to camp does not reset them.');
 $('return-camp').hidden=view.phase!=='ended';
 $('window-account').hidden=!activeWindow;
 put('window-summary',activeWindow?'Window entered at camp minute '+view.enteredAt+'. Ferry '+view.ferryAt+', rain '+view.rainAt+'. '+view.carriedCaches+' caches were already present.':'');
 $('allocations').replaceChildren(...(view.window?.allocations??[]).map(item=>{const li=node('li');li.append(node('time','Camp minute '+item.at),node('span',item.destination==='households'?'One cache assigned to a household kit.':'One cache kept for two camp nights.'));return li;}));
}
function renderSlots(){
 const list=book.slots.map(slot=>{const row=node('div',undefined,'slot'),info=node('span',slot.label+' · camp minute '+slot.save.game.world.clock.now),controls=node('div'),open=node('button',slot.id===book.activeId?'Current':'Resume'),remove=node('button','Remove');open.disabled=slot.id===book.activeId;open.dataset.slot=slot.id;remove.dataset.remove=slot.id;controls.append(open,remove);row.append(info,controls);return row;});
 $('slots').replaceChildren(...list);$('new-story').disabled=book.slots.length>=slots.MAX_SLOTS;$('confirm-import').disabled=book.slots.length>=slots.MAX_SLOTS;
 if(book.slots.length>=slots.MAX_SLOTS)put('save-status','All five story slots are used. Download a story before deliberately removing its device copy.');
}
function render({focus=false}={}){
  const view=story.getGameView(session.game),hasWindow=Boolean(view.window),building=view.phase==='camp'||view.phase==='camp-return';
 for(const option of $('project').options)option.disabled=option.value!=='cache'&&view.structures[option.value]===2;
 if($('project').selectedOptions[0]?.disabled)$('project').value=recommend(view);
 if(wasPhase!==view.phase&&view.phase==='introduction'){$('project').value='cache';$('request-project').value='cache';}
 put('clock',hasWindow&&view.phase!=='camp-return'&&!view.departed?view.ferryRemaining+' min':hasWindow&&view.phase==='packing'?view.remaining+' min':view.now.toLocaleString());
 put('clock-label',hasWindow&&view.phase!=='camp-return'&&!view.departed?'until the ferry':hasWindow&&view.phase==='packing'?'until rain':'camp minutes');
 put('objective',view.phase==='camp'?'Build a woodshed, workbench and garden. Begin with one useful stage.':view.phase==='camp-return'?'Your camp continues. Earlier supply choices stay settled.':'One cache equips a household or covers two camp nights.');
 put('resources','Timber '+view.stock.timber+' · Salvage '+view.stock.salvage+' · Food '+view.stock.food+(hasWindow?' · Caches '+view.availableCaches:''));
 const comparison=view.options.recovery!=='automatic'||view.options.improvement!=='prospective';$('preset-note').hidden=!comparison;put('preset-note',comparison?'Research control: '+view.options.improvement+' productivity · '+view.options.recovery+' recovery.':'');
 put('available-rule',view.options.recovery==='automatic'?'While available, you recover automatically; you can begin a job whenever you choose.':'This research control uses active idle. Choose available-time recovery in People when you want to recover.');
 put('workbench-rule',view.options.improvement==='prospective'?'A workbench improves the work still ahead; it does not erase effort already spent.':'This snapshot control keeps ongoing work at its initial productivity. Later work can use the improved tools.');
 $('conditions').replaceChildren(...['player','neighbor'].map(id=>node('span',names[id]+' · fatigue '+percent(view.people[id].body.fatigue)+' · hunger '+percent(view.people[id].body.hunger),'hud-body')));
 const latest=view.recent.at(-1),message=latest?.message??'';
 if(message!==lastMessage){if(lastMessage&&selected!=='journal')unread=true;lastMessage=message;}
 put('latest',message||view.lastResponse?.reason||'');
 $('tab-journal').classList.toggle('has-update',unread);if(unread)$('tab-journal').setAttribute('aria-label','Journal · new update');else $('tab-journal').removeAttribute('aria-label');
 put('tab-camp',hasWindow?'Supplies':'Camp');renderChoices(view);renderPeople(view);renderCamp(view);
 $('journal').replaceChildren(...[...view.recent].reverse().map(item=>{const li=node('li');li.append(node('time','Camp minute '+item.at),node('span',item.message));return li;}));
 put('research','Story '+view.version+'; camp '+view.worldVersion+'; Human/runtime 0.1.1. '+view.now+' simulated minutes. '+view.stats.workMinutes+' total work minutes; '+view.stats.restMinutes+' recovery; '+view.stats.mealMinutes+' eating. '+(view.migration?'Imported source: '+JSON.stringify(view.migration)+'. ':'')+'The recent journal is bounded; missing old commands are not reconstructed.');
 const action=({introduction:['Continue into the supply window','continue'],ferry:['Dispatch the ferry →','dispatch'],rain:['Finish this chapter →','finish']})[view.phase]??(view.canFinish?['Close the supplied chapter →','finish']:null);
 $('chapter-action').hidden=!action;if(action){put('chapter-action',action[0]);$('chapter-action').dataset.command=action[1];}
 $('next-event').hidden=!view.canAdvance||Boolean(action);$('one-minute').hidden=!view.canAdvance||Boolean(action);$('play').hidden=!view.canAdvance||Boolean(action);$('speed').hidden=!view.canAdvance||Boolean(action);
 put('next-event','Next event →');put('play',session.running?'Ⅱ Pause':'▶ Play');$('play').setAttribute('aria-pressed',String(session.running));
 put('time-status',session.error??view.pauseReason??(session.running?'Time is moving. You can pause at any point.':session.reason));
 if(wasPhase!==view.phase){const initial=wasPhase===null,checkpoint=['introduction','ferry','rain','ended'].includes(view.phase);if(checkpoint){selectPanel('camp',{pauseTime:false});$('panel-camp').scrollTop=0;if(focus&&!initial)(view.phase==='ended'?$('result-title'):$('chapter-title')).focus({preventScroll:true});}else if(!initial){selectPanel('work',{pauseTime:false});$('panel-work').scrollTop=0;}wasPhase=view.phase;}
 if(selected==='save')renderSlots();
}
function download(value,name){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function addCamp(game){book=slots.addStory(book,game,{id:crypto.randomUUID(),at:Date.now()});session=createSession(game);$('project').value=recommend(story.getGameView(game));wasPhase=null;choiceSignature='';lastMessage='';unread=false;resetWall();persist();selectPanel('work',{pauseTime:false});render();}

for(const id of tabs){const tab=$('tab-'+id);tab.addEventListener('click',()=>{selectPanel(id);render();});tab.addEventListener('keydown',event=>{const i=tabs.indexOf(id),next=event.key==='ArrowRight'?(i+1)%tabs.length:event.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;if(next!==null){event.preventDefault();selectPanel(tabs[next],{focus:true});render();}});}
$('work-choices').addEventListener('click',event=>{const button=event.target.closest('[data-job]');if(button&&!button.disabled)perform({type:'start',job:button.dataset.job});});
$('project').addEventListener('change',()=>pause());$('request-project').addEventListener('change',()=>pause());
$('eat').addEventListener('click',()=>perform({type:'start',job:'eat'}));$('stop').addEventListener('click',()=>perform({type:'cancel'}));$('request').addEventListener('click',()=>perform({type:'request',project:$('request-project').value}));$('release').addEventListener('click',()=>perform({type:'release'}));
$('recover-mode').addEventListener('click',()=>perform({type:'start',job:'rest'}));
$('offer-work').addEventListener('click',()=>perform({type:'handover',from:'player',to:'neighbor'}));$('take-work').addEventListener('click',()=>perform({type:'handover',from:'neighbor',to:'player'}));
$('next-event').addEventListener('click',()=>adopt(nextEventSession(session),{focus:true}));$('one-minute').addEventListener('click',()=>adopt(advanceSession(pauseSession(session),1),{focus:true}));
$('play').addEventListener('click',()=>{session=session.running?pauseSession(session):playSession(session);resetWall();render();});$('speed').addEventListener('change',resetWall);
$('chapter-action').addEventListener('click',()=>perform({type:$('chapter-action').dataset.command}));$('allocate-households').addEventListener('click',()=>perform({type:'allocate',destination:'households'}));$('allocate-camp').addEventListener('click',()=>perform({type:'allocate',destination:'camp'}));$('return-camp').addEventListener('click',()=>{perform({type:'return'});selectPanel('work');render();});$('save-leave').addEventListener('click',()=>{pause();if(persist())location.assign('/games/');else{selectPanel('save');showNotice('Download this story before leaving; automatic saving is unavailable.');}});
$('download').addEventListener('click',()=>{pause();download(story.exportGame(session.game),'camp-story-minute-'+story.getGameView(session.game).now+'.json');});
$('new-story').addEventListener('click',()=>{pause();try{addCamp(story.createGame());showNotice('A separate camp is ready. Your other stories are kept.');}catch(error){showNotice(error.message);}});
$('slots').addEventListener('click',event=>{
 const open=event.target.closest('[data-slot]'),remove=event.target.closest('[data-remove]');if(!open&&!remove)return;pause();
 try{
  if(remove){
   const slot=book.slots.find(s=>s.id===remove.dataset.remove),activeId=book.activeId;
   if(!confirm('Remove '+slot.label+' from this device? Download it first if you want to keep a copy. Other stories are unchanged.'))return;
   book=slots.removeStory(book,slot.id);
   if(!book.slots.length){addCamp(story.createGame());return;}
   if(book.activeId===activeId){persist();render();selectPanel('save',{focus:true,pauseTime:false});return;}
  }else book=slots.selectStory(book,open.dataset.slot);
  session=createSession(slots.getActiveGame(book));$('project').value=recommend(story.getGameView(session.game));wasPhase=null;choiceSignature='';lastMessage='';unread=false;persist();selectPanel('work',{pauseTime:false});render();
 }catch(error){showNotice(error.message);}
});
$('import').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;const epoch=++importEpoch;pause('Paused while reading the selected save.');try{if(file.size>1024*1024)throw new Error('This save exceeds the one-megabyte import limit.');const data=JSON.parse(await file.text());if(epoch!==importEpoch)return;const legacy=data.format!=='human-camp-story';const game=data.format==='human-camp-story'?story.restoreGame(data):data.format==='human-common-ground'?story.migrateLegacyGame(data):data.format==='human-common-ground-before-rain'?story.migrateLegacyRainGame(data):null;if(!game)throw new Error('Choose an individual camp story, Common Ground, or Before the rain save.');pendingImport=game;const view=story.getGameView(game);put('import-title',legacy?'Continue this earlier camp?':'Keep this saved story?');put('import-detail','Camp minute '+view.now+'; '+view.availableCaches+' caches available. '+(legacy?'Paid work, people and supplies are retained under the new recovery/work rules. Existing ferry choices are kept. ':'')+'This is added as a separate story; the current camp and original file are kept.');$('import-preview').hidden=false;renderSlots();}catch(error){pendingImport=null;$('import-preview').hidden=true;showNotice('Save was not imported: '+error.message);}finally{if(epoch===importEpoch)event.target.value='';}});
$('cancel-import').addEventListener('click',()=>{importEpoch++;pendingImport=null;$('import-preview').hidden=true;});$('confirm-import').addEventListener('click',()=>{if(!pendingImport)return;try{const game=pendingImport;addCamp(game);pendingImport=null;$('import-preview').hidden=true;showNotice('The imported camp is kept in its own story slot.');}catch(error){showNotice(error.message);}});
document.querySelector('main').addEventListener('toggle',event=>{if(event.target.tagName==='DETAILS'&&event.target.open)pause();},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('Paused while this page is away.');});
setInterval(()=>{const now=performance.now(),delta=Math.min(1,(now-lastWall)/1000);lastWall=now;if(!session.running||document.hidden){fraction=0;return;}fraction+=delta*Number($('speed').value);const minutes=Math.floor(fraction);if(minutes){fraction-=minutes;adopt(advanceSession(session,minutes),{focus:true});}},250);
try{const raw=localStorage.getItem(slots.STORAGE_KEY);if(raw!==null){storedBackup=raw;book=slots.restoreBook(raw);const game=slots.getActiveGame(book);if(game)session=createSession(game);}if(!book.slots.length){book=slots.addStory(book,session.game,{id:crypto.randomUUID(),at:Date.now()});persist();}}
catch(error){protectedStorage=true;showNotice('Stored stories could not be opened. They have not been replaced. The camp shown is temporary; download new work before leaving.');if(storedBackup!==null){const button=node('button','Download the stored-data backup');button.addEventListener('click',()=>download(storedBackup,'camp-stored-data-backup.json'));document.querySelector('.save-buttons').append(button);}persist();}
$('project').value=recommend(story.getGameView(session.game));render();
