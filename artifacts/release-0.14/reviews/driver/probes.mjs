import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as p from './frozen/src/games/across-cut-player.js';
import * as h from './frozen/src/games/across-cut.js';
import {decideReceiver} from './frozen/src/games/across-cut-receiver.js';
const results=[];
const run=(name,fn)=>{try{const evidence=fn();results.push({name,status:'pass',evidence});}catch(error){results.push({name,status:'fail',error:{message:error.message,stack:error.stack}})}};
const view=g=>p.getGameView(g);
const req=(g,action)=>p.applyCommand(g,{type:'request',action});
const until=(g,t)=>{while(view(g).now<t)g=p.advanceGame(g,1);return g;};
const finish=g=>until(g,30);
const setup={inletMinutes:14,launchAt:15,bodies:{receiver:{fatigue:.15,hunger:.972}}};
run('counterexample: chosen meal repeatedly interrupted in cart fallback',()=>{
 let g=p.createGame(setup);const trace=[];
 while(view(g).now<30){const v=h.getActorView(g.host,'receiver'),d=decideReceiver(g.receiver,v);trace.push({now:v.now,reason:d.reason,commands:d.commands,job:v.job,meal:v.inventory.meal,body:v.body.body});g=p.advanceGame(g,1);}
 const world=p.getDebrief(g),rv=h.getActorView(g.host,'receiver');
 assert.equal(world.service.units,0);assert.equal(rv.paid.meal,5);assert.equal(rv.inventory.meal.consumed,0);assert.equal(rv.inventory.meal.available,1);assert.equal(rv.paid.cart,0);
 fs.writeFileSync('/tmp/across-driver-review/meal-livelock.json',JSON.stringify({setup,trace,world,save:p.exportGame(g)},null,2)+'\n');
 assert.deepEqual(p.restoreGame(p.exportGame(g)),g);
 return {service:world.service.units,paidMeal:rv.paid.meal,mealConsumed:rv.inventory.meal.consumed,paidCart:rv.paid.cart,interruptionTimes:trace.filter(x=>x.commands.some(c=>c.type==='stop')).map(x=>x.now)};
});
run('same-world lawful counterpart: finish selected meal then cart',()=>{
 let g=until(p.createGame(setup),2);let host=h.request(g.host,'receiver',{task:'meal'});host=h.advance(host,4);const afterMeal=h.getActorView(host,'receiver');
 assert.equal(afterMeal.inventory.meal.consumed,1);const decision=decideReceiver(g.receiver,afterMeal);assert.deepEqual(decision.commands,[{type:'request',action:{task:'cart'}}]);
 host=h.request(host,'receiver',decision.commands[0].action);host=h.advance(host,14);const world=h.getWorldSummary(host),rv=h.getActorView(host,'receiver');
 assert.equal(world.service.units,1);assert.equal(world.service.deliveries[0].at,9);assert.equal(rv.paid.meal,2);assert.equal(rv.paid.cart,10);assert.equal(rv.position,6);
 fs.writeFileSync('/tmp/across-driver-review/meal-counterpart.json',JSON.stringify({setup,description:'Same real host after receiver report at minute 2; hold its meal for both paid minutes, then resume unchanged cart decision.',afterMeal,decision,world},null,2)+'\n');
 return {service:world.service.units,deliveryAt:world.service.deliveries[0].at,paidMeal:rv.paid.meal,paidCart:rv.paid.cart,returnedToDock:rv.position===6};
});
run('nearby lawful hunger controls complete cart without interruption',()=>{
 const evidence=[];for(const hunger of [.970,.976]){const g=finish(p.createGame({...setup,bodies:{receiver:{fatigue:.15,hunger}}}));const w=p.getDebrief(g);assert.equal(w.service.units,1);evidence.push({hunger,service:w.service.units,mealPaid:w.actors.receiver.paid.meal,cartPaid:w.actors.receiver.paid.cart});}return evidence;
});
run('actual report pauses paid walking; reads and restore preserve it; stop preserves position',()=>{
 let g=req(p.createGame(),{task:'travel',to:'dock'});g=p.advanceToNextEvent(g); // path transition at 1
 g=p.advanceToNextEvent(g);let v=view(g);assert.equal(v.now,4);assert.equal(v.pauseReason,'report');assert.equal(v.position,4);assert.equal(v.job.task,'travel');assert.equal(v.job.elapsed,4);
 const saved=p.exportGame(g);for(let n=0;n<5;n++){const detached=view(g);detached.position=999;detached.inbox.length=0;assert.deepEqual(p.exportGame(g),saved);}assert.deepEqual(p.restoreGame(saved),g);
 const continuing=p.advanceToNextEvent(g);assert.equal(view(continuing).now,6);assert.equal(view(continuing).position,6);assert.equal(view(continuing).job,null);
 const stopped=p.applyCommand(g,{type:'stop'});assert.equal(view(stopped).now,4);assert.equal(view(stopped).position,4);assert.equal(view(stopped).paid.travel,4);assert.equal(view(stopped).job,null);
 return {receiptAt:v.now,elapsed:v.job.elapsed,continuedArrivalAt:view(continuing).now,stoppedPosition:view(stopped).position};
});
run('same-minute keeper controls do not change receiver decision or consume time',()=>{
 const base=p.createGame();let altered=req(base,{task:'inspect'});altered=p.applyCommand(altered,{type:'stop'});altered=req(altered,{task:'travel',to:'dock'});
 assert.equal(view(altered).now,0);assert.deepEqual(altered.frame.receiver,h.getActorView(base.host,'receiver'));
 assert.deepEqual(p.restoreGame(p.exportGame(altered)),altered);
 const a=p.advanceGame(base,1),b=p.advanceGame(altered,1);assert.deepEqual(h.getActorView(a.host,'receiver'),h.getActorView(b.host,'receiver'));assert.deepEqual(a.receiver,b.receiver);
 return {receiverPaidInspect:h.getActorView(a.host,'receiver').paid.inspect,keeperA:view(a).position,keeperB:view(b).position};
});
run('hidden launch/inlet twins preserve complete public view and Continue pauses under lost initial reports',()=>{
 const configs=[{inletMinutes:14,launchAt:15},{inletMinutes:2,launchAt:27}];let games=configs.map(c=>p.createGame({...c,channelMode:'lossy',channelOverrides:{'receiver:2':'loss'}}));
 assert.deepEqual(view(games[0]),view(games[1]));games=games.map(g=>req(g,{task:'inspect'}));games=games.map(g=>p.advanceToNextEvent(g));assert.deepEqual(view(games[0]),view(games[1]));assert.equal(view(games[0]).now,1);
 games=games.map(g=>p.advanceToNextEvent(g));assert.deepEqual(view(games[0]),view(games[1]));assert.equal(view(games[0]).now,30);return {publicStops:[1,30],privateService:games.map(g=>p.getDebrief(g).service.units)};
});
function sendProgressAt(t){let g=req(p.createGame({launchAt:15,inletMinutes:2}),{task:'inspect'});g=until(g,1);g=until(g,t-1);g=req(g,{task:'repair',minutes:1});g=until(g,t);const own=view(g).reportableObservations;const ids=['repairMinutes:valve','repairProgress:valve'].map(c=>own.filter(o=>o.cue===c).at(-1).receipt);g=req(g,{task:'transmit',message:{kind:'report',observationIds:ids}});return until(g,t+4);}
run('source-time strict bound respects equality and switches only when later',()=>{
 const equal=sendProgressAt(5),late=sendProgressAt(6);const a=h.getActorView(equal.host,'receiver'),b=h.getActorView(late.host,'receiver');
 assert.equal(a.paid.cart,0);assert.equal(a.job,null);assert.equal(b.job.task,'cart');assert.equal(b.job.elapsed,1);
 const evidence=[a,b].map(v=>({now:v.now,progressFact:v.notebook.filter(o=>o.cue==='repairProgress:valve').at(-1),paidCart:v.paid.cart,job:v.job}));return evidence;
});
run('completed snapshot does not fabricate a late upstream lower bound',()=>{
 let g=req(p.createGame({launchAt:15}),{task:'inspect'});g=until(g,1);g=req(g,{task:'repair'});g=until(g,7);const own=view(g).reportableObservations;const ids=['repairMinutes:valve','repairProgress:valve'].map(c=>own.filter(o=>o.cue===c).at(-1).receipt);g=req(g,{task:'transmit',message:{kind:'report',observationIds:ids}});g=until(g,11);const v=h.getActorView(g.host,'receiver');assert.equal(v.paid.cart,0);assert.equal(v.paid.attend,7);return {receivedAt:v.inbox[0].receivedAt,sourceProgress:v.inbox[0].message.observations.find(o=>o.cue==='repairProgress:valve'),paidAttend:v.paid.attend};
});
run('available public choices are admitted by the host at selected capacity-bin boundaries',()=>{
 const evidence=[];for(const body of [{fatigue:.9749,hunger:.15},{fatigue:.9751,hunger:.15},{fatigue:.15,hunger:.9749},{fatigue:.15,hunger:.9751}]){
  let g=p.createGame({bodies:{keeper:body}});for(let phase=0;phase<2;phase++){
   const available=view(g).choices.filter(c=>c.unavailable===null);for(const c of available)assert.doesNotThrow(()=>req(g,c.action));evidence.push({body,minute:view(g).now,available:available.map(c=>c.id)});
   g=p.advanceGame(g,1);
  }
 }return evidence;
});
run('save validation rejects injected state, accessors, sparse arrays and expansion without modifying valid history',()=>{
 const g=req(p.createGame(),{task:'inspect'}),saved=p.exportGame(g);let calls=0;
 const accessor=p.exportGame(g);Object.defineProperty(accessor,'commands',{enumerable:true,get(){calls++;return [];}});assert.throws(()=>p.restoreGame(accessor),{code:'INVALID_SAVE'});assert.equal(calls,0);
 const sparse=p.exportGame(g);sparse.commands=new Array(2);assert.throws(()=>p.restoreGame(sparse),{code:'INVALID_SAVE'});
 const injected=p.exportGame(g);injected.receiver={version:'0.1.0',mode:'done'};assert.throws(()=>p.restoreGame(injected),{code:'INVALID_SAVE'});
 let expanded=['x'];for(let n=0;n<19;n++)expanded=[expanded,expanded];const expansion=p.exportGame(g);expansion.extra=expanded;assert.throws(()=>p.restoreGame(expansion),{code:'INVALID_SAVE'});
 assert.throws(()=>p.getGameView(structuredClone(g)),{code:'INVALID_GAME'});assert.equal(Object.isFrozen(g.host.actors.receiver.inventory.meal),true);assert.deepEqual(p.exportGame(g),saved);assert.deepEqual(p.restoreGame(saved),g);
 return {accessorCalls:calls,rejected:['accessor','sparse','injectedReceiver','sharedExpansion','copiedHandle']};
});
run('128 controls plus 30 paid advances fit exact recipe budget and restore',()=>{
 let g=p.createGame();for(let n=0;n<64;n++){g=req(g,{task:'inspect'});assert.equal(view(g).canStop,true);g=p.applyCommand(g,{type:'stop'});}assert.equal(view(g).budget.used,128);assert.equal(view(g).choices.every(c=>c.unavailable!==null),true);
 for(let t=0;t<30;t++)g=p.advanceGame(g,1);const saved=p.exportGame(g);assert.equal(saved.commands.length,158);assert.deepEqual(p.restoreGame(saved),g);assert.equal(p.advanceGame(g,1),g);assert.equal(p.advanceToNextEvent(g),g);return {controls:128,advances:30,commands:saved.commands.length,horizon:view(g).now};
});
fs.writeFileSync('/tmp/across-driver-review/results.json',JSON.stringify({node:process.version,targetCommit:'4f46243681ea6e0edf5173ca16e5e5548b88632e',results},null,2)+'\n');
for(const r of results)console.log(`${r.status}: ${r.name}`);
if(results.some(r=>r.status==='fail'))process.exitCode=1;
