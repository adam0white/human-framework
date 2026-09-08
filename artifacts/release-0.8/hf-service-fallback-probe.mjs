import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as H from '/Users/abdul/code/human-framework/src/games/service.js';
import {verifyStaticModules} from '/Users/abdul/code/human-framework/scripts/public-module-graph.js';
const results=[], clone=x=>JSON.parse(JSON.stringify(x));
function run(name,fn){const result=fn();results.push({name,status:'passed',...(result??{})});}
const ask=(s,a,t)=>{const n=H.requestTask(s,a,t);assert.equal(n.lastResponse.accepted,true,n.lastResponse.reason);return n;};
function rejectMutation(saved,mutate){const forged=clone(saved);mutate(forged);assert.throws(()=>H.restoreService(forged));}
run('conservation-preserving ownership and public-ledger forgeries reject',()=>{
 let s=H.advanceTo(ask(H.createService(),'keeper','gate'),3);s=H.interruptTask(s,'keeper');const saved=H.exportService(s);
 const mutations=[x=>{x.state.parts.keeper--;x.state.parts.partner++;},x=>{x.state.installedPartsByActor.keeper--;x.state.installedPartsByActor.partner++;},x=>{x.state.paidByActor.keeper.gate--;x.state.paidByActor.keeper.idle++;x.state.paidByActor.partner.gate++;x.state.paidByActor.partner.idle--;},x=>x.state.people.keeper.body.fatigue=.4,x=>x.state.lastResponse.reason='Edited but plausible response',x=>x.state.recent.at(-1).message='Edited but plausible record'];
 mutations.forEach(m=>rejectMutation(saved,m));return {rejected:mutations.length};
});
run('maximum-length legacy refusal journal normalizes without loosening state equality',()=>{
 let s=H.advanceTo(H.createService(),24);s=H.interruptTask(s,'partner');const saved=H.exportService(s);saved.commands=[{type:'advance',to:24},...Array.from({length:255},(_,i)=>i%2?{type:'request',actor:'keeper',task:'pump'}:{type:'stop',actor:'partner'})];
 const loaded=H.restoreService(saved);assert.deepEqual(H.exportService(loaded).state,saved.state);assert.equal(loaded.commands.length,2);assert.deepEqual(H.advanceTo(loaded,64),H.advanceTo(s,64));
 rejectMutation(saved,x=>{x.state.parts.keeper--;x.state.parts.partner++;});rejectMutation(saved,x=>x.state.jobs.partner.origin='request');rejectMutation(saved,x=>x.state.lastResponse.reason='No longer exact');return {legacyCommands:saved.commands.length,normalizedCommands:loaded.commands.length,rejected:3};
});
run('two accepted concurrent jobs can both stop at exhausted request budget and still close',()=>{
 let s=H.createService();for(let i=0;i<124;i++){s=ask(s,'keeper','rest');s=H.interruptTask(s,'keeper');}s=ask(ask(s,'keeper','meal'),'partner','salvage');s=H.requestTask(s,'keeper','gate');assert.equal(s.commands.length,251);assert.equal(H.getServiceView(s).remainingCommands,0);s=H.interruptTask(s,'keeper');s=H.interruptTask(s,'partner');assert.deepEqual(s.food,{keeper:1,partner:1});assert.equal(s.salvaged,0);s=H.advanceTo(s,64);assert.equal(s.commands.length,254);assert.equal(s.outcome.at,64);assert.deepEqual(H.restoreService(H.exportService(s)),s);assert.ok(JSON.stringify(H.exportService(s)).length<65536);return {closingCommands:s.commands.length,saveCharacters:JSON.stringify(H.exportService(s)).length};
});
run('different actor completes already installed partial gate without spending reserved clinic part',()=>{
 let s=H.advanceTo(ask(H.createService(),'keeper','gate'),3);s=H.interruptTask(s,'keeper');s=ask(s,'partner','gate');assert.equal(s.jobs.partner.reservedParts,0);s=H.advanceTo(s,6);assert.equal(s.work.gate,6);assert.deepEqual(s.installedPartsByActor,{keeper:1,partner:0});assert.equal(s.parts.partner,1);assert.equal(s.paidByActor.keeper.gate,3);assert.equal(s.paidByActor.partner.gate,3);assert.deepEqual(H.restoreService(H.exportService(s)),s);
});
run('terminal requests cannot change resource, body, receipt, outcome, or completed work',()=>{
 let s=H.advanceTo(H.createService(),64);const original=H.exportService(s).state;for(const actor of ['keeper','partner'])for(const task of Object.keys(H.SERVICE_TASKS)){s=H.requestTask(s,actor,task);assert.equal(s.lastResponse.code,'ENDED');}const after=H.exportService(s).state;delete original.lastResponse;delete after.lastResponse;assert.deepEqual(after,original);assert.deepEqual(H.restoreService(H.exportService(s)),s);assert.deepEqual(H.advanceTo(s,1000000),s);
});
run('parser never executes top-level source or dynamic filesystem import',()=>{
 const marker='/tmp/hf-service-parser-evaluated';rmSync(marker,{force:true});const graph=verifyStaticModules([{path:'web/a.js',source:`await import('node:fs').then(fs=>fs.writeFileSync('${marker}','ran')); process.exit(19);`}]);assert.equal(existsSync(marker),false);assert.equal(graph.staticEdges.length,0);assert.match(graph.scope,/no source evaluation/);
});
run('URL escape aliases, external authorities, attributes, and ambiguous star exports reject',()=>{
 let rejected=0;for(const alias of ['//foreign.invalid/web/value.js','/\\foreign.invalid/web/value.js','./value.js?','./value.js#','./%76alue.js','../web/value.js%3fother','data:text/javascript,export%20const%20value=1']){assert.throws(()=>verifyStaticModules([{path:'web/a.js',source:`import ${JSON.stringify(alias)};`},{path:'web/value.js',source:'export const value=1;'}]));rejected++;}
 assert.throws(()=>verifyStaticModules([{path:'web/a.js',source:'import value from "./value.js" with {type:"json"};'},{path:'web/value.js',source:'export default 1;'}]),/attributes|assert|syntax/i);rejected++;
 assert.throws(()=>verifyStaticModules([{path:'web/a.js',source:'import {value} from "./barrel.js";'},{path:'web/barrel.js',source:'export * from "./one.js"; export * from "./two.js";'},{path:'web/one.js',source:'export const value=1;'},{path:'web/two.js',source:'export const value=2;'}]),/conflicting|ambiguous|export/i);rejected++;return {rejected};
});
run('current complete public JavaScript set statically links without evaluation',()=>{
 const root='/Users/abdul/code/human-framework';const dirs=['web','src/core','src/scenarios','src/human','src/runtime','src/games','src/legacy/v0.1','src/legacy/v0.2'];const inputs=dirs.flatMap(dir=>readdirSync(`${root}/${dir}`,{withFileTypes:true}).filter(d=>d.isFile()&&!d.name.startsWith('.')&&d.name.endsWith('.js')).map(d=>({path:`${dir}/${d.name}`,source:readFileSync(`${root}/${dir}/${d.name}`,'utf8')})));const graph=verifyStaticModules(inputs);return {modules:graph.modules,staticEdges:graph.staticEdges.length};
});
const hashes=Object.fromEntries(['src/games/service.js','web/service.js','web/service-session.js','docs/service-day-design.md','scripts/public-module-graph.js','scripts/inspect-static-modules.mjs','scripts/build.js'].map(p=>[p,createHash('sha256').update(readFileSync('/Users/abdul/code/human-framework/'+p)).digest('hex')]));
console.log(JSON.stringify({node:process.version,results,hashes},null,2));
