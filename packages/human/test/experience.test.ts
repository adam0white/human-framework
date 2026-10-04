/**
 * L1, experience over years (engine 1.8.0): how practice is done. Skill domains pick their age curve, a host's
 * transfer map reaches `finish`, practice quality and instruction change how much practice teaches, and watching
 * someone skilled teaches the basics. Each input is opt-in: absent, learning is bit-for-bit as before.
 */
import { describe, expect, test } from 'vitest';
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  finish,
  instructionFrom,
  learningFor,
  learningMultiplier,
  lifeModifiers,
  MINUTES_PER_YEAR,
  type Outcome,
  type Person,
  perceive,
  SKILL_DEFAULTS,
  skillLevel,
} from '../src/index.ts';

const at = (age: number, id = 'a', skills: Record<string, number> = {}): Person =>
  createPerson({
    id,
    name: id,
    seed: 3,
    bornAt: -age * MINUTES_PER_YEAR,
    sex: 'female',
    now: 8 * 60,
    skills,
  });

const work = (skill: Affordance['skill'], minutes = 120): Affordance => ({
  id: 'practise',
  action: 'practise',
  label: 'practise',
  duration: minutes,
  effort: 0.2,
  advertises: { competence: 0.3 },
  ...(skill ? { skill } : {}),
});

/** Begin `aff` (chosen as the only offer) and finish it after its duration with `extra` outcome fields. */
function doWork(
  p: Person,
  aff: Affordance,
  extra: Partial<Outcome> = {},
  transfer?: Record<string, Record<string, number>>,
) {
  const record = decide(p, [aff]);
  begin(p, aff, record);
  const outcome: Outcome = {
    affordanceId: aff.id,
    action: aff.action,
    status: 'completed',
    at: p.now + aff.duration,
    ...extra,
  };
  finish(p, outcome, transfer ? { transfer } : {});
}

describe('skill domains pick their age curve', () => {
  test('a declared domain uses learningMultiplier; none keeps the general curve exactly', () => {
    const child = at(10);
    const adult = at(40);
    expect(learningFor(child, 'language')).toBeCloseTo(learningMultiplier(10, 'language'), 12);
    expect(learningFor(adult)).toBe(lifeModifiers(adult).learning);
    for (const p of [child, adult]) doWork(p, work({ id: 'turkish', difficulty: 0.15, domain: 'language' }));
    expect(skillLevel(child, 'turkish')).toBeGreaterThan(skillLevel(adult, 'turkish'));
    // 'general' and no domain give identical bits.
    const g = at(40, 'g');
    const n = at(40, 'n');
    doWork(g, work({ id: 'carving', difficulty: 0.15, domain: 'general' }));
    doWork(n, work({ id: 'carving', difficulty: 0.15 }));
    expect(g.skills.carving).toEqual(n.skills.carving);
  });
});

describe('transfer reaches finish', () => {
  test('a host map passed to finish moves the related skill; none moves nothing', () => {
    const map = { masonry: { carpentry: 0.4 } };
    const a = at(30, 'a', { masonry: 0.4 });
    const b = at(30, 'b', { masonry: 0.4 });
    doWork(a, work({ id: 'masonry', difficulty: 0.5 }), {}, map);
    doWork(b, work({ id: 'masonry', difficulty: 0.5 }));
    expect(a.skills.carpentry?.level ?? 0).toBeGreaterThan(SKILL_DEFAULTS.base);
    expect(a.skills.carpentry?.practice).toBe(0);
    expect(b.skills.carpentry).toBeUndefined();
    expect(a.skills.masonry).toEqual(b.skills.masonry);
  });
});

describe('practice quality and instruction', () => {
  const run = (extra: Partial<Outcome>) => {
    const p = at(30, 'q', { sewing: 0.3 });
    doWork(p, work({ id: 'sewing', difficulty: 0.4 }), extra);
    return skillLevel(p, 'sewing');
  };

  test('quality orders learning; ordinary quality (0.5) is the same as none', () => {
    const none = run({});
    expect(run({ practice: { quality: 0.5 } })).toBe(none);
    expect(run({ practice: { quality: 1 } })).toBeGreaterThan(none);
    expect(run({ practice: { quality: 0 } })).toBeLessThan(none);
  });

  test('a better teacher raises learning, not only performance; a teacher no better changes nothing', () => {
    const none = run({});
    const master = at(50, 'm', { sewing: 0.9 });
    const novice = at(20, 'n', { sewing: 0.2 });
    const taught = run({ practice: { instruction: instructionFrom(master, 'sewing') } });
    expect(taught).toBeGreaterThan(none);
    expect(run({ practice: { instruction: instructionFrom(novice, 'sewing') } })).toBe(none);
    // Half-hearted guidance teaches less than full engagement.
    const half = run({ practice: { instruction: instructionFrom(master, 'sewing', 0.3) } });
    expect(half).toBeGreaterThan(none);
    expect(half).toBeLessThan(taught);
    expect(instructionFrom(master, 'sewing').teacherId).toBe('m');
  });
});

describe('observational learning', () => {
  const watch = (level: number, minutes = 600) => ({
    at: 8 * 60,
    channel: 'saw' as const,
    kind: 'work',
    actorId: 'm',
    salience: 0.9,
    summary: 'watched the smith',
    demonstrates: { skill: 'smithing', level, minutes },
  });

  test('watching a master teaches the basics without practice minutes, never past the ceiling', () => {
    const p = at(16, 'w');
    for (let i = 0; i < 40; i++) perceive(p, [watch(0.9)]);
    const s = p.skills.smithing;
    expect(s?.level ?? 0).toBeGreaterThan(SKILL_DEFAULTS.base);
    expect(s?.level ?? 1).toBeLessThanOrEqual(SKILL_DEFAULTS.observeCeiling * 0.9);
    expect(s?.practice).toBe(0);
  });

  test('watching someone no better than the ceiling teaches nothing; no percept field, no change', () => {
    const p = at(16, 'w', { smithing: 0.3 });
    const before = structuredClone(p.skills);
    perceive(p, [watch(0.4)]);
    expect(p.skills).toEqual(before);
    const { demonstrates: _d, ...plain } = watch(0.9);
    perceive(p, [plain]);
    expect(p.skills).toEqual(before);
  });

  test('watching then practising beats practising alone', () => {
    const a = at(16, 'a');
    const b = at(16, 'b');
    for (let i = 0; i < 20; i++) perceive(a, [watch(0.9)]);
    for (const p of [a, b]) doWork(p, work({ id: 'smithing', difficulty: 0.2 }));
    expect(skillLevel(a, 'smithing')).toBeGreaterThan(skillLevel(b, 'smithing'));
  });
});
