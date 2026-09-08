/** Presentation only. The shell moves existing controls and mirrors public DOM text.
 * It never imports a host, reads a save, owns a timer, or dispatches a game command.
 */
const configurations={
  workshop:{
    goal:'Restore the pump, then test it before departure.',clock:'#time-left',clockLabel:'until departure',
    panels:[['Actions','.action-panel'],['Workshop','.map-card','.route-notes'],['You','.worker-card'],['Result','#outcome'],['Save','.session']],
    dock:'#pending-panel',work:[['You','#pending-title','#pending-time']],pending:'#pending-panel',
    bodies:[['You','']],resources:[['Carrying','#inventory']],help:'.delegate',
  },
  shift:{
    goal:'Get all three pumps running before your shift ends.',clock:'#time-left',clockLabel:'left in shift',
    panels:[['Actions','.action-panel'],['Yard','.job-board'],['You','.worker-card'],['Result','#outcome'],['Save','.session']],
    dock:'#pending-panel',work:[['You','#pending-title','#pending-time']],pending:'#pending-panel',
    bodies:[['You','']],resources:[['Running','#restored'],['Carrying','#inventory']],help:'.hints',
  },
  courier:{
    goal:'Deliver six parcels. Your bag holds three.',clock:'#remaining',clockLabel:'minutes left',
    panels:[['Actions','.action-panel'],['Map','.map-panel'],['Parcels','.manifest','.practice-panel'],['Result','#outcome'],['Save','.session']],
    dock:'#pending',work:[['You','#pending-label','#progress-text']],pending:'#pending',
    condition:'#condition',resources:[['Delivered','#delivery-count'],['Bag','#bag-count']],help:'.hints',
  },
  courtyard:{
    goal:'Store 14 buckets before the tap closes. Meryem needs 14 too.',clock:'#moves-left',clockLabel:'moves left',
    panels:[['Actions','.choices'],['Meryem','.neighbor-card','.talk'],['Water','.courtyard','.condition'],['History','#outcome','#last-turn'],['Save','.session','.hint']],
    work:[['You','#player-carried'],['Meryem','#neighbor-carried']],bodies:[['You','']],
    resources:[['Stored','#player-stored'],['Meryem','#neighbor-stored'],['Cistern','#source-water']],
  },
  commons:{
    goal:'Build a woodshed, workbench and garden. Keep the place growing.',clock:'#clock',clockLabel:'#day',
    panels:[['Work','#quick-start','.choices'],['People','.people'],['Camp','.worksite'],['Journal','.journal'],['Save','.session']],
    dock:'.time-controls',work:[['You','#player-job','#player-timing'],['Meryem','#neighbor-job','#neighbor-timing']],
    bodies:[['You','player'],['Meryem','neighbor']],resources:[['Timber','#timber'],['Salvage','#salvage'],['Food','#food']],
    stops:['#cancel','#release'],extra:'.stock',
  },
  'commons-next':{
    goal:'Pack caches: one equips a household or covers two camp nights.',clock:'#countdown',clockLabel:'#clock-label',
    panels:[['Work','#quick-start','.jobs'],['People','.people'],['Caches','.destinations','#checkpoint'],['Journal','#result','.journal'],['Save','.session','.clock-card']],
    dock:'.clock-card .time-controls',work:[['You','#player-job','#player-timing'],['Meryem','#neighbor-job','#neighbor-timing']],
    bodies:[['You','player'],['Meryem','neighbor']],resources:[['Timber','#timber'],['Salvage','#salvage'],['Food','#food'],['Caches','#available']],
    stops:['#cancel','#release'],extra:'.stock',result:'#result',checkpoint:'#checkpoint',
  },
  watch:{
    goal:'Repair the gate to keep water service, or divert to keep the site dry.',clock:'#minute',clockLabel:'minutes elapsed',
    panels:[['You','#keeper-card'],['Deniz','#watcher-card'],['Inlet','.waterside'],['Journal','#outcome','.journal'],['Save','.session']],
    dock:'.time-controls',work:[['You','#keeper-job','#keeper-timing'],['Deniz','#watcher-job','#watcher-timing']],
    bodies:[['You','keeper'],['Deniz','watcher']],resources:[['You','#keeper-parts'],['Deniz','#watcher-parts']],
    stops:['#keeper-stop','#watcher-stop'],alert:'#arrival',
  },
  signals:{
    goal:'Light the beacon before 32. The launch departs at 12; arriving at 12 misses it.',clock:'#minute',clockLabel:'of 32 minutes',
    panels:[['Route','.choices-panel','#profile-note'],['Notebook','.notebook'],['You','.kit'],['Journal','#outcome','.journal'],['Save','.session-tools']],
    dock:'.time-panel',work:[['You','#job','#job-time']],bodies:[['You','']],
    resources:[['Fares','#fares'],['Charges','#charges'],['Meals','#meal-count']],stops:['#stop'],alert:'#flights',
  },
  service:{
    goal:'Keep morning water flowing. Deliver to the clinic before minute 64.',clock:'#minute',clockLabel:'#phase-label',
    panels:[['You','#keeper-card'],['Deniz','#partner-card'],['Sites','.service-board','#carryover-panel'],['Journal','#outcome','.journal'],['Save','.session-tools']],
    dock:'.time-panel',work:[['You','#keeper-job','#keeper-timing'],['Deniz','#partner-job','#partner-timing']],
    bodies:[['You','keeper'],['Deniz','partner']],resources:[['You','#keeper-owned'],['Deniz','#partner-owned']],stops:['#keeper-stop','#partner-stop'],
  },
  'service-plan':{
    goal:'#objective',clock:'#minute',clockLabel:'of 64 minutes',
    panels:[['You','#keeper-card'],['Deniz','#partner-card'],['Plan','#plan-panel','.service-board'],['Journal','#outcome','.journal'],['Save','.session-tools','.how-to']],
    dock:'.time-panel',work:[['You','#keeper-job > strong','#keeper-job > span'],['Deniz','#partner-job > strong','#partner-job > span']],
    bodies:[['You','keeper'],['Deniz','partner']],resources:[['You','#keeper-owned'],['Deniz','#partner-owned']],stops:['#keeper-stop','#partner-stop','#cancel-discussion','#withdraw'],
  },
};

