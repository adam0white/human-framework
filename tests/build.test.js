import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,writeFile,mkdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildSite} from '../scripts/build.js';

test('deployment contains the playable module graph and excludes private project files',async()=>{
  const root=await mkdtemp(join(tmpdir(),'human-build-'));
  try {
    for(const path of ['web','src/core','src/scenarios','research','dist'])await mkdir(join(root,path),{recursive:true});
    for(const [path,body] of Object.entries({
      'index.html':'<script type="module" src="/web/app.js"></script>',
      'web/app.js':"import '../src/core/index.js';",
      'web/styles.css':'body{color:teal}',
      'src/core/index.js':'export const version=1;',
      'src/scenarios/index.js':'export const scenarios=[];',
      'research/private.md':'private research',
      '.env':'secret fixture',
      'dist/stale-secret.json':'old output',
      'web/private.json':'unpublished data'
    }))await writeFile(join(root,path),body);
    const built=await buildSite({root});
    const files=await readdir(join(root,'dist'),{recursive:true});
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('web/app.js'));
    assert.ok(files.includes('src/core/index.js'));
    assert.ok(files.includes('src/scenarios/index.js'));
    assert.equal(files.some(p=>/secret|private|\.env|research/.test(p)),false);
    assert.match(await readFile(join(root,'dist/_headers'),'utf8'),/Content-Security-Policy/);
    assert.match(await readFile(join(root,'dist/_headers'),'utf8'),/Cache-Control: no-cache/);
    assert.match(await readFile(join(root,'dist/_headers'),'utf8'),/no-transform/);
    const digest=createHash('sha256');
    for(const file of built.files.filter(p=>p!=='release.json').sort())digest.update(file).update('\0').update(await readFile(join(root,'dist',file))).update('\0');
    assert.equal(built.release.assetsSha256,digest.digest('hex'),'release identity includes deployed headers as well as page assets');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('deployment refuses symlinked public roots, their ancestors, and the entry page',async()=>{
  for(const redirect of ['web','src','index.html']) {
    const root=await mkdtemp(join(tmpdir(),'human-build-links-'));
    try {
      for(const path of ['web','src/core','src/scenarios','research','research/core','research/scenarios'])await mkdir(join(root,path),{recursive:true});
      await writeFile(join(root,'index.html'),'public');
      await writeFile(join(root,'research/private.js'),'private research');
      await writeFile(join(root,'research/private.html'),'private research');
      await rm(join(root,redirect),{recursive:true,force:true});
      await symlink(join(root,redirect==='index.html'?'research/private.html':'research'),join(root,redirect));
      await assert.rejects(()=>buildSite({root}),/symlink|public source/i);
    } finally {await rm(root,{recursive:true,force:true});}
  }
});
