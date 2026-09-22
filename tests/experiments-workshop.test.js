import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkshop,chooseWorkshop,getWorkshopView,exportWorkshop,restoreWorkshop} from '../src/games/experiments/workshop.js';

const play=(kind,variant,actions)=>actions.reduce((state,id)=>chooseWorkshop(state,id),createWorkshop(kind,variant));
const action=(state,id)=>getWorkshopView(state).actions.find(item=>item.id===id);

test('workshop variations offer two feasible completion methods with paid queue time',()=>{
 for(const variant of [0,1,2]){
  const hand=play('workshop',variant,['prepare','assemble_hand']);
  assert.equal(getWorkshopView(hand).finished,true);
  assert.equal(hand.world.completed,1);
  const queued=play('workshop',variant,['request_machine']);
  assert.equal(queued.workspace.actor.person.sustained.situated.now,1);
  assert.ok(queued.institution.usedRequestIds.includes('maker_request'));
  assert.equal(queued.world.completed,0);
  assert.ok(getWorkshopView(queued).facts.some(f=>/queue|reservation/i.test(f)));
 }
});

test('workshop queue changes actual access and failures spend time without output',()=>{
 const before=createWorkshop('workshop',0);
 assert.equal(action(before,'assemble_machine').disabled,true);
 let state=play('workshop',0,['request_machine','prepare','wait_5','assemble_machine']);
 assert.equal(state.world.completed,0);
 assert.ok(state.world.failed>=1);
 assert.ok(getWorkshopView(state).now>0);
 state=chooseWorkshop(state,'assemble_adjusted');
 assert.equal(state.world.completed,1);
});

test('machine assembly needs the reservation through the paid attempt',()=>{
 const success=play('workshop',1,['prepare','request_machine','assemble_machine']);
 assert.equal(success.world.completed,1);
 const expiredDuringWork=play('workshop',1,['prepare','request_machine','wait_5','wait_5','wait_5','assemble_machine']);
 assert.equal(expiredDuringWork.world.completed,0);
 assert.equal(expiredDuringWork.world.failed,1);
});

test('workshop remembered failure informs a side method without exposing world truth',()=>{
 const state=createWorkshop('workshop',0);
 const view=getWorkshopView(state);
 assert.ok(view.facts.some(f=>/earlier|previous|remember/i.test(f)));
 assert.equal(JSON.stringify(view).includes('fitStandard'),false);
 assert.equal(action(state,'assemble_adjusted').disabled,true);
 const withAccess=play('workshop',1,['prepare','request_machine']);
 assert.equal(action(withAccess,'assemble_adjusted').disabled,false);
 assert.equal(action(withAccess,'assemble_adjusted').minutes,9);
 assert.equal(action(withAccess,'assemble_hand').minutes,12);
});

test('read reports explain their source and latest consequence in player terms',()=>{
 const unread=getWorkshopView(createWorkshop('dispatch',0));
 assert.equal(unread.messages.find(m=>m.id==='stock_update').text,null);
 const read=play('dispatch',0,['read_stock','read_stock_update']);
 const view=getWorkshopView(read);
 assert.match(view.messages.find(m=>m.id==='stock_update').text,/dispatcher correction.*standard part unavailable/i);
 assert.ok(view.facts.some(f=>/standard part is unavailable/i.test(f)));
 assert.equal(JSON.stringify(view).includes('stockAvailable'),false);
 assert.match(view.summary,/correction.*unavailable/i);
 const failed=getWorkshopView(play('dispatch',0,['repair_a']));
 assert.match(failed.summary,/failed/i);
 const notice=getWorkshopView(play('workshop',0,['read_notice']));
 assert.match(notice.messages.find(m=>m.id==='tool_notice').text,/peer.*fit failed/i);
});

test('dispatch variants have a complete path and failed repair does not create output',()=>{
 for(const variant of [0,1,2]){
  const state=play('dispatch',variant,['inspect_a','repair_a','inspect_b','repair_b']);
  assert.equal(getWorkshopView(state).finished,true);
  assert.equal(state.world.completed,2);
 }
 const failed=play('dispatch',0,['repair_a']);
 assert.equal(failed.world.completed,0);
 assert.equal(failed.world.failed,1);
 assert.ok(getWorkshopView(failed).now>0);
});

