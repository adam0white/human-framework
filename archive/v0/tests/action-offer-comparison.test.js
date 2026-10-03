import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canUse,selectOffer,decide} from '../artifacts/action-offers/policy.mjs';
const inputs=JSON.parse(readFileSync(new URL('../artifacts/action-offers/inputs.json',import.meta.url)));

test('preregistration stays a ten-case two-arm source-informed boundary set',()=>{
  assert.equal(inputs.cases.length,10);assert.equal(new Set(inputs.cases.map(c=>c.id)).size,10);
  assert.deepEqual(inputs.arms,['conservative','explicit-try']);
  assert.equal(inputs.cases.filter(c=>c.host==='camp').length,2);
  assert.match(inputs.exploratoryPrior,/already established/);
});
test('synthetic caller respects typed uncertainty rather than English wording',()=>{
  const blocked={id:'full',unavailable:'ANY WORDING',capacityUncertain:false};
  const uncertain={...blocked,capacityUncertain:true},enabled={id:'one',unavailable:null,capacityUncertain:false};
  assert.equal(canUse(blocked,'explicit-try'),false);assert.equal(canUse(uncertain,'conservative'),false);assert.equal(canUse(uncertain,'explicit-try'),true);
  assert.equal(selectOffer([uncertain,enabled],'conservative'),enabled);assert.equal(selectOffer([uncertain,enabled],'explicit-try'),uncertain);
  assert.equal(canUse({...blocked,unavailable:'Your body estimate does not yet support this entire interval.'},'explicit-try'),false);
});
test('synthetic report caller uses visible structural facts before useless recovery',()=>{
  const view={job:null,budget:{used:0,limit:128},inventory:{radio:{available:0}},location:'valve',local:{peerPresent:false}};
  const offers=[{unavailable:'old capacity message',capacityUncertain:false}];
  for(const arm of inputs.arms){
    assert.equal(decide(view,offers,{policy:'report',via:'radio'},arm).reason,'owned-radio-exhausted');
    assert.equal(decide(view,offers,{policy:'report',via:'contact'},arm).reason,'peer-not-present');
    assert.equal(decide({...view,budget:{used:128,limit:128}},offers,{policy:'report',via:'radio'},arm).reason,'decision-budget');
  }
});
test('synthetic active-job and unchanged authoritative Camp offers never become probes',()=>{
  for(const arm of inputs.arms){
    assert.equal(decide({job:{}},[],{host:'camp'},arm).kind,'advance');
    assert.equal(decide({job:null},[{unavailable:'capacity',capacityUncertain:false}],{host:'camp'},arm).kind,'wait');
  }
  const source=readFileSync(new URL('../artifacts/action-offers/policy.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bimport\b|assessEffort\(|exportState\(|getWorldSummary\(/);
});
