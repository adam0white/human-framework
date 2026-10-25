import { describe, expect, test } from 'vitest';
import { practise, SKILL_DEFAULTS, seedSkills, skillFamilies, skillLevel } from '../src/skills/index.ts';
import type { Person } from '../src/types.ts';

type P = Pick<Person, 'skills' | 'now'>;
const mk = (levels: Record<string, number> = {}): P => ({ skills: seedSkills(levels, 0), now: 0 });

describe('skill transfer', () => {
  const transfer = { 'repair-bicycle': { 'repair-sewing-machine': 0.4 } };

  test('practising a source moves a related skill by a fraction, without spending its practice minutes', () => {
    const a = mk({ 'repair-bicycle': 0.5 });
    const b = mk({ 'repair-bicycle': 0.5, turkish: 0.35 });
    const unrelated = structuredClone(b.skills.turkish);
    const own = practise(a, 'repair-bicycle', 600, 0.6, true, 1, 0);
    expect(a.skills['repair-sewing-machine']).toBeUndefined();
    practise(b, 'repair-bicycle', 600, 0.6, true, 1, 0, transfer);
    expect(b.skills['repair-bicycle']?.level).toBeCloseTo(own.after, 12);
    const related = b.skills['repair-sewing-machine'];
    expect(related?.level ?? 0).toBeGreaterThan(SKILL_DEFAULTS.base);
    expect((related?.level ?? 0) - SKILL_DEFAULTS.base).toBeLessThan(own.after - own.before);
    expect(related?.practice).toBe(0);
    expect(b.skills['repair-bicycle']?.level).toBeGreaterThan(0.5);
    expect(b.skills.turkish).toEqual(unrelated);
    // Transfer is one-way unless the map says otherwise; unrelated skills are untouched.
    const c = mk({ 'repair-sewing-machine': 0.5 });
    practise(c, 'repair-sewing-machine', 600, 0.6, true, 1, 0, transfer);
    expect(c.skills['repair-bicycle']).toBeUndefined();
  });

  test('a related skill later builds on what transferred', () => {
    const fresh = mk();
    const primed = mk({ 'repair-bicycle': 0.5 });
    practise(primed, 'repair-bicycle', 1200, 0.6, true, 1, 0, transfer);
    for (const p of [fresh, primed]) practise(p, 'repair-sewing-machine', 120, 0.3, true, 1, 0);
    expect(skillLevel(primed, 'repair-sewing-machine')).toBeGreaterThan(
      skillLevel(fresh, 'repair-sewing-machine'),
    );
  });

  test('skillFamilies builds a symmetric map within families only', () => {
    const t = skillFamilies({ repair: ['bike', 'kettle'], speech: ['turkish'] }, 0.3);
    expect(t).toEqual({ bike: { kettle: 0.3 }, kettle: { bike: 0.3 } });
  });
});
