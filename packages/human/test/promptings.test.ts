import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { runArm, runPromptingsControl } from '../examples/promptings-control.ts';
import {
  begin,
  createPerson,
  decide,
  emotionLevel,
  enablePromptings,
  finish,
  nafsReading,
  PROMPTINGS_DEFAULTS,
  practiceAt,
  promptingLine,
  promptingsReading,
  promptingTerms,
  restore,
  snapshot,
} from '../src/index.ts';
import type { Affordance, Person } from '../src/types.ts';

const DAY = 1440;
const OPTION: Affordance = {
  id: 'option',
  action: 'option',
  label: 'option',
  duration: 30,
  effort: 0.05,
  placeId: 'cue',
  norms: [{ normId: 'n1', relation: 'violates' }],
  advertises: {},
};
const OTHER: Affordance = { ...OPTION, id: 'other', action: 'other', label: 'other', norms: [] };

function cued(): Person {
  const p = createPerson({
    id: 'p',
    name: 'P',
    seed: 3,
    now: 600,
    bornAt: -30 * 365 * DAY,
    sex: 'female',
    traits: { honesty: 0.5 },
    norms: [{ normId: 'n1', standing: 'forbidden', conviction: 0.4 }],
  });
  p.habits.push({ cue: { placeId: 'cue' }, action: 'option', strength: 0.7, repetitions: 200, lastAt: 0 });
  return p;
}
const weeklyAssents = (r: ReturnType<typeof runArm>) => r.weekly.map((w) => w.assents);
const choices = (r: ReturnType<typeof runArm>) => r.person.trace.map((d) => d.chosenAffordanceId);

