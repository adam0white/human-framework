/** Independent library-return host. Uses installed exports only; no reference-host imports. */
import {createSustainedPerson,advanceSustainedPerson,beginSustainedAttempt,advanceSustainedAttempt,finishSustainedAttempt,exportSustainedPerson,restoreSustainedPerson} from 'sustained-person';
import {createLearning,learn,getLearningView,retrieveLearning} from 'sustained-person/learning';
import {createPerson} from 'sustained-person/human';
import {createSituatedPerson,observePerson,decide} from 'sustained-person/situated';
import {createCommitment,transitionCommitment} from 'sustained-person/commitments';

const catalog={actors:['borrower','librarian'],facts:['return-route','returned'],purposes:['return-book'],commitments:['book-loan'],actions:['study','wait','meal','return','confirm','consult-source']};
const program={options:[{id:'confirm',requiresFacts:['returned']},{id:'wait',requiresFacts:[]}],rules:[{id:'acknowledge-received-book',when:{fact:{id:'returned',value:true}},actionId:'confirm'}],defaultActionId:'wait'};
const clone=value=>JSON.parse(JSON.stringify(value));

function run(rehearsal,restore=true) {
  const people=Object.fromEntries(catalog.actors.map(id=>[id,createSustainedPerson({situated:createSituatedPerson({human:createPerson({id,body:{fatigue:.1,hunger:.1},skills:{route:.2}}),now:0,purposes:[{id:'return-book',status:'active'}]},catalog),learning:createLearning({skills:['route']})},catalog)]));
  let agreement=createCommitment({id:'book-loan',debtorId:'borrower',creditorId:'librarian',dueAt:7*1440,terms:'Return the borrowed book to the library'},catalog);
  agreement=transitionCommitment(agreement,{type:'accept',actorId:'borrower',at:0},catalog);
  let meals=42,bookLocation='borrower',resumeEqual=true,consultationMinutes=0;
  function notify(id,subject,value,source='librarian',kind='fact',extra={}) {
    people[id]={...people[id],situated:observePerson(people[id].situated,{id:`${subject}-${people[id].situated.now}-${value}`,at:people[id].situated.now,source,channel:'communication',kind,subject,value,...extra},catalog)};
  }
  function background(to,mode='awake') {for(const id of catalog.actors)people[id]=advanceSustainedPerson(people[id],{to,mode},catalog);}
  function action(id,actionId,minutes,activity='active',midpoint=false) {
    const startedAt=people[id].situated.now;
    people[id]=advanceSustainedPerson(people[id],{to:startedAt,mode:'awake'},catalog);
    people[id]=beginSustainedAttempt(people[id],{actionId,durationMinutes:minutes,activity,effort:0,exertive:false,skill:null},catalog);
    people[id]=advanceSustainedAttempt(people[id],Math.floor(minutes/2),catalog);
    if(midpoint&&restore){const restored=restoreSustainedPerson(clone(exportSustainedPerson(people[id],catalog)),catalog);resumeEqual&&=JSON.stringify(restored)===JSON.stringify(people[id]);people[id]=restored;}
    people[id]=advanceSustainedAttempt(people[id],minutes-Math.floor(minutes/2),catalog);
    const receiptId=people[id].situated.human.pending.id;
    const mealConsumed=activity==='meal'&&meals>0;
    if(mealConsumed)meals--;
    people[id]=finishSustainedAttempt(people[id],{attemptId:receiptId,status:'completed',mealConsumed},catalog);
    for(const other of catalog.actors)if(other!==id)people[other]=advanceSustainedPerson(people[other],{to:startedAt+minutes,mode:'awake'},catalog);
    return {receiptId,startedAt,completedAt:startedAt+minutes,elapsedMinutes:minutes,completed:true};
  }
  const agreementDetails=()=>({revision:agreement.revision,debtorId:agreement.debtorId,creditorId:agreement.creditorId,dueAt:agreement.dueAt,terms:agreement.terms});
  for(const id of catalog.actors)notify(id,'book-loan','accepted',id==='borrower'?'librarian':'borrower','commitment',{details:agreementDetails()});
  for(let day=0;day<7;day++) {
    background(day*1440+480,'sleep');
    for(const id of catalog.actors)action(id,'meal',15,'meal');
    const paid=action('borrower',day===0||rehearsal?'study':'wait',20,'active',day===3);
    if(day===0||rehearsal)people.borrower={...people.borrower,learning:learn(people.borrower.learning,{...paid,itemId:'library-route',skillId:'route',kind:day===0?'instruction':'retrieval',attributedTo:day===0?'librarian':'borrower',...(day===0?{sourceFactValue:true}:{})})};
    if(day===0)notify('borrower','return-route',true);
    background(day*1440+840);
    for(const id of catalog.actors)action(id,'meal',15,'meal');
    background(day*1440+1200);
    for(const id of catalog.actors)action(id,'meal',15,'meal');
    if(day===6) {
      const retrieved=retrieveLearning(people.borrower.learning,'library-route',{minimumAccessibility:.5});
      // An authored access threshold controls source consultation, not the truth of the route.
      if(!retrieved.accessible){action('borrower','consult-source',20);consultationMinutes+=20;}
      action('borrower','return',15);
      const before=decide(people.librarian.situated,program,catalog).actionId;
      bookLocation='return-box';
      const unseen=decide(people.librarian.situated,program,catalog).actionId;
      if(before!==unseen)throw new Error('World outcome leaked into actor choice');
      agreement=transitionCommitment(agreement,{type:'fulfill',actorId:null,at:people.borrower.situated.now,outcomeId:'returned-book-receipt',completed:true},catalog);
      for(const id of catalog.actors)notify(id,'book-loan','fulfilled',id==='borrower'?'librarian':'borrower','commitment',{details:agreementDetails()});
      notify('librarian','returned',true,'borrower');
      if(decide(people.librarian.situated,program,catalog).actionId!=='confirm')throw new Error('Librarian did not respond to delivered receipt');
    }
    background((day+1)*1440);
  }
  return {accessibility:getLearningView(people.borrower.learning).items[0].accessibility,instructionsStillRecorded:people.borrower.situated.observations.some(o=>o.subject==='return-route'&&o.value===true),resumeEqual,clockMinutes:people.borrower.situated.now,returnedItemCount:bookLocation==='return-box'?1:0,commitmentStatus:agreement.status,mealsRemaining:meals,consultationMinutes,finalState:people};
}

export function runConsumer() {
  const {finalState:resumedState,...withRehearsal}=run(true);
  const {finalState:controlState,...withoutRehearsal}=run(false);
  const uninterrupted=run(true,false);
  const continuationEqual=JSON.stringify(resumedState)===JSON.stringify(uninterrupted.finalState);
  if(!continuationEqual)throw new Error('Resumed continuation diverged');
  return {format:'sustained-person-independent-consumer',withRehearsal,withoutRehearsal,resumeEqual:continuationEqual&&withRehearsal.resumeEqual&&withoutRehearsal.resumeEqual,clockMinutes:withRehearsal.clockMinutes,unseenReceiptChangedChoice:false,returnedItemCount:withRehearsal.returnedItemCount,commitmentStatus:withRehearsal.commitmentStatus};
}
