import test from 'node:test';
import assert from 'node:assert/strict';
import {createDoorstep,chooseDoorstep,getDoorstepView,exportDoorstep,restoreDoorstep} from '../src/games/experiments/doorstep.js';
import {getRelationshipView} from '../src/social/relationships.js';

const choose=(state,...ids)=>ids.reduce((next,id)=>chooseDoorstep(next,id),state);
const stance=state=>getRelationshipView(state.recipient,'player','borrowed').stance;

test('unread correction is concealed until actual paid attention, and guessing the old access fails',()=>{
  let state=createDoorstep(1),view=getDoorstepView(state);
  assert.equal(view.messages[0].text,null);
  assert.equal(view.facts.some(f=>f.includes('back gate')),false);
  state=chooseDoorstep(state,'return_object');
  assert.equal(state.returned,false);
  assert.equal(state.workspace.actor.person.lastAttempt.elapsedMinutes,7);
  state=chooseDoorstep(state,'read_note');
  view=getDoorstepView(state);
  assert.match(view.messages[0].text,/back gate/);
  assert.equal(state.workspace.attention.processings.length,1);
  assert.equal(state.workspace.actor.person.lastAttempt.elapsedMinutes,2);
  state=chooseDoorstep(state,'return_object');
  assert.equal(state.returned,true);
  assert.equal(stance(state),'guarded');
});

test('asking directly and helping first are viable choices with measured time and distinct outcomes',()=>{
  let direct=choose(createDoorstep(0),'ask_neighbor','return_object','carry_sibling');
  assert.equal(getDoorstepView(direct).now,16);
  assert.equal(direct.returned,true);
  assert.equal(direct.helped,true);
  assert.equal(stance(direct),'open');
  let helping=choose(createDoorstep(2),'carry_sibling','ask_neighbor','return_object');
  assert.equal(getDoorstepView(helping).now,16);
  assert.equal(helping.helped,true);
  assert.equal(helping.missed,true);
  assert.equal(stance(helping),'guarded');
});

test('telling about delay changes expectation; actual return and recipient acknowledgment are separate',()=>{
  let state=choose(createDoorstep(0),'carry_sibling','tell_delay','read_note','wait','wait');
  assert.equal(state.missed,true);
  assert.equal(state.told,true);
  assert.equal(state.returned,false);
  assert.equal(stance(state),'guarded');
  assert.equal(getDoorstepView(state).metrics[1].value,'Late return explained');
  state=chooseDoorstep(state,'return_object');
  assert.equal(stance(state),'guarded');
  assert.equal(state.recipient.events.some(e=>e.kind==='repair_completed'),true);
  state=chooseDoorstep(state,'listen_reply');
  assert.equal(state.acknowledged,true);
  assert.equal(stance(state),'open');
});

test('recipient response variants preserve repair without automatic forgiveness',()=>{
  let reserved=choose(createDoorstep(1),'carry_sibling','ask_neighbor','return_object','listen_reply');
  assert.equal(reserved.returned,true);
  assert.equal(reserved.acknowledged,false);
  assert.equal(stance(reserved),'guarded');
  let conditional=choose(createDoorstep(2),'carry_sibling','tell_delay','ask_neighbor','return_object','listen_reply');
  assert.equal(conditional.acknowledged,true);
  assert.equal(stance(conditional),'open');
});

test('player view does not reveal the recipient private stance before a reply',()=>{
  assert.deepEqual(getDoorstepView(createDoorstep(0)),getDoorstepView(createDoorstep(1)));
  const timely=choose(createDoorstep(0),'ask_neighbor','return_object');
  const late=choose(createDoorstep(1),'carry_sibling','ask_neighbor','return_object');
  assert.equal(stance(timely),'open');
  assert.equal(stance(late),'guarded');
  for(const state of [timely,late]){
    const view=getDoorstepView(state);
    assert.equal(view.metrics.find(m=>m.label==='Neighbor response').value,'No reply heard');
    assert.equal(view.scene.people.find(p=>p.name==='Neighbor').status,'No reply heard');
    assert.equal(JSON.stringify(view).includes('guarded'),false);
  }
});

test('minute 12 is on time; a later receipt records the miss at minute 13',()=>{
  const onTime=choose(createDoorstep(0),'ask_neighbor','wait','return_object');
  assert.equal(getDoorstepView(onTime).now,12);
  assert.equal(onTime.missed,false);
  assert.equal(stance(onTime),'open');
  const late=choose(createDoorstep(0),'carry_sibling','ask_neighbor','wait','wait');
  assert.equal(getDoorstepView(late).now,13);
  assert.equal(late.recipient.events.find(e=>e.kind==='support_failed').occurredAt,13);
});

test('listening after an on-time return confirms receipt without inventing a repair acknowledgment',()=>{
  const state=choose(createDoorstep(0),'read_note','return_object','listen_reply');
  const view=getDoorstepView(state);
  assert.equal(view.now,12);
  assert.equal(state.missed,false);
  assert.equal(state.acknowledged,false);
  assert.equal(state.recipient.events.some(event=>event.kind==='repair_acknowledged'),false);
  assert.deepEqual(state.recipient.events.map(event=>event.kind),['support_completed']);
  assert.equal(view.metrics.find(metric=>metric.label==='Neighbor response').value,'On-time return confirmed');
  assert.match(view.history.at(-1).text,/confirmed receiving the object on time/i);
  assert.equal(JSON.stringify(view).includes('repair not acknowledged'),false);
});

test('JSON save replays a bounded command history and rejects forged state and commands',()=>{
  const state=choose(createDoorstep(2),'carry_sibling','read_note','return_object');
  const snapshot=JSON.parse(JSON.stringify(exportDoorstep(state)));
  assert.equal(state.kind,'doorstep');
  assert.equal(snapshot.kind,'doorstep');
  assert.deepEqual(getDoorstepView(restoreDoorstep(snapshot)),getDoorstepView(state));
  const forged=structuredClone(state);forged.returned=false;
  assert.throws(()=>exportDoorstep(forged),/consistency/i);
  snapshot.commands.push('grant_acknowledgment');
  assert.throws(()=>restoreDoorstep(snapshot),/Unavailable|command/i);
  const oversized=exportDoorstep(state);oversized.commands=Array(33).fill('wait');
  assert.throws(()=>restoreDoorstep(oversized),/commands/i);
  const crossKind=exportDoorstep(state);crossKind.kind='dispatch';
  assert.throws(()=>restoreDoorstep(crossKind),/snapshot/i);
});

test('ending early advances the real clock before the promise is missed',()=>{
  const state=chooseDoorstep(createDoorstep(),'end_evening');
  assert.equal(getDoorstepView(state).now,28);
  assert.equal(state.workspace.actor.person.lastAttempt.elapsedMinutes,28);
  assert.equal(state.recipient.events.find(e=>e.kind==='support_failed').occurredAt,13);
  assert.equal(state.recipient.events.find(e=>e.kind==='support_failed').receivedAt,28);
  assert.equal(getDoorstepView(state).finished,true);
});
