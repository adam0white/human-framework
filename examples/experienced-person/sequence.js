import {createWorkspace,catalog,action,message,episode} from './setup.js';
import {deliverExperienceMessage,receiveExperienceEpisode,beginExperienceAttempt,advanceExperienceAttempt,finishExperienceAttempt,getExperienceView,advanceExperience,exportExperienceWorkspace,restoreExperienceWorkspace} from '../../src/experience/workspace.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const now=s=>s.actor.person.sustained.situated.now;
function paid(s,id,minutes,{attentionMessageId=null,status='completed',restore=false}={}){
 s=beginExperienceAttempt(s,{action:action(id,minutes),attentionMessageId,purposeId:'deliver'},catalog);
 if(!s.actor.person.sustained.situated.human.pending.capacity.allowed)throw Error('Unexpected body refusal');
 s=advanceExperienceAttempt(s,1,catalog);
 if(restore)s=restoreExperienceWorkspace(clone(exportExperienceWorkspace(s,catalog)),catalog,'courier');
 s=advanceExperienceAttempt(s,minutes-1,catalog);
 return finishExperienceAttempt(s,{attemptId:s.actor.person.sustained.situated.human.pending.id,status,mealConsumed:false},catalog);
}
export function runRememberedRoute({remember=true,sameContext=true,expired=false,restore=false,policy='candidate'}={}){
 let workspace=createWorkspace(),world={gateOpen:false,permitValid:true,delivered:0},trace=[],history=[];
 function checkpoint(){if(!restore)return;const save=clone({workspace:exportExperienceWorkspace(workspace,catalog),world,trace,history});workspace=restoreExperienceWorkspace(save.workspace,catalog,'courier');({world,trace,history}=save);}
 function trip(id){const startedAt=now(workspace),duration=id==='direct'?5:10,status=id==='direct'&&(!world.gateOpen||!world.permitValid)?'failed':'completed';workspace=paid(workspace,id,duration,{status,restore});if(status==='completed')world.delivered++;trace.push({actionId:id,startedAt,finishedAt:now(workspace),elapsedMinutes:duration,status});}
 trip('direct');
 if(remember){const observation=episode({occurredAt:now(workspace),receivedAt:now(workspace),contextId:sameContext?'route':'warehouse',expiresAt:now(workspace)+(expired?2:100)});workspace=receiveExperienceEpisode(workspace,observation,catalog);history.push(observation);}
 checkpoint();workspace=advanceExperience(workspace,{to:now(workspace)+3,mode:'awake'},catalog);checkpoint();
 const recalled=getExperienceView(workspace,catalog,{contextId:'route'}).memories;
 // Direct notebook sees the same recorded event, context and validity; it owns no hidden world input.
 const direct=history.filter(e=>e.contextId==='route'&&e.expiresAt>now(workspace)).some(e=>e.facts.some(f=>f.propositionId==='gateOpen'&&!f.value));
 const remembered=policy==='direct'?direct:recalled.episodes.some(e=>e.facts.some(f=>f.propositionId==='gateOpen'&&!f.value));
 const nextAction=remembered?'detour':'direct';trip(nextAction);checkpoint();
 return {nextAction,recalledCount:recalled.episodes.length,world,trace,paidMinutes:trace.reduce((s,t)=>s+t.elapsedMinutes,0),observedMinutes:now(workspace),state:exportExperienceWorkspace(workspace,catalog)};
}
export function runAttendedRoute({reads=2,expired=false,conflict=false,closure=false,readCorrection=true,restore=false,policy='candidate'}={}){
 let workspace=createWorkspace(),world={gateOpen:true,permitValid:true,delivered:0},trace=[],delivered=[],processed=[];
 function checkpoint(){if(!restore)return;const save=clone({workspace:exportExperienceWorkspace(workspace,catalog),world,trace,delivered,processed});workspace=restoreExperienceWorkspace(save.workspace,catalog,'courier');({world,trace,delivered,processed}=save);}
 function deliver(m){workspace=deliverExperienceMessage(workspace,m,catalog);delivered.push(m);checkpoint();}
 function read(id){const startedAt=now(workspace);workspace=paid(workspace,'read',2,{attentionMessageId:id,restore});const original=delivered.find(m=>m.messageId===id);if(original.expiresAt>now(workspace))processed.push({...original,processedAt:now(workspace)});trace.push({actionId:'read',messageId:id,startedAt,finishedAt:now(workspace),elapsedMinutes:2,status:'completed'});checkpoint();}
 deliver(message('gate','gateOpen',true,expired?3:100));deliver(message('permit','permitValid',true));
 for(const id of ['gate','permit'].slice(0,reads))read(id);
 if(conflict){deliver({...message('opposed','gateOpen',false),sourceId:'observer',originId:'observer',occurredAt:now(workspace),deliveredAt:now(workspace)});read('opposed');}
 if(closure){world.gateOpen=false;deliver({...message('gate-update','gateOpen',false),occurredAt:now(workspace),deliveredAt:now(workspace),correctsReceiptId:'gate'});if(readCorrection)read('gate-update');}
 const view=getExperienceView(workspace,catalog),conclusion=view.reasoning.conclusions.find(c=>c.propositionId==='directAllowed');
 function resolvedTrue(propositionId){
  const corrected=new Set(processed.filter(m=>m.correctsReceiptId!==null).map(m=>m.correctsReceiptId));
  const candidates=processed.filter(m=>m.propositionId===propositionId&&m.expiresAt>now(workspace)&&!corrected.has(m.messageId));
  const latest=new Map();for(const m of candidates){const old=latest.get(m.originId);if(!old||m.occurredAt>old.occurredAt)latest.set(m.originId,m);}
  return latest.size>0&&[...latest.values()].every(m=>m.value===true);
 }
 const allowed=policy==='direct'?resolvedTrue('gateOpen')&&resolvedTrue('permitValid'):conclusion.status==='true';
 const nextAction=allowed?'direct':'detour',duration=allowed?5:10,startedAt=now(workspace);
 const status=nextAction==='direct'&&(!world.gateOpen||!world.permitValid)?'failed':'completed';
 workspace=paid(workspace,nextAction,duration,{status,restore});if(status==='completed')world.delivered++;
 trace.push({actionId:nextAction,startedAt,finishedAt:now(workspace),elapsedMinutes:duration,status});checkpoint();
 return {nextAction,conclusion,processedCount:processed.length,world,trace,observedMinutes:now(workspace),state:exportExperienceWorkspace(workspace,catalog)};
}
export function compareExperiencedSequences(){return [
 ['remembered-route',runRememberedRoute,{}],['no-record',runRememberedRoute,{remember:false}],['different-context',runRememberedRoute,{sameContext:false}],['expired-episode',runRememberedRoute,{expired:true}],
 ['attended-premises',runAttendedRoute,{}],['one-message',runAttendedRoute,{reads:1}],['no-reading',runAttendedRoute,{reads:0}],['expired-premise',runAttendedRoute,{expired:true}],['conflicting-report',runAttendedRoute,{conflict:true}],['processed-correction',runAttendedRoute,{closure:true}],['unread-correction',runAttendedRoute,{closure:true,readCorrection:false}]
 ].map(([id,run,options])=>({id,candidate:run(options),direct:run({...options,policy:'direct'}),restored:run({...options,restore:true})}));}
