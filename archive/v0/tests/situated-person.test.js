import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createPerson,HUMAN_VERSION} from '../src/human/v0.1.1.js';

const personFile=new URL('../src/person/index.js',import.meta.url);
const api=existsSync(personFile)?await import(personFile):{};
const {createSituatedPerson,advancePerson,setPurpose,observePerson,getSituatedView,
  exportSituatedPerson,restoreSituatedPerson,decide}=api;

const catalog={
  actors:['learner','housemate','colleague'],
  facts:['method'],
  purposes:['learn','care','work'],
  commitments:['delivery','other-delivery'],
  actions:['practice','deliver','work','confirm','coordinate','wait']
};
const human=()=>createPerson({id:'learner',body:{fatigue:0.22,hunger:0.31},skills:{practice:0.4},observationBias:0.1});
const setup=()=>createSituatedPerson({human:human(),now:0,purposes:[{id:'learn',status:'active'}]},catalog);
const instruction={id:'message-1',at:0,source:'colleague',channel:'instruction',kind:'fact',subject:'method',value:true};
const deliveryDetails={revision:0,debtorId:'learner',creditorId:'housemate',dueAt:10,terms:'deliver supper'};
const learningChoice={
  options:[{id:'practice',requiresFacts:['method']},{id:'wait',requiresFacts:[]}],
  rules:[{id:'use-instruction',when:{fact:{id:'method',value:true},purpose:{id:'learn',status:'active'}},actionId:'practice'}],
  defaultActionId:'wait'
};

test('situated person exposes the frozen candidate API',()=>{
  assert.equal(HUMAN_VERSION,'0.1.1');
  for(const name of ['createSituatedPerson','advancePerson','setPurpose','observePerson','getSituatedView',
    'exportSituatedPerson','restoreSituatedPerson','decide'])assert.equal(typeof api[name],'function',name);
});

test('a delivered instruction changes the executable baseline choice while a withheld fact does not',()=>{
  const uninformed=setup();
  assert.deepEqual(decide(uninformed,learningChoice,catalog,null),{
    actionId:'wait',provider:'baseline',ruleId:null,evidence:[],noticedOptions:['wait']
  });
  const informed=observePerson(uninformed,instruction,catalog);
  assert.deepEqual(decide(informed,learningChoice,catalog,null),{
    actionId:'practice',provider:'baseline',ruleId:'use-instruction',
    evidence:['message-1','purpose:learn'],noticedOptions:['practice','wait']
  });
  assert.deepEqual(uninformed.observations,[]);
  assert.deepEqual(informed.human,uninformed.human);
  assert.equal(informed.human.skills.practice,0.4);
});

test('an offered external choice survives even when it is contrary to the matching baseline',()=>{
  const informed=observePerson(setup(),instruction,catalog);
  assert.deepEqual(decide(informed,learningChoice,catalog,'wait'),{
    actionId:'wait',provider:'external',ruleId:null,evidence:[],noticedOptions:['practice','wait']
  });
  assert.deepEqual(decide(setup(),learningChoice,catalog,'practice'),{
    actionId:'practice',provider:'external',ruleId:null,evidence:[],noticedOptions:['wait']
  });
  assert.throws(()=>decide(informed,learningChoice,catalog,'unoffered'));
});

test('observation receipt is attributed, ordered and idempotent but conflicting duplicate IDs fail',()=>{
  const first=observePerson(setup(),instruction,catalog);
  assert.deepEqual(observePerson(first,{...instruction},catalog),first);
  assert.deepEqual(observePerson(first,{value:true,subject:'method',kind:'fact',channel:'instruction',
    source:'colleague',at:0,id:'message-1'},catalog),first);
  assert.throws(()=>observePerson(first,{...instruction,value:false},catalog),/conflict|duplicate/i);
  assert.throws(()=>observePerson(first,{...instruction,id:'old',at:-1},catalog));
  assert.throws(()=>observePerson(first,{...instruction,id:'future',at:1},catalog),/future/i);
  assert.throws(()=>observePerson(first,{...instruction,id:'world-source',source:'world'},catalog));
  assert.throws(()=>observePerson(first,{...instruction,id:'extra',trace:true},catalog));
});

