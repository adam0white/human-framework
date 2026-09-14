import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {packagePerson,PERSON_SOURCES} from '../scripts/package-person.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const example=fileURLToPath(new URL('../examples/person-consumer/consumer.js',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('private candidate installs as the only dependency for an independent asynchronous lending host',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'situated-person-consumer-'));
  try {
    assert.deepEqual(PERSON_SOURCES,['src/person/index.js','src/person/commitments.js']);
    const packed=await packagePerson({outputDirectory:join(temporary,'packed')});
    const firstTarball=join(temporary,'first-person.tgz');
    await copyFile(packed.tarball,firstTarball);
    const repeated=await packagePerson({outputDirectory:join(temporary,'packed')});
    assert.notEqual(repeated.directory,packed.directory);
    assert.deepEqual(repeated.sources,packed.sources);
    assert.deepEqual(repeated.sha256,packed.sha256);
    const secondTarball=join(temporary,'second-person.tgz');
    await copyFile(repeated.tarball,secondTarball);
    const metadata=JSON.parse(await readFile(join(packed.directory,'package.json'),'utf8'));
    assert.deepEqual(JSON.parse(await readFile(join(repeated.directory,'package.json'),'utf8')),metadata);
    assert.equal(metadata.name,'situated-person');
    assert.equal(metadata.version,'0.1.0');
    assert.equal(metadata.private,true);
    assert.equal(metadata.type,'module');
    assert.deepEqual(metadata.exports,{'.':'./src/person/index.js','./human':'./src/human/v0.1.1.js'});
    assert.deepEqual(metadata.componentVersions,{person:'0.1.0',human:'0.1.1'});
    assert.equal(metadata.scripts,undefined);
    assert.equal(metadata.dependencies,undefined);

    const environment={...process.env,NODE_OPTIONS:'',NODE_PATH:''};
    delete environment.NODE_TEST_CONTEXT;
    const permissionFlag=['--permission','--experimental-permission'].find(flag=>process.allowedNodeEnvironmentFlags.has(flag));
    assert.ok(permissionFlag,'Node must support filesystem permissions');
    async function runInstalled(tarball,name) {
      const consumer=join(temporary,name);
      await mkdir(consumer);
      await copyFile(tarball,join(consumer,'person.tgz'));
      await copyFile(example,join(consumer,'consumer.js'));
      await writeFile(join(consumer,'package.json'),JSON.stringify({name,private:true,type:'module'}));
      const options={cwd:consumer,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:environment};
      execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--cache',join(temporary,`${name}-cache`),'./person.tgz'],options);
      assert.deepEqual(await readdir(join(consumer,'node_modules')),['.package-lock.json','situated-person']);
      await writeFile(join(consumer,'run.js'),[
        "import {readFileSync} from 'node:fs';",
        "import * as person from 'situated-person';",
        "import * as human from 'situated-person/human';",
        "import {runConsumer} from './consumer.js';",
        `try { readFileSync(${JSON.stringify(join(root,'src','person','index.js'))}); throw new Error('repository read unexpectedly succeeded'); }`,
        "catch(error) { if(error.code!=='ERR_ACCESS_DENIED')throw error; }",
        "await import('situated-person/src/person/index.js').then(()=>{throw new Error('private path unexpectedly exported')},error=>{if(error.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw error});",
        "process.stdout.write(JSON.stringify(await runConsumer({...person,...human})));"
      ].join('\n'));
      const output=execFileSync(process.execPath,[permissionFlag,`--allow-fs-read=${consumer}`,'--preserve-symlinks','--preserve-symlinks-main',join(consumer,'run.js')],options);
      return {consumer,result:JSON.parse(output)};
    }
    const first=await runInstalled(firstTarball,'first-consumer');
    const second=await runInstalled(secondTarball,'second-consumer');
    assert.deepEqual(second.result,first.result);
    const {consumer,result}=first;

    assert.equal(result.format,'situated-person-consumer');
    assert.deepEqual(result.world,{itemLocation:'return-box',confirmation:'confirmed'});
    assert.equal(result.decisions.borrowerBeforeInstruction.actionId,'wait');
    assert.equal(result.decisions.borrowerAfterInstruction.actionId,'return');
    assert.equal(result.decisions.borrowerAfterInstruction.ruleId,'return-with-instructions');
    assert.equal(result.decisions.lenderBeforeDelivery.actionId,'wait');
    assert.equal(result.decisions.lenderAfterDelivery.actionId,'confirm');
    assert.equal(result.decisions.lenderAfterDelivery.ruleId,'check-return-message');
    assert.equal(result.persistence.borrowerResumeIdentical,true);
    assert.equal(result.persistence.lenderResumeIdentical,true);
    assert.equal(result.information.returnWithoutInstructionBlocked,true);
    assert.equal(result.information.hiddenReturnDidNotReachLender,true);
    assert.deepEqual(result.receivedByLender,['return-message','return-history']);
    assert.equal(result.returnInteractionContext,'loan-return');

    const installed=join(consumer,'node_modules','situated-person');
    for(const source of packed.sources) {
      const authoritative=await readFile(join(root,source));
      const installedBytes=await readFile(join(installed,source));
      assert.deepEqual(installedBytes,authoritative,`packaged bytes differ: ${source}`);
      assert.equal(packed.sha256[source],hash(authoritative));
    }
  } finally {
    await rm(temporary,{recursive:true,force:true});
  }
});
