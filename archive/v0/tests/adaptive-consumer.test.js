import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {packageAdaptivePerson,ADAPTIVE_SOURCES} from '../scripts/package-adaptive-person.js';

const root=fileURLToPath(new URL('..',import.meta.url));

test('adaptive candidate installs from exact private bytes and runs outside repository access',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'adaptive-consumer-'));
  try {
    const packed=await packageAdaptivePerson({outputDirectory:join(temporary,'packed')});
    const consumer=join(temporary,'consumer');await mkdir(consumer);
    await copyFile(packed.tarball,join(consumer,'candidate.tgz'));
    await writeFile(join(consumer,'package.json'),JSON.stringify({name:'independent-adaptive-consumer',private:true,type:'module'}));
    const env={...process.env,NODE_OPTIONS:'',NODE_PATH:''};delete env.NODE_TEST_CONTEXT;
    const options={cwd:consumer,encoding:'utf8',stdio:['ignore','pipe','pipe'],env};
    execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--cache',join(temporary,'cache'),'./candidate.tgz'],options);
    await writeFile(join(consumer,'run.js'),[
      "import {readFileSync} from 'node:fs';",
      "import {createAdaptivePerson,beginAdaptiveAttempt,advanceAdaptiveAttempt,finishAdaptiveAttempt,acceptAdaptiveRevision,getAdaptiveView,exportAdaptivePerson,restoreAdaptivePerson} from 'adaptive-person';",
      "import {createDevelopingPerson} from 'adaptive-person/developing';",
      "import {createPerson,beginAttempt,advanceAttempt,finishAttempt} from 'adaptive-person/human';",
      "import {createSituatedPerson} from 'adaptive-person/situated';",
      "import {createSustainedPerson,createLearning} from 'adaptive-person/sustained';",
      "import {createBeliefs} from 'adaptive-person/cognition';",
      "import {createRelationships,createDuties,createAdultCourse,createAppraisal} from 'adaptive-person/developing';",
      "import {createFunctionalContext,recordRestriction,assessFunctionalMethod} from 'adaptive-person/constraints';",
      "import {createInstitution,requestAccess,releaseAccess,advanceInstitution,getInstitutionOffer} from 'adaptive-person/institution';",
      "import {createHabits} from 'adaptive-person/habits';",
      `try{readFileSync(${JSON.stringify(join(root,'src/adaptive/person.js'))});throw new Error('repository accessible')}catch(error){if(error.code!=='ERR_ACCESS_DENIED')throw error}`,
      "await import('adaptive-person/src/constraints/functional.js').then(()=>{throw new Error('private path exported')},error=>{if(error.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw error});",
      "const catalog={actors:['ada','ben'],facts:[],purposes:['repair','care'],commitments:[],actions:['carry','reflect','cart','desk']};",
      "const human=createPerson({id:'ada',body:{fatigue:.1,hunger:.1},skills:{support:.2}});",
      "const situated=createSituatedPerson({human,now:0,purposes:[{id:'repair',status:'active'},{id:'care',status:'withdrawn'}]},catalog);",
      "const sustained=createSustainedPerson({situated,learning:createLearning({skills:['support']})},catalog);",
      "const developing=createDevelopingPerson({sustained,beliefs:createBeliefs({ownerId:'ada',now:0,propositions:['benchOpen'],sources:['ada','ben']}),relationships:createRelationships({ownerId:'ada',now:0,actors:catalog.actors,contexts:['bench'],ties:[]}),duties:createDuties({ownerId:'ada',now:0,cases:[]}),course:createAdultCourse({actorId:'ada',startDay:0,ageAtStartYears:30,catalog:{actors:catalog.actors,skills:['support'],qualifications:[],roles:[],opportunities:[]}}),appraisal:createAppraisal({ownerId:'ada',now:0,contexts:[],maxConcernMinutes:30,minReflectionMinutes:5})},catalog);",
      "let adaptive=createAdaptivePerson({person:developing,habits:createHabits({ownerId:'ada',now:0,habits:[{id:'benchHabit',cueId:'benchCue',purposeId:'repair',actions:['carry'],threshold:2}],revisions:[{id:'careReview',fromPurposeId:'repair',toPurposeId:'care',cueId:'benchCue',failedActionIds:['carry'],reviewActionId:'reflect',minFailures:2,minReviewMinutes:5}]})},catalog);",
      "function paid(state,actionId,minutes,status,cueId,purposeId){state=beginAdaptiveAttempt(state,{action:{actionId,durationMinutes:minutes,activity:'active',effort:0,exertive:false,skill:null},cueId,purposeId},catalog);state=advanceAdaptiveAttempt(state,minutes,catalog);return finishAdaptiveAttempt(state,{attemptId:state.person.sustained.situated.human.pending.id,status,mealConsumed:false},catalog)}",
      "adaptive=paid(adaptive,'carry',4,'completed','benchCue','repair');",
      "adaptive=paid(adaptive,'carry',4,'completed','benchCue','repair');",
      "const habitSuggestion=getAdaptiveView(adaptive,catalog,{cueId:'benchCue',availableActionIds:['carry']}).habit.suggestedActionId;",
      "const snapshot=JSON.parse(JSON.stringify(exportAdaptivePerson(adaptive,catalog)));",
      "function continueReview(state){state=paid(state,'carry',4,'failed','benchCue','repair');state=paid(state,'carry',4,'failed','benchCue','repair');const offer=getAdaptiveView(state,catalog,{cueId:'benchCue',availableActionIds:['reflect']}).revisionOffers[0];if(!offer||offer.failedAttemptIds.length!==2)throw new Error('failed evidence absent');state=paid(state,'reflect',5,'completed',null,null);return acceptAdaptiveRevision(state,{revisionId:'careReview',selectedByActor:true},catalog)}",
      "const straight=continueReview(adaptive);",
      "adaptive=continueReview(restoreAdaptivePerson(snapshot,catalog,'ada'));",
      "const resumeEqual=JSON.stringify(exportAdaptivePerson(adaptive,catalog))===JSON.stringify(exportAdaptivePerson(straight,catalog));",
      "if(!resumeEqual)throw new Error('adaptive resumed review diverged');",
      "const purposeStatuses=adaptive.person.sustained.situated.purposes.map(item=>[item.id,item.status]);",
      "const methods=[{id:'ordinary',actionId:'carry',durationMinutes:4,effort:0,exertive:false,skill:null,demandIds:['lift'],resourceCosts:[]},{id:'cartMethod',actionId:'cart',durationMinutes:9,effort:0,exertive:false,skill:null,demandIds:[],resourceCosts:[{resourceId:'cartTool',amount:1}]}];",
      "let functional=createFunctionalContext({now:adaptive.person.sustained.situated.now,actors:['ada','clinic'],demands:['lift'],methods});",
      "functional=recordRestriction(functional,{id:'r1',actorId:'ada',demandId:'lift',sourceId:'clinic',at:functional.now,reviewAt:functional.now+10});",
      "const blocked=assessFunctionalMethod(functional,{actorId:'ada',methodId:'ordinary',resources:[]}).available;",
      "const missingCart=assessFunctionalMethod(functional,{actorId:'ada',methodId:'cartMethod',resources:[]}).available;",
      "let world={cartTool:1,deliveries:0,deskOutput:0};",
      "const alternate=assessFunctionalMethod(functional,{actorId:'ada',methodId:'cartMethod',resources:[{resourceId:'cartTool',quantity:world.cartTool}]});",
      "if(!alternate.available)throw new Error('cart accommodation absent');",
      "const beforeCart=adaptive.person.sustained.situated.now;",
      "adaptive=beginAdaptiveAttempt(adaptive,{action:alternate.action,cueId:null,purposeId:'care'},catalog);",
      "adaptive=advanceAdaptiveAttempt(adaptive,alternate.action.durationMinutes,catalog);",
      "adaptive=finishAdaptiveAttempt(adaptive,{attemptId:adaptive.person.sustained.situated.human.pending.id,status:'completed',mealConsumed:false},catalog);",
      "world.cartTool-=alternate.resourceCosts[0].amount;world.deliveries++;",
      "const cartPaidMinutes=adaptive.person.sustained.situated.now-beforeCart;",
      "let institution=createInstitution({now:0,facilityId:'bench',actors:['ada','ben'],grants:['ada','ben'],maxHoldMinutes:10});",
      "const reservation=requestAccess(institution,{actorId:'ada',requestId:'a1',holdMinutes:5});institution=reservation.state;",
      "const queued=requestAccess(institution,{actorId:'ben',requestId:'b1',holdMinutes:10});institution=queued.state;",
      "const benQueue=getInstitutionOffer(institution,'ben').queuePosition;",
      "institution=releaseAccess(institution,{actorId:'ada',reservationId:reservation.reservationId});",
      "const promoted=getInstitutionOffer(institution,'ben').hasReservation;",
      "let ben=createPerson({id:'ben',body:{fatigue:.1,hunger:.1},skills:{support:.1}});",
      "ben=beginAttempt(ben,{actionId:'desk',targetId:null,durationMinutes:5,effort:0,exertive:false,activity:'active',skill:'support'});",
      "ben=advanceAttempt(ben,5);ben=finishAttempt(ben,{attemptId:ben.pending.id,status:'completed',mealConsumed:false});",
      "institution=advanceInstitution(institution,5);institution=releaseAccess(institution,{actorId:'ben',reservationId:getInstitutionOffer(institution,'ben').reservationId});",
      "world.deskOutput++;",
      "process.stdout.write(JSON.stringify({resumeEqual,habitSuggestion,purposeStatuses,paidMinutes:adaptive.person.sustained.situated.now,blocked,missingCart,cartPaidMinutes,cartRemaining:world.cartTool,deliveries:world.deliveries,reservation:reservation.decision,queued:queued.decision,benQueue,promoted,benPaidMinutes:ben.minutes,deskOutput:world.deskOutput}));"
    ].join('\n'));
    const permission=['--permission','--experimental-permission'].find(flag=>process.allowedNodeEnvironmentFlags.has(flag));assert.ok(permission);
    const result=JSON.parse(execFileSync(process.execPath,[permission,`--allow-fs-read=${consumer}`,'--preserve-symlinks','--preserve-symlinks-main',join(consumer,'run.js')],options));
    assert.deepEqual(result,{resumeEqual:true,habitSuggestion:'carry',purposeStatuses:[['repair','withdrawn'],['care','active']],paidMinutes:30,
      blocked:false,missingCart:false,cartPaidMinutes:9,cartRemaining:0,deliveries:1,
      reservation:'reserved',queued:'queued',benQueue:1,promoted:true,benPaidMinutes:5,deskOutput:1});
    const metadata=JSON.parse(await readFile(join(consumer,'node_modules/adaptive-person/package.json'),'utf8'));
    assert.equal(metadata.private,true);assert.equal(metadata.version,'0.1.0');assert.equal(metadata.dependencies,undefined);
    for(const source of ADAPTIVE_SOURCES) {
      const bytes=await readFile(join(root,source)),installed=await readFile(join(consumer,'node_modules/adaptive-person',source));
      assert.deepEqual(installed,bytes);
      assert.equal(packed.sha256[source],createHash('sha256').update(bytes).digest('hex'));
    }
    if(process.env.ADAPTIVE_CONSUMER_REPORT)await writeFile(process.env.ADAPTIVE_CONSUMER_REPORT,JSON.stringify({result,sourceSha256:packed.sha256,repositoryAccessDenied:true},null,2)+'\n');
  }finally{await rm(temporary,{recursive:true,force:true});}
});
