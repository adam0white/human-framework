import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {packageRuntime} from '../scripts/package-runtime.js';

const source=new URL('../src/games/commons.js',import.meta.url);
const progression=`
  let game=host.createGame();
  game=host.requestProject(game,'workbench');
  game=host.startJob(game,'gather-timber');
  game=host.advanceGame(game,7);
  const saved=JSON.parse(JSON.stringify(host.exportGame(game)));
  const restored=host.restoreGame(saved);
  const whole=host.advanceGame(game,600);
  let chunks=restored;
  for(let i=0;i<600;i++) chunks=host.advanceGame(chunks,1);
  assert.deepEqual(host.exportGame(chunks),host.exportGame(whole));
  assert.equal(whole.structures.workbench,2);
  assert.equal(whole.commitment.status,'fulfilled');
  assert.ok(whole.people.player.skills.gathering>0.1);
  assert.ok(whole.people.neighbor.skills.construction>0.05);
  assert.ok(whole.recent.length<=16);
  const result=host.exportGame(whole);
`;

test('the complete concurrent host runs from the installed package with only two import substitutions',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'commons-installed-host-'));
  try {
    const consumer=join(temporary,'consumer');await mkdir(consumer);
    const original=await readFile(source,'utf8');
    assert.equal(original.split("from '../human/index.js'").length-1,1);
    assert.equal(original.split("from '../runtime/clock.js'").length-1,1);
    const adapted=original.replace("from '../human/index.js'","from 'human-framework-runtime/human'")
      .replace("from '../runtime/clock.js'","from 'human-framework-runtime/clock'");
    assert.equal(adapted.replace("from 'human-framework-runtime/human'","from '../human/index.js'")
      .replace("from 'human-framework-runtime/clock'","from '../runtime/clock.js'"),original,'no host logic is rewritten');
    await writeFile(join(consumer,'host.js'),adapted);
    await writeFile(join(consumer,'package.json'),JSON.stringify({name:'commons-independent-consumer',private:true,type:'module'}));
    const packed=await packageRuntime({outputDirectory:join(temporary,'packed')});
    await copyFile(packed.tarball,join(consumer,'runtime.tgz'));
    const options={cwd:consumer,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'',NODE_PATH:''}};
    execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--cache',join(temporary,'npm-cache'),'./runtime.tgz'],options);
    await writeFile(join(consumer,'run.js'),`
      import assert from 'node:assert/strict';
      import {readFileSync} from 'node:fs';
      import * as host from './host.js';
      assert.throws(()=>readFileSync(${JSON.stringify(fileURLToPath(source))}),{code:'ERR_ACCESS_DENIED'});
      ${progression}
      process.stdout.write(JSON.stringify(result));
    `);
    const permissionFlag=['--permission','--experimental-permission'].find(flag=>process.allowedNodeEnvironmentFlags.has(flag));
    assert.ok(permissionFlag,'the declared Node runtime supports restricted consumer execution');
    const actual=execFileSync(process.execPath,[permissionFlag,`--allow-fs-read=${consumer}`,'--preserve-symlinks','--preserve-symlinks-main',join(consumer,'run.js')],options);
    const direct=execFileSync(process.execPath,['--input-type=module','-e',`
      import assert from 'node:assert/strict';
      import * as host from ${JSON.stringify(source.href)};
      ${progression}
      process.stdout.write(JSON.stringify(result));
    `],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    assert.deepEqual(JSON.parse(actual),JSON.parse(direct));
  } finally {await rm(temporary,{recursive:true,force:true});}
});
