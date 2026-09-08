import * as commons from './commons.js';
import {chooseCommand,applyCommand} from './commons-policy.js';

export const COMMONS_NEXT_VERSION='0.1.0';
export const AFTERNOON_MINUTES=180,FERRY_MINUTES=90;
const copy=value=>structuredClone(value);
const exact=(value,fields,label)=>{if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).length!==fields.length||fields.some(key=>!Object.hasOwn(value,key)))throw new Error(`Invalid ${label} fields`);};
const integer=(value,min,max,label)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`Invalid ${label}`);};
let opening;
/** Authored prelude, replayed through the unchanged controller and host. Never a player save. */
function establishedOpening(){
  if(!opening){
    let world=commons.createGame(),commands=0;
    while(world.milestoneAt===null&&commands++<500)world=applyCommand(world,chooseCommand(commons.getGameView(world)));
    if(world.milestoneAt!==world.clock.now||world.caches||Object.values(world.jobs).some(Boolean))throw new Error('The authored opening no longer reaches the expected quiet milestone');
    opening=world;
  }
  return opening;
}
const phase=game=>game.ended?'ended':game.world.clock.now===game.openedAt+AFTERNOON_MINUTES?'dusk':game.departedAt===null&&game.world.clock.now===game.openedAt+FERRY_MINUTES?'ferry':'packing';
const count=(game,destination)=>game.allocations.filter(item=>item.destination===destination).length;
const available=game=>game.world.caches-game.allocations.length;
function validate(game){
  exact(game,['version','world','openedAt','production','allocations','departedAt','ended'],'episode');
  if(game.version!==COMMONS_NEXT_VERSION)throw new Error('Incompatible episode version');
  commons.restoreGame(commons.exportGame(game.world));
  if(game.openedAt!==establishedOpening().clock.now||game.world.milestoneAt!==game.openedAt||game.world.solo)throw new Error('Invalid authored opening');
  integer(game.world.clock.now,game.openedAt,game.openedAt+AFTERNOON_MINUTES,'afternoon time');
  if(game.departedAt!==null&&game.departedAt!==game.openedAt+FERRY_MINUTES)throw new Error('Invalid departure time');
  if(game.departedAt!==null&&game.world.clock.now<game.departedAt||game.departedAt===null&&game.world.clock.now>game.openedAt+FERRY_MINUTES)throw new Error('Inconsistent ferry checkpoint');
  if(typeof game.ended!=='boolean'||game.ended&&game.world.clock.now!==game.openedAt+AFTERNOON_MINUTES)throw new Error('Invalid episode ending');
  if(!Array.isArray(game.production)||game.production.length!==game.world.caches||game.production.length>12)throw new Error('Invalid cache production receipts');
  let previous=game.openedAt;
  for(const receipt of game.production){exact(receipt,['at'],'production');integer(receipt.at,previous+16,game.world.clock.now,'paid cache completion');previous=receipt.at;}
  if(!Array.isArray(game.allocations)||game.allocations.length>4||game.allocations.length>game.production.length)throw new Error('Invalid cache allocations');
  const used=new Set();previous=game.openedAt;
  for(const item of game.allocations){
    exact(item,['at','cache','destination'],'allocation');integer(item.cache,1,game.world.caches,'allocated cache');
    if(used.has(item.cache))throw new Error('A cache was allocated twice');used.add(item.cache);
    if(!['households','camp'].includes(item.destination))throw new Error('Unknown cache destination');
    integer(item.at,Math.max(previous,game.production[item.cache-1].at),item.destination==='households'?Math.min(game.world.clock.now,game.openedAt+FERRY_MINUTES):game.world.clock.now,'allocation time');previous=item.at;
  }
  if(count(game,'households')>2||count(game,'camp')>2)throw new Error('Destination already covered');
  return game;
}
function requirePacking(game){validate(game);const current=phase(game);if(current!=='packing')throw new Error(current==='ferry'?'The ferry is waiting. Allocate supplies and send it before advancing work.':current==='dusk'?'It is dusk. Allocate the remaining caches, then finish the day.':'This day has ended. Start a new afternoon to play again.');}
function changeWorld(game,operation){requirePacking(game);const next=copy(game);next.world=operation(next.world);return next;}
export function createGame(){const world=copy(establishedOpening());return {version:COMMONS_NEXT_VERSION,world,openedAt:world.clock.now,production:[],allocations:[],departedAt:null,ended:false};}
export function startJob(game,id){return changeWorld(game,world=>commons.startJob(world,id));}
export function cancelJob(game){return changeWorld(game,commons.cancelJob);}
export function requestProject(game,project='cache'){return changeWorld(game,world=>commons.requestProject(world,project));}
export function releaseProject(game){return changeWorld(game,commons.releaseProject);}
/** Stop at each player decision. No time is carried across a checkpoint implicitly. */
export function advanceGame(game,minutes){
  requirePacking(game);integer(minutes,0,1440,'advance minutes');const next=copy(game);
  const stop=next.openedAt+(next.departedAt===null?FERRY_MINUTES:AFTERNOON_MINUTES),target=Math.min(stop,next.world.clock.now+minutes);
  while(next.world.clock.now<target){
    const end=Math.min(target,next.world.clock.queue[0]?.at??target),before=next.world.caches;
    next.world=commons.advanceGame(next.world,end-next.world.clock.now);
    if(next.world.caches>before)next.production.push({at:next.world.clock.now});
  }
  return next;
}
export function advanceToNextEvent(game){requirePacking(game);const checkpoint=game.openedAt+(game.departedAt===null?FERRY_MINUTES:AFTERNOON_MINUTES);return advanceGame(game,Math.min(game.world.clock.queue[0]?.at??checkpoint,checkpoint)-game.world.clock.now);}
export function allocateCache(game,destination){
  validate(game);if(game.ended)throw new Error('This day has ended.');
  if(!['households','camp'].includes(destination))throw new Error('Unknown cache destination');
  if(destination==='households'&&game.departedAt!==null)throw new Error('The ferry has departed. Later caches can only provision camp.');
  if(count(game,destination)===2)throw new Error('This destination is fully covered.');
  if(!available(game))throw new Error('Pack a complete cache before allocating it.');
  const used=new Set(game.allocations.map(item=>item.cache)),cache=game.production.findIndex((_,index)=>!used.has(index+1))+1,next=copy(game);
  next.allocations.push({at:game.world.clock.now,cache,destination});return next;
}
export function dispatchFerry(game){
  validate(game);if(game.departedAt!==null)throw new Error('The ferry has already departed.');
  if(phase(game)!=='ferry')throw new Error('Reach the ferry checkpoint before dispatching it.');
  const next=copy(game);next.departedAt=next.world.clock.now;return next;
}
export function finishDay(game){validate(game);if(phase(game)!=='dusk')throw new Error('Reach dusk before finishing the day.');const next=copy(game);next.ended=true;return next;}
export function getGameView(game){
  validate(game);const view=commons.getGameView(game.world),current=phase(game),households=count(game,'households'),camp=count(game,'camp');
  const stop=game.openedAt+(game.departedAt===null?FERRY_MINUTES:AFTERNOON_MINUTES);
  return {...view,version:game.version,phase:current,openedAt:game.openedAt,elapsed:view.now-game.openedAt,remaining:game.openedAt+AFTERNOON_MINUTES-view.now,ferryRemaining:Math.max(0,game.openedAt+FERRY_MINUTES-view.now),departed:game.departedAt!==null,
    availableCaches:available(game),householdsEquipped:households,campNights:camp*2,unprovidedHouseholds:2-households,unprovidedNights:4-camp*2,
    nextEventAt:current==='packing'?Math.min(view.nextEventAt??stop,stop):null,
    allocations:copy(game.allocations),production:copy(game.production),
    choices:view.choices.map(choice=>({...choice,finishesInAfternoon:view.now+choice.duration<=game.openedAt+AFTERNOON_MINUTES,finishesBeforeFerry:game.departedAt===null&&view.now+choice.duration<=game.openedAt+FERRY_MINUTES,unavailable:current==='packing'?choice.unavailable:'Time is paused for your allocation decision.'}))};
}
export function exportGame(game){validate(game);return copy({format:'human-common-ground-before-rain',version:1,game});}
export function restoreGame(snapshot){exact(snapshot,['format','version','game'],'snapshot');if(snapshot.format!=='human-common-ground-before-rain'||snapshot.version!==1)throw new Error('Incompatible save. This page loads Before the rain saves only.');return copy(validate(snapshot.game));}
