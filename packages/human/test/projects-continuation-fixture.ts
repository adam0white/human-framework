/** Matched disabled and previously enabled hosts pin exact full-state continuation against main source. */
import { createHash } from 'node:crypto';
import type * as HF from '../src/index.ts';
export function projectsOffContinuation(
  hf: typeof HF,
  withProspect: boolean,
  projectsEnabled = false,
  legacyProjects = false,
): string {
  let p = hf.createPerson({
    id: 'p',
    name: 'P',
    seed: 37,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    enable: { curiosity: true, planning: { depth: 3 }, ...(projectsEnabled ? { projects: true } : {}) },
  });
  if (legacyProjects && p.projects) delete p.projects.behaviour;
  const rest = { id: 'rest', action: 'rest', label: 'Rest', duration: 1, effort: 0, advertises: {} };
  const make = {
    ...rest,
    id: 'make',
    action: 'make',
    effort: 0.1,
    ...(projectsEnabled ? { advances: ['work'] } : {}),
  };
  for (let i = 0; i < 80; i++) {
    if (projectsEnabled) {
      p.body.satiety = p.body.hydration = 1;
      p.body.sleepPressure = p.body.sleepDebt = p.body.exertion = p.body.pain = 0;
      for (const need of hf.PSYCHOLOGICAL_NEEDS) p.needs[need] = 1;
      p.affect.emotions = [];
    }
    hf.perceive(p, [
      {
        at: p.now,
        channel: 'saw',
        kind: 'fact',
        salience: 1,
        summary: 'Materials',
        ...(withProspect
          ? {
              prospect: {
                id: 'work',
                label: 'Make something',
                kind: 'make' as const,
                progress: projectsEnabled ? (i % 3) / 10 : 0,
              },
            }
          : {}),
      },
    ]);
    const offers = [rest, make];
    const d = hf.decide(p, offers);
    const a = offers.find((a) => a.id === d.chosenAffordanceId);
    if (!a) throw new Error('No offer');
    hf.begin(p, a, d);
    hf.tick(p, p.now + 1);
    hf.finish(p, { affordanceId: a.id, action: a.action, status: 'completed', at: p.now });
    if (i === 40) p = hf.restore(hf.snapshot(p));
  }
  const saved = JSON.parse(JSON.stringify(hf.snapshot(p)));
  delete saved.engine; // The lead stamps engine 2.14.0 after both slices merge.
  return createHash('sha256').update(JSON.stringify(saved)).digest('hex');
}
