/** Replay preserved evidence with its exact original Git bytes, never current physics. */
import {readFile,mkdtemp,mkdir,writeFile,rm,lstat} from 'node:fs/promises';
import {resolve,dirname,isAbsolute} from 'node:path';
import {tmpdir,platform,arch} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
async function main(){
  const args=process.argv.slice(2),options={};while(args.length){const key=args.shift();if(!['--input','--out'].includes(key)||!args.length||Object.hasOwn(options,key))throw Error('Use --input evidence --out fresh-output.');options[key]=args.shift();}
  if(!options['--input']||!options['--out'])throw Error('Use --input evidence --out fresh-output.');
  const output=resolve(ROOT,options['--out']);try{await lstat(output);throw Error('Refusing to overwrite existing evidence.');}catch(e){if(e.code!=='ENOENT')throw e;}
  const input=resolve(ROOT,options['--input']),bytes=await readFile(input),artifact=JSON.parse(input.endsWith('.gz')?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8'));
  if(artifact.format!=='across-cut-comparison'||artifact.version!==1||!Array.isArray(artifact.trials))throw Error('Unsupported evidence.');
  const {executionCommit:sourceCommit,sourceSha256}=artifact.provenance;if(!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('Exact original source commit required.');
  const graph=new Map();
  for(const [path,expected]of Object.entries(sourceSha256)){
    if(isAbsolute(path)||path.split('/').includes('..')||!path.startsWith('src/')&&!path.startsWith('scripts/')&&!path.startsWith('docs/')&&!path.startsWith('tests/'))throw Error('Unsafe source path.');
    const source=execFileSync('git',['show',`${sourceCommit}:${path}`],{cwd:ROOT,stdio:['ignore','pipe','ignore']});
    if(hash(source)!==expected)throw Error(`Original Git bytes differ for ${path}.`);graph.set(path,source);
  }
  const entry='src/experiments/across-cut/comparison/experiment.js';if(!graph.has(entry))throw Error('Original runner source absent.');
  // Verify every import target before any original source is evaluated.
  for(const [path,source]of graph){if(!path.endsWith('.js')||path.startsWith('tests/')||path==='scripts/across-cut-replay-history.js')continue;
    const text=source.toString('utf8');if(/\bimport\s*\(/.test(text))throw Error(`Unbound dynamic source import: ${path}`);
    for(const match of text.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g)){
      const spec=match[1];if(spec.startsWith('node:'))continue;
      if(!spec.startsWith('.'))throw Error(`Unbound external dependency: ${spec}`);
      const absolute=resolve('/',dirname(path),spec),target=absolute.slice(1);if(!graph.has(target))throw Error(`Unbound local dependency: ${target}`);
    }
  }
  const directory=await mkdtemp(resolve(tmpdir(),'across-cut-history-'));
  try{
    for(const [path,source]of graph){await mkdir(dirname(resolve(directory,path)),{recursive:true});await writeFile(resolve(directory,path),source,{flag:'wx'});}
    await writeFile(resolve(directory,'package.json'),'{"type":"module"}\n',{flag:'wx'});
    const original=await import(pathToFileURL(resolve(directory,entry)).href);
    const verified=artifact.trials.map(trial=>({id:trial.id,finalSaveSha256:original.replayTrial(trial)}));
    await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({format:'across-cut-history-replay',version:1,input:options['--input'],inputSha256:hash(bytes),sourceCommit,sourceSha256,sourceVerified:true,verified,runtime:{node:process.version,platform:platform(),architecture:arch()}},null,2)+'\n',{flag:'wx'});
    process.stdout.write(`Verified original Git source and replayed ${verified.length} complete local-input journals.\n`);
  }finally{await rm(directory,{recursive:true,force:true});}
}
main().catch(e=>{process.stderr.write(`${e.message}\n`);process.exitCode=1;});
