import { expect, test } from 'vitest';
import { agendaOwner } from '../src/agenda/agenda.ts';
import { agendaContext, commitment, held, person, span } from './w2-fixture.ts';

test('an unkept held worship window creates debt; released make-up reopens the original debt', () => {
  const p = person();
  p.actor.conscience.norms = [held('fixture-worship')];
  p.actor.agenda.commitments = [
    commitment('duty', { kind: 'worship', normId: 'fixture-worship', until: 60000 }),
  ];
  const missed = agendaOwner.advance(p.actor.agenda, {
    ...span(0, 60001, p.frame.effective),
    body: p.actor.body,
    activity: null,
    norms: p.actor.conscience.norms,
    catalog: [],
  }).state;
  expect(missed.commitments[0]?.status).toBe('broken');
  expect(missed.owed[0]?.ofId).toBe('duty');
  const scheduled = agendaOwner.receive(
    missed,
    { type: 'make-up', commitmentId: 'duty', window: { start: 120000, end: 180000 } },
    agendaContext(p),
  ).state;
  expect(scheduled.owed[0]?.scheduledAs).toBeDefined();
  const reopened = agendaOwner.advance(scheduled, {
    ...span(60001, 180001, p.frame.effective),
    body: p.actor.body,
    activity: null,
    norms: p.actor.conscience.norms,
    catalog: [],
  }).state;
  expect(reopened.owed[0]?.scheduledAs).toBeUndefined();
  expect(reopened.owed).toHaveLength(1);
});
test('unknown exemption evidence neither grants travel nor erases an obligation', () => {
  const p = person();
  p.actor.agenda.commitments = [
    commitment('fast', {
      kind: 'abstain',
      normId: 'fixture-fast',
      violatedBy: ['eat'],
      exemptWhen: ['travel'],
    }),
  ];
  const state = agendaOwner.receive(
    p.actor.agenda,
    { kind: 'exemption', traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
    agendaContext(p),
  ).state;
  expect(state.exemptions.traveling.kind).toBe('unobserved');
  expect(state.commitments[0]?.exempt).toBeUndefined();
});

test('paid debt retirement emits detached evidence and preserves unpaid debt', () => {
  const p = person();
  p.actor.agenda.commitments = [
    commitment('paid', { makeUpOf: 'original', status: 'kept', from: -60000, until: 0 }),
    commitment('pending', { makeUpOf: 'other' }),
  ];
  p.actor.agenda.owed = [
    { ofId: 'original', kind: 'duty', actions: ['work'], reason: 'missed', at: 0, scheduledAs: 'paid' },
    { ofId: 'other', kind: 'duty', actions: ['work'], reason: 'missed', at: 0, scheduledAs: 'pending' },
  ];
  const result = agendaOwner.receive(p.actor.agenda, { type: 'retire-paid-make-ups' }, agendaContext(p));
  expect(result.state.owed.map((o) => o.ofId)).toEqual(['other']);
  const event = result.events.find((e) => e.kind === 'make-ups-retired');
  expect(event?.kind).toBe('make-ups-retired');
  if (event?.kind !== 'make-ups-retired') throw new Error('Missing retirement receipt');
  expect(event.receipts[0]?.owed.ofId).toBe('original');
  expect(event.receipts[0]?.commitment.status).toBe('kept');
  expect(p.actor.agenda.owed).toHaveLength(2);
});
