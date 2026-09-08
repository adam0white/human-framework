import {isVerifiedFreeze} from './provenance.js';
const slots=(actors,value)=>Object.fromEntries(actors.flatMap(actor=>Array.from({length:30},(_,i)=>[`${actor}:${i+1}`,value])));
const setup=(valveMinutes,inletMinutes,launchAt,channelMode='reliable',channelOverrides={})=>({valveMinutes,inletMinutes,launchAt,channelMode,channelSeed:0,channelOverrides});
const p=(id,family,config)=>({id,family,partition:'development',kind:'policy',setup:config});
const a=(at,actor,action)=>({at,actor,action});
const term=(releaseAt)=>({releaseAt,attendFrom:releaseAt+4,attendUntil:releaseAt+5});
const decide=(decision,revision=1)=>({task:'decide',proposalId:'keeper:p1',revision,decision});
const response=(decision,revision=1)=>({task:'transmit',message:{kind:'response',proposalId:'keeper:p1',revision,decision}});
const report={task:'transmit',message:{kind:'report',observationIds:'all-local'}};
const policyCases=[
  p('D1','timely and easy retained',setup(6,2,27)),
  p('D2','long reply',setup(12,2,27,'bounded',slots(['keeper','receiver'],6))),
  p('D3','missing receiver traffic',setup(6,2,15,'lossy',{...slots(['keeper'],2),...slots(['receiver'],'loss')})),
  p('D4','slow inlet',setup(6,14,27)),
  p('D5','both repairs long',setup(12,14,27,'bounded',slots(['keeper','receiver'],6))),
  p('D6','early slow inlet',setup(6,14,15)),
  p('D7','easy early overhead',setup(6,2,15)),
  p('D8','contact opportunity',setup(12,2,27,'lossy',slots(['keeper','receiver'],'loss'))),
  p('D9','reliable long keeper late launch',setup(12,2,27)),
  p('D10','reliable both long late launch',setup(12,14,27)),
  p('D11','reliable long keeper early launch',setup(12,2,15)),
  p('D12','reliable both long early launch',setup(12,14,15))
];
const script=(id,family,steps,config=setup(6,2,27))=>({id,family,partition:'development',kind:'script',setup:config,steps});
const successfulPrefix=[a(0,'keeper',{task:'inspect'}),a(0,'receiver',{task:'inspect'}),a(1,'keeper',{task:'propose',terms:term(13)}),a(1,'receiver',{task:'repair'}),a(2,'keeper',{task:'repair'}),a(4,'receiver',decide('accept')),a(4,'receiver',response('accept')),a(8,'keeper',decide('accept'))];
const successfulEnd=[a(13,'keeper',{task:'release'}),a(17,'receiver',{task:'attend',minutes:1})];
const scripts=[
  script('S1-confirm','same-paid confirmation',[...successfulPrefix,a(8,'keeper',{task:'transmit',message:{kind:'confirm',messageId:'receiver:m1'}}),...successfulEnd]),
  script('S2-equal-cost-response','same-paid alternative consent envelope',[...successfulPrefix,a(8,'keeper',response('accept')),...successfulEnd]),
  script('S3-stale-response','newer revision before old response',[
    a(0,'keeper',{task:'propose',terms:term(10)}),a(1,'keeper',{task:'propose',proposalId:'keeper:p1',revision:2,terms:term(13)}),a(2,'keeper',{task:'inspect'}),a(3,'keeper',{task:'repair'}),a(3,'receiver',decide('accept')),a(3,'receiver',response('accept')),a(4,'receiver',decide('withdraw')),a(4,'receiver',decide('accept',2)),a(4,'receiver',response('accept',2)),a(5,'receiver',{task:'inspect'}),a(6,'receiver',{task:'repair'}),...successfulEnd
  ],setup(6,2,27,'bounded',{'receiver:4':6,'receiver:5':2,'keeper:1':2,'keeper:2':2})),
  script('S4-stale-readiness','newer local readiness before old report',[
    a(0,'keeper',{task:'inspect'}),a(1,'keeper',report),a(2,'keeper',{task:'repair',minutes:1}),a(3,'keeper',report)
  ],setup(6,2,27,'bounded',{'keeper:2':6,'keeper:4':2})),
  ...['omitted','withdrawn'].map(variant=>script(`S5-${variant}`,`accepted work ${variant}`, [
    a(0,'keeper',{task:'propose',terms:term(10)}),a(1,'keeper',{task:'inspect'}),a(2,'keeper',{task:'repair'}),a(3,'receiver',decide('accept')),a(3,'receiver',response('accept')),
    ...(variant==='withdrawn'?[a(5,'receiver',decide('withdraw')),a(5,'receiver',response('withdraw'))]:[]),a(6,'receiver',{task:'cart'}),a(10,'keeper',{task:'release'})
  ])),
  script('S6-contact','paid direct physical contact',[
    a(0,'keeper',{task:'inspect'}),a(0,'receiver',{task:'inspect'}),a(1,'keeper',{task:'travel',to:'dock'}),a(1,'receiver',{task:'repair'}),a(7,'keeper',{...report,via:'contact'}),a(8,'keeper',{task:'travel',to:'valve'}),a(14,'keeper',{task:'repair'}),a(20,'keeper',{task:'release'}),a(24,'receiver',{task:'attend',minutes:1})
  ]),
  script('S7-cancel','zero-minute radio cancellation and positive partial repair',[
    a(0,'keeper',{task:'inspect'}),a(1,'keeper',report),a(1,'keeper',{control:'interrupt'}),a(2,'keeper',{task:'repair'}),a(4,'keeper',{control:'interrupt'}),a(5,'keeper',{task:'repair'})
  ]),
  script('S8-fixed-cart-insurance','literal original easy fixed plan plus cart insurance',[
    a(0,'keeper',{task:'inspect'}),a(0,'receiver',{task:'inspect'}),a(1,'keeper',{task:'repair'}),a(1,'receiver',{task:'repair'}),a(7,'keeper',{task:'release'}),a(11,'receiver',{task:'attend',minutes:1}),a(12,'receiver',{task:'cart'})
  ]),
  ...['received','lost'].map((variant,index)=>script(`S${9+index}-withdrawal-${variant}`,'scripted prefix then real local-policy release or hold',[
    a(0,'keeper',{task:'inspect'}),a(0,'receiver',{task:'inspect'}),a(1,'keeper',{task:'propose',terms:term(10)}),a(1,'receiver',{task:'repair'}),a(2,'keeper',{task:'repair'}),a(2,'keeper',decide('accept')),
    a(4,'receiver',decide('accept')),a(4,'receiver',response('accept')),a(5,'receiver',decide('withdraw')),a(5,'receiver',response('withdraw')),
    a(8,'keeper',{control:'choose-policy',arm:'notebook'}),a(10,'keeper',{control:'choose-policy',arm:'notebook'})
  ],setup(6,2,27,'lossy',{...slots(['keeper','receiver'],2),...(variant==='lost'?{'receiver:6':'loss'}:{})})))
];
const reserved=[
  {...script('R1-arrival-launch-tie','paid arrival at early launch endpoint',[
    a(0,'keeper',{task:'inspect'}),a(0,'receiver',{task:'inspect'}),a(1,'keeper',{task:'repair'}),a(1,'receiver',{task:'repair'}),a(10,'keeper',{task:'release'}),a(14,'receiver',{task:'attend',minutes:1})
  ],setup(6,2,15)),partition:'reserved'},
  {...p('R2-upper-bound','bounded reliable source-frozen policy boundary',setup(6,14,27,'bounded',slots(['keeper','receiver'],6))),partition:'reserved'},
  {...script('R3-lost-confirm','confirmation missing but physical receipt independent',[...successfulPrefix,a(8,'keeper',{task:'transmit',message:{kind:'confirm',messageId:'receiver:m1'}}),...successfulEnd],setup(6,2,27,'lossy',{...slots(['keeper','receiver'],2),'keeper:9':'loss'})),partition:'reserved'},
  {...script('R4-interrupted-contribution','accepted attendance interrupted before arrival',[
    ...successfulPrefix,a(13,'keeper',{task:'release'}),a(16,'receiver',{task:'attend',minutes:2}),a(17,'receiver',{control:'interrupt'}),a(17,'receiver',decide('withdraw'))
  ]),partition:'reserved'}
];
export function selectCases(partition='development',freeze=null){
  if(!['development','reserved'].includes(partition))throw Error('Unknown comparison partition.');
  if(partition==='reserved'&&!isVerifiedFreeze(freeze))throw Error('Reserved cases are sealed until committed source freeze verification.');
  return structuredClone(partition==='development'?[...policyCases,...scripts]:reserved);
}
