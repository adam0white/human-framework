import {HOST_VERSION,createGame,getGameView,chooseAction,applyCommand,exportGame,importGame} from '/src/games/workshop.js';

const $=id=>document.getElementById(id),SAVE_KEY='human-workshop-v0.1';
let game=createGame({seed:1}),commands=null,replaySetup=null,autoTimer=null;
const time=minutes=>minutes>=60?`${Math.floor(minutes/60)}h${minutes%60?` ${Math.round(minutes%60)}m`:''}`:`${Math.round(minutes)}m`;
const level=value=>value<0.3?'Low':value<0.6?'Moderate':value<0.8?'High':'Very high';
function notify(message){$('notice').textContent=message;$('notice').hidden=!message;}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(exportGame(game)));$('save-status').textContent='Saved on this device after every move';}catch{$('save-status').textContent='Device storage unavailable — download a save to keep this run';}}
function pause(){if(autoTimer!==null)clearTimeout(autoTimer);autoTimer=null;}
function dispatch(command) {
  try {game=applyCommand(game,command);if(commands)commands.push(structuredClone(command));notify('');persist();render();return true;}
  catch(error){pause();notify(error.message);render();return false;}
}
function renderObjects(view) {
  for(const room of ['storage','pump-room'])$(room==='storage'?'storage-room':'pump-room').classList.toggle('current',view.location===room);
  $('location-text').textContent=`In ${view.location==='storage'?'storage':'the pump room'}`;
  $('storage-objects').replaceChildren();
  for(const [label,present] of [['Wrench',view.objects.wrench.location==='storage'],['Spare seal',view.objects.seal.location==='storage'],[`${view.objects.rations.count} meals`,view.objects.rations.count>0]]){
    const item=document.createElement('span');item.textContent=label;if(!present)item.className='absent';$('storage-objects').append(item);
  }
  const pump=view.objects.pump.status;
  const status=document.createElement('span');status.textContent=pump==='broken'?'Pump · leaking':pump==='repaired'?'Pump · repaired, needs test':'Pump · water flowing';
  $('pump-objects').replaceChildren(status);
  if(view.objects.pump.inspection){const observed=document.createElement('span');observed.textContent=`Inspected: ${view.objects.pump.inspection.condition}`;$('pump-objects').append(observed);}
  document.querySelector('.pump-art').setAttribute('class',`room-art pump-art ${pump}`);
  const items=[];if(view.objects.wrench.location==='inventory')items.push('Wrench');if(view.objects.seal.location==='inventory')items.push('Spare seal');
  $('inventory').textContent=items.join(' + ')||'Nothing yet';
}
function render() {
  const view=getGameView(game),suggestion=chooseAction(view,game.policy);
  $('time-left').textContent=time(view.remainingMinutes);$('time-bar').style.width=`${view.remainingMinutes/view.deadline*100}%`;
  $('elapsed').textContent=`${time(view.clock)} elapsed`;renderObjects(view);
  for(const key of ['fatigue','hunger']){$(key).value=view.worker.body[key];$(key+'-text').textContent=level(view.worker.body[key]);}
  $('last-event').textContent=view.lastEvent.message;$('last-event').className=`event ${view.lastEvent.status}`;
  $('pending-panel').hidden=!view.pending;$('actions').hidden=Boolean(view.pending)||view.status!=='playing';
  $('actions').replaceChildren();
  for(const action of view.actions){
    const button=document.createElement('button');button.type='button';button.className='action';button.dataset.action=action.id;
    const top=document.createElement('span');top.className='action-top';
    const name=document.createElement('span');name.className='action-title';name.textContent=action.label;
    const duration=document.createElement('span');duration.className='action-time';duration.textContent=`${action.durationMinutes} min`;
    top.append(name,duration);button.append(top);
    const detail=document.createElement('span');detail.className='action-description';detail.textContent=action.detail;button.append(detail);
    if(action.estimatedSuccess!==null||action.exertive){
      const forecast=document.createElement('span');forecast.className='action-forecast';
      forecast.textContent=action.estimatedSuccess===null?'Light effort':`Estimated success ${Math.round(action.estimatedSuccess*100)}% · ${action.effort>=0.25?'higher':'moderate'} effort`;
      if(!action.capacity.allowed){forecast.classList.add('warning');forecast.textContent+=' · capacity looks insufficient (2 idle min if blocked)';}
      button.append(forecast);
    }
    button.addEventListener('click',()=>{pause();if(dispatch({type:'start',actionId:action.id}))$('finish').focus({preventScroll:true});});$('actions').append(button);
  }
  if(view.pending){
    const pending=view.pending;$('pending-title').textContent=pending.label;$('pending-time').textContent=`${time(pending.elapsedMinutes)} / ${time(pending.totalMinutes)}`;
    $('action-progress').max=pending.totalMinutes;$('action-progress').value=pending.elapsedMinutes;
    $('pending-detail').textContent=pending.blocked?'This effort was blocked. Finishing or stopping consumes the remaining part of a 2-minute idle interruption. You then choose what to do.':'You can advance a little, finish the interval, or stop. Time and practice already spent remain. Save at any point to resume later.';
    $('advance').textContent=`Advance ${Math.min(5,pending.totalMinutes-pending.elapsedMinutes)} min`;
  }
  const finished=view.status!=='playing';$('outcome').hidden=!finished;
  $('outcome').textContent=view.status==='won'?`Ready to leave, with ${time(view.remainingMinutes)} to spare.`:'The ride has arrived. The pump is still not running.';
  if(finished)pause();
  const next=view.actions.find(action=>action.id===suggestion);
  $('suggestion').textContent=finished?'Try another route or seed in New run & controller.':view.pending?'Finish or stop the current action before choosing another.':`${game.policy==='task-aware'?'Task-aware':game.policy==='planned-simple'?'Planned simple':'Greedy'} suggestion: ${next?.label??'none'}`;
  $('suggested').disabled=finished||Boolean(view.pending);$('auto').disabled=finished;$('auto').textContent=autoTimer===null?'Run controller':'Pause controller';
  if(autoTimer!==null)$('controller-help').open=true;
  $('research-facts').textContent=`Host ${HOST_VERSION}. Repair skill estimate: ${Math.round(view.worker.skills.repair*100)}%. Clock and elapsed person time: ${time(view.clock)}. No social effects. ${commands?`${commands.length} replay commands recorded.`:'Replay recording is off for this run.'}`;
  $('replay-download').disabled=commands===null;
}
function controllerStep(){
  if(game.status!=='playing'){pause();render();return;}
  if(game.pending){if(!dispatch({type:'finish'}))return;}
  else {const actionId=chooseAction(getGameView(game),game.policy);if(!actionId||!dispatch({type:'start',actionId}))return;}
  if(game.status==='playing'){autoTimer=setTimeout(controllerStep,650);render();}else{pause();render();}
}
function download(value,name){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('advance').addEventListener('click',()=>{pause();dispatch({type:'advance',minutes:5});});
$('finish').addEventListener('click',()=>{pause();if(dispatch({type:'finish'}))document.querySelector('#actions button')?.focus({preventScroll:true});});
$('interrupt').addEventListener('click',()=>{pause();if(dispatch({type:'interrupt',reason:'You stopped the action'}))document.querySelector('#actions button')?.focus({preventScroll:true});});
$('suggested').addEventListener('click',()=>{pause();const actionId=chooseAction(getGameView(game),game.policy);if(actionId&&dispatch({type:'start',actionId}))$('finish').focus({preventScroll:true});});
$('auto').addEventListener('click',()=>{if(autoTimer!==null){pause();render();}else controllerStep();});
$('controller-help').addEventListener('toggle',()=>{if(autoTimer!==null)$('controller-help').open=true;});
$('save').addEventListener('click',()=>download(exportGame(game),`workshop-seed-${game.seed}-minute-${game.clock}.json`));
$('replay-download').addEventListener('click',()=>{if(commands)download({version:HOST_VERSION,...replaySetup,commands},`workshop-replay-${game.seed}.json`);});
$('reset').addEventListener('click',()=>{
  try {const next=createGame({seed:Number($('seed').value),policy:$('policy').value});pause();game=next;
    commands=$('record').checked?[]:null;replaySetup={seed:game.seed,policy:game.policy};notify('');persist();render();}
  catch(error){notify(error.message);}
});
$('import').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try {if(file.size>100000)throw new Error('This file is too large to be an active workshop save');
    const loaded=importGame(JSON.parse(await file.text()));pause();game=loaded;commands=null;replaySetup=null;
    $('seed').value=game.seed;$('policy').value=game.policy;persist();render();notify('Save loaded. You can continue the pending action, if any.');}
  catch(error){notify(`Could not load save: ${error.message}`);}finally{event.target.value='';}
});
try {const raw=localStorage.getItem(SAVE_KEY);if(raw){game=importGame(JSON.parse(raw));$('seed').value=game.seed;$('policy').value=game.policy;}}
catch{notify('The previous device save could not be restored. A fresh run is ready.');}
render();
