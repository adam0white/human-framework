// G1 frozen source-specific evidence runner. Importing this file runs no Camp cases.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, relative, dirname, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const ENTRY='src/games/camp-current.js';
const RUNNER='artifacts/practice-incentive/gathering/runner.mjs';
const PROTOCOL='docs/practice-gathering-protocol.md';
const PREFLIGHT='docs/practice-incentive-preflight.md';
const command=value=>({kind:'command',value}), advance=minutes=>({kind:'advance',minutes});
const start=job=>command({type:'start',job});
const expanded=operations=>operations.flatMap(operation=>operation.kind==='advance'
  ?Array.from({length:operation.minutes},()=>advance(1)):[operation]);
const PREFIX=[start('gather-timber'),advance(16),start('forage'),advance(14)];
const ARMS={
  'G1-finish-timber-then-forage':[start('gather-timber'),advance(16),start('forage'),advance(13),start('forage'),advance(1)],
  'G1-finish-forage-then-timber':[start('forage'),advance(14),start('gather-timber'),advance(15),start('forage'),advance(1)],
  'G1-partial-forage-then-timber':[start('forage'),advance(6),command({type:'cancel'}),start('gather-timber'),advance(15),start('forage'),advance(9)],
  'G1-recover-then-timber':[advance(6),start('gather-timber'),advance(16),start('forage'),advance(8)],
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fileHash=path=>hash(readFileSync(path));
const clone=value=>structuredClone(value);
function repoPath(path){
  assert.equal(typeof path,'string');assert.ok(!isAbsolute(path),'Expected repository-relative path');
  const full=resolve(ROOT,path);assert.ok(!relative(ROOT,full).startsWith('..'),'Path escapes repository');return full;
}
function sourceFiles(){
  const visited=new Set();
  function visit(path){
    if(visited.has(path))return;visited.add(path);
    const source=readFileSync(repoPath(path),'utf8');
    const imports=/\b(?:import|export)\s+(?:[^;]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
    for(const match of source.matchAll(imports)){
      assert.ok(match[1].startsWith('.'),'Unexpected external Camp dependency');
      visit(relative(ROOT,resolve(dirname(repoPath(path)),match[1])));
    }
  }
  visit(ENTRY);
  return [...visited,RUNNER,PROTOCOL,PREFLIGHT].sort().map(path=>({path,sha256:fileHash(repoPath(path))}));
}
function writeNew(path,value){
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
}
function checkEntries(entries){
  const seen=new Set();
  for(const entry of entries){
    assert.ok(!seen.has(entry.path),'Duplicate frozen path');seen.add(entry.path);
    assert.equal(fileHash(repoPath(entry.path)),entry.sha256,`Frozen SHA mismatch: ${entry.path}`);
  }
}
function checkFreeze(path,freeze){
  const relativePath=relative(ROOT,resolve(path));repoPath(relativePath);
  assert.deepEqual(execFileSync('git',['show',`HEAD:${relativePath}`],{cwd:ROOT}),readFileSync(path),'Freeze is not committed unchanged at HEAD');
  assert.ok(Array.isArray(freeze.files),'Freeze lacks files');
  checkEntries(freeze.files);checkEntries([freeze.prefix]);
  const bound=new Map(freeze.files.map(entry=>[entry.path,entry.sha256]));
  for(const source of sourceFiles())assert.equal(bound.get(source.path),source.sha256,`Freeze omits current required source: ${source.path}`);
}
function summarize(game,refusals,firstTargetAt){
  return {status:refusals.length?'refused':game.clock.now===60?'reached-fixed-horizon':'prefix-only',
    now:game.clock.now,objective:{heldTimberAtLeast:8,firstReachedAt:firstTargetAt,met:game.stock.timber>=8},
    stock:clone(game.stock),structures:clone(game.structures),caches:game.caches,jobs:clone(game.jobs),
    people:clone(game.people),paid:clone(game.paid),work:clone(game.work),lastAssemblies:clone(game.lastAssemblies),
    stats:clone(game.stats),commitment:clone(game.commitment),window:clone(game.window)};
}
function replay(camp,id,operations){
  let game=camp.createGame(),firstTargetAt=game.stock.timber>=8?game.clock.now:null;
  const result={id,commands:[],states:[camp.exportGame(game)],views:[camp.getGameView(game)],refusals:[]};
  for(const operation of expanded(operations)){
    const atStep=result.commands.length,before=camp.exportGame(game);result.commands.push(clone(operation));
    try{
      if(operation.kind==='command')game=camp.applyCommand(game,operation.value);
      else if(operation.kind==='advance'){
        assert.equal(operation.minutes,1);game=camp.advanceGame(game,1);
      }else throw Error('Unsupported frozen operation');
    }catch(error){
      const unchanged=JSON.stringify(camp.exportGame(game))===JSON.stringify(before);
      result.refusals.push({atStep,operation:clone(operation),message:String(error.message),unchanged});
    }
    if(firstTargetAt===null&&game.stock.timber>=8)firstTargetAt=game.clock.now;
    result.states.push(camp.exportGame(game));result.views.push(camp.getGameView(game));
    if(result.refusals.length)break;
  }
  result.summary=summarize(game,result.refusals,firstTargetAt);return result;
}
function checkPrefix(record){
  assert.deepEqual(record.commands,expanded(PREFIX));assert.equal(record.refusals.length,0);
  const game=record.states.at(-1).game;
  assert.equal(game.clock.now,30);assert.equal(game.paid.player.gatheringMinutes,30);
  assert.equal(game.jobs.player,null);assert.equal(game.people.player.pending,null);
  assert.deepEqual(game.structures,{shelter:0,workbench:0,garden:0});assert.equal(game.window,null);
  assert.equal(game.commitment.status,'none');assert.equal(game.jobs.neighbor,null);
  assert.deepEqual(game.stock,{timber:7,salvage:2,food:6});
}
async function main(){
  const args=process.argv.slice(2),prefix=args.includes('--prefix'),run=args.includes('--run');
  assert.notEqual(prefix,run,'Choose exactly one of --prefix or --run');
  const option=name=>{const index=args.indexOf(name);assert.ok(index>=0&&args[index+1],`Missing ${name}`);return args[index+1];};
  const out=resolve(option('--out'));assert.ok(!existsSync(out),'Output already exists; preserve prior evidence');
  if(prefix){
    const files=sourceFiles(),camp=await import(pathToFileURL(repoPath(ENTRY)));
    const record=replay(camp,'G1-prefix',PREFIX);checkPrefix(record);
    writeNew(out,{nomination:'G1',mode:'administrative-prefix-only',sourceFiles:files,trajectory:record});
    console.log('G1 administrative prefix preserved; no comparison arms executed.');return;
  }
  const freezePath=resolve(option('--freeze')),freeze=JSON.parse(readFileSync(freezePath,'utf8'));checkFreeze(freezePath,freeze);
  const preserved=JSON.parse(readFileSync(repoPath(freeze.prefix.path),'utf8'));checkPrefix(preserved.trajectory);
  const camp=await import(pathToFileURL(repoPath(ENTRY)));
  const prefixRecord=replay(camp,'G1-prefix',PREFIX);assert.deepEqual(prefixRecord,preserved.trajectory,'Paid prefix replay changed');
  mkdirSync(out,{recursive:false});
  const result={nomination:'G1',freezeSha256:fileHash(freezePath),sourceFiles:sourceFiles(),node:process.version,
    horizon:60,objective:'Held timber >=8: timber component for both Woodshed stages; salvage still required',
    prefix:prefixRecord,trajectories:Object.entries(ARMS).map(([id,suffix])=>replay(camp,id,[...PREFIX,...suffix]))};
  writeNew(resolve(out,'G1-arms.json'),result);
  console.log('G1 four frozen trajectories recorded; independent replay and admission review remain.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
