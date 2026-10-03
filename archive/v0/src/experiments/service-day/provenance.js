/** File/Git evidence checks only. No task execution occurs in this module. */
import {readFile,mkdir,writeFile,lstat} from 'node:fs/promises';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
export const PROTOCOL='docs/service-day-comparison-protocol.md';
export const REGISTRATION_COMMIT='42c482d';
export const SOURCES=Object.freeze([
 PROTOCOL,'src/games/service.js','src/runtime/index.js','src/human/v0.1.1.js','src/runtime/clock.js','src/core/model.js',
 'src/experiments/service-day/shared.js','src/experiments/service-day/policies.js','src/experiments/service-day/experiment.js',
 'src/experiments/service-day/provenance.js','scripts/service-day-comparison.js'
]);
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
export async function assertFreshOutput(path){
 try{await lstat(path);}catch(e){if(e.code==='ENOENT')return;throw e;}
 throw new Error('Refusing to overwrite existing evidence output.');
}
export async function writeJSON(path,value){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
export async function sourceHashes(){return Object.fromEntries(await Promise.all(SOURCES.map(async p=>[p,hash(await readFile(resolve(ROOT,p)))])));}
export async function checkProtocol(){
 const bytes=await readFile(resolve(ROOT,PROTOCOL));
 const original=execFileSync('git',['show',`${REGISTRATION_COMMIT}:${PROTOCOL}`],{cwd:ROOT});
 if(hash(bytes)!==hash(original))throw new Error('Protocol differs from its registered commit.');
 return hash(bytes);
}
export async function freezeSources(){
 await checkProtocol();
 if(git(['status','--porcelain','--',...SOURCES]))throw new Error('Commit every host/policy/harness/protocol source before freezing.');
 const sourceCommit=git(['rev-parse','HEAD']),sourceSha256=await sourceHashes();
 for(const path of SOURCES)if(hash(execFileSync('git',['show',`${sourceCommit}:${path}`],{cwd:ROOT}))!==sourceSha256[path])throw new Error(`Uncommitted source: ${path}`);
 return {format:'service-day-comparison-freeze',version:1,sourceCommit,registeredCommit:git(['rev-parse',REGISTRATION_COMMIT]),frozenAt:new Date().toISOString(),sourceSha256};
}
export async function verifyFreeze(path){
 const bytes=await readFile(path),manifest=JSON.parse(bytes),relativePath=relative(ROOT,path);
 if(relativePath.startsWith('..')||!relativePath||manifest.format!=='service-day-comparison-freeze'||manifest.version!==1)throw new Error('Invalid committed freeze manifest.');
 let committed;
 try{committed=execFileSync('git',['show',`HEAD:${relativePath}`],{cwd:ROOT,stdio:['ignore','pipe','ignore']});}catch{throw new Error('Freeze manifest must be committed before evaluation.');}
 if(hash(bytes)!==hash(committed))throw new Error('Freeze manifest differs from its committed bytes.');
 const current=await sourceHashes();
 if(JSON.stringify(manifest.sourceSha256)!==JSON.stringify(current))throw new Error('Freeze manifest does not match current sources.');
 if(manifest.registeredCommit!==git(['rev-parse',REGISTRATION_COMMIT]))throw new Error('Freeze names a different registration.');
 for(const source of SOURCES){
  const frozen=execFileSync('git',['show',`${manifest.sourceCommit}:${source}`],{cwd:ROOT});
  if(hash(frozen)!==current[source])throw new Error(`Source commit does not match frozen source: ${source}`);
 }
 await checkProtocol();return manifest;
}
export async function sourceSizes(){
 const paths=['src/experiments/service-day/policies.js','src/experiments/service-day/shared.js','src/games/service.js','src/experiments/service-day/experiment.js'];
 return Object.fromEntries(await Promise.all(paths.map(async p=>{const text=await readFile(resolve(ROOT,p),'utf8');return [p,{utf8Bytes:Buffer.byteLength(text),nonblankLines:text.split('\n').filter(line=>line.trim()).length}];})));
}
