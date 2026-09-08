const camp=await import((process.env.HF_CAMP_KERNEL_REVIEW_ROOT??'/Users/abdul/code/human-framework/.worktrees/camp-kernel')+'/src/games/camp.js');
const legacy=await import((process.env.HF_CAMP_KERNEL_REVIEW_ROOT??'/Users/abdul/code/human-framework/.worktrees/camp-kernel')+'/src/games/commons.js');
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
let seed=275713; const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
let commands=0,migrations=0,chunkPairs=0,availability=0,maxSize=0;const kinds=new Set(),errors=[];
function saveError(label,g,error){errors.push({label,error:error.stack,at:g.clock.now,jobs:g.jobs});writeFileSync('/tmp/hf-camp-kernel-review-failure-'+errors.length+'.json',JSON.stringify({label,g,error:String(error)},null,2));}
function check(g){
  let v;try{v=camp.getGameView(g);assert.deepEqual(camp.restoreGame(JSON.parse(JSON.stringify(camp.exportGame(g)))),g);maxSize=Math.max(maxSize,JSON.stringify(g).length);}catch(e){saveError('view/save',g,e);throw e;}
  for(const c of v.choices)if(!c.unavailable){try{camp.startJob(g,c.id);availability++;}catch(e){saveError('offered action '+c.id,g,e);throw e;}}
  return v;
}
for(const recovery of ['automatic','active-idle'])for(const improvement of ['prospective','snapshot'])for(const solo of [false,true]){
  let g=camp.createGame({recovery,improvement,solo});
  for(let i=0;i<500;i++){
    const v=check(g),ops=[()=>camp.advanceGame(g,1+Math.floor(rand()*29))];
    if(g.jobs.player)ops.push(()=>camp.cancelJob(g));
    else for(const c of v.choices)if(!c.unavailable)ops.push(()=>camp.startJob(g,c.id));
    if(!solo){for(const p of Object.keys(camp.PROJECTS))ops.push(()=>camp.requestProject(g,p));if(g.commitment.status==='accepted')ops.push(()=>camp.releaseProject(g));if(g.jobs.player?.kind==='assembly')ops.push(()=>camp.requestHandover(g));if(g.jobs.neighbor?.kind==='assembly')ops.push(()=>camp.requestHandover(g,'neighbor','player'));}
    try{g=ops[Math.floor(rand()*ops.length)]();commands++;}catch(e){saveError('legal transition',g,e);throw e;}
    if(i%37===0){let a=camp.advanceGame(g,37),b=g;for(const n of [3,7,1,11,15])b=camp.advanceGame(b,n);assert.deepEqual(a,b);chunkPairs++;}
  }
}
for(let run=0;run<8;run++){
 let old=legacy.createGame({solo:run%2===0});
 for(let i=0;i<150;i++){
   const snap=legacy.exportGame(old); kinds.add(Object.values(old.jobs).map(j=>j?.id??'idle').join('/'));
   for(const recovery of ['automatic','active-idle'])for(const improvement of ['prospective','snapshot']){
    let g;try{g=camp.migrateLegacyGame(snap,{recovery,improvement});assert.deepEqual(g.origin,snap);for(const a of Object.keys(old.people)){assert.deepEqual(g.people[a].body,old.people[a].body);assert.deepEqual(g.people[a].skills,old.people[a].skills);}check(g);camp.advanceGame(g,45);migrations++;}catch(e){saveError('migration/continuation',g??old,e);throw e;}
   }
   const v=legacy.getGameView(old),ops=[()=>legacy.advanceGame(old,1+Math.floor(rand()*15))];
   if(old.jobs.player)ops.push(()=>legacy.cancelJob(old));else for(const c of v.choices)if(!c.unavailable)ops.push(()=>legacy.startJob(old,c.id));
   if(!old.solo){for(const p of Object.keys(camp.PROJECTS))ops.push(()=>legacy.requestProject(old,p));if(old.commitment.status==='accepted')ops.push(()=>legacy.releaseProject(old));}
   try{old=ops[Math.floor(rand()*ops.length)]();}catch(e){if(!/Too much/.test(e.message))throw e;old=legacy.advanceGame(old,3);}
 }
}
console.log(JSON.stringify({node:process.version,commands,migrations,chunkPairs,availability,maxSize,legacyPairs:[...kinds].sort(),errors},null,2));
