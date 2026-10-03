import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createAppServer} from '../../scripts/serve.js';
import * as S from '../../src/games/camp-story.js';
import * as old from '../../src/games/commons.js';
import * as rain from '../../src/games/commons-next.js';
import {chooseCommand,applyCommand} from '../../src/games/commons-policy.js';
const out=resolve(process.env.UI_OUTPUT??'/tmp/hf-camp-ui-browser');
try{await lstat(out);throw Error('Use a fresh evidence directory');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.UI_BASE??'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:375,height:667},acceptDownloads:true}),page=await context.newPage();
const KEY='human-camp-story-slots-v1',checks=[],errors=[],source={};let failure=null;
for(const path of ['web/camp.js','web/camp.html','web/camp.css','web/camp-session.js','web/camp-slots.js','src/games/camp.js','src/games/camp-story.js'])source[path]=createHash('sha256').update(await readFile(resolve(path))).digest('hex');
page.on('pageerror',e=>errors.push(e.message));
const book=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const active=async()=>{const b=await book();return b.slots.find(s=>s.id===b.activeId).save;};
const view=async()=>S.getGameView(S.restoreGame(await active()));
const tab=async name=>{await page.locator('#tab-'+name).click();};
const screenshot=name=>page.screenshot({path:resolve(out,name+'.png'),animations:'disabled'});
async function separateStoryControls(){await tab('save');const summary=page.getByText('Start a separate story',{exact:true});if(!await summary.evaluate(n=>n.closest('details').open))await summary.click();}
async function fit(label){const g=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,dock:document.querySelector('.game-dock').getBoundingClientRect().toJSON(),panels:[...document.querySelectorAll('[role=tabpanel]')].filter(n=>!n.hidden).length}));assert.ok(g.sw<=g.w&&g.sh<=g.h+1,label+': document overflow '+JSON.stringify(g));assert.equal(g.panels,1);assert.ok(g.dock.top>=0&&g.dock.bottom<=g.h+1,label+': dock clipped');return g;}
async function writeFixture(name,save){const path=resolve(out,name+'.json');await writeFile(path,JSON.stringify(save));return path;}
async function importSave(path){await tab('save');const before=await book();await page.locator('#import').setInputFiles(path);await page.locator('#import-preview').waitFor({state:'visible'});assert.deepEqual(await book(),before,'import preview replaces current story');await page.locator('#confirm-import').click();assert.equal((await book()).slots.length,before.slots.length+1);return before;}
try{
 await page.goto(base+'/camp/');await page.locator('#work-choices button').first().waitFor();
 for(const viewport of [{width:375,height:667},{width:390,height:844},{width:1280,height:800}]){
  await page.setViewportSize(viewport);const before=await book();for(const name of ['work','people','camp','journal','save']){await tab(name);await fit(name+' '+viewport.width);}assert.deepEqual(await book(),before);
  await tab('work');await page.locator('#tab-work').focus();await page.keyboard.press('End');assert.equal(await page.locator('#tab-save').getAttribute('aria-selected'),'true');await page.keyboard.press('Home');assert.equal(await page.locator('#tab-work').getAttribute('aria-selected'),'true');await screenshot('opening-'+viewport.width);
 }
 await page.setViewportSize({width:375,height:667});checks.push('Three viewport sizes, all five panels, keyboard tabs and exact book preservation');
 await page.locator('[data-job="build-shelter"]').click();await page.locator('#one-minute').click();assert.ok((await view()).work.shelter.progress>0);
 await tab('people');await page.locator('#request-project').selectOption('workbench');await page.locator('#request').click();assert.equal((await view()).lastResponse.accepted,true);assert.ok((await view()).people.neighbor.job);
 await fit('both working');await screenshot('both-working-375');
 const paid=await active();await page.locator('#play').click();await tab('save');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');assert.deepEqual(await active(),paid);
 const download=page.waitForEvent('download');await page.locator('#download').click();const downloaded=await download,path=resolve(out,'downloaded-story.json');await downloaded.saveAs(path);
 const firstBook=await importSave(path),cloneSave=await active();assert.deepEqual(cloneSave,paid);assert.deepEqual((await book()).slots[0],firstBook.slots[0]);
 await page.reload();await page.locator('#work-choices button').first().waitFor();assert.deepEqual(await active(),paid);assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 checks.push('Concurrent paid work, pause while reading, actual download/import into separate slot and paused reload');
 await tab('people');const beforeStop=await view();await page.locator('#stop').click();const afterStop=await view();assert.equal(afterStop.people.player.job,null);assert.equal(afterStop.work.shelter.progress,beforeStop.work.shelter.progress);assert.deepEqual(afterStop.stock,beforeStop.stock);
 await tab('work');await page.locator('[data-job="build-shelter"]').click();assert.equal((await view()).work.shelter.progress,beforeStop.work.shelter.progress);
 checks.push('Stop and resume preserve real partial assembly and its material reservation');
 let legacy=old.createGame();for(let i=0;legacy.milestoneAt===null&&i<500;i++)legacy=applyCommand(legacy,chooseCommand(old.getGameView(legacy),'stock-first'));
 const legacyPath=await writeFixture('legacy-busy',old.exportGame(legacy));await importSave(legacyPath);assert.equal((await view()).phase,'introduction');assert.equal((await view()).now,226);assert.equal((await view()).people.player.job.remaining,10);
 const beforeContinue=(await active()).game.world;await screenshot('busy-introduction-375');await page.locator('#chapter-action').click();assert.deepEqual((await active()).game.world,beforeContinue);assert.equal((await view()).phase,'packing');assert.equal(await page.locator('#tab-work').getAttribute('aria-selected'),'true');
 for(let i=0;(await view()).people.player.job&&i<15;i++)await page.locator('#next-event').click();assert.equal((await view()).stock.timber,6);
 checks.push('Busy old camp import keeps 4/14 paid gather, converts rest explicitly, and Continue preserves the complete migrated world');
 let ferry=S.continueStory(S.migrateLegacyGame(old.exportGame(rain.createGame().world)));ferry=S.advanceGame(ferry,88);ferry=S.startJob(ferry,'eat');ferry=S.advanceGame(ferry,2);
 const ferryPath=await writeFixture('ferry-with-meal',S.exportGame(ferry));await importSave(ferryPath);assert.equal((await view()).phase,'ferry');await fit('ferry');assert.ok(await page.locator('#chapter-action').isVisible());assert.ok(await page.locator('#stop').isVisible());
 const atFerry=(await active()).game.world;await page.locator('#chapter-action').click();assert.deepEqual((await active()).game.world,atFerry);assert.equal((await view()).people.player.job.id,'eat');await screenshot('ferry-dispatched-375');
 for(let i=0;(await view()).phase!=='rain'&&i<60;i++)await page.locator('#next-event').click();assert.equal((await view()).phase,'rain');await page.locator('#chapter-action').click();assert.equal((await view()).phase,'ended');await screenshot('ended-375');
 const settled=(await active()).game.world;await page.locator('#return-camp').click();assert.deepEqual((await active()).game.world,settled);assert.equal((await view()).phase,'camp-return');assert.equal((await view()).unprovidedHouseholds,2);await page.locator('#next-event').click();assert.ok((await view()).now>settled.clock.now);assert.equal((await view()).unprovidedHouseholds,2);
 checks.push('Ferry and rain preserve an owned partial meal, require real dispatch, retain unmet needs and return without resetting the camp');
 let legacyRain=rain.createGame();legacyRain=rain.advanceGame(legacyRain,90);legacyRain=rain.dispatchFerry(legacyRain);legacyRain=rain.advanceGame(legacyRain,90);legacyRain=rain.finishDay(legacyRain);
 await importSave(await writeFixture('legacy-rain-ended',rain.exportGame(legacyRain)));assert.equal((await view()).phase,'ended');assert.equal((await view()).enteredAt,220);assert.equal((await view()).now,400);
 await tab('save');assert.equal((await book()).slots.length,5);await page.getByText('Start a separate story',{exact:true}).click();assert.equal(await page.locator('#new-story').isEnabled(),false);
 const beforeRemoval=await book(),inactive=beforeRemoval.slots[0];page.once('dialog',dialog=>dialog.dismiss());await page.locator('[data-remove="'+inactive.id+'"]').click();assert.deepEqual(await book(),beforeRemoval);
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-remove="'+inactive.id+'"]').click();const afterRemoval=await book();assert.equal(afterRemoval.slots.length,4);for(const slot of afterRemoval.slots)assert.deepEqual(slot.save,beforeRemoval.slots.find(s=>s.id===slot.id).save);
 await separateStoryControls();await page.locator('#new-story').click();assert.equal((await book()).slots.length,5);assert.equal((await view()).now,0);
 checks.push('Finished old Rain keeps its settled window; five slots never overwrite, removal requires confirmation, and other saves remain exact');
 const beforeBad=await book(),bad=await writeFixture('invalid',{format:'human-camp-story',version:99,game:{}});await tab('save');await page.locator('#import').setInputFiles(bad);await page.waitForFunction(()=>document.getElementById('import').value==='');assert.deepEqual(await book(),beforeBad);assert.match(await page.locator('#notice').textContent(),/not imported/);
 const broken=await browser.newContext({viewport:{width:375,height:667}});await broken.addInitScript(key=>localStorage.setItem(key,'CORRUPT-DATA'),KEY);const bp=await broken.newPage();await bp.goto(base+'/camp/');await bp.locator('#work-choices button').first().waitFor();assert.equal(await bp.evaluate(key=>localStorage.getItem(key),KEY),'CORRUPT-DATA');assert.ok(await bp.locator('#save-warning').isVisible());await bp.locator('[data-job="build-shelter"]').click();assert.equal(await bp.evaluate(key=>localStorage.getItem(key),KEY),'CORRUPT-DATA');await broken.close();
 const quota=await browser.newContext({viewport:{width:375,height:667}});await quota.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});const qp=await quota.newPage();await qp.goto(base+'/camp/');await qp.locator('#work-choices button').first().waitFor();assert.ok(await qp.locator('#save-warning').isVisible());await qp.locator('[data-job="build-shelter"]').click();await qp.locator('#one-minute').click();assert.ok(await qp.locator('#stop').isVisible());await quota.close();
 checks.push('Invalid imports/corrupt collections preserve original data; quota failure stays visible without losing in-memory paid work');
 const researchPath=await writeFixture('research-control',S.exportGame(S.createGame({recovery:'active-idle',improvement:'snapshot'}))),researchContext=await browser.newContext({viewport:{width:375,height:667}}),rp=await researchContext.newPage();
 await rp.goto(base+'/camp/');await rp.locator('#work-choices button').first().waitFor();await rp.locator('#tab-save').click();await rp.locator('#import').setInputFiles(researchPath);await rp.locator('#import-preview').waitFor({state:'visible'});await rp.locator('#confirm-import').click();assert.ok(await rp.locator('#preset-note').isVisible());
 await rp.locator('#tab-people').click();assert.ok(await rp.locator('#recover-mode').isEnabled());await rp.locator('#recover-mode').click();let researchBook=await rp.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY),researchWorld=researchBook.slots.find(s=>s.id===researchBook.activeId).save.game.world;assert.equal(researchWorld.clock.now,0);assert.equal(researchWorld.recovering.player,true);
 await rp.locator('#next-event').click();researchBook=await rp.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);researchWorld=researchBook.slots.find(s=>s.id===researchBook.activeId).save.game.world;assert.ok(researchWorld.people.player.body.fatigue<.2);await rp.locator('#tab-work').click();await rp.locator('#project').selectOption('workbench');assert.match(await rp.locator('#work-hint').textContent(),/Snapshot control/);await researchContext.close();
 checks.push('Imported research controls stay labeled, preserve their rules and retain a usable explicit-recovery option');
 await page.setViewportSize({width:320,height:400});await tab('work');assert.ok(await page.locator('#next-event').isVisible());await page.locator('#next-event').scrollIntoViewIfNeeded();await screenshot('short-height-fallback');
 await page.setViewportSize({width:375,height:667});await page.goto(base+'/games/');await page.locator('#game-choice').waitFor();assert.equal(await page.locator('a.game:visible').getAttribute('href'),'/camp/');assert.equal(await page.locator('#game-choice option').count(),11);await screenshot('collection-375');
 checks.push('Short-height fallback remains operable and chooser retains all ten controls beside the continuing story');
 assert.deepEqual(errors,[]);
}catch(error){failure=error.stack;await screenshot('failure').catch(()=>{});throw error;}
finally{await writeFile(resolve(out,'result.json'),JSON.stringify({synthetic:true,base,node:process.version,browser:browser.version(),source,checks,errors,failure},null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log('PASS: '+checks.length+' continuing-story browser groups.');
