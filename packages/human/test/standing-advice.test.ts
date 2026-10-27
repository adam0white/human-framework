import { expect, test } from 'vitest';
import { adviceWeight, willOwner } from '../src/will/will.ts';
import { activity, offer, percept, person } from './w2-fixture.ts';

test('attended told advice persists with source attribution, decays and discharges at accepted action start', () => {
  const p = person(),
    c = { ...p.frame, actor: p.actor, offers: [] };
  const pc = percept('advice', {
    channel: 'told',
    actorId: 'teacher',
    advice: [{ adviceId: 'advice:work', action: 'work', strength: 0.8 }],
  });
  const state = willOwner.receive(
    p.actor.will,
    { kind: 'advice', percept: pc, evidenceId: 'heard' },
    c,
  ).state;
  expect(state.advice[0]?.sourceId).toBe('teacher');
  const entry = state.advice[0];
  if (!entry) throw new Error('Missing advice');
  expect(adviceWeight(entry, 0)).toBeGreaterThan(adviceWeight(entry, 86400000));
  const acted = willOwner.receive(
    state,
    { kind: 'action-started', activity: activity(offer('work')), evidenceId: 'started' },
    c,
  ).state;
  expect(acted.advice).toEqual([]);
  expect(p.actor.will.advice).toEqual([]);
});

test('advice withdrawal addresses its stable identity rather than guessing from the action', () => {
  const p = person(),
    ctx = { ...p.frame, actor: p.actor, offers: [] };
  const received = willOwner.receive(
    p.actor.will,
    {
      kind: 'advice',
      percept: percept('evidence', {
        channel: 'told',
        actorId: 'teacher',
        advice: [{ adviceId: 'advice:123', action: 'work', strength: 0.8 }],
      }),
      evidenceId: 'evidence',
    },
    ctx,
  ).state;
  expect(received.advice[0]?.adviceId).toBe('advice:123');
  const refreshed = willOwner.receive(
    received,
    {
      kind: 'advice',
      percept: percept('refresh', {
        channel: 'told',
        actorId: 'teacher',
        advice: [{ adviceId: 'advice:456', action: 'work', strength: 0.8 }],
      }),
      evidenceId: 'refresh',
    },
    ctx,
  ).state;
  const staleWithdrawal = willOwner.receive(
    refreshed,
    { kind: 'advice-withdrawn', data: { person: 'person', voiceId: 'teacher', adviceId: 'advice:123' } },
    ctx,
  ).state;
  expect(staleWithdrawal.advice[0]?.adviceId).toBe('advice:456');
  const withdrawn = willOwner.receive(
    staleWithdrawal,
    { kind: 'advice-withdrawn', data: { person: 'person', voiceId: 'teacher', adviceId: 'advice:456' } },
    ctx,
  ).state;
  expect(withdrawn.advice).toEqual([]);
});
