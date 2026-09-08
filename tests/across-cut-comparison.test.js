import test from 'node:test';
import assert from 'node:assert/strict';

test('comparison evidence hashes complete detached local inputs and rejects mutation', async()=>{
  const m=await import('../src/experiments/across-cut/comparison/evidence.js').catch(()=>null);
  assert.ok(m?.intern,'The complete-input evidence dictionary must exist.');
  const dictionary={},input={actor:'keeper',now:1,received:[{source:'receiver',observedAt:0,value:27}]};
  const id=m.intern(dictionary,input);input.received[0].value=15;
  assert.equal(m.resolveInput(dictionary,id).received[0].value,27);
  assert.equal(m.intern(dictionary,m.resolveInput(dictionary,id)),id);
  dictionary[id].now=2;assert.throws(()=>m.resolveInput(dictionary,id),/hash/);
});

test('registered comparison protocol and fresh output guards preserve evidence', async()=>{
  const m=await import('../src/experiments/across-cut/comparison/provenance.js').catch(()=>null);
  assert.ok(m?.checkProtocol,'The source provenance boundary must exist.');
  const {mkdtemp,readFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const dir=await mkdtemp(join(tmpdir(),'across-cut-evidence-'));
  try{
    const file=join(dir,'kept.json');await m.writeJSON(file,{kept:true});
    await assert.rejects(m.assertFreshOutput(file),/overwrite/);
    await assert.rejects(m.writeJSON(file,{}),/EEXIST/);
    assert.deepEqual(JSON.parse(await readFile(file,'utf8')),{kept:true});
    assert.match(await m.checkProtocol(),/^[a-f0-9]{64}$/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
