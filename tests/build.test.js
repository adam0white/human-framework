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
    for(const path of ['web','src/core','src/scenarios','src/human','src/runtime','src/games','src/legacy/v0.1','src/legacy/v0.2','research','dist'])await mkdir(join(root,path),{recursive:true});
    for(const [path,body] of Object.entries({
      'index.html':'<script type="module" src="/web/app.js"></script>',
      'package.json':'{"version":"0.4.0"}',
      'web/app.js':"import '../src/core/index.js';",
      'web/workshop.html':'<script type="module" src="/web/workshop.js"></script>',
      'web/workshop.js':"import '../src/games/workshop.js';",
      'web/games.html':'<a href="/shift/">Pump yard</a>',
      'web/shift.html':'<script type="module" src="/web/shift.js"></script>',
      'web/shift.js':"import '../src/games/shift.js';",
      'web/courtyard.html':'<script type="module" src="/web/courtyard.js"></script>',
      'web/courtyard.js':"import '../src/games/courtyard.js';",
      'web/courier.html':'<script type="module" src="/web/courier.js"></script>',
      'web/courier.js':"import '../src/games/courier.js';",
      'web/commons.html':'<script type="module" src="/web/commons.js"></script>',
      'web/commons.js':"import '../src/games/commons.js';",
      'web/styles.css':'body{color:teal}',
      'src/core/index.js':'export const version=1;',
      'src/legacy/v0.1/index.js':'export const version="0.1.0";',
      'src/legacy/v0.2/index.js':'export const version="0.2.0";',
      'src/human/index.js':'export const human=1;',
      'src/runtime/clock.js':'export const clock=1;',
      'src/games/commons.js':"import '../runtime/clock.js';",
      'src/games/workshop.js':'export const host=1;',
      'src/games/shift.js':'export const shift=1;',
      'src/games/courtyard.js':'export const courtyard=1;',
      'src/games/courier.js':'export const courier=1;',
      'src/scenarios/index.js':'export const scenarios=[];',
      'research/private.md':'private research',
      'research/courtyard-1-move-18.json':'private user game snapshot',
      '.env':'secret fixture',
      'dist/stale-secret.json':'old output',
      'web/private.json':'unpublished data',
      'web/private.html':'private HTML must not enter the public build'
    }))await writeFile(join(root,path),body);
    const built=await buildSite({root});
    const files=await readdir(join(root,'dist'),{recursive:true});
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('web/app.js'));
    assert.ok(files.includes('src/core/index.js'));
    assert.ok(files.includes('src/legacy/v0.1/index.js'));
    assert.ok(files.includes('src/scenarios/index.js'));
    assert.ok(files.includes('workshop/index.html'));
    assert.ok(files.includes('web/workshop.js'));
    assert.ok(files.includes('src/human/index.js'));
    assert.ok(files.includes('src/runtime/clock.js'));
    assert.ok(files.includes('src/games/commons.js'));
    assert.ok(files.includes('src/games/workshop.js'));
    assert.ok(files.includes('src/legacy/v0.2/index.js'));
    for(const route of ['games','shift','courtyard','courier','commons']) {
      assert.ok(files.includes(`${route}/index.html`),`${route} has an explicit public entry`);
      assert.equal(await readFile(join(root,`dist/${route}/index.html`),'utf8'),await readFile(join(root,`web/${route}.html`),'utf8'));
    }
    assert.equal(files.some(p=>/secret|private|\.env|research|courtyard-1-move-18/.test(p)),false);
    assert.match(await readFile(join(root,'dist/_headers'),'utf8'),/Content-Security-Policy/);
    assert.match(await readFile(join(root,'dist/_headers'),'utf8'),/Cache-Control: no-cache/);
    assert.match(await readFile(join(root,'dist/_headers'),'utf8'),/no-transform/);
    const digest=createHash('sha256');
    for(const file of built.files.filter(p=>p!=='release.json').sort())digest.update(file).update('\0').update(await readFile(join(root,'dist',file))).update('\0');
    assert.equal(built.release.assetsSha256,digest.digest('hex'),'release identity includes deployed headers as well as page assets');
    assert.equal(built.release.appVersion,'0.4.0','site version is separate from the unchanged laboratory engine');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('deployment refuses symlinked public roots, their ancestors, and the entry page',async()=>{
  for(const redirect of ['web','src','src/legacy','index.html','web/workshop.html','web/games.html','web/shift.html','web/courtyard.html','web/courier.html','web/commons.html','src/runtime']) {
    const root=await mkdtemp(join(tmpdir(),'human-build-links-'));
    try {
      for(const path of ['web','src/core','src/scenarios','src/human','src/runtime','src/games','src/legacy/v0.1','src/legacy/v0.2','research','research/core','research/scenarios','research/v0.1'])await mkdir(join(root,path),{recursive:true});
      await writeFile(join(root,'index.html'),'public');
      await writeFile(join(root,'web/workshop.html'),'public game');
      for(const route of ['games','shift','courtyard','courier','commons'])await writeFile(join(root,`web/${route}.html`),'public game');
      await writeFile(join(root,'research/private.js'),'private research');
      await writeFile(join(root,'research/private.html'),'private research');
      await rm(join(root,redirect),{recursive:true,force:true});
      await symlink(join(root,redirect.endsWith('.html')?'research/private.html':'research'),join(root,redirect));
      await assert.rejects(()=>buildSite({root}),/symlink|public source/i);
    } finally {await rm(root,{recursive:true,force:true});}
  }
});
