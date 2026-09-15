import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EPISODES_VERSION,createEpisodes,advanceEpisodes,recordEpisode,retractEpisode,
  queryEpisodes,exportEpisodes,restoreEpisodes,
} from '../src/experience/episodes.js';

const setup=(extra={})=>createEpisodes({ownerId:'actor-a',now:10,
  contexts:['north-route','south-route'],sources:['actor-a','guide','relay'],
  propositions:['north-hazard','route-clear'],...extra});
const episode=(episodeId,eventId,extra={})=>({episodeId,eventId,
  contextId:'north-route',sourceId:'guide',originId:'guide',occurredAt:8,
  receivedAt:10,expiresAt:30,actionId:null,outcomeId:'blocked',
  facts:[{propositionId:'north-hazard',value:true}],correctsEpisodeId:null,...extra});
const found=(state,contextId='north-route',limit=8)=>queryEpisodes(state,{contextId,limit}).episodes;

test('context retrieval retains occurrence and delivery dates without refreshing an expired episode',()=>{
  let state=recordEpisode(setup(),episode('observed','event-a'));
  assert.deepEqual(found(state).map(({episodeId,occurredAt,receivedAt})=>({episodeId,occurredAt,receivedAt})),
    [{episodeId:'observed',occurredAt:8,receivedAt:10}]);
  assert.deepEqual(found(state,'south-route'),[]);
  state=advanceEpisodes(state,30);
  assert.deepEqual(found(state),[]);
  assert.equal(state.records.length,1,'old provenance remains retained');
});

test('retrieval is bounded and sorted by occurrence with deterministic arrival tie breaking',()=>{
  let state=setup();
  state=recordEpisode(state,episode('old','event-old',{occurredAt:6}));
  state=recordEpisode(state,episode('tie-first','event-tie-first',{occurredAt:8}));
  state=recordEpisode(state,episode('tie-second','event-tie-second',{occurredAt:8}));
  state=recordEpisode(state,episode('new','event-new',{occurredAt:9}));
  assert.deepEqual(found(state,'north-route',2).map(item=>item.episodeId),['new','tie-second']);
  assert.deepEqual(found(state,'north-route',4).map(item=>item.episodeId),
    ['new','tie-second','tie-first','old']);
  assert.throws(()=>queryEpisodes(state,{contextId:'north-route',limit:0}),/limit/i);
});

test('relay copy cannot become an independent event or lengthen original validity',()=>{
  let state=recordEpisode(setup(),episode('direct','event-a'));
  state=recordEpisode(state,episode('relay-copy','event-a',{sourceId:'relay'}));
  assert.equal(state.records.length,2);
  assert.deepEqual(found(state).map(item=>item.episodeId),['direct']);
  assert.throws(()=>recordEpisode(state,episode('invalid-relay','event-a',{
    sourceId:'relay',expiresAt:40,
  })),/expiry|expiration|claim/i);
  assert.deepEqual(found(state).map(item=>item.episodeId),['direct']);
});

test('origin-authored retraction removes every relay copy but retains both original records',()=>{
  let state=recordEpisode(setup(),episode('direct','event-a'));
  state=recordEpisode(state,episode('relay-copy','event-a',{sourceId:'relay'}));
  state=retractEpisode(state,{recordId:'withdraw',targetEpisodeId:'relay-copy',
    sourceId:'guide',originId:'guide',receivedAt:10});
  assert.deepEqual(found(state),[]);
  assert.equal(state.records.length,3);
  assert.throws(()=>retractEpisode(state,{recordId:'forged',targetEpisodeId:'direct',
    sourceId:'relay',originId:'guide',receivedAt:10}),/origin|author/i);
});

