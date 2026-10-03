import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('..',import.meta.url));
const example=join(root,'examples','maintenance-watch');
const files=['package.json','host.js','host.test.js','run.js','measure.js'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('independently authored maintenance/watch consumes only an installed runtime with repository access denied',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'maintenance-package-'));
  try {
    const consumer=join(temporary,'consumer');await mkdir(consumer);
    const environment={...process.env,NODE_OPTIONS:'',NODE_PATH:''};
    // A parent `node --test` exports its private binary-reporting protocol.
    // The independent consumer must choose its own ordinary text reporter.
    delete environment.NODE_TEST_CONTEXT;
    const options={cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:environment};
    const packed=JSON.parse(execFileSync(process.execPath,[join(root,'scripts','package-runtime.js'),join(temporary,'packed')],options));
    const tarball=await readFile(packed.tarball);
    assert.equal(hash(tarball),packed.sha256);
    await copyFile(packed.tarball,join(consumer,'runtime.tgz'));
    const sourceHashes={};
    for(const file of files){
      await copyFile(join(example,file),join(consumer,file));
      const source=await readFile(join(example,file));
      assert.deepEqual(await readFile(join(consumer,file)),source,'consumer file is unchanged: '+file);
      sourceHashes[file]=hash(source);
    }
    const consumerOptions={...options,cwd:consumer};
    execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--cache',join(temporary,'npm-cache')],consumerOptions);
    const permissionFlag=['--permission','--experimental-permission'].find(flag=>process.allowedNodeEnvironmentFlags.has(flag));
    assert.ok(permissionFlag,'supported Node filesystem permission model');
    const run=(file)=>execFileSync(process.execPath,[permissionFlag,'--allow-fs-read='+consumer,'--preserve-symlinks','--preserve-symlinks-main',join(consumer,file)],consumerOptions);
    const entry=[
      "import test from 'node:test';",
      "import assert from 'node:assert/strict';",
      "import {readFileSync} from 'node:fs';",
      "import './host.test.js';",
      "test('repository source and unexported runtime internals are inaccessible',async()=>{",
      '  for(const file of '+JSON.stringify([join(root,'src','human','index.js'),join(example,'host.js')])+')assert.throws(()=>readFileSync(file),{code:"ERR_ACCESS_DENIED"});',
      "  await assert.rejects(import('human-framework-runtime/src/core/model.js'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});",
      '});'
    ].join('\n');
    await writeFile(join(consumer,'verify.js'),entry);
    const tests=run('verify.js');
    const demonstration=JSON.parse(run('run.js'));
    const measurements=JSON.parse(run('measure.js'));
    assert.equal(demonstration.resumeIdentical,true);
    assert.equal(demonstration.paired.outcome.unrepairedMinutes,0);
    assert.equal(demonstration.solo.outcome.unrepairedMinutes,7);
    assert.equal(measurements.eventBoundaries.samples,1000);
    assert.equal(measurements.requestCommands.samples,1000);
    assert.equal(measurements.longSession.pendingEvents,2);
    for(const file of files)assert.equal(hash(await readFile(join(consumer,file))),sourceHashes[file]);
    if(process.env.WATCH_EVIDENCE_DIRECTORY) {
      const output=resolve(root,process.env.WATCH_EVIDENCE_DIRECTORY);
      await mkdir(output,{recursive:true});
      const packageMetadata=JSON.parse(await readFile(join(consumer,'node_modules','human-framework-runtime','package.json'),'utf8'));
      const installedManifest=JSON.parse(await readFile(join(consumer,'node_modules','human-framework-runtime','runtime-manifest.json'),'utf8'));
      const evidence={recordedAt:new Date().toISOString(),baseCommit:execFileSync('git',['rev-parse','HEAD'],options).trim(),
        node:process.version,executable:await realpath(process.execPath),permissionFlag,
        hostImportsRewritten:0,repositoryReadsDenied:true,sourceHashes,
        package:{name:packed.name,version:packed.version,sha256:packed.sha256,files:packed.files,exports:packageMetadata.exports,manifest:installedManifest},
        note:'Source-file hashes identify the authored consumer; the base commit predates these new files. Files are copied byte-for-byte, then run from the installed package.'};
      await writeFile(join(output,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
      await writeFile(join(output,'tests.txt'),tests);
      await writeFile(join(output,'demonstration.json'),JSON.stringify(demonstration,null,2)+'\n');
      await writeFile(join(output,'measurements.json'),JSON.stringify(measurements,null,2)+'\n');
    }
  } finally {await rm(temporary,{recursive:true,force:true});}
});
