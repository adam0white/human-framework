const C=await import((process.env.HF_CAMP_KERNEL_REVIEW_ROOT??'/Users/abdul/code/human-framework/.worktrees/camp-kernel')+'/src/games/camp.js');
const L=await import((process.env.HF_CAMP_KERNEL_REVIEW_ROOT??'/Users/abdul/code/human-framework/.worktrees/camp-kernel')+'/src/games/commons.js');
import assert from 'node:assert/strict';
const summaries=[];
function choose(api,g){const v=api.getGameView(g),has=id=>v.choices.find(c=>c.id===id&&!c.unavailable);if(g.jobs.player)return api.advanceGame(g,1);const p=g.people.player;if(p.body.hunger>.60)return api.startJob(g,has('eat')?'eat':'forage');for(const project of Object.keys(C.PROJECTS)){if(has('build-'+project))return api.startJob(g,'build-'+project);}
  if(g.stock.timber<12&&has('gather-timber'))return api.startJob(g,'gather-timber');if(g.stock.salvage<7&&has('gather-salvage'))return api.startJob(g,'gather-salvage');if(api===L&&has('rest'))return api.startJob(g,'rest');return api.advanceGame(g,1);}
for(const legacy of [false,true]){
 let api=legacy?L:C,g=api.createGame(),maxSize=0,commands=0,imports=0,minImportCaches=Infinity,kinds=new Set();const until=legacy?1600:20000;
 while(g.clock.now<until){
  if(g.commitment.status!=='accepted'){const project=Object.keys(C.PROJECTS).find(p=>p==='cache'||g.structures[p]<2);if(project!=='cache'||Object.values(g.structures).every(x=>x===2))g=api.requestProject(g,project);}
  try{g=choose(api,g);}catch(e){if(api!==L||!/Too much (fatigue|hunger)/.test(e.message))throw e;g=L.startJob(g,e.message.includes('hunger')?(g.stock.food?'eat':'forage'):'rest');}commands++;
  if(commands>60000)throw Error('driver stuck');maxSize=Math.max(maxSize,JSON.stringify(g).length);
  if(legacy&&g.caches>0&&commands%13===0){for(const recovery of ['automatic','active-idle'])for(const improvement of ['prospective','snapshot']){const c=C.migrateLegacyGame(L.exportGame(g),{recovery,improvement});assert.equal(c.caches,g.caches);assert.deepEqual(c.stock,g.stock);assert.deepEqual(c.people.player.body,g.people.player.body);const a=C.advanceGame(c,31),b=C.advanceGame(C.restoreGame(JSON.parse(JSON.stringify(C.exportGame(C.advanceGame(c,11))))),20);assert.deepEqual(a,b);imports++;}minImportCaches=Math.min(minImportCaches,g.caches);kinds.add(Object.values(g.jobs).map(j=>j?.id??'idle').join('/'));}
  if(!legacy&&commands%31===0){const x=C.restoreGame(JSON.parse(JSON.stringify(C.exportGame(g))));assert.deepEqual(x,g);assert.ok(Object.keys(g.lastAssemblies).length<=4);assert.ok(g.recent.length<=16);}
 }
 summaries.push({legacy,now:g.clock.now,caches:g.caches,commands,maxSize,imports,minImportCaches,kinds:[...kinds].sort(),structures:g.structures});
}
console.log(JSON.stringify({node:process.version,summaries},null,2));
