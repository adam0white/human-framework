import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createSignals,requestTask,interruptTask,advanceTo,getSignalsView,exportSignals,restoreSignals,receiveReceipt,SIGNALS_SITUATIONS} from '../src/games/signals.js';
import {runComparison} from '../scripts/signals-comparison.js';
const json=x=>JSON.parse(JSON.stringify(x)),ask=(s,task)=>{const n=requestTask(s,task);assert.equal(n.lastResponse.accepted,true,n.lastResponse.reason);return n;},finish=(s,task)=>{s=ask(s,task);return advanceTo(s,s.job.endsAt);};

test('original twelve complete cases, checkpoint hashes, baselines and summary remain exactly equal',async()=>{
 const old=JSON.parse(await readFile(new URL('../artifacts/signals/2026-09-08-comparison.json',import.meta.url),'utf8')),current=runComparison();
 for(const key of Object.keys(current))assert.deepEqual(current[key],old[key],key);
});
test('clear connection offers visible two-minute latency and paid report-informed launch success',()=>{
 assert.equal(SIGNALS_SITUATIONS.clear,'Clear connection');let s=createSignals({situation:'clear'}),v=getSignalsView(s);assert.equal(v.profile.radioDelayMinutes,2);assert.match(v.choices.find(c=>c.task==='radio').detail,/2 more minutes/);assert.equal(v.report,null);
 s=finish(s,'radio');assert.equal(s.resources.charges,2);assert.equal(s.inFlight[0].arrivesAt,3);s=advanceTo(s,3);v=getSignalsView(s);assert.equal(v.report.observedAt,1);assert.equal(v.report.deliveredAt,3);assert.equal(v.report.value,'open');s=finish(s,'canal');assert.equal(s.outcome.at,9);assert.equal(s.outcome.launchSailed,true);assert.equal(s.paid.radio,1);assert.equal(s.spent.charges,1);
 assert.equal(createSignals().person.body.fatigue,.2);let original=finish(createSignals({situation:'steady'}),'radio');original=advanceTo(original,6);original=finish(original,'canal');assert.equal(original.outcome.at,12);assert.equal(original.outcome.launchSailed,false);
});
test('tired carrier has real ridge refusal, feasible light crossing and paid-rest ridge route',()=>{
 let s=createSignals({situation:'tired'});assert.equal(s.person.body.fatigue,.8);assert.match(getSignalsView(s).profile.description,/long shift/i);const before=json(s),refusal=requestTask(s,'ridge');assert.equal(refusal.lastResponse.code,'CAPACITY');assert.deepEqual(refusal.person,before.person);assert.equal(refusal.clock.now,0);assert.deepEqual(refusal.resources,before.resources);
 const estimate=getSignalsView(s).choices.find(c=>c.task==='ridge');assert.equal(estimate.capacityEstimate.allowed,false);assert.match(estimate.reason,/estimate/i);assert.equal(estimate.available,true);
 assert.equal(finish(s,'canal').outcome.launchSailed,true);s=finish(refusal,'rest');assert.equal(s.paid.rest,4);assert.ok(s.person.body.fatigue<.8);s=finish(s,'ridge');assert.equal(s.outcome.delivered,true);assert.equal(s.outcome.at,18);assert.equal(s.outcome.launchSailed,false);
});
test('hungry carrier needs a paid meal: rest alone and interrupted meals do not release exertion',()=>{
 let s=createSignals({situation:'hungry'});assert.equal(s.person.body.hunger,1);for(const route of ['canal','ridge'])assert.equal(requestTask(s,route).lastResponse.code,'CAPACITY');s=finish(s,'rest');assert.equal(s.person.body.hunger,1);assert.equal(requestTask(s,'canal').lastResponse.code,'CAPACITY');
 s=ask(s,'meal');s=advanceTo(s,s.clock.now+2);s=interruptTask(s);assert.equal(s.resources.meal,1);assert.equal(s.person.body.hunger,1);assert.equal(requestTask(s,'canal').lastResponse.code,'CAPACITY');
 s=finish(s,'meal');assert.equal(s.resources.meal,0);assert.ok(s.person.body.hunger<1);assert.equal(s.paid.meal,5);s=finish(s,'canal');assert.equal(s.outcome.delivered,true);assert.equal(s.outcome.at,15);assert.equal(s.outcome.launchSailed,false);
 let direct=finish(createSignals({situation:'hungry'}),'meal');direct=finish(direct,'canal');assert.equal(direct.outcome.at,9);assert.equal(direct.outcome.launchSailed,true);
});
test('new profiles preserve exact active/terminal resume and reject condition or delay forgeries',()=>{
 for(const situation of ['clear','tired','hungry']){
  let s=ask(createSignals({situation}),'radio');s=advanceTo(s,1);assert.deepEqual(restoreSignals(json(exportSignals(s))),s);s=advanceTo(s,2);assert.deepEqual(advanceTo(restoreSignals(json(exportSignals(s))),32),advanceTo(s,32));
  for(const mutate of [x=>x.state.person.body.hunger=.2,x=>x.state.inFlight[0].arrivesAt=7]){const data=exportSignals(s);mutate(data);if(JSON.stringify(data)!==JSON.stringify(exportSignals(s)))assert.throws(()=>restoreSignals(data));}
 }
});
test('malformed receipts including null fail with a coded envelope error before mutation',()=>{
 const s=createSignals(),before=json(s);for(const bad of [null,false,0,[],{}, {type:'report-due'}, {id:'x',at:0,type:'x',actorId:'carrier',data:null,extra:true}])assert.throws(()=>receiveReceipt(s,bad),e=>e.code==='INVALID_RECEIPT');assert.deepEqual(s,before);
});
