import {mkdir,mkdtemp,readFile,writeFile,lstat,realpath} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const ADAPTIVE_SOURCES=Object.freeze([
  'src/adaptive/index.js','src/adaptive/person.js','src/adaptation/habits.js',
  'src/constraints/functional.js','src/institution/access.js',
  'src/developing/index.js','src/developing/person.js','src/affect/appraisal.js','src/social/relationships.js','src/meaning/duties.js','src/lifecourse/adult.js',
  'src/cognition/index.js','src/cognition/beliefs.js','src/cognition/planner.js',
  'src/development/index.js','src/development/condition.js','src/development/learning.js',
  'src/person/index.js','src/person/commitments.js','src/human/v0.1.1.js','src/core/model.js'
]);

/** Private source-selected candidate; released package bytes remain untouched. */
export async function packageAdaptivePerson({outputDirectory}={}) {
  const output=resolve(outputDirectory??join(root,'person-dist','adaptive'));
  const realRoot=await realpath(root),contents=new Map(),sha256={};
  for(const source of ADAPTIVE_SOURCES) {
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
  const metadata={name:'adaptive-person',version:'0.1.0',private:true,type:'module',license:'UNLICENSED',
    description:'Private paid adaptation and constrained opportunity candidate',engines:{node:'>=22'},
    exports:{'.':'./src/adaptive/index.js','./developing':'./src/developing/index.js','./habits':'./src/adaptation/habits.js',
      './constraints':'./src/constraints/functional.js','./institution':'./src/institution/access.js',
      './cognition':'./src/cognition/index.js','./sustained':'./src/development/index.js','./learning':'./src/development/learning.js',
      './situated':'./src/person/index.js','./commitments':'./src/person/commitments.js','./human':'./src/human/v0.1.1.js'},
    componentVersions:{adaptivePerson:'0.1.0',habits:'0.1.0',functionalContext:'0.1.0',institution:'0.1.0',developingPerson:'0.1.0',
      appraisal:'0.1.0',relationships:'0.1.0',duties:'0.1.0',adultCourse:'0.1.0',cognition:'0.1.0',sustained:'0.1.0',situated:'0.1.0',human:'0.1.1'},
    files:ADAPTIVE_SOURCES};
  await writeFile(join(directory,'package.json'),JSON.stringify(metadata,null,2)+'\n');
  const packed=JSON.parse(execFileSync('npm',['pack','--json','--offline','--ignore-scripts','--cache',join(output,'.npm-cache'),'--pack-destination',output],
    {cwd:directory,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'',NODE_PATH:''}}));
  const expected=['package.json',...ADAPTIVE_SOURCES].sort();
  if(packed.length!==1||packed[0].name!==metadata.name||packed[0].version!==metadata.version||
    JSON.stringify(packed[0].files.map(file=>file.path).sort())!==JSON.stringify(expected))throw new Error('Package differs from source allowlist');
  return {directory,tarball:join(output,packed[0].filename),sources:[...ADAPTIVE_SOURCES],sha256};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.argv.length>3)throw new Error('Usage: node scripts/package-adaptive-person.js [output-directory]');
  process.stdout.write(JSON.stringify(await packageAdaptivePerson(process.argv[2]?{outputDirectory:process.argv[2]}:{}),null,2)+'\n');
}
