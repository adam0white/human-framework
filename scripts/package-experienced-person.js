import {mkdir,mkdtemp,readFile,writeFile,lstat,realpath} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
/** Exact private source allowlist; historical candidate and runtime bytes are copied unchanged. */
export const EXPERIENCED_SOURCES=Object.freeze([
  'src/experience/index.js','src/experience/workspace.js','src/experience/episodes.js',
  'src/experience/attention.js','src/experience/inference.js',
  'src/adaptive/index.js','src/adaptive/person.js','src/adaptation/habits.js',
  'src/constraints/functional.js','src/institution/access.js',
  'src/developing/index.js','src/developing/person.js','src/affect/appraisal.js','src/social/relationships.js','src/meaning/duties.js','src/lifecourse/adult.js',
  'src/cognition/index.js','src/cognition/beliefs.js','src/cognition/planner.js',
  'src/development/index.js','src/development/condition.js','src/development/learning.js',
  'src/person/index.js','src/person/commitments.js','src/human/v0.1.1.js','src/core/model.js'
]);

export async function packageExperiencedPerson({outputDirectory}={}) {
  const output=resolve(outputDirectory??join(root,'person-dist','experienced'));
  const realRoot=await realpath(root),contents=new Map(),sha256={};
  for(const source of EXPERIENCED_SOURCES) {
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
  const metadata={name:'experienced-person',version:'0.1.0',private:true,type:'module',license:'UNLICENSED',
    description:'Private actor episode, attention and authored inference candidate',engines:{node:'>=22'},
    exports:{'.':'./src/experience/index.js','./experience':'./src/experience/index.js',
      './episodes':'./src/experience/episodes.js','./attention':'./src/experience/attention.js','./inference':'./src/experience/inference.js',
      './adaptive':'./src/adaptive/index.js','./developing':'./src/developing/index.js','./habits':'./src/adaptation/habits.js',
      './constraints':'./src/constraints/functional.js','./institution':'./src/institution/access.js',
      './cognition':'./src/cognition/index.js','./sustained':'./src/development/index.js','./learning':'./src/development/learning.js',
      './situated':'./src/person/index.js','./commitments':'./src/person/commitments.js','./human':'./src/human/v0.1.1.js'},
    componentVersions:{experiencedPerson:'0.1.0',episodes:'0.1.0',attention:'0.1.0',inference:'0.1.0',adaptivePerson:'0.1.0',
      habits:'0.1.0',functionalContext:'0.1.0',institution:'0.1.0',developingPerson:'0.1.0',appraisal:'0.1.0',relationships:'0.1.0',
      duties:'0.1.0',adultCourse:'0.1.0',cognition:'0.1.0',sustained:'0.1.0',situated:'0.1.0',human:'0.1.1'},
    files:EXPERIENCED_SOURCES};
  await writeFile(join(directory,'package.json'),JSON.stringify(metadata,null,2)+'\n');
  const packed=JSON.parse(execFileSync('npm',['pack','--json','--offline','--ignore-scripts','--cache',join(output,'.npm-cache'),'--pack-destination',output],
    {cwd:directory,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'',NODE_PATH:''}}));
  const expected=['package.json',...EXPERIENCED_SOURCES].sort();
  if(packed.length!==1||packed[0].name!==metadata.name||packed[0].version!==metadata.version||
    JSON.stringify(packed[0].files.map(file=>file.path).sort())!==JSON.stringify(expected))throw new Error('Package differs from source allowlist');
  return {directory,tarball:join(output,packed[0].filename),sources:[...EXPERIENCED_SOURCES],sha256};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.argv.length>3)throw new Error('Usage: node scripts/package-experienced-person.js [output-directory]');
  process.stdout.write(JSON.stringify(await packageExperiencedPerson(process.argv[2]?{outputDirectory:process.argv[2]}:{}),null,2)+'\n');
}
