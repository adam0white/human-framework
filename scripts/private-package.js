import {mkdir,mkdtemp,readFile,writeFile,lstat,realpath} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

/** Copy only the candidate's declared sources and verify npm's exact file list. */
export async function packagePrivatePerson({sources,metadata,defaultDirectory,outputDirectory}) {
  const output=resolve(outputDirectory??join(root,'person-dist',defaultDirectory));
  const realRoot=await realpath(root),contents=new Map(),sha256={};
  for(const source of sources) {
    const path=join(root,source),info=await lstat(path);
    if(!info.isFile()||info.isSymbolicLink()||await realpath(path)!==join(realRoot,source))throw new Error(`Invalid candidate source: ${source}`);
    const bytes=await readFile(path);contents.set(source,bytes);
    sha256[source]=createHash('sha256').update(bytes).digest('hex');
  }
  await mkdir(output,{recursive:true});
  const directory=await mkdtemp(join(output,'package-'));
  for(const [source,bytes] of contents) {
    await mkdir(dirname(join(directory,source)),{recursive:true});
    await writeFile(join(directory,source),bytes);
  }
  await writeFile(join(directory,'package.json'),JSON.stringify(metadata,null,2)+'\n');
  const packed=JSON.parse(execFileSync('npm',['pack','--json','--offline','--ignore-scripts','--cache',join(output,'.npm-cache'),'--pack-destination',output],
    {cwd:directory,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'',NODE_PATH:''}}));
  const expected=['package.json',...sources].sort();
  if(packed.length!==1||packed[0].name!==metadata.name||packed[0].version!==metadata.version||
    JSON.stringify(packed[0].files.map(file=>file.path).sort())!==JSON.stringify(expected))throw new Error('Package differs from source allowlist');
  return {directory,tarball:join(output,packed[0].filename),sources:[...sources],sha256};
}
