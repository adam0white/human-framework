export const fixture = {
  id: 'fixture', title: 'Test workshop', subtitle: 'A bounded fixture',
  brief: 'Repair the shelter.', objective: 'Repair', resourceLabel: 'repairs',
  target: 10, goalUtility: 10, initialProgress: 0, food: 1, roundMinutes: 10, horizon: 8,
  hazard: 0.8, initialSignal: 0.2, signalConfidence: 0.3, observationNoise: 0,
  consumption: 0, skills: ['craft','survey'], transfer: [],
  actions: [
    {id:'work',label:'Repair',description:'Work carefully',kind:'work',skill:'craft',difficulty:0.45,effort:0.2,output:2,exposure:0.5},
    {id:'rest',label:'Rest',description:'Recover',kind:'rest'},
    {id:'eat',label:'Eat',description:'Use one shared ration',kind:'eat'},
    {id:'observe',label:'Inspect',description:'Investigate conditions',kind:'observe',skill:'survey'},
    {id:'help',label:'Assist',description:'Support a partner',kind:'help',effort:0.08}
  ],
  actors:[
    {id:'a',name:'Ada',role:'Repairer',body:{fatigue:0.6,hunger:0.5},skills:{craft:0.6,survey:0.4},priorities:{duty:0.7,care:0.4,caution:0.5,mastery:0.3},commitment:{actionId:'work',weight:0.8,dueRound:4}},
    {id:'b',name:'Bora',role:'Partner',body:{fatigue:0.1,hunger:0.2},skills:{craft:0.5,survey:0.7},priorities:{duty:0.5,care:0.7,caution:0.6,mastery:0.4},commitment:{actionId:'work',weight:0.6,dueRound:5}}
  ]
};
