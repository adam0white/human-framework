/** Private evidence provenance; this module never runs a simulated case. */
import {readFile,mkdir,writeFile,lstat} from 'node:fs/promises';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
export const PROTOCOL='docs/service-plan-comparison-protocol.md',REGISTRATION_COMMIT='5b87ceb';
export const SOURCES=Object.freeze([PROTOCOL,'src/games/service.js','src/games/service-plan.js','src/runtime/index.js','src/human/v0.1.1.js','src/runtime/clock.js','src/core/model.js','scripts/runtime-release-lock.json','src/experiments/service-plan/cases.js','src/experiments/service-plan/visible-pump.js','src/experiments/service-plan/experiment.js','src/experiments/service-plan/provenance.js','scripts/service-plan-comparison.js','tests/service-plan-comparison.test.js']);
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
export async function assertFreshOutput(path){try{await lstat(path);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Refusing to overwrite existing evidence output.');}
export async function writeJSON(path,value){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
export async function checkProtocol(){const bytes=await readFile(resolve(ROOT,PROTOCOL));if(hash(bytes)!==hash(execFileSync('git',['show',`${REGISTRATION_COMMIT}:${PROTOCOL}`],{cwd:ROOT})))throw Error('Protocol differs from registered source.');return hash(bytes);}
export async function sourceHashes(){return Object.fromEntries(await Promise.all(SOURCES.map(async p=>[p,hash(await readFile(resolve(ROOT,p)))])));}
export async function freezeSources(){
 await checkProtocol();if(git(['status','--porcelain','--',...SOURCES]))throw Error('Commit all comparison and dependency sources before freezing.');
 const sourceCommit=git(['rev-parse','HEAD']),sourceSha256=await sourceHashes();
 for(const p of SOURCES)if(hash(execFileSync('git',['show',`${sourceCommit}:${p}`],{cwd:ROOT}))!==sourceSha256[p])throw Error(`Uncommitted source ${p}.`);
 return {format:'service-plan-comparison-freeze',version:1,sourceCommit,registeredCommit:git(['rev-parse',REGISTRATION_COMMIT]),frozenAt:new Date().toISOString(),sourceSha256};
}
export async function verifyFreeze(path){
 const bytes=await readFile(path),m=JSON.parse(bytes),rel=relative(ROOT,path);
 if(rel.startsWith('..')||!rel||m.format!=='service-plan-comparison-freeze'||m.version!==1)throw Error('Invalid committed freeze manifest.');
 let committed;try{committed=execFileSync('git',['show',`HEAD:${rel}`],{cwd:ROOT,stdio:['ignore','pipe','ignore']});}catch{throw Error('Freeze manifest must be committed before evaluation.');}
 if(hash(bytes)!==hash(committed))throw Error('Freeze differs from committed bytes.');
 const current=await sourceHashes();if(JSON.stringify(current)!==JSON.stringify(m.sourceSha256))throw Error('Current sources do not match frozen sources.');
 if(m.registeredCommit!==git(['rev-parse',REGISTRATION_COMMIT]))throw Error('Different protocol registration.');
 for(const p of SOURCES)if(hash(execFileSync('git',['show',`${m.sourceCommit}:${p}`],{cwd:ROOT}))!==current[p])throw Error(`Frozen Git source differs: ${p}.`);
 await checkProtocol();return m;
}
export async function sourceSizes(){
 const paths=['src/games/service.js','src/games/service-plan.js',...SOURCES.filter(x=>x.startsWith('src/experiments/service-plan/'))];
 const entries=await Promise.all(paths.map(async p=>{const text=await readFile(resolve(ROOT,p),'utf8');return [p,{utf8Bytes:Buffer.byteLength(text),nonblankLines:text.split('\n').filter(x=>x.trim()).length}];}));
 const {transformVisiblePump}=await import('./visible-pump.js'),text=transformVisiblePump(await readFile(resolve(ROOT,'src/games/service-plan.js'),'utf8'));
 return {...Object.fromEntries(entries),generatedVisiblePumpHost:{utf8Bytes:Buffer.byteLength(text),nonblankLines:text.split('\n').filter(x=>x.trim()).length}};
}
