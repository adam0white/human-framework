import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';

const playerURL=new URL('../src/games/across-cut-player.js',import.meta.url);
const receiverURL=new URL('../src/games/across-cut-receiver.js',import.meta.url);
const hostURL=new URL('../src/games/across-cut.js',import.meta.url);
const modules=async()=>({p:await import(playerURL),h:await import(hostURL),r:await import(receiverURL)});
const setup={valveMinutes:6,inletMinutes:14,launchAt:15,channelMode:'bounded',channelOverrides:{'receiver:2':6}};
const request=(p,g,action)=>p.applyCommand(g,{type:'request',action});
function through(p,g,to){while(p.getGameView(g).now<to)g=p.advanceGame(g,to-p.getGameView(g).now);return g;}
function releaseAtSeven(p){let g=p.createGame(setup);g=request(p,g,{task:'inspect'});g=through(p,g,1);g=request(p,g,{task:'repair'});g=through(p,g,7);return request(p,g,{task:'release'});}

test('the receiver and player driver are available',()=>{
 assert.ok(existsSync(playerURL),'Player driver is absent');
 assert.ok(existsSync(receiverURL),'Receiver policy is absent');
});

test('minute-eight report pauses one paid release minute and explicit stop returns both units',async()=>{
 const {p,h}=await modules();let g=releaseAtSeven(p);g=p.advanceToNextEvent(g);const v=p.getGameView(g);
 assert.equal(v.now,8);assert.equal(v.pauseReason,'report');assert.equal(v.job.task,'release');assert.equal(v.job.elapsed,1);
 assert.equal(v.paid.release,1);assert.equal(v.inventory.water.reserved,2);assert.equal(v.inventory.water.consumed,0);
 assert.equal(v.inbox[0].sentAt,2);assert.equal(v.inbox[0].receivedAt,8);
 const report=v.inbox[0].message.observations.find(x=>x.cue==='repairMinutes:dock');assert.equal(report.value,14);assert.equal(report.observedAt,1);
 const saved=JSON.parse(JSON.stringify(p.exportGame(g)));const resumed=p.restoreGame(saved);assert.deepEqual(resumed,g);
 g=p.applyCommand(resumed,{type:'stop'});assert.equal(p.getGameView(g).inventory.water.available,2);assert.equal(p.getGameView(g).paid.release,1);
 g=through(p,g,30);assert.equal(h.getWorldSummary(g.host).water.pipeConsumed,0);assert.equal(h.getWorldSummary(g.host).water.lost,0);
});

test('continuing the same receipt preserves the pending release and loses its two consumed units',async()=>{
 const {p,h}=await modules();let g=p.advanceToNextEvent(releaseAtSeven(p));g=p.restoreGame(p.exportGame(g));g=p.advanceToNextEvent(g);
 assert.equal(p.getGameView(g).now,9);assert.equal(p.getGameView(g).pauseReason,'own-completion');assert.equal(p.getGameView(g).inventory.water.consumed,2);
 g=through(p,g,30);const world=h.getWorldSummary(g.host);assert.equal(world.water.lost,2);assert.equal(world.service.units,1);
});

test('rendering, saving and keeper admission do not start or pay the receiver before advancement',async()=>{
 const {p,h}=await modules();let g=p.createGame();for(let i=0;i<4;i++){p.getGameView(g);p.exportGame(g);}
 g=request(p,g,{task:'inspect'});assert.equal(h.getActorView(g.host,'receiver').job,null);assert.equal(h.getActorView(g.host,'receiver').body.minutes,0);
 g=p.advanceGame(g,1);assert.equal(h.getActorView(g.host,'receiver').paid.inspect,1);assert.equal(p.getGameView(g).now,1);
});

test('own per-minute repair observations do not manufacture a Continue stop each minute',async()=>{
 const {p}=await modules();let g=p.createGame({...setup,inletMinutes:2});g=request(p,g,{task:'inspect'});g=through(p,g,1);g=request(p,g,{task:'repair'});
 g=p.advanceToNextEvent(g);assert.equal(p.getGameView(g).now,7);assert.equal(p.getGameView(g).local.repairProgress,6);assert.equal(p.getGameView(g).pauseReason,'own-completion');
});