test('generic conjunction rules use the latest commitment and interaction evidence',()=>{
  let person=setup();
  person=observePerson(person,{id:'commit-1',at:0,source:'housemate',channel:'communication',kind:'commitment',subject:'delivery',value:'accepted',details:deliveryDetails},catalog);
  person=observePerson(person,{id:'trust-1',at:0,source:'colleague',channel:'experience',kind:'interaction',subject:'housemate',contextId:'delivery',value:'breached'},catalog);
  const input={
    options:[{id:'confirm',requiresFacts:[]},{id:'wait',requiresFacts:[]}],
    rules:[{id:'confirm-after-breach',when:{commitment:{id:'delivery',status:'accepted'},interaction:{actorId:'housemate',contextId:'delivery',value:'breached'}},actionId:'confirm'}],
    defaultActionId:'wait'
  };
  assert.deepEqual(decide(person,input,catalog,null),{
    actionId:'confirm',provider:'baseline',ruleId:'confirm-after-breach',evidence:['commit-1','trust-1'],noticedOptions:['confirm','wait']
  });
  person=observePerson(person,{id:'trust-2',at:0,source:'housemate',channel:'communication',kind:'interaction',subject:'housemate',contextId:'delivery',value:'repaired'},catalog);
  assert.deepEqual(decide(person,input,catalog,null).actionId,'wait');
});

test('interaction evidence remains specific to its actor and commitment context',()=>{
  let person=setup();
  person=observePerson(person,{id:'supply-breach',at:0,source:'colleague',channel:'experience',kind:'interaction',subject:'housemate',contextId:'delivery',value:'breached'},catalog);
  person=observePerson(person,{id:'other-fulfilled',at:0,source:'housemate',channel:'communication',kind:'interaction',subject:'housemate',contextId:'other-delivery',value:'fulfilled'},catalog);
  const decision={options:[{id:'confirm',requiresFacts:[]},{id:'wait',requiresFacts:[]}],rules:[{
    id:'confirm-supply',when:{interaction:{actorId:'housemate',contextId:'delivery',value:'breached'}},actionId:'confirm'
  }],defaultActionId:'wait'};
  assert.deepEqual(decide(person,decision,catalog,null),{
    actionId:'confirm',provider:'baseline',ruleId:'confirm-supply',evidence:['supply-breach'],noticedOptions:['confirm','wait']
  });
});

test('commitment observations preserve terms and enforce monotonic delivered revisions',()=>{
  const revised={revision:1,debtorId:'learner',creditorId:'housemate',dueAt:12,terms:'deliver breakfast'};
  const record={id:'commit-revised',at:0,source:'housemate',channel:'communication',kind:'commitment',subject:'delivery',value:'accepted',details:revised};
  const person=observePerson(setup(),record,catalog);
  const restored=restoreSituatedPerson(JSON.parse(JSON.stringify(exportSituatedPerson(person,catalog))),catalog);
  assert.deepEqual(restored.observations[0].details,revised);
  assert.deepEqual(observePerson(person,{details:{terms:'deliver breakfast',dueAt:12,creditorId:'housemate',debtorId:'learner',revision:1},
    value:'accepted',subject:'delivery',kind:'commitment',channel:'communication',source:'housemate',at:0,id:'commit-revised'},catalog),person);
  assert.throws(()=>observePerson(person,{...record,id:'stale-commitment',details:deliveryDetails},catalog),/revision/i);
  const malformed=exportSituatedPerson(person,catalog);
  malformed.person.observations.push({...record,id:'stale-snapshot',details:deliveryDetails});
  assert.throws(()=>restoreSituatedPerson(malformed,catalog),/revision/i);

  const decision={options:[{id:'deliver',requiresFacts:[]},{id:'wait',requiresFacts:[]}],rules:[{
    id:'old-terms',when:{commitment:{id:'delivery',status:'accepted',revision:0}},actionId:'deliver'
  }],defaultActionId:'wait'};
  assert.equal(decide(person,decision,catalog,null).actionId,'wait');
  assert.throws(()=>observePerson(setup(),{...record,details:{...revised,creditorId:'learner'}},catalog),/different/);
  assert.throws(()=>observePerson(setup(),{...record,details:{...revised,debtorId:'stranger'}},catalog),/debtor/);
  assert.throws(()=>observePerson(setup(),{...record,details:{...revised,hidden:true}},catalog),/field/);
  assert.throws(()=>observePerson(setup(),{...instruction,details:deliveryDetails},catalog),/unrelated/);
  assert.throws(()=>observePerson(setup(),{id:'contextless',at:0,source:'colleague',channel:'experience',kind:'interaction',subject:'housemate',value:'breached'},catalog),/interaction/);
});

