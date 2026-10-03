import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import * as story from '/Users/abdul/code/human-framework/src/games/camp-story.js';
import * as slots from '/Users/abdul/code/human-framework/web/camp-slots.js';
import {chooseCommand} from '/Users/abdul/code/human-framework/src/games/commons-policy.js';
const dir='/tmp/camp-ui-review',url='http://127.0.0.1:4189',results=[];
let game=story.createGame();for(let i=0;i<800&&story.getGameView(game).phase==='camp';i++){const v=story.getGameView(game),c=chooseCommand(v);game=c.type==='request'?story.requestProject(game,c.projectId):c.type==='start'&&c.jobId!=='rest'?story.startJob(game,c.jobId):story.advanceToNextEvent(game);}
const intro=game,packing=story.continueStory(game),ferry=story.advanceGame(packing,90),rain=story.advanceGame(story.dispatchFerry(ferry),90),ended=story.finishStory(rain),back=story.returnToCamp(ended);
const scenarios={new:story.createGame(),intro,packing,ferry,rain,ended,back};
for(const [label,g] of Object.entries(scenarios))fs.writeFileSync(`${dir}/${label}.json`,JSON.stringify(story.exportGame(g)));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
for(const viewport of [{width:375,height:667},{width:390,height:844},{width:1280,height:800}]){
 for(const [label,g] of Object.entries(scenarios)){
 const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/games/');await page.evaluate(([key,raw])=>localStorage.setItem(key,raw),[slots.STORAGE_KEY,slots.serializeBook(slots.addStory(slots.createBook(),g,{id:'review',at:0}))]);await page.goto(url+'/camp/');await page.locator('#player-job').waitFor();
 const measure=await page.evaluate(()=>({text:document.body.innerText,doc:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],viewport:[innerWidth,innerHeight],selected:document.querySelector('[role=tab][aria-selected=true]').id,panel:[...document.querySelectorAll('.game-panel')].filter(e=>!e.hidden).map(e=>({id:e.id,client:e.clientHeight,scroll:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth})),controls:[...document.querySelectorAll('.game-dock button,.game-dock select')].filter(e=>!e.hidden).map(e=>({id:e.id,rect:JSON.parse(JSON.stringify(e.getBoundingClientRect()))}))}));
 results.push({viewport,label,errors,...measure});await page.screenshot({path:`${dir}/${viewport.width}-${label}.png`});await context.close();
 }
}
await browser.close();fs.writeFileSync(dir+'/layouts.json',JSON.stringify(results,null,2));console.log(results.map(r=>({viewport:r.viewport,label:r.label,selected:r.selected,doc:r.doc,panel:r.panel,errors:r.errors})))
