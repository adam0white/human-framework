import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createAppServer} from '../../scripts/serve.js';
import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=resolve(process.env.UI_OUTPUT??'artifacts/player-interface');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.UI_BASE??`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:375,height:667},acceptDownloads:true}),page=await context.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const stored=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
async function open(route){await page.goto(base+'/'+route+'/');await page.locator('.game-tabs').waitFor();}
async function reveal(selector){
 const el=page.locator(selector).first();
 const info=await el.evaluate(e=>({panel:e.closest('[role="tabpanel"]')?.getAttribute('aria-labelledby'),details:[...function*(n){while(n){if(n.tagName==='DETAILS')yield n;n=n.parentElement;}}(e)].map(n=>n.id||null)}));
 if(info.panel)await page.locator('#'+info.panel).click();
 await el.evaluate(e=>{for(let n=e.parentElement;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;});
 return el;
}
async function click(selector){await (await reveal(selector)).click();}
async function tabsPreserve(label){const before=await stored();for(const tab of await page.getByRole('tab').all())await tab.click();assert.deepEqual(await stored(),before,label+': navigation changes world');}
async function dockFits(label){const m=await page.locator('.game-dock').boundingBox();assert.ok(m.y>=0&&m.y+m.height<=667.5,label+': dock outside375x667');assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),667,label+': document scrolls');}
async function controlsFit(selector,label){const values=await page.locator(selector).evaluateAll(nodes=>nodes.map(node=>({bottom:node.getBoundingClientRect().bottom,panelBottom:node.closest('[role="tabpanel"]').getBoundingClientRect().bottom})));assert.ok(values.length>0);assert.ok(values.every(v=>v.bottom<=v.panelBottom),label+': ordinary decision is below selected viewport');}
async function roundTrip(downloadSelector,loadSelector,key,label){
 await reveal(downloadSelector);const before=(await stored())[key],download=page.waitForEvent('download');await page.locator(downloadSelector).click();const file=await download,path=resolve(out,label+'-save.json');await file.saveAs(path);
 await page.locator(loadSelector).setInputFiles(path);await page.waitForFunction(id=>document.querySelector(id).value==='',loadSelector);assert.equal((await stored())[key],before,label+': downloaded save/import mismatch');
 await page.reload();await page.locator('.game-tabs').waitFor();assert.equal((await stored())[key],before,label+': reload changed save');
 checks.push(label+': downloaded save, reimport and paused reload preserve exact bytes');
}
try{
 // Collection: a short first game, every direct destination and full keyboard access.
 await page.goto(base+'/games/');await page.locator('#game-choice').waitFor();assert.equal(await page.locator('a.game:visible').getAttribute('href'),'/workshop/');
 assert.equal(await page.locator('#game-choice option').count(),10);
 for(let i=0;i<10;i++){await page.locator('#game-choice').selectOption(String(i));assert.equal(await page.locator('a.game:visible').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),667);}
 await page.locator('#game-choice').selectOption('0');await page.screenshot({animations:'disabled',path:resolve(out,'collection-375.png')});
 await page.setViewportSize({width:1280,height:800});await page.getByRole('tab').first().focus();await page.keyboard.press('End');assert.equal(await page.locator('a.game:visible').getAttribute('href'),'/service-plan/');await page.screenshot({animations:'disabled',path:resolve(out,'collection-1280.png')});await page.setViewportSize({width:375,height:667});checks.push('Collection: suggested first job, ten options, desktop keyboard and no normal viewport document scroll');
 // First three games: an actually pending action survives navigation, stop and saves.
 for(const [route,key,download,load] of [['workshop','human-workshop-v0.1','#save','#import'],['shift','human-pump-shift-v0.1','#download','#import'],['courier','human-courier-active-v1','#save','#load']]){
  await open(route);if(route!=='workshop')await (await reveal('#interval-mode')).check();
  await click('#actions button:not(:disabled)');await page.locator('#finish').waitFor({state:'visible'});await dockFits(route+' pending');
  await click('#advance');await tabsPreserve(route+' paid pending');await roundTrip(download,load,key,route+'-pending');
  await page.getByRole('tab').nth(1).click();await page.locator('#interrupt').click();assert.equal(await page.locator('#finish').isVisible(),false,route+': Stop still leaves pending control');
  if(route!=='workshop'){await click(route==='shift'?'#end-shift':'#end-round');await page.locator('#outcome').waitFor({state:'visible'});assert.match(await page.getByRole('tab',{selected:true}).innerText(),/Result/);await dockFits(route+' result');}
  checks.push(route+': actual paid interval, tab-stable pending action, reachable Stop and result controls');
 }
 // Courtyard: moved social controls still close at the end; immediate consequences remain visible.
 await open('courtyard');assert.equal(await page.locator('.hud-feedback').getAttribute('hidden'),null);assert.equal(await page.locator('.hud-feedback').textContent(),'');await click('#work-actions button:not(:disabled)');assert.ok(await page.locator('.hud-feedback').isVisible());assert.match(await page.locator('.hud-feedback').textContent(),/You:.*Meryem:/);
 await tabsPreserve('courtyard after turn');await roundTrip('#download-save','#load-save','human-courtyard-0.1','courtyard');
 for(let i=0;i<18&&!await page.locator('#outcome').isVisible();i++){await click('#recovery-actions button:not(:disabled)');}
 assert.equal(await page.locator('#outcome').isVisible(),true);assert.equal(await page.locator('.hud-clock span').innerText(),'tap closed');await page.reload();await page.locator('.game-tabs').waitFor();assert.equal(await page.evaluate(()=>document.activeElement===document.body),true);await page.getByRole('tab').nth(1).click();assert.equal(await page.locator('.talk').isVisible(),false);await dockFits('courtyard ended');await click('#again');assert.equal(await page.getByRole('tab',{selected:true}).innerText(),'Actions');assert.ok(await page.locator('#work-actions button').first().isVisible());for(const action of ['draw-careful','pour','draw-careful'])await click('[data-action="'+action+'"]');assert.equal(await page.locator('#accept').isVisible(),true);assert.equal(await page.locator('#accept').evaluate(e=>e===document.activeElement),true);checks.push('Courtyard: immediate consequence feedback, end controls close, new afternoon restores Actions, and new proposal reveals/focuses Accept');
 // Common Ground and Rain: paid concurrent work, persistent Stop and exact save continuity.
 for(const [route,key] of [['commons','human-common-ground-v1'],['commons-next','human-common-ground-before-rain-v1']]){
  await open(route);await click('#gather-choices [data-job="gather-timber"]');await click('#request');if(route==='commons-next'){await page.locator('#game-tab-0').click();await controlsFit('#game-panel-0 [data-job]','Rain active work');await page.screenshot({animations:'disabled',path:resolve(out,'rain-active-fit-375.png')});}await page.locator('#next-event').click();
  await tabsPreserve(route+' concurrent paid work');await dockFits(route+' concurrent');await roundTrip('#download','#load',key,route+'-concurrent');
  await click('#gather-choices [data-job="rest"]');await page.getByRole('tab').nth(2).click();await page.locator('#cancel').click();assert.equal(await page.locator('#cancel').isVisible(),false);await dockFits(route+' cancel');
  checks.push(route+': concurrent paid work and rest can be stopped from a different tab');
 }
 // Rain finite checkpoint and final allocation remain actual reachable choices.
 await open('commons-next');for(let i=0;i<20&&await page.locator('#next-event').isEnabled();i++)await page.locator('#next-event').click();
 assert.equal(await page.locator('#checkpoint').isVisible(),true);assert.equal(await page.getByRole('tab',{selected:true}).innerText(),'Caches');await page.reload();await page.locator('.game-tabs').waitFor();assert.equal(await page.evaluate(()=>document.activeElement===document.body),true);await click('#continue');
 for(let i=0;i<20&&await page.locator('#next-event').isEnabled();i++)await page.locator('#next-event').click();await click('#continue');await page.locator('#result').waitFor({state:'visible'});await dockFits('rain end');checks.push('Rain: both finite checkpoints reveal allocation/continue; final result remains visible');
 // Watch: preserved three-minute paid recovery route, with independent actor tabs.
 await open('watch');await (await reveal('#scenario')).selectOption('short');await click('#restart');
 for(const selector of ['#keeper-repair','#watcher-watch','#next-event','#keeper-repair','#watcher-share','#next-event','#next-event','#keeper-rest','#one-minute','#one-minute','#one-minute','#keeper-stop','#keeper-repair','#next-event','#next-event'])await click(selector);
 const watch=JSON.parse((await stored())['human-before-the-water-v1']);assert.equal(watch.state.paid.rest,3);assert.equal(watch.state.outcome.waterService,true);await dockFits('watch success');await page.screenshot({animations:'disabled',path:resolve(out,'watch-short-success-375.png')});checks.push('Watch: unchanged short-notice success with exactly three paid and interrupted rest minutes');
 // Last Light: delivered report pauses concurrent canal work; unread badge clears after reading.
 await open('signals');await controlsFit('#routes .choice-note','Last Light opening consequences');for(const selector of ['#action-radio','#next-event','#action-lookout','#next-event','#action-canal','#next-event'])await click(selector);
 assert.equal(await page.locator('#minute').textContent(),'06');assert.match(await page.locator('.hud-alert').textContent(),/Notebook:/);assert.equal(await page.locator('#game-tab-1').getAttribute('aria-label'),'Notebook · new update');
 await page.locator('#game-tab-1').click();assert.equal(await page.locator('#game-tab-1').getAttribute('aria-label'),null);await tabsPreserve('signals report pause');await roundTrip('#download','#load','human-last-light-v1','signals-active-report');
 await page.locator('#next-event').click();assert.match(await page.locator('#outcome-title').textContent(),/launch sails/);
 // Arrival at exactly12 is a valid overnight beacon and a missed launch, not a physics change.
 await (await reveal('#situation')).selectOption('steady');await click('#restart');for(let i=0;i<6;i++)await page.locator('#one-minute').click();await reveal('#action-canal');await controlsFit('#routes .choice-note','Last Light minute6 consequences');assert.match(await page.locator('#note-canal').textContent(),/arrival 12.*Misses the evening launch/);
 await page.locator('#action-canal').click();await page.locator('#next-event').click();await page.locator('#outcome').waitFor({state:'visible'});const signals=JSON.parse((await stored())['human-last-light-v1']);assert.equal(signals.state.outcome.at,12);assert.equal(signals.state.outcome.delivered,true);assert.equal(signals.state.outcome.launchSailed,false);await page.screenshot({animations:'disabled',path:resolve(out,'signals-exact12-375.png')});checks.push('Last Light: paid report pause and read badge; arrival12 still restores overnight beacon and misses exclusive launch deadline');
 // Service Day has accessible independent work, stop and separate save continuity.
 await open('service');await click('#keeper-gate');assert.match(await page.locator('#partner-job').textContent(),/clinic commitment/i);await page.locator('#one-minute').click();await tabsPreserve('service concurrent');await roundTrip('#download','#load','human-service-day-v1','service-pending');await page.getByRole('tab').nth(2).click();await page.locator('#keeper-stop').click();await dockFits('service stopped');checks.push('Service Day: concurrent independent work and stop from Sites; exact save continuity');
 // Shared Promise: draft terms, discussion, unilateral cancel/withdraw and paid work stay distinct.
 await open('service-plan');assert.equal(await page.locator('#cancel-discussion').isVisible(),false);await click('#plan-options summary');await click('#propose');assert.equal(await page.locator('#cancel-discussion').isVisible(),true);await tabsPreserve('shared promise discussion');await page.locator('#one-minute').click();await page.getByRole('tab').first().click();await page.locator('#cancel-discussion').click();assert.equal(await page.locator('#cancel-discussion').isVisible(),false);await click('#restart');await click('#propose');await page.locator('#next-event').click();await page.locator('#withdraw').waitFor({state:'visible'});await dockFits('shared promise accepted');await roundTrip('#download','#load','human-shared-promise-v1','promise-accepted');assert.equal(await page.locator('.withdraw-context').isVisible(),true);assert.match(await page.locator('.withdraw-context').textContent(),/existing jobs continue/);assert.match(await page.locator('#withdraw').getAttribute('aria-describedby'),/withdraw-detail/);await page.locator('#withdraw').click();await page.screenshot({animations:'disabled',path:resolve(out,'promise-withdrawn-375.png')});checks.push('Shared Promise: discussion cancel, paid acceptance, exact save and unilateral withdrawal stay reachable from other tabs');
 await open('service-plan');await click('#restart');await page.locator('#play').click();const readingBefore=JSON.stringify(await stored());await page.getByRole('tab').last().click();await page.locator('.episode-overview summary').click();assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');await page.waitForTimeout(1150);assert.equal(JSON.stringify(await stored()),readingBefore);checks.push('New Save/About reading surface pauses playback through existing controls without advancing or changing saved world');
 // High zoom equivalence/very short viewport: document fallback preserves every panel and dock.
 for(const route of ['commons-next','signals','service-plan']){await open(route);await page.setViewportSize({width:320,height:400});for(const tab of await page.getByRole('tab').all())await tab.click();await page.locator('#one-minute').count()&&await page.locator('#one-minute').scrollIntoViewIfNeeded();await page.locator('.game-dock').scrollIntoViewIfNeeded();assert.ok((await page.locator('.game-dock').boundingBox()).height>0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.setViewportSize({width:375,height:667});}checks.push('320x400 short/zoom-equivalent fallback keeps all tabs and control dock reachable');
 const storageContext=await browser.newContext({viewport:{width:375,height:667}}),storagePage=await storageContext.newPage();await storagePage.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Synthetic quota failure','QuotaExceededError');};});await storagePage.goto(base+'/workshop/');await storagePage.locator('#actions button').first().click();assert.match(await storagePage.locator('.hud-alert').innerText(),/storage unavailable/i);assert.equal(await storagePage.getByRole('tab',{selected:true}).innerText(),'Actions');await storageContext.close();checks.push('Late review: live feedback remains mounted; ended/checkpoint reload avoids focus theft; dynamic tap caption and withdrawal consequence remain visible; synthetic storage failure is exposed outside Save');
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'flows-result.json'),JSON.stringify({synthetic:true,base,browser:browser.version(),checks,errors},null,2)+'\n');console.log('PASS: '+checks.length+' active-flow, save, endpoint and accessibility checks');
}catch(error){await page.screenshot({animations:'disabled',path:resolve(out,'flow-failure.png')});await writeFile(resolve(out,'flow-failure.json'),JSON.stringify({url:page.url(),error:String(error),checks,errors},null,2));throw error;}
finally{await browser.close();await new Promise(r=>server.close(r));}
