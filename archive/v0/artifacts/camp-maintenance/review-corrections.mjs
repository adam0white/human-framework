import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {sha} from './support.mjs';
const output=process.argv[2];if(!output)throw Error('A new output directory is required');mkdirSync(output);
const captures=['final-current','reviewed-current'],apis={};
for(const name of captures){const report=JSON.parse(readFileSync(`artifacts/camp-maintenance/${name}/report.json`)),raw=readFileSync(`artifacts/camp-maintenance/${name}/current-sources.json.gz`);assert.equal(sha(raw),report.sourceArchiveSha256);const sources=JSON.parse(gunzipSync(raw)),dir=mkdtempSync(join(tmpdir(),'hf-camp-review-corrections-'));for(const [path,source] of Object.entries(sources)){mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),source);}writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');apis[name]=await import(pathToFileURL(join(dir,'src/games/camp-current.js')));}
const cases=[
 {id:'pending-meal-reclassified-as-recovery',boundary:'readiness-owned-meal-owned-partial-meal',mutate:s=>{s.game.paid.player.meal-=3;s.game.paid.player.recovery+=3;s.game.stats.mealMinutes-=3;s.game.stats.restMinutes+=3;}},
 {id:'pending-gather-effort-shifted-to-neighbor',boundary:'gather-accepted-project-active-gather',mutate:s=>{s.game.paid.neighbor.effort+=s.game.paid.player.effort;s.game.paid.player.effort=0;}}
];
const results=[];
for(const item of cases){const raw=readFileSync(`artifacts/camp-maintenance/reviewed-current/boundaries/${item.boundary}.json`),original=JSON.parse(raw),snapshot=structuredClone(original);item.mutate(snapshot);const outcomes={};
 for(const name of captures){assert.doesNotThrow(()=>apis[name].restoreGame(original),'Original valid boundary must restore in both captures');try{apis[name].restoreGame(snapshot);outcomes[name]={accepted:true};}catch(error){outcomes[name]={accepted:false,error:error.message};}}
 assert.equal(outcomes['final-current'].accepted,true,item.id);assert.equal(outcomes['reviewed-current'].accepted,false,item.id);
 const payload=gzipSync(JSON.stringify(snapshot)+'\n',{level:9});writeFileSync(join(output,item.id+'.json.gz'),payload,{flag:'wx'});results.push({id:item.id,boundary:item.boundary,originalSnapshotSha256:sha(raw),mutatedSnapshotSha256:sha(payload),outcomes});
}
writeFileSync(join(output,'report.json'),JSON.stringify({sourceCaptures:captures.map(name=>({name,reportSha256:sha(readFileSync(`artifacts/camp-maintenance/${name}/report.json`))})),harnessSha256:sha(readFileSync('artifacts/camp-maintenance/review-corrections.mjs')),node:process.version,results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(results,null,2));
