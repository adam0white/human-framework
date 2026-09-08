/** Real browser interactions and synthetic notes. Not human or physical-device evidence.
 * node artifacts/service-plan-ui/browser-qa.mjs BASE_URL OUT_JSON
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createService,exportService} from '../../src/games/service.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=(process.argv[2]??'http://127.0.0.1:4197').replace(/\/$/,''),out=process.argv[3];
if(!out)throw new Error('Supply a fresh output JSON path.');
try{await access(out);throw new Error('Refusing to overwrite existing evidence.');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(dirname(resolve(out)),{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),report={capturedAt:new Date().toISOString(),base,browser:browser.version(),synthetic:true,sourceHashes:{},widths:[],checks:[],errors:[],httpErrors:[],nonGetRequests:[]};
for(const file of ['src/games/service-plan.js','web/service-plan.html','web/service-plan.css','web/service-plan.js','web/service-plan-session.js'])report.sourceHashes[file]=createHash('sha256').update(await readFile(resolve(root,file))).digest('hex');
const key='human-shared-promise-v1';
const saved=async p=>JSON.parse(await p.evaluate(k=>localStorage.getItem(k),key));
const click=async(p,id)=>p.locator('#'+id).click();
const minute=async(p,n)=>{assert.equal(Number(await p.locator('#minute').innerText()),n);};
const next=async(p,n)=>{await click(p,'next-event');await minute(p,n);};
const closeDay=async p=>{for(let i=0;i<20&&Number(await p.locator('#minute').innerText())<64;i++)await click(p,'next-event');await minute(p,64);};
const options=async p=>{if(!await p.locator('#plan-options').evaluate(e=>e.open))await click(p,'discuss-label');};
const restart=async p=>{await p.locator('#new-day').evaluate(e=>e.open=true);await p.locator('#start-mode').selectOption('clinic');await click(p,'restart');await minute(p,37);};
const proposeSafe=async p=>{await options(p);await click(p,'safe-terms');await click(p,'propose');assert.match(await p.locator('#pending-title').innerText(),/no terms accepted yet/);};
const acceptSafe=async p=>{await proposeSafe(p);await next(p,39);assert.match(await p.locator('#plan-status').innerText(),/Accepted/);assert.match(await p.locator('#actual-ready').innerText(),/ready: no/);};
const errors=p=>{p.on('request',r=>{if(r.method()!=='GET')report.nonGetRequests.push({method:r.method(),url:r.url()});});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)report.httpErrors.push({status:r.status(),url:r.url(),resourceType:r.request().resourceType(),navigation:r.request().isNavigationRequest()});});p.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure()?.errorText));};
try{
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:width===320?700:width===390?844:900}});errors(page);
  const response=await page.goto(base+'/service-plan/');assert.equal(response.status(),200);await minute(page,37);
  const summary=await page.locator('#discuss-label').boundingBox();assert.ok(summary.y+summary.height<=(width===320?700:width===390?844:900),'Discussion affordance must fit first viewport');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('.model-notes').evaluate(e=>e.open),false);assert.equal(await page.locator('a[href="/service/"]').count(),1);
  await page.screenshot({path:resolve(dirname(out),`clinic-${width}.png`)});
  await proposeSafe(page);await click(page,'one-minute');await minute(page,38);await next(page,39);await page.screenshot({path:resolve(dirname(out),`accepted-${width}.png`)});report.widths.push({width,height:width===320?700:width===390?844:900,firstAction:summary,overflow:false,acceptedAt:39});
  await page.close();
 }
}catch(e){report.errors.push('Early QA: '+e.message);}
// Remaining interactions use a normal mobile width; every command goes through the shipped UI.
const page=await browser.newPage({viewport:{width:390,height:844}});errors(page);
try{
 await page.goto(base+'/service-plan/');await proposeSafe(page);await click(page,'one-minute');await minute(page,38);
 const state38=await saved(page);assert.equal(state38.state.coordination.current,null);assert.equal(state38.state.paid.discuss,2);
 const download=await Promise.all([page.waitForEvent('download'),click(page,'download')]);const downloadPath=await download[0].path();assert.deepEqual(JSON.parse(await readFile(downloadPath,'utf8')),state38);
 await click(page,'play');await page.reload();await minute(page,38);assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');assert.deepEqual(await saved(page),state38);
 await page.locator('#load').setInputFiles({name:'original-service.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportService(createService())))});assert.match(await page.locator('#notice').innerText(),/not loaded/);assert.deepEqual(await saved(page),state38);
 await page.locator('#load').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{')});assert.deepEqual(await saved(page),state38);
 await page.locator('#load').setInputFiles({name:'shared-promise.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state38))});await minute(page,38);assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 await click(page,'cancel-discussion');let state=await saved(page);assert.equal(state.state.coordination.pending,null);assert.equal(state.state.paid.discuss,2);
 report.checks.push('Mid-discussion exact download/import, rejected original/malformed saves, paused reload, paid interruption.');
 await restart(page);await acceptSafe(page);assert.equal(await page.locator('#promised-work').isVisible(),true);const workBox=await page.locator('#promised-work').boundingBox();assert.ok(workBox.y+workBox.height<844);await click(page,'promised-work');await next(page,45);state=await saved(page);assert.equal(state.state.coordination.current.actualReadyAt,45);assert.equal(state.state.delivery,null);assert.match(await page.locator('#plan-status').innerText(),/Delivery underway/);await next(page,51);await closeDay(page);state=await saved(page);assert.equal(state.state.outcome.allService,true);
 report.checks.push('Safe agreement accepted39, actual pump readiness45, real two-unit arrival51, closing64.');
 await restart(page);await acceptSafe(page);await click(page,'keeper-rest');await click(page,'one-minute');await click(page,'one-minute');await click(page,'keeper-stop');await minute(page,41);
 await options(page);await click(page,'risky-terms');await click(page,'propose');const old=(await saved(page)).state.coordination.current.id;await next(page,43);state=await saved(page);assert.equal(state.state.coordination.current.revisionOf,old);
 await click(page,'keeper-rest');await next(page,47);assert.match(await page.locator('#time-status').innerText(),/promised pump start/);await click(page,'promised-work');await click(page,'promised-work');await next(page,53);await next(page,59);await closeDay(page);state=await saved(page);assert.equal(state.state.delivery.units,2);assert.equal(state.state.paidByActor.partner.discuss,4);
 report.checks.push('Useful risky revision accepted43, paid partial rest retained, pump53 and two-unit arrival59.');
 await restart(page);await acceptSafe(page);const accepted=(await saved(page)).state.coordination.current;
 await options(page);await click(page,'risky-terms');await page.locator('#pump-at').fill('53');await click(page,'propose');await next(page,41);state=await saved(page);assert.equal(state.state.coordination.lastResponse.accepted,false);assert.deepEqual(state.state.coordination.current,accepted);assert.match(await page.locator('#plan-response').innerText(),/Terms refused/);
 await click(page,'risky-terms');await click(page,'propose');await click(page,'one-minute');await click(page,'cancel-discussion');assert.deepEqual((await saved(page)).state.coordination.current,accepted);await next(page,45);const departed=(await saved(page)).state.jobs.partner;await options(page);await click(page,'propose');assert.equal((await saved(page)).state.coordination.lastResponse.code,'CLINIC_SLOT_USED');assert.deepEqual((await saved(page)).state.jobs.partner,departed);await next(page,63);await closeDay(page);assert.equal((await saved(page)).state.delivery.units,1);
 report.checks.push('Refused and interrupted revisions leave original exact terms and cart45–63.');
 await restart(page);await options(page);await click(page,'risky-terms');await click(page,'propose');await next(page,39);while(Number(await page.locator('#minute').innerText())<64)await click(page,'next-event');state=await saved(page);assert.equal(state.state.outcome.clinicUnits,0);assert.equal(state.state.coordination.current.contribution.status,'missed');
 report.checks.push('Accepted risky promise can fail and lose cart fallback: zero clinic units.');
 await restart(page);await options(page);await click(page,'risky-terms');await page.locator('#pump-at').fill('39');await page.locator('#ready-by').fill('45');await click(page,'propose');await next(page,39);await next(page,45);assert.match(await page.locator('#time-status').innerText(),/promised readiness/);state=await saved(page);assert.equal(state.state.coordination.current.status,'active');assert.equal(state.state.coordination.current.terms.waitUntil,53);
 report.checks.push('Earlier readyBy45 pauses visibly before longer waitUntil53; promise miss and continuing agreement stay separate.');
 await restart(page);await acceptSafe(page);await click(page,'keeper-pump');const job=(await saved(page)).state.jobs.keeper;await click(page,'withdraw');state=await saved(page);assert.deepEqual(state.state.jobs.keeper,job);assert.equal(state.state.coordination.current.status,'withdrawn');
 report.checks.push('Withdrawal preserves already-started work and independent clinic obligation.');
 await page.locator('.play-note summary').click();await page.locator('#service-plan-play-note-objective').fill('Synthetic browser QA: understand the clinic agreement.');
 const [noteDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download play note',exact:true}).click()]);const note=JSON.parse(await readFile(await noteDownload.path(),'utf8'));assert.equal(note.format,'human-framework-play-note');assert.deepEqual(Object.keys(note.context).sort(),['minute','summary']);assert.ok(note.context.summary.length<=8);assert.equal(note.game.id,'service-plan');assert.equal(note.context.minute,39);assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 await writeFile(resolve(dirname(out),'synthetic-play-note.json'),JSON.stringify(note,null,2)+'\n');
 report.checks.push('Optional synthetic play note downloads only user words and bounded public context, paused.');
 await page.locator('#new-day').evaluate(e=>e.open=true);await page.locator('#start-mode').selectOption('morning');await click(page,'restart');await minute(page,0);await page.locator('#keeper-card .more-jobs').evaluate(e=>e.open=true);await click(page,'keeper-meal');assert.match(await page.locator('#keeper-owned').innerText(),/0 meals available.*1 meal reserved/);await click(page,'keeper-stop');assert.match(await page.locator('#keeper-owned').innerText(),/1 meal available/);await click(page,'keeper-divert');await click(page,'one-minute');await minute(page,1);assert.equal((await saved(page)).state.work.divert,1);
 report.checks.push('Whole-day entry remains available and performs real paid work from minute0.');
}catch(e){report.errors.push(e.stack??e.message);}
await browser.close();report.passed=report.errors.length===0&&report.httpErrors.length===0&&report.nonGetRequests.length===0;await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
