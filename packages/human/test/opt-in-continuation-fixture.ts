/**
 * A person using the 2.4.0 to 2.8.0 opt-in slices (promptings under `fault` with echo, the evening review, a
 * single-commitment `fulfills`) without any 2.9.0 option, for the 2.9.0 continuation test. It takes the framework
 * as an argument so the same scenario can run against the 2.8.0 release source (commit e32850e).
 */
import { createHash } from 'node:crypto';
import type * as HF from '../src/index.ts';

const DAY = 1440;

export function optInContinuation(hf: typeof HF, seed: number): { digest: string; refs: number } {
  const p = hf.createPerson({
    id: 'p',
    name: 'P',
    seed,
    now: 600,
    bornAt: -30 * 365 * DAY,
    sex: 'female',
    norms: [{ normId: 'n1', standing: 'forbidden', conviction: 0.4 }],
  });
  p.habits.push({ cue: { placeId: 'cue' }, action: 'option', strength: 0.7, repetitions: 200, lastAt: 0 });
  hf.enablePromptings(p, {
    reading: 'fault',
    echoRate: 0.3,
    responses: [{ id: 'r', kind: 'refuge', practice: 0.3 }],
  });
  hf.enableReview(p);
  const task = hf.promise(p, {
    kind: 'promise',
    label: 'task',
    actions: ['tend'],
    from: 600,
    until: 780,
    recurEvery: DAY,
    importance: 0.5,
    toId: 'self',
  });
  const offers: HF.Affordance[] = [
    {
      id: 'option',
      action: 'option',
      label: 'o',
      duration: 30,
      effort: 0.05,
      placeId: 'cue',
      tags: ['temptation'],
      norms: [{ normId: 'n1', relation: 'violates' }],
      advertises: {},
    },
    {
      id: 'tend',
      action: 'tend',
      label: 't',
      duration: 30,
      effort: 0.3,
      advertises: {},
      fulfills: [task.id],
    },
    {
      id: 'meal',
      action: 'meal',
      label: 'm',
      duration: 30,
      effort: 0.05,
      advertises: { food: 0.5, water: 0.5 },
    },
    { id: 'rest', action: 'rest', label: 'r', duration: 60, effort: 0, advertises: { rest: 0.3 } },
    {
      id: 'sleep',
      action: 'sleep',
      label: 's',
      duration: 480,
      effort: 0,
      mode: 'sleep',
      advertises: { sleep: 1 },
    },
  ];
  for (let i = 0; i < 200; i++) {
    const r = hf.decide(p, offers, { now: p.now + 30 });
    const a = offers.find((x) => x.id === r.chosenAffordanceId);
    if (!a) continue;
    hf.begin(p, a, r);
    hf.finish(p, {
      affordanceId: a.id,
      action: a.action,
      status: 'completed',
      at: p.now + a.duration,
      needs: a.advertises,
    });
  }
  const j = JSON.parse(JSON.stringify(hf.snapshot(p)));
  delete j.engine;
  // The one 2.9.0 addition such a person sees: `ref` on review terms in the trace. Normalized here and counted.
  let refs = 0;
  for (const d of j.trace)
    for (const c of d.considered)
      for (const t of c.terms)
        if ('ref' in t) {
          refs += 1;
          delete t.ref;
        }
  return { digest: createHash('sha256').update(JSON.stringify(j)).digest('hex').slice(0, 16), refs };
}
