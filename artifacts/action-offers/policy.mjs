/** Frozen caller; no host module, actual body, request probe or hidden state. */
export const POLICY_VERSION='0.1.0';
export function canUse(offer,arm){return Boolean(offer)&&(!offer.unavailable||(arm==='explicit-try'&&offer.capacityUncertain===true));}
export function selectOffer(offers,arm){return offers.find(offer=>canUse(offer,arm))??null;}
export function decide(view,offers,definition,arm){
  if(view.job)return {kind:'advance',reason:'pay-active-job'};
  if(definition.host==='camp')return canUse(offers[0],arm)?{kind:'request',offer:offers[0]}:{kind:'wait',reason:'authoritative-camp-offer'};
  if(definition.policy==='report'){
    if(view.budget.used+2>view.budget.limit)return {kind:'blocked',reason:'decision-budget'};
    if(definition.via==='radio'&&view.inventory.radio.available<1)return {kind:'blocked',reason:'owned-radio-exhausted'};
    if(definition.via==='contact'&&(view.location==='path'||!view.local.peerPresent))return {kind:'blocked',reason:'peer-not-present'};
  }
  const offer=selectOffer(offers,arm);
  return offer?{kind:'request',offer}:{kind:'wait',reason:'no-usable-offer'};
}
