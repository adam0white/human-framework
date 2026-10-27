import { expect, test } from 'vitest';
import { agendaOwner, commitmentPressure, pressureReachedAt } from '../src/agenda/agenda.ts';
import { activity, agendaContext, commitment, offer, outcome, person } from './w2-fixture.ts';

test('one completion keeps all named eligible duties, and one name still competes with the earliest window', () => {
  const p = person(),
    c = agendaContext(p);
  p.actor.agenda.commitments = [
    commitment('early', { until: 120000 }),
    commitment('late', { until: 300000 }),
  ];
  const act = activity(offer('work', { fulfills: ['early', 'late'] }));
  const both = agendaOwner.receive(p.actor.agenda, outcome(act), c).state;
  expect(both.commitments.map((x) => x.status)).toEqual(['kept', 'kept']);
  const one = agendaOwner.receive(p.actor.agenda, outcome(act, { fulfills: ['late'] }), c).state;
  expect(one.commitments.find((x) => x.id === 'early')?.status).toBe('kept');
  expect(one.commitments.find((x) => x.id === 'late')?.status).toBe('pending');
});
test('pressure inverse identifies the first safe millisecond of the closing ramp', () => {
  const c = commitment('duty');
  const at = pressureReachedAt(c, 0.8);
  if (at === undefined) throw new Error('Missing crossing');
  expect(commitmentPressure(c, at)).toBeGreaterThanOrEqual(0.8);
  expect(commitmentPressure(c, at - 1)).toBeLessThan(0.8);
});
