import {createExperimentActor,performExperimentAction} from './actor.js';
import {deliverExperienceMessage,getExperienceView} from '../../experience/workspace.js';
import {createRelationships,advanceRelationships,receiveRelationshipEvent} from '../../social/relationships.js';

const VERSION=1, DEADLINE=28, LIMIT=32;
const ACTIONS={
  read_note:{label:'Read the access correction',minutes:2,description:'Spend 2 minutes reading the neighbor’s updated access note.'},
  ask_neighbor:{label:'Ask the neighbor directly',minutes:3,description:'Spend 3 minutes asking where to leave the borrowed object.'},
  carry_sibling:{label:'Carry your sibling’s things',minutes:6,description:'Spend 6 minutes helping your sibling carry their things inside.'},
  return_object:{label:'Return the borrowed object',minutes:7,description:'Spend 7 minutes taking the object to the access point you know.'},
  tell_delay:{label:'Tell the neighbor about the delay',minutes:2,description:'Spend 2 minutes telling the neighbor the promise may be late. This changes their expectation, but does not return the object.'},
  listen_reply:{label:'Listen for the neighbor’s reply',minutes:3,description:'Spend 3 minutes waiting for a reply after you have actually returned the object.'},
  wait:{label:'Wait two minutes',minutes:2,description:'Spend 2 minutes without taking either item to its destination.'},
  end_evening:{label:'End the evening',minutes:0,description:'Let the remaining evening pass and see what happened.'}
};
const copy=value=>structuredClone(value);
const access=['side door','back gate','front step'];
const responses=['acknowledge','reserve','conditional'];
const time=state=>state.workspace.actor.person.sustained.situated.now;

