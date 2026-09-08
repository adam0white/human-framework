import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createWaterHost,waterCommand,waterView} from './social-water-host.js';
import {createWorkHost,workCommand,workView} from './social-work-host.js';
import {createBook,propose,respond,fulfill,discard,exportBook} from '../src/social/contracts.js';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const SOURCES=['src/social/contracts.js','scripts/social-water-host.js','scripts/social-work-host.js','scripts/social-contract-probe.js'];
function waterChoice(view,pick){
  const id=pick(9)+1,actor=pick(7)===0?'intruder':pick(2)?'borrower':'lender';
  const choices=[{type:'ask'},{type:'respond',id,actor,decision:pick(4)===0?'maybe':pick(2)?'accept':'refuse'},
    {type:'repay',id,actor},{type:'release',id,actor},{type:'withdraw',id,actor},{type:'renounce',id,actor},
    {type:'collect',actor},{type:'pour',actor},{type:'tick',minutes:pick(41)},{type:'invent-water',amount:100}];
  // Add up to two choices using currently relevant IDs and valid parties.
  const pending=view.contracts.find(c=>c.status==='proposed'),active=view.contracts.find(c=>c.status==='accepted');
  if(pending)choices.push({type:'respond',id:pending.id,actor:'lender',decision:pick(3)?'accept':'refuse'});
  if(active)choices.push({type:'repay',id:active.id,actor:'borrower'});
  return choices[pick(choices.length)];
}
function workChoice(view,pick){
  const id=pick(9)+1,actor=pick(7)===0?'intruder':pick(2)?'owner':'worker',target=pick(2)?'pump':'gate';
  const choices=[{type:'ask',target},{type:'respond',id,actor,decision:pick(4)===0?'maybe':pick(2)?'accept':'refuse'},
    {type:'release',id,actor},{type:'withdraw',id,actor},{type:'renounce',id,actor},{type:'deliver'},
    {type:'start',actor,job:'work',target},{type:'start',actor,job:pick(2)?'meal':'rest'},
    {type:'cancel',actor},{type:'tick',minutes:pick(12)},{type:'fulfill',id,issuer:'intruder'}];
  const pending=view.contracts.find(c=>c.status==='proposed');
  if(pending)choices.push({type:'respond',id:pending.id,actor:'worker',decision:pick(3)?'accept':'refuse'});
  return choices[pick(choices.length)];
}
export function compareSocialHosts({runs=100,steps=80,seed=1701}={}){
  for(const [name,n,max] of [['runs',runs,1000],['steps',steps,1000],['seed',seed,4294967295]])if(!Number.isSafeInteger(n)||n<1||n>max)throw new Error(`Invalid ${name}`);
  let rng=seed;const pick=n=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return Math.floor(rng/4294967296*n);};
  const result={seed,runsPerHost:runs,stepsPerRun:steps,attemptedCommands:0,acceptedCommands:0,rejectedCommands:0,completed:{water:0,work:0},mismatches:[],saveResumeMismatches:0,mutationFailures:0,maxSnapshotBytes:{water:{shared:0,direct:0},work:{shared:0,direct:0}}};
  for(const [name,create,command,view,choose] of [['water',createWaterHost,waterCommand,waterView,waterChoice],['work',createWorkHost,workCommand,workView,workChoice]]){
    for(let run=0;run<runs;run++){
      let shared=create('shared'),direct=create('direct');const prefix=[];
      for(let step=0;step<steps;step++){
        const choice=choose(view(shared),pick);prefix.push(choice);result.attemptedCommands++;
        const before={shared:JSON.stringify(shared),direct:JSON.stringify(direct)};let a,b,aError=null,bError=null;
        try{a=command(shared,choice);}catch(error){aError=error.message;}
        try{b=command(direct,choice);}catch(error){bError=error.message;}
        if(JSON.stringify(shared)!==before.shared||JSON.stringify(direct)!==before.direct)result.mutationFailures++;
        if(Boolean(aError)!==Boolean(bError)||!aError&&!same(view(a),view(b))){
          result.mismatches.push({host:name,run,step,prefix:structuredClone(prefix),sharedError:aError,directError:bError,shared:a?view(a):null,direct:b?view(b):null});break;
        }
        if(aError){result.rejectedCommands++;continue;}
        result.acceptedCommands++;
        for(const [mode,state] of [['shared',shared],['direct',direct]]){
          const resumed=command(JSON.parse(JSON.stringify(state)),choice),expected=mode==='shared'?a:b;
          if(!same(resumed,expected))result.saveResumeMismatches++;
        }
        shared=a;direct=b;
        result.maxSnapshotBytes[name].shared=Math.max(result.maxSnapshotBytes[name].shared,Buffer.byteLength(JSON.stringify(shared)));
        result.maxSnapshotBytes[name].direct=Math.max(result.maxSnapshotBytes[name].direct,Buffer.byteLength(JSON.stringify(direct)));
      }
      result.completed[name]+=view(shared).contracts.filter(c=>c.status==='fulfilled').length;
    }
  }
  return result;
}
export function boundedContractProbe(cycles=10000){
  let book=createBook({authority:'probe',actors:['borrower','lender']}),largest=0;
  for(let n=0;n<cycles;n++){
    const at=n*3,id=n+1;
    book=propose(book,{actor:'borrower',to:'lender',obligor:'borrower',slot:'loan',terms:'two-buckets',dueAt:null,at});
    book=respond(book,{actor:'lender',id,decision:'accept',at:at+1});
    book=fulfill(book,{issuer:'probe',id,at:at+2,evidence:{sequence:id,contractId:id,terms:'two-buckets',reference:`transfer:${id}`}});
    largest=Math.max(largest,Buffer.byteLength(JSON.stringify(exportBook(book))));
    book=discard(book,{issuer:'probe',id,at:at+2});
  }
  return {cycles,nextId:book.nextId,lastReceipt:book.lastReceipt,retainedRecords:book.records.length,largestSnapshotBytes:largest,finalSnapshotBytes:Buffer.byteLength(JSON.stringify(exportBook(book)))};
}
export async function sourceAccount(){
  const root=fileURLToPath(new URL('../',import.meta.url)),result={};
  for(const path of SOURCES){const bytes=await readFile(resolve(root,path)),source=bytes.toString();result[path]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,nonblankLines:source.split('\n').filter(line=>line.trim()).length};
    if(path.includes('-host.js')){
      const direct=source.slice(source.indexOf('function direct('),source.indexOf('function shared('));
      const shared=source.slice(source.indexOf('function shared('),source.indexOf(path.includes('water')?'export function createWaterHost':'function settleCommitments'));
      result[path].transitionLines={direct:direct.split('\n').filter(line=>line.trim()).length,shared:shared.split('\n').filter(line=>line.trim()).length};
    }
  }
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length>3)throw new Error('Usage: node scripts/social-contract-probe.js [private-output.json]');
  const report={generatedAt:new Date().toISOString(),environment:{node:process.version,platform:process.platform,architecture:process.arch},scope:'Two authored miniature hosts; equal policies and physics. No human subjects, public integration, independent consumer, or claimed runtime advantage.',comparison:compareSocialHosts(),bounded:boundedContractProbe(),sources:await sourceAccount()};
  if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.comparison.mismatches.length||report.comparison.saveResumeMismatches||report.comparison.mutationFailures)process.exitCode=1;
}
