import * as human from '../../human/v0.1.1.js';
import * as pooled from './pooled-model.js';
export const MODELS=['human','pooled'];
export const adapters={
  human:{
    create:input=>human.createPerson({id:'worker',body:input.body,skills:input.skills}),
    begin:human.beginAttempt,advance:human.advanceAttempt,finish:human.finishAttempt,
    allowed:p=>p.pending.capacity.allowed,
    view:p=>({body:structuredClone(p.body),load:1.6*p.body.fatigue+.8*p.body.hunger,skills:{...p.skills}}),
    forecast:(p,skill,task)=>human.estimateSuccess({skill:p.skills[skill],body:p.body,...task}),
    baseline:p=>({...p,body:p.pending.bodyBefore,skills:{...p.skills,...(p.pending.action.skill?{[p.pending.action.skill]:p.pending.skillBefore}:{})}}),
    export:human.exportPerson,restore:human.restorePerson
  },
  pooled:{
    create:(input,protocol,tuning)=>pooled.createPooled(input,protocol.rival,tuning),
    begin:pooled.beginPooled,advance:pooled.advancePooled,finish:pooled.finishPooled,
    allowed:p=>p.pending.allowed,view:pooled.viewPooled,
    forecast:(p,skill,task)=>1/(1+Math.exp(-(1.25+4*(p.skills[skill]-task.difficulty)-2.4*(1-p.stamina)-2*task.hazard*task.exposure))),
    baseline:p=>({...p,stamina:p.pending.before,skills:{...p.skills,...(p.pending.action.skill?{[p.pending.action.skill]:p.pending.skillBefore}:{})}}),
    export:pooled.exportPooled,restore:pooled.restorePooled
  }
};
