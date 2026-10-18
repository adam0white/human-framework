/**
 * Full-person continuation digests measured against installed npm 2.2.1 on 2026-10-17.
 * Only the explicit engine stamp is removed. Three seeds, with and without retained
 * methods, exercise ordinary decisions, testimony, advice, actual outcomes and restore.
 */
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import * as hf from '../src/index.ts';

function continuation(seed: number, methods: boolean) {
  const p = hf.createPerson({
    id: 'p',
    name: 'P',
    seed,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    goals: [
      {
        id: 'g',
        label: 'Work',
        serves: ['achievement'],
        advancedBy: [{ action: 'work', amount: 0.1 }],
        importance: 0.8,
        deadline: 720,
      },
    ],
  });
  if (methods) {
    hf.receiveMethodCues(p, { contextId: 'object', cues: [{ cue: 'state', value: 'ready' }] });
    hf.demonstrateMethod(p, {
      id: 'method',
      demonstrationId: 'demo',
      contextId: 'object',
      conditions: [{ cue: 'state', value: 'ready' }],
      action: 'work',
      sourceId: 'source',
      outcome: 'success',
    });
  }
  const offers: hf.Affordance[] = [
    {
      id: 'work',
      action: 'work',
      label: 'Work',
      methodContext: 'object',
      duration: 15,
      effort: 0.5,
      focus: 0.2,
      material: 1,
      advertises: {},
    },
    { id: 'rest', action: 'rest', label: 'Rest', duration: 30, effort: 0, advertises: { rest: 0.2 } },
  ];
  for (let i = 0; i < 12; i++) {
    hf.perceive(p, [
      {
        at: p.now,
        channel: 'told',
        kind: 'fact',
        actorId: 'source',
        targetId: 'p',
        salience: 0.8,
        claims: [{ prop: 'ready', value: true, confidence: 0.8 }],
        advice: [{ action: 'work', strength: 0.2 }],
        summary: 'Ready',
      },
    ]);
    const record = hf.decide(p, offers);
    const aff = offers.find((a) => a.id === record.chosenAffordanceId);
    if (aff) {
      hf.begin(p, aff, record);
      hf.finish(p, {
        affordanceId: aff.id,
        action: aff.action,
        status: i % 4 === 0 ? 'interrupted' : 'completed',
        at: p.now + aff.duration,
        ...(aff.material !== undefined ? { material: aff.material } : {}),
      });
    } else hf.tick(p, p.now + 30);
  }
  const { engine: _engine, ...state } = hf.snapshot(hf.restore(hf.snapshot(p)));
  return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

test.each([
  [1, false, '9f17dfd15d00d8366541666f257afacce22cf38090cb24afd54b3e08f27c5f3f'],
  [1, true, '10ba030d8ad9959b5409f1a6230dcaab6bdd40e4578d66efe24cb5b234d6fab5'],
  [19, false, '6528e615db058e59a3806b3db3cfcd7a6a03a480974c73f5daa34e887071b7a8'],
  [19, true, '2a4934f44e5084881352c8a34050eec0e28d6df9080c8da49aa062343409c74f'],
  [827, false, 'cb388f0b2dbcb5ad33173d69cef9d72fdf9c236fbb63c6ab3667b9b941e4b81f'],
  [827, true, '186f55fbbd8b2bbb94ce44e14d84c63f6d076f318afae92852786739fe185cd1'],
] as const)('npm 2.2.1 continuation seed %i with methods=%s is exact', (seed, methods, digest) => {
  expect(continuation(seed, methods)).toBe(digest);
});
