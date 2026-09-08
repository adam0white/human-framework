import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as player from '../src/games/across-cut-player.js';
import * as host from '../src/games/across-cut.js';
import * as presentation from '../web/across-view.js';

const bodyOptions=fatigue=>({bodies:{keeper:{fatigue,hunger:.15}}});
const request=(game,action)=>player.applyCommand(game,{type:'request',action});
const choice=(game,id)=>player.getGameView(game).choices.find(item=>item.id===id);
const workEstimate='Your body estimate does not yet support this entire interval.';
const reportEstimate='Your condition estimates cannot support sending yet. Recover or eat before retrying.';
const hash=value=>createHash('sha256').update(value).digest('hex');
const objectHash=value=>hash(JSON.stringify(value));

test('an estimate-only work block is uncertain for both legal and impossible own-body twins',()=>{
 const legal=player.createGame(bodyOptions(.9751)),impossible=player.createGame(bodyOptions(.9956));
 assert.deepEqual(player.getGameView(legal),player.getGameView(impossible));
 for(const game of [legal,impossible]){
  const inspect=choice(game,'inspect');
  assert.equal(inspect.unavailable,workEstimate);
  assert.equal(inspect.capacityUncertain,true);
 }
 const completed=player.advanceGame(request(legal,{task:'inspect'}),1);
 assert.equal(player.getGameView(completed).paid.inspect,1);
 assert.equal(host.getWorldSummary(completed.host).actors.keeper.body.fatigue,.9795999999999999);
 const before=player.exportGame(impossible),physical=host.exportState(impossible.host);
 assert.throws(()=>request(impossible,choice(impossible,'inspect').action),{code:'CAPACITY'});
 assert.deepEqual(player.exportGame(impossible),before);
 assert.deepEqual(host.exportState(impossible.host),physical);
});

test('whole repair can be uncertain while one paid minute has conservative capacity',()=>{
 let game=player.createGame(bodyOptions(.92));
 game=player.advanceGame(request(game,{task:'inspect'}),1);
 assert.equal(choice(game,'repair-full').capacityUncertain,true);
 assert.equal(choice(game,'repair-full').unavailable,workEstimate);
 assert.equal(choice(game,'repair-one').capacityUncertain,false);
 assert.equal(choice(game,'repair-one').unavailable,null);
 assert.equal(choice(game,'repair-full').duration,6);
 assert.deepEqual(choice(game,'repair-one').action,{task:'repair',minutes:1});
});

test('repair remains blocked when even the lower estimate edge cannot finish it',()=>{
 let game=player.createGame(bodyOptions(.95));
 game=player.advanceGame(request(game,{task:'inspect'}),1);
 assert.equal(player.getGameView(game).body.body.fatigue,.95);
 // The displayed bin starts at .925; six paid repair minutes cost .081.
 assert.equal(choice(game,'repair-full').unavailable,workEstimate);
 assert.equal(choice(game,'repair-full').capacityUncertain,false);
 assert.equal(choice(game,'repair-one').unavailable,null);
 assert.equal(choice(game,'repair-one').capacityUncertain,false);
 const before=host.exportState(game.host);
 assert.throws(()=>request(game,choice(game,'repair-full').action),{code:'CAPACITY'});
 assert.deepEqual(host.exportState(game.host),before);
 const completed=player.advanceGame(request(game,choice(game,'repair-one').action),1);
 assert.equal(player.getGameView(completed).paid.repair,1);
});

test('a definitely impossible six-minute walk stays blocked while a one-minute walk can be uncertain',()=>{
 const long=player.createGame(bodyOptions(.9751));
 assert.equal(choice(long,'travel-dock').duration,6);
 assert.equal(choice(long,'travel-dock').unavailable,workEstimate);
 assert.equal(choice(long,'travel-dock').capacityUncertain,false);
 let short=request(player.createGame(bodyOptions(.93)),{task:'travel',to:'dock'});
 while(player.getGameView(short).now<5)short=player.advanceGame(short,5-player.getGameView(short).now);
 short=player.applyCommand(short,{type:'stop'});
 assert.equal(player.getGameView(short).body.body.fatigue,1);
 assert.equal(choice(short,'travel-dock').duration,1);
 assert.equal(choice(short,'travel-dock').unavailable,workEstimate);
 assert.equal(choice(short,'travel-dock').capacityUncertain,true);
 const arrived=player.advanceGame(request(short,choice(short,'travel-dock').action),1);
 assert.equal(player.getGameView(arrived).location,'dock');
 assert.equal(player.getGameView(arrived).paid.travel,6);
});

