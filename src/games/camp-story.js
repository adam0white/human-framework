import * as camp from './camp.js';
import * as rain from './commons-next.js';

export const CAMP_STORY_VERSION='0.1.0';
export const FERRY_MINUTES=90,RAIN_MINUTES=180;
export const MAX_WINDOW_COMMANDS=2048,ORDINARY_COMMAND_LIMIT=1024;
const WORLD_LIMIT=1e9,MAX_NODES=250000,MAX_DEPTH=48,MAX_JSON_CHARACTERS=1048576;
const copy=value=>structuredClone(value),trusted=new WeakSet();
const exact=(value,fields,label)=>{if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).length!==fields.length||fields.some(key=>!Object.hasOwn(value,key)))throw new Error(`Invalid ${label} fields`);};
const integer=(value,min,max,label)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`Invalid ${label}`);};
function inspect(value){
  const seen=new WeakSet();let nodes=0,characters=0;
  const debit=amount=>{characters+=amount;if(characters>MAX_JSON_CHARACTERS)throw new Error('Story save exceeds bounded JSON size');};
  const string=value=>{if(value.length>10000)throw new Error('Story save string too large');debit(JSON.stringify(value).length);};
  function visit(item,depth){
    if(++nodes>MAX_NODES||depth>MAX_DEPTH)throw new Error('Story save exceeds bounded JSON size');
    if(item===null||typeof item==='boolean'){debit(5);return;}
    if(typeof item==='number'){if(!Number.isFinite(item)||Object.is(item,-0))throw new Error('Invalid nonfinite story number');debit(String(item).length);return;}
    if(typeof item==='string'){string(item);return;}
    if(typeof item!=='object'||seen.has(item))throw new Error('Story save must be an unshared JSON tree');
    seen.add(item);if(Array.isArray(item)?Object.getPrototypeOf(item)!==Array.prototype:![Object.prototype,null].includes(Object.getPrototypeOf(item)))throw new Error('Invalid story JSON object prototype');
    if(Reflect.ownKeys(item).some(key=>typeof key!=='string'))throw new Error('Invalid story JSON key');
    debit(2);for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))){
      if(Array.isArray(item)&&key==='length')continue;
      if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('Invalid story JSON accessor');
      if(!Array.isArray(item))string(key);debit(2);
      visit(descriptor.value,depth+1);
    }
    if(Array.isArray(item)&&Object.keys(item).length!==item.length)throw new Error('Invalid sparse story array');
  }
  visit(value,0);
}
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
function seal(game){freeze(game);trusted.add(game);return game;}
function equal(a,b){if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]));}
const count=(game,destination)=>game.window?.allocations.filter(item=>item.destination===destination).length??0;
const covered=game=>count(game,'households')===2&&count(game,'camp')===2;
function phase(game){
  if(!game.window)return 'camp';
  if(game.returned)return 'camp-return';
  const w=game.window;
  if(w.finishedAt!==null)return 'ended';
  if(!w.acknowledged)return 'introduction';
  if(game.world.clock.now===w.rainAt)return 'rain';
  if(w.departedAt===null&&game.world.clock.now===w.ferryAt)return 'ferry';
  return 'packing';
}
const timeLimit=game=>game.window?WORLD_LIMIT:WORLD_LIMIT-RAIN_MINUTES;
const pauseReason=game=>({introduction:'Read the new supply objective, then Continue.',ferry:'The ferry is waiting. Allocate supplies, then send it.',rain:'The rain checkpoint is here. Allocate remaining camp supplies, then finish.',ended:'This supply window is finished. Return to camp or save and leave.'})[phase(game)]??(game.world.clock.now>=timeLimit(game)?'The supported camp time limit is reached. Stop active work or save and leave.':null);
const runs=game=>['camp','packing','camp-return'].includes(phase(game))&&game.world.clock.now<timeLimit(game);
function requireRunning(game){if(!runs(game))throw new Error(pauseReason(game));}
function windowFor(world){
  integer(world.clock.now,0,WORLD_LIMIT-RAIN_MINUTES,'supply-window entry time');
  return {enteredAt:world.clock.now,ferryAt:world.clock.now+FERRY_MINUTES,rainAt:world.clock.now+RAIN_MINUTES,carriedCaches:world.caches,production:[],allocations:[],acknowledged:false,departedAt:null,finishedAt:null};
}
function enter(game,kind){
  if(game.window||game.record)throw new Error('This camp already entered its supply window');
  game.window=windowFor(game.world);game.record={kind,root:camp.exportGame(game.world),commands:[]};
}
function fromWorld(world){return {version:CAMP_STORY_VERSION,world,window:null,record:null,returned:false};}
function rootGame(record){
  if(record.kind==='legacy-rain'){
    exact(record.root,['snapshot','options'],'legacy rain root');
    const previous=rain.restoreGame(record.root.snapshot),world=camp.migrateLegacyGame({format:'human-common-ground',version:1,game:previous.world},record.root.options);
    if(world.solo)throw new Error('This story requires the shared camp');
    const game=fromWorld(world);
    game.window={enteredAt:previous.openedAt,ferryAt:previous.openedAt+FERRY_MINUTES,rainAt:previous.openedAt+RAIN_MINUTES,carriedCaches:0,
      production:previous.production.map((item,index)=>({cache:index+1,at:item.at})),allocations:copy(previous.allocations),acknowledged:true,departedAt:previous.departedAt,finishedAt:previous.ended?world.clock.now:null};
    game.record=copy(record);game.record.commands=[];return game;
  }
  if(!['earned','legacy'].includes(record.kind))throw new Error('Invalid story entry origin');
  const world=camp.restoreGame(record.root);
  if(world.solo||world.milestoneAt===null||record.kind==='earned'&&world.milestoneAt!==world.clock.now)throw new Error('Invalid earned camp entry snapshot');
  if(record.kind==='legacy'&&(!world.origin||!equal(world,camp.migrateLegacyGame(world.origin,world.options))))throw new Error('Legacy entry must equal the explicit migration of its original source');
  const game=fromWorld(world);enter(game,record.kind);return game;
}
function append(game,command){
  const journal=game.record.commands,last=journal.at(-1);
  if(command.type==='advance'&&last?.type==='advance')last.minutes+=command.minutes;
  else {if(journal.length>=MAX_WINDOW_COMMANDS)throw new Error('Story journal limit reached');journal.push(copy(command));}
}
function sourceCommand(command){
  if(!command||typeof command!=='object')throw new Error('Invalid story command');
  const fields={start:['type','id'],cancel:['type'],request:['type','project'],release:['type'],handover:['type','from','to'],advance:['type','minutes'],continue:['type'],allocate:['type','destination'],dispatch:['type'],finish:['type'],return:['type']}[command.type];
  if(!fields)throw new Error('Unknown story command');exact(command,fields,'story command');
  if(command.type==='advance')integer(command.minutes,1,RAIN_MINUTES,'journal advance');
}
function mutate(game,command,{record=true}={}){
  const type=command.type,w=game.window,current=phase(game);
  if(['start','request','handover'].includes(type)&&w&&!game.returned&&game.record.commands.length>=ORDINARY_COMMAND_LIMIT)throw new Error('The ordinary command budget is used. Stop work, advance, or finish this window.');
  if(['start','request','handover'].includes(type))requireRunning(game);
  if(type==='start')game.world=camp.startJob(game.world,command.id);
  else if(type==='cancel')game.world=camp.cancelJob(game.world);
  else if(type==='request')game.world=camp.requestProject(game.world,command.project);
  else if(type==='release')game.world=camp.releaseProject(game.world);
  else if(type==='handover')game.world=camp.requestHandover(game.world,command.from,command.to);
  else if(type==='advance'){
    requireRunning(game);integer(command.minutes,0,1440,'advance minutes');
    if(!command.minutes)return game;
    const checkpoint=w&&!game.returned?(w.departedAt===null?w.ferryAt:w.rainAt):game.window?WORLD_LIMIT:WORLD_LIMIT-RAIN_MINUTES;
    const target=Math.min(checkpoint,game.world.clock.now+command.minutes),began=game.world.clock.now;
    while(game.world.clock.now<target){
      const before=game.world.caches;game.world=camp.advanceGame(game.world,1);
      if(w&&!game.returned)for(let cache=before+1;cache<=game.world.caches;cache++)w.production.push({cache,at:game.world.clock.now});
      if(!w&&game.world.milestoneAt!==null){enter(game,'earned');return game;}
    }
    if(record&&w&&!game.returned&&game.world.clock.now>began)append(game,{type:'advance',minutes:game.world.clock.now-began});
    return game;
  } else if(type==='continue'){
    if(current!=='introduction')throw new Error('The introduction was already continued or has not begun');w.acknowledged=true;
  } else if(type==='allocate'){
    if(!w||['introduction','ended','camp-return'].includes(current))throw new Error('Allocation is unavailable before Continue or after the window is finished');
    if(!['households','camp'].includes(command.destination))throw new Error('Unknown cache destination');
    if(command.destination==='households'&&w.departedAt!==null)throw new Error('The ferry has departed. Later caches can still provision camp.');
    if(count(game,command.destination)>=2)throw new Error('This destination is fully covered');
    if(game.world.caches<=w.allocations.length)throw new Error('Complete a cache before allocating it');
    const used=new Set(w.allocations.map(item=>item.cache));let cache=1;while(used.has(cache))cache++;
    w.allocations.push({at:game.world.clock.now,cache,destination:command.destination});
  } else if(type==='dispatch'){
    if(!w||w.departedAt!==null)throw new Error('The ferry has already departed or no window exists');
    if(current!=='ferry')throw new Error('Reach the ferry checkpoint before dispatching');w.departedAt=game.world.clock.now;
  } else if(type==='finish'){
    if(!w||w.finishedAt!==null)throw new Error('The window is already finished or has not begun');
    if(current!=='rain'&&!(current==='packing'&&w.departedAt!==null&&covered(game)))throw new Error('Reach rain, or dispatch the ferry with all needs covered before finishing');
    w.finishedAt=game.world.clock.now;
  } else if(type==='return'){
    if(current!=='ended')throw new Error('Return requires a finished window that has not already returned');game.returned=true;
  } else throw new Error('Unknown story command');
  if(record&&w&&(!game.returned||type==='return'))append(game,command);
  return game;
}
function continuationExtends(world,settled){
  if(world.clock.now<settled.clock.now||world.caches<settled.caches||world.milestoneAt!==settled.milestoneAt||!equal(world.options,settled.options)||!equal(world.origin,settled.origin)||world.solo!==settled.solo)throw new Error('Returned camp does not extend the settled world');
  for(const project of Object.keys(settled.structures))if(world.structures[project]!==settled.structures[project])throw new Error('Returned camp changed an established structure');
  if(world.clock.nextEvent<settled.clock.nextEvent)throw new Error('Returned camp reversed an event identity counter');
  for(const id of Object.keys(settled.people)){
    if(world.people[id].id!==settled.people[id].id||world.people[id].minutes<settled.people[id].minutes||world.people[id].nextAttempt<settled.people[id].nextAttempt)throw new Error('Returned camp changed a person or reversed an attempt identity');
    monotone(world.people[id].skills,settled.people[id].skills);
  }
  function monotone(a,b){for(const key of Object.keys(b)){if(typeof b[key]==='number'&&typeof a?.[key]==='number'&&a[key]<b[key])throw new Error('Returned camp reversed a lifetime receipt');if(b[key]&&typeof b[key]==='object')monotone(a?.[key],b[key]);}}
  monotone(world.stats,settled.stats);monotone(world.paid,settled.paid);
}
function validate(game){
  if(trusted.has(game))return game;
  inspect(game);exact(game,['version','world','window','record','returned'],'story');
  if(game.version!==CAMP_STORY_VERSION||typeof game.returned!=='boolean')throw new Error('Incompatible story version');
  camp.restoreGame(camp.exportGame(game.world));
  if(game.world.solo)throw new Error('This story requires the shared camp');
  if(game.window===null){if(game.record!==null||game.returned||game.world.milestoneAt!==null||game.world.clock.now>WORLD_LIMIT-RAIN_MINUTES)throw new Error('Invalid pre-entry camp');return game;}
  exact(game.record,['kind','root','commands'],'story record');
  if(!Array.isArray(game.record.commands)||game.record.commands.length>MAX_WINDOW_COMMANDS)throw new Error('Invalid bounded story journal');
  const replay=rootGame(game.record);
  for(const command of game.record.commands){sourceCommand(command);if(replay.returned)throw new Error('Commands after Return are snapshot continuation, not this finite journal');mutate(replay,command);}
  if(!equal(replay.record,game.record)||!equal(replay.window,game.window)||replay.returned!==game.returned)throw new Error('Story facts do not match the source journal');
  if(game.returned)continuationExtends(game.world,replay.world);
  else if(!equal(replay.world,game.world))throw new Error('Story world does not match the source journal');
  return game;
}
function act(game,command){validate(game);const next=copy(game);mutate(next,command);return seal(next);}
export function createGame(options={}){inspect(options);if(options.solo)throw new Error('This story requires the shared camp');return seal(fromWorld(camp.createGame(options)));}
export function migrateLegacyGame(snapshot,options={}){inspect(snapshot);inspect(options);const game=fromWorld(camp.migrateLegacyGame(snapshot,options));if(game.world.solo)throw new Error('This story requires the shared camp');if(game.world.milestoneAt!==null)enter(game,'legacy');return seal(validate(game));}
export function migrateLegacyRainGame(snapshot,options={}){inspect(snapshot);inspect(options);return seal(rootGame({kind:'legacy-rain',root:{snapshot:copy(snapshot),options:copy(options)},commands:[]}));}
export function startJob(game,id){return act(game,{type:'start',id});}
export function cancelJob(game){return act(game,{type:'cancel'});}
export function requestProject(game,project){return act(game,{type:'request',project});}
export function releaseProject(game){return act(game,{type:'release'});}
export function requestHandover(game,from='player',to='neighbor'){return act(game,{type:'handover',from,to});}
export function advanceGame(game,minutes){return act(game,{type:'advance',minutes});}
export function advanceToNextEvent(game){validate(game);requireRunning(game);const view=camp.getGameView(game.world);return advanceGame(game,Math.max(1,view.nextEventAt-game.world.clock.now));}
export function continueStory(game){return act(game,{type:'continue'});}
export function allocateCache(game,destination){return act(game,{type:'allocate',destination});}
export function dispatchFerry(game){return act(game,{type:'dispatch'});}
export function finishStory(game){return act(game,{type:'finish'});}
export function returnToCamp(game){return act(game,{type:'return'});}
export function getGameView(game){
  validate(game);const view=camp.getGameView(game.world),w=game.window,current=phase(game),now=game.world.clock.now,canAdvance=runs(game),households=count(game,'households'),campCount=count(game,'camp');
  const stop=w&&!game.returned?(w.departedAt===null?w.ferryAt:w.rainAt):game.window?WORLD_LIMIT:WORLD_LIMIT-RAIN_MINUTES;
  const ordinaryCommandsRemaining=w&&!game.returned?Math.max(0,ORDINARY_COMMAND_LIMIT-game.record.commands.length):null;
  const canAssign=canAdvance&&ordinaryCommandsRemaining!==0,assignmentReason=ordinaryCommandsRemaining===0?'The ordinary command budget is used. Stop work, advance, or finish this window.':null;
  return {...view,version:CAMP_STORY_VERSION,worldVersion:view.version,phase:current,window:copy(w),enteredAt:w?.enteredAt??null,ferryAt:w?.ferryAt??null,rainAt:w?.rainAt??null,
    elapsed:w?now-w.enteredAt:null,remaining:w?Math.max(0,w.rainAt-now):null,ferryRemaining:w?Math.max(0,w.ferryAt-now):null,availableCaches:game.world.caches-(w?.allocations.length??0),carriedCaches:w?.carriedCaches??0,
    householdsEquipped:households,campNights:campCount*2,unprovidedHouseholds:2-households,unprovidedNights:4-campCount*2,departed:w?.departedAt!==null&&Boolean(w),
    canFinish:current==='rain'||current==='packing'&&w.departedAt!==null&&covered(game),canAdvance,canAssign,ordinaryCommandsRemaining,pauseReason:pauseReason(game),nextEventAt:canAdvance?Math.min(view.nextEventAt,stop):null,
    choices:view.choices.map(choice=>({...choice,finishesBeforeFerry:Boolean(w)&&w.departedAt===null&&now+choice.duration<=w.ferryAt,finishesBeforeRain:Boolean(w)&&now+choice.duration<=w.rainAt,unavailable:!canAdvance?pauseReason(game):assignmentReason??choice.unavailable}))};
}
export function exportGame(game){validate(game);return copy({format:'human-camp-story',version:1,game});}
export function restoreGame(snapshot){inspect(snapshot);exact(snapshot,['format','version','game'],'story snapshot');if(snapshot.format!=='human-camp-story'||snapshot.version!==1)throw new Error('Incompatible save. This page loads camp story saves; use explicit legacy continuation for older games.');return seal(copy(validate(snapshot.game)));}
