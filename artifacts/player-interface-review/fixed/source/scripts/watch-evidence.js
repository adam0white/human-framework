import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWatch,requestTask,interruptTask,advanceTo,exportWatch,getWatchView} from '../src/games/watch.js';
if(process.argv.length!==3||!process.argv[2])throw new Error('Usage: node scripts/watch-evidence.js <new-output-path>; existing files are never replaced.');
const root=fileURLToPath(new URL('../',import.meta.url));
const routes={briefRest:[['keeper','repair'],['watcher','watch'],6,['keeper','repair'],['watcher','share'],12,['keeper','rest'],15,['keeper','stop'],['keeper','repair'],40],repair:[['keeper','repair'],['watcher','watch'],6,['keeper','repair'],['watcher','share'],12,['keeper','rest'],18,['keeper','repair'],40],diversion:[['keeper','bypass'],['watcher','watch'],10,['watcher','open'],40]};
function run(scenario,route){
 let state=createWatch({scenario}),trace=[];
 for(const command of routes[route]){
  state=typeof command==='number'?advanceTo(state,command):command[1]==='stop'?interruptTask(state,command[0]):requestTask(state,...command);
  if(Array.isArray(command)&&command[1]!=='stop'&&!state.lastResponse.accepted)throw new Error(`Route refused: ${state.lastResponse.reason}`);
  const view=getWatchView(state);trace.push({command,at:view.now,repair:view.repair,bypass:view.bypass,parts:view.parts,condition:Object.fromEntries(Object.entries(view.people).map(([id,p])=>[id,p.body]))});
 }
 return {scenario,route,outcome:state.outcome,paid:state.paid,condition:Object.fromEntries(Object.entries(state.people).map(([id,p])=>[id,p.body])),snapshotBytes:Buffer.byteLength(JSON.stringify(exportWatch(state))),trace};
}
const files=['src/games/watch.js','web/watch-session.js','web/watch.js','web/watch.html','web/watch.css','src/runtime/index.js','src/runtime/clock.js','src/human/v0.1.1.js','src/core/model.js'];
const result={format:'watch-playable-evidence',version:1,node:process.version,runtime:'0.1.1',human:'0.1.1',clock:'0.1.0',cadence:'canonical one-minute steps',
 scope:'Two initial authored routes plus an independently found partial-recovery route and the original short-notice counterexample; no human playtest or nondominated preference claim.',
 sourceSha256:Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(resolve(root,file))).digest('hex')]))),
 runs:['steady','short'].flatMap(scenario=>Object.keys(routes).map(route=>run(scenario,route)))};
const destination=resolve(process.argv[2]);await mkdir(resolve(destination,'..'),{recursive:true});await writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:destination,runs:result.runs.map(({scenario,route,outcome,paid})=>({scenario,route,...outcome,restMinutes:paid.rest}))},null,2));
