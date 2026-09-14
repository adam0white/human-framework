import test from 'node:test';
import assert from 'node:assert/strict';
import {createShowcase,chooseShowcase,getShowcaseView,replayWithout} from '../src/games/three-moments.js';

const factors=[true,false];
const actions=[['guided-practice','basic-practice'],['deliver','paid-work'],['confirm','coordinate']];

function play(session,selected) {
  for(const action of selected)session=chooseShowcase(session,action);
  return session;
}

test('only the current valid choice is accepted and a completed run is closed',()=>{
  let session=createShowcase();
  assert.throws(()=>chooseShowcase(session,'deliver'),/Invalid action/);
  session=play(session,['guided-practice','deliver','confirm']);
  assert.throws(()=>chooseShowcase(session,'confirm'),/completed/);
  assert.throws(()=>createShowcase({instruction:'yes'}),/Invalid instruction/);
  let accessed=false;
  const setup={};Object.defineProperty(setup,'instruction',{enumerable:true,get(){accessed=true;return true;}});
  assert.throws(()=>createShowcase(setup),/Invalid showcase setup/);
  assert.equal(accessed,false);
});

test('each view contains only current known information and returns detached data',()=>{
  let session=createShowcase({instruction:false,accepted:false,observedBreach:false});
  let view=getShowcaseView(session);
  assert.equal(view.day,1);assert.equal(view.lastOutcome,null);
  assert.equal(JSON.stringify(view).includes('breach'),false);
  assert.deepEqual(view.choices.map(choice=>choice.id),['basic-practice']);
  view.known.push({label:'Leak',text:'mutation'});
  assert.equal(getShowcaseView(session).known.some(item=>item.label==='Leak'),false);

  session=chooseShowcase(session,'basic-practice');view=getShowcaseView(session);
  assert.equal(view.day,7);assert.equal(view.lastOutcome.title,'Practice completed');
  assert.equal(session.people.learner.observations.find(record=>record.id==='practice-result').at,1440+10);
  assert.equal(JSON.stringify(view).includes('missed supply'),false);
  assert.deepEqual(view.choices.map(choice=>choice.id),actions[1]);

  session=chooseShowcase(session,'paid-work');view=getShowcaseView(session);
  assert.equal(view.day,13);assert.equal(view.known.some(item=>/^You observed/i.test(item.text)),false);
  assert.ok(view.known.some(item=>/last knew.*accepted/i.test(item.text)));
  assert.ok(view.carry.some(item=>/No household promise accepted/i.test(item.text)));
  assert.ok(view.carry.some(item=>/1 prepared item remains/i.test(item.text)));
  assert.deepEqual(view.choices.map(choice=>choice.id),actions[2]);
});

test('all factor combinations and valid paths consume three real attempts immutably',()=>{
  for(const instruction of factors)for(const accepted of factors)for(const observedBreach of factors) {
    const first=instruction?actions[0]:['basic-practice'];
    for(const learning of first)for(const household of actions[1])for(const collaboration of actions[2]) {
      const original=createShowcase({instruction,accepted,observedBreach});
      const before=structuredClone(original);
      const selected=[learning,household,collaboration];
      const finished=play(original,selected);
      assert.deepEqual(original,before);
      assert.equal(finished.step,3);assert.equal(finished.people.learner.human.minutes,30);
      assert.deepEqual(finished.history.map(entry=>entry.choice),selected);
      assert.ok(finished.history.every(entry=>entry.decision.provider==='external'));
      assert.equal(finished.people.learner.human.pending,null);
      assert.equal(getShowcaseView(finished).complete,true);
    }
  }
});

test('baseline recommendations come from carried knowledge, promise, and observed history',()=>{
  const recommended=session=>getShowcaseView(session).choices.find(choice=>choice.recommended)?.id;
  assert.equal(recommended(createShowcase()),'guided-practice');
  assert.equal(recommended(createShowcase({instruction:false})),'basic-practice');

  let accepted=chooseShowcase(createShowcase(),'guided-practice');
  let absent=chooseShowcase(createShowcase({accepted:false}),'guided-practice');
  assert.equal(recommended(accepted),'deliver');assert.equal(recommended(absent),'paid-work');

  accepted=chooseShowcase(accepted,'deliver');
  absent=chooseShowcase(absent,'deliver');
  assert.equal(recommended(accepted),'confirm');assert.equal(recommended(absent),'confirm');
  const unseen=play(createShowcase({observedBreach:false}),['guided-practice','deliver']);
  assert.equal(recommended(unseen),'coordinate');
});

