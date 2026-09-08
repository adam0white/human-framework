import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,copyFile,rm,readdir,symlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const project=fileURLToPath(new URL('..',import.meta.url));
const script=new URL('../scripts/package-runtime.js',import.meta.url);
const packaging=existsSync(script)?await import(script):{};

test('portable package exposes an executable packer with an explicit source allowlist',()=>{
  assert.equal(typeof packaging.packageRuntime,'function');
  assert.deepEqual(packaging.RUNTIME_SOURCES,[
    'src/runtime/index.js','src/runtime/clock.js','src/human/index.js','src/core/model.js'
  ]);
});

test('actual npm tarball installs offline into an external consumer denied repository access',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'human-runtime-consumer-'));
  try {
    const consumer=join(temporary,'consumer');await mkdir(consumer);
    const packed=await packaging.packageRuntime({outputDirectory:join(temporary,'packed')});
    assert.equal(packed.name,'human-framework-runtime');
    assert.deepEqual(packed.files.sort(),['README.md','package.json','runtime-manifest.json',...packaging.RUNTIME_SOURCES].sort());
    await copyFile(packed.tarball,join(consumer,'runtime.tgz'));
    await writeFile(join(consumer,'package.json'),JSON.stringify({name:'isolated-consumer',private:true,type:'module'}));
    execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--cache',join(temporary,'npm-cache'),'./runtime.tgz'],{cwd:consumer,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    const installed=join(consumer,'node_modules','human-framework-runtime');
    const metadata=JSON.parse(await readFile(join(installed,'package.json'),'utf8'));
    assert.equal(metadata.private,true);assert.equal(metadata.scripts,undefined);
    assert.equal(metadata.dependencies,undefined);assert.equal(metadata.devDependencies,undefined);
    assert.deepEqual(await readdir(join(consumer,'node_modules')),['.package-lock.json','human-framework-runtime']);
    const manifest=JSON.parse(await readFile(join(installed,'runtime-manifest.json'),'utf8'));
    assert.equal(manifest.packageVersion,packed.version);
    for(const source of manifest.sources) {
      const authoritative=await readFile(join(project,source.path));
      assert.deepEqual(await readFile(join(installed,source.path)),authoritative);
      assert.equal(source.sha256,createHash('sha256').update(authoritative).digest('hex'));
    }
    await writeFile(join(consumer,'consumer.js'),`
      import assert from 'node:assert/strict';
      import {readFileSync} from 'node:fs';
      import * as runtime from 'human-framework-runtime';
      import * as human from 'human-framework-runtime/human';
      import * as clockAPI from 'human-framework-runtime/clock';
      assert.throws(()=>readFileSync(${JSON.stringify(join(project,'src/human/index.js'))}),{code:'ERR_ACCESS_DENIED'});
      assert.equal(runtime.createPerson,human.createPerson);
      assert.equal(runtime.createClock,clockAPI.createClock);
      assert.equal(runtime.createSimulation,undefined);
      await assert.rejects(import('human-framework-runtime/src/core/model.js'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
      let person=runtime.createPerson({id:'builder',body:{fatigue:0.1,hunger:0.1},skills:{repair:0.2}});
      const initial=runtime.exportPerson(person);
      person=runtime.beginAttempt(person,{actionId:'repair',targetId:'valve',durationMinutes:10,effort:0.1,exertive:true,skill:'repair'});
      let {clock,eventId}=runtime.scheduleEvent(runtime.createClock(),{at:10,type:'finish',actorId:person.id,data:{attemptId:person.pending.id}});
      person=runtime.advanceAttempt(person,4);clock=runtime.advanceClock(clock,4).clock;
      const save=JSON.parse(JSON.stringify({person:runtime.exportPerson(person),clock:runtime.exportClock(clock)}));
      function complete(person,clock) {
        const next=runtime.advanceClock(clock,20);
        person=runtime.advanceAttempt(person,next.clock.now-clock.now);
        assert.equal(next.events.length,1);assert.equal(next.events[0].id,eventId);
        assert.equal(next.events[0].actorId,person.id);
        person=runtime.finishAttempt(person,{attemptId:next.events[0].data.attemptId,status:'completed'});
        assert.throws(()=>runtime.finishAttempt(person,{attemptId:next.events[0].data.attemptId,status:'completed'}));
        return {person:runtime.exportPerson(person),clock:runtime.exportClock(next.clock)};
      }
      const direct=complete(person,clock);
      const resumed=complete(runtime.restorePerson(save.person),runtime.restoreClock(save.clock));
      assert.deepEqual(resumed,direct);
      assert.equal(resumed.person.person.minutes,10);
      assert.ok(resumed.person.person.skills.repair>initial.person.skills.repair);
      assert.equal(resumed.person.person.pending,null);
      assert.equal(runtime.assessEffort({fatigue:0.95,hunger:0.1},{durationMinutes:10,effort:0.1,exertive:true}).allowed,false);
      assert.equal(runtime.getPersonView(resumed.person.person).minutes,10);
      assert.ok(runtime.estimateSuccess({skill:0.3,body:{fatigue:0.1,hunger:0.1},difficulty:0.4})>0);
      process.stdout.write(JSON.stringify({installed:true,repositoryReadDenied:true,resumeIdentical:true,versions:[runtime.RUNTIME_VERSION,runtime.HUMAN_VERSION,runtime.CLOCK_VERSION]}));
    `);
    // macOS /var is a symlink: avoid resolving unrestricted ancestors before
    // Node can load the permitted consumer. All installed files are real files.
    const output=execFileSync(process.execPath,['--experimental-permission',`--allow-fs-read=${consumer}`,'--preserve-symlinks','--preserve-symlinks-main',join(consumer,'consumer.js')],{cwd:consumer,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'',NODE_PATH:''}});
    assert.deepEqual(JSON.parse(output),{installed:true,repositoryReadDenied:true,resumeIdentical:true,versions:[packed.version,'0.1.0','0.1.0']});
  } finally {await rm(temporary,{recursive:true,force:true});}
});

test('packer excludes arbitrary nearby files and rejects symlinked source or document inputs',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'human-runtime-allowlist-'));
  try {
    for(const source of [...packaging.RUNTIME_SOURCES,'docs/portable-runtime.md']) {
      await mkdir(dirname(join(temporary,source)),{recursive:true});
      await copyFile(join(project,source),join(temporary,source));
    }
    await writeFile(join(temporary,'src/runtime/private-notes.js'),'do not package');
    await writeFile(join(temporary,'.env'),'do not package');
    const packed=await packaging.packageRuntime({root:temporary,outputDirectory:join(temporary,'result')});
    assert.equal(packed.files.includes('.env'),false);assert.equal(packed.files.includes('src/runtime/private-notes.js'),false);
    const victim=join(temporary,'src/human/index.js');await rm(victim);
    await symlink(join(project,'src/human/index.js'),victim);
    await assert.rejects(packaging.packageRuntime({root:temporary,outputDirectory:join(temporary,'rejected')}),/symlink|source/i);
    assert.equal(existsSync(join(temporary,'rejected')),false);
    await rm(victim);await copyFile(join(project,'src/human/index.js'),victim);
    const document=join(temporary,'docs/portable-runtime.md');await rm(document);
    await symlink(join(project,'docs/portable-runtime.md'),document);
    await assert.rejects(packaging.packageRuntime({root:temporary,outputDirectory:join(temporary,'rejected-document')}),/symlink|source/i);
  } finally {await rm(temporary,{recursive:true,force:true});}
});
