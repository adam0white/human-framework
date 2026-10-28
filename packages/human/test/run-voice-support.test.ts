/** SCOPE: the host reports a received support effect; this does not estimate its efficacy. */
import { expect, test } from 'vitest';
import { crisisOwner } from '../src/affect/crisis.ts';
import { exportRun, replay, step } from '../src/index.ts';
import type { Input } from '../src/run-schema.ts';
import { willOwner } from '../src/will/will.ts';
import { actor, need, START, setup } from './support.ts';
import { frame } from './w1-fixture.ts';
import { person } from './w2-fixture.ts';

test('support evidence does not direct a person or change voice trust', () => {
  const run = setup();
  const control = setup();
  const input: Input = {
    id: 'support:1',
    at: START,
    source: { type: 'host', id: 'world' },
    kind: 'voice.evidence-received',
    payload: {
      person: 'ada',
      evidenceId: 'support:1',
      voiceId: 'player',
      evidence: {
        kind: 'support',
        id: 'support:1',
        occurredAt: START,
        action: 'listen',
        effect: 'acknowledged',
      },
    },
  };
  need(step(run, { until: START, inputs: [input] }));
  need(step(control, { until: START, inputs: [] }));
  const actual = actor(run);
  const baseline = actor(control);
  expect(actual.will.voices.find((v) => v.voiceId === 'player')?.trust).toBe(
    baseline.will.voices.find((v) => v.voiceId === 'player')?.trust,
  );
  expect(actual.activity).toEqual(baseline.activity);
  expect(actual.rng).toEqual(baseline.rng);
  expect(actual.trace).toEqual(baseline.trace);
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  expect(step(run, { until: START, inputs: [input] }).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(archive.hashes.full);

  // The host asserts the comfort was received; its size is a model convention.
  const p = person();
  const context = { ...p.frame, actor: p.actor, offers: [] };
  const acknowledged = willOwner.receive(
    p.actor.will,
    { kind: 'voice-evidence', data: input.payload },
    context,
  );
  expect(acknowledged.crisisReceipts).toEqual([]);
  const comfortData = {
    ...input.payload,
    evidence: { ...input.payload.evidence, effect: 'comfort' as const },
  };
  const comfort = willOwner.receive(p.actor.will, { kind: 'voice-evidence', data: comfortData }, context);
  expect(comfort.crisisReceipts).toEqual([{ kind: 'comfort', receiptId: 'support:1' }]);
  const initial = crisisOwner.initialize(frame());
  const active = { ...initial.state, active: { repertoireId: 'break', since: 0, until: 120 * 60000 } };
  const continuation = {
    ...initial.continuation,
    recovery: {
      behaviourId: 'break',
      sinceMs: 0,
      remainingWorkMinutesAtAnchor: 120,
      anchorMs: 0,
      sleepRate: 1 as const,
      lastComfortReceiptId: null,
    },
  };
  const receipt = comfort.crisisReceipts[0];
  if (!receipt) throw new Error('Missing comfort receipt');
  const eased = crisisOwner.receive(active, receipt, { ...frame(), continuation });
  expect(eased.state.active?.until).toBe(60 * 60000);
  // Receiving comfort cannot extend recovery when less than a minute remains.
  const nearEnd = crisisOwner.receive(
    { ...active, active: { repertoireId: 'break', since: 0, until: 30000 } },
    receipt,
    {
      ...frame(),
      continuation: {
        ...continuation,
        recovery: { ...continuation.recovery, remainingWorkMinutesAtAnchor: 0.5 },
      },
    },
  );
  expect(nearEnd.state.active?.until).toBe(15000);
});
