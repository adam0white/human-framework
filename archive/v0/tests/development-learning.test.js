import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEARNING_VERSION,
  advanceLearning,
  bindLearning,
  createLearning,
  exportLearning,
  getLearningAccessView,
  getLearningView,
  learn,
  retrieveLearning,
  restoreLearning,
} from '../src/development/learning.js';

const setup=(extra={})=>createLearning({now:0,skills:['method','history'],...extra});
const event=(receiptId,itemId,skillId,kind,startedAt,completedAt,extra={})=>({
  receiptId,itemId,skillId,kind,attributedTo:'teacher',startedAt,completedAt,
  elapsedMinutes:completedAt-startedAt,completed:true,...extra,
});
const item=(state,id)=>getLearningView(state).items.find(entry=>entry.id===id);

test('only completed paid learning evidence changes retained accessibility',()=>{
  const initial=setup(),atThirty=advanceLearning(initial,30);
  assert.throws(()=>learn(atThirty,event('not-done','valve','method','practice',0,30,{completed:false})),/completed/);
  assert.throws(()=>learn(atThirty,event('no-time','valve','method','practice',30,30)),/positive|elapsed/);
  assert.deepEqual(initial,setup());

  const taught=learn(atThirty,event('lesson:1','valve','method','instruction',0,30,{sourceFactValue:true}));
  const view=getLearningView(taught),record=item(taught,'valve');
  assert.equal(view.version,LEARNING_VERSION);
  assert.equal(record.sourceFactValue,true);
  assert.ok(record.accessibility>0);
  assert.deepEqual(record.recentEvidence,[{
    receiptId:'lesson:1',kind:'instruction',attributedTo:'teacher',startedAt:0,completedAt:30,elapsedMinutes:30,
  }]);
  assert.throws(()=>learn(taught,event('lesson:1','other','history','practice',0,30)),/receipt/i);
  assert.throws(()=>learn(taught,event('overlap','other','history','practice',29,30)),/overlap/i);
});

test('later spaced practice preserves more access than absence without clock-only gain',()=>{
  let base=advanceLearning(setup(),20);
  base=learn(base,event('lesson','route','method','instruction',0,20,{sourceFactValue:true}));
  const before=item(base,'route').accessibility;
  const absent=advanceLearning(base,2020);
  let spaced=advanceLearning(base,1020);
  spaced=learn(spaced,event('practice','route','method','practice',1000,1020));
  spaced=advanceLearning(spaced,2020);
  assert.ok(item(absent,'route').accessibility<before);
  assert.ok(item(spaced,'route').accessibility>item(absent,'route').accessibility);
});

test('equal external body and task skill can coexist with different retained access',()=>{
  const body={fatigue:.2,hunger:.1,taskPractice:.7};
  let instructed=advanceLearning(setup(),10);
  instructed=learn(instructed,event('guide','procedure','method','instruction',0,10,{sourceFactValue:true}));
  const uninstructed=advanceLearning(setup(),10);
  assert.deepEqual(body,{fatigue:.2,hunger:.1,taskPractice:.7});
  assert.ok(item(instructed,'procedure').accessibility>0);
  assert.equal(item(uninstructed,'procedure'),undefined);
});

test('forgetting changes accessibility without erasing an attributed source value',()=>{
  let state=setup({config:{halfLifeMinutes:10,evidenceHorizonMinutes:1000}});
  state=advanceLearning(state,10);
  state=learn(state,event('fact-source','date','history','instruction',0,10,{sourceFactValue:false}));
  const learned=item(state,'date');
  state=advanceLearning(state,210);
  const forgotten=item(state,'date');
  assert.equal(forgotten.sourceFactValue,false);
  assert.ok(forgotten.accessibility<learned.accessibility/1000);
});

test('practice is item-specific and creates no arbitrary cross-skill transfer',()=>{
  let state=advanceLearning(setup(),5);
  state=learn(state,event('method-lesson','method-item','method','instruction',0,5,{sourceFactValue:true}));
  state=advanceLearning(state,10);
  state=learn(state,event('history-lesson','history-item','history','instruction',5,10,{sourceFactValue:true}));
  const control=advanceLearning(state,30);
  let practiced=advanceLearning(state,20);
  practiced=learn(practiced,event('method-practice','method-item','method','practice',10,20));
  practiced=advanceLearning(practiced,30);
  assert.ok(item(practiced,'method-item').accessibility>item(control,'method-item').accessibility);
  assert.equal(item(practiced,'history-item').accessibility,item(control,'history-item').accessibility);
});

