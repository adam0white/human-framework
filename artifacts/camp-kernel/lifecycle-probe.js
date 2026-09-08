import fs from 'node:fs';
import * as camp from '../../src/games/camp.js';
let game=camp.createGame(),commands=0,maxBytes=0;
const rows=[];
while(game.clock.now<10000&&commands<10000){
  const view=camp.getGameView(game),can=id=>view.choices.find(c=>c.id===id&&!c.unavailable),unbuilt=['workbench','garden','shelter'].filter(p=>view.structures[p]<2);
  if(view.commitment.status!=='accepted')game=camp.requestProject(game,unbuilt.at(-1)??'cache');
  else if(view.people.player.job)game=camp.advanceToNextEvent(game);
  else if(view.people.player.body.hunger>=.6)game=camp.startJob(game,can('eat')?'eat':'forage');
  else{
    const target=unbuilt.find(p=>p!==view.commitment.project)??unbuilt[0]??'cache';
    const cost=view.work[target]?{}:camp.PROJECTS[target].stages[target==='cache'?0:view.structures[target]].cost;
    if(can(`build-${target}`))game=camp.startJob(game,`build-${target}`);
    else if(view.stock.timber<(cost.timber??0)&&can('gather-timber'))game=camp.startJob(game,'gather-timber');
    else if(view.stock.salvage<(cost.salvage??0)&&can('gather-salvage'))game=camp.startJob(game,'gather-salvage');
    else game=camp.advanceToNextEvent(game);
  }
  commands++;const save=camp.exportGame(game),bytes=JSON.stringify(save).length;maxBytes=Math.max(maxBytes,bytes);
  if(commands%100===0){game=camp.restoreGame(JSON.parse(JSON.stringify(save)));rows.push({commands,now:game.clock.now,caches:game.caches,bytes});}
}
const report={runtime:process.version,commands,now:game.clock.now,caches:game.caches,structures:game.structures,maxSaveCharacters:maxBytes,paid:game.paid,stats:game.stats,rows};
fs.writeFileSync(new URL(`./long-campaign-${process.version.startsWith('v22')?'node22':'node26'}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({runtime:process.version,commands,now:game.clock.now,caches:game.caches,maxSaveCharacters:maxBytes}));