test('hidden work and launch twins have equal views, choices and stopping behavior until receipt',async()=>{
 const {p}=await modules();let a=p.createGame({...setup,inletMinutes:2,launchAt:27}),b=p.createGame(setup);
 assert.deepEqual(p.getGameView(a),p.getGameView(b));
 for(const action of [{task:'inspect'},{task:'repair'},{task:'release'}]){
  a=request(p,a,action);b=request(p,b,action);assert.deepEqual(p.getGameView(a),p.getGameView(b));
  a=p.advanceToNextEvent(a);b=p.advanceToNextEvent(b);
  if(p.getGameView(a).now<8)assert.deepEqual(p.getGameView(a),p.getGameView(b));
 }
 assert.equal(p.getGameView(a).now,8);assert.equal(p.getGameView(b).now,8);assert.equal(p.getGameView(a).pauseReason,'report');
 assert.notDeepEqual(p.getGameView(a).inbox,p.getGameView(b).inbox);
});

test('a missing report and private departure do not end or stop the keeper early',async()=>{
 const {p}=await modules();const opts={channelMode:'lossy',channelOverrides:{'receiver:2':'loss'}};
 let a=p.createGame({...opts,launchAt:15}),b=p.createGame({...opts,launchAt:27});
 a=p.advanceToNextEvent(a);b=p.advanceToNextEvent(b);assert.deepEqual(p.getGameView(a),p.getGameView(b));assert.equal(p.getGameView(a).now,30);assert.equal(p.getGameView(a).pauseReason,'horizon');
});

test('the receiver pays full adaptive attendance despite absent keeper reports',async()=>{
 const {p,h}=await modules();let g=p.createGame();g=through(p,g,12);g=request(p,g,{task:'inspect'});g=through(p,g,13);g=request(p,g,{task:'repair'});g=through(p,g,19);g=request(p,g,{task:'release'});g=through(p,g,24);
 const world=h.getWorldSummary(g.host),v=h.getActorView(g.host,'receiver');assert.equal(world.service.units,2);assert.equal(v.paid.attend,20);assert.equal(v.inbox.length,0);assert.equal(v.paid.cart,0);
 g=through(p,g,25);assert.equal(h.getActorView(g.host,'receiver').paid.attend,20);
});

test('save recipes reject injected NPC state, malformed controls and unsupported identities',async()=>{
 const {p}=await modules();const g=p.advanceToNextEvent(releaseAtSeven(p));const save=p.exportGame(g);
 for(const change of [x=>x.receiver={mode:'done'},x=>x.playerVersion='0.0.0',x=>x.commands.push({type:'request',actorId:'receiver',action:{task:'cart'}}),x=>x.commands.push({type:'advance',minutes:0}),x=>x.commands.push({type:'stop',secret:true})]){
  const bad=structuredClone(save);change(bad);assert.throws(()=>p.restoreGame(bad),{code:'INVALID_SAVE'});
 }
 assert.deepEqual(p.getGameView(p.restoreGame(save)),p.getGameView(g));
});

test('researcher outcome stays unavailable until the public horizon',async()=>{
 const {p}=await modules();let g=p.createGame();assert.throws(()=>p.getDebrief(g),{code:'NOT_ENDED'});g=through(p,g,30);
 assert.equal(p.getDebrief(g).researcherOnly,true);assert.equal(p.getGameView(g).canAdvance,false);const before=p.exportGame(g);g=p.advanceToNextEvent(g);assert.deepEqual(p.exportGame(g),before);
});

