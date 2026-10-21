import { describe, expect, test } from 'vitest';
import { main as community, DAYS } from '../examples/community.ts';
import { main as curiosity } from '../examples/curiosity-control.ts';
import { main as minimal } from '../examples/minimal.ts';
import { main as planning } from '../examples/planning-control.ts';
import { longerProject, main as projects } from '../examples/projects-control.ts';
import { main as suggestions } from '../examples/suggestions.ts';
import { main as whyNot } from '../examples/why-not-control.ts';

// Structural checks only: the examples must keep running and keep showing what they claim, but exact
// wording and tuning belong to the faculties, not to these tests.
const VERDICTS = ['assented', 'complied', 'deferred', 'modified', 'refused'];

describe('examples', () => {
  test('projects: seen prospects become projects and placements only in relaxed free time', () => {
    const [on, off, hungry] = projects();
    if (!on || !off || !hungry) throw new Error('Missing project control arm');
    for (const row of [on, off, hungry]) expect(row.minutes).toBe(1440);
    expect(on.adopted).toBeGreaterThan(0);
    expect(on.placements).toBe(5);
    expect(on.finalProgress).toBe(1);
    expect(on.history.some((h) => h.outcome === 'achieved')).toBe(true);
    expect(off.adopted).toBe(0);
    expect(off.placements).toBe(0);
    expect(hungry.adopted).toBe(0);
    expect(hungry.choices.food).toBeGreaterThan(0);
  });
  test('projects and persistence: more three-step chains, with hunger interrupting then resumption', () => {
    const [both, projectsOnly, persistenceOnly, neither, hungry] = longerProject();
    if (!both || !projectsOnly || !persistenceOnly || !neither || !hungry)
      throw new Error('Missing longer-project control arm');
    for (const row of [both, projectsOnly, persistenceOnly, neither, hungry]) {
      expect(row.minutes).toBe(180);
      expect(row.placements).toBe(row.completedChains);
    }
    expect(both.adopted).toBeGreaterThan(0);
    expect(projectsOnly.adopted).toBeGreaterThan(0);
    expect(both.completedChains).toBeGreaterThan(projectsOnly.completedChains);
    for (const row of [persistenceOnly, neither]) {
      expect(row.adopted).toBe(0);
      expect(row.placements).toBe(0);
    }
    expect(hungry.minutesToFirstMeal).not.toBeNull();
    expect(hungry.minutesToFirstMeal).toBeLessThanOrEqual(5);
    expect(hungry.placementsAfterMeal).toBeGreaterThan(0);
  });
  test('why not: inertia, norm, habit and firm rule separate the same request', () => {
    const rows = whyNot();
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ verdict: 'deferred', decidedBy: { kind: 'inertia' } });
    expect(rows[1]).toMatchObject({ verdict: 'refused', kind: 'willNot', reason: 'norm:boundary' });
    expect(rows[2]).toMatchObject({ verdict: 'deferred', decidedBy: { kind: 'term', source: 'habit' } });
    expect(rows[3]).toMatchObject({ verdict: 'refused', kind: 'willNot', reason: 'rule:leave it alone' });
    expect(rows[4]).toMatchObject({ verdict: 'deferred', kind: 'notNow' });
    expect(rows[1]).not.toHaveProperty('decidedBy');
    expect(rows[3]).not.toHaveProperty('decidedBy');
  });
  test('minimal: a person runs a day in a hand-written World', () => {
    const lines = minimal();
    expect(lines.length).toBeGreaterThan(4);
    for (const line of lines) expect(line).toMatch(/\w/);
    expect(lines.some((l) => /activities begun/.test(l))).toBe(true);
  });

  test('suggestions: one voice, typed verdicts', () => {
    const { lines, verdicts } = suggestions();
    expect(verdicts).toHaveLength(5);
    for (const r of verdicts) {
      expect(VERDICTS).toContain(r.verdict);
      if (r.kind !== undefined) expect(['cannot', 'notNow', 'willNot']).toContain(r.kind);
      expect(r.says.length).toBeGreaterThan(0);
    }
    // The example's point: a push is not a command. At least one assent and at least one refusal.
    expect(verdicts.some((r) => r.verdict === 'assented')).toBe(true);
    expect(verdicts.some((r) => r.verdict === 'refused')).toBe(true);
    expect(lines.some((l) => l.startsWith('decide():'))).toBe(true);
  });

  test('community: played and silent periods close into day records and diff', () => {
    const { lines, played, silent } = community();
    expect(played).toHaveLength(DAYS);
    expect(silent).toHaveLength(DAYS);
    expect(silent.every((r) => r.day > (played.at(-1)?.day ?? 0))).toBe(true);
    for (const line of lines) expect(line).toMatch(/\w/);
  });

  test('curiosity: free exploration favours the learnable option only with needs met', () => {
    const [on, off, hungry] = curiosity();
    if (!on || !off || !hungry) throw new Error('Missing curiosity control arm');
    for (const arm of [on, off, hungry]) {
      expect(arm.minutes).toBe(1440);
      expect(arm.alive).toBe(true);
    }
    const early = on.decisions.slice(0, on.decisions.length / 2);
    expect(early.some((d) => d.choice === 'learnable')).toBe(true);
    expect(early.some((d) => d.choice === 'noisy')).toBe(true);
    const late = on.decisions.length / 3;
    expect(on.lateCounts.learnable).toBeGreaterThan(late / 2);
    expect(on.lateCounts.learnable).toBeGreaterThan(on.lateCounts.noisy);
    expect(
      on.decisions
        .filter((d) => d.choice === 'learnable')
        .slice(2)
        .every((d) => d.success),
    ).toBe(true);
    expect(off.counts.familiar).toBe(off.decisions.length);
    expect(hungry.decisions.map((d) => d.choice)).toEqual(off.decisions.map((d) => d.choice));
    expect(hungry.decisions.every((d) => Object.values(d.curiosity).every((value) => value === 0))).toBe(
      true,
    );
  });

  test('planning: four-step completion needs sufficient depth, while present bias favors the smaller project', () => {
    const rows = planning();
    expect(rows).toHaveLength(8);
    for (const domain of ['parcel', 'garden']) {
      const arms = rows.filter((r) => r.domain === domain);
      const planner = arms.find((r) => r.arm === 'planner');
      const reactive = arms.find((r) => r.arm === 'reactive');
      const bounded = arms.find((r) => r.arm === 'depth-three');
      const biased = arms.find((r) => r.arm === 'present-biased');
      expect(planner?.progress.far).toBe(4);
      expect(planner?.goals.find((g) => g.id === 'far')?.status).toBe('achieved');
      expect(reactive?.progress.far).toBe(0);
      expect(bounded?.progress.far).toBe(0);
      expect(biased?.progress.near).toBe(2);
      expect(biased?.progress.far).toBeLessThan(4);
      expect(biased?.decisions[0]?.action).not.toBe(planner?.decisions[0]?.action);
      for (const row of arms) {
        expect(row.now).toBe(604);
        expect(row.decisions.map((d) => d.minute)).toEqual([600, 601, 602, 603]);
        expect(row.decisions.every((d) => d.offers.includes(d.action))).toBe(true);
      }
    }
  });
});
