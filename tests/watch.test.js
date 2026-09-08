import test from 'node:test';
import assert from 'node:assert/strict';
import {createWatch, requestTask, interruptTask, advanceTo, nextEvent, getWatchView, exportWatch, restoreWatch, receiveReceipt} from '../src/games/watch.js';
import {createPerson,beginAttempt} from '../src/runtime/index.js';
const json=value=>JSON.parse(JSON.stringify(value));
const ask=(state,actor,task)=>{const next=requestTask(state,actor,task);assert.equal(next.lastResponse.accepted,true,next.lastResponse.reason);return next;};
function repairRoute(scenario='steady') {
 let s=ask(ask(createWatch({scenario}),'keeper','repair'),'watcher','watch');
 s=advanceTo(s,6);s=ask(ask(s,'keeper','repair'),'watcher','share');
 s=advanceTo(s,12);s=ask(s,'keeper','rest');s=advanceTo(s,18);s=ask(s,'keeper','repair');
 return advanceTo(s,40);
}
function diversionRoute(scenario='steady') {
 let s=ask(ask(createWatch({scenario}),'keeper','bypass'),'watcher','watch');
 s=advanceTo(s,10);s=ask(s,'watcher','open');return advanceTo(s,40);
}

test('creation is paused data with per-person ownership and only forecast timing exposed',()=>{
 const s=createWatch(),v=getWatchView(s);assert.equal(v.now,0);assert.equal(v.arrivalAt,null);assert.deepEqual(v.forecast,[28,36]);
 assert.deepEqual(v.parts,{keeper:2,watcher:1,reserved:0,installed:0,salvageAvailable:true});
 assert.equal(s.people.keeper.version,'0.1.1');assert.deepEqual(exportWatch(s),exportWatch(restoreWatch(json(exportWatch(s)))));
});
test('two feasible default approaches protect the site with different service, parts and work consequences',()=>{
 const gate=repairRoute(),bypass=diversionRoute();
 assert.equal(gate.outcome.protected,true);assert.equal(gate.outcome.waterService,true);assert.equal(gate.outcome.partsRemaining,0);
 assert.equal(bypass.outcome.protected,true);assert.equal(bypass.outcome.waterService,false);assert.equal(bypass.outcome.partsRemaining,1);
 assert.ok(gate.outcome.workMinutes>bypass.outcome.workMinutes);assert.equal(gate.clock.now,32);assert.equal(bypass.clock.now,32);
});
test('short notice preserves the same mechanics and rejects the slower repair schedule by outcome',()=>{
 const gate=repairRoute('short'),bypass=diversionRoute('short');
 assert.equal(gate.outcome.protected,false);assert.equal(gate.repair,16);assert.equal(gate.outcome.breachedSections,1);
 assert.equal(bypass.outcome.protected,true);assert.equal(bypass.clock.now,22);
});
test('neighbor role and owned-spare refusals are explicit and free of time or resource substitutions',()=>{
 let s=createWatch();for(const [task,code] of [['repair','ROLE_DECLINED'],['share','KEEPING_SPARE']]){
 const n=requestTask(s,'watcher',task);assert.equal(n.lastResponse.code,code);assert.equal(n.clock.now,0);assert.deepEqual(n.people,s.people);assert.deepEqual(n.parts,s.parts);
 }
 s=ask(s,'keeper','repair');const n=requestTask(s,'keeper','watch');assert.equal(n.lastResponse.code,'BUSY');assert.deepEqual(n.jobs,s.jobs);
 assert.equal(requestTask(s,'nobody','rest').lastResponse.code,'NOT_PRESENT');
});
test('capacity refusal preserves the accepted action boundary and recovery makes another repair possible',()=>{
 let s=ask(ask(createWatch(),'keeper','repair'),'watcher','watch');s=advanceTo(s,6);s=ask(ask(s,'keeper','repair'),'watcher','share');s=advanceTo(s,12);
 const n=requestTask(s,'keeper','repair');assert.equal(n.lastResponse.code,'CAPACITY');assert.equal(n.clock.now,12);assert.deepEqual(n.parts,s.parts);
 s=ask(n,'keeper','rest');s=advanceTo(s,18);s=ask(s,'keeper','repair');assert.equal(s.jobs.keeper.task,'repair');
});
test('partial repair keeps paid progress and installed part; resuming never charges it twice',()=>{
 const initial=createWatch();let s=ask(initial,'keeper','repair');assert.equal(s.parts.keeper,1);assert.equal(s.jobs.keeper.reservedParts,1);
 s=advanceTo(s,3);assert.equal(s.repair,3);assert.equal(s.jobs.keeper.reservedParts,0);s=interruptTask(s,'keeper');
 assert.equal(s.parts.keeper,1);s=ask(s,'keeper','repair');assert.equal(s.jobs.keeper.endsAt,6);s=advanceTo(s,6);
 assert.equal(s.repair,6);assert.equal(s.parts.keeper,1);assert.equal(initial.repair,0);assert.equal(initial.parts.keeper,2);
});
test('diversion returns only unused parts, preserves partial work and allows no parallel target reservation',()=>{
 let s=ask(createWatch(),'keeper','bypass');s=advanceTo(s,2);s=interruptTask(s,'keeper');assert.equal(s.bypass,2);assert.equal(s.parts.keeper,1);
 s=ask(s,'keeper','bypass');assert.equal(s.jobs.keeper.reservedParts,1);
 assert.equal(requestTask(s,'watcher','bypass').lastResponse.code,'TARGET_BUSY');s=advanceTo(s,10);assert.equal(s.bypass,10);assert.equal(s.parts.keeper,0);
});
test('share and meal use owned reservations and need full paid intervals',()=>{
 let s=ask(createWatch(),'watcher','watch');s=advanceTo(s,6);s=ask(s,'watcher','share');assert.equal(s.parts.watcher,0);
 s=advanceTo(s,7);s=interruptTask(s,'watcher');assert.equal(s.parts.watcher,1);assert.equal(s.parts.keeper,2);
 s=ask(s,'watcher','share');s=advanceTo(s,9);assert.equal(s.parts.keeper,3);assert.equal(s.parts.watcher,0);
 s=ask(s,'keeper','meal');const hunger=s.people.keeper.body.hunger;s=advanceTo(s,11);s=interruptTask(s,'keeper');assert.equal(s.food.keeper,1);assert.ok(s.people.keeper.body.hunger>=hunger);
 s=ask(s,'keeper','meal');s=advanceTo(s,15);assert.equal(s.food.keeper,0);assert.ok(s.people.keeper.body.hunger<hunger);assert.equal(requestTask(s,'keeper','meal').lastResponse.code,'NO_MEAL');
});
test('salvage is a single world resource, unavailable during another reservation and returned on interrupt',()=>{
 let s=ask(createWatch(),'keeper','salvage');assert.equal(requestTask(s,'watcher','salvage').lastResponse.code,'TARGET_BUSY');s=advanceTo(s,3);s=interruptTask(s,'keeper');
 s=ask(s,'watcher','salvage');s=advanceTo(s,11);assert.equal(s.salvaged,1);assert.equal(s.parts.watcher,2);assert.equal(requestTask(s,'keeper','salvage').lastResponse.code,'ALREADY_DONE');
});
test('an interrupted lookout grants no warning and completion preserves first warning time',()=>{
 let s=ask(createWatch(),'watcher','watch');s=advanceTo(s,5);s=interruptTask(s,'watcher');assert.equal(s.warningAt,null);
 s=ask(s,'watcher','watch');s=advanceTo(s,11);assert.equal(s.warningAt,11);assert.equal(getWatchView(s).arrivalAt,32);
 assert.equal(requestTask(s,'keeper','watch').lastResponse.code,'ALREADY_DONE');
});
test('arrival precedes equal-time watch/open receipts but counts already-paid repair progress',()=>{
 let s=advanceTo(createWatch(),26);s=ask(s,'watcher','watch');s=advanceTo(s,32);assert.equal(s.warningAt,null);assert.equal(s.outcome.protected,false);
 s=ask(ask(createWatch(),'keeper','bypass'),'watcher','watch');s=advanceTo(s,28);s=ask(s,'watcher','open');s=advanceTo(s,32);
 assert.equal(s.divertedAt,null);assert.equal(s.outcome.protected,false);assert.equal(s.outcome.breachedSections,3);
 let g=ask(ask(createWatch(),'keeper','repair'),'watcher','watch');g=advanceTo(g,6);g=ask(ask(g,'keeper','repair'),'watcher','share');g=advanceTo(g,12);g=ask(g,'keeper','rest');g=advanceTo(g,26);g=ask(g,'keeper','repair');g=advanceTo(g,32);assert.equal(g.outcome.protected,true);assert.equal(g.repair,18);
});
test('arrival returns unpaid reservations and terminal world cannot advance or accept productive jobs',()=>{
 let s=advanceTo(createWatch(),31);s=ask(s,'keeper','meal');s=advanceTo(s,40);assert.equal(s.food.keeper,1);assert.equal(s.clock.now,32);assert.equal(s.clock.queue.length,0);assert.equal(s.jobs.keeper,null);
 assert.deepEqual(advanceTo(s,100),s);assert.equal(requestTask(s,'keeper','rest').lastResponse.code,'ARRIVAL_PASSED');assert.throws(()=>interruptTask(s,'keeper'));
});
test('minute/event/large-step drivers and mid-action JSON resumption are exactly equal',()=>{
 let base=ask(ask(createWatch(),'keeper','bypass'),'watcher','watch');base=advanceTo(base,3);const resumed=restoreWatch(json(exportWatch(base)));
 let minute=base;for(let i=4;i<=10;i++)minute=advanceTo(minute,i);
 let events=base;while(events.clock.now<10)events=advanceTo(events,Math.min(10,nextEvent(events)));
 assert.deepEqual(events,minute);assert.deepEqual(advanceTo(base,10),minute);assert.deepEqual(advanceTo(resumed,10),minute);
 for(const s of [minute,advanceTo(ask(minute,'watcher','open'),32)])assert.deepEqual(restoreWatch(json(exportWatch(s))),s);
});
test('duplicate or early completion receipts reject before any world effect',()=>{
 let s=ask(createWatch(),'keeper','salvage'),receipt=s.clock.queue.find(e=>e.actorId==='keeper');assert.throws(()=>receiveReceipt(s,receipt),e=>e.code==='EARLY_RECEIPT');
 s=advanceTo(s,8);const before=json(s);assert.throws(()=>receiveReceipt(s,receipt),e=>e.code==='STALE_RECEIPT');assert.deepEqual(s,before);
});
test('imports reject world, job, capacity, ownership, receipt and terminal contradictions',()=>{
 const active=ask(ask(createWatch(),'keeper','bypass'),'watcher','watch');
 const mutations=[s=>s.parts.keeper++,s=>s.jobs.keeper.reservedParts=0,s=>s.people.keeper.pending.action.effort=0,s=>s.jobs.keeper.endsAt++,s=>s.clock.queue.pop(),s=>s.warningAt=5,s=>s.food.watcher=-1,s=>s.bypass=5,s=>s.jobs.watcher.task='repair',s=>s.people.keeper.version='0.1.0',s=>s.unexpected=true];
 for(const mutate of mutations){const data=json(exportWatch(active));mutate(data.state);assert.throws(()=>restoreWatch(data));}
 const ended=json(exportWatch(diversionRoute()));ended.state.outcome.waterService=true;assert.throws(()=>restoreWatch(ended));
 const blocked=json(exportWatch(ask(createWatch(),'keeper','repair')));let p=createPerson({id:'keeper',body:{fatigue:.99,hunger:.2},skills:{repair:.2,watch:.1}});p=beginAttempt(p,blocked.state.people.keeper.pending.action);blocked.state.people.keeper=p;blocked.state.jobs.keeper.attemptId=p.pending.id;blocked.state.clock.queue.find(e=>e.actorId==='keeper').data.attemptId=p.pending.id;assert.throws(()=>restoreWatch(blocked));
});
test('imports reject accessors, oversized nesting, incompatible envelopes and malformed commands',()=>{
 const s=createWatch();for(const target of [-1,1.5,Infinity,NaN])assert.throws(()=>advanceTo(s,target));
 assert.throws(()=>createWatch({scenario:'other'}));assert.throws(()=>requestTask(s,'keeper','other'));assert.throws(()=>requestTask(s,' keeper','rest'));
 const snap=exportWatch(s);Object.defineProperty(snap.state,'version',{get(){throw new Error('getter executed');},enumerable:true});assert.throws(()=>restoreWatch(snap),e=>e.code==='INVALID_STATE');
 assert.throws(()=>restoreWatch({format:'maintenance-watch',version:1,state:s}));assert.throws(()=>restoreWatch({...exportWatch(s),version:2}));
});
test('refusal loops retain bounded active state and views/saves cannot mutate the host',()=>{
 let s=createWatch();for(let i=0;i<250;i++)s=requestTask(s,'watcher','repair');assert.ok(JSON.stringify(s).length<16000);assert.ok(s.recent.length<=12);
 const view=getWatchView(s),save=exportWatch(s);view.parts.keeper=100;save.state.parts.keeper=100;assert.equal(s.parts.keeper,2);assert.equal(s.clock.queue.length,3);
});
test('every completed target and terminal result still produces a renderable public view',()=>{
 let s=ask(ask(createWatch(),'keeper','bypass'),'watcher','watch');s=advanceTo(s,10);assert.equal(getWatchView(s).choices.keeper.find(c=>c.task==='bypass').code,'ALREADY_DONE');
 for(const ended of [repairRoute(),diversionRoute(),repairRoute('short')])assert.deepEqual(getWatchView(ended).outcome,ended.outcome);
});
test('false terminal markers and coerced scenario identifiers are not valid save states',()=>{
 for(const value of [false,0,'']){const snap=exportWatch(createWatch());snap.state.outcome=value;assert.throws(()=>restoreWatch(snap));}
 const snap=exportWatch(createWatch());snap.state.scenario=['steady'];assert.throws(()=>restoreWatch(snap));assert.throws(()=>createWatch({scenario:['steady']}));
});
test('short-notice gate can succeed by interrupting recovery after three paid minutes',()=>{
 let s=ask(ask(createWatch({scenario:'short'}),'keeper','repair'),'watcher','watch');s=advanceTo(s,6);s=ask(ask(s,'keeper','repair'),'watcher','share');s=advanceTo(s,12);
 s=ask(s,'keeper','rest');s=advanceTo(s,15);s=interruptTask(s,'keeper');s=ask(s,'keeper','repair');s=advanceTo(s,21);assert.equal(s.repair,18);
 s=advanceTo(s,22);assert.equal(s.outcome.protected,true);assert.equal(s.outcome.waterService,true);assert.equal(s.paid.rest,3);
});
test('imports preserve arrival-first ordering when completion ties the surge',()=>{
 const state=ask(advanceTo(createWatch(),26),'watcher','watch'),data=exportWatch(state),s=data.state;
 const arrival=s.clock.queue.find(e=>e.type==='water-arrival'),due=s.clock.queue.find(e=>e.actorId==='watcher');
 [arrival.id,due.id]=[due.id,arrival.id];s.arrivalEventId=arrival.id;s.jobs.watcher.eventId=due.id;
 s.clock.queue.sort((a,b)=>a.at-b.at||Number(a.id.split(':')[1])-Number(b.id.split(':')[1]));
 assert.throws(()=>restoreWatch(data),e=>e.code==='INVALID_STATE');
});
