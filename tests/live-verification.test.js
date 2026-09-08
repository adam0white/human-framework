import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

for(const mutation of ['missing asset','changed headers','dirty source'])test(`live verification rejects ${mutation} before accepting deployment`,async()=>{
  const root=await mkdtemp(join(tmpdir(),'human-live-check-'));
  try{
    await mkdir(join(root,'scripts'));await mkdir(join(root,'dist'));
    await copyFile(new URL('../scripts/verify-live.js',import.meta.url),join(root,'scripts/verify-live.js'));
    await writeFile(join(root,'package.json'),' {"type":"module"}');
    await writeFile(join(root,'.gitignore'),'dist/\n');
    const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    git('init','-q');git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=/dev/null','commit','-qm','fixture');git('remote','add','origin','.');
    // A local remote needs the same main ref as production but no network access.
    git('branch','-M','main');const commit=git('rev-parse','HEAD');
    const payloads={'_headers':'/*\n Cache-Control: no-cache, no-transform\n','index.html':'<h1>Game</h1>','required.js':'export const ready=true;'};
    const digest=createHash('sha256');
    for(const path of Object.keys(payloads).sort()){await writeFile(join(root,'dist',path),payloads[path]);digest.update(path).update('\0').update(payloads[path]).update('\0');}
    await writeFile(join(root,'dist/release.json'),JSON.stringify({appVersion:'0.4.0',runtimeVersion:'0.1.1',clockVersion:'0.1.0',commit,dirty:false,assetsSha256:digest.digest('hex')}));
    if(mutation==='missing asset')await rm(join(root,'dist/required.js'));
    if(mutation==='changed headers')await writeFile(join(root,'dist/_headers'),'changed');
    if(mutation==='dirty source')await writeFile(join(root,'package.json'),' {"type":"module","changed":true}');
    const result=spawnSync(process.execPath,[join(root,'scripts/verify-live.js')],{cwd:root,encoding:'utf8',timeout:25000});
    assert.equal(result.status,1,result.stderr);assert.match(result.stderr,mutation==='dirty source'?/working tree is not clean/:/payload digest does not match/);
    assert.doesNotMatch(result.stdout,/Verified app/);
  }finally{await rm(root,{recursive:true,force:true});}
});