test('purpose updates and life chronology are pure while unmodeled gaps leave Human state unchanged',()=>{
  const initial=setup();
  const advanced=advancePerson(initial,14*24*60,catalog);
  assert.equal(advanced.now,14*24*60);
  assert.deepEqual(advanced.human,initial.human);
  assert.deepEqual(initial,setup());
  assert.throws(()=>advancePerson(advanced,advanced.now-1,catalog));
  const completed=setPurpose(advanced,{id:'learn',status:'completed'},catalog);
  assert.deepEqual(completed.purposes,[{id:'learn',status:'completed'}]);
  assert.deepEqual(advanced.purposes,[{id:'learn',status:'active'}]);
  assert.throws(()=>setPurpose(initial,{id:'unknown',status:'active'},catalog));
  assert.throws(()=>setPurpose(initial,{id:'learn',status:'active',reason:'hidden'},catalog));
});

test('views and snapshots are detached JSON and restore validates every identifier and record',()=>{
  const original=observePerson(setup(),instruction,catalog);
  const view=getSituatedView(original,catalog);
  assert.deepEqual(view,{id:'learner',now:0,purposes:[{id:'learn',status:'active'}],observations:[instruction],human:{
    id:'learner',body:{fatigue:0.3,hunger:0.3},skills:{practice:0.4},minutes:0,pending:null
  }});
  view.observations[0].value=false;view.human.skills.practice=1;
  assert.equal(original.observations[0].value,true);
  assert.equal(original.human.skills.practice,0.4);

  const snapshot=exportSituatedPerson(original,catalog);
  const wire=JSON.parse(JSON.stringify(snapshot));
  assert.deepEqual(restoreSituatedPerson(wire,catalog),original);
  wire.person.observations[0].source='stranger';
  assert.throws(()=>restoreSituatedPerson(wire,catalog));
  const malformed=exportSituatedPerson(original,catalog);
  malformed.person.observations[0].value='true';
  assert.throws(()=>restoreSituatedPerson(malformed,catalog));
  const extra=exportSituatedPerson(original,catalog);extra.person.secret=true;
  assert.throws(()=>restoreSituatedPerson(extra,catalog));
});

test('strict catalogs, person records and decisions reject unknown fields, IDs and ambiguous policies',()=>{
  assert.throws(()=>createSituatedPerson({human:human(),now:0,purposes:[{id:'learn',status:'active'}]},
    {...catalog,actors:['learner','learner']}));
  assert.throws(()=>createSituatedPerson({human:human(),now:0,purposes:[{id:'learn',status:'active'}],world:{}},catalog));
  assert.throws(()=>createSituatedPerson({human:human(),now:0,purposes:[{id:'learn',status:'active'},{id:'learn',status:'completed'}]},catalog));
  assert.throws(()=>decide(setup(),{...learningChoice,world:{method:true}},catalog,null));
  assert.throws(()=>decide(setup(),{...learningChoice,options:[...learningChoice.options,{id:'wait',requiresFacts:[]}]},catalog,null));
  assert.throws(()=>decide(setup(),{...learningChoice,rules:[{...learningChoice.rules[0],actionId:'deliver'}]},catalog,null));
  assert.throws(()=>decide(setup(),{...learningChoice,rules:[learningChoice.rules[0],learningChoice.rules[0]]},catalog,null));
  assert.throws(()=>decide(setup(),{...learningChoice,defaultActionId:'deliver'},catalog,null));
  assert.throws(()=>decide(setup(),{options:[{id:'confirm',requiresFacts:[]}],rules:[{
    id:'contextless',when:{interaction:{actorId:'housemate',value:'breached'}},actionId:'confirm'
  }],defaultActionId:'confirm'},catalog,null),/context/);
});

test('strict JSON arrays reject extra wire properties and an unnoticed default leaves the decision pending',()=>{
  const actors=[...catalog.actors];actors.extra='hidden';
  assert.throws(()=>createSituatedPerson({human:human(),now:0,purposes:[{id:'learn',status:'active'}]},
    {...catalog,actors}));
  const snapshot=exportSituatedPerson(setup(),catalog);
  snapshot.person.observations.extra=true;
  assert.throws(()=>restoreSituatedPerson(snapshot,catalog));
  assert.deepEqual(decide(setup(),{
    options:[{id:'practice',requiresFacts:['method']}],rules:[],defaultActionId:'practice'
  },catalog,null),{
    actionId:null,provider:'pending',ruleId:null,evidence:[],noticedOptions:[]
  });
});

test('creation validates purpose wire fields before cloning can normalize them',()=>{
  let reads=0;
  const malformed=Object.defineProperty({id:'learn'},'status',{enumerable:true,get(){reads++;return 'active';}});
  assert.throws(()=>createSituatedPerson({human:human(),now:0,purposes:[malformed]},catalog));
  assert.equal(reads,0);
});
