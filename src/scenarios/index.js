// All values are authored microgame settings, not empirical measurements.
// Presets share the same validated action vocabulary and kernel. Longer workloads
// leave room for unsuccessful attempts, recovery and meals; they are not human calibration.
const upkeepActions=(observationLabel,helpLabel)=>[
  {id:'rest',label:'Rest',description:'Use this interval to reduce fatigue.',kind:'rest'},
  {id:'eat',label:'Eat a ration',description:'Attempt to use one ration from the shared supply.',kind:'eat'},
  {id:'observe',label:observationLabel,description:'Spend this interval inspecting conditions; the report can revise your estimate.',kind:'observe',skill:'survey'},
  {id:'help',label:helpLabel,description:'Prepare support for a partner’s next work attempt.',kind:'help',effort:0.08}
];

export const scenarios=[
  {
    id:'courier',title:'Courier Crossing',subtitle:'A parcel route, an uncertain crossing, a promise.',theme:'courier',
    brief:'Two couriers must complete a long delivery route before the gate closes. The shortcut carries greater exposure to uncertain conditions; the careful route yields less progress. Plan repeated rests and meals from six shared rations; inspection also costs time.',
    objective:'Complete the delivery route',resourceLabel:'delivery units',hazardLabel:'Crossing conditions',
    target:60,initialProgress:0,food:6,roundMinutes:20,horizon:36,consumption:0,
    hazard:0.65,initialSignal:0.15,signalConfidence:0.25,observationNoise:0.18,
    skills:['routecraft','survey'],transfer:[],
    actions:[
      {id:'work',label:'Take the shortcut',description:'Attempt a larger delivery contribution with greater exposure.',kind:'work',skill:'routecraft',difficulty:0.4,effort:0.18,output:3,exposure:1},
      {id:'careful-work',label:'Take the marked route',description:'Attempt a smaller contribution with lower effort and exposure.',kind:'work',skill:'routecraft',difficulty:0.3,effort:0.1,output:1.8,exposure:0.15},
      ...upkeepActions('Inspect the crossing','Prepare a partner’s pack')
    ],
    actors:[
      {id:'amina',name:'Amina',role:'Route lead',body:{fatigue:0.35,hunger:0.35},skills:{routecraft:0.6,survey:0.4},priorities:{duty:0.8,care:0.45,caution:0.65,mastery:0.35},commitment:{actionId:'work',weight:0.65,dueRound:4}},
      {id:'yusuf',name:'Yusuf',role:'Second courier',body:{fatigue:0.15,hunger:0.3},skills:{routecraft:0.45,survey:0.7},priorities:{duty:0.65,care:0.6,caution:0.8,mastery:0.45},commitment:{actionId:'careful-work',weight:0.55,dueRound:3}}
    ]
  },
  {
    id:'workshop',title:'Repair Bench',subtitle:'A tired craftsperson and one small repair order.',theme:'workshop',
    brief:'Two repairers need to finish a sustained repair order before closing. Precision work offers more output but demands greater skill and effort. They share six rations and can alternate work, recovery, meals and assistance.',
    objective:'Finish the repair order',resourceLabel:'repair units',hazardLabel:'Equipment conditions',
    target:60,initialProgress:0,food:6,roundMinutes:20,horizon:36,consumption:0,
    hazard:0.15,initialSignal:0.2,signalConfidence:0.75,observationNoise:0.1,
    skills:['craft','survey'],transfer:[],
    actions:[
      {id:'work',label:'Fit precision parts',description:'Attempt a larger repair with greater skill and effort demands.',kind:'work',skill:'craft',difficulty:0.65,effort:0.2,output:3,exposure:0.2},
      {id:'careful-work',label:'Repair simple fittings',description:'Attempt an easier repair with smaller output.',kind:'work',skill:'craft',difficulty:0.3,effort:0.1,output:1.6,exposure:0.05},
      ...upkeepActions('Inspect the equipment','Prepare the partner’s tools')
    ],
    actors:[
      {id:'leyla',name:'Leyla',role:'Craftsperson',body:{fatigue:0.7,hunger:0.25},skills:{craft:0.75,survey:0.55},priorities:{duty:0.8,care:0.55,caution:0.4,mastery:0.6},commitment:{actionId:'careful-work',weight:0.7,dueRound:3}},
      {id:'samir',name:'Samir',role:'Apprentice',body:{fatigue:0.25,hunger:0.65},skills:{craft:0.5,survey:0.7},priorities:{duty:0.65,care:0.75,caution:0.5,mastery:0.8},commitment:{actionId:'work',weight:0.55,dueRound:5}}
    ]
  },
  {
    id:'commons',title:'Water Commons',subtitle:'A shared supply that is used as it is replenished.',theme:'commons',
    brief:'Two neighbors replenish a shared water store over a long work period. The settlement uses half a unit each round. Faster collection is more exposed to uncertain conditions. Six shared rations and repeated rest support the sustained task.',
    objective:'Build the shared water reserve',resourceLabel:'water units',hazardLabel:'Collection conditions',
    target:45,initialProgress:0,food:6,roundMinutes:20,horizon:36,consumption:0.5,
    hazard:0.4,initialSignal:0.3,signalConfidence:0.45,observationNoise:0.2,
    skills:['collection','survey'],transfer:[],
    actions:[
      {id:'work',label:'Collect from the exposed source',description:'Attempt a larger water contribution with greater exposure.',kind:'work',skill:'collection',difficulty:0.45,effort:0.16,output:3,exposure:0.7},
      {id:'careful-work',label:'Use the sheltered source',description:'Attempt a smaller contribution with lower exposure.',kind:'work',skill:'collection',difficulty:0.28,effort:0.08,output:1.7,exposure:0.15},
      ...upkeepActions('Inspect collection conditions','Prepare a neighbor’s containers')
    ],
    actors:[
      {id:'meryem',name:'Meryem',role:'Reserve keeper',body:{fatigue:0.2,hunger:0.65},skills:{collection:0.55,survey:0.7},priorities:{duty:0.7,care:0.8,caution:0.7,mastery:0.4},commitment:{actionId:'help',weight:0.8,dueRound:4}},
      {id:'idris',name:'Idris',role:'Collector',body:{fatigue:0.5,hunger:0.25},skills:{collection:0.75,survey:0.45},priorities:{duty:0.8,care:0.6,caution:0.5,mastery:0.35},commitment:{actionId:'work',weight:0.7,dueRound:3}}
    ]
  },
  {
    id:'solo',title:'Solo Repair',subtitle:'One person, a small repair, no social effects.',theme:'workshop',
    brief:'Finish a sustained repair on your own before the work period ends. Alternate work with recovery and meals from three rations; the deadline leaves room for unsuccessful attempts. There are no partners, promises or assistance effects.',
    objective:'Finish your repair',resourceLabel:'repair units',hazardLabel:'Equipment conditions',
    target:30,initialProgress:0,food:3,roundMinutes:20,horizon:36,consumption:0,
    hazard:0.15,initialSignal:0.2,signalConfidence:0.75,observationNoise:0.1,
    skills:['craft','survey'],transfer:[],
    actions:[
      {id:'work',label:'Fit precision parts',description:'Attempt a larger repair with greater skill and effort demands.',kind:'work',skill:'craft',difficulty:0.65,effort:0.2,output:3,exposure:0.2},
      {id:'careful-work',label:'Repair simple fittings',description:'Attempt an easier repair with smaller output.',kind:'work',skill:'craft',difficulty:0.3,effort:0.1,output:1.6,exposure:0.05},
      {id:'rest',label:'Rest',description:'Use this interval to reduce fatigue.',kind:'rest'},
      {id:'eat',label:'Eat a ration',description:'Use your ration to reduce hunger.',kind:'eat'},
      {id:'observe',label:'Inspect the equipment',description:'Spend this interval inspecting conditions; the report can revise your estimate.',kind:'observe',skill:'survey'}
    ],
    actors:[
      {id:'leyla',name:'Leyla',role:'Independent repairer',body:{fatigue:0.7,hunger:0.25},skills:{craft:0.75,survey:0.55},priorities:{duty:0,care:0,caution:0.4,mastery:0.6}}
    ]
  }
];

export function getScenario(id) {
  const scenario=scenarios.find(s=>s.id===id);
  if(!scenario)throw new Error(`Unknown scenario: ${id}. Choose ${scenarios.map(s=>s.id).join(', ')}.`);
  return structuredClone(scenario);
}
