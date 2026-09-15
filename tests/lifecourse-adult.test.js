import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdultCourse, advanceAdultCourse, recordQualification,
  transitionAdultRole, getAdultCourseView, availableAdultOpportunities,
  exportAdultCourse, restoreAdultCourse
} from '../src/lifecourse/adult.js';

const catalog={
  actors:['adam','office','supervisor'],
  skills:['support'],
  qualifications:[{id:'teaching',skillId:'support',minimumSkill:0.1}],
  roles:[{id:'trainee',requiredQualifications:[]},{id:'mentor',requiredQualifications:['teaching']}],
  opportunities:[
    {id:'assist',roleId:'trainee',requiredQualifications:[]},
    {id:'mentorSession',roleId:'mentor',requiredQualifications:['teaching']}
  ]
};
const initial=()=>createAdultCourse({actorId:'adam',startDay:0,ageAtStartYears:25,catalog});
const skill=value=>({actorId:'adam',skills:{support:value}});
const entered=(state,roleId,atDay=state.day)=>transitionAdultRole(state,{receiptId:`enter_${roleId}_${atDay}`,atDay,roleId,kind:'entered',sourceId:'office',deliveredTo:'adam'});
const awarded=(state,value=.2)=>recordQualification(state,{receiptId:`award_${state.day}`,atDay:state.day,id:'teaching',kind:'awarded',assessorId:'supervisor',evidenceRef:'assessment_1',deliveredTo:'adam'},skill(value));

test('elapsed adult age is descriptive and never grants skill or opportunity',()=>{
  const older=advanceAdultCourse(initial(),{toDay:700,kind:'unmodeled'});
  assert.equal(getAdultCourseView(older).ageYears,25+700/365.2425);
  assert.deepEqual(availableAdultOpportunities(older,{actorSkillView:skill(.2)}),[{id:'assist',eligible:false},{id:'mentorSession',eligible:false}]);
  assert.deepEqual(older.intervals,[{fromDay:0,toDay:700,kind:'unmodeled'}]);
  assert.deepEqual(older.events,[]);
});

test('role and assessed qualification jointly enable a candidate opportunity',()=>{
  let state=entered(initial(),'mentor');
  assert.deepEqual(availableAdultOpportunities(state,{actorSkillView:skill(.2)}),[{id:'assist',eligible:false},{id:'mentorSession',eligible:false}]);
  state=awarded(state);
  assert.deepEqual(availableAdultOpportunities(state,{actorSkillView:skill(.2)}),[{id:'assist',eligible:false},{id:'mentorSession',eligible:true}]);
  assert.deepEqual(availableAdultOpportunities(state,{actorSkillView:skill(.05)}),[{id:'assist',eligible:false},{id:'mentorSession',eligible:false}]);
});

test('qualification cannot be awarded by age or an unsupported skill claim',()=>{
  assert.throws(()=>awarded(initial(),.05),/skill|assessment/i);
  assert.equal(availableAdultOpportunities(entered(initial(),'mentor'),{actorSkillView:skill(.2)})[1].eligible,false);
});

test('a role exit removes its opportunities without erasing assessed competence',()=>{
  let state=awarded(entered(initial(),'mentor'));
  state=transitionAdultRole(state,{receiptId:'exit_mentor',atDay:0,roleId:'mentor',kind:'exited',sourceId:'office',deliveredTo:'adam'});
  assert.equal(availableAdultOpportunities(state,{actorSkillView:skill(.2)})[1].eligible,false);
  assert.deepEqual(getAdultCourseView(state).qualifications,['teaching']);
});

test('a revoked qualification removes a mentor opportunity while role persists',()=>{
  let state=awarded(entered(initial(),'mentor'));
  state=recordQualification(state,{receiptId:'revoke_teaching',atDay:0,id:'teaching',kind:'revoked',assessorId:'supervisor',evidenceRef:'assessment_2',deliveredTo:'adam'});
  assert.deepEqual(getAdultCourseView(state).roles,['mentor']);
  assert.equal(availableAdultOpportunities(state,{actorSkillView:skill(.2)})[1].eligible,false);
});

