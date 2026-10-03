import { describe, expect, test } from 'vitest';
import {
  challengeFactor,
  practise,
  SKILL_DEFAULTS,
  seedSkills,
  skillLevel,
  successChance,
} from '../src/skills/index.ts';
import type { Person } from '../src/types.ts';

const DAY = 1440;
type P = Pick<Person, 'skills' | 'now'>;
const mk = (levels: Record<string, number> = {}, now = 0): P => ({ skills: seedSkills(levels, now), now });

describe('skills', () => {
  test('unknown skill is base level', () => {
    expect(skillLevel(mk(), 'farm')).toBe(SKILL_DEFAULTS.base);
  });

  test('practice near difficulty learns faster than far-too-easy or far-too-hard', () => {
    const run = (difficulty: number) => {
      const p = mk({ farm: 0.3 });
      return practise(p, 'farm', 600, difficulty, true, 1, 0).after - 0.3;
    };
    const near = run(0.4);
    expect(near).toBeGreaterThan(run(0.0) * 2);
    expect(near).toBeGreaterThan(run(1.0) * 2);
    expect(challengeFactor(0.3, 0.4)).toBeCloseTo(1, 6);
  });

  test('failures still teach, at a reduced rate', () => {
    const a = mk({ x: 0.3 });
    const b = mk({ x: 0.3 });
    const s = practise(a, 'x', 120, 0.4, true, 1, 0).after - 0.3;
    const f = practise(b, 'x', 120, 0.4, false, 1, 0).after - 0.3;
    expect(f).toBeGreaterThan(0);
    expect(f / s).toBeGreaterThan(0.5);
    expect(f / s).toBeLessThan(0.7);
  });

  test('diminishing returns: equal practice hours gain less later (power-law-like)', () => {
    const p = mk();
    const gains: number[] = [];
    for (let i = 0; i < 5; i++) {
      const lvl = skillLevel(p, 'x');
      const r = practise(p, 'x', 1200, lvl + 0.1, true, 1, 0);
      gains.push(r.after - r.before);
    }
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeLessThan(gains[i - 1] as number);
  });

  test('learning multiplier scales gains; 1x600 ≈ 600x1 minutes', () => {
    const one = mk({ x: 0.3 });
    const many = mk({ x: 0.3 });
    practise(one, 'x', 600, 0.4, true, 1, 0);
    for (let i = 0; i < 600; i++) practise(many, 'x', 1, 0.4, true, 1, 0);
    expect(Math.abs((one.skills.x?.level ?? 0) - (many.skills.x?.level ?? 0))).toBeLessThan(0.01);
    const slow = mk({ x: 0.3 });
    practise(slow, 'x', 600, 0.4, true, 0.5, 0);
    expect((slow.skills.x?.level ?? 0) - 0.3).toBeLessThan((one.skills.x?.level ?? 0) - 0.3);
  });

  test('forgetting decays slowly toward a floor of 60% of gains', () => {
    const p = mk({ x: 0.85 });
    p.now = 30 * DAY;
    const month = skillLevel(p, 'x');
    p.now = 180 * DAY;
    const halfYear = skillLevel(p, 'x');
    p.now = 50 * 365 * DAY;
    const forever = skillLevel(p, 'x');
    expect(month).toBeLessThan(0.85);
    expect(month).toBeGreaterThan(0.8);
    const floor = 0.05 + 0.6 * 0.8;
    expect(halfYear).toBeCloseTo((0.85 + floor) / 2, 6);
    expect(forever).toBeCloseTo(floor, 4);
    expect(skillLevel(mk({ y: 0.05 }, 0), 'y')).toBe(0.05);
  });

  test('practice after a lapse starts from the retained level', () => {
    const p = mk({ x: 0.85 });
    const r = practise(p, 'x', 1, 0.9, true, 1, 365 * DAY);
    expect(r.before).toBeLessThan(0.85);
    expect(p.skills.x?.lastPracticed).toBe(365 * DAY);
  });

  test('successChance: skill raises, difficulty and low capacity lower, support helps, bounded', () => {
    const p = mk({ x: 0.6 });
    const base = successChance(p, 'x', 0.6, 1);
    expect(successChance(p, 'x', 0.3, 1)).toBeGreaterThan(base);
    expect(successChance(p, 'x', 0.9, 1)).toBeLessThan(base);
    expect(successChance(p, 'x', 0.6, 0.2)).toBeLessThan(base);
    expect(successChance(p, 'x', 0.6, 0.2, 1)).toBeGreaterThan(successChance(p, 'x', 0.6, 0.2));
    expect(successChance(mk({ x: 0.9 }), 'x', 0.6, 1)).toBeGreaterThan(base);
    for (const c of [successChance(p, 'x', 0, 1, 1), successChance(p, 'x', 1, 0)]) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  test('seedSkills clamps and back-fills practice so seeded experts learn slowly', () => {
    const s = seedSkills({ a: 0.9, b: -1, c: 2 }, 5);
    expect(s.b?.level).toBe(0);
    expect(s.c?.level).toBe(1);
    expect(s.a?.lastPracticed).toBe(5);
    expect(s.a?.practice).toBeGreaterThan(s.b?.practice ?? 0);
    const expert = { skills: { x: { level: 0.5, practice: s.a?.practice ?? 0, lastPracticed: 0 } }, now: 0 };
    const novice = { skills: { x: { level: 0.5, practice: 0, lastPracticed: 0 } }, now: 0 };
    const ge = practise(expert, 'x', 600, 0.6, true, 1, 0);
    const gn = practise(novice, 'x', 600, 0.6, true, 1, 0);
    expect(ge.after - ge.before).toBeLessThan(gn.after - gn.before);
  });

  test('deterministic', () => {
    const a = mk({ x: 0.2 });
    const b = mk({ x: 0.2 });
    practise(a, 'x', 77, 0.35, false, 0.8, 10);
    practise(b, 'x', 77, 0.35, false, 0.8, 10);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('headless control: challenge-pitched practice beats a constant easy-drill learner over 100 h', () => {
    // Control learner always drills tasks at difficulty 0.1; the pitched learner raises difficulty with skill.
    const pitched = mk();
    const drill = mk();
    for (let i = 0; i < 100; i++) {
      practise(pitched, 'x', 60, skillLevel(pitched, 'x') + 0.1, true, 1, 0);
      practise(drill, 'x', 60, 0.1, true, 1, 0);
    }
    expect(skillLevel(pitched, 'x')).toBeGreaterThan(skillLevel(drill, 'x') + 0.1);
  });
});
