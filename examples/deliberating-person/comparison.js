import {runDeliberatingPerson} from './sequence.js';

const policies=['bounded-search','greedy','direct'];
const result=run=>({now:run.now,commitmentUpdatedAt:run.commitment.updatedAt,firstAction:run.deliberations[0].plan.actionId,actions:run.attempts.map(entry=>entry.actionId),deliveryStatus:run.commitment.status,wages:run.world.wages});

export function runDeliberatingComparisons() {
  const started=performance.now();
  const definitions=[
    ['missing-preparation',{actualCache:'stocked'}],
    ['prepared-parity',{initialKit:1,evidence:'unknown'}],
    ['withdrawn-duty-parity',{duty:'withdrawn'}],
    ['deadline-pressure',{dutyDueAt:15}],
    ['resource-shortage',{actualCache:'empty',money:0}],
    ['evidence-conflict',{evidence:'conflict'}],
    ['evidence-correction',{evidence:'stale-after-correction'}],
  ];
  const cases=definitions.map(([name,config])=>({name,config,results:Object.fromEntries(policies.map(policy=>[policy,result(runDeliberatingPerson({...config,policy}))]))}));
  const candidate=runDeliberatingPerson();
  return {format:'deliberating-person-comparison',version:1,cases,
    execution:{durationMilliseconds:Math.round((performance.now()-started)*1000)/1000,stateBytes:Buffer.byteLength(JSON.stringify(candidate))},
    claims:{modelSuperiority:false,empiricalCalibration:false,causalScope:'authored deterministic evidence, purpose, deadline and resource interventions'}};
}
