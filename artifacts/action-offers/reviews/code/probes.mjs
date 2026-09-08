import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root='/Users/abdul/code/human-framework';
const at=path=>pathToFileURL(root+'/'+path).href;
const candidate=await import(at('src/games/across-cut-player.js'));
const host=await import(at('src/games/across-cut.js'));
const viewAPI=await import(at('web/across-view.js'));
let oldSource=execFileSync('git',['show','bd944c8:src/games/across-cut-player.js'],{cwd:root,encoding:'utf8'});
oldSource=oldSource.replaceAll("'./across-cut.js'",JSON.stringify(at('src/games/across-cut.js'))).replaceAll("'../runtime/index.js'",JSON.stringify(at('src/runtime/index.js'))).replaceAll("'./across-cut-receiver.js'",JSON.stringify(at('src/games/across-cut-receiver.js')));
const baseline=await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64'));
const request=(api,game,action)=>api.applyCommand(game,{type:'request',action});
const stop=(api,game)=>api.applyCommand(game,{type:'stop'});
const option=(fatigue,hunger=.15)=>({bodies:{keeper:{fatigue,hunger}}});
const strip=view=>({...view,choices:view.choices.map(({capacityUncertain,...rest})=>rest)});
const pick=(api,game,id)=>api.getGameView(game).choices.find(choice=>choice.id===id);
const snapshot=(api,game)=>({host:host.exportState(game.host),recipe:api.exportGame(game),receiver:game.receiver,frame:game.frame,ui:game.ui});
const settle=(api,game)=>{let count=0;while(api.getGameView(game).job){assert.ok(count++<30);game=api.advanceGame(game,1);}return game;};
const prepareRepair=(api,initialFatigue)=>{let game=api.createGame(option(initialFatigue));game=settle(api,request(api,game,{task:'inspect'}));return settle(api,request(api,game,{task:'repair'}));};

test('all baseline source dependencies remain byte identical to bd944c8',()=>{
 for(const path of ['src/games/across-cut.js','src/games/across-cut-receiver.js','src/runtime/index.js','src/runtime/clock.js','src/human/v0.1.1.js','src/core/model.js'])assert.deepEqual(readFileSync(root+'/'+path),execFileSync('git',['show','bd944c8:'+path],{cwd:root}),path);
});

test('hunger-only admission twins share every visible offer; one refusal has no state effect',()=>{
 const legal=candidate.createGame(option(.1,.9975)),blocked=candidate.createGame(option(.1,.9985));
 assert.deepEqual(candidate.getGameView(legal),candidate.getGameView(blocked));
 for(const game of [legal,blocked]){
  assert.equal(pick(candidate,game,'inspect').capacityUncertain,true);
  assert.equal(pick(candidate,game,'meal').capacityUncertain,false);
  assert.equal(pick(candidate,game,'meal').unavailable,null);
 }
 const admitted=settle(candidate,request(candidate,legal,{task:'inspect'}));
 assert.equal(candidate.getGameView(admitted).paid.inspect,1);
 const before=snapshot(candidate,blocked);
 assert.throws(()=>request(candidate,blocked,{task:'inspect'}),{code:'CAPACITY'});
 assert.deepEqual(snapshot(candidate,blocked),before);
});

