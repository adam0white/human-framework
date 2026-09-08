import * as human from '../../human/v0.1.1.js';
import * as small from './small-model.js';

export const MODELS=['human','small'];
export const adapters={
  human:{
    create:(input,protocol)=>human.createPerson({id:'worker',body:input.body,skills:input.skills}),
    begin:human.beginAttempt,advance:human.advanceAttempt,finish:human.finishAttempt,
    allowed:p=>p.pending.capacity.allowed,
    view:p=>({body:structuredClone(p.body),load:1.6*p.body.fatigue+0.8*p.body.hunger,skills:{...p.skills}}),
    forecast:(p,skill,task)=>human.estimateSuccess({skill:p.skills[skill],body:p.body,...task}),
    export:human.exportPerson,restore:human.restorePerson
  },
  small:{
    create:(input,protocol,tuning)=>small.createSmall(input,protocol.rival,tuning),
    begin:small.beginSmall,advance:small.advanceSmall,finish:small.finishSmall,
    allowed:p=>p.pending.allowed,view:small.viewSmall,
    forecast:(p,skill,task)=>{const v=small.viewSmall(p);return 1/(1+Math.exp(-(1.25+4*(v.skills[skill]-task.difficulty)-v.load-2*task.hazard*task.exposure)));},
    export:small.exportSmall,restore:small.restoreSmall
  }
};
