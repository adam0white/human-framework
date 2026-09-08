import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('both private adapted consumers satisfy all original host regression assertions',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'coordination-regression-'));
  try {
    const fixtures=[
      ['../tests/watch.test.js','../src/experiments/coordination/watch.js',"'../src/games/watch.js'"],
      ['../examples/maintenance-watch/host.test.js','../src/experiments/coordination/maintenance.js',"'./host.js'"]
    ];
    for(const [index,[original,candidate,hostImport]] of fixtures.entries()) {
      const file=new URL(original,import.meta.url);let tests=await readFile(file,'utf8');
      tests=tests.replace(hostImport,JSON.stringify(new URL(candidate,import.meta.url).href));
      tests=tests.replace("'human-framework-runtime'",JSON.stringify(new URL('../src/runtime/index.js',import.meta.url).href));
      tests=tests.replaceAll(/from\s+(['"])(\.[^'"]+)\1/g,(_match,_quote,path)=>'from '+JSON.stringify(new URL(path,file).href));
      const target=join(dir,'host-'+index+'.test.mjs');await writeFile(target,tests);
      const env={...process.env};delete env.NODE_TEST_CONTEXT;
      const output=execFileSync(process.execPath,['--test','--test-reporter=tap',target],{encoding:'utf8',env});
      assert.match(output,/# fail 0\b/);assert.match(output,/# pass [1-9]\d*\b/);
    }
  } finally {await rm(dir,{recursive:true,force:true});}
});
