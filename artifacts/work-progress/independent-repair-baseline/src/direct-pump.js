import {createYard} from './yard.js';
import {clone, fields, insist, integer, near, number} from './shape.js';

// Only this pump's coverage and its two possible repairers; no general work API.
export const directPump = {
  create: () => ({coverage: 0, discharged: false, crew: {}}),
  enlist(pump, id, basis) {
    insist(['mara', 'tomas'].includes(id), 'Not a pump repairer');
    integer(basis, 6, 1440); insist(pump.coverage < 1 - 1e-12, 'Pump complete');
    const next = clone(pump);
    next.crew[id] ??= {firstMinutes: basis, paidMinutes: 0, covered: 0};
    return next;
  },
  plan(pump, id, tool) {
    insist(pump.coverage < 1 - 1e-12 && Object.hasOwn(pump.crew, id), 'No open assigned repair');
    const duration = Math.max(6, pump.crew[id].firstMinutes - (tool ? 6 : 0));
    const remaining = 1 - pump.coverage;
    const fraction = Math.min(remaining, 1 / duration);
    return {fraction, effort: .20 * fraction, minutesLeft: Math.max(1, Math.ceil(remaining * duration - 1e-12)), effortLeft: .20 * remaining};
  },
  pay(pump, id, tool) {
    const minute = this.plan(pump, id, tool), next = clone(pump);
    next.coverage += minute.fraction;
    next.crew[id].paidMinutes++;
    next.crew[id].covered += minute.fraction;
    if (next.coverage >= 1 - 1e-12) next.coverage = 1;
    return next;
  },
  release(pump) {
    insist(pump.coverage === 1, 'Pump unfinished');
    const next = clone(pump); next.discharged = true;
    return {work: next, first: !pump.discharged};
  },
  pack: clone,
  unpack(record) {
    fields(record, ['coverage', 'discharged', 'crew']); number(record.coverage, 0, 1);
    insist(typeof record.discharged === 'boolean' && (!record.discharged || record.coverage === 1), 'Invalid discharge');
    insist(record.coverage < 1 - 1e-12 || record.coverage === 1, 'Unsettled rounding gap');
    insist(record.crew && Object.keys(record.crew).every(id => ['mara', 'tomas'].includes(id)), 'Unknown repairer');
    let coverage = 0, minutes = 0;
    for (const hand of Object.values(record.crew)) {
      fields(hand, ['firstMinutes', 'paidMinutes', 'covered']); integer(hand.firstMinutes, 6, 1440);
      integer(hand.paidMinutes, 0, 1440); number(hand.covered, 0, 1);
      insist(hand.covered <= hand.paidMinutes / 6 + 1e-12 && hand.covered >= (record.coverage === 1 ? Math.max(0, hand.paidMinutes - 1) : hand.paidMinutes) / hand.firstMinutes - 1e-12, 'Unpaid direct coverage');
      insist(hand.paidMinutes === 0 ? hand.covered === 0 : hand.covered > 0, 'Unpaid direct minutes');
      coverage += hand.covered; minutes += hand.paidMinutes;
    }
    insist(minutes <= 1440 && near(coverage, record.coverage), 'Direct coverage mismatch');
    return clone(record);
  },
  inspect: pump => ({id: 'south-pump', coefficient: .20, floor: 6, coverage: pump.coverage,
    released: pump.discharged, complete: pump.coverage === 1,
    hands: Object.fromEntries(Object.entries(pump.crew).map(([id, hand]) => [id, {
      basis: hand.firstMinutes, minutes: hand.paidMinutes, coverage: hand.covered, effort: .20 * hand.covered
    }]))})
};
export const direct = createYard(directPump);
