import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../scripts/serve.js';

test('local server serves the app and modules but refuses traversal and symlink escape',async t=>{
  const root=await mkdtemp(join(tmpdir(),'human-framework-server-'));
  await mkdir(join(root,'src'));
  await mkdir(join(root,'web'));
  await writeFile(join(root,'web/workshop.html'),'<h1>Workshop</h1>');
  for(const route of ['games','shift','courtyard','courier','commons','commons-next','watch','signals'])await writeFile(join(root,`web/${route}.html`),`<h1>${route}</h1>`);
  await writeFile(join(root,'web/private.html'),'sensitive test fixture');
  await writeFile(join(root,'index.html'),'<h1>Laboratory</h1>');
  await writeFile(join(root,'src','model.js'),'export const model = 1;');
  await writeFile(join(root,'private.json'),'sensitive test fixture');
  await symlink(join(root,'private.json'),join(root,'src','escape.js'));
  const server=createAppServer({root});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}`;
  const page=await fetch(base);
  assert.equal(page.status,200);assert.match(await page.text(),/Laboratory/);
  const workshop=await fetch(`${base}/workshop`);
  assert.equal(workshop.status,200);assert.match(await workshop.text(),/Workshop/);
  for(const route of ['games','shift','courtyard','courier','commons','commons-next','watch','signals'])for(const suffix of ['','/']) {
    const response=await fetch(`${base}/${route}${suffix}`);
    assert.equal(response.status,200,route+suffix);assert.equal(await response.text(),`<h1>${route}</h1>`);
  }
  const module=await fetch(`${base}/src/model.js`);
  assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);
  for(const path of ['/private.json','/web/private.html','/src/../private.json','/src/%2e%2e%2fprivate.json','/src/escape.js','/.env']) {
    const response=await fetch(base+path);
    assert.ok([403,404].includes(response.status),`${path} returned ${response.status}`);
    assert.doesNotMatch(await response.text(),/sensitive test fixture/);
  }
  assert.equal((await fetch(base,{method:'POST'})).status,405);
  assert.equal(await (await fetch(base,{method:'HEAD'})).text(),'');
});
