import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as player from '/Users/abdul/code/human-framework/src/games/across-cut-player.js';
import * as presentation from '/Users/abdul/code/human-framework/web/across-view.js';
import * as host from '/Users/abdul/code/human-framework/src/games/across-cut.js';
const root='/Users/abdul/code/human-framework';
const pins={'src/games/across-cut-player.js':'fefb9f905d583c43fc86270542f423f6e967305c43aa1e3c6a956493afbfd349','web/across-view.js':'887bfbb37f5c3d37cbb07dad6ec8c23d0ab7d8706c7684ed3ec7594f59062a55'};
const sha=x=>createHash('sha256').update(x).digest('hex');
const readHashes=()=>Object.fromEntries(Object.keys(pins).map(path=>[path,sha(readFileSync(root+'/'+path))]));
const beforeHashes=readHashes();assert.deepEqual(beforeHashes,pins);
const start=(fatigue,hunger=.15)=>player.createGame({bodies:{keeper:{fatigue,hunger}}});
const request=(game,action)=>player.applyCommand(game,{type:'request',action});
const inspected=game=>player.advanceGame(request(game,{task:'inspect'}),1);
const snapshot=game=>({host:host.exportState(game.host),recipe:player.exportGame(game),receiver:game.receiver,frame:game.frame,ui:game.ui});
const rows=[];
function checkChoice(name,game,id,expectedUncertain,expectedHost){
 const choice=player.getGameView(game).choices.find(c=>c.id===id),before=snapshot(game);
 assert.equal(choice.capacityUncertain,expectedUncertain,name);
 if(choice.unavailable)assert.equal(choice.unavailable,'Your body estimate does not yet support this entire interval.');
 let outcome='admitted';try{request(game,choice.action);}catch(error){outcome=error.code;}
 assert.equal(outcome,expectedHost,name);
 assert.deepEqual(snapshot(game),before,name+' source game unchanged');
 rows.push({name,id,duration:choice.duration,visibleBody:player.getGameView(game).body.body,capacityUncertain:choice.capacityUncertain,unavailable:choice.unavailable,hostOutcome:outcome});
}
const longRepair=inspected(start(.95));
checkChoice('entire repair bin impossible',longRepair,'repair-full',false,'CAPACITY');
checkChoice('same repair state one minute conservative',longRepair,'repair-one',false,'admitted');
const travel=start(.9751);
checkChoice('entire travel bin impossible',travel,'travel-dock',false,'CAPACITY');
checkChoice('same state inspection straddles and admits',travel,'inspect',true,'admitted');
const repairLegal=inspected(start(.915)),repairRefused=inspected(start(.92));
assert.deepEqual(player.getGameView(repairLegal),player.getGameView(repairRefused));
checkChoice('full repair straddling legal twin',repairLegal,'repair-full',true,'admitted');
checkChoice('full repair straddling refused twin',repairRefused,'repair-full',true,'CAPACITY');
const hungerLegal=start(.1,.9975),hungerRefused=start(.1,.9985);
assert.deepEqual(player.getGameView(hungerLegal),player.getGameView(hungerRefused));
checkChoice('hunger straddling legal inspection',hungerLegal,'inspect',true,'admitted');
checkChoice('hunger straddling refused inspection',hungerRefused,'inspect',true,'CAPACITY');
for(const [name,game,expectedHost] of [['legal',hungerLegal,'admitted'],['refused',hungerRefused,'CAPACITY']]){
 const view=player.getGameView(game),before=snapshot(game),copy=structuredClone(view);
 const offer=presentation.reportOffer(view,1,'radio');
 assert.equal(offer.capacityUncertain,true);
 assert.equal(presentation.reportUnavailable(view,1,'radio'),offer.unavailable);
 assert.deepEqual(presentation.reportOffer(view,1,'contact'),{unavailable:'Deniz must be present at your station.',capacityUncertain:false});
 let outcome='admitted';try{request(game,{task:'transmit',via:'radio',message:{kind:'report',observationIds:[1]}});}catch(error){outcome=error.code;}
 assert.equal(outcome,expectedHost);
 assert.deepEqual(snapshot(game),before);assert.deepEqual(view,copy);
 rows.push({name:'hunger straddling '+name+' report',...offer,hostOutcome:outcome});
}
const current=readFileSync(root+'/src/games/across-cut-player.js','utf8');
const old=execFileSync('git',['show','bd944c8:src/games/across-cut-player.js'],{cwd:root,encoding:'utf8'});
for(const [begin,end] of [['function stopReason(','\nfunction run('],['function run(','\nexport function advanceGame(']])assert.equal(current.slice(current.indexOf(begin),current.indexOf(end)),old.slice(old.indexOf(begin),old.indexOf(end)));
const afterHashes=readHashes();assert.deepEqual(afterHashes,beforeHashes);
const result={review:'Narrow correction of prior whole-bin-impossible uncertainty finding',status:'resolved',scope:'Only prior repair/travel finding and shorter or straddling counterparts, plus hunger/report guard consistency; no preregistered comparison or broad test rerun.',beforeHashes,afterHashes,unchangedBaselineFunctions:['stopReason','run'],checks:rows};
writeFileSync('/tmp/action-offer-code-review/correction-artifact.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:rows.length,correctionArtifactSha256:sha(readFileSync('/tmp/action-offer-code-review/correction-artifact.json'))},null,2));
