/** Run against the pre-persistence source and this source, without enabling persistence. */
import { createHash } from 'node:crypto';
import type * as HF from '../src/index.ts';

export function persistenceContinuation(hf: typeof HF): string {
  const p = hf.createPerson({
    id: 'p',
    name: 'P',
    seed: 19,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    enable: { curiosity: true, planning: { depth: 3 } },
    goals: [
      {
        id: 'task',
        label: 'Task',
        serves: ['achievement'],
        importance: 0.8,
        advancedBy: [{ action: 'put', amount: 0.1 }],
        temporal: { halfLifeMinutes: 120 },
      },
    ],
  });
  hf.seedConsequences(p, 'host', [
    {
      id: 'route',
      revision: 0,
      trigger: { action: 'prepare' },
      successor: { action: 'put', duration: 1, effort: 0.1 },
      availableFrom: 600,
      availableUntil: 1000,
      expiresAt: 1100,
      confidence: 1,
      chance: 1,
    },
  ]);
  const offers = ['prepare', 'put', 'rest'].map((action) => ({
    id: action,
    action,
    label: action,
    duration: 1,
    effort: 0.05,
    advertises: {},
  }));
  const states = [];
  for (let i = 0; i < 30; i++) {
    hf.perceive(p, [
      {
        at: p.now,
        channel: 'saw',
        kind: 'weather',
        salience: 1,
        summary: 'Weather',
        valence: i % 2 ? 0.1 : -0.1,
      },
    ]);
    const d = hf.decide(p, offers);
    const a = offers.find((x) => x.id === d.chosenAffordanceId);
    if (!a) throw new Error('No chosen offer');
    hf.begin(p, a, d);
    hf.finish(p, { affordanceId: a.id, action: a.action, at: p.now + 1, status: 'completed' });
    hf.tick(p, p.now + 1);
    const s = hf.snapshot(hf.restore(JSON.parse(JSON.stringify(hf.snapshot(p)))));
    delete (s as { engine?: string }).engine;
    states.push(s);
  }
  return createHash('sha256').update(JSON.stringify(states)).digest('hex');
}
