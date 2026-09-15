import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHabits,advanceHabits,recordHabitAttempt,getHabitChoiceView,
  getRevisionOffer,recordAcceptedRevision,exportHabits,restoreHabits
} from '../src/adaptation/habits.js';

const config={ownerId:'adam',now:0,
  habits:[{id:'toolRoutine',cueId:'toolsOut',purposeId:'repair',actions:['inspect','prepare'],threshold:3}],
  revisions:[{id:'changeMethod',fromPurposeId:'repair',toPurposeId:'care',cueId:'toolsOut',failedActionIds:['inspect'],reviewActionId:'review',minFailures:2,minReviewMinutes:5}]};
const situated=(repair='active',care='withdrawn',now=0)=>({id:'adam',now,purposes:[{id:'repair',status:repair},{id:'care',status:care}]});
const receipt=(ordinal,overrides={})=>({ownerId:'adam',attemptId:`adam:${ordinal}`,at:ordinal*5,cueId:'toolsOut',purposeId:'repair',actionId:'inspect',status:'completed',elapsedMinutes:5,durationMinutes:5,...overrides});

test('three actual completed cue-action repetitions suggest the available action, but other cues and inactive purpose do not',()=>{
  let state=createHabits(config);
  for(let ordinal=1;ordinal<=3;ordinal++)state=recordHabitAttempt(advanceHabits(state,ordinal*5),receipt(ordinal));
  assert.deepEqual(getHabitChoiceView(state,{situatedView:situated('active','withdrawn',15),cueId:'toolsOut',availableActionIds:['inspect','prepare']}),
    {suggestedActionId:'inspect',habitId:'toolRoutine',streak:3});
  assert.equal(getHabitChoiceView(state,{situatedView:situated('active','withdrawn',15),cueId:'otherCue',availableActionIds:['inspect']}).suggestedActionId,null);
  assert.equal(getHabitChoiceView(state,{situatedView:situated('withdrawn','active',15),cueId:'toolsOut',availableActionIds:['inspect']}).suggestedActionId,null);
  assert.equal(getHabitChoiceView(state,{situatedView:situated('active','withdrawn',15),cueId:'toolsOut',availableActionIds:['prepare']}).suggestedActionId,null);
  const completeSituated={...situated('active','withdrawn',15),observations:[],human:{id:'adam'}};
  assert.equal(getHabitChoiceView(state,{situatedView:completeSituated,cueId:'toolsOut',availableActionIds:['inspect']}).suggestedActionId,'inspect');
});

test('paid failed or interrupted execution resets a cue streak; blocked and unpaid attempts create no evidence',()=>{
  let state=createHabits(config);
  state=recordHabitAttempt(advanceHabits(state,5),receipt(1));
  state=recordHabitAttempt(advanceHabits(state,10),receipt(2,{status:'failed'}));
  state=recordHabitAttempt(advanceHabits(state,15),receipt(3));
  assert.equal(getHabitChoiceView(state,{situatedView:situated('active','withdrawn',15),cueId:'toolsOut',availableActionIds:['inspect']}).streak,1);
  state=recordHabitAttempt(advanceHabits(state,20),receipt(4,{status:'interrupted',elapsedMinutes:2,durationMinutes:5}));
  assert.equal(getHabitChoiceView(state,{situatedView:situated('active','withdrawn',20),cueId:'toolsOut',availableActionIds:['inspect']}).streak,0);
  assert.throws(()=>recordHabitAttempt(state,receipt(5,{at:20,status:'blocked',elapsedMinutes:0})),/paid|blocked/i);
  assert.throws(()=>recordHabitAttempt(state,receipt(5,{at:20,status:'interrupted',elapsedMinutes:0})),/paid/i);
  assert.equal(exportHabits(state).habits.receipts.length,4);
});

test('revision offer uses paid failures under the configured cue and original purpose, then consumes them after a paid chosen review',()=>{
  let state=createHabits(config);
  const attempts=[
    receipt(1,{status:'failed',cueId:'otherCue'}),
    receipt(2,{status:'failed',purposeId:'care'}),
    receipt(3,{status:'failed',actionId:'prepare'}),
    receipt(4,{status:'failed'}),
    receipt(5,{status:'failed'})
  ];
  for(const item of attempts)state=recordHabitAttempt(advanceHabits(state,item.at),item);
  assert.deepEqual(getRevisionOffer(state,{situatedView:situated('active','withdrawn',25),availableActionIds:['review']}),
    [{revisionId:'changeMethod',reviewActionId:'review',failedAttemptIds:['adam:4','adam:5']}]);
  assert.deepEqual(getRevisionOffer(state,{situatedView:situated('active','withdrawn',25),availableActionIds:[]}),[]);
  state=recordHabitAttempt(advanceHabits(state,30),receipt(6,{cueId:null,actionId:'review'}));
  assert.throws(()=>recordAcceptedRevision(state,{revisionId:'changeMethod',reviewAttemptId:'adam:6',actionId:'review',at:30,elapsedMinutes:5,selectedByActor:false},situated('active','withdrawn',30)),/selected/i);
  state=recordAcceptedRevision(state,{revisionId:'changeMethod',reviewAttemptId:'adam:6',actionId:'review',at:30,elapsedMinutes:5,selectedByActor:true},situated('active','withdrawn',30));
  assert.deepEqual(getRevisionOffer(state,{situatedView:situated('active','withdrawn',30),availableActionIds:['review']}),[]);
  assert.deepEqual(getRevisionOffer(state,{situatedView:situated('withdrawn','active',30),availableActionIds:['review']}),[]);
  assert.deepEqual(getRevisionOffer(state,{situatedView:situated('active','withdrawn',30),availableActionIds:['review']}),[]);
});