test('actually received incomplete upstream work can establish a too-late earliest arrival',async()=>{
 const {p,h}=await modules();let g=p.createGame({valveMinutes:12,inletMinutes:2,launchAt:15});
 g=request(p,g,{task:'inspect'});g=through(p,g,1);
 const observationIds=p.getGameView(g).reportableObservations.filter(o=>['repairMinutes:valve','repairProgress:valve'].includes(o.cue)).map(o=>o.receipt);
 g=request(p,g,{task:'transmit',message:{kind:'report',observationIds}});g=through(p,g,5);
 const receiver=h.getActorView(g.host,'receiver');assert.equal(receiver.inbox.length,1);assert.equal(receiver.job.task,'cart');assert.equal(receiver.paid.cart,1);
 assert.equal(receiver.paid.attend,0);g=through(p,g,9);assert.equal(h.getWorldSummary(g.host).service.units,1);
});

test('the source-time bound allows arrival exactly at launch and never assumes delay means failure',async()=>{
 const {p,h}=await modules();let g=p.createGame({valveMinutes:6,inletMinutes:2,launchAt:15});
 g=request(p,g,{task:'inspect'});g=through(p,g,1);
 const observationIds=p.getGameView(g).reportableObservations.filter(o=>['repairMinutes:valve','repairProgress:valve'].includes(o.cue)).map(o=>o.receipt);
 g=request(p,g,{task:'transmit',message:{kind:'report',observationIds}});g=through(p,g,5);
 assert.equal(h.getActorView(g.host,'receiver').job,null);assert.equal(h.getActorView(g.host,'receiver').paid.attend,1);assert.equal(h.getActorView(g.host,'receiver').paid.cart,0);
 g=through(p,g,15);assert.equal(h.getActorView(g.host,'receiver').paid.attend,11);assert.equal(h.getActorView(g.host,'receiver').paid.cart,0);
});

test('interrupting walking retains physical position across repeated reads and save resume',async()=>{
 const {p}=await modules();let g=p.createGame(setup);g=request(p,g,{task:'travel',to:'dock'});g=through(p,g,3);
 assert.equal(p.getGameView(g).position,3);g=p.applyCommand(g,{type:'stop'});g=p.restoreGame(p.exportGame(g));
 for(let i=0;i<5;i++)assert.equal(p.getGameView(g).position,3);
 g=request(p,g,{task:'travel',to:'valve'});g=through(p,g,6);assert.equal(p.getGameView(g).position,0);assert.equal(p.getGameView(g).paid.travel,6);
});

test('horizon interrupts remaining paid work and returns unconsumed reservations',async()=>{
 const {p}=await modules();let g=p.createGame();g=through(p,g,29);g=request(p,g,{task:'meal'});g=p.advanceToNextEvent(g);
 const v=p.getGameView(g);assert.equal(v.now,30);assert.equal(v.job,null);assert.equal(v.paid.meal,1);assert.equal(v.inventory.meal.available,1);assert.equal(v.inventory.meal.consumed,0);
});

test('local Stop stays legal after ordinary keeper decision room is exhausted',async()=>{
 const {p}=await modules();let g=p.createGame();
 for(let i=0;i<63;i++){g=request(p,g,{task:'inspect'});g=p.applyCommand(g,{type:'stop'});}
 g=request(p,g,{task:'inspect'});assert.equal(p.getGameView(g).budget.used,127);assert.equal(p.getGameView(g).canStop,true);
 g=p.applyCommand(g,{type:'stop'});assert.equal(p.getGameView(g).budget.used,128);assert.equal(p.getGameView(g).choices.every(c=>c.unavailable),true);
 assert.throws(()=>request(p,g,{task:'inspect'}),{code:'COMMAND_LIMIT'});
 g=through(p,g,30);assert.equal(p.getGameView(g).now,30);assert.deepEqual(p.restoreGame(p.exportGame(g)),g);
});

test('save validation rejects accessors and sparse or amplified JSON without invoking getters',async()=>{
 const {p}=await modules();const save=p.exportGame(p.createGame());let called=false;
 Object.defineProperty(save,'commands',{enumerable:true,get(){called=true;return [];}});
 assert.throws(()=>p.restoreGame(save),{code:'INVALID_SAVE'});assert.equal(called,false);
 const sparse=p.exportGame(p.createGame());sparse.commands=new Array(3);assert.throws(()=>p.restoreGame(sparse),{code:'INVALID_SAVE'});
});

