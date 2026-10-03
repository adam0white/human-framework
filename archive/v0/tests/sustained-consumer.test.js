import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {packageSustainedPerson,SUSTAINED_SOURCES} from '../scripts/package-sustained-person.js';

const root=fileURLToPath(new URL('..',import.meta.url));
test('sustained candidate installs independently with exact reviewed bytes and denied repository access',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'sustained-consumer-'));
  try {
    const packed=await packageSustainedPerson({outputDirectory:join(temporary,'packed')});
    const consumer=join(temporary,'consumer');await mkdir(consumer);
    await copyFile(packed.tarball,join(consumer,'candidate.tgz'));
    await copyFile(join(root,'examples/sustained-consumer/consumer.js'),join(consumer,'consumer.js'));
    await writeFile(join(consumer,'package.json'),JSON.stringify({name:'independent-sustained-consumer',private:true,type:'module'}));
    const env={...process.env,NODE_OPTIONS:'',NODE_PATH:''};delete env.NODE_TEST_CONTEXT;
    const options={cwd:consumer,encoding:'utf8',stdio:['ignore','pipe','pipe'],env};
    execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--cache',join(temporary,'cache'),'./candidate.tgz'],options);
    await writeFile(join(consumer,'run.js'),[
      "import {readFileSync} from 'node:fs';",
      "import {runConsumer} from './consumer.js';",
      `try{readFileSync(${JSON.stringify(join(root,'src/development/index.js'))});throw new Error('repository accessible')}catch(error){if(error.code!=='ERR_ACCESS_DENIED')throw error}`,
      "await import('sustained-person/src/development/condition.js').then(()=>{throw new Error('private path exported')},e=>{if(e.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw e});",
      "process.stdout.write(JSON.stringify(runConsumer()));"
    ].join('\n'));
    const permission=['--permission','--experimental-permission'].find(flag=>process.allowedNodeEnvironmentFlags.has(flag));assert.ok(permission);
    const result=JSON.parse(execFileSync(process.execPath,[permission,`--allow-fs-read=${consumer}`,'--preserve-symlinks','--preserve-symlinks-main',join(consumer,'run.js')],options));
    assert.equal(result.format,'sustained-person-independent-consumer');
    assert.equal(result.resumeEqual,true);
    assert.equal(result.clockMinutes,7*1440);
    assert.equal(result.unseenReceiptChangedChoice,false);
    assert.ok(result.withRehearsal.accessibility>result.withoutRehearsal.accessibility);
    assert.equal(result.withRehearsal.instructionsStillRecorded,true);
    assert.equal(result.withoutRehearsal.instructionsStillRecorded,true);
    assert.equal(result.withRehearsal.consultationMinutes,0);
    assert.equal(result.withoutRehearsal.consultationMinutes,20);
    assert.equal(result.withoutRehearsal.returnedItemCount,1);
    assert.equal(result.returnedItemCount,1);
    assert.equal(result.commitmentStatus,'fulfilled');
    const metadata=JSON.parse(await readFile(join(consumer,'node_modules/sustained-person/package.json'),'utf8'));
    if(process.env.SUSTAINED_CONSUMER_REPORT)await writeFile(process.env.SUSTAINED_CONSUMER_REPORT,JSON.stringify({result,sourceSha256:packed.sha256,repositoryAccessDenied:true},null,2)+'\n');
    if(process.env.SUSTAINED_CONSUMER_REPORT)await writeFile(process.env.SUSTAINED_CONSUMER_REPORT,JSON.stringify({result,sourceSha256:packed.sha256,repositoryAccessDenied:true},null,2)+'\n');
    assert.equal(metadata.private,true);assert.equal(metadata.version,'0.1.0');assert.equal(metadata.dependencies,undefined);
    for(const source of SUSTAINED_SOURCES) {
      const bytes=await readFile(join(root,source)),installed=await readFile(join(consumer,'node_modules/sustained-person',source));
      assert.deepEqual(installed,bytes);
      assert.equal(packed.sha256[source],createHash('sha256').update(bytes).digest('hex'));
    }
  }finally{await rm(temporary,{recursive:true,force:true});}
});
