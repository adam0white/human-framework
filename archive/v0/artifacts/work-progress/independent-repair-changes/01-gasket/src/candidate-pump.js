import {createWork, prepareWorker, quoteWork, advanceWork, settleWork, exportWork, restoreWork} from 'paid-work-probe';
import {createYard} from './yard.js';

// Translation of the fixed pump domain to the supplied item API.
export const candidatePump = {
  create: () => createWork({id: 'south-pump', effort: .20, minimumDuration: 6}),
  enlist: (work, worker, basis) => prepareWorker(work, {workerId: worker, basisMinutes: basis}),
  plan: (work, worker, tool) => {
    const q = quoteWork(work, {workerId: worker, durationReduction: tool ? 6 : 0});
    return {fraction: q.fraction, effort: q.effort, minutesLeft: q.remainingMinutes, effortLeft: q.remainingEffort};
  },
  pay: (work, worker, tool) => advanceWork(work, {workerId: worker, durationReduction: tool ? 6 : 0}).work,
  release: work => { const result = settleWork(work); return {work: result.work, first: result.completion !== null}; },
  pack: exportWork,
  unpack: restoreWork,
  inspect: work => ({id: work.id, coefficient: work.effort, floor: work.minimumDuration,
    coverage: work.progress, released: work.status === 'settled', complete: work.status !== 'open',
    hands: Object.fromEntries(Object.entries(work.workers).map(([id, entry]) => [id, {
      basis: entry.basisMinutes, minutes: entry.minutes, coverage: entry.fraction, effort: entry.effort
    }]))})
};
export const candidate = createYard(candidatePump);