test('Continue pauses when available recovery restores a blocked own work choice',async()=>{
 const {p}=await modules();let g=p.createGame({channelMode:'bounded',channelOverrides:{'receiver:2':6},bodies:{keeper:{fatigue:.92,hunger:.15}}});
 g=request(p,g,{task:'inspect'});g=through(p,g,1);const before=p.getGameView(g).choices.find(c=>c.id==='repair-full');assert.ok(before.unavailable);
 g=p.advanceToNextEvent(g);const after=p.getGameView(g);assert.equal(after.pauseReason,'capacity-available');assert.equal(after.choices.find(c=>c.id==='repair-full').unavailable,null);assert.ok(after.now<30);
});

test('public game handles cannot be mutated or forged and their recipes reproduce the current view',async()=>{
 const {p}=await modules();let g=p.advanceToNextEvent(releaseAtSeven(p));
 for(const change of [()=>{g.receiver.mode='done';},()=>{g.ui.pauseReason='horizon';},()=>{g.commands.push({type:'stop'});},()=>{g.setup.launchAt=27;}])assert.throws(change,TypeError);
 for(const use of [()=>p.getGameView({...g,receiver:{version:'0.1.0',mode:'done'}}),()=>p.advanceGame({...g},1),()=>p.exportGame({...g}),()=>p.applyCommand({...g},{type:'stop'})])assert.throws(use,{code:'INVALID_GAME'});
 const before=p.getGameView(g),copy=p.getGameView(g);copy.inventory.water.available=100;assert.deepEqual(p.getGameView(g),before);
 assert.deepEqual(p.getGameView(p.restoreGame(p.exportGame(g))),before);
});

test('enabled work choices remain admissible at body estimate rounding boundaries',async()=>{
 const {p}=await modules();
 for(const fatigue of [0,.872,.918,.919,.92,.944,.974]){
  let g=p.createGame({bodies:{keeper:{fatigue,hunger:.15}}});g=request(p,g,{task:'inspect'});g=through(p,g,1);
  for(const choice of p.getGameView(g).choices.filter(c=>!c.unavailable))assert.doesNotThrow(()=>request(p,g,choice.action),`${fatigue}: ${choice.id}`);
 }
});

test('receiver decisions are detached, repeatable and equal across hidden upstream worlds',async()=>{
 const {h,r}=await modules();const a=h.getActorView(h.create({valveMinutes:6}),'receiver'),b=h.getActorView(h.create({valveMinutes:12}),'receiver');
 assert.deepEqual(a,b);const state=r.createReceiverState(),saved=structuredClone({state,a});
 assert.deepEqual(r.decideReceiver(state,a),r.decideReceiver(state,b));assert.deepEqual({state,a},saved);
 const decision=r.decideReceiver(state,a);decision.state.mode='done';assert.equal(state.mode,'pipe');assert.deepEqual(r.decideReceiver(state,a).commands,[{type:'request',action:{task:'inspect'}}]);
});

test('a hungry receiver finishes its owned meal before retrying the cart',async()=>{
 const {p,h}=await modules();let g=p.createGame({inletMinutes:14,launchAt:15,bodies:{receiver:{fatigue:.15,hunger:.972}}});
 g=through(p,g,3);assert.equal(h.getActorView(g.host,'receiver').job.task,'meal');
 g=p.restoreGame(p.exportGame(g));g=through(p,g,4);
 let receiver=h.getActorView(g.host,'receiver');assert.equal(receiver.inventory.meal.consumed,1);assert.equal(receiver.paid.meal,2);
 g=through(p,g,30);const world=p.getDebrief(g);assert.equal(world.service.units,1);assert.equal(world.service.deliveries[0].at,9);
 assert.equal(world.actors.receiver.paid.meal,2);assert.equal(world.actors.receiver.inventory.meal.available,0);
});
