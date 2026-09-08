import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,dirname,posix} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const git=(root,args)=>execFileSync('git',['-C',root,...args],{maxBuffer:32*1024*1024});
const read=(root,commit,path)=>git(root,['show',`${commit}:${path}`]);
const appEntries=['src/games/across-cut-player.js','src/games/camp-current.js','web/across-view.js'];
const laneEntries=['artifacts/action-offers/inputs.json','artifacts/action-offers/policy.mjs','artifacts/action-offers/runner.mjs','artifacts/action-offers/provenance.mjs','tests/action-offer-comparison.test.js'];
export function graph(root,ref,entries){
  const commit=git(root,['rev-parse','--verify',`${ref}^{commit}`]).toString().trim(),files={};
  function collect(path){
    if(Object.hasOwn(files,path))return;
    assert.ok(!path.startsWith('../')&&!posix.isAbsolute(path));
    const bytes=read(root,commit,path),text=bytes.toString();files[path]={sha256:hash(bytes),bytes:bytes.length};
    if(/\.(js|mjs)$/.test(path))for(const match of text.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?['"]([^'"]+)['"]/g)){
      if(match[1].startsWith('node:'))continue;
      assert.ok(match[1].startsWith('.'),`Unpinned module ${match[1]}`);
      collect(posix.normalize(posix.join(posix.dirname(path),match[1])));
    }
  }
  entries.forEach(collect);return {commit,files};
}
export function makeFreeze(root,commit){
  const candidate=graph(root,commit,[...appEntries,...laneEntries]);
  const inputs=JSON.parse(read(root,candidate.commit,'artifacts/action-offers/inputs.json'));
  const baseline=graph(root,inputs.baselineCommit,appEntries);
  const deployed=graph(root,inputs.deployedAppCommit,appEntries);
  assert.deepEqual(baseline.files,deployed.files,'Private baseline and delivered app must have identical compared app graphs.');
  for(const [path,identity] of Object.entries(baseline.files))if(!['src/games/across-cut-player.js','web/across-view.js'].includes(path))assert.deepEqual(candidate.files[path],identity,`Physics/receiver/Camp changed: ${path}`);
  return {format:'action-offer-freeze',version:1,baseline,candidate,deployed,inputsSha256:hash(inputs)};
}
export function verifyFreeze(root,freeze){assert.deepEqual(freeze,makeFreeze(root,freeze.candidate.commit));return freeze;}
export async function loadFrozen(root,freeze){
  verifyFreeze(root,freeze);const directory=mkdtempSync(resolve(tmpdir(),'action-offers-'));
  try{
    for(const [arm,graph] of Object.entries({baseline:freeze.baseline,candidate:freeze.candidate})){
      const base=resolve(directory,arm);mkdirSync(base,{recursive:true});writeFileSync(resolve(base,'package.json'),'{"type":"module"}\n');
      for(const [path,identity] of Object.entries(graph.files)){
        const bytes=read(root,graph.commit,path);assert.equal(hash(bytes),identity.sha256);
        const destination=resolve(base,path);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,bytes);
      }
    }
    const load=(arm,path)=>import(pathToFileURL(resolve(directory,arm,path)).href);
    const api={};
    for(const arm of ['baseline','candidate'])api[arm]={player:await load(arm,'src/games/across-cut-player.js'),host:await load(arm,'src/games/across-cut.js'),camp:await load(arm,'src/games/camp-current.js'),view:await load(arm,'web/across-view.js')};
    const runner=await load('candidate','artifacts/action-offers/runner.mjs');
    const inputs=JSON.parse(readFileSync(resolve(directory,'candidate/artifacts/action-offers/inputs.json')));
    return {api,runner,inputs,directory};
  }catch(error){rmSync(directory,{recursive:true,force:true});throw error;}
}