test('whole and segmented advance are exact and JSON restore continues identically',()=>{
  let state=advanceLearning(setup(),12);
  state=learn(state,event('retrieved','route','method','retrieval',0,12));
  const whole=advanceLearning(state,1000);
  let segmented=state;
  for(const now of [20,51,400,999,1000])segmented=advanceLearning(segmented,now);
  assert.deepEqual(segmented,whole);
  assert.deepEqual(getLearningView(segmented),getLearningView(whole));
  const snapshot=JSON.parse(JSON.stringify(exportLearning(segmented)));
  const restored=restoreLearning(snapshot);
  assert.deepEqual(restored,segmented);
  assert.deepEqual(advanceLearning(restored,2000),advanceLearning(segmented,2000));
});

test('state bounds and malformed snapshots are rejected',()=>{
  let state=createLearning({now:0,skills:['method'],config:{maxReceipts:70,evidenceHorizonMinutes:1000}});
  for(let index=0;index<64;index++) {
    state=advanceLearning(state,index+1);
    state=learn(state,event(`receipt-${index}`,`item-${index}`,'method','practice',index,index+1));
  }
  state=advanceLearning(state,65);
  assert.throws(()=>learn(state,event('receipt-64','item-64','method','practice',64,65)),/64 items/);
  assert.throws(()=>advanceLearning(state,1001),/horizon/);

  const good=exportLearning(state);
  for(const mutate of [
    value=>{value.learning.now=-1;},
    value=>{value.learning.items[0].skillId='unknown';},
    value=>{value.learning.receipts[0].elapsedMinutes=2;},
    value=>{value.extra=true;},
  ]) {
    const bad=structuredClone(good);mutate(bad);
    assert.throws(()=>restoreLearning(bad));
  }
  assert.throws(()=>restoreLearning({get format(){throw new Error('getter ran');}}),/JSON|data/i);
});

test('learning ownership binds only an empty unowned history and rejects transplant',()=>{
  const elapsed=advanceLearning(createLearning({skills:['method']}),20);
  const owned=bindLearning(elapsed,'learner');
  assert.equal(owned.ownerId,'learner');
  assert.equal(getLearningView(owned).ownerId,'learner');
  assert.deepEqual(bindLearning(owned,'learner'),owned);
  assert.throws(()=>bindLearning(owned,'other'),/owner|bound|mismatch/i);

  let credited=advanceLearning(createLearning({skills:['method']}),10);
  credited=learn(credited,event('unowned-receipt','method-item','method','practice',0,10));
  assert.throws(()=>bindLearning(credited,'learner'),/empty|credited|receipt/i);
});

test('actor access hides evidence content and retrieval gates the attributed source value',()=>{
  let state=createLearning({ownerId:'learner',skills:['history'],config:{halfLifeMinutes:10}});
  state=advanceLearning(state,1);
  state=learn(state,event('source-receipt','date','history','instruction',0,1,{sourceFactValue:false}));

  const beforeRead=structuredClone(state);
  const available=retrieveLearning(state,'date',{minimumAccessibility:.005});
  assert.deepEqual(available,{itemId:'date',accessible:true,sourceFactValue:false,accessibility:item(state,'date').accessibility});
  assert.deepEqual(state,beforeRead);
  assert.deepEqual(retrieveLearning(state,'missing',{minimumAccessibility:.005}),{itemId:'missing',accessible:false,sourceFactValue:null,accessibility:0});

  const access=getLearningAccessView(state),entry=access.items[0];
  assert.deepEqual(Object.keys(entry),['id','skillId','accessibility','lastEvidenceAt']);
  assert.equal(access.ownerId,'learner');
  assert.equal(Object.hasOwn(entry,'sourceFactValue'),false);
  assert.equal(Object.hasOwn(entry,'recentEvidence'),false);
  const diagnostic=getLearningView(state).items[0];
  assert.equal(diagnostic.sourceFactValue,false);
  assert.equal(diagnostic.recentEvidence[0].receiptId,'source-receipt');

  state=advanceLearning(state,101);
  const unavailable=retrieveLearning(state,'date',{minimumAccessibility:.005});
  assert.equal(unavailable.accessible,false);
  assert.equal(unavailable.sourceFactValue,null);
  assert.equal(state.receipts.length,1);
  assert.throws(()=>retrieveLearning(state,'date',{minimumAccessibility:0}),/threshold|accessibility/i);
});
