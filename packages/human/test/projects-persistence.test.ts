import { expect, test } from 'vitest';
import type { Affordance, Person } from '../src/index.ts';
import * as hf from '../src/index.ts';

const work: Affordance = {
  id: 'place',
  action: 'place',
  label: 'Place',
  duration: 1,
  effort: 0.01,
  advertises: {},
  advances: ['construction'],
};
const idle: Affordance = {
  id: 'pastime',
  action: 'pastime',
  label: 'Pastime',
  duration: 1,
  effort: 0.01,
  advertises: {},
};
function see(p: Person, progress: number): void {
  hf.perceive(p, [
    {
      at: p.now,
      channel: 'saw',
      kind: 'fact',
      salience: 1,
      summary: 'An unfinished construction',
      prospect: { id: 'construction', label: 'Make a construction', kind: 'make', progress },
    },
  ]);
}
function startedProject() {
  const p = hf.createPerson({
    id: 'p',
    name: 'P',
    seed: 19,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    traits: { openness: 1 },
    norms: [],
    enable: { projects: { staleMinutes: 5 }, persistence: true },
  });
  p.body.satiety = p.body.hydration = 1;
  p.body.sleepPressure = p.body.sleepDebt = p.body.exertion = p.body.pain = 0;
  for (const id of hf.PSYCHOLOGICAL_NEEDS) p.needs[id] = 1;
  see(p, 0);
  hf.considerProjects(p, p.now);
  const g = p.agenda.goals.find((g) => g.project);
  if (!g) throw new Error('Missing project');
  hf.begin(p, work, hf.decide(p, [work]));
  hf.finish(p, { affordanceId: work.id, action: work.action, status: 'completed', at: p.now + 1 });
  expect(hf.pursuitOf(p)?.goalId).toBe(g.id);
  return { p, g };
}

test('perceived project completion releases its started pursuit on the next tick', () => {
  const { p, g } = startedProject();
  see(p, 1);
  expect(g.status).toBe('achieved');
  hf.tick(p, p.now);
  expect(hf.pursuitOf(p)).toBeUndefined();
});

test('project staleness releases a pursuit before its own inactivity timeout', () => {
  const { p, g } = startedProject();
  hf.tick(p, 605);
  expect(g.status).toBe('abandoned');
  expect(hf.pursuitOf(p)).toBeUndefined();
});

test('a drop in perceived progress retains the active project pursuit', () => {
  const { p, g } = startedProject();
  const pursuit = hf.pursuitOf(p);
  see(p, 0.6);
  see(p, 0.2);
  hf.tick(p, p.now + 1);
  expect(g.progress).toBe(0.2);
  expect(g.status).toBe('active');
  expect(hf.pursuitOf(p)).toEqual(pursuit);
});

test('a project pursuit never taxes commitment options, including a weak open commitment', () => {
  const { p } = startedProject();
  const commitment = hf.promise(p, {
    kind: 'promise',
    actions: ['visit'],
    from: p.now,
    until: p.now + 10,
    importance: 0.01,
  });
  const visit = { ...idle, id: 'visit', action: 'visit', fulfills: [commitment.id] };
  const rows = hf.decide(p, [work, idle, visit]).considered;
  const terms = rows.find((r) => r.affordanceId === visit.id)?.terms;
  expect(terms?.some((t) => t.source === `commitment:${commitment.id}`)).toBe(true);
  expect(terms?.some((t) => t.source === 'pursuit:switch')).toBe(false);
  expect(rows.find((r) => r.affordanceId === idle.id)?.terms.some((t) => t.source === 'pursuit:switch')).toBe(
    true,
  );
});