test('correction supersedes whole shared event with its original occurrence retained',()=>{
  let state=recordEpisode(setup(),episode('direct','event-a'));
  state=recordEpisode(state,episode('relay-copy','event-a',{sourceId:'relay'}));
  state=advanceEpisodes(state,14);
  state=recordEpisode(state,episode('correction','event-a',{
    sourceId:'guide',receivedAt:14,correctsEpisodeId:'relay-copy',
    outcomeId:'clear',facts:[{propositionId:'north-hazard',value:false}],
  }));
  assert.deepEqual(found(state).map(item=>({episodeId:item.episodeId,occurredAt:item.occurredAt,
    receivedAt:item.receivedAt,value:item.facts[0].value})),
  [{episodeId:'correction',occurredAt:8,receivedAt:14,value:false}]);
  assert.equal(state.records.length,3);
  assert.deepEqual(recordEpisode(state,episode('direct','event-a')),state,
    'a delayed retry of the same direct record cannot undo the correction');
  assert.deepEqual(recordEpisode(state,episode('correction','event-a',{
    sourceId:'guide',receivedAt:14,correctsEpisodeId:'relay-copy',
    outcomeId:'clear',facts:[{propositionId:'north-hazard',value:false}],
  })),state);
  state=recordEpisode(state,episode('late-original-relay','event-a',{
    sourceId:'relay',receivedAt:14,
  }));
  assert.equal(state.records.length,4,'relay delivery keeps original provenance');
  assert.deepEqual(found(state).map(item=>item.episodeId),['correction'],
    'the late original relay cannot replace the attributed correction');
  assert.throws(()=>recordEpisode(state,episode('relay-forgery','event-a',{
    sourceId:'relay',receivedAt:14,correctsEpisodeId:'direct',outcomeId:'clear',
  })),/origin|author/i);
  assert.throws(()=>recordEpisode(state,episode('fake-correction','event-a',{
    sourceId:'guide',receivedAt:14,correctsEpisodeId:'correction',
    outcomeId:'clear',facts:[{propositionId:'north-hazard',value:false}],
  })),/change|semantic/i);
});

test('events are idempotent only by identical ID and all arrivals are at actor time',()=>{
  const first=episode('direct','event-a');
  const state=recordEpisode(setup(),first);
  assert.deepEqual(recordEpisode(state,{...first,facts:[{...first.facts[0]}]}),state);
  assert.throws(()=>recordEpisode(state,{...first,outcomeId:'changed'}),/conflict/i);
  assert.throws(()=>recordEpisode(state,episode('future','event-future',{
    receivedAt:11,
  })),/current|received/i);
  assert.throws(()=>recordEpisode(state,episode('before','event-before',{
    occurredAt:11,
  })),/future|occurred/i);
  assert.throws(()=>recordEpisode(state,episode('unknown','event-unknown',{
    contextId:'missing',
  })),/context/i);
});

test('strict bounded snapshots reject actor substitution, malformed fields and hidden accessors',()=>{
  assert.throws(()=>setup({hidden:true}),/fields|setup/i);
  let state=setup({maxRecords:2});
  state=recordEpisode(state,episode('first','event-a'));
  state=recordEpisode(state,episode('second','event-b',{occurredAt:9}));
  assert.throws(()=>recordEpisode(state,episode('third','event-c',{occurredAt:10})),/limit/i);
  const wire=JSON.parse(JSON.stringify(exportEpisodes(state)));
  const restored=restoreEpisodes(wire,'actor-a');
  assert.equal(restored.version,EPISODES_VERSION);
  assert.deepEqual(restored,state);
  assert.deepEqual(advanceEpisodes(restored,25),advanceEpisodes(state,25));
  assert.throws(()=>restoreEpisodes(wire,'actor-b'),/owner|actor/i);
  for(const mutate of [
    value=>{value.episodes.records[0].occurredAt=11;},
    value=>{value.episodes.records[0].facts[0].value='yes';},
    value=>{value.episodes.records[0].contextId='missing';},
    value=>{value.episodes.records[0].extra=true;},
    value=>{value.episodes.records.push(value.episodes.records[0]);},
    value=>{value.extra=true;},
  ]) {const bad=structuredClone(wire);mutate(bad);assert.throws(()=>restoreEpisodes(bad,'actor-a'));}
  const accessor={format:'human-framework-episodes',version:1};
  Object.defineProperty(accessor,'episodes',{enumerable:true,get(){throw Error('getter ran');}});
  assert.throws(()=>restoreEpisodes(accessor,'actor-a'),/fields|snapshot|data/i);
  const nested=structuredClone(wire);
  Object.defineProperty(nested.episodes.records[0],'kind',{enumerable:true,
    get(){throw Error('nested getter ran');}});
  assert.throws(()=>restoreEpisodes(nested,'actor-a'),/fields|snapshot|data|kind/i);
  const retrieved=found(state);retrieved[0].facts[0].value=false;
  assert.equal(found(state)[0].facts[0].value,true);
});