test('review acceptance requires the latest matching full paid action and cannot be replayed',()=>{
  let state=createHabits(config);
  for(const ordinal of [1,2])state=recordHabitAttempt(advanceHabits(state,ordinal*5),receipt(ordinal,{status:'failed'}));
  state=recordHabitAttempt(advanceHabits(state,15),receipt(3,{cueId:null,actionId:'review',elapsedMinutes:5}));
  const input={revisionId:'changeMethod',reviewAttemptId:'adam:3',actionId:'review',at:15,elapsedMinutes:5,selectedByActor:true};
  assert.throws(()=>recordAcceptedRevision(state,{...input,elapsedMinutes:4},situated('active','withdrawn',15)),/review|receipt/i);
  assert.throws(()=>recordAcceptedRevision(state,{...input,actionId:'inspect'},situated('active','withdrawn',15)),/review|receipt/i);
  assert.throws(()=>recordAcceptedRevision(state,input,situated('withdrawn','active',15)),/purpose|offer/i);
  const accepted=recordAcceptedRevision(state,input,situated('active','withdrawn',15));
  assert.throws(()=>recordAcceptedRevision(accepted,input,situated('active','withdrawn',15)),/offer|evidence|duplicate/i);
});

test('saved state validates owner, duplicate evidence, chronology and derived records',()=>{
  let state=createHabits(config);
  state=recordHabitAttempt(advanceHabits(state,5),receipt(1));
  assert.deepEqual(restoreHabits(exportHabits(state),'adam'),state);
  assert.throws(()=>restoreHabits(exportHabits(state),'eve'),/owner/i);
  assert.throws(()=>recordHabitAttempt(state,receipt(1)),/duplicate/i);
  const changed=exportHabits(state);changed.habits.receipts[0].status='blocked';
  assert.throws(()=>restoreHabits(changed,'adam'),/paid|blocked/i);
  assert.throws(()=>advanceHabits(state,4),/backward/i);
});

test('restored acceptance cannot omit a qualifying failure and recycle it later',()=>{
  let state=createHabits(config);
  for(const ordinal of [1,2,3])state=recordHabitAttempt(advanceHabits(state,ordinal*5),receipt(ordinal,{status:'failed'}));
  state=recordHabitAttempt(advanceHabits(state,20),receipt(4,{cueId:null,actionId:'review'}));
  state=recordAcceptedRevision(state,{revisionId:'changeMethod',reviewAttemptId:'adam:4',actionId:'review',at:20,elapsedMinutes:5,selectedByActor:true},situated('active','withdrawn',20));
  const forged=exportHabits(state);
  forged.habits.acceptedRevisions[0].failedAttemptIds.pop();
  assert.throws(()=>restoreHabits(forged,'adam'),/complete|failure evidence/i);
});

test('one failed attempt cannot fund two alternative purpose revisions',()=>{
  const overlap={...config,revisions:[...config.revisions,
    {...config.revisions[0],id:'anotherChange',toPurposeId:'rest',reviewActionId:'anotherReview'}]};
  let state=createHabits(overlap);
  for(const ordinal of [1,2])state=recordHabitAttempt(advanceHabits(state,ordinal*5),receipt(ordinal,{status:'failed'}));
  state=recordHabitAttempt(advanceHabits(state,15),receipt(3,{cueId:null,actionId:'review'}));
  state=recordAcceptedRevision(state,{revisionId:'changeMethod',reviewAttemptId:'adam:3',actionId:'review',at:15,elapsedMinutes:5,selectedByActor:true},
    {...situated('active','withdrawn',15),purposes:[{id:'repair',status:'active'},{id:'care',status:'withdrawn'},{id:'rest',status:'withdrawn'}]});
  assert.deepEqual(getRevisionOffer(state,{situatedView:{...situated('active','withdrawn',15),purposes:[{id:'repair',status:'active'},{id:'care',status:'withdrawn'},{id:'rest',status:'withdrawn'}]},availableActionIds:['anotherReview']}),[]);
});

test('same cue and action under another purpose resets training for the configured purpose',()=>{
  let state=createHabits(config);
  state=recordHabitAttempt(advanceHabits(state,5),receipt(1));
  state=recordHabitAttempt(advanceHabits(state,10),receipt(2,{purposeId:'care'}));
  state=recordHabitAttempt(advanceHabits(state,15),receipt(3));
  state=recordHabitAttempt(advanceHabits(state,20),receipt(4));
  const view=getHabitChoiceView(state,{situatedView:situated('active','withdrawn',20),cueId:'toolsOut',availableActionIds:['inspect']});
  assert.deepEqual(view,{suggestedActionId:null,habitId:null,streak:2});
  let unrelated=createHabits(config);
  for(const ordinal of [1,2,3])unrelated=recordHabitAttempt(advanceHabits(unrelated,ordinal*5),receipt(ordinal,{purposeId:null}));
  assert.equal(getHabitChoiceView(unrelated,{situatedView:situated('active','withdrawn',15),cueId:'toolsOut',availableActionIds:['inspect']}).suggestedActionId,null);
});
