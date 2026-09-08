import test from 'node:test';
import assert from 'node:assert/strict';
import {createWaterHost,waterCommand,waterView} from '../scripts/social-water-host.js';
import {createWorkHost,workCommand,workView} from '../scripts/social-work-host.js';

for(const mode of ['shared','direct']){
  test(`${mode}: a loan needs independent consent and possible ownership transfer`,()=>{
    let state=createWaterHost(mode);state=waterCommand(state,{type:'ask'});
    assert.deepEqual(state.carried,{borrower:2,lender:4});
    assert.throws(()=>waterCommand(state,{type:'respond',id:1,actor:'borrower',decision:'accept'}),/recipient|lender/);
    const declined=waterCommand(state,{type:'respond',id:1,actor:'lender',decision:'refuse'});
    assert.deepEqual(declined.carried,state.carried);assert.equal(waterView(declined).contracts[0].status,'refused');
    state=waterCommand(state,{type:'respond',id:1,actor:'lender',decision:'accept'});
    assert.deepEqual(state.carried,{borrower:4,lender:2});
    state=waterCommand(state,{type:'collect',actor:'lender'});state=waterCommand(state,{type:'collect',actor:'lender'});
    assert.throws(()=>waterCommand(state,{type:'repay',id:1,actor:'borrower'}),/capacity/);
    state=waterCommand(state,{type:'pour',actor:'lender'});
    state=waterCommand(state,{type:'tick',minutes:40});
    const returned=waterCommand(state,{type:'repay',id:1,actor:'borrower'});
    assert.equal(waterView(returned).contracts[0].late,true);
    assert.throws(()=>waterCommand(returned,{type:'repay',id:1,actor:'borrower'}),/accepted/);
  });

  test(`${mode}: impossible immediate loans remain proposed rather than silently transferring`,()=>{
    let state=createWaterHost(mode);state=waterCommand(state,{type:'collect',actor:'borrower'});state=waterCommand(state,{type:'collect',actor:'borrower'});
    state=waterCommand(state,{type:'ask'});
    assert.throws(()=>waterCommand(state,{type:'respond',id:1,actor:'lender',decision:'accept'}),/capacity/);
    assert.equal(waterView(state).contracts[0].status,'proposed');assert.equal(state.carried.lender,4);
  });

  test(`${mode}: work can be accepted before supplies arrive and only actual completion fulfills it`,()=>{
    let state=createWorkHost(mode);state=workCommand(state,{type:'ask',target:'pump'});
    state=workCommand(state,{type:'respond',id:1,actor:'worker',decision:'accept'});
    assert.equal(workView(state).contracts[0].status,'accepted');
    assert.throws(()=>workCommand(state,{type:'start',actor:'worker',job:'work',target:'pump'}),/part/);
    state=workCommand(state,{type:'deliver'});state=workCommand(state,{type:'start',actor:'worker',job:'work',target:'pump'});
    state=workCommand(state,{type:'tick',minutes:2});state=workCommand(state,{type:'cancel',actor:'worker'});
    assert.equal(state.parts,1);assert.equal(state.projects.pump,false);assert.equal(workView(state).contracts[0].status,'accepted');
    state=workCommand(state,{type:'start',actor:'worker',job:'work',target:'pump'});state=workCommand(state,{type:'tick',minutes:5});
    assert.equal(workView(state).contracts[0].status,'fulfilled');assert.equal(state.projects.pump,true);assert.equal(state.workMinutes,7);
  });

  test(`${mode}: releasing work preserves a concurrent meal and forbids debtor self-release`,()=>{
    let state=workCommand(createWorkHost(mode),{type:'ask',target:'pump'});
    state=workCommand(state,{type:'respond',id:1,actor:'worker',decision:'accept'});
    state=workCommand(state,{type:'start',actor:'worker',job:'meal'});state=workCommand(state,{type:'tick',minutes:2});
    assert.throws(()=>workCommand(state,{type:'release',id:1,actor:'worker'}),/beneficiary|owner/);
    state=workCommand(state,{type:'release',id:1,actor:'owner'});assert.equal(state.jobs.worker.job,'meal');
    state=workCommand(state,{type:'tick',minutes:6});assert.equal(state.meals,1);assert.equal(state.food,0);
  });

  test(`${mode}: another person's completed work fulfills the achievement commitment during recovery`,()=>{
    let state=workCommand(createWorkHost(mode),{type:'ask',target:'pump'});
    state=workCommand(state,{type:'respond',id:1,actor:'worker',decision:'accept'});
    state=workCommand(state,{type:'start',actor:'worker',job:'meal'});state=workCommand(state,{type:'deliver'});
    state=workCommand(state,{type:'start',actor:'owner',job:'work',target:'pump'});state=workCommand(state,{type:'tick',minutes:5});
    assert.equal(workView(state).contracts[0].status,'fulfilled');assert.equal(state.jobs.worker.remaining,3);
  });

  test(`${mode}: renunciation stops promised work while conflict and eventual release remain explicit`,()=>{
    let state=workCommand(createWorkHost(mode),{type:'ask',target:'pump'});
    state=workCommand(state,{type:'respond',id:1,actor:'worker',decision:'accept'});state=workCommand(state,{type:'deliver'});
    state=workCommand(state,{type:'start',actor:'worker',job:'work',target:'pump'});state=workCommand(state,{type:'tick',minutes:2});
    state=workCommand(state,{type:'renounce',id:1,actor:'worker'});
    assert.equal(state.parts,1);assert.equal(state.jobs.worker,null);assert.equal(workView(state).contracts[0].status,'accepted');
    assert.equal(workView(state).contracts[0].renouncedAt,2);
    state=workCommand(state,{type:'ask',target:'gate'});
    assert.throws(()=>workCommand(state,{type:'respond',id:2,actor:'worker',decision:'accept'}),/existing obligation/);
    state=workCommand(state,{type:'release',id:1,actor:'owner'});
    state=workCommand(state,{type:'respond',id:2,actor:'worker',decision:'accept'});assert.equal(workView(state).contracts[1].status,'accepted');
  });

  test(`${mode}: pending jobs and loans resume without mutation or double outcomes`,()=>{
    let work=workCommand(createWorkHost(mode),{type:'ask',target:'pump'});work=workCommand(work,{type:'respond',id:1,actor:'worker',decision:'accept'});
    work=workCommand(work,{type:'deliver'});work=workCommand(work,{type:'start',actor:'worker',job:'work',target:'pump'});
    work=workCommand(work,{type:'tick',minutes:2});const before=structuredClone(work);
    assert.deepEqual(workCommand(JSON.parse(JSON.stringify(work)),{type:'tick',minutes:3}),workCommand(work,{type:'tick',minutes:3}));
    assert.deepEqual(work,before);
    let water=waterCommand(createWaterHost(mode),{type:'ask'});water=waterCommand(water,{type:'respond',id:1,actor:'lender',decision:'accept'});
    assert.deepEqual(waterCommand(JSON.parse(JSON.stringify(water)),{type:'repay',id:1,actor:'borrower'}),waterCommand(water,{type:'repay',id:1,actor:'borrower'}));
  });
}
