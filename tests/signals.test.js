import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/games/signals.js';
const json=x=>JSON.parse(JSON.stringify(x));
const ask=(s,task)=>{const n=game.requestTask(s,task);assert.equal(n.lastResponse.accepted,true,n.lastResponse.reason);return n;};
const finish=(s,task)=>game.advanceTo(ask(s,task),s.clock.now+game.getSignalsView(s).choices.find(c=>c.task===task).duration);

test('new game offers both routes immediately through frozen Human 0.1.1',()=>{
 const s=game.createSignals(),v=game.getSignalsView(s);assert.equal(s.person.version,'0.1.1');assert.equal(v.now,0);assert.equal(v.deadline,32);
 assert.ok(v.choices.find(c=>c.task==='canal').available);assert.ok(v.choices.find(c=>c.task==='ridge').available);assert.equal(v.report,null);assert.equal(v.currentReport,null);
 assert.deepEqual(game.restoreSignals(json(game.exportSignals(s))),s);
});
test('two feasible approaches have different paid time, fares and exertion',()=>{
 const initial=game.createSignals({situation:'steady'}),fast=finish(initial,'canal'),ridge=finish(initial,'ridge');
 assert.equal(fast.outcome.delivered,true);assert.equal(fast.clock.now,6);assert.equal(fast.resources.fares,1);
 assert.equal(ridge.outcome.delivered,true);assert.equal(ridge.clock.now,14);assert.equal(ridge.resources.fares,2);
 assert.ok(ridge.person.body.fatigue>fast.person.body.fatigue);assert.equal(initial.resources.fares,2);assert.equal(initial.clock.now,0);
});
test('undisclosed landing changes cannot leak through views, choices or next visible event',()=>{
 let a=game.createSignals({situation:'turning'}),b=game.createSignals({situation:'falling'});
 for(const at of [0,3,4,10,20]){a=game.advanceTo(a,at);b=game.advanceTo(b,at);assert.notEqual(a.landing,b.landing);assert.deepEqual(game.getSignalsView(a),game.getSignalsView(b));assert.equal(game.nextVisibleEvent(a),game.nextVisibleEvent(b));}
});
test('paid current observation changes the report and therefore the same simple choice',()=>{
 let s=finish(game.createSignals(),'lookout');assert.equal(game.getSignalsView(s).report.value,'closed');
 const choose=v=>v.report?.value==='open'?'canal':'ridge';assert.equal(choose(game.getSignalsView(s)),'ridge');
 s=finish(s,'lookout');assert.equal(game.getSignalsView(s).report.value,'open');assert.equal(choose(game.getSignalsView(s)),'canal');
 assert.equal(s.paid.lookout,6);assert.equal(s.person.skills.lookout>0.1,true);assert.equal(finish(s,'canal').outcome.delivered,true);
});
test('radio samples at paid completion and delivers later without exposing in-flight contents',()=>{
 let s=ask(game.createSignals(),'radio');assert.equal(s.resources.charges,3);s=game.advanceTo(s,1);assert.equal(s.resources.charges,2);
 let v=game.getSignalsView(s);assert.equal(v.report,null);assert.deepEqual(v.inFlight,[{arrivesAt:6}]);assert.equal(game.nextVisibleEvent(s),6);
 s=game.advanceTo(s,6);v=game.getSignalsView(s);assert.equal(s.landing,'open');assert.equal(v.report.value,'closed');assert.equal(v.report.observedAt,1);assert.equal(v.report.deliveredAt,6);assert.equal(v.report.ageMinutes,5);assert.equal(v.currentReport,null);assert.equal(v.report.source,'landing-keeper');
});
test('old delayed reply remains visible but cannot overwrite a newer direct report',()=>{
 let s=finish(game.createSignals(),'radio');s=finish(s,'lookout');assert.equal(s.clock.now,4);assert.equal(s.notebook.value,'open');
 s=game.advanceTo(s,6);const v=game.getSignalsView(s);assert.equal(v.report.value,'open');assert.equal(v.report.observedAt,4);assert.equal(v.deliveries.at(-1).value,'closed');assert.equal(v.deliveries.at(-1).observedAt,1);
 assert.equal(v.deliveries.at(-1).sequence,2);assert.equal(v.deliveries.at(-1).olderThanNotebook,true);
});
test('closed crossing spends its fare and full time, keeps the lens, and permits a successful pivot',()=>{
 let s=finish(game.createSignals({situation:'shut'}),'canal');assert.equal(s.outcome,null);assert.equal(s.resources.fares,1);assert.equal(s.failedCrossings,1);assert.equal(s.paid.canal,6);
 s=finish(s,'ridge');assert.equal(s.outcome.delivered,true);assert.equal(s.clock.now,20);assert.equal(s.outcome.failedCrossings,1);
});
test('deadline wins equal-time completion and terminal states stop all activity',()=>{
 let s=game.advanceTo(game.createSignals(),18);s=ask(s,'ridge');s=game.advanceTo(s,80);assert.equal(s.clock.now,32);assert.equal(s.outcome.delivered,false);assert.equal(s.person.pending,null);assert.equal(s.clock.queue.length,0);
 assert.deepEqual(game.advanceTo(s,90),s);assert.equal(game.requestTask(s,'radio').lastResponse.accepted,false);assert.throws(()=>game.interruptTask(s));
});
test('interrupted travel and lookout keep paid effort/practice without world success',()=>{
 let s=ask(game.createSignals(),'lookout');s=game.advanceTo(s,2);const skill=s.person.skills.lookout;s=game.interruptTask(s);assert.equal(s.notebook,null);assert.equal(s.paid.lookout,2);assert.equal(s.person.skills.lookout,skill);
 s=ask(s,'canal');assert.equal(s.resources.fares,1);s=game.advanceTo(s,4);s=game.interruptTask(s);assert.equal(s.resources.fares,1);assert.equal(s.outcome,null);assert.equal(s.paid.canal,2);
});
test('request interruption is unpaid in charges, meals consume only on full completion',()=>{
 let s=ask(game.createSignals(),'radio');s=game.interruptTask(s);assert.equal(s.resources.charges,3);assert.equal(s.inFlight.length,0);
 s=ask(s,'meal');s=game.advanceTo(s,2);s=game.interruptTask(s);assert.equal(s.resources.meal,1);const hunger=s.person.body.hunger;
 s=finish(s,'meal');assert.equal(s.resources.meal,0);assert.ok(s.person.body.hunger<hunger);assert.equal(game.requestTask(s,'meal').lastResponse.code,'NO_MEAL');
});
test('duplicate, mismatched and early receipts cannot repeat observations or spend resources',()=>{
 let s=ask(game.createSignals(),'radio'),receipt=s.clock.queue.find(e=>e.type==='attempt-due'&&e.data.task==='radio');
 assert.throws(()=>game.receiveReceipt(s,receipt),e=>e.code==='EARLY_RECEIPT');s=game.advanceTo(s,1);assert.throws(()=>game.receiveReceipt(s,receipt),e=>e.code==='STALE_RECEIPT');
 const reportReceipt=s.clock.queue.find(e=>e.type==='report-due');assert.throws(()=>game.receiveReceipt(s,reportReceipt),e=>e.code==='EARLY_RECEIPT');s=game.advanceTo(s,6);const before=json(s);assert.throws(()=>game.receiveReceipt(s,reportReceipt),e=>e.code==='STALE_RECEIPT');assert.deepEqual(s,before);
});
test('canonical minute, visible-event and large-step schedules and active saves agree exactly',()=>{
 let base=finish(game.createSignals(),'radio');base=ask(base,'lookout');
 for(const at of [2,4,5,6]){const s=game.advanceTo(base,at);assert.deepEqual(game.restoreSignals(json(game.exportSignals(s))),s);}
 let byMinute=base;for(let at=2;at<=10;at++)byMinute=game.advanceTo(byMinute,at);
 const once=game.advanceTo(base,10);assert.deepEqual(game.exportSignals(once).state,game.exportSignals(byMinute).state);
 let traveling=ask(game.advanceTo(base,6),'canal');traveling=game.advanceTo(traveling,8);assert.deepEqual(game.advanceTo(game.restoreSignals(json(game.exportSignals(traveling))),12),game.advanceTo(traveling,12));
});
test('strict replay imports reject world, receipt, resource, body and hidden-timeline forgeries',()=>{
 const s=game.advanceTo(ask(game.createSignals(),'radio'),1);
 for(const mutate of [x=>x.state.resources.fares++,x=>x.state.landing='open',x=>x.state.clock.queue.pop(),x=>x.state.person.body.fatigue=0,x=>x.state.inFlight[0].value='open',x=>x.state.version='9',x=>x.state.extra=true,x=>x.commands[0].task='ridge']){
  const save=json(game.exportSignals(s));mutate(save);assert.throws(()=>game.restoreSignals(save));
 }
 const ended=json(game.exportSignals(finish(game.createSignals(),'ridge')));ended.state.outcome.delivered=false;assert.throws(()=>game.restoreSignals(ended));
});
test('hostile envelopes, prototypes, accessors, oversized inputs and commands reject atomically',()=>{
 const s=game.createSignals();assert.throws(()=>game.createSignals({situation:'other'}));assert.throws(()=>game.createSignals({extra:1}));assert.throws(()=>game.requestTask(s,'other'));for(const at of [-1,NaN,Infinity,1.5])assert.throws(()=>game.advanceTo(s,at));
 for(const value of [false,null,[],{...game.exportSignals(s),version:2},{...game.exportSignals(s),extra:1}])assert.throws(()=>game.restoreSignals(value));
 const save=game.exportSignals(s);Object.defineProperty(save.state,'clock',{get(){throw new Error('executed');},enumerable:true});assert.throws(()=>game.restoreSignals(save),e=>e.code==='INVALID_SAVE');
 const large=game.exportSignals(s);large.commands=Array(1000).fill({type:'advance',to:1});assert.throws(()=>game.restoreSignals(large));
});
test('repeated refusals and zero-time toggles stay bounded, detached views do not mutate world',()=>{
 let s=ask(game.createSignals(),'ridge');for(let i=0;i<400;i++)s=game.requestTask(s,'canal');assert.ok(JSON.stringify(game.exportSignals(s)).length<24000);
 const v=game.getSignalsView(s);v.resources.fares=200;assert.equal(s.resources.fares,2);assert.deepEqual(game.restoreSignals(json(game.exportSignals(s))),s);
});
test('repeating the just-accepted action records the first busy refusal and remains restorable',()=>{
 let s=ask(game.createSignals(),'ridge');for(let i=0;i<5;i++)s=game.requestTask(s,'ridge');assert.equal(s.lastResponse.code,'BUSY');assert.deepEqual(game.restoreSignals(json(game.exportSignals(s))),s);
});
test('a same-minute landing change is applied before direct observation or canal completion',()=>{
 let s=game.advanceTo(game.createSignals(),1);s=finish(s,'lookout');assert.equal(s.clock.now,4);assert.equal(s.notebook.value,'open');
 s=game.advanceTo(game.createSignals({situation:'falling'}),14);s=finish(s,'canal');assert.equal(s.clock.now,20);assert.equal(s.outcome.delivered,true);
});
test('insufficient remaining fares and charges refuse without a substituted action',()=>{
 let s=game.createSignals({situation:'shut'});for(let i=0;i<2;i++)s=finish(s,'canal');assert.equal(game.requestTask(s,'canal').lastResponse.code,'NO_FARE');
 let r=game.createSignals();for(let i=0;i<3;i++)r=finish(r,'radio');const n=game.requestTask(r,'radio');assert.equal(n.lastResponse.code,'NO_CHARGE');assert.equal(n.clock.now,3);assert.equal(n.inFlight.length,3);
});
test('earlier delivery releases the evening launch; safe ridge delivery preserves only the overnight beacon',()=>{
 const quick=finish(game.createSignals({situation:'steady'}),'canal'),safe=finish(game.createSignals({situation:'steady'}),'ridge');assert.equal(quick.outcome.launchSailed,true);assert.equal(safe.outcome.launchSailed,false);assert.equal(quick.outcome.delivered,true);assert.equal(safe.outcome.delivered,true);
 let tie=game.advanceTo(game.createSignals({situation:'steady'}),6);tie=finish(tie,'canal');assert.equal(tie.outcome.at,12);assert.equal(tie.outcome.launchSailed,false);
 assert.equal(game.nextVisibleEvent(game.createSignals()),12);assert.equal(game.getSignalsView(game.createSignals()).launchDeadline,12);
});
test('alternating busy refusals cannot exhaust the replay budget',()=>{
 let s=ask(game.createSignals(),'ridge');for(let i=0;i<500;i++)s=game.requestTask(s,i%2?'radio':'canal');assert.ok(s.commands.length<5);assert.deepEqual(game.restoreSignals(json(game.exportSignals(s))),s);
});
