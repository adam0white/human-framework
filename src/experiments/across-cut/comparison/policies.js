/** Replaceable deterministic policies. Only detached actor-local views enter here. */
import {compareResponseSource} from './representations.js';
export const ARMS=Object.freeze(['cart-only','no-radio-earliest','fixed-early','fixed-conservative','contact','one-way-report','reactive-radio','notebook','notebook-no-confirm']);
const radioArms=new Set(['reactive-radio','notebook','notebook-no-confirm']);
const take=(state,action,reason)=>({state,action,reason});
function fact(view,cue,{reactive=false}={}){
  const received=reactive?(view.inbox.filter(e=>e.message.kind==='report').at(-1)?.message.observations??[]):view.notebook;
  return received.filter(x=>x.cue===cue).sort((a,b)=>a.observedAt-b.observedAt||a.receipt-b.receipt).at(-1)?.value??null;
}
const available=(v,key)=>v.inventory[key]?.available??0;
const ownHome=v=>v.actorId==='keeper'?'valve':'dock';
const ownComplete=v=>v.location===ownHome(v)&&v.local.repairMinutes!==null&&v.local.repairProgress>=v.local.repairMinutes;
const hasWater=v=>available(v,v.actorId==='keeper'?'water':'cartWater')>0;
const proposalKey=p=>`${p.proposalId}|${p.revision}`;
function recovery(v,s){
  if(v.body.body.hunger>.68&&available(v,'meal')>0&&v.now+2<=v.horizon)return take(s,{task:'meal'},'Eat own meal to restore affordable work capacity.');
  if(v.body.body.fatigue>.68&&v.now+2<=v.horizon)return take(s,{task:'rest',minutes:2},'Pay short recovery before another effort.');
  return null;
}
function report(v,s,via='radio'){
  const ids=v.notebook.filter(x=>x.via!=='radio'&&x.via!=='contact').map(x=>x.receipt);
  if(!ids.length)return null;
  s.reportSent=true;return take(s,{task:'transmit',via,message:{kind:'report',observationIds:ids}},'Send inspected local facts with their source times.');
}
export function chooseAction(view,policyState={},arm){
  if(!ARMS.includes(arm))throw Error(`Unknown Across Cut policy ${arm}`);
  const v=view,s=structuredClone(policyState),wait=reason=>take(s,null,reason);
  if(v.ended)return wait('Local episode horizon reached.');
  if(s.lastRefusal?.at===v.now)return wait('This local attempt was refused; allow paid time before reconsidering.');
  // These facts are inferred from own completed transmissions and a PUBLIC bound.
  s.inferredReceived=(v.channel.lossPossible?[]:v.sent.filter(x=>v.now>=x.sentAt+v.channel.maxDelay).map(x=>x.messageId));
  if(v.job)return wait('Own paid task is still running; passive receipt does not interrupt it.');
  if(v.local.serviceUnits>=2)return wait('Observed complete two-unit service; preserve remaining owned supplies.');
  const rec=recovery(v,s);if(rec)return rec;
  if(arm==='cart-only'){
    if(v.actorId==='receiver'&&available(v,'cartWater')&&v.location==='dock'&&v.now+5<=(v.local.launchAt??30))return take(s,{task:'cart'},'Take the finite one-unit cart immediately.');
    return wait('Immediate-cart service attempt is complete or unavailable.');
  }
  if(v.location!==ownHome(v)){
    if(arm==='contact'&&v.actorId==='keeper'&&v.location==='dock'&&!s.contactSent){s.contactSent=true;if(v.local.peerPresent)return report(v,s,'contact')??wait('No owned observation to convey.');}
    return take(s,{task:'travel',to:ownHome(v)},'Return physically to the station required for owned work.');
  }
  if(v.local.repairMinutes===null)return take(s,{task:'inspect'},'Inspect own station before choosing paid repair.');
  if(arm==='contact'&&v.actorId==='keeper'&&!s.contactVisited&&v.local.repairMinutes===6){s.contactVisited=true;return take(s,{task:'travel',to:'dock'},'Price a six-minute direct visit to learn the launch notice.');}
  if(radioArms.has(arm)&&!s.reportSent&&available(v,'radio'))return report(v,s);
  if(arm==='one-way-report'&&v.actorId==='receiver'&&!s.reportSent&&available(v,'radio'))return report(v,s);
  const notebook=arm.startsWith('notebook'),reactive=arm==='reactive-radio';
  if(notebook){
    const ownProposal=v.proposals.filter(p=>p.author===v.actorId).at(-1);
    if(ownProposal&&!s[`decided:${proposalKey(ownProposal)}`]){s[`decided:${proposalKey(ownProposal)}`]='accept';return take(s,{task:'decide',proposalId:ownProposal.proposalId,revision:ownProposal.revision,decision:'accept'},'Record own chosen release contribution; the promise does not perform it.');}
    const peerProposal=v.proposals.filter(p=>p.author!==v.actorId).sort((a,b)=>a.revision-b.revision).at(-1);
    if(peerProposal&&!s[`decided:${proposalKey(peerProposal)}`]){
      const t=peerProposal.terms,remaining=Math.max(0,(v.local.repairMinutes??14)-(v.local.repairProgress??0));
      const feasible=v.actorId==='receiver'&&v.now+remaining+1<=t.attendFrom&&t.releaseAt+5<=(v.local.launchAt??30);
      s[`decided:${proposalKey(peerProposal)}`]=feasible?'accept':'refuse';
      return take(s,{task:'decide',proposalId:peerProposal.proposalId,revision:peerProposal.revision,decision:feasible?'accept':'refuse'},'Choose own contribution from local remaining work and departure notice.');
    }
    if(peerProposal&&s[`decided:${proposalKey(peerProposal)}`]&&!s[`responded:${proposalKey(peerProposal)}`]&&available(v,'radio')){
      s[`responded:${proposalKey(peerProposal)}`]=true;
      return take(s,{task:'transmit',message:{kind:'response',proposalId:peerProposal.proposalId,revision:peerProposal.revision,decision:s[`decided:${proposalKey(peerProposal)}`]}},'Pay to communicate the exact own revision decision.');
    }
    const receivedResponses=v.inbox.filter(e=>e.message.kind==='response'&&e.message.proposalId===ownProposal?.proposalId&&e.message.revision===ownProposal?.revision).sort(compareResponseSource);
    const latestResponse=receivedResponses.at(-1);
    const response=latestResponse?.message.decision==='accept'&&!s[`confirmed:${latestResponse.messageId}`]?latestResponse:null;
    if(v.actorId==='keeper'&&response&&arm==='notebook'&&available(v,'radio')){
      s[`confirmed:${response.messageId}`]=true;return take(s,{task:'transmit',message:{kind:'confirm',messageId:response.messageId}},'Optional receipt-only confirmation carries no new readiness fact.');
    }
    if(v.actorId==='receiver'&&v.channel.lossPossible&&!s.retried&&peerProposal&&s[`decided:${proposalKey(peerProposal)}`]==='accept'&&s[`responded:${proposalKey(peerProposal)}`]&&available(v,'radio')){
      const responseSent=v.sent.filter(e=>e.message.kind==='response'&&e.message.decision==='accept').at(-1);
      const confirmed=responseSent&&v.inbox.some(e=>e.message.kind==='confirm'&&e.message.messageId===responseSent.messageId);
      if(responseSent&&!confirmed&&v.now>=responseSent.sentAt+v.channel.maxDelay*2&&v.now+1<peerProposal.terms.attendFrom){s.retried=true;const {proposalId,revision,decision}=responseSent.message;return take(s,{task:'transmit',message:{kind:'response',proposalId,revision,decision}},'One optional affordable retry; missing reply does not prove refusal.');}
    }
  }
  if(!ownComplete(v)){
    if(v.actorId==='receiver'&&v.now+Math.max(0,v.local.repairMinutes-v.local.repairProgress)+1>(v.local.launchAt??30)){
      if(available(v,'cartWater')&&v.now+5<=(v.local.launchAt??30))return take(s,{task:'cart'},'Own inlet cannot finish before launch; preserve useful cart service.');
      return wait('Own inlet work can no longer serve the known launch.');
    }
    if(v.actorId==='keeper'&&v.local.launchAt!==null&&v.now+v.local.repairMinutes-v.local.repairProgress+5>v.local.launchAt)return wait('Known launch leaves insufficient time for remaining own repair and water travel.');
    return take(s,{task:'repair',minutes:1},'Pay one minute of owned repair; retain partial progress and fitting.');
  }
  if(v.actorId==='keeper'){
    if(!hasWater(v))return wait('Own pipe water already reserved or consumed.');
    const launch=fact(v,'launchAt',{reactive})??(notebook?15:30);
    if(notebook&&!s.proposed){
      const releaseAt=Math.max(v.now+2*v.channel.maxDelay+3,7),arrival=releaseAt+5;
      if(arrival<=launch&&releaseAt<=24&&available(v,'radio')){
        s.proposed=true;s.releaseAt=releaseAt;
        return take(s,{task:'propose',terms:{releaseAt,attendFrom:arrival-1,attendUntil:arrival}},'Propose a physically feasible rendezvous including paid response and optional confirmation time.');
      }
      s.proposed=true;
    }
    const inlet=fact(v,'repairMinutes:dock');
    const releaseAt=s.releaseAt??(arm==='fixed-conservative'?13:arm==='fixed-early'?7:arm==='one-way-report'&&inlet!==null?Math.max(v.now,inlet-2):v.now);
    if(v.now<releaseAt)return wait('Wait for the pre-agreed or locally proposed release minute.');
    if(v.now+5>launch)return wait('Known launch notice makes a new release late.');
    return take(s,{task:'release'},'Release own water; remote acknowledgment is not a physical prerequisite.');
  }
  const launch=v.local.launchAt??30,cartLast=launch-5;
  const accepted=v.proposals.filter(p=>s[`decided:${proposalKey(p)}`]==='accept').at(-1);
  if(accepted&&v.now>=accepted.terms.attendFrom&&v.now<accepted.terms.attendUntil)return take(s,{task:'attend',minutes:1},'Honor chosen attendance independently of final confirmation.');
  let receiveFrom=11,receiveUntil=18;
  if(arm==='fixed-early'){receiveFrom=11;receiveUntil=12;}
  if(arm==='fixed-conservative'){receiveFrom=17;receiveUntil=18;}
  const contactReport=v.inbox.filter(e=>e.via==='contact'&&e.message.kind==='report').at(-1);
  if(arm==='contact'&&contactReport){const work=contactReport.message.observations.find(o=>o.cue==='repairMinutes:valve')?.value??12;receiveUntil=contactReport.receivedAt+6+work+5;receiveFrom=receiveUntil-1;}
  if(arm==='one-way-report'){receiveFrom=Math.max(11,v.local.repairMinutes+2);receiveUntil=Math.min(18,launch);}
  if(radioArms.has(arm)){
    const remoteWork=fact(v,'repairMinutes:valve',{reactive});
    if(remoteWork!==null){receiveFrom=remoteWork+6;receiveUntil=remoteWork+7;}
    if(accepted){receiveFrom=accepted.terms.attendFrom;receiveUntil=accepted.terms.attendUntil;}
  }
  if(v.now>=receiveFrom&&v.now<receiveUntil&&v.now<launch)return take(s,{task:'attend',minutes:1},'Attend the paid local window where a legal remote release may arrive.');
  const protectWindow=arm==='fixed-early'||Boolean(accepted)||(arm==='contact'&&Boolean(contactReport))||(arm==='one-way-report'&&v.local.repairMinutes===2)||(radioArms.has(arm)&&fact(v,'repairMinutes:valve',{reactive})===6);
  if(available(v,'cartWater')&&v.now+5<=launch&&(v.now>=receiveUntil||(v.now>=cartLast&&(!protectWindow||receiveUntil>launch))))return take(s,{task:'cart'},'Take cart insurance while its own launch deadline still permits delivery.');
  return wait('No local work is needed before the declared receiving or fallback window.');
}
