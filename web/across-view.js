import {assessEffort} from '../src/runtime/index.js';
// All ordinary text is derived from a detached actor view, never world state.
export const stationName=station=>({valve:'valve',dock:'inlet',cart:'cart'}[station]??'path');
export function factText(record){
  const {cue,value}=record;
  if(cue.startsWith('repairMinutes:'))return `${stationName(cue.split(':')[1])} repair needs ${value} paid minutes`;
  if(cue.startsWith('repairProgress:'))return `${stationName(cue.split(':')[1])} repair has ${value} paid minutes`;
  if(cue==='launchAt')return `the launch leaves at minute ${value}`;
  if(cue==='launchDeparted')return value?'the launch has departed':'the launch had not departed';
  if(cue==='serviceUnits')return `${value} of 2 water units had arrived`;
  if(cue==='cartDelivery')return `the cart delivered ${value.delivered} unit${value.delivered===1?'':'s'} at minute ${value.at}`;
  if(cue.startsWith('peerPresent:'))return value?'Deniz was here':'Deniz was not here';
  return 'an observation';
}
export function ownLocation(view){return view.location==='valve'?'At the valve':view.location==='dock'?'At the inlet':`On the path · position ${view.position}`;}
export function jobText(job){if(!job)return 'Recovering while available';return ({inspect:'Inspecting the station',repair:'Repairing the valve',release:'Releasing two water units',travel:'Walking to the '+stationName(job.to),meal:'Eating your portion',rest:'Recovering',transmit:job.via==='contact'?'Sharing facts in person':'Sending a radio report'}[job.task]??'Working');}
export function currentClaims(view){
  return view.latest.filter(r=>!r.cue.startsWith('peerPresent:')).map(r=>({text:factText(r),source:r.source,observedAt:r.observedAt,receivedAt:r.receivedAt,via:r.via}));
}
export function saveDescription(view){return `Minute ${view.now} of ${view.horizon}. ${ownLocation(view)}. ${jobText(view.job)}. ${view.inventory.water.available} water available${view.inventory.water.reserved?`, ${view.inventory.water.reserved} reserved`:''}.`;}

export function reportUnavailable(view,count,via){
  if(view.ended)return 'This shift has ended.';
  if(view.job)return 'Finish or explicitly stop your current task before sending.';
  if(count<1)return 'Select a first-hand observation to share.';
  if(count>32)return 'Select at most 32 first-hand observations.';
  if(view.budget.used+2>view.budget.limit)return 'Your remaining decisions are reserved for stopping work.';
  const body=Object.fromEntries(Object.entries(view.body.body).map(([key,value])=>[key,Math.min(1,value+.025)]));
  if(!assessEffort(body,{durationMinutes:1,effort:.003,exertive:true}).allowed)return 'Your condition estimates cannot support sending yet. Recover or eat before retrying.';
  if(via==='radio'&&view.inventory.radio.available<1)return 'No radio charge remains.';
  if(via==='contact'&&(view.location==='path'||!view.local.peerPresent))return 'Deniz must be present at your station.';
  return null;
}
