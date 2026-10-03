import {candidate} from '../src/candidate-pump.js';
import {direct} from '../src/direct-pump.js';
import {payMinute} from '../src/yard.js';
import {exportPerson} from 'paid-work-probe/human';

export const importCases = [
  {name: 'extra-terminal-exposure', invariant: 'generic-terminal', now: 40, completed: 21, hands: {mara: [21, 1]}},
  {name: 'zero-work-terminal-exposure', invariant: 'generic-terminal', now: 40, toolAt: 1, completed: 20, hands: {mara: [11, .5], tomas: [9, .5]}},
  {name: 'two-truncated-terminal-workers', invariant: 'generic-terminal', now: 40, toolAt: 1, completed: 20, hands: {mara: [10, .46], tomas: [10, .54]}},
  {name: 'no-tool-overcredit', invariant: 'paid-rate', now: 1, hands: {mara: [1, .06]}},
  {name: 'tool-arrival-does-not-speed-minute-zero', invariant: 'paid-rate', now: 1, toolAt: 1, hands: {mara: [1, 1 / 14]}},
  {name: 'completion-before-fourteen-post-tool-minutes-fit', invariant: 'item-time', now: 40, toolAt: 1, completed: 14, hands: {mara: [14, 1]}},
  {name: 'one-pump-cannot-pay-two-workers-in-one-minute', invariant: 'item-time', now: 1, hands: {mara: [1, 1 / 20], tomas: [1, 1 / 18]}},
  {name: 'one-pump-cannot-use-two-pre-tool-first-minutes', invariant: 'item-time', now: 4, toolAt: 1, hands: {mara: [1, 1 / 20], tomas: [1, 1 / 18]}},
  {name: 'one-actor-cannot-own-both-pre-tool-first-minutes', invariant: 'actor-time', now: 4, toolAt: 1, twoPumps: true, hands: {mara: [1, 1 / 20]}, northHands: {mara: [1, 1 / 20]}},
  {name: 'no-tool-completion-before-sequential-paid-minutes-fit', invariant: 'item-time', now: 40, completed: 19, hands: {mara: [20, 1]}}
];

// These intentionally false host snapshots contain internally real paid Human
// attempts for each person's ledger. Their proposed item allocation/time is the lie.
export function importFixture(arm, spec) {
  const host = arm === 'candidate' ? candidate : direct;
  const initial = host.create({twoPumps: spec.twoPumps ?? false});
  const snapshot = host.exportState(initial), state = snapshot.state;
  state.minute = spec.now;
  if (spec.toolAt) { state.tooling.blank = 'spent'; state.tooling.readyAt = spec.toolAt; }
  const assignedHands = {south: spec.hands, ...(spec.twoPumps ? {north: spec.northHands} : {})};
  for (const [key, hands] of Object.entries(assignedHands)) {
    const pump = state.pumps[key];
    const progress = Object.values(hands).reduce((sum, [, share]) => sum + share, 0);
    if (arm === 'candidate') {
      const work = pump.work.work;
      work.progress = progress; work.status = spec.completed ? 'settled' : 'open';
      work.workers = Object.fromEntries(Object.entries(hands).map(([id, [minutes, fraction]]) => [id, {basisMinutes: id === 'mara' ? 20 : 18, minutes, fraction, effort: .20 * fraction}]));
    } else {
      pump.work.coverage = progress; pump.work.discharged = Boolean(spec.completed);
      pump.work.crew = Object.fromEntries(Object.entries(hands).map(([id, [paidMinutes, covered]]) => [id, {firstMinutes: id === 'mara' ? 20 : 18, paidMinutes, covered}]));
    }
    pump.finishedAt = spec.completed ?? null;
    pump.gasket.place = spec.completed ? 'spent' : 'installed';
  }
  for (const id of ['mara', 'tomas', 'nuri']) {
    let person = initial.people[id];
    const charges = [];
    if (id === 'nuri' && spec.toolAt) charges.push({kind: 'crafting', effort: .02});
    if (id !== 'nuri') for (const hands of Object.values(assignedHands)) {
      const [minutes, coverage] = hands[id] ?? [0, 0];
      for (let minute = 0; minute < minutes; minute++) charges.push({kind: 'repair', effort: .20 * coverage / minutes});
    }
    if (charges.length > spec.now) throw new Error('Fixture exceeds person time');
    while (charges.length < spec.now) charges.push({kind: 'rest', effort: 0});
    for (const charge of charges) {
      person = payMinute(person, charge.kind, charge.effort);
      state.paid[id][charge.kind].minutes++; state.paid[id][charge.kind].effort += charge.effort;
    }
    state.people[id] = exportPerson(person);
  }
  return snapshot;
}
