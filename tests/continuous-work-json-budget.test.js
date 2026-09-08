import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('continuation JSON validation rejects shared expansion and oversized trees before serialization',()=>{
  const moduleUrl=new URL('../src/experiments/continuous-work/host.js',import.meta.url).href;
  const source=`import assert from 'node:assert/strict';
    import {restoreContinuation} from ${JSON.stringify(moduleUrl)};
    let dag={leaf:'x'}; for(let i=0;i<26;i++)dag={left:dag,right:dag};
    assert.throws(()=>restoreContinuation(dag),/JSON|size|limit/i);
    const wide=Array.from({length:9000},()=>({text:'x'.repeat(10000)}));
    assert.throws(()=>restoreContinuation(wide),/JSON|size|limit/i);
    process.stdout.write('bounded rejection');`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',timeout:2500,maxBuffer:10000});
  assert.equal(run.error,undefined,`Validation exceeded its bounded subprocess: ${run.error?.message}`);
  assert.equal(run.status,0,run.stderr);
  assert.equal(run.stdout,'bounded rejection');
});
