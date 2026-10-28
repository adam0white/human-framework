/** SCOPE G8: actual host-world outcomes reuse will learning; no trust targets or synthetic assent. */
import { expect, test } from 'vitest';
import { exportRun, inspect, replay, restoreRun, step } from '../src/index.ts';
import type { Input, VoiceEvidence } from '../src/run-schema.ts';
import {
  actor,
  exampleOffers,
  freshHost,
  MINUTE,
  need,
  openingInputs,
  START,
  serve,
  setup,
} from './support.ts';

function evidence(id: string, at: number, data: VoiceEvidence): Input<'voice.evidence-received'> {
  return {
    id,
    at,
    kind: 'voice.evidence-received',
    source: { type: 'host', id: 'world' },
    payload: { person: 'ada', voiceId: 'player', evidenceId: id, evidence: data },
  };
}

test('actual acts and answered requests retain identity, outcome and diminishing positive credit', () => {
  const run = setup();
  const t = START;
  const inputs = [
    evidence('act:1', t, { kind: 'act', id: 'act:1', occurredAt: t - 1, action: 'work', felt: 1 }),
    evidence('request:1', t + 1, {
      kind: 'request',
      id: 'request:1',
      occurredAt: t,
      action: 'work',
      granted: true,
      felt: 1,
    }),
    evidence('request:2', t + 2, {
      kind: 'request',
      id: 'request:2',
      occurredAt: t + 2,
      action: 'work',
      granted: true,
      felt: 1,
    }),
    evidence('request:3', t + 3, {
      kind: 'request',
      id: 'request:3',
      occurredAt: t + 3,
      action: 'work',
      granted: false,
      felt: -1,
    }),
  ];
  need(step(run, { until: t + 3, inputs }));
  const archive = exportRun(run);
  const events = need(
    inspect(run, {
      perspective: { kind: 'person', observer: 'ada' },
      people: ['ada'],
      select: ['events', 'relationships'],
    }),
  ).events.flatMap((e) => (e.data.kind === 'voice-evidence' ? [e.data] : []));
  expect(events).toHaveLength(4);
  expect(events[0]?.evidence.occurredAt).toBe(t - 1);
  expect(events[1]?.evidence).toMatchObject({ id: 'request:1', granted: true });
  expect(events[3]?.evidence).toMatchObject({ id: 'request:3', granted: false });
  const first = events[1],
    repeat = events[2],
    refused = events[3];
  if (!first || !repeat || !refused) throw new Error('missing actual outcomes');
  expect(first.after).toBeGreaterThan(first.before);
  expect(repeat.after - repeat.before).toBeLessThan(first.after - first.before);
  expect(refused.after).toBeLessThan(refused.before);
  const voice = actor(run).will.voices.find((v) => v.voiceId === 'player');
  expect(voice?.accepted).toBe(0);
  expect(voice?.refused).toBe(0);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  const restored = need(restoreRun(archive));
  const original = inputs[0];
  if (!original) throw new Error('missing original evidence');
  const duplicate = { ...original, at: t + 4 };
  expect(step(restored, { until: t + 4, inputs: [duplicate] })).toMatchObject({
    ok: false,
    error: { code: 'duplicate-id' },
  });
  expect(step(restored, { until: t + 4, inputs: [{ ...duplicate, id: 'fresh-delivery' }] }).ok).toBe(false);
  expect(exportRun(restored).hashes.full).toBe(archive.hashes.full);
});

// One headless control: ordinary work still starts, settles, and replays with no voice evidence.
test('ordinary host work settles without voice evidence and retains exact replay', () => {
  const run = setup();
  const offers = exampleOffers('ada', ['work']);
  serve(
    run,
    freshHost(),
    new Map([['ada', offers]]),
    START + 45 * MINUTE,
    openingInputs([{ id: 'ada', offers }]),
  );
  const archive = exportRun(run);
  expect(archive.current.events.some((e) => e.data.kind === 'action-settled')).toBe(true);
  expect(archive.current.events.some((e) => e.data.kind === 'voice-evidence')).toBe(false);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});
