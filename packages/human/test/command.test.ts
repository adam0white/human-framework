import { expect, test } from 'vitest';
import { willOwner } from '../src/will/will.ts';
import { offer, person, span } from './w2-fixture.ts';

test('command time charges only obeyed elapsed work, separately from ordinary assent', () => {
  const p = person(),
    c = { ...p.frame, actor: p.actor, offers: [offer('work')] };
  const commanded = willOwner.receive(
    p.actor.will,
    {
      kind: 'coercion',
      data: { person: 'person', voiceId: 'voice', orderId: 'order', offerId: 'work', repeat: false },
    },
    c,
  ).state;
  const obeyed = willOwner.receive(
    commanded,
    {
      kind: 'command-decision',
      decision: { voiceId: 'voice', holds: true, margin: 0.5, ends: false, reason: 'held' },
      evidenceId: 'decision',
    },
    c,
  ).state;
  expect(obeyed.command?.obeyed).toBe(true);
  const continuation = { anchor: { at: 0, conditionId: 'command' }, state: obeyed };
  const advanced = willOwner.advance(obeyed, {
    ...span(0, 3600000, p.frame.effective),
    continuation,
    activity: null,
  });
  expect(advanced.needReceipts).toEqual([]);
  expect(advanced.crisisReceipts).toEqual([]);
  const forcing = willOwner.commandForcing(obeyed, p.frame);
  expect(forcing.needsPerMinute.autonomy).toBeLessThan(0);
  expect(forcing.crisisStrainPerMinute).toBeGreaterThan(0);
  expect(advanced.state.voices[0]?.trust).toBeLessThan(obeyed.voices[0]?.trust ?? 0);
  expect(advanced.state.command?.chargedAt).toBe(3600000);
  const released = willOwner.receive(
    advanced.state,
    { kind: 'coercion-withdrawn', data: { person: 'person', orderId: 'order', reason: 'withdrawn' } },
    { ...c, at: 3600000 },
  ).state;
  expect(released.command).toBeUndefined();
  expect(released.lastCommand?.reason).toBe('withdrawn');
});

test('hard command refusal ends control while a temporary missing target suspends it', () => {
  const p = person(),
    ctx = { ...p.frame, actor: p.actor, offers: [] };
  const commanded = willOwner.receive(
    p.actor.will,
    {
      kind: 'coercion',
      data: { person: 'person', voiceId: 'voice', orderId: 'order', offerId: 'work', repeat: false },
    },
    ctx,
  ).state;
  const apply = (ends: boolean) =>
    willOwner.receive(
      commanded,
      {
        kind: 'command-decision',
        decision: { voiceId: 'voice', holds: false, margin: 0, ends, reason: ends ? 'break' : 'absent' },
        evidenceId: 'decision',
      },
      ctx,
    ).state;
  expect(apply(false).command).toBeDefined();
  expect(apply(true).command).toBeUndefined();
  expect(apply(true).lastCommand?.reason).toBe('break');
});

test('pressure and commanded trust use one anchored continuous law across materializations', () => {
  const p = person();
  p.actor.will.voices = [
    { voiceId: 'voice', trust: 0.8, pressure: 0.4, accepted: 0, refused: 0, history: [] },
  ];
  const base = structuredClone(p.actor.will);
  const plain = willOwner.advance(base, {
    ...span(0, 14400000, p.frame.effective),
    activity: null,
    continuation: { anchor: { at: 0, conditionId: 'plain' }, state: base },
  });
  expect(plain.state.voices[0]?.pressure).toBeCloseTo(0.2, 12);
  base.command = {
    voiceId: 'voice',
    since: 0,
    startedAt: 0,
    chargedAt: 0,
    margin: 0.5,
    obeyed: true,
    remembered: true,
    affordanceId: 'work',
  };
  const continuation = { anchor: { at: 0, conditionId: 'command' }, state: base };
  const run = (from: number, to: number) =>
    willOwner.advance(base, { ...span(from, to, p.frame.effective), activity: null, continuation });
  const whole = run(0, 3600000);
  run(0, 1000);
  run(1000, 100000);
  expect(run(100000, 3600000)).toEqual(whole);
  const k = Math.LN2 / 4;
  expect(whole.state.voices[0]?.pressure).toBeCloseTo(
    0.4 * Math.exp(-k) + (0.1 / k) * (1 - Math.exp(-k)),
    12,
  );
  expect(whole.state.voices[0]?.trust).toBeCloseTo(0.8 * Math.exp(-0.02 * 0.5), 12);
  expect(whole.needReceipts).toEqual([]);
});
