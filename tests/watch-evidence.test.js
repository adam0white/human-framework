import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=new URL('../scripts/watch-evidence.js',import.meta.url);
test('watch evidence writer preserves any existing destination',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'watch-evidence-test-'));
 try{const destination=join(dir,'retained.json');await writeFile(destination,'retained proof\n');const result=spawnSync(process.execPath,[script.pathname,destination],{encoding:'utf8'});
  assert.notEqual(result.status,0);assert.equal(await readFile(destination,'utf8'),'retained proof\n');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('watch evidence writer emits six route traces to an explicit new destination',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'watch-evidence-test-'));
 try{const destination=join(dir,'fresh.json'),result=spawnSync(process.execPath,[script.pathname,destination],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const evidence=JSON.parse(await readFile(destination,'utf8'));assert.equal(evidence.runs.length,6);assert.equal(evidence.runs.find(r=>r.scenario==='short'&&r.route==='briefRest').outcome.waterService,true);
  assert.equal(evidence.runs.find(r=>r.scenario==='short'&&r.route==='repair').outcome.protected,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
