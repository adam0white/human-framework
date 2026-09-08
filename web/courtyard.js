import {COURTYARD_VERSION,TURNS,TARGET,createGame,getGameView,playTurn,chooseAction,exportGame,importGame} from '/src/games/courtyard.js';
import {createSession,replaySession} from '/src/games/courtyard-session.js';

const $=id=>document.getElementById(id),SAVE_KEY='human-courtyard-0.1';
let game=createGame(),session=null,timer=null;
const level=value=>value<.3?'Low':value<.6?'Moderate':value<.8?'High':'Very high';
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
function pause(){if(timer!==null)clearTimeout(timer);timer=null;}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(exportGame(game)));$('save-state').textContent='Saved on this device after each move';}catch{$('save-state').textContent='Device storage unavailable — download a save to keep this run';}}
function dispatch(action){
  try{game=playTurn(game,action);if(session)session.actions.push(action);persist();notice('');render();return true;}
  catch(error){pause();notice(error.message);render();return false;}
}
function manual(action){pause();if(dispatch(action)){
  if(game.status!=='playing')$('outcome').focus({preventScroll:true});
  else if(game.social.proposal)$('accept').focus();
  else document.querySelector(`[data-action="${action}"]:not(:disabled)`)?.focus({preventScroll:true});
}}
function makeAction(action,shortLabel=null){
  const button=document.createElement('button');button.type='button';button.className='move';button.dataset.action=action.id;
  button.disabled=Boolean(action.unavailable);button.title=action.unavailable??action.detail;
  const top=document.createElement('span');top.className='top';
  const label=document.createElement('span');label.className='name';label.textContent=shortLabel??action.label;
  const cost=document.createElement('span');cost.className='cost';cost.textContent='1 move';top.append(label,cost);
  const detail=document.createElement('span');detail.className='detail';
  detail.textContent=action.unavailable??({offer:'A gift. She can refuse.',ask:'A gift, if she agrees.',borrow:'Return 2 within 3 moves.'}[action.id]??action.detail);button.append(top,detail);
  if(action.estimatedCleanLift!==null||action.effort){
    const forecast=document.createElement('span');forecast.className='forecast';
    forecast.textContent=action.estimatedCleanLift!==null?`${Math.round(action.estimatedCleanLift*100)}% estimated chance of no spill`:'Lower effort';
    if(!action.capacity.allowed){forecast.classList.add('warning');forecast.textContent='Looks beyond capacity · blocked work still costs a move';}
    button.append(forecast);
  }
  button.addEventListener('click',()=>manual(action.id));return button;
}
function render(){
  const view=getGameView(game),ended=view.status!=='playing';
  $('moves-left').textContent=view.remainingTurns;$('clock-caption').textContent=ended?'tap closed':view.remainingTurns===1?'move left':'moves left';
  $('turn-label').textContent=ended?'18 moves used':`Move ${view.round+1} of ${TURNS}`;
  $('turn-dots').replaceChildren(...Array.from({length:TURNS},(_,i)=>{const dot=document.createElement('span');dot.className=`turn-dot${i<view.round?' paid':''}`;return dot;}));
  $('source-water').textContent=view.source;document.querySelector('.source').classList.toggle('empty',view.source===0);
  $('supply-caption').textContent=view.source===0?'The cistern is empty':`${view.profile==='scarce'?'A scarce':view.profile==='plentiful'?'A plentiful':'A finite'} supply`;
  $('spilled').textContent=view.spilled?`${view.spilled} spilled on the stones`:'No water spilled';
  for(const id of ['player','neighbor']){
    $(id+'-stored').textContent=view.homes[id];$(id+'-in-barrel').textContent=view.homes[id];
    $(id+'-water').style.height=`${view.homes[id]/TARGET*100}%`;
    $(id+'-carried').textContent=`Carrying ${view.carried[id]} / 6`;
    $(id+'-cans').replaceChildren(...Array.from({length:6},(_,i)=>{const can=document.createElement('span');can.className=`can${i<view.carried[id]?' full':''}`;return can;}));
  }
  for(const key of ['fatigue','hunger']){$(key).value=view.player.body[key];$(key+'-label').textContent=level(view.player.body[key]);}
  $('neighbor-condition').textContent=`Meryem · ${level(view.neighbor.body.fatigue).toLowerCase()} fatigue`;
  const turn=view.lastTurn;
  $('your-event').textContent=turn?`You: ${turn.player.message}`:'The water is here. Decide what to carry, keep, or share.';
  $('her-event').hidden=!turn;$('her-event').textContent=turn?`Meryem: ${turn.neighbor.message}`:'';
  const speaking=turn&&['request','propose','respond'].includes(turn.neighbor.actionId);
  $('neighbor-speech').textContent=speaking?`“${turn.neighbor.message}”`:ended?view.homes.neighbor===TARGET?'“My household has its water for the evening.”':'“My household’s barrel is still short.”':turn?turn.neighbor.message:'“We have until the tap closes. I’ll work on my household’s barrel.”';
  const proposal=view.social.proposal;$('proposal').hidden=!proposal;
  if(proposal){
    $('proposal-detail').textContent=proposal.kind==='offer'?'Meryem offers you 2 buckets from her cans.':'Meryem is asking for 2 buckets from your cans.';
    const accept=view.actions.find(a=>a.id==='accept');$('accept').disabled=Boolean(accept.unavailable);$('accept').title=accept.unavailable??'';
    $('accept').textContent=proposal.kind==='offer'?'Take the two · 1 move':'Give two · 1 move';
  }
  const loan=view.social.loan;$('loan').hidden=!loan;
  if(loan)$('loan').textContent=loan.late?`You still owe 2 buckets. They were due by move ${loan.dueRound}; a return now is late.`:`You owe 2 buckets. Return them by the end of move ${loan.dueRound}${loan.dueRound-view.round===0?' — your next move will be late.':` (${loan.dueRound-view.round} moves remain).`}`;
  const facts=[];if(view.social.given.player)facts.push(`You gave ${view.social.given.player} buckets`);if(view.social.given.neighbor)facts.push(`Meryem gave ${view.social.given.neighbor}`);
  if(view.social.returnedOnTime)facts.push(`${view.social.returnedOnTime} loan${view.social.returnedOnTime===1?'':'s'} returned on time`);
  if(view.social.returnedLate)facts.push(`${view.social.returnedLate} returned late`);
  if(view.social.refusedByPlayer)facts.push(`You declined ${view.social.refusedByPlayer}`);
  if(view.social.refusedByNeighbor)facts.push(`Meryem declined ${view.social.refusedByNeighbor}`);
  $('relationship').textContent=facts.length?facts.join(' · ')+'.':'No gifts have been exchanged yet.';
  $('play-controls').hidden=ended;$('outcome').hidden=!ended;
  if(ended){
    pause();$('outcome-title').textContent=view.homes.player===TARGET?'Your household has its water.':'Your barrel is still short.';
    $('outcome-detail').textContent=`Your barrel: ${view.homes.player} of 14. Meryem’s: ${view.homes.neighbor} of 14. ${view.status==='both-ready'?'Both households are ready for the evening.':view.homes.neighbor===TARGET?'Meryem’s household is ready.':view.homes.player===TARGET?'Meryem needed more time or water.':'The afternoon ended before either barrel was filled.'}${loan?' The two-bucket loan is still outstanding.':''}`;
  }
  for(const [container,ids] of [['work-actions',['draw-quick','draw-careful','pour']],['recovery-actions',['rest','eat']],['social-actions',['offer','ask','borrow','repay']]]){
    $(container).replaceChildren();for(const id of ids){const a=view.actions.find(a=>a.id===id);if(!a||id==='repay'&&!loan)continue;
      $(container).append(makeAction(a,{offer:'Offer 2',ask:'Ask for 2',borrow:'Borrow 2'}[id]));}
  }
  const suggestion=chooseAction(view,$('policy').value),suggested=view.actions.find(a=>a.id===suggestion);
  $('suggestion').textContent=ended?'Try a new afternoon to compare a different route.':`Suggested: ${suggested?.label??'none'}. ${suggested?.detail??''}`;
  $('suggested').disabled=ended;$('auto').disabled=ended;$('auto').textContent=timer===null?'Watch this controller':'Pause controller';
  $('research-facts').textContent=`Courtyard ${COURTYARD_VERSION}. Collection practice: ${Math.round(view.player.skills.collection*100)}%. ${view.clock} fictional minutes elapsed. Exchange history ${view.socialMemory?'enabled':'ignored by the neighbor policy'}. ${session?`${session.actions.length} choices in the separate replay.`:'Replay recording is off.'}`;
  $('download-replay').disabled=!session;
}
function syncSetup(){$('seed').value=game.seed;$('profile').value=game.profile;$('memory').checked=game.socialMemory;}
function newRun(nextSeed=null){
  try{const setup={seed:nextSeed??Number($('seed').value),profile:$('profile').value,socialMemory:$('memory').checked};
    const next=createGame(setup);pause();game=next;session=$('record').checked?createSession(setup):null;syncSetup();notice('');persist();render();}
  catch(error){notice(error.message);}
}
function autoStep(){
  if(game.status!=='playing'){pause();render();return;}
  if(!dispatch(chooseAction(getGameView(game),$('policy').value)))return;
  if(game.status==='playing'){timer=setTimeout(autoStep,950);render();}else{pause();render();}
}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('accept').addEventListener('click',()=>manual('accept'));$('refuse').addEventListener('click',()=>manual('refuse'));
$('new-run').addEventListener('click',()=>newRun());$('again').addEventListener('click',()=>{newRun((game.seed+1)>>>0);document.querySelector('[data-action="draw-quick"]')?.focus({preventScroll:true});});
$('policy').addEventListener('change',()=>{pause();render();});
$('suggested').addEventListener('click',()=>manual(chooseAction(getGameView(game),$('policy').value)));
$('auto').addEventListener('click',()=>{if(timer!==null){pause();render();}else autoStep();});
$('download-save').addEventListener('click',()=>download(exportGame(game),`courtyard-${game.seed}-move-${game.round}.json`));
$('download-replay').addEventListener('click',()=>{if(session)download(session,`courtyard-replay-${game.seed}.json`);});
$('load-save').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{if(file.size>25000)throw new Error('This file is too large for a courtyard save or replay.');
    const record=JSON.parse(await file.text()),isReplay=record.format==='courtyard-replay';
    const next=isReplay?replaySession(record):importGame(record);pause();game=next;session=isReplay?structuredClone(record):null;
    syncSetup();persist();render();notice(isReplay?'Replay reproduced. You can continue from this move.':'Save loaded. This afternoon continues from the saved move.');
  }catch(error){notice(`Could not load: ${error.message}`);}finally{event.target.value='';}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();render();}});
try{const raw=localStorage.getItem(SAVE_KEY);if(raw)game=importGame(JSON.parse(raw));}catch{notice('The previous device save could not be restored. A fresh afternoon is ready.');}
syncSetup();render();
