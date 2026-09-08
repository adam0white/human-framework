const C=await import((process.env.HF_CAMP_KERNEL_REVIEW_ROOT??'/Users/abdul/code/human-framework/.worktrees/camp-kernel')+'/src/games/camp.js');
import assert from 'node:assert/strict';
let g=C.createGame();
for(const id of ['gather-timber','gather-salvage','gather-timber','gather-salvage']){
  g=C.startJob(g,id);
  while(g.jobs.player)g=C.advanceGame(g,1);
}
g=C.requestProject(g,'workbench');
const next=C.getGameView(g).nextStop;
console.log({now:g.clock.now,fatigue:g.people.player.body.fatigue,next,availableAt77:C.getGameView(C.advanceGame(g,3)).choices.filter(c=>!c.unavailable).map(c=>c.id)});
assert.equal(next.at,77,'Next Event must pause at the first renewed player work capacity');
