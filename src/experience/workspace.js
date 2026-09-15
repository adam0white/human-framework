/** Optional application adapter; adaptive-person remains the sole body/time owner. */
import {beginAdaptiveAttempt,advanceAdaptiveAttempt,finishAdaptiveAttempt,advanceAdaptivePerson,advanceAdaptiveCalendar,updateAdaptiveComponent,acceptAdaptiveRevision,getAdaptiveView,exportAdaptivePerson,restoreAdaptivePerson} from '../adaptive/person.js';
import {getBeliefView,receiveEvidence} from '../cognition/beliefs.js';
import {advanceEpisodes,recordEpisode,retractEpisode,queryEpisodes,exportEpisodes,restoreEpisodes} from './episodes.js';
import {advanceAttention,deliverMessage,getAttentionView,processSelectedMessage,exportAttention,restoreAttention} from './attention.js';
import {inferBeliefs,exportInference,restoreInference} from './inference.js';
export const EXPERIENCE_WORKSPACE_VERSION='0.1.0';
const FORMAT='human-framework-experience-workspace';
const copy=x=>structuredClone(x);
function exact(value,fields,label){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error('Invalid '+label);const keys=Reflect.ownKeys(value);if(keys.length!==fields.length||keys.some(k=>!fields.includes(k)))throw Error('Invalid '+label+' fields');for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(!d?.enumerable||!Object.hasOwn(d,'value'))throw Error('Invalid '+label+' data');}}
const situated=s=>s.actor.person.sustained.situated;
const now=s=>situated(s).now;
function validate(state,catalog){
 exact(state,['version','ownerId','actor','episodes','attention','inference','selection'],'workspace');
 if(state.version!==EXPERIENCE_WORKSPACE_VERSION)throw Error('Incompatible workspace version');
 exportAdaptivePerson(state.actor,catalog);exportEpisodes(state.episodes);exportAttention(state.attention);exportInference(state.inference);
 if([state.actor.id,state.episodes.ownerId,state.attention.ownerId,state.inference.ownerId].some(id=>id!==state.ownerId))throw Error('Workspace owner mismatch');
 if(state.episodes.now!==now(state)||state.attention.now!==now(state))throw Error('Workspace clock mismatch');
 const beliefs=state.actor.person.beliefs;
 if(!catalog.actions.includes(state.attention.reviewActionId))throw Error('Unknown review action');
 if(beliefs.propositions.some(id=>!state.inference.propositions.includes(id)))throw Error('Missing inference proposition');
 for(const m of state.attention.messages){if(!beliefs.propositions.includes(m.propositionId)||!beliefs.sources.includes(m.sourceId)||!beliefs.sources.includes(m.originId)||!state.episodes.contexts.includes(m.contextId))throw Error('Unknown message source/proposition/context');}
 for(const m of state.attention.messages){if(!state.attention.processings.some(r=>r.messageId===m.messageId)&&beliefs.receipts.some(r=>r.receiptId===m.messageId))throw Error('Unread message ID is reserved from belief injection');}
 const human=situated(state).human;
 for(const receipt of state.attention.processings){if(Number(receipt.attemptId.split(':').at(-1))>=human.nextAttempt)throw Error('Attention payment exceeds actual attempt counter');const paid=state.actor.habits.receipts.find(r=>r.attemptId===receipt.attemptId);if(!paid||receipt.attemptId===human.pending?.id||paid.status!=='completed'||paid.actionId!==state.attention.reviewActionId||paid.elapsedMinutes<state.attention.minReviewMinutes||paid.at!==receipt.processedAt)throw Error('Attention payment lacks matching actual paid review');const evidence=beliefs.receipts.find(r=>r.kind==='evidence'&&r.receiptId===receipt.messageId);const m=state.attention.messages.find(m=>m.messageId===receipt.messageId);if(!evidence||evidence.receivedAt!==receipt.processedAt||evidence.propositionId!==m.propositionId||evidence.value!==m.value||evidence.observedAt!==m.occurredAt||evidence.expiresAt!==m.expiresAt||evidence.sourceId!==m.sourceId||evidence.originId!==m.originId||evidence.correctsReceiptId!==m.correctsReceiptId)throw Error('Processed message lacks matching delivered belief');}
 if(state.selection!==null){exact(state.selection,['messageId','attemptId','startedAt'],'attention selection');const p=human.pending,m=state.attention.messages.find(m=>m.messageId===state.selection.messageId);if(!p||p.id!==state.selection.attemptId||p.startedAt!==state.selection.startedAt||!m||m.deliveredAt>p.startedAt||m.expiresAt<=p.startedAt||p.action.actionId!==state.attention.reviewActionId||p.action.durationMinutes<state.attention.minReviewMinutes||state.attention.processings.some(x=>x.messageId===m.messageId))throw Error('Invalid pending attention selection');}
 return state;
}
const checked=(s,c)=>copy(validate(s,c));
export function createExperienceWorkspace({actor,episodes,attention,inference}={},catalog){return checked({version:EXPERIENCE_WORKSPACE_VERSION,ownerId:actor?.id,actor,episodes,attention,inference,selection:null},catalog);}
export function deliverExperienceMessage(state,message,catalog){const next=checked(state,catalog);next.attention=deliverMessage(next.attention,message);return checked(next,catalog);}
export function receiveExperienceEpisode(state,episode,catalog){const next=checked(state,catalog);next.episodes=recordEpisode(next.episodes,episode);return checked(next,catalog);}
export function retractExperienceEpisode(state,receipt,catalog){const next=checked(state,catalog);next.episodes=retractEpisode(next.episodes,receipt);return checked(next,catalog);}
export function beginExperienceAttempt(state,{action,cueId=null,purposeId=null,attentionMessageId=null}={},catalog){
 const next=checked(state,catalog);
 if(attentionMessageId!==null){const m=getAttentionView(next.attention).messages.find(m=>m.messageId===attentionMessageId);if(!m?.available)throw Error('Attention message unavailable or already processed');if(action?.actionId!==next.attention.reviewActionId||action.durationMinutes<next.attention.minReviewMinutes)throw Error('Attention requires configured review action and minimum duration');}
 if(attentionMessageId!==null){const m=next.attention.messages.find(m=>m.messageId===attentionMessageId);receiveEvidence(next.actor.person.beliefs,{receiptId:m.messageId,propositionId:m.propositionId,sourceId:m.sourceId,originId:m.originId,value:m.value,observedAt:m.occurredAt,receivedAt:now(next),expiresAt:m.expiresAt,correctsReceiptId:m.correctsReceiptId});}
 next.actor=beginAdaptiveAttempt(next.actor,{action,cueId,purposeId},catalog);
 const pending=situated(next).human.pending;
 next.selection=attentionMessageId===null?null:{messageId:attentionMessageId,attemptId:pending.id,startedAt:pending.startedAt};
 return checked(next,catalog);
}
export function advanceExperienceAttempt(state,minutes,catalog){const next=checked(state,catalog);next.actor=advanceAdaptiveAttempt(next.actor,minutes,catalog);next.episodes=advanceEpisodes(next.episodes,now(next));next.attention=advanceAttention(next.attention,now(next));return checked(next,catalog);}
export function finishExperienceAttempt(state,result,catalog){
 const next=checked(state,catalog),selection=next.selection;
 next.actor=finishAdaptiveAttempt(next.actor,result,catalog);next.selection=null;
 if(selection&&result.status==='completed'){
  const m=getAttentionView(next.attention).messages.find(m=>m.messageId===selection.messageId);
  if(m?.available){const last=next.actor.person.lastAttempt;const processed=processSelectedMessage(next.attention,{messageId:selection.messageId,selectedByActor:true,attempt:{ownerId:next.ownerId,attemptId:last.attemptId,actionId:last.actionId,status:last.status,finishedAt:last.finishedAt,elapsedMinutes:last.elapsedMinutes}});
   // All local changes are detached; invalid external evidence cannot partly update this workspace.
   const beliefs=receiveEvidence(next.actor.person.beliefs,processed.evidence);
   next.actor={...next.actor,person:{...next.actor.person,beliefs}};next.attention=processed.attention;
  }
 }
 return checked(next,catalog);
}
export function advanceExperience(state,{to,mode}={},catalog){const next=checked(state,catalog);next.actor=advanceAdaptivePerson(next.actor,{to,mode},catalog);next.episodes=advanceEpisodes(next.episodes,now(next));next.attention=advanceAttention(next.attention,now(next));return checked(next,catalog);}
export function advanceExperienceCalendar(state,input,catalog){const next=checked(state,catalog);next.actor=advanceAdaptiveCalendar(next.actor,input,catalog);return checked(next,catalog);}
export function updateExperienceActor(state,input,catalog){const next=checked(state,catalog);next.actor=updateAdaptiveComponent(next.actor,input,catalog);return checked(next,catalog);}
export function reviseExperiencePurpose(state,input,catalog){const next=checked(state,catalog);next.actor=acceptAdaptiveRevision(next.actor,input,catalog);return checked(next,catalog);}
/** Actor-private view: inbox metadata, historical retrieval, current attributed beliefs and separate inferences. */
export function getExperienceView(state,catalog,{contextId=null,limit=8}={}){const next=checked(state,catalog);return {ownerId:next.ownerId,now:now(next),actor:getAdaptiveView(next.actor,catalog),memories:contextId===null?null:queryEpisodes(next.episodes,{contextId,limit}),inbox:getAttentionView(next.attention),reasoning:inferBeliefs(next.inference,getBeliefView(next.actor.person.beliefs))};}
export function exportExperienceWorkspace(state,catalog){return {format:FORMAT,version:1,workspace:checked(state,catalog)};}
export function restoreExperienceWorkspace(snapshot,catalog,ownerId){exact(snapshot,['format','version','workspace'],'workspace snapshot');if(snapshot.format!==FORMAT||snapshot.version!==1)throw Error('Incompatible workspace snapshot');const state=checked(snapshot.workspace,catalog);if(state.ownerId!==ownerId)throw Error('Workspace owner mismatch');state.actor=restoreAdaptivePerson(exportAdaptivePerson(state.actor,catalog),catalog,ownerId);state.episodes=restoreEpisodes(exportEpisodes(state.episodes),ownerId);state.attention=restoreAttention(exportAttention(state.attention),ownerId);state.inference=restoreInference(exportInference(state.inference),ownerId);return checked(state,catalog);}
