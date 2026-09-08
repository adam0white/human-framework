// Adapted from the preserved release-0.7 existing-games and Signals browser harnesses.
// Run: node artifacts/release-0.9/browser-regression.mjs <base URL> <new output directory>
import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const base=(process.argv[2]??'http://127.0.0.1:4192').replace(/\/$/,''),out=resolve(process.argv[3]??`/tmp/hf-release-09-browser-${Date.now()}`);
assert.ok(['http:','https:'].includes(new URL(base).protocol),'Use an HTTP(S) base URL');
await mkdir(out); // Deliberately fails if evidence already exists.
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),page=await context.newPage();
const errors=[],failedRequests=[],failedResponses=[],prefetchRefusals=[],networkChecks=[],navigation=[],checks=[],scriptResponses=[];
const games=[
 {route:'service-plan',heading:'A Shared Promise',ready:'#discuss-label'},
 {route:'service',heading:'Service Day',ready:'#keeper-gate'},
 {route:'signals',heading:'Last Light',ready:'#action-canal'},
 {route:'watch',heading:'Before the Water',ready:'#keeper-repair'},
 {route:'commons-next',heading:'Before the rain',ready:'#opening-actions button'},
 {route:'commons',heading:'Common Ground',ready:'#opening-jobs button'},
 {route:'shift',heading:'Pump Yard.',ready:'#actions button'},
 {route:'courtyard',heading:'The last water',ready:'#work-actions button'},
 {route:'courier',heading:'Courier Round',ready:'#actions button'},
 {route:'workshop',heading:'Before departure',ready:'#actions button'}
];
page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
page.on('requestfailed',request=>failedRequests.push({url:request.url(),navigation:request.isNavigationRequest(),resource:request.resourceType(),error:request.failure()?.errorText??null}));
page.on('response',response=>{
 const request=response.request();
 if(request.resourceType()==='script'&&response.status()>=200&&response.status()<400)scriptResponses.push(new URL(response.url()).pathname);
 if(response.status()<400)return;
 networkChecks.push((async()=>{
  const headers=await response.allHeaders(),requestHeaders=await request.allHeaders();
  const item={url:response.url(),status:response.status(),resource:request.resourceType(),navigation:request.isNavigationRequest(),purpose:requestHeaders['sec-purpose']??null,refusal:headers['cf-speculation-refused']??null};
  const speculative=item.status===503&&!item.navigation&&item.resource==='other'&&/(?:^|[\s;,])prefetch(?:$|[\s;,])/i.test(item.purpose??'')&&item.refusal==='prefetch refused: disabled for worker requests';
  (speculative?prefetchRefusals:failedResponses).push(item);
 })().catch(error=>errors.push({url:response.url(),message:'Could not classify failed HTTP response: '+error.message})));
});
const saved=key=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),rainKey='human-common-ground-before-rain-v1',watchKey='human-before-the-water-v1',signalsKey='human-last-light-v1';
const loadJSON=async object=>{await page.locator('#load').setInputFiles({name:'qa-save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(object))});await page.waitForFunction(()=>document.getElementById('load').value==='');};
const step=()=>page.locator('#next-event').click();
async function noOverflow(scope){
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${scope}: horizontal overflow at ${width}`);
 }
 await page.setViewportSize({width:390,height:844});
}
async function drainNetwork(){let finished=0;while(finished<networkChecks.length){const end=networkChecks.length;await Promise.all(networkChecks.slice(finished,end));finished=end;}}
let failure=null;
try{
 await page.goto(base+'/games/');
 assert.equal(await page.locator('a.game').count(),10);
 assert.deepEqual((await page.locator('a.game').evaluateAll(elements=>elements.map(e=>e.getAttribute('href')))).sort(),games.map(g=>`/${g.route}/`).sort());
 assert.equal(await page.locator('details[open]').count(),0);
 await noOverflow('gallery');await page.screenshot({path:resolve(out,'gallery-390.png'),fullPage:true});
 await page.setViewportSize({width:1280,height:844});await page.screenshot({path:resolve(out,'gallery-1280.png'),fullPage:true});await page.setViewportSize({width:390,height:844});
 checks.push('Gallery exposes exactly the ten expected game destinations, with collapsed notes and no horizontal overflow at 320/390/1280.');
 for(const game of games){
  await page.goto(base+'/games/');const scriptsFrom=scriptResponses.length;
  await page.locator(`a.game[href="/${game.route}/"]`).click();
  await page.locator(game.ready).first().waitFor({state:'visible'});
  assert.equal(new URL(page.url()).pathname,`/${game.route}/`);
  const heading=(await page.locator('h1').innerText()).replace(/\s+/g,' ').trim();assert.equal(heading,game.heading);
  const modules=[...new Set(scriptResponses.slice(scriptsFrom))].sort();
  assert.ok(modules.includes(`/web/${game.route}.js`),`${game.route}: browser loaded entry module`);
  assert.ok(modules.includes(`/src/games/${game.route}.js`),`${game.route}: browser loaded host module`);
  await noOverflow(game.route);await page.screenshot({path:resolve(out,game.route+'-opening-390.png'),fullPage:true});
  navigation.push({route:`/${game.route}/`,heading,generatedControls:await page.locator(game.ready).count(),modules,noHorizontalOverflow:[320,390,1280]});
 }
 checks.push('Clicked every gallery card and verified destination, exact heading, generated controls, successful entry/host module responses, and 320/390/1280 layout.');

 // Rain: actual concurrent work and downloaded mid-run state survive imports/reload.
 await page.goto(base+'/commons-next/');await page.locator('#opening-actions button').first().waitFor();
 await page.locator('#opening-actions [data-job="gather-timber"]').focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Ask Meryem for a cache',exact:true}).click();
 let rain=await saved(rainKey);assert.ok(rain.game.world.jobs.player&&rain.game.world.jobs.neighbor);
 await step();rain=await saved(rainKey);assert.equal(rain.game.world.clock.now-rain.game.openedAt,15);
 const rainBefore=JSON.stringify(rain),rainDownload=page.waitForEvent('download');await page.locator('#download').click();
 const rainFile=await rainDownload,rainPath=resolve(out,'rain-minute15.json');await rainFile.saveAs(rainPath);assert.match(rainFile.suggestedFilename(),/before-rain/);
 await loadJSON({format:'wrong'});await page.getByText(/Save was not loaded/).waitFor();assert.equal(JSON.stringify(await saved(rainKey)),rainBefore);
 await page.locator('#load').setInputFiles(rainPath);await page.waitForFunction(()=>document.getElementById('notice').hidden);
 assert.equal(JSON.stringify(await saved(rainKey)),rainBefore);await page.reload();await page.locator('#time-status').waitFor();
 assert.match(await page.locator('#time-status').innerText(),/Paused/);assert.equal(JSON.stringify(await saved(rainKey)),rainBefore);
 await page.screenshot({path:resolve(out,'rain-concurrent-minute15-390.png'),fullPage:true});
 await page.goto(base+'/commons/');await page.locator('#opening-jobs button').first().waitFor();assert.equal(JSON.stringify(await saved(rainKey)),rainBefore);
 checks.push('Rain: keyboard-started work and accepted concurrent cache request pay 15 minutes; actual download/import, invalid import and paused reload preserve state; original Common Ground keeps its separate save.');

 // Watch: the preserved short-notice route depends on three actual paid rest minutes.
 await page.goto(base+'/watch/');await page.locator('#keeper-repair').waitFor();
 await page.locator('#watcher-share').click();assert.match(await page.locator('#watcher-response').innerText(),/keeping my spare/);
 let watch=await saved(watchKey);assert.equal(watch.state.clock.now,0);assert.deepEqual(watch.state.parts,{keeper:2,watcher:1});
 await page.getByText('Start a new episode',{exact:true}).click();await page.locator('#scenario').selectOption('short');await page.locator('#restart').click();
 await page.locator('#keeper-repair').click();await page.locator('#watcher-watch').click();await step();assert.equal((await saved(watchKey)).state.clock.now,6);
 await page.locator('#keeper-repair').click();await page.locator('#watcher-share').click();await step();assert.equal((await saved(watchKey)).state.clock.now,8);await step();assert.equal((await saved(watchKey)).state.clock.now,12);
 await page.locator('#keeper-rest').evaluate(element=>element.closest('details').open=true);await page.locator('#keeper-rest').click();
 for(let i=0;i<3;i++)await page.locator('#one-minute').click();
 assert.equal((await saved(watchKey)).state.clock.now,15);await page.locator('#keeper-stop').click();await page.locator('#keeper-repair').click();await step();assert.equal((await saved(watchKey)).state.clock.now,21);await step();
 watch=await saved(watchKey);assert.equal(watch.state.clock.now,22);assert.equal(watch.state.outcome.waterService,true);assert.equal(watch.state.paid.rest,3);
 assert.equal(JSON.stringify(await saved(rainKey)),rainBefore);await page.screenshot({path:resolve(out,'watch-short-success-390.png'),fullPage:true});
 checks.push('Watch: owned-part refusal is free; short-notice repair succeeds through actual buttons with precisely three interrupted paid rest minutes; Rain save remains separate.');

 // Last Light: paid reports retain the newer observation, and canal work continues across a stale receipt.
 await page.goto(base+'/signals/');await page.locator('#action-canal').waitFor();
 await page.locator('#action-radio').click();await step();assert.equal(await page.locator('#minute').textContent(),'01');
 await page.locator('#action-lookout').click();await step();assert.equal(await page.locator('#report-value').textContent(),'open');
 await page.locator('#action-canal').click();await step();assert.equal(await page.locator('#minute').textContent(),'06');
 assert.equal(await page.locator('#report-value').textContent(),'open');assert.match(await page.locator('#job').textContent(),/canal/);
 await page.locator('#receipt-details').evaluate(element=>element.open=true);assert.match(await page.locator('#receipts').textContent(),/older than your notebook/);
 await step();assert.equal(await page.locator('#minute').textContent(),'10');assert.match(await page.locator('#outcome-title').textContent(),/launch sails/);
 const signalsBefore=JSON.stringify(await saved(signalsKey));await page.reload();await page.locator('#outcome-title').waitFor();assert.equal(JSON.stringify(await saved(signalsKey)),signalsBefore);assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 await page.screenshot({path:resolve(out,'signals-stale-report-launch-390.png'),fullPage:true});
 checks.push('Last Light: paid radio/lookout, older late receipt, concurrent canal work and minute-10 launch are preserved; ended reload remains paused and exact.');
 await drainNetwork();assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);assert.deepEqual(failedResponses,[]);
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};}
finally{
 await drainNetwork();
 const report={status:failure||errors.length||failedRequests.length||failedResponses.length?'failed':'passed',checkedAt:new Date().toISOString(),origin:base,browser:browser.version(),scope:'Actual gallery navigation, all ten game entry/host modules and rendered controls; representative prior Rain/Watch/Last Light flows. Isolated desktop Chrome at mobile viewport sizes, not physical-device or human-play evidence. Full Service Day gameplay is covered separately by artifacts/service-day/browser-qa.mjs.',viewports:[320,390,1280],checks,navigation,errors,failedRequests,failedResponses,prefetchRefusals,failure};
 await writeFile(resolve(out,'browser.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,...report},null,2));
 await context.close();await browser.close();
}
if(failure||errors.length||failedRequests.length||failedResponses.length)process.exitCode=1;
