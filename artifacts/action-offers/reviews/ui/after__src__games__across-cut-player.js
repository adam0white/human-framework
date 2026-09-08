/** Actor-local player clock and save recipe for the disposable Across the Cut scene. */
import {create,request,interrupt,advance,getActorView,getWorldSummary,exportState} from './across-cut.js';
import {assessEffort} from '../runtime/index.js';
import {RECEIVER_VERSION,createReceiverState,decideReceiver} from './across-cut-receiver.js';

export const PLAYER_VERSION='0.1.0';
export {RECEIVER_VERSION};
const clone=x=>structuredClone(x);
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const handles=new WeakSet();
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function seal(game){freeze(game);handles.add(game);return game;}
function check(game){if(!game||!handles.has(game))fail('INVALID_GAME','Restore a saved recipe or create a fresh game first.');}
const rates={inspect:.003,repair:.012,release:.015,travel:.010,meal:0,transmit:.003};
const capacityMessage='Your body estimate does not yet support this entire interval.';
// Human 0.1.1 presents body estimates rounded to 0.05. Use the upper edge
// of that public estimate bin for the conservative offer and recovery stop.
// An estimate-only block is separate metadata; actual admission stays in the host.
const upperBody=view=>Object.fromEntries(Object.entries(view.body.body).map(([k,n])=>[k,Math.min(1,n+.025)]));
const absolute=/^(repairMinutes:(valve|dock)|repairProgress:(valve|dock)|launchAt|launchDeparted|serviceUnits|cartDelivery)$/;
const fields=(x,names)=>{
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==names.length||names.some(k=>!Object.hasOwn(x,k)))fail('INVALID_COMMAND','Unknown or missing field.');
};
function plainJSON(value){
 let remaining=250000;const active=new Set();
 function visit(x,depth){
  if(depth>24||--remaining<0)fail('INVALID_COMMAND','JSON limits exceeded.');
  if(x===null||typeof x==='boolean')return;
  if(typeof x==='string'){remaining-=x.length;return;}
  if(typeof x==='number'){if(!Number.isFinite(x)||Object.is(x,-0))fail('INVALID_COMMAND','Expected finite JSON numbers.');return;}
  if(typeof x!=='object'||active.has(x))fail('INVALID_COMMAND','Expected plain acyclic JSON.');
  const array=Array.isArray(x),prototype=Object.getPrototypeOf(x);
  if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)fail('INVALID_COMMAND','Expected plain JSON.');
  const keys=Reflect.ownKeys(x);if(array&&keys.length!==x.length+1)fail('INVALID_COMMAND','Expected dense JSON array.');
  active.add(x);
  for(const key of keys){
   if(array&&key==='length')continue;
   const d=Object.getOwnPropertyDescriptor(x,key);
   if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=x.length))fail('INVALID_COMMAND','Invalid JSON property.');
   remaining-=key.length;visit(d.value,depth+1);
  }
  active.delete(x);
 }
 visit(value,0);if(remaining<0)fail('INVALID_COMMAND','JSON limits exceeded.');
}
const frame=host=>({keeper:getActorView(host,'keeper'),receiver:getActorView(host,'receiver')});
const mark=(game,reason)=>({...game,ui:{pauseReason:reason,stopReason:reason}});
const append=(game,command)=>{
 if(game.commands.length>=158)fail('COMMAND_LIMIT','The finite episode command budget is exhausted.');
 return {...game,commands:[...game.commands,clone(command)]};
};

export function createGame(options={}){
 const host=create(options);
 return seal({host,setup:exportState(host).state.config,receiver:createReceiverState(),frame:null,ui:{pauseReason:'ready',stopReason:'ready'},commands:[]});
}

function choices(view){
 const result=[];
 const add=(id,label,detail,duration,action,unavailable=null)=>{
  let capacityUncertain=false;
  if(view.ended)unavailable='This shift has ended.';
  else if(view.job)unavailable='Finish or stop your current work first.';
  else if(view.budget.used+2>view.budget.limit)unavailable='Your remaining decisions are reserved for stopping work.';
  else if(!unavailable&&!assessEffort(upperBody(view),{durationMinutes:duration,effort:rates[action.task]*duration,exertive:rates[action.task]>0}).allowed){unavailable=capacityMessage;capacityUncertain=true;}
  result.push({id,label,detail,duration,action,unavailable,capacityUncertain});
 };
 const home=view.location==='valve',remaining=view.local.repairMinutes===null?null:view.local.repairMinutes-view.local.repairProgress;
 add('inspect','Inspect','Learn this station’s repair requirement.',1,{task:'inspect'},view.location==='path'?'Reach a station first.':null);
 const repairBlock=!home?'Return to your valve first.':remaining===null?'Inspect your valve first.':remaining<=0?'Your valve repair is complete.':!view.inventory.fitting.installed&&!view.inventory.fitting.available?'Your fitting is unavailable.':null;
 add('repair-full','Finish repair','Install your fitting on the first paid minute; progress remains if you stop.',remaining>0?remaining:1,{task:'repair'},repairBlock);
 add('repair-one','Repair for 1 minute','Pay for one minute of lasting valve repair.',1,{task:'repair',minutes:1},repairBlock);
 add('release','Release 2 water','Reserve 2 water for 2 minutes. Stop before completion to return both; arrival takes 3 more minutes.',2,{task:'release'},!home?'Return to your valve first.':remaining!==0?'Complete your known valve repair first.':view.inventory.water.available<2?'Two owned water units are unavailable.':null);
 for(const [to,position]of [['dock',6],['valve',0]])add(`travel-${to}`,to==='dock'?'Walk to the inlet':'Walk to the valve','Pay for each segment walked; stopping keeps your position.',Math.abs(view.position-position)||1,{task:'travel',to},view.position===position?'You are already there.':null);
 add('meal','Eat your meal','Reserve your meal for 2 minutes; stopping returns the uneaten meal.',2,{task:'meal'},view.inventory.meal.available?null:'Your meal is unavailable.');
 return result;
}

