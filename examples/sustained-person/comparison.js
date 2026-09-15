import {runSustainedPerson} from './sequence.js';

const projection=run=>({
  completedWork:run.world.completedWork,
  deliveries:run.world.deliveries,
  recoveryServices:run.world.recoveryServices,
  householdStatus:run.commitments.household.status,
  delayedAccessibility:run.metrics.delayedAccessibility,
  lateAction:run.decisions.find(entry=>entry.id==='late-retrieval')?.actionId??null,
  shortageAction:run.decisions.find(entry=>entry.id==='shortage-response')?.actionId??null,
  shortageCapacityAllowed:run.decisions.find(entry=>entry.id==='shortage-response')?.capacityAllowed??null,
});

const differences=(reference,variation)=>Object.keys(reference).filter(key=>reference[key]!==variation[key]).map(key=>({metric:key,reference:reference[key],variation:variation[key]}));

export function runSustainedComparisons() {
  const started=performance.now();
  const candidate=runSustainedPerson(),reference=projection(candidate);
  const definitions=[
    ['equal-time-learning',{learning:'equal-time-control'},{equalElapsedMinutes:true}],
    ['short-sleep',{condition:'short-sleep'},{sameWorldTimeline:true}],
    ['withdrawn-duty',{service:'withdrawn'},{canonicalWithdrawal:true}],
    ['communicated-shortage',{shortage:true},{hiddenUntilCommunication:true}],
    ['direct-rule-rival',{policy:'direct'},{simplerAccessRule:true}],
    ['instant-sleep-recovery',{condition:'instant-sleep-recovery'},{simplerRecoveryRule:true}],
  ];
  const cases=definitions.map(([name,config,controls])=>{
    const run=runSustainedPerson(config),result=projection(run);
    const parity=Object.keys(reference).map(metric=>({metric,matches:reference[metric]===result[metric]}));
    return {name,config,controls,result,differences:differences(reference,result),parity};
  });
  return {
    format:'sustained-person-comparison',version:1,horizonMinutes:14*1440,
    reference, cases,
    execution:{durationMilliseconds:Math.round((performance.now()-started)*1000)/1000,stateBytes:Buffer.byteLength(JSON.stringify(candidate))},
    claims:{modelSuperiority:false,empiricalCalibration:false,causalScope:'authored deterministic interventions and recorded projections'},
  };
}
