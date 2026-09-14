import {mkdir,mkdtemp,readdir,readFile,writeFile,lstat,realpath} from 'node:fs/promises';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {HUMAN_VERSION} from '../src/human/v0.1.1.js';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PERSON_VERSION='0.1.0';
const PACKAGE_NAME='situated-person';
const frozenDependencies=['src/human/v0.1.1.js','src/core/model.js'];
export const PERSON_SOURCES=Object.freeze(['src/person/index.js','src/person/commitments.js']);

async function validatePersonSources(root) {
  const base=join(root,'src/person');
  const found=[];
  async function visit(directory) {
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      const path=join(directory,entry.name);
      if(entry.isSymbolicLink())throw new Error(`Invalid situated-person source symlink: ${relative(root,path)}`);
      if(entry.isDirectory())await visit(path);
      else if(entry.isFile()&&entry.name.endsWith('.js'))found.push(relative(root,path));
    }
  }
  await visit(base);
  const actual=found.sort();
  if(JSON.stringify(actual)!==JSON.stringify([...PERSON_SOURCES].sort()))throw new Error(`Situated-person sources differ from reviewed allowlist: ${actual.join(', ')}`);
}

/** Build a private installable candidate from reviewed source files. */
export async function packagePerson({outputDirectory}={}) {
  const root=projectRoot;
  const output=resolve(outputDirectory??join(root,'person-dist'));
  const realRoot=await realpath(root);
  await validatePersonSources(root);
  const sources=[...PERSON_SOURCES,...frozenDependencies];
  const contents=new Map();
  const sha256={};
  for(const source of sources) {
    const path=join(root,source);
    const info=await lstat(path);
    if(!info.isFile()||info.isSymbolicLink()||await realpath(path)!==join(realRoot,source))throw new Error(`Invalid situated-person source: ${source}`);
    const bytes=await readFile(path);
    contents.set(source,bytes);
    sha256[source]=createHash('sha256').update(bytes).digest('hex');
  }

  await mkdir(output,{recursive:true});
  const directory=await mkdtemp(join(output,'package-'));
  for(const source of sources) {
    await mkdir(dirname(join(directory,source)),{recursive:true});
    await writeFile(join(directory,source),contents.get(source));
  }
  const metadata={
    name:PACKAGE_NAME,
    version:PERSON_VERSION,
    private:true,
    type:'module',
    license:'UNLICENSED',
    description:'Private situated-person candidate with explicit actor-local knowledge, purposes and interaction records',
    engines:{node:'>=22'},
    exports:{'.':'./src/person/index.js','./human':'./src/human/v0.1.1.js'},
    componentVersions:{person:PERSON_VERSION,human:HUMAN_VERSION},
    files:sources
  };
  await writeFile(join(directory,'package.json'),JSON.stringify(metadata,null,2)+'\n');
  const result=JSON.parse(execFileSync('npm',['pack','--json','--ignore-scripts','--offline','--cache',join(output,'.npm-cache'),'--pack-destination',output],{
    cwd:directory,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'',NODE_PATH:''}
  }));
  if(result.length!==1||result[0].name!==PACKAGE_NAME||result[0].version!==PERSON_VERSION)throw new Error('Unexpected situated-person package result');
  const expected=['package.json',...sources].sort();
  if(JSON.stringify(result[0].files.map(file=>file.path).sort())!==JSON.stringify(expected))throw new Error('Packed situated-person candidate does not match its source allowlist');
  const tarball=join(output,result[0].filename);
  return {directory,tarball,sources,sha256};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.argv.length>3)throw new Error('Usage: node scripts/package-person.js [output-directory]');
  process.stdout.write(JSON.stringify(await packagePerson(process.argv[2]?{outputDirectory:process.argv[2]}:{}),null,2)+'\n');
}
