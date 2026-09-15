import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {packageExperiencedPerson,EXPERIENCED_SOURCES} from '../scripts/package-experienced-person.js';

const root=fileURLToPath(new URL('..',import.meta.url));

test('experienced candidate installs exact bytes and changes facility maintenance dispatch outside repository access',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'experienced-consumer-'));
  try {
    const packed=await packageExperiencedPerson({outputDirectory:join(temporary,'packed')});
    const consumer=join(temporary,'consumer');await mkdir(consumer);
    await copyFile(packed.tarball,join(consumer,'candidate.tgz'));
    await writeFile(join(consumer,'package.json'),JSON.stringify({name:'independent-maintenance-dispatch',private:true,type:'module'}));
    const env={...process.env,NODE_OPTIONS:'',NODE_PATH:''};delete env.NODE_TEST_CONTEXT;
    const options={cwd:consumer,encoding:'utf8',stdio:['ignore','pipe','pipe'],env};
    execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--cache',join(temporary,'cache'),'./candidate.tgz'],options);
    await writeFile(join(consumer,'run.js'),`
import {readFileSync} from 'node:fs';
import {createExperienceWorkspace,receiveExperienceEpisode,deliverExperienceMessage,beginExperienceAttempt,advanceExperienceAttempt,finishExperienceAttempt,advanceExperience,getExperienceView,exportExperienceWorkspace,restoreExperienceWorkspace} from 'experienced-person';
import {createEpisodes,queryEpisodes} from 'experienced-person/episodes';
import {createAttention,getAttentionView} from 'experienced-person/attention';
import {createInference,inferBeliefs} from 'experienced-person/inference';
import {createAdaptivePerson,createHabits} from 'experienced-person/adaptive';
import {createDevelopingPerson,createRelationships,createDuties,createAdultCourse,createAppraisal} from 'experienced-person/developing';
import {createSustainedPerson,createLearning} from 'experienced-person/sustained';
import {createSituatedPerson} from 'experienced-person/situated';
import {createBeliefs} from 'experienced-person/cognition';
import {createPerson} from 'experienced-person/human';
try{readFileSync(${JSON.stringify(join(root,'src/experience/workspace.js'))});throw new Error('repository accessible')}catch(error){if(error.code!=='ERR_ACCESS_DENIED')throw error}
await import('experienced-person/src/experience/workspace.js').then(()=>{throw new Error('private path exported')},error=>{if(error.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw error});

const catalog={actors:['technician','coordinator','inspector'],facts:[],purposes:['clearTicket'],commitments:[],actions:['reviewDispatch','directVisit','alternateVisit']};
const facts=['accessOpen','authorizationValid'];
const action=(actionId,durationMinutes)=>({actionId,durationMinutes,effort:0,exertive:false,activity:'active',skill:actionId==='reviewDispatch'?null:'maintenance'});
function create(){
 const id='technician';
 const human=createPerson({id,body:{fatigue:.1,hunger:.1},skills:{maintenance:.2}});
 const situated=createSituatedPerson({human,now:0,purposes:[{id:'clearTicket',status:'active'}]},catalog);
 const sustained=createSustainedPerson({situated,learning:createLearning({skills:['maintenance']})},catalog);
 const developing=createDevelopingPerson({sustained,
  beliefs:createBeliefs({ownerId:id,now:0,propositions:facts,sources:catalog.actors}),
  relationships:createRelationships({ownerId:id,now:0,actors:catalog.actors,contexts:['plant'],ties:[]}),
  duties:createDuties({ownerId:id,now:0,cases:[]}),
  course:createAdultCourse({actorId:id,startDay:0,ageAtStartYears:30,catalog:{actors:catalog.actors,skills:['maintenance'],qualifications:[],roles:[],opportunities:[]}}),
  appraisal:createAppraisal({ownerId:id,now:0,contexts:[],maxConcernMinutes:30,minReflectionMinutes:5})},catalog);
 const actor=createAdaptivePerson({person:developing,habits:createHabits({ownerId:id,now:0,habits:[],revisions:[]})},catalog);
 return createExperienceWorkspace({actor,
  episodes:createEpisodes({ownerId:id,now:0,contexts:['plant','garage'],sources:catalog.actors,propositions:facts}),
  attention:createAttention({ownerId:id,now:0,reviewActionId:'reviewDispatch',minReviewMinutes:2}),
  inference:createInference({ownerId:id,propositions:[...facts,'directEligible'],rules:[
   {ruleId:'authorized-direct',when:[{propositionId:'accessOpen',value:true},{propositionId:'authorizationValid',value:true}],then:{propositionId:'directEligible',value:true}},
  ]})},catalog);
}
const episode={episodeId:'old-access',eventId:'ticket-old',contextId:'plant',sourceId:'technician',originId:'technician',
 occurredAt:0,receivedAt:0,expiresAt:80,actionId:'directVisit',outcomeId:'access-blocked',facts:[{propositionId:'accessOpen',value:false}],correctsEpisodeId:null};
const message=(messageId,propositionId,value,originId='coordinator',expiresAt=100)=>({messageId,contextId:'plant',propositionId,
 sourceId:originId,originId,value,occurredAt:0,deliveredAt:0,expiresAt,correctsReceiptId:null});
const view=s=>getExperienceView(s,catalog,{contextId:'plant'});
function eligible(s){return view(s).reasoning.conclusions.find(x=>x.propositionId==='directEligible').status}
function choose(s){
 if(eligible(s)==='true')return 'directVisit';
 const old=view(s).memories.episodes.some(x=>x.actionId==='directVisit'&&x.outcomeId==='access-blocked');
 return old?'alternateVisit':'directVisit';
}
const directPolicy=(knownBlocked,accessOpen,authorized)=>accessOpen===true&&authorized===true?'directVisit':knownBlocked?'alternateVisit':'directVisit';
function finish(s,status='completed'){return finishExperienceAttempt(s,{attemptId:s.actor.person.sustained.situated.human.pending.id,status,mealConsumed:false},catalog)}
function paid(s,actionId,minutes,messageId=null,status='completed'){s=beginExperienceAttempt(s,{action:action(actionId,minutes),attentionMessageId:messageId},catalog);s=advanceExperienceAttempt(s,minutes,catalog);return finish(s,status)}
// The facility is canonical. Reports and inference never directly settle a ticket.
function dispatchTicket(s,world){
 const method=choose(s),minutes=method==='directVisit'?3:5;
 const canComplete=method==='alternateVisit'||world.accessOpen===true&&world.authorizationValid===true;
 s=paid(s,method,minutes,null,canComplete?'completed':'failed');
 if(canComplete){world.completedTickets++;world[method==='directVisit'?'direct':'alternate']++;}
 return {state:s,method,status:canComplete?'completed':'failed'};
}
let work={accessOpen:true,authorizationValid:true,completedTickets:0,direct:0,alternate:0};
let state=receiveExperienceEpisode(create(),episode,catalog);
const noEpisodeChoice=choose(create());
const noMessageChoice=choose(state);
state=deliverExperienceMessage(state,message('access-open','accessOpen',true),catalog);
state=deliverExperienceMessage(state,message('authorized','authorizationValid',true),catalog);
const unreadStatus=eligible(state),unreadChoice=choose(state);
if(getAttentionView(state.attention).processedCount!==0||state.actor.person.beliefs.receipts.length!==0)throw Error('unread message became belief');
let ticket=dispatchTicket(state,work),method=ticket.method;state=ticket.state;
const elapsedAfterEpisode=state.actor.person.sustained.situated.now;
// Save after one paid minute of selected review, then continue from exact JSON bytes.
state=beginExperienceAttempt(state,{action:action('reviewDispatch',2),attentionMessageId:'access-open'},catalog);
state=advanceExperienceAttempt(state,1,catalog);
const wire=JSON.parse(JSON.stringify(exportExperienceWorkspace(state,catalog)));
const uninterrupted=finish(advanceExperienceAttempt(state,1,catalog));
state=finish(advanceExperienceAttempt(restoreExperienceWorkspace(wire,catalog,'technician'),1,catalog));
const resumeEqual=JSON.stringify(exportExperienceWorkspace(state,catalog))===JSON.stringify(exportExperienceWorkspace(uninterrupted,catalog));
if(!resumeEqual)throw Error('mid-action restore diverged');
const onePremise=eligible(state);
state=paid(state,'reviewDispatch',2,'authorized');
const inferred=eligible(state),support=view(state).reasoning.conclusions.find(x=>x.propositionId==='directEligible').supports[0];
ticket=dispatchTicket(state,work);method=ticket.method;state=ticket.state;
// Control: old message expiry cannot become a belief or satisfy the conjunction.
let expired=receiveExperienceEpisode(create(),episode,catalog);
expired=deliverExperienceMessage(expired,message('old-open','accessOpen',true,'coordinator',1),catalog);
expired=advanceExperience(expired,{to:1,mode:'awake'},catalog);
const expiredStatus=eligible(expired),expiredChoice=choose(expired);
// Control: opposed processed source reports keep access conflicted and block direct inference.
let conflict=receiveExperienceEpisode(create(),episode,catalog);
conflict=deliverExperienceMessage(conflict,message('open-a','accessOpen',true),catalog);
conflict=deliverExperienceMessage(conflict,message('closed-b','accessOpen',false,'inspector'),catalog);
conflict=deliverExperienceMessage(conflict,message('authorized-c','authorizationValid',true),catalog);
conflict=paid(conflict,'reviewDispatch',2,'open-a');
conflict=paid(conflict,'reviewDispatch',2,'closed-b');
conflict=paid(conflict,'reviewDispatch',2,'authorized-c');
const conflictBelief=view(conflict).reasoning.conclusions.find(x=>x.propositionId==='accessOpen').status;
const conflictStatus=eligible(conflict),conflictChoice=choose(conflict);
// Incorrect reports can prompt a direct attempt, but the closed facility yields no output.
let hidden=create(),hiddenWorld={accessOpen:false,authorizationValid:true,completedTickets:0,direct:0,alternate:0};
hidden=deliverExperienceMessage(hidden,message('hidden-open','accessOpen',true),catalog);
hidden=deliverExperienceMessage(hidden,message('hidden-auth','authorizationValid',true),catalog);
hidden=paid(hidden,'reviewDispatch',2,'hidden-open');
hidden=paid(hidden,'reviewDispatch',2,'hidden-auth');
const hiddenInference=eligible(hidden);
const hiddenTicket=dispatchTicket(hidden,hiddenWorld);
hidden=hiddenTicket.state;
const directPolicyParity=[
 directPolicy(false,null,null)===noEpisodeChoice,
 directPolicy(true,null,null)===noMessageChoice,
 directPolicy(true,true,true)===method,
 directPolicy(true,null,null)===expiredChoice,
 directPolicy(true,null,true)===conflictChoice,
].every(Boolean);
if(queryEpisodes(state.episodes,{contextId:'plant'}).episodes.length!==1)throw Error('episode lost');
if(inferBeliefs(state.inference,{version:'beliefs-0.1.0',ownerId:'technician',now:0,beliefs:[],receiptCount:0,maxReceipts:1}).conclusions.length!==3)throw Error('subpath inference unavailable');
process.stdout.write(JSON.stringify({noEpisodeChoice,noMessageChoice,unreadStatus,unreadChoice,elapsedAfterEpisode,
 resumeEqual,onePremise,inferred,supportRuleIds:support.ruleIds,supportEvidenceIds:support.evidenceIds,
 finalMethod:method,paidMinutes:state.actor.person.sustained.situated.now,processedCount:state.attention.processings.length,
 completedTickets:work.completedTickets,direct:work.direct,alternate:work.alternate,
 expiredStatus,expiredChoice,conflictBelief,conflictStatus,conflictChoice,directPolicyParity,
 hiddenInference,hiddenMethod:hiddenTicket.method,hiddenStatus:hiddenTicket.status,hiddenCompletedTickets:hiddenWorld.completedTickets,
 hiddenPaidMinutes:hidden.actor.person.sustained.situated.now}));
`);
    const permission=['--permission','--experimental-permission'].find(flag=>process.allowedNodeEnvironmentFlags.has(flag));assert.ok(permission);
    const result=JSON.parse(execFileSync(process.execPath,[permission,`--allow-fs-read=${consumer}`,'--preserve-symlinks','--preserve-symlinks-main',join(consumer,'run.js')],options));
    assert.deepEqual(result,{noEpisodeChoice:'directVisit',noMessageChoice:'alternateVisit',unreadStatus:'unknown',unreadChoice:'alternateVisit',
      elapsedAfterEpisode:5,resumeEqual:true,onePremise:'unknown',inferred:'true',supportRuleIds:['authorized-direct'],
      supportEvidenceIds:['access-open','authorized'],finalMethod:'directVisit',paidMinutes:12,processedCount:2,
      completedTickets:2,direct:1,alternate:1,expiredStatus:'unknown',expiredChoice:'alternateVisit',
      conflictBelief:'conflict',conflictStatus:'unknown',conflictChoice:'alternateVisit',directPolicyParity:true,
      hiddenInference:'true',hiddenMethod:'directVisit',hiddenStatus:'failed',hiddenCompletedTickets:0,hiddenPaidMinutes:7});
    const metadata=JSON.parse(await readFile(join(consumer,'node_modules/experienced-person/package.json'),'utf8'));
    assert.equal(metadata.private,true);assert.equal(metadata.version,'0.1.0');assert.equal(metadata.dependencies,undefined);
    assert.equal(EXPERIENCED_SOURCES.length,26);
    assert.deepEqual(metadata.files,EXPERIENCED_SOURCES);
    for(const source of EXPERIENCED_SOURCES) {
      const bytes=await readFile(join(root,source)),installed=await readFile(join(consumer,'node_modules/experienced-person',source));
      assert.deepEqual(installed,bytes);
      assert.equal(packed.sha256[source],createHash('sha256').update(bytes).digest('hex'));
    }
    if(process.env.EXPERIENCED_CONSUMER_REPORT)await writeFile(process.env.EXPERIENCED_CONSUMER_REPORT,JSON.stringify({result,sourceSha256:packed.sha256,
      repositoryAccessDenied:true,installedConsumer:'independent facility maintenance dispatch'},null,2)+'\n');
  }finally{await rm(temporary,{recursive:true,force:true});}
});
