import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createGame,exportGame} from '/Users/abdul/code/human-framework/src/games/across-cut-player.js';
const dir='/tmp/across-ui-review',key='human-across-cut-player-v0.1.0',url='http://127.0.0.1:4190/across/';
const browser=await chromium.launch({channel:'chrome',headless:true}),out={};
const readUrl=url=>new Promise((resolve,reject)=>http.get(url,r=>{let body='';r.setEncoding('utf8');r.on('data',x=>body+=x);r.on('end',()=>resolve(body));}).on('error',reject));
async function source(label){out[label]={};for(const path of ['/web/across-player.js','/web/across.css','/web/game-shell.css','/src/games/across-cut-player.js']){const body=await readUrl('http://127.0.0.1:4190'+path);out[label][path]=crypto.createHash('sha256').update(body).digest('hex');await fs.writeFile(dir+'/'+label+path.replaceAll('/','__'),body);}}
async function page(setup={}){const c=await browser.newContext({viewport:{width:375,height:667}});await c.addInitScript(({key,value})=>localStorage.setItem(key,value),{key,value:JSON.stringify(exportGame(createGame(setup)))});const p=await c.newPage();await p.goto(url);await p.locator('[data-choice="inspect"]').waitFor();return p;}
await source('supplement-before');
const p=await page();await p.locator('#tab-save').click();await p.locator('#download').focus();await p.keyboard.press('Tab');out.fileFocus=await p.locator('#import').evaluate(el=>({focused:document.activeElement===el,inputOpacity:getComputedStyle(el).opacity,inputOutline:getComputedStyle(el).outline,labelOutline:getComputedStyle(el.parentElement).outline,labelBackground:getComputedStyle(el.parentElement).background}));await p.screenshot({path:dir+'/phone-file-keyboard-focus.png'});
const q=await page({bodies:{keeper:{fatigue:1,hunger:.15}}});out.capacity={inspectDisabled:await q.locator('[data-choice="inspect"]').isDisabled()};await q.locator('#tab-notebook').click();await q.getByText('Share your first-hand observations',{exact:true}).click();out.capacity.sendDisabled=await q.locator('#send-radio').isDisabled();await q.locator('#send-radio').click();out.capacity.error=await q.locator('#notice').textContent();out.capacity.minute=await q.locator('#minute').textContent();await q.screenshot({path:dir+'/phone-send-capacity-error.png'});
await source('supplement-after');out.sourceUnchanged=JSON.stringify(out['supplement-before'])===JSON.stringify(out['supplement-after']);await fs.writeFile(dir+'/supplement-results.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));await browser.close();