test('dispatch paid correction changes an inferred offer but cannot change the world',()=>{
 let state=createWorkshop('dispatch',0);
 assert.equal(getWorkshopView(state).messages.find(m=>m.id==='stock_update').text,null);
 state=chooseWorkshop(state,'read_stock');
 const before=getWorkshopView(state);
 state=chooseWorkshop(state,'read_stock_update');
 const after=getWorkshopView(state);
 assert.notDeepEqual(before.actions.find(a=>a.id==='repair_a').description,after.actions.find(a=>a.id==='repair_a').description);
 assert.deepEqual(state.world,{completed:0,failed:0});
 assert.equal(after.messages.find(m=>m.id==='stock_update').text===null,false);
});

test('every dispatch variation can pay for and read a changed correction',()=>{
 for(const variant of [0,1,2]){
  const state=play('dispatch',variant,['read_stock','read_stock_update']);
  assert.equal(state.workspace.attention.processings.length,2);
  assert.notEqual(state.workspace.attention.messages[0].value,state.workspace.attention.messages[1].value);
  const view=getWorkshopView(state);
  assert.notEqual(view.messages.find(m=>m.id==='stock').text,view.messages.find(m=>m.id==='stock_update').text);
  assert.equal(state.world.completed,0);
 }
});

test('an unread correction is not named as the source of a method offer',()=>{
 const state=play('dispatch',1,['read_stock']);
 assert.equal(getWorkshopView(state).messages.find(m=>m.id==='stock_update').text,null);
 assert.doesNotMatch(action(state,'repair_a').description,/correct/i);
 assert.equal(getWorkshopView(state).facts.some(f=>/correct/i.test(f)),false);
});

test('dispatch inspection records an observed fault that changes the offered method',()=>{
 const before=createWorkshop('dispatch',2);
 const after=chooseWorkshop(before,'inspect_b');
 assert.ok(getWorkshopView(after).facts.some(f=>/replacement/i.test(f)));
 assert.notEqual(action(before,'repair_b').description,action(after,'repair_b').description);
});

test('save restoration replays commands and rejects forged outcomes or payments',()=>{
 const state=play('workshop',1,['prepare','assemble_hand']);
 const snapshot=JSON.parse(JSON.stringify(exportWorkshop(state)));
 assert.deepEqual(getWorkshopView(restoreWorkshop(snapshot)),getWorkshopView(state));
 snapshot.state.world.completed=99;
 assert.throws(()=>restoreWorkshop(snapshot));
 const payment=JSON.parse(JSON.stringify(exportWorkshop(state)));
 payment.state.workspace.actor.habits.receipts=[];
 assert.throws(()=>restoreWorkshop(payment));
});

test('every enabled action through two decisions executes without a framework error',()=>{
 for(const kind of ['workshop','dispatch'])for(const variant of [0,1,2]){
  const first=createWorkshop(kind,variant);
  for(const offer of getWorkshopView(first).actions.filter(a=>!a.disabled)){
   const second=chooseWorkshop(first,offer.id);
   for(const next of getWorkshopView(second).actions.filter(a=>!a.disabled)){
    assert.doesNotThrow(()=>chooseWorkshop(second,next.id),`${kind} variant ${variant}: ${offer.id}, ${next.id}`);
   }
  }
 }
});

test('late dead ends can end the shift with paid time in either host',()=>{
 const workshop=play('workshop',0,['prepare','read_notice','request_machine','wait_5','wait_5','wait_5','wait_5']);
 assert.equal(getWorkshopView(workshop).now,26);
 assert.equal(getWorkshopView(workshop).actions.filter(a=>!a.disabled).map(a=>a.id).join(','),'end_shift');
 const endedWorkshop=chooseWorkshop(workshop,'end_shift');
 assert.equal(getWorkshopView(endedWorkshop).now,30);
 assert.equal(getWorkshopView(endedWorkshop).finished,true);
 assert.throws(()=>chooseWorkshop(endedWorkshop,'end_shift'));
 const dispatch=play('dispatch',0,['repair_a','repair_a','repair_b','read_stock','read_stock_update','inspect_a']);
 assert.equal(getWorkshopView(dispatch).now,25);
 assert.equal(getWorkshopView(dispatch).actions.filter(a=>!a.disabled).map(a=>a.id).join(','),'end_shift');
 const endedDispatch=chooseWorkshop(dispatch,'end_shift');
 assert.equal(getWorkshopView(endedDispatch).now,30);
 assert.equal(endedDispatch.world.completed,1);
 assert.equal(getWorkshopView(endedDispatch).finished,true);
 assert.throws(()=>chooseWorkshop(endedDispatch,'repair_a'));
});