test('actual consequences and receipts follow the player choices',()=>{
  const beforeFinal=play(createShowcase(),['basic-practice','paid-work']);
  const beforeFinalView=getShowcaseView(beforeFinal);
  assert.ok(beforeFinalView.carry.some(item=>/promise breached/i.test(item.text)));
  assert.ok(beforeFinalView.carry.some(item=>/1 prepared item remains/i.test(item.text)));

  const delivered=play(createShowcase(),['guided-practice','deliver','confirm']);
  assert.equal(delivered.world.produced,2);assert.equal(delivered.world.delivered,1);
  assert.equal(delivered.commitments.delivery.status,'fulfilled');
  assert.equal(delivered.commitments.delivery.dueAt,7*1440+15);
  assert.equal(delivered.commitments.delivery.outcomeId,'delivery-receipt');
  assert.equal(delivered.world.housemateResponse,'acknowledged');
  assert.equal(delivered.world.colleagueResponse,'sent-plan');
  assert.equal(delivered.people.colleague.observations.find(record=>record.subject==='confirmation-request')?.value,true);
  assert.equal(delivered.history[1].receipt.actorId,null);

  const missed=play(createShowcase(),['basic-practice','paid-work','coordinate']);
  assert.equal(missed.world.produced,1);assert.equal(missed.world.delivered,0);
  assert.equal(missed.world.wages,1);assert.equal(missed.commitments.delivery.status,'breached');
  assert.equal(missed.world.housemateResponse,'requested-alternative');
  assert.equal(missed.world.colleagueResponse,'started-together');
  assert.equal(missed.people.colleague.observations.find(record=>record.subject==='coordination-request')?.value,true);
  assert.equal(missed.history[1].receipt,null);

  const voluntary=play(createShowcase({accepted:false}),['guided-practice','deliver','confirm']);
  assert.equal(voluntary.commitments.delivery.status,'proposed');
  assert.doesNotMatch(voluntary.history[1].outcome.text,/host|fulfillment|promise/i);
});

test('dated gaps do not simulate hidden body or learning changes',()=>{
  let session=createShowcase();
  const start=structuredClone(session.people.learner.human);
  session=chooseShowcase(session,'guided-practice');
  const afterPractice=structuredClone(session.people.learner.human);
  assert.equal(afterPractice.minutes,10);
  assert.ok(afterPractice.skills.craft>start.skills.craft);
  assert.equal(session.history[1],undefined);
  session=chooseShowcase(session,'deliver');
  assert.equal(session.history[1].bodyBefore.fatigue,afterPractice.body.fatigue);
  assert.equal(session.history[1].skillBefore,afterPractice.skills.craft);
  const afterDelivery=structuredClone(session.people.learner.human);
  session=chooseShowcase(session,'confirm');
  assert.equal(session.history[2].bodyBefore.fatigue,afterDelivery.body.fatigue);
  assert.equal(session.history[2].skillBefore,afterDelivery.skills.craft);
});

test('replay removes exactly one original experience and resets choices',()=>{
  const finished=play(createShowcase(),['basic-practice','paid-work','coordinate']);
  for(const factor of ['instruction','accepted','observedBreach']) {
    const replay=replayWithout(finished,factor);
    assert.equal(replay.step,0);assert.deepEqual(replay.history,[]);
    assert.equal(replay.setup[factor],false);
    for(const other of ['instruction','accepted','observedBreach'].filter(name=>name!==factor)) {
      assert.equal(replay.setup[other],finished.setup[other]);
    }
  }
  assert.throws(()=>replayWithout(finished,'unknown'),/Invalid replay factor/);
  const missing=createShowcase({instruction:false});
  assert.throws(()=>replayWithout(missing,'instruction'),/already absent/);
  assert.deepEqual(getShowcaseView(missing).replayFactors,['accepted','observedBreach']);
});

test('public operations reject forged, incomplete, and accessor-backed sessions',()=>{
  const forged=createShowcase();forged.world.produced=900;
  assert.throws(()=>getShowcaseView(forged),/Invalid showcase session/);
  assert.throws(()=>chooseShowcase(forged,'guided-practice'),/Invalid showcase session/);
  const impossible=createShowcase();impossible.step=3;
  assert.throws(()=>getShowcaseView(impossible),/Invalid showcase session/);
  assert.throws(()=>replayWithout({version:'0.1.0'},'instruction'),/Invalid showcase session/);
  let accessed=false;
  const hostile={};Object.defineProperty(hostile,'version',{enumerable:true,get(){accessed=true;return '0.1.0';}});
  assert.throws(()=>getShowcaseView(hostile),/Invalid showcase session/);
  assert.equal(accessed,false);
});

test('completion view separates actual choices from a shared-baseline comparison',()=>{
  const session=play(createShowcase(),['basic-practice','paid-work','coordinate']);
  const view=getShowcaseView(session);
  assert.equal(view.day,14);assert.equal(view.choices.length,0);
  assert.ok(view.summary.some(item=>item.text.includes('1 prepared item')));
  assert.ok(view.summary.some(item=>item.text.includes('paid work')));
  assert.ok(view.carry.some(item=>/ended breached/i.test(item.text)));
  assert.ok(view.carry.some(item=>/1 item remains/i.test(item.text)));
  assert.ok(view.carry.some(item=>/Guided method received; basic practice chosen/i.test(item.text)));
  assert.equal(view.comparison.title,'One earlier event, a different suggestion');
  assert.match(view.comparison.text,/baseline/i);
  assert.match(view.comparison.text,/confirm|coordinate/);
  assert.doesNotMatch(view.comparison.text,/function|actionId|observedBreach/i);
});
