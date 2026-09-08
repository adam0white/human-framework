// Rebuild the private independent consumer from preserved source and lossless evidence.
import {readFile,writeFile,mkdir,mkdtemp,readdir,realpath} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),base=join(root,'artifacts/work-progress');
const out=process.argv[2]?resolve(process.argv[2]):await mkdtemp(join(tmpdir(),'hf-repair-reproduction-'));
const hash=data=>createHash('sha256').update(data).digest('hex');
async function put(path,data){const target=resolve(out,path);assert.ok(target.startsWith(out+'/'));await mkdir(dirname(target),{recursive:true});await writeFile(target,data);}
async function folder(source,prefix=''){
 for(const entry of await readdir(source,{withFileTypes:true})){
  if(entry.name==='storage-manifest.json')continue;
  const path=join(source,entry.name),relative=prefix?prefix+'/'+entry.name:entry.name;
  if(entry.isDirectory())await folder(path,relative);else if(entry.isFile())await put(relative,await readFile(path));else throw Error('Unexpected archive link');
 }
}
async function unpack(source,prefix=''){
 const manifest=JSON.parse(await readFile(join(source,'storage-manifest.json'),'utf8'));assert.equal(manifest.lossless,true);
 for(const item of manifest.files){
  const stored=await readFile(join(source,item.stored));assert.equal(hash(stored),item.storedSha256);
  const bytes=item.stored===item.original?stored:gunzipSync(stored);assert.equal(hash(bytes),item.sha256);
  await put(prefix?prefix+'/'+item.original:item.original,bytes);
 }
}
await mkdir(out,{recursive:true});assert.equal((await readdir(out)).length,0,'Choose a fresh empty output directory');
const baseline=join(base,'independent-repair-baseline');
for(const name of ['src','tests','kit'])await folder(join(baseline,name),name);
for(const name of ['package.json','kit-manifest.json'])await put(name,await readFile(join(baseline,name)));
await unpack(join(baseline,'evidence'),'evidence').catch(async error=>{
 // The baseline manifest covers evidence paths from its own root.
 if(error.code!=='ENOENT')throw error;
 const m=JSON.parse(await readFile(join(baseline,'storage-manifest.json'),'utf8'));
 for(const entry of m.files){const stored=await readFile(join(baseline,entry.stored));assert.equal(hash(stored),entry.storedSha256);const data=entry.original===entry.stored?stored:gunzipSync(stored);assert.equal(hash(data),entry.sha256);await put(entry.original,data);}
});
for(const name of ['00-baseline','01-gasket','02-two-pumps'])await unpack(join(base,'independent-repair-changes',name),'stages/'+name);
for(const name of ['evidence-gasket','evidence-two-pumps'])await unpack(join(base,'independent-repair-changes',name),name);
await unpack(join(base,'independent-repair-corrected'));
await put('npm-local/user.npmrc','');await put('npm-local/global.npmrc','');
const env={...process.env,NODE_OPTIONS:'',NODE_PATH:''};
const install=execFileSync('npm',['install','./kit-corrected','--offline','--ignore-scripts','--no-audit','--no-fund','--cache=./npm-local/cache','--userconfig=./npm-local/user.npmrc','--globalconfig=./npm-local/global.npmrc'],{cwd:out,env,encoding:'utf8'});
await put('reproduce-install.log',install);
const canonical=await realpath(out),permission=Number(process.versions.node.split('.')[0])>=23?'--permission':'--experimental-permission';
const result=execFileSync(process.execPath,[permission,'--allow-fs-read='+canonical,'tests/all.test.js'],{cwd:out,env,encoding:'utf8',maxBuffer:8*1024*1024});
await put('reproduce-tests.log',result);
const record={node:process.version,directory:canonical,readAllowance:canonical,nodeWritePermission:false,nodeChildProcessPermission:false,passed:true,method:'Source and evidence restored from Git archives; local package installed offline with scripts/config sources restricted; tests run without repository reads.'};
await put('reproduce-result.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));
