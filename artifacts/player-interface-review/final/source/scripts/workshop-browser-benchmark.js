import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import os from 'node:os';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const paths=['scripts/workshop-browser-benchmark.js','scripts/workshop-browser-benchmark.workload.js','src/games/workshop.js','src/human/index.js','src/core/model.js'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=Object.fromEntries(paths.map(path=>[path,readFileSync(resolve(root,path))]));
const sourceSha256=Object.fromEntries(paths.map(path=>[path,digest(bytes[path])]));
const args=process.argv.slice(2),serve=args.includes('--serve');
const option=name=>{const index=args.indexOf(name);return index<0?null:args[index+1];};
const playwrightPath=option('--playwright'),output=resolve(root,option('--json')??'artifacts/workshop-browser-benchmark.json');
if(!serve&&!playwrightPath)throw new Error('Use --serve for Playwright MCP, or --playwright /absolute/path/to/already-installed/playwright. No package is installed by this runner.');
const results=[];
let driver={transport:serve?'Playwright MCP':'installed Playwright library',packagePath:playwrightPath,packageVersion:null};
const environment={node:process.version,os:{type:os.type(),release:os.release(),arch:os.arch(),cpuModel:os.cpus()[0]?.model,cpuCount:os.cpus().length},
  macOS:process.platform==='darwin'?execFileSync('sw_vers',[],{encoding:'utf8'}).trim():null};
const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='POST'&&url.pathname==='/result') {
    try {
      let data='';for await(const chunk of req){data+=chunk;if(data.length>5000000)throw new Error('Result too large');}
      const result=JSON.parse(data);
      if(![[1280,900],[390,844]].some(([w,h])=>result.viewport?.width===w&&result.viewport?.height===h)||results.some(row=>row.viewport.width===result.viewport.width))throw new Error('Unexpected or duplicate viewport');
      results.push(result);
      if(results.length===2) {
        for(const path of paths)if(digest(readFileSync(resolve(root,path)))!==sourceSha256[path])throw new Error(`Source changed during measurement: ${path}`);
        const artifact={format:'human-framework-workshop-browser-benchmark',version:1,generatedAt:new Date().toISOString(),sourceSha256,environment,driver,
          methodology:{budget:'Predeclared pure-command p95 < 16 ms; pooled command p95 and every individual command fixture are reported.',
            timing:'Browser performance.now around one synchronous host public operation. Module downloads, fixture construction, warmup, validation, rendering and I/O are excluded. Save/projection operations are reported separately from command-budget samples.',
            workload:'19 equally weighted command fixtures, 3 save fixtures and 1 view/controller fixture. Deterministic seeds1 and2 cover successful and failed repairs; legal repeated partial work creates the blocked fixture. Each fixture is validated before warmup and on its final timed result.',
            warmup:'200 untimed operations per fixture, then1000 timed operations per fixture, round-robin deterministic fixture order. Separate new browser contexts and pages per viewport.',
            statistics:'Nearest-rank percentiles over individual-operation samples; persisted histograms round milliseconds to6 decimal places. Zero samples and minimum observed positive timer step expose browser timer quantization. No samples or GC/scheduler outliers are removed.',
            scope:'Desktop browser developer benchmark. The390x844 run changes viewport only, without CPU/network throttling or mobile hardware emulation. This is not CUA, physical mobile, rendering performance, a load test, or user playtesting.'},
          results:results.sort((a,b)=>b.viewport.width-a.viewport.width)};
        mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(artifact,null,2)+'\n');
        console.log(`Saved ${output}`);
      }
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({received:results.length}));
    } catch(error){res.writeHead(400);res.end(error.message);console.error(error.message);}
    return;
  }
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><meta charset="utf-8"><title>Workshop pure-command benchmark</title><body>Isolated developer benchmark harness.</body>');return;}
  const path=url.pathname==='/benchmark.js'?'scripts/workshop-browser-benchmark.workload.js':url.pathname.slice(1);
  if(!Object.hasOwn(bytes,path)||path==='scripts/workshop-browser-benchmark.js'){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':'text/javascript'});res.end(bytes[path]);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
console.log(`Benchmark harness ${url}`);
if(!serve) {
  let browser;
  try {
    const packageRoot=resolve(playwrightPath);
    const {chromium}=await import(pathToFileURL(resolve(packageRoot,'index.mjs')).href);
    driver.packageVersion=JSON.parse(readFileSync(resolve(packageRoot,'package.json'),'utf8')).version;
    browser=await chromium.launch({channel:'chrome',headless:true});driver.browserVersion=browser.version();
    for(const viewport of [{width:1280,height:900},{width:390,height:844}]) {
      const context=await browser.newContext({viewport}),page=await context.newPage();
      await page.goto(url);
      const result=await page.evaluate(async()=>{const {measure}=await import('/benchmark.js');const result=await measure();const response=await fetch('/result',{method:'POST',body:JSON.stringify(result)});if(!response.ok)throw new Error(await response.text());return {viewport:result.viewport,p95Ms:result.commands.p95Ms,budget:result.budget};});
      console.log(JSON.stringify(result));await context.close();
    }
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
