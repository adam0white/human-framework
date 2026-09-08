import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createAppServer} from '../../scripts/serve.js';
import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const out=resolve(process.env.UI_OUTPUT??'artifacts/player-interface');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.UI_BASE??`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:375,height:667},acceptDownloads:true});
const page=await context.newPage(),errors=[],checks=[],screenshots=[];
page.on('pageerror',e=>errors.push(e.message));
const games=['workshop','shift','courier','courtyard','commons','commons-next','watch','signals','service','service-plan'];
const storage=()=>page.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort()));
async function fit(label){
 const m=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,panels:[...document.querySelectorAll('[role="tabpanel"]')].filter(e=>!e.hidden).length,dock:document.querySelector('.game-dock')?.getBoundingClientRect().toJSON()}));
 assert.ok(m.scrollWidth<=m.width,`${label}: document horizontal overflow ${JSON.stringify(m)}`);
 assert.ok(m.scrollHeight<=m.height+1,`${label}: document vertical overflow ${JSON.stringify(m)}`);
 assert.equal(m.panels,1,`${label}: exactly one selected panel`);
 if(m.dock)assert.ok(m.dock.bottom<=m.height+1&&m.dock.top>=0,`${label}: dock fits`);
 const panel=await page.locator('[role="tabpanel"]:visible').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(panel.scroll<=panel.width+1,`${label}: selected panel horizontal overflow ${JSON.stringify(panel)}`);
 return m;
}
try{
 for(const route of games){
  await page.goto(base+'/'+route+'/');await page.locator('.game-tabs').waitFor({state:'visible',timeout:3000});
  const before=await storage(),tabs=page.getByRole('tab'),n=await tabs.count();assert.ok(n>=3&&n<=5);
  for(let i=0;i<n;i++){
   await tabs.nth(i).click();assert.equal(await tabs.nth(i).getAttribute('aria-selected'),'true');
   assert.equal(await storage(),before,`${route}: tab ${i} mutates saved world`);
   await fit(route+' tab '+i);
  }
  await tabs.first().focus();await page.keyboard.press('ArrowRight');
  assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');
  assert.equal(await tabs.nth(1).evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('End');assert.equal(await tabs.last().getAttribute('aria-selected'),'true');
  await page.keyboard.press('Home');assert.equal(await tabs.first().getAttribute('aria-selected'),'true');
  for(const viewport of [{width:375,height:667},{width:390,height:844},{width:1280,height:800}]){
   await page.setViewportSize(viewport);await fit(route+' '+viewport.width);
   const file=route+'-'+viewport.width+'.png';await page.mouse.move(0,0);await page.screenshot({animations:'disabled',path:resolve(out,file)});screenshots.push(file);
  }
  checks.push({route,tabs:n,savedWorldUnchanged:true,keyboard:true,viewports:[375,390,1280]});
  await page.setViewportSize({width:375,height:667});
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'result.json'),JSON.stringify({synthetic:true,base,browser:browser.version(),checks,screenshots,errors},null,2)+'\n');
 console.log('PASS: '+checks.length+' games, state-preserving keyboard tabs and three viewport sizes.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
