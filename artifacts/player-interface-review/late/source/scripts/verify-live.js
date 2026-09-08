import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=process.argv[2];
const origin='https://human.adamwhite.work';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function files(directory){
  const result=[];
  for(const item of await readdir(directory,{withFileTypes:true})){
    const path=resolve(directory,item.name);
    if(item.isDirectory())result.push(...await files(path));
    else if(item.isFile())result.push(path);
    else throw new Error(`Unexpected build entry: ${path}`);
  }
  return result;
}
async function get(path){
  const response=await fetch(new URL(path,origin),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
  return {response,bytes:Buffer.from(await response.arrayBuffer())};
}
async function verify(){
  const local=JSON.parse(await readFile(resolve(root,'dist/release.json'),'utf8'));
  const status=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim();
  if(status)throw new Error('Current working tree is not clean.');
  const paths=(await files(resolve(root,'dist'))).sort();
  const digest=createHash('sha256');
  for(const path of paths){const rel=relative(resolve(root,'dist'),path);if(rel!=='release.json')digest.update(rel).update('\0').update(await readFile(path)).update('\0');}
  if(digest.digest('hex')!==local.assetsSha256)throw new Error('Local payload digest does not match the release manifest.');
  const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const remote=execFileSync('git',['ls-remote','--exit-code','origin','refs/heads/main'],{cwd:root,encoding:'utf8',timeout:30000}).trim().split(/\s/)[0];
  if(local.dirty!==false||local.commit!==source||remote!==source)throw new Error('Build, current source and pushed main must identify the same clean release.');
  const manifest=await get('/release.json');
  if(manifest.response.status!==200||JSON.stringify(JSON.parse(manifest.bytes))!==JSON.stringify(local))throw new Error('Live release manifest does not match the local release.');
  const payloads=[];
  for(const path of paths){
    const rel=relative(resolve(root,'dist'),path);
    if(rel==='_headers'||rel==='release.json')continue;
    const route=rel==='index.html'?'/':rel.endsWith('/index.html')?'/'+rel.slice(0,-'index.html'.length):'/'+rel;
    const expected=await readFile(path),live=await get(route);
    if(live.response.status!==200||!expected.equals(live.bytes))throw new Error(`Live payload differs: ${route} (${live.response.status})`);
    const cache=live.response.headers.get('cache-control')??'';
    if(!cache.includes('no-cache')||!cache.includes('no-transform')||!live.response.headers.get('content-security-policy')?.includes("script-src 'self'"))throw new Error(`Missing release headers: ${route}`);
    payloads.push({route,bytes:expected.length,sha256:hash(expected)});
  }
  const privatePaths=['/README.md','/research/islamic-foundations.md','/research/reviews/2026-09-07-games-fable-product.raw.json','/artifacts/courier-benchmark.json','/artifacts/user-runs/2026-09-07/courtyard-1-move-18.json','/runtime-dist/human-framework-runtime-0.1.0.tgz','/runtime-dist/human-framework-runtime-0.1.1.tgz','/src/social/contracts.js','/src/experiments/commons-comparison.js','/examples/maintenance-watch/host.js','/artifacts/evidence-milestone/verification.json','/research/reviews/2026-09-07-evidence-fable-api.raw.json','/docs/roadmap.md','/package.json','/wrangler.jsonc','/.git/config','/.worktrees/pump-shift/src/games/shift.js','/missing-route','/_headers'];
  privatePaths.push('/src/cognition/observation-memory.js','/src/experiments/mechanism-comparison/small-model.js',
    '/artifacts/observation-memory/2026-09-08-probe.json','/research/reviews/2026-09-08-autonomous-fable-provenance.json',
    '/src/coordination/attempt-clock.js','/src/experiments/body-isolation/pooled-model.js','/artifacts/play-notes/local-browser.json','/src/experiments/service-day/policies.js','/scripts/inspect-static-modules.mjs','/src/experiments/service-plan/cases.js','/artifacts/service-plan/development-initial.json');
  for(const path of privatePaths){const {response}=await get(path);if(response.status!==404)throw new Error(`Private/missing path returned ${response.status}: ${path}`);}
  const record={verifiedAt:new Date().toISOString(),origin,release:local,source,pushedMain:remote,payloads,privatePaths:privatePaths.map(path=>({path,status:404}))};
  if(output)await writeFile(resolve(output),JSON.stringify(record,null,2)+'\n');
  process.stdout.write(`Verified app ${local.appVersion}, engine ${local.engineVersion}, ${payloads.length} exact public payloads and ${privatePaths.length} private/missing 404s at ${source}.\n`);
  return record;
}
verify().catch(error=>{process.stderr.write(`Live verification failed: ${error.message}\n`);process.exitCode=1;});
