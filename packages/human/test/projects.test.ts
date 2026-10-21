import { expect, test } from 'vitest';
import * as hf from '../src/index.ts';
import type { Affordance, Person, Prospect } from '../src/types.ts';
import { optInContinuation } from './opt-in-continuation-fixture.ts';
import { projectsOffContinuation } from './projects-continuation-fixture.ts';

const prospect: Prospect = { id: 'work', label: 'Make a structure', kind: 'make', progress: 0 };
const idle: Affordance = {
  id: 'rest',
  action: 'rest',
  label: 'Rest',
  duration: 1,
  effort: 0,
  advertises: {},
};
function maintain(p: Person): void {
  p.body.satiety = p.body.hydration = 1;
  p.body.sleepPressure = p.body.sleepDebt = p.body.exertion = p.body.pain = 0;
  for (const id of hf.PSYCHOLOGICAL_NEEDS) p.needs[id] = 1;
  p.affect.emotions = [];
}
function person(on = true): Person {
  const p = hf.createPerson({
    id: 'p',
    name: 'P',
    seed: 7,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    traits: { openness: 1, conscientiousness: 1 },
    enable: { projects: on },
  });
  maintain(p);
  return p;
}
function see(p: Person, shown = prospect, at = p.now): void {
  hf.perceive(p, [
    {
      at,
      channel: 'saw',
      kind: 'fact',
      salience: 1,
      summary: 'A prospect',
      prospect: shown,
    },
  ]);
}
function active(p: Person) {
  return p.agenda.goals.find((g) => g.project && g.status === 'active');
}
function step(p: Person, aff = idle): void {
  hf.begin(p, aff, hf.decide(p, [aff]));
  hf.tick(p, p.now + 1);
  hf.finish(p, { affordanceId: aff.id, action: aff.action, status: 'completed', at: p.now });
}

test('a relaxed adult adopts an attended prospect during minute stepping; readings use no RNG', () => {
  const p = person();
  see(p);
  const before = hf.snapshot(p);
  expect(hf.projectAppeal(p, prospect)).toBeGreaterThan(hf.PROJECTS_DEFAULTS.adoptAppeal);
  expect(p).toEqual(before);
  step(p);
  expect(active(p)).toMatchObject({
    label: prospect.label,
    project: { prospectId: 'work', perceivedProgress: true },
    serves: ['competence', 'leisure'],
    temporal: { halfLifeMinutes: 120 },
  });
  for (let i = 0; i < 3; i++) step(p);
  expect(p.agenda.goals.filter((g) => g.project)).toHaveLength(1);
});

test('hunger, fear, sleep, open duty and the active-goal cap prevent adoption', () => {
  for (const state of ['hungry', 'fear', 'sleep', 'sleep-activity', 'duty', 'cap'] as const) {
    const p = person();
    see(p);
    if (state === 'hungry') p.body.satiety = 0;
    if (state === 'fear') hf.feel(p, 'fear', 1, 'threat', p.now);
    if (state === 'sleep') p.body.asleep = true;
    if (state === 'sleep-activity') hf.begin(p, { ...idle, mode: 'sleep' }, hf.decide(p, [idle]));
    if (state === 'duty')
      hf.promise(p, { kind: 'duty', actions: ['visit'], from: p.now, until: p.now + 10, importance: 1 });
    if (state === 'cap')
      for (let i = 0; i < hf.AGENDA_DEFAULTS.maxActiveGoals; i++)
        hf.adoptGoal(p, { label: 'Other', serves: [], advancedBy: [], importance: 0.2 }, p.now);
    hf.considerProjects(p, p.now);
    expect(active(p), state).toBeUndefined();
  }
});

