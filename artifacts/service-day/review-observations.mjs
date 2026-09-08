import {runCarryover,runTrial} from '../../src/experiments/service-day/experiment.js';
import {writeFile} from 'node:fs/promises';
const carryover=runCarryover().branches.map(b=>{
 const cart=b.continuation.commands.find(e=>e.view.jobs.partner?.task==='cart');
 return {route:b.route,pumpAt24:{code:b.pumpChoice.code,available:b.pumpChoice.available,capacityEstimate:b.pumpChoice.capacityEstimate,response:b.matchedResponse.code},
  firstCart:cart?{observedAt:cart.at,job:cart.view.jobs.partner,keeperJob:cart.view.jobs.keeper,keeperParts:cart.view.resources.parts.keeper,pumpProgress:cart.view.work.pump}:null,
  outcome:b.continuation.final.outcome,delivery:b.continuation.final.delivery};
});
const fresh=runTrial({conditionId:'fresh',policy:'deadline-first'});
const transfers=fresh.commands.filter(e=>e.command?.type==='request'&&e.command.actor==='partner'&&e.command.task==='share').map(e=>({at:e.at,keeperJob:e.view.jobs.keeper,keeperParts:e.view.resources.parts.keeper,reservedKeeperParts:e.view.resources.reservedParts.keeper,gatePartCost:e.view.choices.keeper.find(c=>c.task==='gate').parts,response:e.response}));
const result={scope:'Post-review inspection of unchanged frozen policies on final host, not a new comparison or human evidence.',carryover,freshDeadlineFirstTransfers:transfers};
if (!process.argv[2]) throw new Error('Supply a fresh output path');
await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));