test('hunger estimates preserve uncertainty on both sides of one-minute work and report admission',()=>{
 const legal=player.createGame({bodies:{keeper:{fatigue:.15,hunger:.9751}}});
 const impossible=player.createGame({bodies:{keeper:{fatigue:.15,hunger:.9981}}});
 assert.deepEqual(player.getGameView(legal),player.getGameView(impossible));
 for(const game of [legal,impossible]){
  assert.equal(player.getGameView(game).body.body.hunger,1);
  assert.equal(choice(game,'inspect').unavailable,workEstimate);
  assert.equal(choice(game,'inspect').capacityUncertain,true);
  assert.deepEqual(presentation.reportOffer(player.getGameView(game),1,'radio'),{unavailable:reportEstimate,capacityUncertain:true});
 }
 const report={task:'transmit',via:'radio',message:{kind:'report',observationIds:[1]}};
 for(const action of [{task:'inspect'},report]){
  assert.equal(player.getGameView(request(legal,action)).job.task,action.task);
  const before=host.exportState(impossible.host);
  assert.throws(()=>request(impossible,action),{code:'CAPACITY'});
  assert.deepEqual(host.exportState(impossible.host),before);
 }
});

test('unmet local work prerequisites and a busy actor never become uncertain tries',()=>{
 const game=player.createGame(bodyOptions(.9751));
 for(const [id,reason]of [['repair-full','Inspect your valve first.'],['repair-one','Inspect your valve first.'],['release','Complete your known valve repair first.'],['travel-valve','You are already there.']]){
  assert.equal(choice(game,id).unavailable,reason);
  assert.equal(choice(game,id).capacityUncertain,false);
 }
 const busy=request(game,{task:'inspect'});
 for(const item of player.getGameView(busy).choices){
  assert.equal(item.unavailable,'Finish or stop your current work first.');
  assert.equal(item.capacityUncertain,false);
 }
 let walking=request(player.createGame(bodyOptions(.93)),{task:'travel',to:'dock'});
 while(player.getGameView(walking).now<4)walking=player.advanceGame(walking,4-player.getGameView(walking).now);
 walking=player.applyCommand(walking,{type:'stop'});
 assert.equal(player.getGameView(walking).body.body.fatigue,1);
 assert.equal(choice(walking,'inspect').unavailable,'Reach a station first.');
 assert.equal(choice(walking,'inspect').capacityUncertain,false);
 assert.equal(choice(walking,'repair-one').capacityUncertain,false);
});

test('consumed owned supplies stay blocked even when other work has uncertain capacity',()=>{
 let meal=player.createGame(bodyOptions(1));
 meal=player.advanceGame(request(meal,{task:'meal'}),2);
 assert.equal(choice(meal,'inspect').capacityUncertain,true);
 assert.equal(choice(meal,'meal').unavailable,'Your meal is unavailable.');
 assert.equal(choice(meal,'meal').capacityUncertain,false);
 let water=player.createGame(bodyOptions(.866));
 water=player.advanceGame(request(water,{task:'inspect'}),1);
 water=request(water,{task:'repair'});
 while(player.getGameView(water).job)water=player.advanceGame(water,6);
 water=player.advanceGame(request(water,{task:'release'}),2);
 assert.equal(choice(water,'inspect').capacityUncertain,true);
 assert.equal(choice(water,'release').unavailable,'Two owned water units are unavailable.');
 assert.equal(choice(water,'release').capacityUncertain,false);
});

test('decision reserves and the ended episode suppress all work uncertainty',()=>{
 let game=player.createGame(bodyOptions(.9751));
 for(let i=0;i<64;i++)game=player.applyCommand(request(game,{task:'inspect'}),{type:'stop'});
 for(const item of player.getGameView(game).choices){
  assert.equal(item.unavailable,'Your remaining decisions are reserved for stopping work.');
  assert.equal(item.capacityUncertain,false);
 }
 while(!player.getGameView(game).ended)game=player.advanceToNextEvent(game);
 for(const item of player.getGameView(game).choices){
  assert.equal(item.unavailable,'This shift has ended.');
  assert.equal(item.capacityUncertain,false);
 }
});

test('report offers classify estimate uncertainty without promising actual admission',()=>{
 assert.equal(typeof presentation.reportOffer,'function');
 const legal=player.createGame(bodyOptions(.9751)),impossible=player.createGame(bodyOptions(.9956));
 for(const game of [legal,impossible]){
  const view=player.getGameView(game),before=structuredClone(view);
  assert.deepEqual(presentation.reportOffer(view,1,'radio'),{unavailable:reportEstimate,capacityUncertain:true});
  assert.equal(presentation.reportUnavailable(view,1,'radio'),reportEstimate);
  assert.deepEqual(view,before);
 }
 const action={task:'transmit',via:'radio',message:{kind:'report',observationIds:[1]}};
 const started=request(legal,action);
 assert.equal(player.getGameView(started).inventory.radio.reserved,1);
 const before=host.exportState(impossible.host);
 assert.throws(()=>request(impossible,action),{code:'CAPACITY'});
 assert.deepEqual(host.exportState(impossible.host),before);
 assert.deepEqual(player.exportGame(impossible).commands,[]);
});

