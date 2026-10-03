import test from 'node:test';
import assert from 'node:assert/strict';
import * as h from '../src/games/across-cut.js';

const view=(s,a='keeper')=>h.getActorView(s,a);
const report=(s,a,ids,via='radio')=>h.request(s,a,{task:'transmit',via,message:{kind:'report',observationIds:ids}});
const localId=(s,a,cue)=>view(s,a).notebook.findLast(o=>o.cue===cue&&o.via==='local').receipt;
function repaired(options={}) {
 let s=h.create(options);
 for(const a of h.ACTORS)s=h.request(s,a,{task:'inspect'});
 s=h.advance(s,1);
 for(const a of h.ACTORS)s=h.request(s,a,{task:'repair'});
 return s;
}
function receiptAtEight() {
 let s=h.create({valveMinutes:6,inletMinutes:14,launchAt:15,channelMode:'bounded',channelOverrides:{'receiver:2':6}});
 for(const a of h.ACTORS)s=h.request(s,a,{task:'inspect'});
 s=h.advance(s,1);
 s=h.request(s,'keeper',{task:'repair'});
 s=report(s,'receiver',['launchAt','repairMinutes:dock'].map(c=>localId(s,'receiver',c)));
 s=h.advance(s,2);s=h.request(s,'receiver',{task:'cart'});
 s=h.advance(s,7);s=h.request(s,'keeper',{task:'release'});
 return h.advance(s,8);
}