const game=location.pathname.split('/').filter(Boolean)[0],config=configurations[game];
if(config)mount(config);

function mount(config){
  const $=selector=>document.querySelector(selector);
  const text=selector=>$(selector)?.textContent.replace(/\s+/g,' ').trim()??'';
  const put=(element,value)=>{if(element.textContent!==value)element.textContent=value;};
  const make=(tag,className,content)=>{const element=document.createElement(tag);if(className)element.className=className;if(content)element.textContent=content;return element;};
  const main=$('main'),heading=$('h1'),intro=heading.closest('section'),oldChildren=[...main.children];
  const hud=make('section','game-hud');hud.setAttribute('aria-label','Goal and current state');
  const top=make('div','hud-top'),clock=make('div','hud-clock'),clockValue=make('strong'),clockLabel=make('span');
  clock.append(clockValue,clockLabel);top.append(heading,clock);
  const objective=make('p','hud-objective'),resources=make('p','hud-resources');
  const body=make('div','hud-bodies');body.setAttribute('aria-label','Condition estimates');
  hud.append(top,objective,resources,body);
  const tabs=make('nav','game-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Game sections');
  const content=make('div','game-content'),dock=make('section','game-dock');dock.setAttribute('aria-label','Current work and time controls');
  main.append(dock);
  const jobs=make('div','hud-jobs');dock.append(jobs);
  const controls=make('div','game-time-controls');dock.append(controls);
  const stopRow=make('div','hud-stops');dock.append(stopRow);
  const panels=[],buttons=[],previousUpdates=new Map(),unread=new Set();let selected=0;
  const feedback=make('p','hud-feedback');feedback.setAttribute('role','status');feedback.hidden=true;jobs.append(feedback);
  // Resolve references before moving ancestors, and keep every existing DOM node.
  const groups=config.panels.map(([label,...selectors])=>[label,selectors.map(selector=>$(selector)).filter(Boolean)]);
  const dockSource=config.dock?$(config.dock):null;
  if(dockSource)controls.append(dockSource);
  if(game==='commons-next')controls.append($('#time-status'));
  for(const selector of config.stops??[]){const node=$(selector);if(node)stopRow.append(node);}
  const saveNodes=groups.at(-1)[1];
  const overview=make('details','episode-overview'),overviewTitle=make('summary',null,'About this episode');
  overview.append(overviewTitle,intro);saveNodes.push(overview);
  if(['commons','commons-next'].includes(game)){
    const work=$('.jobs')??$('.choices'),rules=make('details','work-rules');rules.append(make('summary',null,'Work & recovery rules'));
    [...work.querySelectorAll(':scope > p')].forEach(node=>rules.append(node));work.append(rules);
    work.querySelector('a[href="#clock-label"]')?.remove();
    const first=$('#quick-start');if(first){const help=make('details');help.append(make('summary',null,'Suggested first moves'),first);groups[0][1]=groups[0][1].filter(node=>node!==first);saveNodes.push(help);}
  }
  if(config.help){const help=$(config.help);if(help)saveNodes.push(help);}
  // Playback preferences remain available without occupying the persistent dock.
  const pauseOption=$('#pause-idle')?.closest('label');
  if(pauseOption){const preferences=make('details');preferences.append(make('summary',null,'Playback options'),pauseOption);saveNodes.push(preferences);}
  if(config.extra){const source=$(config.extra);if(source)saveNodes.push(source);}
  if($('.play-note'))saveNodes.push($('.play-note'));
  groups.forEach(([label,nodes],index)=>{
    const panel=make('section','game-panel');panel.id=`game-panel-${index}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',`game-tab-${index}`);panel.tabIndex=0;
    const button=make('button','game-tab',label);button.type='button';button.id=`game-tab-${index}`;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);
    button.addEventListener('click',()=>select(index));
    button.addEventListener('keydown',event=>{
      const next=event.key==='ArrowRight'?(index+1)%groups.length:event.key==='ArrowLeft'?(index-1+groups.length)%groups.length:event.key==='Home'?0:event.key==='End'?groups.length-1:null;
      if(next!==null){event.preventDefault();select(next,true);}
    });
    nodes.forEach(node=>panel.append(node));panels.push(panel);buttons.push(button);content.append(panel);tabs.append(button);
  });
  const notice=$('#notice');main.replaceChildren(hud,...(notice?[notice]:[]),tabs,content,dock);
  // Preserve any unclassified element in the setup panel rather than discard it.
  for(const old of oldChildren){if(!main.contains(old)&&old!==notice&&old!==intro&&old.childNodes.length){
    if(old.matches('.layout,.game-layout,.play-grid,.work-layout,.work-column,.play-layout,.lower-grid')){
      const residual=[...old.querySelectorAll('section,details')].filter(node=>!node.parentElement.closest('section,details'));
      residual.forEach(node=>panels.at(-1).append(node));
    }else if(!old.matches('nav,.mobile-jump'))panels.at(-1).append(old);
  }}
  document.body.classList.add('compact-game');document.body.dataset.game=game;
  // The original five games share the collection entry point too.
  const back=$('header a');if(back?.getAttribute('href')==='/') {back.href='/games/';back.textContent='← Games';}
  function select(index,focus=false){
    selected=index;
    panels.forEach((panel,i)=>{panel.hidden=i!==index;buttons[i].setAttribute('aria-selected',String(i===index));buttons[i].tabIndex=i===index?0:-1;});
    unread.delete(index);buttons[index].classList.remove('has-update');buttons[index].removeAttribute('aria-label');
    if(focus)buttons[index].focus({preventScroll:true});
  }
  select(0);
  const actorRows=(config.work??[]).map(([name])=>{
    const row=make('div','hud-job'),title=make('strong'),timing=make('span');row.append(title,timing);jobs.append(row);return {row,title,timing,name};
  });
  const bodyRows=(config.bodies??[]).map(([name])=>{const row=make('span','hud-body');body.append(row);return {row,name};});
  const alert=make('p','hud-alert');hud.append(alert);
  let wasEnded=false,wasCheckpoint=false;
  function sync(){
    put(clockValue,text(config.clock));put(clockLabel,config.clockLabel.startsWith('#')?text(config.clockLabel):config.clockLabel);
    put(objective,config.goal.startsWith('#')?text(config.goal):config.goal);
    put(resources,config.resources.map(([label,selector])=>`${label}: ${text(selector)}`).join(' · '));
    bodyRows.forEach(({row,name},i)=>{
      const prefix=config.bodies[i][1],id=prefix?prefix+'-':'';
      const fatigue=$('#'+id+'fatigue'),hunger=$('#'+id+'hunger');
      put(row,`${name} · fatigue ${Math.round((fatigue?.value??0)*100)}% · hunger ${Math.round((hunger?.value??0)*100)}%`);
      row.hidden=prefix==='neighbor'&&Boolean($('#neighbor-card')?.hidden);
    });
    if(config.condition)put(body,text(config.condition));
    actorRows.forEach(({row,title,timing,name},i)=>{
      const [,jobSelector,timeSelector]=config.work[i],pendingHidden=config.pending&&$(config.pending)?.hidden;
      put(title,`${name}: ${pendingHidden?'Ready to choose':text(jobSelector)||'Ready to choose'}`);
      put(timing,pendingHidden?'':timeSelector?text(timeSelector):'');
      row.hidden=name==='Meryem'&&Boolean($('#neighbor-card')?.hidden);
    });
    const alertSource=config.alert?$(config.alert):null;
    let alertText=alertSource&&!alertSource.hidden?text(config.alert):'';
    if(game==='signals'&&text('#report-value')!=='Unseen')alertText=`Notebook: ${text('#report-value')} · ${text('#freshness')}${alertText?' · '+alertText:''}`;
    put(alert,alertText);alert.hidden=!alert.textContent;
    if(game==='courtyard'){const last=$('#last-turn');put(feedback,last&&!last.hidden?`You: ${text('#your-event')} Meryem: ${text('#her-event')}`:'');feedback.hidden=!feedback.textContent;}
    const cancel=$('#cancel');if(cancel&&cancel.hidden!==cancel.disabled)cancel.hidden=cancel.disabled;
    const discussionStop=$('#cancel-discussion'),discussion=$('#pending-plan');
    if(discussionStop&&discussion&&discussionStop.hidden!==discussion.hidden)discussionStop.hidden=discussion.hidden;
    const noStops=![...stopRow.children].some(node=>!node.hidden);if(stopRow.hidden!==noStops)stopRow.hidden=noStops;
    const outcome=$(config.result??'#outcome'),ended=Boolean(outcome&&!outcome.hidden);
    if(ended&&!wasEnded){const panel=outcome.closest('[role="tabpanel"]');if(panel){select(panels.indexOf(panel));outcome.tabIndex=-1;outcome.focus({preventScroll:true});}}
    const talk=$('.talk'),playControls=$('#play-controls');
    if(talk&&playControls&&talk.hidden!==playControls.hidden)talk.hidden=playControls.hidden;
    wasEnded=ended;
    const checkpoint=config.checkpoint?$(config.checkpoint):null,isCheckpoint=Boolean(checkpoint&&!checkpoint.hidden);
    if(isCheckpoint&&!wasCheckpoint){select(panels.indexOf(checkpoint.closest('[role="tabpanel"]')));checkpoint.tabIndex=-1;checkpoint.focus({preventScroll:true});}
    wasCheckpoint=isCheckpoint;
    panels.forEach((panel,i)=>{
      if(i===panels.length-1)return;
      const updates=[...panel.querySelectorAll('.response,#report-provenance,#receipt-count,#plan-status,#last-turn-title,#neighbor-speech,.journal li:first-child')].filter(node=>{let parent=node;while(parent&&parent!==panel){if(parent.hidden)return false;parent=parent.parentElement;}return true;}).map(node=>node.textContent.trim()).join('|');
      if(previousUpdates.has(i)&&previousUpdates.get(i)!==updates&&i!==selected)unread.add(i);
      previousUpdates.set(i,updates);if(i===selected)unread.delete(i);
      buttons[i].classList.toggle('has-update',unread.has(i));
      if(unread.has(i))buttons[i].setAttribute('aria-label',config.panels[i][0]+' · new update');else buttons[i].removeAttribute('aria-label');
    });
  }
  sync();
  // Watch public view updates; writes to the shell itself do not feed back.
  new MutationObserver(records=>{
    if(records.some(record=>!record.target.parentElement?.closest('.game-hud,.hud-jobs,.game-tabs')))sync();
  }).observe(main,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','value','disabled','aria-pressed']});
  // Existing in-game anchors reveal their panel before the browser resolves focus.
  main.addEventListener('click',event=>{
    const anchor=event.target.closest('a[href^="#"]');if(!anchor)return;
    const target=$(anchor.getAttribute('href'));if(!target)return;
    const panel=target.closest('[role="tabpanel"]');if(!panel)return;
    event.preventDefault();select(panels.indexOf(panel));
    for(let node=target;node&&node!==panel;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
    if(target.tagName==='DETAILS')target.querySelector('summary')?.focus({preventScroll:true});else {target.tabIndex=-1;target.focus({preventScroll:true});}
    target.scrollIntoView({block:'nearest'});
  },true);
  if(game==='shift')main.addEventListener('click',event=>{if(event.target.closest('[data-job],#depot'))queueMicrotask(()=>{select(0);$('#action-title').tabIndex=-1;$('#action-title').focus({preventScroll:true});});});
}
