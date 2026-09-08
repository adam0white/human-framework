import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base=process.argv[2]??'http://127.0.0.1:4192',out=process.argv[3]??'/tmp/hf-play-note-local.json';
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{for(const [route,title,key] of [['watch','Before the Water','human-before-the-water-v1'],['commons-next','Before the rain','human-common-ground-before-rain-v1']]){
 await page.goto(base+'/'+route+'/');await page.locator('.play-note').waitFor();assert.equal(await page.locator('.play-note').getAttribute('open'),null);
 await page.locator('#play').click();await page.getByText('Save a play note',{exact:true}).click();await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='false');
 const before=await page.evaluate(key=>localStorage.getItem(key),key);
 await page.getByRole('button',{name:'Download play note',exact:true}).click();await page.getByText('Write at least one note before downloading.').waitFor();
 await page.locator(`textarea[name="objective"]`).fill('Synthetic QA: protect the site or allocate supplies.');
 await page.locator(`textarea[name="tradeoff"]`).fill('<script>not executed</script> Synthetic QA tradeoff.');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download play note',exact:true}).click();const file=await download,note=JSON.parse(await readFile(await file.path(),'utf8'));
 assert.equal(note.format,'human-framework-play-note');assert.equal(note.game.id,route);assert.equal(note.game.title,title);assert.match(note.answers.objective,/Synthetic QA/);assert.match(note.answers.tradeoff,/<script>/);assert.equal(note.assessment,undefined);assert.equal(note.context.minute,0);
 assert.deepEqual(Object.keys(note.context).sort(),['minute','summary']);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 checks.push({game:route,downloaded:true,blankRejected:true,pausesPlayback:true,noGameMutation:true,publicContextOnly:true,syntheticFixture:true});
 }assert.deepEqual(errors,[]);const result={origin:base,checkedAt:new Date().toISOString(),browser:browser.version(),checks,errors,note:'Automated synthetic note fixtures, not human playtest responses. No user feedback or full save was exported by this check.'};await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await context.close();await browser.close();}