test('public host has its own identity and contains no negotiation state or commands',()=>{
 assert.equal(h.ACROSS_CUT_VERSION,'0.2.0');
 const s=h.create(),v=view(s),save=h.exportState(s);
 assert.deepEqual([save.format,save.saveVersion,save.hostVersion],['human-across-cut',1,'0.2.0']);
 for(const key of ['proposals','contributions','nextProposal'])assert.equal(Object.hasOwn(s.actors.keeper,key),false);
 for(const key of ['proposals','contributions'])assert.equal(Object.hasOwn(v,key),false);
 assert.equal(Object.hasOwn(h.getWorldSummary(s).actors.keeper,'contributions'),false);
 for(const action of [{task:'propose',terms:{releaseAt:8,attendFrom:9,attendUntil:14}},{task:'decide',proposalId:'keeper:p1',revision:1,decision:'accept'},...['proposal','response','confirm'].map(kind=>({task:'transmit',message:{kind}}))])assert.throws(()=>h.request(s,'keeper',action),{code:'INVALID_COMMAND'});
});
test('first-hop reports preserve exact source records and refuse received relays and relative presence',()=>{
 let s=h.create();s=h.request(s,'receiver',{task:'inspect'});s=h.advance(s,1);
 const source=view(s,'receiver').notebook.find(o=>o.cue==='repairMinutes:dock');
 s=report(s,'receiver',[source.receipt]);s=h.advance(s,4);
 assert.deepEqual(view(s).inbox[0].message.observations,[source]);
 const received=view(s).notebook.find(o=>o.cue===source.cue);
 assert.deepEqual([received.observedAt,received.receivedAt,received.via],[1,4,'radio']);
 assert.throws(()=>report(s,'keeper',[received.receipt]),{code:'NOT_LOCAL_OBSERVATION'});
 assert.throws(()=>report(s,'keeper',[localId(s,'keeper','peerPresent:valve')]),{code:'UNREPORTABLE_OBSERVATION'});
 assert.throws(()=>report(s,'keeper',[999]),{code:'UNKNOWN_OBSERVATION'});
});
test('out-of-order old facts remain in the notebook without replacing a newer source-time claim',()=>{
 let s=h.create({channelMode:'bounded',channelOverrides:{'receiver:1':6,'receiver:4':2}});
 s=report(s,'receiver',[localId(s,'receiver','repairProgress:dock')]);s=h.advance(s,1);
 s=h.request(s,'receiver',{task:'inspect'});s=h.advance(s,2);
 s=h.request(s,'receiver',{task:'repair',minutes:1});s=h.advance(s,3);
 s=report(s,'receiver',[localId(s,'receiver','repairProgress:dock')]);s=h.advance(s,7);
 const v=view(s),records=v.notebook.filter(o=>o.cue==='repairProgress:dock');
 assert.deepEqual(records.map(o=>[o.value,o.observedAt,o.receivedAt]),[[1,3,6],[0,0,7]]);
 assert.equal(v.latest.find(o=>o.cue==='repairProgress:dock').value,1);
 assert.deepEqual(v.inbox.map(e=>e.messageId),['receiver:m2','receiver:m1']);
});
test('minute-eight receipt pauses a paid release; explicit stop preserves two units and one paid minute',()=>{
 let s=receiptAtEight();assert.equal(view(s).inbox[0].receivedAt,8);
 assert.deepEqual([view(s).job.task,view(s).job.elapsed,view(s).inventory.water.reserved],['release',1,2]);
 s=h.restoreState(h.exportState(s));const before=JSON.stringify(s);
 for(let i=0;i<3;i++)assert.deepEqual(h.advance(s,8),s);
 assert.equal(JSON.stringify(s),before);
 const stopped=h.interrupt(s,'keeper'),v=view(stopped);
 assert.deepEqual([v.paid.release,v.inventory.water.available,v.inventory.water.consumed,v.job],[1,2,0,null]);
 const continued=h.advance(s,12),w=h.getWorldSummary(continued);
 assert.deepEqual([view(continued).paid.release,w.water.pipeConsumed,w.water.lost],[2,2,2]);
 assert.equal(w.water.conservedTotal,3);
});
test('interrupted repair retains paid progress, practice and the single installed fitting',()=>{
 let s=h.advance(repaired(),3);const skill=view(s).body.skills.repair;
 s=h.interrupt(s,'keeper');assert.equal(view(s).local.repairProgress,2);
 assert.deepEqual(view(s).inventory.fitting,{available:0,reserved:0,installed:1});
 s=h.request(s,'keeper',{task:'repair'});s=h.advance(s,7);
 assert.equal(view(s).paid.repair,6);assert.equal(view(s).local.repairProgress,6);
 assert.ok(view(s).body.skills.repair>=skill);
});
test('fixed pipe schedule works without radio and attends through the launch endpoint',()=>{
 let s=h.advance(repaired({launchAt:15}),10);
 s=h.request(s,'keeper',{task:'release'});s=h.request(s,'receiver',{task:'attend',minutes:5});s=h.advance(s,15);
 assert.equal(h.getWorldSummary(s).service.units,2);assert.equal(view(s,'receiver').paid.attend,5);
 assert.equal(view(s).sent.length,0);assert.equal(view(s).body.minutes,15);
 assert.equal(view(s).ended,false);assert.deepEqual(view(s).nextBoundary,{at:30,kind:'horizon'});
 assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
test('attendance requested at a settled arrival cannot recover lost pipe water',()=>{
 let s=h.advance(repaired(),7);s=h.request(s,'keeper',{task:'release'});s=h.advance(s,12);
 s=h.request(s,'receiver',{task:'attend',minutes:1});s=h.advance(s,13);
 assert.equal(h.getWorldSummary(s).water.lost,2);assert.equal(h.getWorldSummary(s).service.units,0);
});
test('interrupted outbound cart retains supply and position; returning costs remaining distance',()=>{
 let s=h.request(h.create(),'receiver',{task:'cart'});s=h.advance(s,3);s=h.interrupt(s,'receiver');
 assert.equal(view(s,'receiver').position,9);assert.equal(view(s,'receiver').inventory.cartWater.available,1);
 assert.throws(()=>h.request(s,'receiver',{task:'cart'}),{code:'NOT_AT_STATION'});
 s=h.request(s,'receiver',{task:'travel',to:'dock'});s=h.advance(s,6);
 assert.equal(view(s,'receiver').position,6);assert.equal(view(s,'receiver').paid.travel,3);
 assert.equal(h.getWorldSummary(s).service.units,0);assert.equal(h.getWorldSummary(s).water.conservedTotal,3);
});
test('cart delivery is first-hand knowledge and interrupted return never delivers twice',()=>{
 let s=h.request(h.create(),'receiver',{task:'cart'});s=h.advance(s,6);s=h.interrupt(s,'receiver');
 assert.equal(view(s,'receiver').position,10);assert.equal(view(s,'receiver').inventory.cartWater.consumed,1);
 const observation=view(s,'receiver').notebook.find(o=>o.cue==='cartDelivery');assert.equal(observation.value.delivered,1);
 s=report(s,'receiver',[observation.receipt]);s=h.advance(s,7);
 s=h.request(s,'receiver',{task:'travel',to:'dock'});s=h.advance(s,11);
 assert.throws(()=>h.request(s,'receiver',{task:'cart'}),{code:'NO_SUPPLY'});
 assert.equal(h.getWorldSummary(s).service.units,1);assert.equal(view(s,'receiver').paid.travel,4);
 assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
test('partial station travel cannot teleport on stop or grant distant observations',()=>{
 let s=h.request(h.create({launchAt:15}),'keeper',{task:'travel',to:'dock'});s=h.advance(s,2);s=h.interrupt(s,'keeper');
 assert.equal(view(s).position,2);assert.equal(view(s).local.launchAt,null);
 s=h.request(s,'keeper',{task:'travel',to:'dock'});s=h.advance(s,6);
 assert.equal(view(s).position,6);assert.equal(view(s).local.launchAt,15);assert.equal(view(s).paid.travel,6);
});
test('radio interruption restores charge while completed sends consume time and reveal no outcome',()=>{
 let s=report(h.create(),'receiver',[1]);s=h.interrupt(s,'receiver');
 assert.equal(view(s,'receiver').inventory.radio.available,4);assert.equal(view(s,'receiver').sent.length,0);
 s=report(s,'receiver',[1]);s=h.advance(s,3);
 assert.equal(view(s,'receiver').paid.transmit,1);assert.equal(view(s,'receiver').inventory.radio.consumed,1);
 for(const field of ['delay','deliveredAt','dueAt','receivedAt'])assert.equal(Object.hasOwn(view(s,'receiver').sent[0],field),false);
});
test('paid contact succeeds only with observed co-location continuing through completion',()=>{
 let s=h.request(h.create(),'keeper',{task:'travel',to:'dock'});s=h.advance(s,6);
 s=report(s,'keeper',[localId(s,'keeper','launchAt')],'contact');s=h.advance(s,7);
 assert.equal(view(s,'receiver').inbox.length,1);assert.equal(view(s).inventory.radio.available,4);
 s=report(s,'keeper',[localId(s,'keeper','launchAt')],'contact');s=h.request(s,'receiver',{task:'travel',to:'valve'});s=h.advance(s,8);
 assert.equal(view(s,'receiver').inbox.length,1);assert.equal(view(s).paid.transmit,2);assert.equal(view(s).local.peerPresent,false);
});
test('rest and owned meals pay time, preserve body carryover and restore interrupted reservations',()=>{
 let s=h.create({bodies:{keeper:{fatigue:.95,hunger:.15}}});s=h.request(s,'keeper',{task:'inspect'});s=h.advance(s,1);
 assert.throws(()=>h.request(s,'keeper',{task:'repair'}),{code:'CAPACITY'});const fatigue=view(s).body.body.fatigue;
 s=h.request(s,'keeper',{task:'rest',minutes:6});s=h.advance(s,7);assert.ok(view(s).body.body.fatigue<fatigue);
 s=h.request(s,'keeper',{task:'meal'});s=h.advance(s,8);s=h.interrupt(s,'keeper');assert.equal(view(s).inventory.meal.available,1);
 s=h.request(s,'keeper',{task:'meal'});s=h.advance(s,10);
 assert.equal(view(s).paid.meal,3);assert.equal(view(s).inventory.meal.consumed,1);assert.equal(view(s).body.minutes,10);
});
test('available actor time recovers automatically without holding a job or charging explicit rest',()=>{
 let s=h.create({bodies:{keeper:{fatigue:.7,hunger:.15}}});const fatigue=view(s).body.body.fatigue;
 s=h.advance(s,6);assert.ok(view(s).body.body.fatigue<fatigue);
 assert.equal(view(s).job,null);assert.equal(view(s).paid.availableRecovery,6);assert.equal(view(s).paid.rest,0);
 assert.equal(Object.hasOwn(view(s).paid,'idle'),false);assert.equal(view(s).body.minutes,6);
 s=h.request(s,'keeper',{task:'inspect'});s=h.advance(s,7);assert.equal(view(s).paid.availableRecovery,6);
 assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
test('horizon stops unfinished release and late cart pays its incomplete return',()=>{
 let s=h.advance(repaired(),29);s=h.request(s,'keeper',{task:'release'});s=h.advance(s,30);
 assert.deepEqual([view(s).paid.release,view(s).inventory.water.available,view(s).inventory.water.reserved,view(s).job],[1,2,0,null]);
 assert.throws(()=>h.request(s,'keeper',{task:'rest',minutes:1}),{code:'ENDED'});
 let cart=h.advance(h.create({launchAt:27}),22);cart=h.request(cart,'receiver',{task:'cart'});cart=h.advance(cart,30);
 assert.equal(h.getWorldSummary(cart).service.units,1);assert.deepEqual([view(cart,'receiver').paid.cart,view(cart,'receiver').position,view(cart,'receiver').job],[8,8,null]);
 for(const state of [s,cart])assert.deepEqual(h.restoreState(h.exportState(state)),state);
});
test('actor-local command budgets reserve an actual stop and cannot leak or spend peer room',()=>{
 let s=h.create();const receiver=view(s,'receiver');
 for(let i=0;i<63;i++){s=h.request(s,'keeper',{task:'rest',minutes:1});s=h.interrupt(s,'keeper');}
 s=h.request(s,'keeper',{task:'rest',minutes:1});assert.deepEqual(view(s).budget,{used:127,limit:128,reserved:1});
 assert.deepEqual(view(s,'receiver'),receiver);s=h.interrupt(s,'keeper');
 assert.throws(()=>h.request(s,'keeper',{task:'rest',minutes:1}),{code:'COMMAND_LIMIT'});
 s=h.request(s,'receiver',{task:'cart'});s=h.advance(s,30);
 assert.equal(h.getWorldSummary(s).service.units,1);assert.equal(view(s).budget.used,128);
 assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
test('hidden work, launch, channel slots and remote actions have equal keeper views and local errors',()=>{
 const configs=[{inletMinutes:2,launchAt:15,channelMode:'lossy',channelOverrides:{'receiver:1':'loss'}},{inletMinutes:14,launchAt:27,channelMode:'lossy',channelOverrides:{'receiver:1':6}}];
 let [a,b]=configs.map(c=>h.create(c));
 b=h.request(b,'receiver',{task:'inspect'});
 for(const minute of [0,1,15,20,30]){
  a=h.advance(a,minute);b=h.advance(b,minute);assert.deepEqual(view(a),view(b));assert.deepEqual(h.getKnownLocalBoundary(a,'keeper'),h.getKnownLocalBoundary(b,'keeper'));
  for(const command of [{task:'repair'},{task:'release'},{task:'transmit',via:'contact',message:{kind:'report',observationIds:[1]}}]){
   const error=s=>{try{h.request(s,'keeper',command);}catch(e){return {code:e.code,message:e.message};}};
   assert.deepEqual(error(a),error(b));
  }
 }
});
test('remote pipe success and failure stay hidden through the keeper\'s real paid schedule',()=>{
 let states=[{inletMinutes:2,launchAt:15},{inletMinutes:14,launchAt:27}].map(c=>h.create(c));
 states=states.map(s=>h.request(h.request(s,'keeper',{task:'inspect'}),'receiver',{task:'inspect'}));
 for(let minute=1;minute<=16;minute++){
  states=states.map(s=>h.advance(s,minute));
  if(minute===1)states=states.map(s=>h.request(h.request(s,'keeper',{task:'repair'}),'receiver',{task:'repair'}));
  if(minute===3)states[0]=h.request(states[0],'receiver',{task:'attend',minutes:12});
  if(minute===7)states=states.map(s=>h.request(s,'keeper',{task:'release'}));
  assert.deepEqual(view(states[0]),view(states[1]));
 }
 assert.deepEqual(states.map(s=>h.getWorldSummary(s).service.units),[2,0]);
 assert.deepEqual(states.map(s=>h.getWorldSummary(s).water.lost),[0,2]);
});
test('receipt-local advances pay actual minutes and distinct stopped receipts replay exactly',()=>{
 let s=h.create({channelMode:'bounded',channelOverrides:{'receiver:1':2,'receiver:2':6}});
 s=report(s,'receiver',[1]);s=h.advance(s,1);s=report(s,'receiver',[1]);s=h.advance(s,2);
 assert.deepEqual(view(s).nextBoundary,{at:30,kind:'horizon'});
 s=h.advance(s,20,{actorId:'keeper',stopOnReceipt:true});assert.equal(view(s).now,3);
 s=h.advance(s,20,{actorId:'keeper',stopOnReceipt:true});assert.equal(view(s).now,8);
 assert.equal(view(s).body.minutes,8);assert.deepEqual(h.restoreState(h.exportState(s)),s);
});
test('strict replay rejects fabricated local report origins, arrivals, paid body and negotiation injection',()=>{
 const s=receiptAtEight(),save=h.exportState(s);
 for(const change of [x=>x.state.actors.keeper.notebook.find(o=>o.via==='radio').via='local',x=>x.state.people.keeper.body.fatigue=.9,x=>x.state.config.launchAt=27,x=>x.state.actors.receiver.proposals=[],x=>x.state.actors.keeper.inbox[0].receivedAt=7]){
  const bad=structuredClone(save);change(bad);assert.throws(()=>h.restoreState(bad),{code:'INVALID_SAVE'});
  assert.throws(()=>h.getActorView(bad.state,'keeper'),{code:'INVALID_STATE'});
 }
 const old=structuredClone(save);old.format='across-cut';old.hostVersion='0.1.0';assert.throws(()=>h.restoreState(old),{code:'INVALID_SAVE'});
});
test('API returns immutable states and detached views and saves without mutating input',()=>{
 const s=h.create(),before=structuredClone(s);assert.equal(Object.isFrozen(s),true);assert.equal(Object.isFrozen(s.actors.keeper.notebook),true);
 assert.throws(()=>{s.actors.keeper.notebook[0].via='radio';},TypeError);
 const v=view(s);v.inventory.water.available=999;const save=h.exportState(s);save.state.work.valve=999;
 const copy=structuredClone(s);assert.deepEqual(view(copy),view(s));h.request(copy,'keeper',{task:'inspect'});assert.deepEqual(copy,before);
 assert.deepEqual(s,before);assert.equal(view(s).inventory.water.available,2);
});
test('plain-data checks reject accessors and foreign prototypes without evaluating user code',()=>{
 let reads=0;const accessor={};Object.defineProperty(accessor,'launchAt',{enumerable:true,get(){reads++;return 15;}});
 assert.throws(()=>h.create(accessor),{code:'INVALID_COMMAND'});
 const badState={};Object.defineProperty(badState,'version',{enumerable:true,get(){reads++;return '0.2.0';}});
 for(const operation of [()=>view(badState),()=>h.exportState(badState),()=>h.request(badState,'keeper',{task:'inspect'})])assert.throws(operation,{code:'INVALID_STATE'});
 const ids=[1];Object.setPrototypeOf(ids,{map(){reads++;return [];}});
 assert.throws(()=>report(h.create(),'receiver',ids),{code:'INVALID_COMMAND'});
 assert.throws(()=>h.request(h.create(),'keeper',{task:'rest',minutes:1,secret:true}),{code:'INVALID_COMMAND'});
 assert.throws(()=>h.advance(h.create(),-0),{code:'INVALID_COMMAND'});
 assert.equal(reads,0);
});