test('retention is bounded, newest wins, stable ties evict first, identifiers and expiry are bounded', () => {
  const p = person();
  for (let i = 0; i < 9; i++) see(p, { ...prospect, id: `p${i}` });
  expect(p.projects?.prospects.map((x) => x.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
  hf.tick(p, p.now + 1);
  see(p, { ...prospect, id: 'p1', label: 'New' });
  see(p, { ...prospect, id: 'p1', label: 'Old' }, p.now - 1);
  expect(p.projects?.prospects[0]).toMatchObject({ label: 'New', lastSeenAt: p.now });
  see(p, { ...prospect, id: 'x'.repeat(513) });
  expect(p.projects?.prospects).toHaveLength(8);
  const ten = Array.from({ length: 10 }, (_, i) => `m${i % 9}`);
  see(p, { ...prospect, id: 'p2', materialIds: ten });
  expect(p.projects?.prospects.find((x) => x.id === 'p2')?.materialIds).toEqual([
    'm0',
    'm1',
    'm2',
    'm3',
    'm4',
    'm5',
    'm6',
    'm7',
  ]);
  hf.enableProjects(p, { forgetMinutes: 1 });
  hf.tick(p, p.now + 2);
  expect(p.projects?.prospects).toEqual([]);
});

test('perceived progress may fall, only rises refresh staleness, and events credit without advancing', () => {
  const p = person();
  see(p);
  hf.considerProjects(p, p.now);
  const g = active(p);
  if (!g) throw new Error('No project');
  const contribution = hf.onFinished(p, {
    affordanceId: 'place',
    action: 'place',
    status: 'completed',
    at: p.now,
    advances: [prospect.id],
  });
  expect(contribution.advanced).toContain(g);
  expect(g.progress).toBe(0);
  hf.tick(p, p.now + 1);
  see(p, { ...prospect, progress: 0.6 });
  const advancedAt = g.lastAdvancedAt;
  hf.tick(p, p.now + 1);
  see(p, { ...prospect, progress: 0.2 });
  expect(g.progress).toBe(0.2);
  expect(g.lastAdvancedAt).toBe(advancedAt);
  see(p, { ...prospect, progress: 1 });
  expect(g.status).toBe('achieved');
  expect(p.projects?.history).toMatchObject([{ goalId: g.id, outcome: 'achieved' }]);
});

test('events advance projects without perceived progress, including by prospect id', () => {
  const p = person();
  const { progress: _, ...plain } = prospect;
  see(p, plain);
  hf.considerProjects(p, p.now);
  hf.onFinished(p, {
    affordanceId: 'place',
    action: 'place',
    status: 'completed',
    at: p.now,
    advances: [prospect.id],
  });
  expect(active(p)?.progress).toBe(hf.AGENDA_DEFAULTS.defaultAdvanceAmount);
});

test('a seeded consequence chain gives the first step a positive project goal term', () => {
  const p = person();
  see(p);
  hf.considerProjects(p, p.now);
  const g = active(p);
  if (!g) throw new Error('No project');
  hf.enablePlanning(p, { depth: 3 });
  hf.seedConsequences(p, 'known', [
    {
      id: 'route',
      revision: 0,
      trigger: { action: 'fetch' },
      successor: { action: 'place', duration: 1, effort: 0, advances: [prospect.id] },
      availableFrom: p.now,
      availableUntil: p.now + 10,
      expiresAt: p.now + 10,
      chance: 1,
      confidence: 1,
    },
  ]);
  const fetch = { ...idle, id: 'fetch', action: 'fetch' };
  const before = hf.snapshot(p);
  const decision = hf.decide(p, [idle, fetch]);
  expect(
    decision.considered
      .find((c) => c.affordanceId === 'fetch')
      ?.terms.find((t) => t.source === `goal:${g.id}`)?.value,
  ).toBeGreaterThan(0);
  expect(hf.planRoute(hf.restore(before), fetch)?.steps).toHaveLength(1);
});

test('staleness abandons, retains the prospect and enforces cooldown before readoption', () => {
  const p = person();
  hf.enableProjects(p, { staleMinutes: 2, cooldownMinutes: 3, adoptEveryMinutes: 1 });
  see(p);
  hf.considerProjects(p, p.now);
  const first = active(p);
  if (!first) throw new Error('No project');
  for (let i = 0; i < 2; i++) {
    maintain(p);
    step(p);
  }
  expect(first.status).toBe('abandoned');
  expect(active(p)).toBeUndefined();
  expect(p.projects?.history[0]?.outcome).toBe('abandoned');
  expect(p.projects?.prospects).toHaveLength(1);
  for (let i = 0; i < 3; i++) {
    maintain(p);
    step(p);
  }
  expect(active(p)?.id).not.toBe(first.id);
  expect(active(p)).toBeDefined();
});

test('save round trip continues exactly; malformed optional data and ambiguous records are dropped', () => {
  const p = person();
  see(p);
  step(p);
  const saved = hf.snapshot(p);
  const loaded = hf.restore(JSON.parse(JSON.stringify(saved)));
  expect(loaded).toEqual(p);
  step(p);
  step(loaded);
  expect(hf.fingerprint(p)).toBe(hf.fingerprint(loaded));
  const duplicate = hf.snapshot(p);
  const entry = duplicate.projects?.prospects[0];
  if (!entry || !duplicate.projects) throw new Error('No prospect');
  duplicate.projects.prospects.push({ ...entry });
  expect(hf.restore(duplicate).projects).toBeUndefined();
  const bad = hf.snapshot(p);
  const g = bad.agenda.goals[0];
  if (!g) throw new Error('No goal');
  (g as unknown as { project: unknown }).project = { prospectId: 'work', perceivedProgress: 'yes' };
  expect(hf.restore(bad).agenda.goals[0]?.project).toBeUndefined();
});

test('restore reconciles project ownership so missing pointers cannot bypass abandonment cooldown', () => {
  const p = person();
  hf.enableProjects(p, { staleMinutes: 2, adoptEveryMinutes: 1, cooldownMinutes: 60 });
  see(p);
  hf.considerProjects(p, p.now);
  const saved = hf.snapshot(p);
  if (!saved.projects) throw new Error('No projects');
  delete saved.projects.currentGoalId;
  const q = hf.restore(saved);
  expect(q.projects?.currentGoalId).toBe('g1');
  // Staleness must also record abandonment if the pointer is lost after restore.
  if (q.projects) delete q.projects.currentGoalId;
  hf.tick(q, 602);
  expect(q.agenda.goals.map((g) => [g.id, g.status])).toEqual([['g1', 'abandoned']]);
  expect(q.projects?.history).toMatchObject([{ goalId: 'g1', outcome: 'abandoned', at: 602 }]);
  expect(q.projects?.lastAbandonedAt).toBe(602);
  const first = saved.agenda.goals[0];
  if (!first) throw new Error('No project goal');
  saved.agenda.goals.push(
    { ...structuredClone(first), id: 'newer-b', adoptedAt: 600 },
    { ...structuredClone(first), id: 'newer-a', adoptedAt: 600 },
  );
  first.adoptedAt = 599;
  saved.projects.currentGoalId = 'missing';
  const restored = hf.restore(saved);
  expect(restored.agenda.goals.filter((g) => g.project && g.status === 'active').map((g) => g.id)).toEqual([
    'newer-a',
  ]);
  expect(restored.projects?.currentGoalId).toBe('newer-a');
  expect(restored.projects?.history).toMatchObject([
    { goalId: 'newer-b', outcome: 'abandoned', at: 600 },
    { goalId: 'g1', outcome: 'abandoned', at: 600 },
  ]);
  expect(restored.projects?.lastAbandonedAt).toBe(600);
  expect(restored.rng).toEqual(saved.rng);
  expect(hf.restore(hf.snapshot(restored))).toEqual(restored);
  saved.agenda.goals = [];
  expect(hf.restore(saved).projects).not.toHaveProperty('currentGoalId');
});

test('without projects the main legacy continuation is byte-identical', () => {
  expect([1, 2, 3].map((seed) => optInContinuation(hf, seed))).toEqual([
    { digest: '7af56da16d1b3414', refs: 1 },
    { digest: 'bc43cc68ccab7d8a', refs: 1 },
    { digest: 'f39ac2679ae3d0f8', refs: 1 },
  ]);
  const plain = person(false);
  const shown = person(false);
  for (let i = 0; i < 20; i++) {
    const percept = {
      id: `s${i}`,
      at: plain.now,
      channel: 'saw' as const,
      kind: 'fact',
      salience: 1,
      summary: 'A prospect',
    };
    hf.perceive(plain, [percept]);
    hf.perceive(shown, [{ ...percept, prospect }]);
    step(plain);
    step(shown);
  }
  expect(hf.fingerprint(shown)).toBe(hf.fingerprint(plain));
  expect(shown.projects).toBeUndefined();
});

test('completed opportunities stay complete and terminal history records each project once after eviction', () => {
  const p = person();
  hf.enableProjects(p, { adoptEveryMinutes: 1 });
  for (let i = 0; i < 10; i++) {
    maintain(p);
    see(p, { id: `thing${i}`, label: 'Make something', kind: 'make' });
    hf.considerProjects(p, p.now);
    const g = active(p);
    if (!g) throw new Error('No project');
    g.progress = 0.95;
    step(p, { ...idle, action: 'place', advances: [g.project?.prospectId ?? ''] });
    expect(g.status).toBe('achieved');
  }
  expect(p.projects?.history).toHaveLength(8);
  const ids = p.projects?.history.map((h) => h.goalId);
  maintain(p);
  hf.tick(p, p.now + 30);
  expect(active(p)).toBeUndefined();
  expect(p.projects?.history.map((h) => h.goalId)).toEqual(ids);
  expect(hf.restore(hf.snapshot(p))).toEqual(p);
});

test('disabled projects match exact main a3d3439 with or without prospect data, including restore', () => {
  const mainDigest = 'f7ebd1e002b245775b10bb250e2d9848a0b421f9df53c27fea2e9de819eb4857';
  expect(projectsOffContinuation(hf, false)).toBe(mainDigest);
  expect(projectsOffContinuation(hf, true)).toBe(mainDigest);
});

test('restoring an earlier reading does not earn net credit or refresh staleness', () => {
  const p = person();
  see(p, { ...prospect, progress: 0.3 });
  hf.considerProjects(p, p.now);
  const g = active(p);
  if (!g) throw new Error('No project');
  const advancedAt = g.lastAdvancedAt;
  g.importance = 0.1;
  const contribute = () =>
    hf.onFinished(p, {
      affordanceId: 'place',
      action: 'place',
      status: 'completed',
      at: p.now,
      advances: [prospect.id],
    }).advanced;
  hf.tick(p, p.now + 1);
  see(p, { ...prospect, progress: 0.2 });
  expect(contribute()).not.toContain(g);
  hf.tick(p, p.now + 1);
  expect(contribute()).not.toContain(g);
  see(p, { ...prospect, progress: 0.3 });
  expect(g.lastAdvancedAt).toBe(advancedAt);
  expect(g.importance).toBeLessThan(0.2);
  hf.tick(p, p.now + 1);
  see(p, { ...prospect, progress: 0.4 });
  expect(g.lastAdvancedAt).toBe(p.now);
  expect(g.importance).toBe(g.baseImportance);
  expect(contribute()).toContain(g);
});

test('public project adoption retains its first high and re-enable repairs a missing peak', () => {
  const p = person();
  const g = hf.adoptGoal(
    p,
    {
      label: 'Host project',
      serves: ['competence'],
      advancedBy: [],
      importance: 0.5,
      project: { prospectId: prospect.id, perceivedProgress: true },
    },
    p.now,
  );
  see(p, { ...prospect, progress: 0.3 });
  const advancedAt = g.lastAdvancedAt;
  hf.tick(p, p.now + 1);
  see(p, { ...prospect, progress: 0.2 });
  hf.tick(p, p.now + 1);
  see(p, { ...prospect, progress: 0.3 });
  expect(g.lastAdvancedAt).toBe(advancedAt);
  expect(g.project?.peak).toBe(0.3);
  if (!g.project) throw new Error('No project');
  delete g.project.peak;
  hf.enableProjects(p);
  expect(g.project.peak).toBe(0.3);
});

test('project behaviour and peaks survive restore; re-enabling a legacy save opts in once', () => {
  const p = person();
  see(p, { ...prospect, progress: 0.3 });
  hf.considerProjects(p, p.now);
  const saved = hf.snapshot(p);
  expect(saved.projects?.behaviour).toBe(2);
  expect(hf.restore(saved).agenda.goals[0]?.project?.peak).toBe(0.3);
  const legacy = structuredClone(saved);
  if (!legacy.projects || !legacy.agenda.goals[0]?.project) throw new Error('No project');
  delete legacy.projects.behaviour;
  delete legacy.agenda.goals[0].project.peak;
  legacy.engine = '2.14.0';
  const q = hf.restore(legacy);
  expect(q.projects?.behaviour).toBeUndefined();
  expect(q.agenda.goals[0]?.project?.peak).toBeUndefined();
  hf.enableProjects(q);
  expect(q.projects?.behaviour).toBe(2);
  expect(q.agenda.goals[0]?.project?.peak).toBe(0.3);
  see(q, { ...prospect, progress: 0.2 });
  hf.enableProjects(q);
  expect(q.agenda.goals[0]?.project?.peak).toBe(0.3);
  const bad = structuredClone(saved);
  if (!bad.agenda.goals[0]?.project || !bad.projects) throw new Error('No project');
  bad.agenda.goals[0].project.peak = 2;
  expect(hf.restore(bad).agenda.goals[0]?.project).toEqual({ prospectId: 'work', perceivedProgress: true });
  (bad.projects as { behaviour?: number }).behaviour = 3;
  expect(hf.restore(bad).projects).toBeUndefined();
});
