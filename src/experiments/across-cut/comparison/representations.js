/** Same received inputs; no world/behavior change or cognition-package import. */
export function compareRepresentations(observations,envelopes){
  const notebook={latest:{},responses:{}},lastArrival={latest:{},responses:{}};
  for(const observation of observations){
    const key=`${observation.source}|${observation.cue}`,old=notebook.latest[key];
    if(!old||observation.observedAt>old.observedAt||(observation.observedAt===old.observedAt&&observation.receipt>old.receipt))notebook.latest[key]=structuredClone(observation);
    lastArrival.latest[key]=structuredClone(observation);
  }
  for(const envelope of envelopes){const m=envelope.message;if(m.kind!=='response')continue;const key=`${m.proposalId}|${m.revision}`,old=notebook.responses[key];if(!old||(m.decidedAt??0)>=(old.decidedAt??0))notebook.responses[key]=structuredClone(m);lastArrival.responses[m.proposalId]=structuredClone(m);}
  return {identicalInput:true,notebook,lastArrival,note:'Different bookkeeping of identical received inputs; world actions and paid exposures do not change.'};
}