describe('promptings and turning away (2.4.0)', () => {
  test('off by default: no slice, no promptings terms or state', () => {
    const p = cued();
    const record = decide(p, [OPTION, OTHER]);
    expect(p.promptings).toBeUndefined();
    expect(record.considered.flatMap((c) => c.terms).some((t) => t.source.startsWith('promptings:'))).toBe(
      false,
    );
    expect(
      createPerson({ id: 'q', name: 'Q', seed: 1, now: 0, bornAt: -DAY * 9000, sex: 'male' }),
    ).not.toHaveProperty('promptings');
  });

  test('a prompt alone writes no breach, guilt or intention; fault writes guilt only', () => {
    for (const reading of ['whisper', 'inclination', 'intrusion', 'none', 'fault'] as const) {
      const p = cued();
      enablePromptings(p, { reading });
      const intentions = p.conscience.intentions.length;
      decide(p, [OPTION, OTHER]);
      expect(p.promptings?.recent).toHaveLength(1);
      expect(p.conscience.breaches).toHaveLength(0);
      expect(p.conscience.intentions.length).toBe(intentions);
      if (reading === 'fault') expect(emotionLevel(p, 'guilt')).toBeGreaterThan(0);
      else expect(emotionLevel(p, 'guilt')).toBe(0);
    }
  });

  test('only assent reaches the conscience record: breaches equal completed assents', () => {
    const b = runArm('B', 30);
    const assents = b.weekly.reduce((n, w) => n + w.assents, 0);
    expect(assents).toBeGreaterThan(0);
    expect(b.breaches).toBe(assents);
    expect(b.person.promptings?.recent.filter((r) => r.outcome === 'assented').length).toBe(assents);
  });

  test('practice: over 30 cue days turned rises and assents fall; disuse lowers practice slowly', () => {
    const b = runArm('B', 30);
    const a = weeklyAssents(b);
    expect(a[0]).toBeGreaterThan(a[3] ?? 7);
    const recent = b.person.promptings?.recent ?? [];
    const firstWeek = recent.slice(0, 7).filter((r) => r.outcome === 'turned').length;
    const lastWeek = recent.slice(-7).filter((r) => r.outcome === 'turned').length;
    expect(lastWeek).toBeGreaterThan(firstWeek);
    const r = b.person.promptings?.responses[0];
    if (!r) throw new Error('no response');
    const at = r.lastUsedAt + 30 * DAY;
    expect(practiceAt(r, at)).toBeLessThan(r.practice);
    expect(practiceAt(r, at)).toBeGreaterThan(r.practice * 0.6);
  });

  test('bound: no turning-away term at survival desperation', () => {
    const p = cued();
    enablePromptings(p, { responses: [{ id: 'r', kind: 'refuge', practice: 1 }] });
    const terms = [
      { source: 'need:food', value: 2 },
      { source: 'norm:n1', value: -0.3 },
    ];
    expect(promptingTerms(p, 'option', terms, [], p.now, 0.5)).toEqual([
      { source: 'promptings:turn', value: -PROMPTINGS_DEFAULTS.turnMax },
    ]);
    expect(promptingTerms(p, 'option', terms, [], p.now, PROMPTINGS_DEFAULTS.survivalDesperation)).toEqual(
      [],
    );
  });

  test('whisper, inclination and intrusion give identical decisions and differ only in narration', () => {
    const spec = (reading: 'whisper' | 'inclination' | 'intrusion') => ({
      reading,
      responses: [{ id: 'r1', kind: 'redirect' as const, practice: 0.1 }],
    });
    const runs = (['whisper', 'inclination', 'intrusion'] as const).map((r) => runArm('B', 30, spec(r)));
    const [w, i, n] = runs.map(choices);
    expect(i).toEqual(w);
    expect(n).toEqual(w);
    const lines = runs.map((r) => promptingsReading(r.person)?.lines.at(-1));
    expect(new Set(lines).size).toBe(3);
    expect(promptingLine('whisper', 'turned', 'refuge')).toContain('sought refuge');
  });

  test('echo: fault with echoRate > 0 adds a recurrence pull; with the default 0 it matches intrusion', () => {
    const plain = runArm('A', 14, { reading: 'intrusion' });
    const fault0 = runArm('A', 14, { reading: 'fault' });
    expect(choices(fault0)).toEqual(choices(plain));
    expect(fault0.person.promptings?.recent.length).toBe(plain.person.promptings?.recent.length);
    expect(fault0.person.promptings?.echo).toEqual({});
    const echo = runArm('A', 14, { reading: 'fault', echoRate: 0.3 });
    expect(echo.person.promptings?.echo.option?.level ?? 0).toBeGreaterThan(0);
    const option = echo.person.trace
      .flatMap((d) => d.considered)
      .filter((c) => c.affordanceId === 'option')
      .at(-1);
    expect(option?.terms.some((t) => t.source === 'promptings:echo')).toBe(true);
    // The same seeded intrusion person never gains the term.
    expect(
      plain.person.trace
        .flatMap((d) => d.considered.flatMap((c) => c.terms))
        .some((t) => t.source === 'promptings:echo'),
    ).toBe(false);
  });

  test('bound, end to end: a starving person takes the opposed food despite full practice', () => {
    const p = cued();
    enablePromptings(p, { responses: [{ id: 'r', kind: 'refuge', practice: 1 }] });
    p.body.satiety = 0;
    p.body.hydration = 0;
    const food: Affordance = { ...OPTION, id: 'food', action: 'food', advertises: { food: 0.8, water: 0.8 } };
    const record = decide(p, [food, OTHER]);
    expect(record.chosenAffordanceId).toBe('food');
    const terms = record.considered.find((c) => c.affordanceId === 'food')?.terms ?? [];
    expect(terms.some((t) => t.source === 'promptings:turn')).toBe(false);
  });

  test('a vetoed option is passed, not turned, and earns no practice', () => {
    const p = cued();
    p.conscience.norms = [{ normId: 'n1', standing: 'forbidden', conviction: 1 }];
    enablePromptings(p, { responses: [{ id: 'r', kind: 'leave', practice: 0.3 }] });
    const before = p.promptings?.responses[0]?.practice;
    const record = decide(p, [OPTION, OTHER]);
    expect(record.considered.find((c) => c.affordanceId === 'option')?.vetoed).toBeDefined();
    expect(p.promptings?.recent.map((r) => r.outcome)).toEqual(['passed']);
    expect(p.promptings?.responses[0]?.practice).toBe(before);
  });

  test('re-enabling keeps learned practice', () => {
    const b = runArm('B', 20).person;
    const learned = b.promptings?.responses[0]?.practice ?? 0;
    enablePromptings(b, { reading: 'whisper', responses: [{ id: 'r1', kind: 'redirect', practice: 0.1 }] });
    expect(b.promptings?.responses[0]?.practice).toBe(learned);
  });

  test('legacy: persons without the slice continue exactly as npm 2.3.0 (engine stamp removed)', () => {
    // Digests measured 2026-10-18 by the same scenario against installed @adam0white/human-framework@2.3.0.
    const digests = [1, 2, 3].map((seed) => {
      const p = createPerson({
        id: 'p',
        name: 'P',
        seed,
        now: 600,
        bornAt: -30 * 365 * DAY,
        sex: 'female',
        norms: [{ normId: 'n1', standing: 'forbidden', conviction: 0.4 }],
      });
      p.habits.push({
        cue: { placeId: 'cue' },
        action: 'option',
        strength: 0.7,
        repetitions: 200,
        lastAt: 0,
      });
      const offers: Affordance[] = [
        { ...OPTION, label: 'o', tags: ['temptation'] },
        {
          id: 'meal',
          action: 'meal',
          label: 'm',
          duration: 30,
          effort: 0.05,
          advertises: { food: 0.5, water: 0.5 },
        },
        { id: 'rest', action: 'rest', label: 'r', duration: 60, effort: 0, advertises: { rest: 0.3 } },
      ];
      for (let i = 0; i < 200; i++) {
        const r = decide(p, offers, { now: p.now + 30 });
        const a = offers.find((x) => x.id === r.chosenAffordanceId);
        if (!a) continue;
        begin(p, a, r);
        finish(p, {
          affordanceId: a.id,
          action: a.action,
          status: 'completed',
          at: p.now + a.duration,
          needs: a.advertises,
        });
      }
      const j = JSON.parse(JSON.stringify(snapshot(p)));
      delete j.engine;
      return createHash('sha256').update(JSON.stringify(j)).digest('hex').slice(0, 16);
    });
    expect(digests).toEqual(['d211ed151680ff76', 'ca1358d51e36b5dd', 'c7896636f578cec3']);
  });

  test('save and restore round-trip; a malformed slice is dropped', () => {
    const b = runArm('B', 10).person;
    const back = restore(JSON.parse(JSON.stringify(snapshot(b))));
    expect(back.promptings).toEqual(b.promptings);
    const bad = JSON.parse(JSON.stringify(b));
    bad.promptings.reading = 'certainty';
    expect(restore(bad).promptings).toBeUndefined();
    const big = JSON.parse(JSON.stringify(b));
    big.promptings.recent = Array.from({ length: 500 }, () => b.promptings?.recent[0]);
    expect(restore(big).promptings?.recent.length).toBe(PROMPTINGS_DEFAULTS.maxRecent);
    const proto = JSON.parse(JSON.stringify(b));
    proto.promptings.echo = JSON.parse(
      '{"__proto__": {"level": 1, "at": 0}, "constructor": {"level": 0.5, "at": 0}}',
    );
    const r = restore(proto).promptings;
    expect(Object.getPrototypeOf(r?.echo)).toBe(Object.prototype);
    expect(Object.hasOwn(r?.echo ?? {}, '__proto__')).toBe(false);
  });

  test('nafs lens names three descriptions with evidence, never a level', () => {
    const a = runArm('A', 7).person;
    const b = runArm('B', 30).person;
    const names = nafsReading(a).map((x) => x.name);
    expect(names).toEqual(['urging', 'reproaching', 'at rest']);
    expect(nafsReading(a).find((x) => x.name === 'urging')?.evident).toBe(true);
    for (const x of nafsReading(b))
      expect(Object.keys(x).sort()).toEqual(['evidence', 'evident', 'name', 'ref']);
  });

  test('headless control: practised turning-away vs suppression-only and a fixed penalty', () => {
    const arms = Object.fromEntries(runPromptingsControl().map((r) => [r.arm, r]));
    const sum = (arm: string) => arms[arm]?.weekly.reduce((n, w) => n + w.assents, 0) ?? -1;
    const flat = (arm: string, n: number) => arms[arm]?.weekly.slice(0, 8).every((w) => w.prompts === n);
    // A: no response, assents every cue day. B: learns; prompts stay flat. C: guilt at prompts, same breaches.
    expect(sum('A')).toBe(60);
    expect(arms.B?.weekly[0]?.assents).toBe(7);
    expect(arms.B?.weekly.slice(3).every((w) => w.assents === 0)).toBe(true);
    expect(flat('A', 7) && flat('B', 7) && flat('C', 7)).toBe(true);
    expect(sum('C')).toBe(sum('A'));
    expect(arms.C?.breaches).toBe(arms.A?.breaches);
    expect(arms.C?.weekly.every((w) => w.guiltAtPrompt > 0)).toBe(true);
    expect(arms.A?.weekly.every((w) => w.guiltAtPrompt === 0)).toBe(true);
    // A fixed penalty is a step: always (small k) or never (large k), no curve, no prompt record.
    expect(sum('K-small')).toBe(60);
    expect(sum('K-large')).toBe(0);
    expect(arms['K-small']?.weekly.every((w) => w.prompts === 0)).toBe(true);
  });
});
