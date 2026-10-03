import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createAppServer} from '../../scripts/serve.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){assert(['--origin','--out'].includes(args[i]),'Unknown argument');assert(args[i+1],'Missing argument value');options[args[i].slice(2)]=args[i+1];}
assert(options.out,'Use --out NEWDIR');
const out=resolve(options.out);await mkdir(out,{recursive:false});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=['web/camp-current.js','web/camp.html','web/camp-current-session.js','src/games/camp-current.js'];
const sources=Object.fromEntries(await Promise.all(sourcePaths.map(async path=>[path,hash(await readFile(resolve(root,path)))])));
const g1Path='artifacts/practice-incentive/gathering/G1-prefix.json',c1Path='artifacts/practice-incentive/construction/comparison-initial.json';
const g1Bytes=await readFile(resolve(root,g1Path)),c1Bytes=await readFile(resolve(root,c1Path));
const g1=JSON.parse(g1Bytes).trajectory.states.at(-1),c1Trajectory=JSON.parse(c1Bytes).trajectories.find(t=>t.id==='finish-woodshed-first');
const c1Mark=c1Trajectory.marks.find(m=>m.label==='garden-complete'),c1=c1Trajectory.states[c1Mark.commandIndex];
assert.equal(g1.game.clock.now,30);assert.equal(c1.game.clock.now,126);assert.equal(c1.game.structures.garden,2);
const storageKey='human-camp-current-v0.3.0';
const practiceText='Time spent gathering or building gives you practice that can shorten later jobs, even if you stop before finishing.';
const result={scope:'Isolated Chrome contexts; three viewport sizes; existing default, G1 prefix and C1 garden-complete fixtures only. No modified people, added comparison cases or user browser profile.',harnessSha256:hash(await readFile(fileURLToPath(import.meta.url))),harnessCorrection:'Initial and geometry runs required all C1 short-phone actions above the dock without panel scrolling and failed. Exact prechange fe540da/current comparison in short-phone-baseline/results.json proved identical existing internal scroll. This runner retains strict default-action visibility and separately verifies keyboard reach of the existing C1 short-phone fallback; original failures remain preserved.',startedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sources,fixtures:{G1:{path:g1Path,sha256:hash(g1Bytes),selection:'trajectory.states.at(-1)',now:30},C1:{path:c1Path,sha256:hash(c1Bytes),selection:'finish-woodshed-first, garden-complete mark, states[commandIndex]',now:126}},checks:[],screenshots:[],errors:[],requests:[],failure:null};
let server,browser,origin;
const contexts=[];
async function servedSources(){const r={};for(const path of sourcePaths){const route=path==='web/camp.html'?'/camp/':'/'+path,response=await fetch(origin+route),bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,route);r[path]={status:response.status,sha256:hash(bytes)};assert.equal(r[path].sha256,sources[path],'Served source differs: '+path);}return r;}
async function makePage(name,viewport,fixture){
  const context=await browser.newContext({viewport,deviceScaleFactor:1});contexts.push(context);
  if(fixture)await context.addInitScript(({storageKey,fixture})=>{if(location.pathname==='/camp/'&&!sessionStorage.getItem('release-0.14.1-fixture-seeded')){localStorage.setItem(storageKey,JSON.stringify(fixture));sessionStorage.setItem('release-0.14.1-fixture-seeded','yes');}},{storageKey,fixture});
  const page=await context.newPage();page.on('pageerror',e=>result.errors.push({name,type:'pageerror',message:e.message}));page.on('console',m=>{if(m.type()==='error')result.errors.push({name,type:'console',message:m.text()});});page.on('requestfailed',r=>result.errors.push({name,type:'requestfailed',url:r.url(),message:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)result.requests.push({name,url:r.url(),status:r.status()});});
  await page.goto(origin+'/camp/',{waitUntil:'networkidle'});await page.locator('[data-job="forage"]').waitFor();return page;
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);}
async function screenshot(page,name){await page.screenshot({path:resolve(out,name+'.png'),fullPage:true});result.screenshots.push(name+'.png');}
async function geometry(page,label,{actions=false}={}){
  const state=await page.evaluate(()=>{
    const box=selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,visible:!!e.getClientRects().length};};
    return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight,hud:box('.game-hud'),dock:box('.game-dock'),tabs:box('.game-tabs'),actions:[...document.querySelectorAll('#work-choices button')].map(e=>({id:e.dataset.job,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))};
  });
  (result.geometry??=[]).push({label,...state});
  assert(state.documentWidth<=state.width+1,label+' horizontal document overflow');assert(state.documentHeight<=state.height+1,label+' vertical document overflow');
  for(const part of ['hud','dock','tabs']){const b=state[part];assert(b.visible&&b.y>=-1&&b.bottom<=state.height+1&&b.x>=-1&&b.right<=state.width+1,label+' '+part+' outside viewport');}
  if(actions)for(const b of state.actions)assert(b.top>=0&&b.bottom<=state.dock.y+1&&b.left>=0&&b.right<=state.width+1,label+' action hidden: '+b.id);
  return state;
}
async function checkFresh(page,name){
  const food=page.locator('[data-job="forage"]');assert.equal(await food.locator('.choice-detail').innerText(),'Bring back 2 food · Light work');assert.equal(await food.locator('.choice-cost').innerText(),'14 min');
  const layout=await geometry(page,name,{actions:true});await screenshot(page,name+'-default');
  const summary=page.locator('#panel-work summary').first();await summary.focus();await page.keyboard.press('Enter');
  const text=page.getByText(practiceText,{exact:true});await text.scrollIntoViewIfNeeded();assert(await text.isVisible());
  const expanded=await geometry(page,name+' details');await screenshot(page,name+'-practice-details');await summary.focus();await page.keyboard.press('Enter');
  await page.locator('#tab-work').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#tab-people').getAttribute('aria-selected'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-people');assert(await page.locator('#panel-people').isVisible());
  await page.keyboard.press('End');assert.equal(await page.locator('#tab-save').getAttribute('aria-selected'),'true');await page.keyboard.press('Home');assert.equal(await page.locator('#tab-work').getAttribute('aria-selected'),'true');
  assert.equal((await saved(page)).game.clock.now,0);await geometry(page,name+' keyboard tabs',{actions:true});
  result.checks.push({name:name+' default choices, keyboard disclosure, keyboard tabs and persistent HUD',layout,expanded});
}
async function checkG1(page,name){
  const marks=[];async function mark(label){const state=await saved(page),ui={clock:await page.locator('#clock').innerText(),forage:await page.locator('[data-job="forage"]').innerText(),timber:await page.locator('[data-job="gather-timber"]').innerText(),playerJob:await page.locator('#player-job').innerText(),playerTiming:await page.locator('#player-timing').innerText(),latest:await page.locator('#latest').innerText()};marks.push({label,now:state.game.clock.now,ui,stateSha256:hash(JSON.stringify(state)),stock:state.game.stock,paid:state.game.paid.player,job:state.game.jobs.player});return state;}
  const start=await mark('G1-prefix');assert.equal(start.game.clock.now,30);assert.equal(await page.locator('[data-job="gather-timber"] .choice-cost').innerText(),'16 min');assert.equal(await page.locator('[data-job="forage"] .choice-detail').innerText(),'Bring back 2 food · Light work');
  await page.locator('[data-job="forage"]').click();
  const blocked=page.locator('[data-job="forage"]');assert(await blocked.isDisabled());assert.equal(await blocked.locator('.choice-detail').innerText(),'Already working. Finish or stop the current job first.');assert(!(await blocked.innerText()).includes('Light work'));
  for(let i=0;i<6;i++)await page.locator('#one-minute').click();assert.equal((await mark('six paid forage minutes')).game.clock.now,36);
  await page.locator('#stop').click();const stopped=await mark('forage stopped without output');assert.equal(stopped.game.stock.food,start.game.stock.food);assert.equal(stopped.game.jobs.player,null);assert.equal(stopped.game.paid.player.gatheringMinutes,36);
  assert.equal(await page.locator('[data-job="gather-timber"] .choice-cost').innerText(),'15 min');await geometry(page,name+' post-practice',{actions:true});await screenshot(page,name+'-shorter-timber');
  await page.locator('[data-job="gather-timber"]').click();assert.equal((await mark('new timber admitted')).game.jobs.player.duration,15);assert.equal(await page.locator('#player-timing').innerText(),'15 min left');
  for(let i=0;i<15;i++)await page.locator('#one-minute').click();const finished=await mark('timber complete');assert.equal(finished.game.clock.now,51);assert.equal(finished.game.jobs.player,null);assert.equal(finished.game.stock.timber,start.game.stock.timber+3);assert.equal(finished.game.stock.food,start.game.stock.food);
  await screenshot(page,name+'-timber-complete');await page.reload({waitUntil:'networkidle'});const reloaded=await mark('reload');assert.deepEqual(reloaded,finished);assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');assert(!(await page.locator('#save-warning').isVisible()));await geometry(page,name+' reload',{actions:true});
  result.checks.push({name:name+' exact G1 UI sequence, busy reasons and save/reload',marks});
}
async function checkGarden(page,name){
  const state=await saved(page);assert.deepEqual(state,c1);const food=page.locator('[data-job="forage"]');assert(!(await food.isDisabled()));assert.equal(await food.locator('.choice-detail').innerText(),'Bring back 3 food · Light work');
  await screenshot(page,name+'-garden-yield');const initial=await geometry(page,name+' garden initial');let existingPanelScroll=null;
  if(initial.actions.some(b=>b.bottom>initial.dock.y+1)){
    assert.equal(page.viewportSize().width,375,'Unexpected garden action scrolling width');assert.equal(page.viewportSize().height,667,'Unexpected garden action scrolling height');
    const before=await page.locator('#panel-work').evaluate(e=>({scrollTop:e.scrollTop,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,overflowY:getComputedStyle(e).overflowY}));assert.equal(before.overflowY,'auto');
    await food.focus();const after=await page.locator('#panel-work').evaluate(e=>({scrollTop:e.scrollTop,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight}));assert(after.scrollTop>before.scrollTop);
    existingPanelScroll={classification:'Existing prechange short-phone fallback, independently compared against fe540da; no new copy-induced geometry change',evidence:'artifacts/release-0.14.1/short-phone-baseline/results.json',before,after};await screenshot(page,name+'-garden-keyboard-reachable');
  }
  const layout=await geometry(page,name+' garden reachable',{actions:true});result.checks.push({name:name+' existing C1 garden-complete fixture retains dynamic 3-food yield',now:state.game.clock.now,forage:await food.innerText(),initial,layout,existingPanelScroll});
}
try{
  if(options.origin){origin=new URL(options.origin).origin;}else{server=createAppServer({root});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;}
  result.origin=origin;result.servedBefore=await servedSources();browser=await chromium.launch({channel:'chrome',headless:true});result.browserVersion=browser.version();
  for(const viewport of [{width:390,height:844},{width:1280,height:800},{width:375,height:667}]){
    const prefix=viewport.width+'x'+viewport.height;
    await checkFresh(await makePage(prefix+' fresh',viewport),prefix);
    await checkG1(await makePage(prefix+' G1',viewport,g1),prefix);
    await checkGarden(await makePage(prefix+' garden',viewport,c1),prefix);
  }
  result.servedAfter=await servedSources();assert.deepEqual(result.servedAfter,result.servedBefore);assert.deepEqual(result.errors,[]);assert.deepEqual(result.requests,[]);assert.equal(result.checks.length,9);result.passed=true;
}catch(error){result.failure={message:error.message,stack:error.stack};result.passed=false;}
finally{
  result.finishedAt=new Date().toISOString();await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2)+'\n');
  for(const context of contexts)await context.close();if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({passed:result.passed,checks:result.checks.map(c=>c.name),screenshots:result.screenshots,errors:result.errors,requests:result.requests,failure:result.failure,out},null,2));
}
if(!result.passed)process.exitCode=1;
