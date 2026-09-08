/** Source-bound private comparison. No publication or network operations. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {platform,arch} from 'node:os';
import {ROOT,assertFreshOutput,checkProtocol,freezeSources,verifyFreeze,sourceHashes,sourceSizes,git} from '../src/experiments/across-cut/comparison/provenance.js';
import {runComparison,replayTrial} from '../src/experiments/across-cut/comparison/experiment.js';
async function writeArtifact(path,value){const text=JSON.stringify(value)+'\n';await mkdir(dirname(path),{recursive:true});await writeFile(path,path.endsWith('.gz')?gzipSync(text,{level:9}):text,{flag:'wx'});}
async function readArtifact(path){const bytes=await readFile(path);return JSON.parse(path.endsWith('.gz')?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8'));}
async function main(){
  const [action,...args]=process.argv.slice(2),options={};if(!['run','freeze','replay'].includes(action))throw Error('Use run|freeze|replay with --out fresh-path.');
  while(args.length){const key=args.shift();if(!['--out','--partition','--freeze','--input'].includes(key)||!args.length||Object.hasOwn(options,key))throw Error('Invalid comparison arguments.');options[key]=args.shift();}
  if(!options['--out'])throw Error('An explicit --out is required.');const out=resolve(ROOT,options['--out']);await assertFreshOutput(out);
  if(action==='freeze'){if(Object.keys(options).length!==1)throw Error('Freeze accepts only --out.');await writeArtifact(out,await freezeSources());process.stdout.write(`Committed sources frozen in ${out}\n`);return;}
  const partition=options['--partition']??'development';if(!['development','reserved'].includes(partition))throw Error('Invalid partition.');
  if((partition==='reserved'||action==='replay')&&!options['--freeze'])throw Error('Reserved comparison/replay requires a committed --freeze manifest.');
  const protocolSha256=await checkProtocol(),freeze=options['--freeze']?await verifyFreeze(resolve(ROOT,options['--freeze'])):null,sourceSha256=await sourceHashes();
  if(action==='replay'){
    if(!options['--input'])throw Error('Replay requires --input evidence.');const artifact=await readArtifact(resolve(ROOT,options['--input']));
    if(artifact.format!=='across-cut-comparison'||JSON.stringify(artifact.provenance.sourceSha256)!==JSON.stringify(sourceSha256))throw Error('Evidence source hashes do not match current frozen source.');
    const verified=artifact.trials.map(t=>({id:t.id,finalSaveSha256:replayTrial(t)}));
    await writeArtifact(out,{format:'across-cut-comparison-replay',version:1,input:options['--input'],sourceSha256,freeze,verified,runtime:{node:process.version,platform:platform(),architecture:arch()}});
    process.stdout.write(`Replayed ${verified.length} complete journals and both local decision inputs.\n`);return;
  }
  if(options['--input'])throw Error('Run does not accept --input.');
  const report=runComparison({partition,freeze});
  const artifact={...report,provenance:{executionCommit:git(['rev-parse','HEAD']),protocolSha256,sourceSha256,freeze},implementation:{sourceSizes:await sourceSizes(),note:'Includes complete static transitive source graph and full decision-input dictionary. Counts are not human authoring effort.'},runtime:{node:process.version,platform:platform(),architecture:arch()},scope:'Authored software cases. Policy interventions change paid messages/travel/work; same-script representations do not. No optimality, human evidence, general faculty or public-game graduation follows.'};
  await writeArtifact(out,artifact);
  for(const t of report.trials)process.stdout.write(`${t.id}: service=${t.final.service.units}; lost=${t.final.water.lost}; radio=${Object.values(t.final.actors).reduce((sum,a)=>sum+a.inventory.radio.consumed,0)}; errors=${t.errors.length}; commands=${t.commandCount}\n`);
}
main().catch(e=>{process.stderr.write(`${e.message}\n`);process.exitCode=1;});
