import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const base=process.argv[2]??'http://127.0.0.1:4196',out=resolve(process.argv[3]??'/tmp/service-day-browser');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[],SAVE='human-service-day-v1';
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
  await page.goto(base+'/service/');await page.locator('#keeper-gate').waitFor();
  const first=await page.locator('#keeper-gate').boundingBox();assert.ok(first.y+first.height<844,'first service choice fits first viewport');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('#keeper-gate').isEnabled(),true);assert.match(await page.locator('#objective').textContent(),/24.*64/);
  await page.screenshot({path:resolve(out,width+'-initial.png'),fullPage:true});
  const snapshot=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
  const event=()=>page.locator('#next-event').click();
  const action=async(actor,task)=>{const button=page.locator('#'+actor+'-'+task);await button.evaluate(e=>{const details=e.closest('details');if(details)details.open=true;});await button.click();};
  const until=async(target)=>{for(let n=0;n<25;n++){const now=Number(await page.locator('#minute').textContent());if(now>=target){assert.equal(now,target);return;}await event();}throw new Error('No progress to '+target);};
  const fresh=async()=>{await page.locator('#new-day').evaluate(e=>e.open=true);await page.locator('#restart').click();assert.equal(await page.locator('#minute').textContent(),'00');};
  // Known refusal is explicit before request. Accepted work still pays time.
  assert.equal(await page.locator('#partner-share').isEnabled(),false);assert.match(await page.locator('#partner-share-reason').textContent(),/keeping my last part/);
  await action('partner','salvage');assert.match(await page.locator('#partner-response').textContent(),/Accepted/);assert.equal(await page.locator('#minute').textContent(),'00');
  await action('keeper','gate');await event();assert.equal(await page.locator('#minute').textContent(),'06');assert.match(await page.locator('#partner-job').textContent(),/shed/);await page.locator('#partner-stop').click();assert.equal((await snapshot()).state.parts.partner,1);
  // Full service uses the single shed spare later at the pump.
  await fresh();await action('keeper','gate');await until(6);await action('keeper','gate');await until(12);await action('keeper','salvage');await until(20);await action('keeper','meal');await until(24);
  let phase=await snapshot();assert.equal(phase.state.morning.waterService,true);assert.equal(phase.state.parts.keeper,1);assert.equal(phase.state.eaten.keeper,1);assert.equal(phase.state.eaten.partner,1);assert.equal(phase.state.jobs.partner.task,'pump');assert.equal(phase.state.jobs.partner.origin,'own');
  assert.match(await page.locator('#partner-job').textContent(),/Chose:.*pump/);assert.match(await page.locator('#carryover-detail').textContent(),/morning water service continued/);
  assert.equal(await page.locator('#keeper-cart').isEnabled(),true);assert.match(await page.locator('#keeper-cart-reason').textContent(),/Condition estimate/);await action('keeper','cart');assert.equal((await snapshot()).state.lastResponse.code,'CAPACITY');assert.equal(await page.locator('#minute').textContent(),'24');
  await page.locator('#partner-stop').click();assert.match(await page.locator('#partner-response').textContent(),/Refused.*finish/);assert.equal((await snapshot()).state.jobs.partner.task,'pump');assert.equal(await page.locator('#minute').textContent(),'24');
  await page.screenshot({path:resolve(out,width+'-clinic-carryover.png'),fullPage:true});
  // Export, invalid import, valid import and reload preserve this actual cross-phase day.
  const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise,saved=resolve(out,width+'-save-minute24.json');await download.saveAs(saved);
  const before=await page.evaluate(key=>localStorage.getItem(key),SAVE);
  await page.locator('#load').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"format":"wrong"}')});await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('not loaded'));assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),before);
  await page.locator('#load').setInputFiles(saved);await page.waitForFunction(()=>document.getElementById('notice').hidden);assert.equal(await page.locator('#minute').textContent(),'24');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
  await page.reload();await page.locator('#keeper-gate').waitFor({state:'attached'});assert.equal(await page.locator('#minute').textContent(),'24');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');await page.waitForTimeout(1100);assert.equal(await page.locator('#minute').textContent(),'24');
  await action('keeper','rest');await until(30);await action('keeper','pump');await until(36);assert.match(await page.locator('#partner-job').textContent(),/Chose:.*Deliver/);await until(42);assert.equal((await snapshot()).state.delivery.units,2);await until(64);assert.match(await page.locator('#outcome-title').textContent(),/Both services/);assert.equal((await snapshot()).state.outcome.allService,true);
  await page.screenshot({path:resolve(out,width+'-both-services.png'),fullPage:true});
  // The cheaper diversion has a distinct morning loss and retains the shed spare.
  await fresh();await action('keeper','divert');await until(6);await action('keeper','meal');await until(10);await action('keeper','rest');await until(24);assert.equal((await snapshot()).state.morning.waterService,false);assert.equal((await snapshot()).state.morning.protected,true);assert.match(await page.locator('#inlet-detail').textContent(),/Reopen/);
  await action('keeper','reopen');await until(30);await action('keeper','pump');await until(64);let diverted=await snapshot();assert.equal(diverted.state.outcome.clinicUnits,2);assert.equal(diverted.state.outcome.morningWater,false);assert.equal(diverted.state.salvaged,0);assert.match(await page.locator('#outcome-detail').textContent(),/Morning water service was lost/);
  await page.screenshot({path:resolve(out,width+'-diversion-outcome.png'),fullPage:true});
  // No player commands: same finite world, independent partner uses cart fallback.
  await fresh();await until(64);let fallback=await snapshot();assert.equal(fallback.state.outcome.clinicUnits,1);assert.equal(fallback.state.outcome.morningProtected,false);assert.match(await page.locator('#outcome-detail').textContent(),/cart supplied one/);
  // A spare still being fetched at the phase boundary is not counted as collected.
  await fresh();await action('keeper','gate');await until(6);await action('keeper','gate');await until(12);await action('keeper','rest');await until(18);await action('keeper','salvage');await until(24);assert.match(await page.locator('#carryover-facts').textContent(),/spare is being fetched/);assert.equal((await snapshot()).state.parts.keeper,0);await until(26);assert.equal((await snapshot()).state.parts.keeper,1);
  // Play pauses at real completion and choices retain paid partial recovery.
  await fresh();await action('keeper','rest');await page.locator('#one-minute').click();await page.locator('#keeper-stop').click();assert.equal((await snapshot()).state.paid.rest,1);assert.ok((await snapshot()).state.people.keeper.body.fatigue<.5);
  await fresh();await action('keeper','gate');await page.locator('#speed').selectOption('4');await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('minute').textContent==='06');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
  // Visibility handler is synthetic; it verifies pausing logic, not device timing.
  await page.locator('#play').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');await page.evaluate(()=>{delete document.hidden;});
  // Notes contain only explicit public fields and self-authored words.
  await page.getByText('Save a play note',{exact:true}).click();assert.equal(await page.locator('.play-note textarea').count(),4);await page.locator('textarea[name="objective"]').fill('Synthetic browser QA: keep the inlet and clinic supplied.');await page.locator('textarea[name="response"]').fill('Synthetic browser QA: Deniz refused to cancel clinic work.');const noteBefore=await page.evaluate(key=>localStorage.getItem(key),SAVE),notePromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download play note',exact:true}).click();const noteDownload=await notePromise,note=JSON.parse(await readFile(await noteDownload.path(),'utf8'));assert.equal(note.game.id,'service');assert.ok(note.answers.response);assert.deepEqual(Object.keys(note.context).sort(),['minute','summary']);assert.equal(note.state,undefined);assert.equal(note.assessment,undefined);assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),noteBefore);
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  results.push({width,height:844,firstServiceActionBottom:first.y+first.height,noHorizontalOverflow:true,knownReserveRefusal:true,acceptedConcurrentRequest:true,ownClinicWorkAndCancellationRefusal:true,capacityEstimateAllowsActualAttempt:true,morningCarryoverAndBothServices:true,downloadImport:true,invalidImportPreservesSave:true,pausedReload:true,diversionHasMorningCostAndRetainsShedSpare:true,independentCartFallback:true,reservedSpareNotReportedAsCollected:true,paidPartialRest:true,playPauseAtCompletion:true,syntheticVisibilityPause:true,syntheticPlayNotePublicProjection:true,pageErrors:errors});await context.close();
 }
 const report={origin:base,checkedAt:new Date().toISOString(),browser:browser.version(),scope:'Actual Service Day UI and real host. Desktop Chrome at mobile viewport widths; synthetic notes and visibility event are automated fixtures, not human participants or physical-device evidence.',results};await writeFile(resolve(out,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