export function getGameView(game){
 check(game);
 const view=getActorView(game.host,'keeper');
 const reportableObservations=view.notebook.filter(o=>o.via==='local'&&absolute.test(o.cue));
 return {...view,...clone(game.ui),canAdvance:!view.ended,canStop:Boolean(view.job),choices:choices(view),reportableObservations};
}

export function applyCommand(game,command){
 check(game);
 plainJSON(command);
 if(!command||typeof command!=='object'||Array.isArray(command))fail('INVALID_COMMAND','Expected a player command.');
 if(command.type==='request')fields(command,['type','action']);else if(command.type==='stop')fields(command,['type']);else fail('INVALID_COMMAND','Unknown player command.');
 const captured=game.frame??frame(game.host);
 const host=command.type==='request'?request(game.host,'keeper',command.action):interrupt(game.host,'keeper');
 return seal(append(mark({...game,host,frame:captured},command.type==='request'?'started':'stopped'),command));
}

function stopReason(before,after){
 if(after.ended)return 'horizon';
 if(after.inbox.length>before.inbox.length)return 'report';
 if(before.job&&!after.job)return 'own-completion';
 if(before.nextBoundary.at===after.now&&before.nextBoundary.kind==='known-launch')return 'known-launch';
 if(after.location!==before.location)return 'local-change';
 const last=before.notebook.at(-1)?.receipt??0;
 if(after.notebook.some(o=>o.receipt>last&&!(before.job?.task==='repair'&&o.via==='local'&&o.cue==='repairProgress:valve')))return 'local-change';
 if(!before.job){
  const old=choices(before),now=choices(after);
  if(old.some(c=>c.unavailable===capacityMessage&&!now.find(n=>n.id===c.id).unavailable))return 'capacity-available';
 }
 return null;
}

function run(game,minutes){
 const start=getActorView(game.host,'keeper');if(start.ended)return game;
 const limit=Math.min(start.horizon,start.now+minutes);let current=game;
 while(getActorView(current.host,'keeper').now<limit){
  // The first control at this timestamp saved both views. Neither actor sees
  // the other's same-minute decisions; keeper controls precede receiver ones.
  const captured=current.frame??frame(current.host),before=getActorView(current.host,'keeper');
  const decision=decideReceiver(current.receiver,captured.receiver);let host=current.host;
  for(const command of decision.commands)host=command.type==='stop'?interrupt(host,'receiver'):request(host,'receiver',command.action);
  host=advance(host,before.now+1);
  current={...current,host,receiver:decision.state,frame:null};
  const reason=stopReason(before,getActorView(host,'keeper'));
  if(reason)return mark(current,reason);
 }
 return mark(current,'time-limit');
}

export function advanceGame(game,minutes){
 check(game);
 if(!Number.isSafeInteger(minutes)||minutes<1||minutes>30)fail('INVALID_COMMAND','Advance by 1 to 30 whole minutes.');
 const next=run(game,minutes);return next===game?game:seal(append(next,{type:'advance',minutes}));
}
export function advanceToNextEvent(game){
 check(game);const next=run(game,30);return next===game?game:seal(append(next,{type:'continue'}));
}
export function exportGame(game){
 check(game);
 const save={format:'human-across-cut-player',saveVersion:1,playerVersion:PLAYER_VERSION,receiverVersion:RECEIVER_VERSION,setup:game.setup,commands:game.commands};
 plainJSON(save);return clone(save);
}
export function restoreGame(save){
 try{
  plainJSON(save);fields(save,['format','saveVersion','playerVersion','receiverVersion','setup','commands']);
  if(save.format!=='human-across-cut-player'||save.saveVersion!==1||save.playerVersion!==PLAYER_VERSION||save.receiverVersion!==RECEIVER_VERSION||!Array.isArray(save.commands)||save.commands.length>158)throw new Error('Unsupported save.');
  let game=createGame(save.setup);
  for(const command of save.commands){
   const before=game.commands.length;
   if(command.type==='continue'){fields(command,['type']);game=advanceToNextEvent(game);}
   else if(command.type==='advance'){fields(command,['type','minutes']);game=advanceGame(game,command.minutes);}
   else game=applyCommand(game,command);
   if(game.commands.length!==before+1)throw new Error('No-op command.');
  }
  return game;
 }catch{fail('INVALID_SAVE','This save does not describe a valid player history.');}
}
export function getDebrief(game){
 check(game);
 if(!getActorView(game.host,'keeper').ended)fail('NOT_ENDED','The researcher outcome is available after minute 30.');
 return getWorldSummary(game.host);
}