function event(state,id,kind,relatedEventId=null,occurredAt=time(state)){
  const at=time(state);
  return {id,originId:id,occurredAt,receivedAt:at,sourceId:kind==='repair_acknowledged'?'neighbor':'player',otherId:'player',contextId:'borrowed',kind,
    outcomeId:kind==='repair_acknowledged'?null:`doorstep_${id}`,relatedEventId};
}
function receive(state,id,kind,related=null,occurredAt=time(state)){state.recipient=receiveRelationshipEvent(state.recipient,event(state,id,kind,related,occurredAt));}
function make(variant){
  if(!Number.isInteger(variant)||variant<0||variant>2)throw Error('Invalid doorstep variant');
  const {workspace,catalog}=createExperimentActor({id:'player',actors:['player','neighbor','sibling'],purposeIds:['return','help'],
    actionIds:Object.keys(ACTIONS),propositionIds:['sideAccess','backAccess','frontAccess'],contextIds:['borrowed'],reviewActionId:'read_note'});
  const note={messageId:'accessNote',contextId:'borrowed',propositionId:['sideAccess','backAccess','frontAccess'][variant],
    sourceId:'neighbor',originId:'neighbor',value:true,occurredAt:0,deliveredAt:0,expiresAt:DEADLINE+1,correctsReceiptId:null};
  const state={kind:'doorstep',variant,catalog,workspace:deliverExperienceMessage(workspace,note,catalog),recipient:createRelationships({ownerId:'neighbor',now:0,
    actors:['player','neighbor','sibling'],contexts:['borrowed'],ties:[{otherId:'player',care:'active'}]}),
    commands:[],knowledge:null,helped:false,returned:false,missed:false,told:false,listened:false,acknowledged:false,finished:false,history:[]};
  return state;
}
function options(state){
  const now=time(state),room=DEADLINE-now;
  return Object.entries(ACTIONS).map(([id,entry])=>{
    let reason='';
    if(state.finished)reason='The evening has ended.';
    else if(id==='read_note'&&state.workspace.attention.processings.length)reason='You already read the note.';
    else if(id==='ask_neighbor'&&state.knowledge!==null)reason='You already know the access point.';
    else if(id==='carry_sibling'&&state.helped)reason='Your sibling’s things are already inside.';
    else if(id==='return_object'&&state.returned)reason='The object is already returned.';
    else if(id==='tell_delay'&&state.told)reason='You already told the neighbor.';
    else if(id==='listen_reply'&&(!state.returned||state.listened))reason=state.listened?'You already listened for a reply.':'Return the object before listening for a reply.';
    else if(id==='wait'&&room<2)reason='There is less than two minutes left.';
    else if(id!=='end_evening'&&entry.minutes>room)reason='There is not enough time left.';
    return {id,...entry,minutes:id==='end_evening'?room:entry.minutes,
      description:id==='end_evening'?`Let the remaining ${room} minutes pass and see what happened.`:entry.description,
      disabled:Boolean(reason),reason:reason||null};
  });
}
function advance(state,minutes){
  const now=time(state)+minutes;
  state.workspace=performExperimentAction(state.workspace,state.catalog,{actionId:state.action,minutes,
    messageId:state.action==='read_note'?'accessNote':null,purposeId:state.action==='carry_sibling'?'help':'return'});
  state.recipient=advanceRelationships(state.recipient,now);
  if(now>12&&!state.returned&&!state.missed){state.missed=true;receive(state,'missedPromise','support_failed',null,13);
    state.history.push({at:now,text:'The promised return time passed. The neighbor is now expecting a late return.'});}
}
function apply(state,actionId){
  const option=options(state).find(x=>x.id===actionId);
  if(!option||option.disabled)throw Error(`Unavailable doorstep action: ${actionId}`);
  state.action=actionId;
  if(actionId==='end_evening'){
    if(option.minutes>0)advance(state,option.minutes);
    state.finished=true;state.history.push({at:time(state),text:'You ended the evening.'});
  } else {
    advance(state,option.minutes);
    const at=time(state);
    if(actionId==='read_note'){
      if(state.workspace.attention.processings.some(x=>x.messageId==='accessNote'))state.knowledge=access[state.variant];
      state.history.push({at,text:`You spent ${option.minutes} minutes reading the correction. It says to use the ${state.knowledge}.`});
    } else if(actionId==='ask_neighbor'){
      state.knowledge=access[state.variant];state.history.push({at,text:`The neighbor said to use the ${state.knowledge}.`});
    } else if(actionId==='carry_sibling'){
      state.helped=true;state.history.push({at,text:'You carried your sibling’s things inside.'});
    } else if(actionId==='return_object'){
      if(state.knowledge===null){state.history.push({at,text:'You tried the old drop-off point. The object is still with you; the corrected access was elsewhere.'});}
      else {state.returned=true;
        if(state.missed)receive(state,'actualReturn','repair_completed','missedPromise');
        else receive(state,'timelyReturn','support_completed');
        state.history.push({at,text:`You returned the borrowed object at the ${state.knowledge}${state.missed?' after the promised time':''}.`});}
    } else if(actionId==='tell_delay'){
      state.told=true;state.history.push({at,text:'The neighbor knows to expect a late return. The object has not moved.'});
    } else if(actionId==='listen_reply'){
      state.listened=true;
      const canAcknowledge=state.missed&&responses[state.variant]==='acknowledge'||state.missed&&responses[state.variant]==='conditional'&&state.told&&at<=25;
      if(canAcknowledge){receive(state,'neighborReply','repair_acknowledged','actualReturn');state.acknowledged=true;}
      state.history.push({at,text:!state.missed?'The neighbor confirmed receiving the object on time.':canAcknowledge?
        'The neighbor acknowledged the returned object after the missed promise.':
        'The neighbor confirmed receiving the object, but did not acknowledge the repair.'});
    } else state.history.push({at,text:'Two minutes passed.'});
    if(at>=DEADLINE){state.finished=true;state.history.push({at,text:'The evening ended.'});}
  }
  state.commands.push(actionId);delete state.action;
  return state;
}
function replay(variant,commands){
  if(!Array.isArray(commands)||commands.length>LIMIT||Object.getPrototypeOf(commands)!==Array.prototype||Reflect.ownKeys(commands).length!==commands.length+1)throw Error('Invalid doorstep commands');
  let state=make(variant);
  for(const id of commands){if(typeof id!=='string')throw Error('Invalid doorstep command');state=apply(state,id);}
  return state;
}
export function createDoorstep(variant=0){return replay(variant,[]);}
export function chooseDoorstep(state,actionId){const base=restoreDoorstep(exportDoorstep(state));return apply(base,actionId);}
export function getDoorstepView(state){
  const s=restoreDoorstep(exportDoorstep(state)),now=time(s);
  const inbox=getExperienceView(s.workspace,s.catalog).inbox;
  const response=!s.listened?'No reply heard':!s.missed?'On-time return confirmed':s.acknowledged?'Repair acknowledged':'Return confirmed; repair not acknowledged';
  const summary=s.finished?`The object was ${s.returned?'returned':'not returned'}; your sibling ${s.helped?'got help':'did not get help'}. Neighbor response: ${response.toLowerCase()}.`:null;
  return {kind:'doorstep',title:'The shared doorstep',subtitle:'One evening, one borrowed object, and a sibling who needs a hand',
    objective:'Return the borrowed object and decide how to use your limited time with your sibling and neighbor.',now,deadline:DEADLINE,finished:s.finished,summary,
    metrics:[{label:'Time left',value:`${DEADLINE-now} min`},{label:'Neighbor expectation',value:s.told?'Late return explained':s.missed?'Return overdue':'Return promised by minute 12'},
      {label:'Neighbor response',value:response}],
    facts:[`The neighbor expects the borrowed object by minute 12.`,
      s.knowledge===null?'A correction to the drop-off access is waiting unread.':`The neighbor says to use the ${s.knowledge}.`,
      s.helped?'Your sibling’s things are inside.':'Your sibling needs help carrying things inside.',
      s.returned?'The borrowed object was returned.':'You still have the borrowed object.',
      s.missed?'The promised return time was missed.':'The promised return time has not passed.'],
    messages:inbox.messages.map(m=>({id:m.messageId,label:m.processedAt===null?'Neighbor’s access correction (unread)':'Neighbor’s access correction (read)',text:m.processedAt===null?null:`Use the ${s.knowledge}.`})),
    actions:options(s),history:copy(s.history),scene:{location:'Shared doorstep',people:[{name:'Neighbor',status:s.returned?response:s.missed?'Expected a return by minute 12':'Expects the object by minute 12'},
      {name:'Sibling',status:s.helped?'Things carried inside':'Needs help carrying things'}],objects:[{name:'Borrowed object',status:s.returned?'Returned':'With you'},
      {name:'Access note',status:s.knowledge===null?'Unread':'Read or confirmed'}]}};
}
export function exportDoorstep(state){
  if(!state||typeof state!=='object'||!Array.isArray(state.commands))throw Error('Invalid doorstep state');
  const canonical=replay(state.variant,state.commands);
  const keys=Object.keys(canonical).filter(k=>k!=='catalog');
  if(keys.some(k=>JSON.stringify(state[k])!==JSON.stringify(canonical[k])))throw Error('Invalid doorstep state consistency');
  return {format:'human-framework-doorstep',version:VERSION,kind:'doorstep',variant:state.variant,commands:copy(state.commands)};
}
export function restoreDoorstep(snapshot){
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||Object.getPrototypeOf(snapshot)!==Object.prototype||
    Reflect.ownKeys(snapshot).length!==5||!['format','version','kind','variant','commands'].every(k=>Object.hasOwn(snapshot,k)))throw Error('Invalid doorstep snapshot');
  if(snapshot.format!=='human-framework-doorstep'||snapshot.version!==VERSION||snapshot.kind!=='doorstep')throw Error('Incompatible doorstep snapshot');
  return replay(snapshot.variant,snapshot.commands);
}