test('sparse two-year course restores exactly and rejects a mismatched actor view',()=>{
  let state=entered(initial(),'trainee');
  state=advanceAdultCourse(state,{toDay:365,kind:'unmodeled'});
  state=advanceAdultCourse(state,{toDay:366,kind:'observed'});
  state=advanceAdultCourse(state,{toDay:730,kind:'unmodeled'});
  const restored=restoreAdultCourse(exportAdultCourse(state),'adam');
  assert.deepEqual(restored,state);
  assert.deepEqual(availableAdultOpportunities(restored,{actorSkillView:skill(.2)}),[{id:'assist',eligible:true},{id:'mentorSession',eligible:false}]);
  assert.throws(()=>availableAdultOpportunities(restored,{actorSkillView:{actorId:'other',skills:{support:.2}}}),/owner|actor/i);
  assert.throws(()=>advanceAdultCourse(state,{toDay:731,kind:'unmodeled'}),/horizon|limit/i);
});

test('receipts must be delivered to the owner and cannot be replayed',()=>{
  const state=initial();
  assert.throws(()=>transitionAdultRole(state,{receiptId:'wrong',atDay:0,roleId:'trainee',kind:'entered',sourceId:'office',deliveredTo:'other'}),/owner|deliver/i);
  const next=entered(state,'trainee');
  assert.throws(()=>transitionAdultRole(next,{receiptId:'enter_trainee_0',atDay:0,roleId:'mentor',kind:'entered',sourceId:'office',deliveredTo:'adam'}),/duplicate|receipt/i);
});

test('adult scope and explicit intervals reject invalid chronology',()=>{
  assert.throws(()=>createAdultCourse({actorId:'adam',startDay:0,ageAtStartYears:17.99,catalog}),/age 18/i);
  const state=advanceAdultCourse(initial(),{toDay:365,kind:'unmodeled'});
  assert.throws(()=>advanceAdultCourse(state,{toDay:364,kind:'observed'}),/advance/i);
  assert.throws(()=>advanceAdultCourse(state,{toDay:366}),/explicit/i);
  const changed=exportAdultCourse(state);
  changed.course.intervals[0].toDay=366;
  assert.throws(()=>restoreAdultCourse(changed,'adam'),/interval|gap/i);
});

test('qualification and role events require live transition and known attestors',()=>{
  const state=initial();
  assert.throws(()=>transitionAdultRole(state,{receiptId:'exit_first',atDay:0,roleId:'trainee',kind:'exited',sourceId:'office',deliveredTo:'adam'}),/not active/i);
  assert.throws(()=>transitionAdultRole(state,{receiptId:'fake_source',atDay:0,roleId:'trainee',kind:'entered',sourceId:'stranger',deliveredTo:'adam'}),/source actor/i);
  assert.throws(()=>recordQualification(state,{receiptId:'fake_assessor',atDay:0,id:'teaching',kind:'awarded',assessorId:'stranger',evidenceRef:'assessment_1',deliveredTo:'adam'},skill(.2)),/assessor actor/i);
  assert.throws(()=>transitionAdultRole(state,{receiptId:'late',atDay:1,roleId:'trainee',kind:'entered',sourceId:'office',deliveredTo:'adam'}),/current day/i);
});

test('restore requires owner binding and rejects accessor arrays',()=>{
 const snapshot=exportAdultCourse(initial());
 assert.throws(()=>restoreAdultCourse(snapshot),/owner|actor/i);
 Object.defineProperty(snapshot.course.catalog.skills,'0',{get(){return 'support'},enumerable:true});
 assert.throws(()=>restoreAdultCourse(snapshot,'adam'),/data|array|JSON/i);
});