test('paid partial repair retains installed fitting and remaining interval without changing baseline state',()=>{
 let prior=baseline.createGame(option(.87)),next=candidate.createGame(option(.87));
 const step=(op)=>{prior=op(baseline,prior);next=op(candidate,next);assert.deepEqual(snapshot(candidate,next),snapshot(baseline,prior));assert.deepEqual(strip(candidate.getGameView(next)),baseline.getGameView(prior));};
 step((api,g)=>settle(api,request(api,g,{task:'inspect'})));
 for(let minute=0;minute<4;minute++)step((api,g)=>settle(api,request(api,g,{task:'repair',minutes:1})));
 let view=candidate.getGameView(next);
 assert.equal(view.local.repairProgress,4);
 assert.equal(view.inventory.fitting.available,0);
 assert.equal(view.inventory.fitting.installed,1);
 assert.equal(pick(candidate,next,'repair-full').duration,2);
 assert.equal(pick(candidate,next,'repair-full').capacityUncertain,true);
 assert.equal(pick(candidate,next,'repair-one').capacityUncertain,false);
 step((api,g)=>request(api,g,{task:'repair'}));
 step((api,g)=>api.advanceGame(g,1));
 step((api,g)=>stop(api,g));
 view=candidate.getGameView(next);
 assert.equal(view.local.repairProgress,5);
 assert.equal(view.paid.repair,5);
 assert.equal(pick(candidate,next,'repair-full').duration,1);
 step((api,g)=>settle(api,request(api,g,{task:'repair'})));
 assert.equal(pick(candidate,next,'repair-full').capacityUncertain,false);
 assert.equal(pick(candidate,next,'repair-full').unavailable,'Your valve repair is complete.');
});

test('release twins distinguish uncertain admission from owned water, with rollback before any payment',()=>{
 const legal=prepareRepair(candidate,.881),blocked=prepareRepair(candidate,.885);
 assert.deepEqual(candidate.getGameView(legal),candidate.getGameView(blocked));
 for(const game of [legal,blocked])assert.equal(pick(candidate,game,'release').capacityUncertain,true);
 const before=snapshot(candidate,blocked);
 assert.throws(()=>request(candidate,blocked,{task:'release'}),{code:'CAPACITY'});
 assert.deepEqual(snapshot(candidate,blocked),before);
 let running=request(candidate,legal,{task:'release'});
 assert.equal(candidate.getGameView(running).inventory.water.reserved,2);
 assert.equal(pick(candidate,running,'release').capacityUncertain,false);
 running=stop(candidate,running);
 assert.equal(candidate.getGameView(running).inventory.water.available,2);
 assert.equal(candidate.getGameView(running).paid.release,0);
 running=settle(candidate,request(candidate,running,{task:'release'}));
 assert.equal(pick(candidate,running,'release').capacityUncertain,false);
 assert.equal(pick(candidate,running,'release').unavailable,'Two owned water units are unavailable.');
});

test('a final admissible decision pair becomes structural after an admitted completion at decision 127',()=>{
 let game=candidate.createGame(option(.9752));
 for(let i=0;i<63;i++)game=stop(candidate,request(candidate,game,{task:'inspect'}));
 assert.equal(candidate.getGameView(game).budget.used,126);
 assert.equal(pick(candidate,game,'inspect').capacityUncertain,true);
 game=settle(candidate,request(candidate,game,{task:'inspect'}));
 assert.equal(candidate.getGameView(game).budget.used,127);
 for(const choice of candidate.getGameView(game).choices){assert.equal(choice.capacityUncertain,false);assert.equal(choice.unavailable,'Your remaining decisions are reserved for stopping work.');}
 assert.deepEqual(viewAPI.reportOffer(candidate.getGameView(game),1,'radio'),{unavailable:'Your remaining decisions are reserved for stopping work.',capacityUncertain:false});
});

test('actor-local report supply and contact guards suppress both fatigue and hunger uncertainty without mutations',()=>{
 const game=candidate.createGame(option(.999,.999));
 const original=candidate.getGameView(game),before=snapshot(candidate,game);
 for(const channel of ['radio','contact']){
  const view=structuredClone(original);
  if(channel==='radio')view.inventory.radio.available=0;
  const copy=structuredClone(view),result=viewAPI.reportOffer(view,1,channel);
  assert.equal(result.capacityUncertain,false);
  assert.equal(result.unavailable,channel==='radio'?'No radio charge remains.':'Deniz must be present at your station.');
  assert.deepEqual(view,copy);
 }
 for(let i=0;i<5;i++){candidate.getGameView(game);viewAPI.reportOffer(original,1,'radio');viewAPI.reportUnavailable(original,1,'contact');}
 assert.deepEqual(snapshot(candidate,game),before);
});
