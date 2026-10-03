/** Same received inputs; no world/behavior change or cognition-package import. */
export function compareResponseSource(left,right){
  const sequence=envelope=>Number(envelope.messageId?.match(/:m([1-9]\d*)$/)?.[1]??0);
  return (left.message.decidedAt??0)-(right.message.decidedAt??0)||(left.sentAt??0)-(right.sentAt??0)||sequence(left)-sequence(right);
}
export function compareRepresentations(observations,envelopes){
  const notebook={latest:{},responses:{}},lastArrival={latest:{},responses:{}},responseSources={};
  for(const observation of observations){
    const key=`${observation.source}|${observation.cue}`,old=notebook.latest[key];
    if(!old||observation.observedAt>old.observedAt||(observation.observedAt===old.observedAt&&observation.receipt>old.receipt))notebook.latest[key]=structuredClone(observation);
    lastArrival.latest[key]=structuredClone(observation);
  }
  for(const envelope of envelopes){const m=envelope.message;if(m.kind!=='response')continue;const key=`${m.proposalId}|${m.revision}`,old=responseSources[key];if(!old||compareResponseSource(envelope,old)>=0){notebook.responses[key]=structuredClone(m);responseSources[key]=envelope;}lastArrival.responses[m.proposalId]=structuredClone(m);}
  return {identicalInput:true,notebook,lastArrival,note:'Different bookkeeping of identical received inputs; world actions and paid exposures do not change.'};
}
