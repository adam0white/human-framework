import {mkdir,mkdtemp,readFile,writeFile,rm,realpath,lstat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {RUNTIME_VERSION,HUMAN_VERSION,CLOCK_VERSION} from '../src/runtime/index.js';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const RUNTIME_SOURCES=Object.freeze([
  'src/runtime/index.js','src/runtime/clock.js','src/human/index.js','src/core/model.js'
]);
const packageName='human-framework-runtime';

/** Package authoritative modules byte-for-byte. No generated model source. */
export async function packageRuntime({root=projectRoot,outputDirectory=join(root,'runtime-dist')}={}) {
  const base=resolve(root),realBase=await realpath(base),output=resolve(outputDirectory);
  const contents=new Map();
  for(const source of [...RUNTIME_SOURCES,'docs/portable-runtime.md']) {
    const path=join(base,source),info=await lstat(path);
    if(!info.isFile()||info.isSymbolicLink()||await realpath(path)!==join(realBase,source))throw new Error(`Invalid runtime source or symlink: ${source}`);
    contents.set(source,await readFile(path));
  }
  // Alternate roots are fixture/copy inputs for this packer's versions. Require
  // the authored one-line, single-quoted literal form; never execute their code
  // to discover metadata or label different versions with this checkout's values.
  for(const [source,symbol,expected] of [
    ['src/runtime/index.js','RUNTIME_VERSION',RUNTIME_VERSION],
    ['src/human/index.js','HUMAN_VERSION',HUMAN_VERSION],
    ['src/runtime/clock.js','CLOCK_VERSION',CLOCK_VERSION]
  ]) {
    const pattern=new RegExp(`^export const ${symbol}='([^'\\r\\n]+)';$`,'gm');
    const declarations=[...contents.get(source).toString('utf8').matchAll(pattern)];
    if(declarations.length!==1)throw new Error(`Unsupported ${symbol} declaration in ${source}`);
    if(declarations[0][1]!==expected)throw new Error(`Runtime source version mismatch for ${symbol} in ${source}: expected ${expected}, found ${declarations[0][1]}`);
  }
  const metadata={
    name:packageName,version:RUNTIME_VERSION,private:true,type:'module',license:'UNLICENSED',
    description:'Deterministic body, practice and integer-minute event clock primitives for host-owned simulations',
    engines:{node:'>=22'},
    exports:{'.':'./src/runtime/index.js','./human':'./src/human/index.js','./clock':'./src/runtime/clock.js'},
    files:[...RUNTIME_SOURCES,'README.md','runtime-manifest.json']
  };
  const manifest={format:'human-framework-runtime',version:1,packageVersion:RUNTIME_VERSION,
    humanVersion:HUMAN_VERSION,clockVersion:CLOCK_VERSION,
    sources:RUNTIME_SOURCES.map(path=>({path,sha256:createHash('sha256').update(contents.get(path)).digest('hex')}))};
  const stage=await mkdtemp(join(tmpdir(),'human-runtime-pack-'));
  try {
    for(const source of RUNTIME_SOURCES) {
      await mkdir(dirname(join(stage,source)),{recursive:true});
      await writeFile(join(stage,source),contents.get(source));
    }
    await writeFile(join(stage,'package.json'),JSON.stringify(metadata,null,2)+'\n');
    await writeFile(join(stage,'runtime-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    await writeFile(join(stage,'README.md'),contents.get('docs/portable-runtime.md'));
    // Pack inside a clean staging directory so repository npm hooks, secrets,
    // games and research are not candidates for inclusion.
    const result=JSON.parse(execFileSync('npm',['pack','--json','--ignore-scripts','--offline','--cache',join(stage,'.npm-cache')],{
      cwd:stage,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'',NODE_PATH:''}
    }));
    const packed=result[0],expected=['package.json','README.md','runtime-manifest.json',...RUNTIME_SOURCES].sort();
    if(result.length!==1||packed.name!==packageName||packed.version!==RUNTIME_VERSION||
      JSON.stringify(packed.files.map(file=>file.path).sort())!==JSON.stringify(expected))throw new Error('Packed runtime does not match the source allowlist');
    const filename=`${packageName}-${RUNTIME_VERSION}.tgz`;
    if(packed.filename!==filename)throw new Error('Unexpected packed runtime filename');
    const bytes=await readFile(join(stage,filename));
    await mkdir(output,{recursive:true});
    const tarball=join(output,filename);await writeFile(tarball,bytes);
    return {name:packageName,version:RUNTIME_VERSION,tarball,files:expected,
      sha256:createHash('sha256').update(bytes).digest('hex'),manifest};
  } finally {await rm(stage,{recursive:true,force:true});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.argv.length>3)throw new Error('Usage: node scripts/package-runtime.js [output-directory]');
  const result=await packageRuntime(process.argv[2]?{outputDirectory:process.argv[2]}:{});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
