import test from 'node:test';
import assert from 'node:assert/strict';
import * as player from '../src/games/across-cut-player.js';
import {newShift,parseSave,createSaveStore,createImportPreview,STORAGE_KEY,MAX_SAVE_BYTES} from '../web/across-session.js';
import {currentClaims,saveDescription,reportUnavailable} from '../web/across-view.js';
const file=game=>{const raw=JSON.stringify(player.exportGame(game));return {size:Buffer.byteLength(raw),text:async()=>raw};};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('fresh browser variations share identical player information before evidence arrives',()=>{
 const games=[0,1,2,3].map(value=>newShift(()=>value)),views=games.map(player.getGameView);
 assert.equal(new Set(games.map(g=>JSON.stringify(player.exportGame(g).setup))).size,4);
 for(const view of views){assert.deepEqual(view,views[0]);assert.deepEqual(currentClaims(view),currentClaims(views[0]));assert.equal(saveDescription(view),saveDescription(views[0]));}
 for(const value of [-1,NaN,1.2])assert.throws(()=>newShift(()=>value));
});
test('a downloaded mid-release recipe resumes the actual receipt and owned water',()=>{
 let game=player.createGame({inletMinutes:14,launchAt:15,channelMode:'bounded',channelOverrides:{'receiver:2':6}});
 game=player.applyCommand(game,{type:'request',action:{task:'inspect'}});game=player.advanceGame(game,1);
 game=player.applyCommand(game,{type:'request',action:{task:'repair'}});while(player.getGameView(game).now<7)game=player.advanceGame(game,7-player.getGameView(game).now);
 game=player.applyCommand(game,{type:'request',action:{task:'release'}});game=player.advanceToNextEvent(game);
 const loaded=parseSave(JSON.stringify(player.exportGame(game))),view=player.getGameView(loaded);
 assert.equal(view.now,8);assert.equal(view.stopReason,'report');assert.equal(view.job.elapsed,1);assert.equal(view.inventory.water.reserved,2);
 assert.deepEqual(view,player.getGameView(game));assert.throws(()=>parseSave('{"format":"human-camp-current"}'),/not an Across/);assert.throws(()=>parseSave(' '.repeat(MAX_SAVE_BYTES+1)),/two megabytes/);
});
test('current storage reads one key and never overwrites a corrupt or read-denied save',()=>{
 for(const denied of [false,true]){const calls=[];let raw='{broken';const store=createSaveStore({getItem(key){calls.push(['get',key]);if(denied)throw Error('denied');return raw;},setItem(key,value){calls.push(['set',key]);raw=value;}});
  const loaded=store.load();assert.equal(loaded.game,null);assert(loaded.error);assert.equal(loaded.backup,denied?null:'{broken');assert.equal(store.save(newShift(()=>0)).ok,false);assert.equal(raw,'{broken');assert.deepEqual(calls,[['get',STORAGE_KEY]]);}
});
test('quota failures retain the current game for download and later persistence can recover',()=>{
 let full=true,stored=null;const store=createSaveStore({getItem(){return null;},setItem(key,value){assert.equal(key,STORAGE_KEY);if(full)throw Error('quota');stored=value;}});assert.equal(store.load().game,null);
 const game=player.advanceGame(newShift(()=>1),1),before=player.getGameView(game);assert.equal(store.save(game).ok,false);assert.deepEqual(player.getGameView(parseSave(JSON.stringify(player.exportGame(game)))),before);
 full=false;assert.equal(store.save(game).ok,true);assert.deepEqual(player.getGameView(parseSave(stored)),before);
});
test('import preview leaves current play untouched until an explicit current confirmation',async()=>{
 let current=newShift(()=>0);const preview=createImportPreview(()=>current),next=player.advanceGame(newShift(()=>3),1),before=current;
 const ready=await preview.read(file(next));assert.equal(ready.status,'ready');assert.equal(current,before);assert.deepEqual(ready.view,player.getGameView(next));preview.invalidate();assert.throws(()=>preview.confirm(),/no longer current/);
 await preview.read(file(next));current=preview.confirm();assert.deepEqual(player.getGameView(current),player.getGameView(next));assert.throws(()=>preview.confirm(),/no longer current/);
});
test('a current import cannot be replaced by a stale asynchronous success or failure',async()=>{
 let current=newShift(()=>0);const preview=createImportPreview(()=>current),later=player.advanceGame(newShift(()=>2),1),slow=deferred();
 const oldRead=preview.read({size:10,text:()=>slow.promise});const newRead=await preview.read(file(later));assert.equal(newRead.status,'ready');slow.resolve(JSON.stringify(player.exportGame(newShift(()=>1))));assert.equal((await oldRead).status,'stale');assert.deepEqual(player.getGameView(preview.confirm()),player.getGameView(later));
 const fail=deferred(),pending=preview.read({size:10,text:()=>fail.promise});current=player.advanceGame(current,1);fail.reject(Error('late read error'));assert.equal((await pending).status,'stale');assert.throws(()=>preview.confirm(),/no longer current/);
});
test('advancing after a completed preview invalidates replacement even without an explicit UI invalidation',async()=>{
 let current=newShift(()=>0);const preview=createImportPreview(()=>current);await preview.read(file(newShift(()=>1)));current=player.applyCommand(current,{type:'request',action:{task:'inspect'}});assert.throws(()=>preview.confirm(),/no longer current/);
});

test('report controls use the same conservative owned-capacity and stop-reserve boundary as work',()=>{
 const fresh=newShift(()=>0),healthy=player.getGameView(fresh);
 assert.equal(reportUnavailable(healthy,1,'radio'),null);assert.match(reportUnavailable(healthy,1,'contact'),/present/);
 const tired=player.getGameView(player.createGame({bodies:{keeper:{fatigue:1,hunger:.15}}}));assert.match(reportUnavailable(tired,1,'radio'),/condition estimates/);
 let spent=fresh;for(let i=0;i<63;i++){spent=player.applyCommand(spent,{type:'request',action:{task:'inspect'}});spent=player.applyCommand(spent,{type:'stop'});}
 spent=player.applyCommand(spent,{type:'request',action:{task:'inspect'}});assert.equal(player.getGameView(spent).canStop,true);
 spent=player.applyCommand(spent,{type:'stop'});assert.match(reportUnavailable(player.getGameView(spent),1,'radio'),/reserved/);
 for(const count of [0,33])assert(reportUnavailable(healthy,count,'radio'));
});
