import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,writeFile,mkdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {buildSite} from '../scripts/build.js';
import {PUBLIC_PAGES} from '../scripts/public-pages.js';
import {PUBLIC_ASSETS} from '../scripts/public-assets.js';

async function fixture(){
  const root=await mkdtemp(join(tmpdir(),'human-build-'));
  for(const source of [...Object.values(PUBLIC_PAGES),...PUBLIC_ASSETS]){
    await mkdir(dirname(join(root,source)),{recursive:true});
    await writeFile(join(root,source),source.endsWith('.js')?'export const fixture=1;':'public example');
  }
  await writeFile(join(root,'package.json'),'{"version":"0.12.0"}');
  await mkdir(join(root,'dist'));await writeFile(join(root,'dist/previous.txt'),'previous build remains');
  return root;
}

test('an unpublished static dependency blocks build before the previous output is cleared',async()=>{
  const root=await fixture();
  try{
    await writeFile(join(root,'web/camp-current.js'),'import "../src/cognition/private.js";');
    await assert.rejects(()=>buildSite({root}),/private|unavailable/i);
    assert.equal(await readFile(join(root,'dist/previous.txt'),'utf8'),'previous build remains');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('deployment selects exact assets and retires the laboratory without leaking adjacent experiments',async()=>{
  const root=await fixture();
  const privateFiles=['index.html','web/app.js','web/guidance.js','web/styles.css','web/draft.js','web/private.html','web/signals.html','web/signals.js','web/signals-session.js','web/signals.css','src/games/signals.js','src/core/index.js','src/scenarios/index.js','src/legacy/v0.1/index.js','src/legacy/v0.2/index.js','src/games/draft.js','src/runtime/draft.js','research/private.md','.env'];
  try{
    for(const path of privateFiles){await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),'PRIVATE LAB OR RESEARCH');}
    const built=await buildSite({root});
    assert.deepEqual([...built.files].sort(),[...Object.keys(PUBLIC_PAGES),...PUBLIC_ASSETS,'_headers','release.json'].sort());
    for(const [output,source] of Object.entries(PUBLIC_PAGES))assert.equal(await readFile(join(root,'dist',output),'utf8'),await readFile(join(root,source),'utf8'));
    assert.equal(await readFile(join(root,'dist/index.html'),'utf8'),'public example');
    for(const path of privateFiles.filter(p=>p!=='index.html'))assert.equal(built.files.includes(path),false,path);
    assert.equal((await readdir(join(root,'dist'))).includes('previous.txt'),false);
    assert.match(await readFile(join(root,'dist/_headers'),'utf8'),/Content-Security-Policy/);
    assert.match(await readFile(join(root,'dist/_headers'),'utf8'),/no-cache, no-transform/);
    const digest=createHash('sha256');
    for(const file of built.files.filter(p=>p!=='release.json').sort())digest.update(file).update('\0').update(await readFile(join(root,'dist',file))).update('\0');
    assert.equal(built.release.assetsSha256,digest.digest('hex'));
    assert.equal(built.release.appVersion,'0.12.0');
    assert.equal(built.release.runtimeVersion,'0.1.1');
    assert.equal(Object.hasOwn(built.release,'engineVersion'),false,'retired laboratory is not the delivered runtime');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('deployment refuses symlinked selected assets, their ancestors, and HTML entries before clearing output',async()=>{
  for(const redirect of ['web','src','src/core','src/runtime',...new Set(Object.values(PUBLIC_PAGES)),'web/camp-current.js','src/core/model.js']){
    const root=await fixture();
    try{
      const isFile=redirect.includes('.');
      const privatePath=join(root,isFile?'private.js':'private');
      if(isFile)await writeFile(privatePath,'private research');else await mkdir(privatePath);
      await rm(join(root,redirect),{recursive:true,force:true});await symlink(privatePath,join(root,redirect));
      await assert.rejects(()=>buildSite({root}),/symlink|public source/i);
      assert.equal(await readFile(join(root,'dist/previous.txt'),'utf8'),'previous build remains');
    }finally{await rm(root,{recursive:true,force:true});}
  }
});
