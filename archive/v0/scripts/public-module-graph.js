import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

/** Static ES module syntax/link check only; target source is never evaluated. */
export function verifyStaticModules(inputs){
  if(!Array.isArray(inputs))throw new Error('Expected public module inputs');
  const paths=new Set();
  for(const entry of inputs){
    if(!entry||typeof entry.path!=='string'||! /^[a-zA-Z0-9_./-]+\.js$/.test(entry.path)||
      entry.path.startsWith('/')||entry.path.split('/').some(part=>!part||part==='.'||part==='..')||typeof entry.source!=='string')throw new Error('Invalid public module path/source');
    if(paths.has(entry.path))throw new Error(`Duplicate public module: ${entry.path}`);paths.add(entry.path);
  }
  const worker=fileURLToPath(new URL('./inspect-static-modules.mjs',import.meta.url));
  let output;
  try{output=execFileSync(process.execPath,['--experimental-vm-modules',worker],{
    input:JSON.stringify(inputs),encoding:'utf8',timeout:10000,maxBuffer:2*1024*1024,stdio:['pipe','pipe','pipe']
  });}catch(error){throw new Error(`Public static module parser failed or timed out (${error.code??error.signal??'process failure'})`);}
  const result=JSON.parse(output);if(!result.ok)throw new Error(result.error);
  return result.graph;
}