test('report structural prerequisites take priority over capacity uncertainty',()=>{
 assert.equal(typeof presentation.reportOffer,'function');
 const original=player.getGameView(player.createGame(bodyOptions(1)));
 const cases=[
  [v=>{v.ended=true;},1,'radio','This shift has ended.'],
  [v=>{v.job={task:'inspect'};},1,'radio','Finish or explicitly stop your current task before sending.'],
  [()=>{},0,'radio','Select a first-hand observation to share.'],
  [()=>{},33,'radio','Select at most 32 first-hand observations.'],
  [v=>{v.budget.used=127;},1,'radio','Your remaining decisions are reserved for stopping work.'],
  [v=>{v.inventory.radio.available=0;},1,'radio','No radio charge remains.'],
  [()=>{},1,'contact','Deniz must be present at your station.'],
  [v=>{v.location='path';v.local.peerPresent=true;},1,'contact','Deniz must be present at your station.']
 ];
 for(const [change,count,via,unavailable]of cases){
  const view=structuredClone(original);change(view);const before=structuredClone(view);
  assert.deepEqual(presentation.reportOffer(view,count,via),{unavailable,capacityUncertain:false});
  assert.equal(presentation.reportUnavailable(view,count,via),unavailable);
  assert.deepEqual(view,before);
 }
 const present=structuredClone(original);present.local.peerPresent=true;
 assert.deepEqual(presentation.reportOffer(present,1,'contact'),{unavailable:reportEstimate,capacityUncertain:true});
 const healthy=player.getGameView(player.createGame());
 assert.deepEqual(presentation.reportOffer(healthy,1,'radio'),{unavailable:null,capacityUncertain:false});
});

test('detached offer reads cannot alter the recipe or expose hidden remote worlds',()=>{
 assert.equal(typeof presentation.reportOffer,'function');
 const a=player.createGame({...bodyOptions(.9751),inletMinutes:2,launchAt:27});
 const b=player.createGame({...bodyOptions(.9751),inletMinutes:14,launchAt:15});
 const before=player.exportGame(a),physical=host.exportState(a.host);
 for(let i=0;i<3;i++){
  const av=player.getGameView(a),bv=player.getGameView(b);
  assert.deepEqual(av,bv);
  assert.deepEqual(presentation.reportOffer(av,1,'radio'),presentation.reportOffer(bv,1,'radio'));
  av.choices[0].capacityUncertain=false;av.choices[0].action.task='meal';av.body.body.fatigue=0;
  assert.equal(choice(a,'inspect').capacityUncertain,true);
 }
 assert.deepEqual(player.exportGame(a),before);
 assert.deepEqual(host.exportState(a.host),physical);
});

test('the old known-inspection recipe reproduces its exact physical and receiver state',()=>{
 const recipe={format:'human-across-cut-player',saveVersion:1,playerVersion:'0.1.0',receiverVersion:'0.1.1',
  setup:{valveMinutes:6,inletMinutes:2,launchAt:27,channelMode:'reliable',channelSeed:0,channelOverrides:{},bodies:{keeper:{fatigue:.9751,hunger:.15},receiver:{fatigue:.15,hunger:.15}}},
  commands:[{type:'request',action:{task:'inspect'}},{type:'advance',minutes:1}]};
 const game=player.restoreGame(recipe);
 assert.deepEqual(player.exportGame(game),recipe);
 assert.equal(objectHash(host.exportState(game.host)),'2cbbd1618a3920a3774d9f410d8aa8af14d98a629c9aec28dea4ca0a9bc1aaa2');
 assert.equal(objectHash(game.receiver),'09cd6806b2ac7e75470195b2be09e990fbcd2361dce528c9e3555ef420202e73');
 assert.equal(player.getGameView(game).stopReason,'own-completion');
});

test('offer metadata retains the conservative capacity-available stop',()=>{
 let game=player.createGame({channelMode:'bounded',channelOverrides:{'receiver:2':6},...bodyOptions(.92)});
 game=player.advanceGame(request(game,{task:'inspect'}),1);
 assert.equal(choice(game,'repair-full').capacityUncertain,true);
 game=player.advanceToNextEvent(game);
 assert.equal(player.getGameView(game).stopReason,'capacity-available');
 assert.equal(choice(game,'repair-full').unavailable,null);
 assert.equal(choice(game,'repair-full').capacityUncertain,false);
});

test('the released Across admission, receiver and Human runtime sources remain byte-identical',()=>{
 const freeze=JSON.parse(readFileSync(new URL('../artifacts/across-player/reviewed-freeze.json',import.meta.url),'utf8'));
 for(const path of ['src/games/across-cut.js','src/games/across-cut-receiver.js','src/runtime/index.js','src/runtime/clock.js','src/human/v0.1.1.js','src/core/model.js']){
  assert.equal(hash(readFileSync(new URL(`../${path}`,import.meta.url))),freeze.files[path].sha256,path);
 }
});
