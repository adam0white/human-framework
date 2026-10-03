import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {packageDevelopingPerson,DEVELOPING_SOURCES} from '../scripts/package-developing-person.js';

const root=fileURLToPath(new URL('..',import.meta.url));
test('developing candidate installs from exact private bytes and runs a shared-tool consumer with denied repository access',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'developing-consumer-'));
  try {
    const packed=await packageDevelopingPerson({outputDirectory:join(temporary,'packed')});
    const consumer=join(temporary,'consumer');await mkdir(consumer);
    await copyFile(packed.tarball,join(consumer,'candidate.tgz'));
    await copyFile(join(root,'examples/developing-consumer/consumer.js'),join(consumer,'consumer.js'));
    await writeFile(join(consumer,'package.json'),JSON.stringify({name:'independent-developing-consumer',private:true,type:'module'}));
    const env={...process.env,NODE_OPTIONS:'',NODE_PATH:''};delete env.NODE_TEST_CONTEXT;
    const options={cwd:consumer,encoding:'utf8',stdio:['ignore','pipe','pipe'],env};
    execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--cache',join(temporary,'cache'),'./candidate.tgz'],options);
    await writeFile(join(consumer,'run.js'),[
      "import {readFileSync} from 'node:fs';",
      "import {runConsumer} from './consumer.js';",
      `try{readFileSync(${JSON.stringify(join(root,'src/social/relationships.js'))});throw new Error('repository accessible')}catch(error){if(error.code!=='ERR_ACCESS_DENIED')throw error}`,
      "await import('developing-person/src/meaning/duties.js').then(()=>{throw new Error('private path exported')},e=>{if(e.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw e});",
      "process.stdout.write(JSON.stringify(runConsumer()));"
    ].join('\n'));
    const permission=['--permission','--experimental-permission'].find(flag=>process.allowedNodeEnvironmentFlags.has(flag));assert.ok(permission);
    const result=JSON.parse(execFileSync(process.execPath,[permission,`--allow-fs-read=${consumer}`,'--preserve-symlinks','--preserve-symlinks-main',join(consumer,'run.js')],options));
    assert.equal(result.format,'developing-person-independent-consumer');
    assert.equal(result.repairAction,'restore-tool');
    assert.equal(result.repairStatus,'completed');
    assert.equal(result.coinsAfterRepair,2);
    assert.equal(result.recipientResponse,'deferred');
    assert.equal(result.relationshipAfter,'guarded');
    assert.equal(result.initialOpportunity,'observe');
    assert.equal(result.laterOpportunity,'teach');
    assert.equal(result.teachingCompleted,1);
    assert.equal(result.initialTendency,'check');
    assert.equal(result.regulatedTendency,'deliberate');
    assert.equal(result.initialBeliefStatus,'conflict');
    assert.equal(result.beliefAfterRegulation,'conflict');
    assert.equal(result.worldUnchangedByRegulation,true);
    assert.equal(result.reflectionPaidMinutes,5);
    assert.equal(result.actualPaidMinutes,40);
    assert.equal(result.compositeRestored,true);
    assert.equal(result.compositeSynchronized,true);
    assert.equal(result.resumeEqual,true);
    const metadata=JSON.parse(await readFile(join(consumer,'node_modules/developing-person/package.json'),'utf8'));
    assert.equal(metadata.private,true);assert.equal(metadata.version,'0.1.0');assert.equal(metadata.dependencies,undefined);
    for(const source of DEVELOPING_SOURCES) {
      const bytes=await readFile(join(root,source)),installed=await readFile(join(consumer,'node_modules/developing-person',source));
      assert.deepEqual(installed,bytes);
      assert.equal(packed.sha256[source],createHash('sha256').update(bytes).digest('hex'));
    }
    if(process.env.DEVELOPING_CONSUMER_REPORT)await writeFile(process.env.DEVELOPING_CONSUMER_REPORT,JSON.stringify({result,sourceSha256:packed.sha256,repositoryAccessDenied:true},null,2)+'\n');
  }finally{await rm(temporary,{recursive:true,force:true});}
});
