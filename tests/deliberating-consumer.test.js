import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {packageDeliberatingPerson,DELIBERATING_SOURCES} from '../scripts/package-deliberating-person.js';

const root=fileURLToPath(new URL('..',import.meta.url));
test('deliberating candidate installs independently with exact reviewed bytes and denied repository access',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'deliberating-consumer-'));
  try {
    const packed=await packageDeliberatingPerson({outputDirectory:join(temporary,'packed')});
    const consumer=join(temporary,'consumer');await mkdir(consumer);
    await copyFile(packed.tarball,join(consumer,'candidate.tgz'));
    await copyFile(join(root,'examples/deliberating-consumer/consumer.js'),join(consumer,'consumer.js'));
    await writeFile(join(consumer,'package.json'),JSON.stringify({name:'independent-deliberating-consumer',private:true,type:'module'}));
    const env={...process.env,NODE_OPTIONS:'',NODE_PATH:''};delete env.NODE_TEST_CONTEXT;
    const options={cwd:consumer,encoding:'utf8',stdio:['ignore','pipe','pipe'],env};
    execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--cache',join(temporary,'cache'),'./candidate.tgz'],options);
    await writeFile(join(consumer,'run.js'),[
      "import {readFileSync} from 'node:fs';",
      "import {runConsumer} from './consumer.js';",
      `try{readFileSync(${JSON.stringify(join(root,'src/cognition/beliefs.js'))});throw new Error('repository accessible')}catch(error){if(error.code!=='ERR_ACCESS_DENIED')throw error}`,
      "await import('deliberating-person/src/cognition/planner.js').then(()=>{throw new Error('private path exported')},e=>{if(e.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw e});",
      "process.stdout.write(JSON.stringify(runConsumer()));"
    ].join('\n'));
    const permission=['--permission','--experimental-permission'].find(flag=>process.allowedNodeEnvironmentFlags.has(flag));assert.ok(permission);
    const result=JSON.parse(execFileSync(process.execPath,[permission,`--allow-fs-read=${consumer}`,'--preserve-symlinks','--preserve-symlinks-main',join(consumer,'run.js')],options));
    assert.equal(result.format,'deliberating-person-independent-consumer');
    assert.equal(result.initialAction,'primary-room');
    assert.equal(result.replannedAction,'fallback-room');
    assert.equal(result.staleArrivalIgnored,true);
    assert.equal(result.forecastMutatedWorld,false);
    assert.equal(result.resumeEqual,true);
    assert.equal(result.commitmentStatus,'fulfilled');
    assert.equal(result.readyAt,30);
    assert.equal(result.credits,3);
    const metadata=JSON.parse(await readFile(join(consumer,'node_modules/deliberating-person/package.json'),'utf8'));
    if(process.env.DELIBERATING_CONSUMER_REPORT)await writeFile(process.env.DELIBERATING_CONSUMER_REPORT,JSON.stringify({result,sourceSha256:packed.sha256,repositoryAccessDenied:true},null,2)+'\n');
    assert.equal(metadata.private,true);assert.equal(metadata.version,'0.1.0');assert.equal(metadata.dependencies,undefined);
    for(const source of DELIBERATING_SOURCES) {
      const bytes=await readFile(join(root,source)),installed=await readFile(join(consumer,'node_modules/deliberating-person',source));
      assert.deepEqual(installed,bytes);
      assert.equal(packed.sha256[source],createHash('sha256').update(bytes).digest('hex'));
    }
  }finally{await rm(temporary,{recursive:true,force:true});}
});
