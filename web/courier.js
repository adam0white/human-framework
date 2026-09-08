import {HOST_VERSION,createGame,getGameView,applyCommand,exportGame,importGame} from '/src/games/courier.js';
import {chooseAction} from '/src/games/courier-policy.js';

const $=id=>document.getElementById(id),SAVE_KEY='human-courier-active-v1';
let game=createGame(),recording=null,autoTimer=null;
const text=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;};
const percent=value=>`${Math.round(value*100)}%`;
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(exportGame(game)));$('save-status').textContent='Saved on this device after every action';}catch{$('save-status').textContent='Device save unavailable. Download a save to keep this round.';}}
function stopAuto(){if(autoTimer!==null)clearTimeout(autoTimer);autoTimer=null;$('auto').textContent='Run controller';}
function command(value){try{game=applyCommand(game,value);if(recording){if(recording.commands.length>=10000){recording=null;notice('Replay recording reached its limit. Your active save continues.');}else recording.commands.push(structuredClone(value));}persist();render();if(value.type==='start'&&autoTimer===null)$('pending').scrollIntoView({block:'nearest',behavior:'instant'});}catch(error){stopAuto();notice(error.message);}}
function svg(tag,attrs,content){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(content!==undefined)node.textContent=content;return node;}
function renderMap(view){
  const map=$('map');map.querySelectorAll(':scope > :not(desc)').forEach(n=>n.remove());
  map.append(svg('path',{d:'M290 0 Q270 85 293 180 T286 370 L347 370 Q322 260 345 180 T339 0 Z',class:'river'}));
  map.append(svg('text',{x:316,y:187,class:'river-label',transform:'rotate(-90 316 187)'},'RIVER'));
  const point=id=>{const p=view.places.find(n=>n.id===id);return {x:p.x*5.6+4,y:p.y*3.55};};
  for(const route of view.routes){
    const a=point(route.from),b=point(route.to);let path=`M${a.x} ${a.y} L${b.x} ${b.y}`,labelX=(a.x+b.x)/2,labelY=(a.y+b.y)/2-6;
    if(route.id==='ridge-road'){path=`M${a.x} ${a.y} Q${(a.x+b.x)/2} ${a.y-80} ${b.x} ${b.y}`;labelY=a.y-37;}
    if(route.id==='towpath'){path=`M${a.x} ${a.y} Q${(a.x+b.x)/2} ${a.y+80} ${b.x} ${b.y}`;labelY=a.y+45;}
    map.append(svg('path',{d:path,class:`map-road ${route.crossing?'map-crossing':''}`}));
    map.append(svg('text',{x:labelX,y:labelY,class:'map-minute'},route.minutes));
  }
  for(const place of view.places){const p=point(place.id),current=place.id===view.location,has=view.parcels.some(item=>item.owner==='bag'&&item.destination===place.id);
    map.append(svg('circle',{cx:p.x,cy:p.y,r:current?16:8,class:`map-place ${current?'current':''} ${has&&!current?'has-parcel':''}`}));
    if(current)map.append(svg('text',{x:p.x,y:p.y+3,class:'map-you'},'YOU'));
    map.append(svg('text',{x:p.x,y:p.y+(place.id==='archive'||place.id==='orchard'||place.id==='quay'?28:-23),class:'map-label'},place.name));
  }
  $('crossings').replaceChildren(...['footbridge','lockbridge'].map(id=>{const div=text('div','', 'crossing-report');div.append(text('strong',view.routes.find(r=>r.id===id).name),text('span',view.crossings[id].report?`${view.crossings[id].report.condition} · observed at ${view.crossings[id].report.observedAt} min`:'Uninspected · pay 5 min at either endpoint'));return div;}));
}
function actionButton(action){
  const button=document.createElement('button');button.className=`action ${action.capacity.allowed?'':'blocked'}`;button.dataset.action=action.id;
  const top=text('span','', 'action-top');top.append(text('strong',action.label),text('span',`${action.minutes} min`));button.append(top,text('span',action.detail,'action-detail'));
  if(action.estimatedSuccess!==null)button.append(text('span',`${percent(action.estimatedSuccess)} estimated crossing chance`,'action-chance'));
  if(!action.capacity.allowed)button.append(text('span',`Capacity estimate: ${action.capacity.causes.join(' and ')} too high. A blocked request costs 2 idle minutes.`,'action-chance'));
  button.addEventListener('click',()=>{stopAuto();command({type:'start',actionId:action.id});});return button;
}
function render(){
  const view=getGameView(game),place=id=>view.places.find(p=>p.id===id).name;
  $('remaining').textContent=Math.ceil(view.remainingMinutes);$('elapsed').textContent=`${view.clock} of 240 elapsed`;
  $('delivery-count').textContent=`${view.summary.delivered} / 6 delivered`;$('on-time').textContent=`${view.summary.onTime} on time${view.summary.late?` · ${view.summary.late} late`:''}`;
  $('condition').textContent=`Fatigue ${percent(view.worker.body.fatigue)} · Hunger ${percent(view.worker.body.hunger)} · felt estimates`;
  $('action-title').textContent=`At ${place(view.location).toLowerCase()}`;
  const bag=view.parcels.filter(p=>p.owner==='bag');$('bag-count').textContent=`${bag.length} / 3 bag slots`;
  $('bag').replaceChildren(...Array.from({length:3},(_,i)=>{const div=text('div',bag[i]?.name??'Empty slot',`bag-slot ${bag[i]?'':'empty'}`);if(bag[i])div.append(text('small',`${place(bag[i].destination)} · due ${bag[i].due}`));return div;}));
  $('last-event').textContent=view.lastEvent.message;$('pending').hidden=!view.pending;$('actions').hidden=Boolean(view.pending)||view.status!=='playing';
  if(view.pending){$('pending-label').textContent=view.pending.label;$('progress').value=view.pending.elapsedMinutes/view.pending.totalMinutes;$('progress-text').textContent=`${view.pending.elapsedMinutes} / ${view.pending.totalMinutes} min`;$('pending-note').textContent=view.pending.blocked?'Blocked effort costs idle time. It grants no movement, practice, rest or food.':'The action is saved in progress. Finish it now, advance one minute, or stop; elapsed time and effort remain.';$('finish').textContent=view.pending.blocked?'Finish idle interruption':'Finish action';}
  $('actions').replaceChildren();
  for(const [name,kinds] of [['Hand over parcels',['deliver']],['Load your bag',['load']],['Travel',['travel']],['Inspect the crossing',['inspect']],['Recovery',['rest','eat']],['Repack at the depot',['unload']]]){
    const matches=view.actions.filter(a=>kinds.includes(a.kind));if(!matches.length)continue;
    const group=document.createElement(name.startsWith('Repack')?'details':'div');group.className='action-group';group.append(text(name.startsWith('Repack')?'summary':'h3',name));const list=text('div','','action-list');list.append(...matches.map(actionButton));group.append(list);$('actions').append(group);
  }
  $('outcome').hidden=view.status==='playing';
  if(view.status!=='playing'){$('outcome').replaceChildren(text('h3',view.status==='complete'?'All six delivered':'Round finished'),text('p',`${view.summary.delivered} delivered: ${view.summary.onTime} on time, ${view.summary.late} late. ${view.summary.undelivered?`${view.summary.undelivered} undelivered parcels remain in your bag or at the depot.`:`Finished in ${view.clock} minutes.`} Your full parcel record is below.`));stopAuto();}
  $('practice').textContent=percent(view.worker.skills.routecraft);$('practice-meter').value=view.worker.skills.routecraft;$('meals').textContent=`${view.meals} packed meal${view.meals===1?'':'s'} left.`;
  $('manifest').replaceChildren(...view.parcels.map(p=>{const row=text('div','',`manifest-row ${p.deliveredAt!==null?'delivered':''}`);row.append(text('strong',p.name),text('span',place(p.destination),'destination'),text('small',`Due ${p.due} min`),text('span',p.deliveredAt!==null?`${p.deliveredAt<=p.due?'On time':'Late'} · ${p.deliveredAt} min`:p.owner==='bag'?'In your bag':'At depot','parcel-status'));return row;}));
  const id=chooseAction(view,$('policy').value),suggested=view.actions.find(a=>a.id===id);$('suggestion').textContent=suggested?`Suggestion: ${suggested.label}. ${suggested.minutes} minutes.`:view.pending?'Finish or stop this action before the next suggestion.':'This round is finished.';
  $('hint-action').disabled=!suggested;$('auto').disabled=view.status!=='playing';
  $('research').textContent=`Host ${HOST_VERSION}. Seed ${game.seed}. ${game.person.nextAttempt-1} attempts started. Active save ${JSON.stringify(exportGame(game)).length} bytes. Replay ${recording?`${recording.commands.length} commands recorded`:'off'}.`;
  $('replay-save').disabled=!recording;renderMap(view);
}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function autoStep(){if(game.status!=='playing'){stopAuto();return;}const view=getGameView(game);command(view.pending?{type:'finish'}:{type:'start',actionId:chooseAction(view,$('policy').value)});if(game.status==='playing'){autoTimer=setTimeout(autoStep,350);$('auto').textContent='Pause controller';}}
$('finish').addEventListener('click',()=>{stopAuto();command({type:'finish'});});$('advance').addEventListener('click',()=>{stopAuto();command({type:'advance',minutes:1});});$('interrupt').addEventListener('click',()=>{stopAuto();command({type:'interrupt'});});
$('policy').addEventListener('change',()=>{stopAuto();render();});$('hint-action').addEventListener('click',()=>{stopAuto();const id=chooseAction(getGameView(game),$('policy').value);if(id)command({type:'start',actionId:id});});
$('auto').addEventListener('click',()=>{if(autoTimer!==null)stopAuto();else autoStep();});
$('save').addEventListener('click',()=>download(exportGame(game),`courier-${game.seed}-${game.clock}min.json`));
$('replay-save').addEventListener('click',()=>{if(recording)download(recording,`courier-replay-${recording.seed}.json`);});
$('load').addEventListener('change',async event=>{stopAuto();const file=event.target.files[0];if(!file)return;try{if(file.size>16000)throw new Error('Save is too large. Choose a courier active save under 16 KB.');const loaded=importGame(JSON.parse(await file.text()));game=loaded;recording=null;persist();render();notice('Saved round loaded, including its pending action.');}catch(error){notice(`Could not load save: ${error.message}`);}event.target.value='';});
$('new-round').addEventListener('click',()=>{stopAuto();try{const seed=Number($('seed').value),next=createGame({seed});game=next;recording=$('record').checked?{version:HOST_VERSION,seed,commands:[]}:null;notice('');persist();render();window.scrollTo({top:0,behavior:'instant'});}catch(error){notice(error.message);}});
try{const saved=localStorage.getItem(SAVE_KEY);if(saved){if(saved.length>16000)throw new Error('Stored save exceeds size limit');game=importGame(JSON.parse(saved));$('seed').value=game.seed;}}catch{notice('The saved round could not be restored. A fresh round is ready; the old device save has not been overwritten.');}
render();
