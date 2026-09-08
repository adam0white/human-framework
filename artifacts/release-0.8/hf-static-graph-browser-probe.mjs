import {chromium} from '/Users/abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const source={'/probe/':'<script type="module" src="/probe/app.js"></script>','/probe/app.js':'import {value} from "./barrel.js";globalThis.loaded=value;', '/probe/barrel.js':'export * from "./value.js?a";export * from "./value.js?b";', '/probe/value.js':'export const value=1;'};
await page.route('**/probe/**',route=>{const p=new URL(route.request().url()).pathname;return route.fulfill({status:200,contentType:p.endsWith('.js')?'text/javascript':'text/html',body:source[p]??''});});
await page.goto('http://127.0.0.1:4279/probe/');await page.waitForTimeout(200);const result={browser:browser.version(),errors,loaded:await page.evaluate(()=>globalThis.loaded??null)};console.log(JSON.stringify(result));await writeFile('/tmp/hf-static-graph-browser-probe.json',JSON.stringify(result,null,2));
}finally{await browser.close();}
