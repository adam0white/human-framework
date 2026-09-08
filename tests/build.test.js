import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,writeFile,mkdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildSite} from '../scripts/build.js';
import {PUBLIC_PAGES} from '../scripts/public-pages.js';

test('an unpublished static dependency blocks build before the previous output is cleared',async()=>{
  const root=await mkdtemp(join(tmpdir(),'human-build-graph-'));
  try{
    for(const path of ['web','src/core','src/scenarios','src/human','src/runtime','src/games','src/legacy/v0.1','src/legacy/v0.2','src/cognition','dist'])await mkdir(join(root,path),{recursive:true});
    for(const source of Object.values(PUBLIC_PAGES))await writeFile(join(root,source),'public page');
    await writeFile(join(root,'package.json'),'{"version":"0.7.0"}');
    await writeFile(join(root,'web/app.js'),'import "../src/cognition/private.js";');
    await writeFile(join(root,'src/cognition/private.js'),'export const secret=1;');
    await writeFile(join(root,'dist/previous.txt'),'previous build remains');
    await assert.rejects(()=>buildSite({root}),/private|unavailable/i);
    assert.equal(await readFile(join(root,'dist/previous.txt'),'utf8'),'previous build remains');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('deployment contains the playable module graph and excludes private project files',async()=>{
  const root=await mkdtemp(join(tmpdir(),'human-build-'));
  try {
    for(const path of ['web','src/core','src/scenarios','src/human','src/runtime','src/games','src/legacy/v0.1','src/legacy/v0.2','src/cognition','src/coordination','research','dist'])await mkdir(join(root,path),{recursive:true});
    for(const source of Object.values(PUBLIC_PAGES))await writeFile(join(root,source),'public page');
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
      'web/commons-next.html':'<script type="module" src="/web/commons-next.js"></script>',
      'web/watch.html':'<script type="module" src="/web/watch.js"></script>',
      'web/signals.html':'<script type="module" src="/web/signals.js"></script>',
      'web/service.html':'<script type="module" src="/web/service.js"></script>',
      'web/service-plan.html':'<script type="module" src="/web/service-plan.js"></script>',
      'web/camp.html':'<script type="module" src="/web/camp.js"></script>',
      'web/camp.js':"import '../src/games/camp-story.js';",
      'src/games/camp-story.js':"import './camp.js';",
      'src/games/camp.js':"import '../runtime/clock.js';",
      'src/coordination/attempt-clock.js':'private experimental helper',
      'src/cognition/observation-memory.js':'private experimental memory',
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
    for(const [output,source] of Object.entries(PUBLIC_PAGES)) {
      assert.ok(files.includes(output),`${output} has an explicit public entry`);
      assert.equal(await readFile(join(root,'dist',output),'utf8'),await readFile(join(root,source),'utf8'));
    }
    assert.equal(files.some(p=>/secret|private|\.env|research|courtyard-1-move-18|cognition|coordination/.test(p)),false);
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
  for(const redirect of ['web','src','src/legacy',...new Set(Object.values(PUBLIC_PAGES)),'src/runtime']) {
    const root=await mkdtemp(join(tmpdir(),'human-build-links-'));
    try {
      for(const path of ['web','src/core','src/scenarios','src/human','src/runtime','src/games','src/legacy/v0.1','src/legacy/v0.2','research','research/core','research/scenarios','research/v0.1'])await mkdir(join(root,path),{recursive:true});
      for(const source of Object.values(PUBLIC_PAGES))await writeFile(join(root,source),'public game');
      await writeFile(join(root,'research/private.js'),'private research');
      await writeFile(join(root,'research/private.html'),'private research');
      await rm(join(root,redirect),{recursive:true,force:true});
      await symlink(join(root,redirect.endsWith('.html')?'research/private.html':'research'),join(root,redirect));
      await assert.rejects(()=>buildSite({root}),/symlink|public source/i);
    } finally {await rm(root,{recursive:true,force:true});}
  }
});
