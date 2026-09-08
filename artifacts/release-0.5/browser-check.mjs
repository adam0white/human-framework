import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.argv[2]??'http://127.0.0.1:4188',label=process.argv[3]??'local';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
const errors=[],failedRequests=[],prefetchRefusals=[],networkChecks=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)networkChecks.push((async()=>{
 const headers=await r.allHeaders(),requestHeaders=await r.request().allHeaders();
 const item={url:r.url(),status:r.status(),resource:r.request().resourceType(),navigation:r.request().isNavigationRequest(),purpose:requestHeaders['sec-purpose']??null,refusal:headers['cf-speculation-refused']??null,ray:headers['cf-ray']??null};
 // Cloudflare explicitly refuses speculative prefetches on Worker routes.
 // Keep the observation; never exempt an actual document or module failure.
 const knownPrefetch=item.status===503&&!item.navigation&&item.resource==='other'&&/prefetch/i.test(item.purpose??'')&&item.refusal==='prefetch refused: disabled for worker requests';
 (knownPrefetch?prefetchRefusals:failedRequests).push(item);
})());});
const game=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('human-common-ground-v1'))?.game);
const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
try{
 await page.goto(base+'/games/');assert.equal(await page.locator('a.game').count(),5);assert.equal(await page.locator('details[open]').count(),0);
 await page.locator('a.game[href="/commons/"]').click();await page.locator('#opening-jobs [data-job="gather-timber"]').waitFor();
 assert.equal(await page.locator('details[open]').count(),0);assert.match(await page.locator('#time-status').innerText(),/Paused/);
 const openingBox=await page.locator('#opening-jobs').boundingBox();assert.ok(openingBox.y<844,'opening action should be visible without searching through lower panels');checks.push('Five-game chooser, paused first view, visible opening choices');
 await page.locator('#opening-jobs [data-job="gather-timber"]').click();await page.locator('#request').click();
 let state=await game();assert.equal(state.clock.now,0);assert.ok(state.jobs.player&&state.jobs.neighbor);assert.equal(state.stock.timber,0);assert.equal(state.commitment.status,'accepted');
 await page.locator('#next-event').click();state=await game();assert.equal(state.clock.now,16);assert.equal(state.jobs.player,null);assert.equal(state.jobs.neighbor.endsAt,24);assert.equal(state.stock.timber,3);
 const manual=JSON.stringify(state);await page.reload();assert.equal(JSON.stringify(await game()),manual);assert.match(await page.locator('#time-status').innerText(),/Paused/);checks.push('Concurrent jobs reserve shared materials, finish independently, and reload exactly');
 await page.locator('#gather-choices [data-job="rest"]').click();await page.locator('#next-event').click();assert.equal((await game()).clock.now,24);assert.equal((await game()).structures.shelter,1);assert.ok((await game()).jobs.player);checks.push('Neighbor completion does not finish the player job');
 const download=page.waitForEvent('download');await page.locator('#download').click();const saved=await download;const savePath=await saved.path();assert.match(saved.suggestedFilename(),/common-ground-minute-24/);
 await page.getByText('Start a new worksite',{exact:true}).click();await page.locator('#new-run').click();await page.locator('#load').setInputFiles(savePath);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('human-common-ground-v1')).game.clock.now===24);assert.equal((await game()).clock.now,24);assert.ok((await game()).jobs.player);checks.push('Actual save download and file import resume pending work');
 // Exact same choices, with the wall-clock driver replacing next-event advance.
 await page.locator('#new-run').click();await page.locator('#opening-jobs [data-job="gather-timber"]').click();await page.locator('#request').click();await page.locator('#speed').selectOption('4');await page.locator('#play').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('human-common-ground-v1')).game.clock.now>=16,{},{timeout:10000});
 assert.equal(JSON.stringify(await game()),manual);assert.match(await page.locator('#time-status').innerText(),/Paused/);checks.push('Real 4x playback pauses exactly at player completion and matches the manual snapshot');
 // Invalid imports retain the active run.
 const intact=JSON.stringify(await game());await page.locator('#load').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"format":"wrong"}')});await page.getByText(/Save was not loaded/).waitFor();assert.equal(JSON.stringify(await game()),intact);checks.push('Invalid save preserves the active run');
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.equal(await overflow(),false,`commons overflow at ${width}`);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`/tmp/hf-0.5-${label}-commons-390.png`,fullPage:true});
 await page.goto(base+'/courtyard/');await page.locator('[data-action="borrow"]').click();assert.match(await page.locator('body').innerText(),/Reply to you/);await page.locator('[data-action="repay"]').click();assert.match(await page.locator('body').innerText(),/Her own choice/);
 await page.locator('#load-save').setInputFiles('/Users/abdul/Downloads/courtyard-2-move-18.json');
 await page.getByText(/2 buckets remain in your cans/).waitFor();assert.match(await page.locator('body').innerText(),/Blocked: 10 minutes paid/);assert.match(await page.locator('body').innerText(),/does not collect more water/);checks.push('Courtyard replies, repayment and actual blocked final-pour snapshot explain separate action slots');
 assert.equal(await overflow(),false);assert.equal(JSON.stringify(await game()),manual,'courtyard did not overwrite the other game save');
 await page.setViewportSize({width:1280,height:900});await page.goto(base+'/games/');await page.screenshot({path:`/tmp/hf-0.5-${label}-games-1280.png`,fullPage:true});
 await Promise.all(networkChecks);assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
 const result={checkedAt:new Date().toISOString(),origin:base,browser:await browser.version(),environment:'Isolated headless desktop Chrome; viewport tests are not physical-device timings',checks,viewports:[320,390,1280],errors,failedRequests,prefetchRefusals};await writeFile(`/tmp/hf-0.5-${label}-browser.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await context.close();await browser.close();}
