/** Private source provenance. Importing this module never runs a world. */
import {readFile,mkdir,writeFile,lstat} from 'node:fs/promises';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {hash} from './evidence.js';
export {hash};
export const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
export const PROTOCOL='docs/across-cut-comparison-protocol.md';
export const REGISTRATION_COMMIT='69fb67a59e8f1115b07b7286cbca952726f557e7';
export const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const gitBytes=(commit,path)=>execFileSync('git',['show',`${commit}:${path}`],{cwd:ROOT,stdio:['ignore','pipe','ignore']});
export async function assertFreshOutput(path){try{await lstat(path);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Refusing to overwrite existing evidence output.');}
export async function writeJSON(path,value){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
export async function checkProtocol(){const bytes=await readFile(resolve(ROOT,PROTOCOL));if(hash(bytes)!==hash(gitBytes(REGISTRATION_COMMIT,PROTOCOL)))throw Error('Protocol differs from registered source.');return hash(bytes);}

// Traverse all static local imports from executable/test roots, including host helpers
// and frozen transitive runtime/model imports. Dynamic local imports are disallowed.
export async function sourcePaths(){
  const found=new Set([PROTOCOL,'docs/across-cut-contract.md','docs/across-cut-comparison-amendments.md','scripts/runtime-release-lock.json']);
  async function visit(path){
    if(found.has(path))return;found.add(path);const text=await readFile(resolve(ROOT,path),'utf8');
    if(/\bimport\s*\(/.test(text))throw Error(`Dynamic import cannot be source-bound: ${path}`);
    const imports=[...text.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g)].map(x=>x[1]);
    for(const spec of imports){if(spec.startsWith('node:'))continue;if(!spec.startsWith('.'))throw Error(`Unbound dependency ${spec}`);const child=relative(ROOT,resolve(ROOT,dirname(path),spec));if(child.startsWith('..'))throw Error('Source escapes repository.');await visit(child);}
  }
  await visit('scripts/across-cut-comparison.js');
  // Tests use dynamic imports only for initial red-phase module-existence assertions;
  // their own bytes are bound, while production imports above form the source graph.
  found.add('tests/across-cut-comparison.test.js');
  return [...found].sort();
}
export async function sourceHashes(){const paths=await sourcePaths();return Object.fromEntries(await Promise.all(paths.map(async path=>[path,hash(await readFile(resolve(ROOT,path)))])));}
export async function freezeSources(){
  await checkProtocol();const sourceSha256=await sourceHashes(),paths=Object.keys(sourceSha256);
  if(git(['status','--porcelain','--',...paths]))throw Error('Commit all comparison and dependency sources before freezing.');
  const sourceCommit=git(['rev-parse','HEAD']);for(const path of paths)if(hash(gitBytes(sourceCommit,path))!==sourceSha256[path])throw Error(`Uncommitted source ${path}.`);
  return {format:'across-cut-comparison-freeze',version:1,sourceCommit,registeredCommit:REGISTRATION_COMMIT,frozenAt:new Date().toISOString(),sourceSha256};
}
const verifiedManifests=new WeakSet();
export const isVerifiedFreeze=value=>verifiedManifests.has(value);
export async function verifyFreeze(path){
  const bytes=await readFile(path),manifest=JSON.parse(bytes),rel=relative(ROOT,path);
  if(rel.startsWith('..')||!rel||manifest.format!=='across-cut-comparison-freeze'||manifest.version!==1)throw Error('Invalid committed freeze manifest.');
  let committed;try{committed=gitBytes('HEAD',rel);}catch{throw Error('Freeze manifest must be committed before evaluation.');}
  if(hash(bytes)!==hash(committed))throw Error('Freeze differs from committed bytes.');
  const current=await sourceHashes();if(JSON.stringify(current)!==JSON.stringify(manifest.sourceSha256))throw Error('Current sources do not match frozen sources.');
  if(manifest.registeredCommit!==REGISTRATION_COMMIT)throw Error('Different protocol registration.');
  for(const p of Object.keys(current))if(hash(gitBytes(manifest.sourceCommit,p))!==current[p])throw Error(`Frozen Git source differs: ${p}.`);
  await checkProtocol();verifiedManifests.add(manifest);return manifest;
}
export async function sourceSizes(){return Object.fromEntries(await Promise.all((await sourcePaths()).map(async path=>{const text=await readFile(resolve(ROOT,path),'utf8');return [path,{utf8Bytes:Buffer.byteLength(text),nonblankLines:text.split('\n').filter(x=>x.trim()).length}];})));}
