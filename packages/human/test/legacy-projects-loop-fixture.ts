/** Generate with the published 2.14.0 package, never with candidate source.
 * The save is taken after one take/replace round on a three-piece pile. The host continues
 * the same reversible work for 90 minutes. Only snapshot engine metadata is normalized.
 */
import { createHash } from 'node:crypto';
import type * as HF from '../src/index.ts';
import type { Affordance, Person } from '../src/index.ts';

const offer = (action: string): Affordance => ({
  id: action,
  action,
  label: action,
  duration: 1,
  effort: 0.01,
  advertises: {},
});
function maintain(hf: typeof HF, p: Person) {
  p.body.satiety = p.body.hydration = 1;
  p.body.sleepPressure = p.body.sleepDebt = p.body.exertion = p.body.pain = 0;
  for (const id of hf.PSYCHOLOGICAL_NEEDS) p.needs[id] = 1;
}
function see(hf: typeof HF, p: Person, pieces: number) {
  hf.perceive(p, [
    {
      at: p.now,
      channel: 'saw',
      kind: 'fact',
      salience: 1,
      summary: 'An unfinished pile',
      prospect: { id: 'pile', label: 'Arrange a pile', kind: 'arrange', progress: pieces / 10 },
    },
  ]);
}
function step(hf: typeof HF, p: Person, carrying: boolean) {
  maintain(hf, p);
  hf.seedConsequences(p, 'known-work', [
    {
      id: 'take-replace',
      revision: p.now,
      trigger: { action: 'take' },
      successor: { action: 'replace', duration: 1, effort: 0.01, advances: ['pile'] },
      availableFrom: p.now,
      availableUntil: p.now + 3,
      expiresAt: p.now + 3,
      chance: 1,
      confidence: 1,
    },
  ]);
  const work = carrying ? { ...offer('replace'), advances: ['pile'] } : offer('take');
  const offers = [work, offer('quiet')];
  const decision = hf.decide(p, offers);
  const chosen = offers.find((a) => a.id === decision.chosenAffordanceId);
  if (!chosen) throw new Error('Missing legacy continuation offer');
  hf.begin(p, chosen, decision);
  hf.tick(p, p.now + 1);
  hf.finish(p, { affordanceId: chosen.id, action: chosen.action, status: 'completed', at: p.now });
  const nextCarrying = chosen.action === 'take' || (carrying && chosen.action !== 'replace');
  if (chosen.action !== 'quiet') see(hf, p, nextCarrying ? 2 : 3);
  return { carrying: nextCarrying, decision };
}
export function buildLegacyProjectLoopSave(hf: typeof HF) {
  const p = hf.createPerson({
    id: 'maker',
    name: 'Maker',
    seed: 19,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    traits: { openness: 1, conscientiousness: 1 },
    norms: [],
    enable: { projects: true, persistence: true, planning: { depth: 3 } },
  });
  maintain(hf, p);
  see(hf, p, 3);
  hf.considerProjects(p, p.now);
  p.memory.expectations.push({ key: 'quiet', needs: {}, successRate: 1, samples: 100, valence: 0.05 });
  const first = step(hf, p, false);
  const second = step(hf, p, first.carrying);
  if (second.carrying || p.now !== 602 || p.agenda.goals[0]?.progress !== 0.3)
    throw new Error('Legacy save must follow a complete take/replace round');
  return hf.snapshot(p);
}
export function legacyProjectLoopContinuation(hf: typeof HF, save: unknown) {
  const p = hf.restore(save);
  let carrying = false;
  const trace = [];
  for (let i = 0; i < 90; i++) {
    const result = step(hf, p, carrying);
    carrying = result.carrying;
    const snapshot = JSON.parse(JSON.stringify(hf.snapshot(p)));
    delete snapshot.engine;
    trace.push({ decision: result.decision, snapshot, carrying });
  }
  return createHash('sha256').update(JSON.stringify(trace)).digest('hex');
}
