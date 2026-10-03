import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createAppServer} from './source/scripts/serve.js';
import {writeFile} from 'node:fs/promises';
const root='/tmp/hf-game-hud-review-20260908';
const server=createAppServer({root:root+'/source'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:'chrome'}), results=[];
const games='workshop shift courier courtyard commons commons-next watch signals service service-plan'.split(' ');
try{
 for(const size of [[375,667],[390,844],[1280,800],[320,400]]){
  for(const game of [...games,'games']){
   const context=await browser.newContext({viewport:{width:size[0],height:size[1]},acceptDownloads:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.goto(`${origin}/${game}/`);await page.waitForTimeout(80);
   const initial=await page.evaluate(()=>({ids:[...document.querySelectorAll('[id]')].map(n=>n.id),width:innerWidth,height:innerHeight,docWidth:document.documentElement.scrollWidth,docHeight:document.documentElement.scrollHeight,hud:document.querySelector('.game-hud')?.innerText,dock:document.querySelector('.game-dock')?.innerText,buttons:[...document.querySelectorAll('button')].filter(n=>n.checkVisibility()).map(n=>({id:n.id,text:n.innerText}))}));
   const panels=[];
   for(const tab of await page.getByRole('tab').all()){
    if(!await tab.isVisible())continue;await tab.click();
    panels.push(await page.evaluate(()=>{const p=document.querySelector('[role=tabpanel]:not([hidden])');return {selected:document.querySelector('[role=tab][aria-selected=true]')?.innerText,panelHeight:p?.clientHeight,panelScroll:p?.scrollHeight,docOverflow:document.documentElement.scrollWidth>innerWidth,dockBottom:document.querySelector('.game-dock')?.getBoundingClientRect().bottom,missingIds:[...document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]')].flatMap(n=>['aria-labelledby','aria-describedby','aria-controls'].flatMap(a=>(n.getAttribute(a)||'').split(/\s+/).filter(id=>id&&!document.getElementById(id))))};}));
   }
   if(size[0]===375){if(game==='games')await page.locator('#game-choice').selectOption('9');else await page.getByRole('tab').first().click();await page.screenshot({path:`${root}/${game}-375.png`,fullPage:true});}
   let dropped=[];
   if(game!=='games'&&size[0]===375){const base=await context.newPage();await base.route('**/web/game-shell.js',r=>r.fulfill({contentType:'text/javascript',body:''}));await base.goto(`${origin}/${game}/`);await base.waitForTimeout(50);const ids=await base.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id));dropped=ids.filter(id=>!initial.ids.includes(id));await base.close();}
   results.push({game,size,errors,initial,panels,dropped});await context.close();
  }
 }
 await writeFile(`${root}/initial-results.json`,JSON.stringify({origin,browser:browser.version(),results},null,2));
 console.log(JSON.stringify(results.map(({game,size,errors,initial,panels,dropped})=>({game,size,errors,dropped,docOverflow:initial.docWidth>initial.width,docHeight:initial.docHeight,minPanel:Math.min(...panels.map(p=>p.panelHeight)),dockOffscreen:panels.some(p=>p.dockBottom>size[1]+1),missing:[...new Set(panels.flatMap(p=>p.missingIds))]})),null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
