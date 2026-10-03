/** Regression tests for the 2026-10-03 integration review (engineering findings). */
import { describe, expect, test } from 'vitest';
import type { World } from '../src/index.ts';
import {
  begin,
  chronicOnsets,
  closeDay,
  commitmentPressure,
  createCommunity,
  createPerson,
  decide,
  diffChronicle,
  finish,
  HABIT_DEFAULTS,
  habitPull,
  heldNorms,
  learnFromVoice,
  normTerms,
  precommit,
  pressureReachedAt,
  promise,
  ramadanFast,
  releasePrecommitment,
  restore,
  seedTie,
  sharesPlace,
  sicken,
  skip,
  snapshot,
  stepCommunity,
  tick,
} from '../src/index.ts';
import type { Activity, Affordance, Person } from '../src/types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../src/types.ts';

const person = (id = 'halil', now = 7 * 60): Person =>
  createPerson({ id, name: id, seed: 5, bornAt: -50 * MINUTES_PER_YEAR, sex: 'male', now });

describe('review 2026-10-03', () => {
  test('a chronic onset stays chronic: still present after 60 days of ticking', () => {
    const p = person();
    const onsets = chronicOnsets(p, 20 * MINUTES_PER_YEAR, p.rng, {
      conditions: [
        {
          kind: 'hypertension',
          baseHazard: 1,
          refAge: 40,
          doublingYears: 10,
          severity: 0.2,
          sources: [{ kind: 'assumption', ref: 'test' }],
        },
      ],
      exposures: { multiplier: 1e6 },
    });
    expect(onsets).toHaveLength(1);
    expect(onsets[0]?.chronic).toBe(true);
    expect(onsets[0]?.baseline).toBe(0.2);
    for (const ill of onsets) sicken(p, ill);
    tick(p, p.now + 60 * MINUTES_PER_DAY);
    const h = p.body.illnesses.find((i) => i.kind === 'hypertension');
    expect(h?.chronic).toBe(true);
    expect(h?.severity ?? 0).toBeGreaterThan(0.1);
  });

  test('skip closes the open day before decaying, so its record does not claim decades of change', () => {
    const p = person();
    p.habits.push({ cue: { hour: 10 }, action: 'smoke', strength: 0.7, repetitions: 60, lastAt: p.now });
    tick(p, p.now + 3 * 60);
    const day = p.chronicleDay?.day;
    expect(day).toBeDefined();
    skip(p, p.now + 40 * MINUTES_PER_YEAR);
    const rec = p.chronicle?.find((r) => r.day === day);
    expect(rec).toBeDefined();
    expect(rec?.habits.filter((h) => h.action === 'smoke')).toEqual([]);
    expect(p.chronicleDay).toBeUndefined();
  });

  test('only the newest day record keeps its state snapshot; a slice still yields end trust', () => {
    const p = person();
    for (let d = 0; d < 3; d++) {
      tick(p, p.now + MINUTES_PER_DAY);
    }
    closeDay(p);
    const list = p.chronicle ?? [];
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.slice(0, -1).every((r) => r.state === undefined)).toBe(true);
    expect(list[list.length - 1]?.state).toBeDefined();
    // A slice ending on an older record: a trust change logged on it is still read as the end trust.
    const older = list.slice(0, 1).map((r) => ({
      ...r,
      trust: [{ voiceId: 'you', from: 0.5, to: 0.9, delta: 0.4 }],
    }));
    const base = list.slice(0, 1).map((r) => ({ ...r, trust: [] }));
    const d = diffChronicle(base, older);
    expect(d.changes.some((c) => c.kind === 'trust' && c.subject === 'you' && c.after === 0.9)).toBe(true);
  });

  test('seedTie merges into an existing tie: roles unioned, unspecified fields kept, values clamped', () => {
    const p = person();
    const rel = seedTie(p, { otherId: 'selin', roles: ['neighbor'], respect: 0.4 });
    expect(rel.roles).toEqual(['neighbor']);
    const merged = seedTie(p, { otherId: 'selin', roles: ['child'], affection: 3 });
    expect(merged).toBe(rel);
    expect(merged.roles).toEqual(['neighbor', 'child']);
    expect(merged.respect).toBe(0.4);
    expect(merged.affection).toBe(1);
    expect(p.social.relationships.filter((r) => r.otherId === 'selin')).toHaveLength(1);
  });

  test('restore sanitizes exposures and chronic illness fields', () => {
    const p = person();
    sicken(p, {
      kind: 'hypertension',
      severity: 0.3,
      trendPerDay: 0,
      contagious: false,
      chronic: true,
      aggravatedBy: ['smoke'],
    });
    const json = JSON.parse(JSON.stringify(snapshot(p)));
    json.body.exposures = {
      smoke: { recent: 'x', cumulative: 2, lastAt: 0 },
      dust: { recent: 2, cumulative: -1, lastAt: 0 },
    };
    json.body.illnesses[0].baseline = null;
    json.body.illnesses[0].aggravatedBy = ['smoke', 3];
    const r = restore(json);
    expect(r.body.exposures).toEqual({ dust: { recent: 1, cumulative: 0, lastAt: 0 } });
    const ill = r.body.illnesses[0];
    expect(ill?.baseline).toBe(0.3);
    expect(ill?.aggravatedBy).toEqual(['smoke']);
    tick(r, r.now + 10 * MINUTES_PER_DAY);
    expect(Number.isFinite(r.body.health)).toBe(true);
  });

  test('contagion needs physical presence: no call, no sleeping partner, no other place', () => {
    const q = person('selin');
    const at = (
      action: string,
      placeId?: string,
      tags?: string[],
    ): Pick<Activity, 'action' | 'affordance'> => ({
      action,
      affordance: {
        id: action,
        action,
        label: action,
        duration: 30,
        effort: 0,
        advertises: {},
        ...(placeId !== undefined ? { placeId } : {}),
        ...(tags ? { tags } : {}),
      },
    });
    expect(sharesPlace(q, at('call', 'home'))).toBe(false);
    expect(sharesPlace(q, at('chat', 'home', ['remote']))).toBe(false);
    expect(sharesPlace(q, at('tea', 'teahouse'))).toBe(true);
    q.activity = { ...(at('tea', 'city') as Activity) };
    expect(sharesPlace(q, at('tea', 'teahouse'))).toBe(false);
    expect(sharesPlace(q, at('tea', 'city'))).toBe(true);
    q.activity = null;
    q.body.asleep = true;
    expect(sharesPlace(q, at('tea', 'teahouse'))).toBe(false);
  });

  test('pressureReachedAt inverts commitmentPressure inside the window', () => {
    const p = person();
    const commitment = promise(p, {
      kind: 'worship',
      actions: ['pray'],
      from: 960,
      until: 1140,
      importance: 1,
    });
    const at = pressureReachedAt(commitment, 0.9);
    expect(at).toBeDefined();
    expect(commitmentPressure(commitment, at as number)).toBeGreaterThanOrEqual(0.9);
    expect(commitmentPressure(commitment, (at as number) - 2)).toBeLessThan(0.9);
    expect(pressureReachedAt(commitment, 1.1)).toBeUndefined();
  });

  test('the driver rolls contagion for co-present partners and never over a call', () => {
    const run = (action: 'visit' | 'call') => {
      const a = person('a', 8 * 60);
      const b = person('b', 8 * 60);
      sicken(b, { kind: 'flu', severity: 1, trendPerDay: 0, contagious: true });
      const offer = (p: Person): Affordance =>
        p.id === 'a'
          ? {
              id: action,
              action,
              label: action,
              duration: 240,
              effort: 0,
              advertises: { belonging: 0.3 },
              targetId: 'b',
              placeId: 'x',
            }
          : {
              id: 'wait',
              action: 'wait',
              label: 'wait',
              duration: 240,
              effort: 0,
              advertises: { leisure: 0.2 },
              placeId: 'x',
            };
      const world: World = {
        now: () => a.now,
        affordancesFor: (p) => [offer(p)],
        perceptsFor: () => [],
        resolve: (p, act) => ({
          affordanceId: act.affordanceId,
          action: act.action,
          status: 'completed',
          at: p.now,
        }),
        onDay: (p) => {
          const flu = p.id === 'b' ? p.body.illnesses.find((i) => i.kind === 'flu') : undefined;
          if (flu) flu.severity = 1;
        },
      };
      const c = createCommunity([a, b]);
      return stepCommunity(c, world, 8 * 60 + 3 * MINUTES_PER_DAY, {}).filter((e) => e.kind === 'contagion');
    };
    expect(run('visit').length).toBeGreaterThanOrEqual(1);
    expect(run('call')).toEqual([]);
  });

  test('a habit just performed does not pull again at once (refractory ramp)', () => {
    const p = person();
    p.habits.push({ cue: { hour: 10 }, action: 'smoke', strength: 0.8, repetitions: 60, lastAt: 10 * 60 });
    const smoke: Affordance = {
      id: 's',
      action: 'smoke',
      label: 's',
      duration: 10,
      effort: 0,
      advertises: {},
    };
    expect(habitPull(p, smoke, { now: 10 * 60 + 10 })).toBeLessThan(0.05);
    expect(habitPull(p, smoke, { now: 10 * 60 + 30 + HABIT_DEFAULTS.refractory })).toBe(0);
    p.habits[0] = { ...(p.habits[0] as (typeof p.habits)[number]), lastAt: 10 * 60 - MINUTES_PER_DAY };
    expect(habitPull(p, smoke, { now: 10 * 60 + 10 })).toBeCloseTo(0.8, 6);
  });

  test('an obligation already answered today pulls only as a voluntary act', () => {
    const p = person('a', 12 * 60);
    p.conscience.norms = heldNorms({ practice: 1 });
    const pray: Affordance = {
      id: 'pray',
      action: 'pray',
      label: 'pray',
      duration: 10,
      effort: 0,
      advertises: {},
      norms: [{ normId: 'salah', relation: 'fulfills' }],
    };
    const c = promise(p, {
      kind: 'worship',
      actions: ['pray'],
      from: 12 * 60,
      until: 15 * 60,
      importance: 1,
      normId: 'salah',
    });
    const due = normTerms(p, pray, { desperation: 0 }).find((t) => t.source === 'norm:salah')?.value ?? 0;
    c.status = 'kept';
    const after = normTerms(p, pray, { desperation: 0 }).find((t) => t.source === 'norm:salah')?.value ?? 0;
    expect(after).toBeGreaterThan(0);
    expect(after).toBeCloseTo(due / 2, 6);
  });

  test('tiny trust changes fold into the latest same-reason event instead of logging +0.00', () => {
    const p = createPerson({
      id: 'h',
      name: 'h',
      seed: 1,
      bornAt: -40 * MINUTES_PER_YEAR,
      sex: 'male',
      now: 0,
      voices: [{ voiceId: 'you', trust: 0.5 }],
    });
    for (let i = 0; i < 40; i++)
      learnFromVoice(p, { voiceId: 'you', verdict: 'assented', reason: 'x', says: '' }, 0.05, { at: i });
    const v = p.will.voices.find((x) => x.voiceId === 'you');
    expect(v?.history.length).toBeLessThanOrEqual(2);
    const total = (v?.history ?? []).reduce((s2, e) => s2 + e.delta, 0);
    expect(total).toBeCloseTo((v?.trust ?? 0) - 0.5, 9);
    expect((v?.history ?? []).every((e) => Math.abs(e.delta) >= 0.01)).toBe(true);
  });

  test('precommit adds a bias term inside its daily window only, and can be released', () => {
    const p = person('a', 21 * 60);
    const cards: Affordance = {
      id: 'c',
      action: 'cards',
      label: 'c',
      duration: 60,
      effort: 0,
      advertises: { leisure: 0.3 },
    };
    const pc = precommit(p, { action: 'cards', bias: -0.6, from: 20 * 60, to: 2 * 60 });
    const term = (now: number) => {
      p.now = now;
      return decide(p, [cards]).considered[0]?.terms.find((t) => t.source === `precommit:${pc.id}`)?.value;
    };
    expect(term(21 * 60)).toBe(-0.6);
    expect(term(MINUTES_PER_DAY + 60)).toBe(-0.6);
    expect(term(MINUTES_PER_DAY + 12 * 60)).toBeUndefined();
    expect(releasePrecommitment(p, pc.id)).toBe(true);
    expect(p.will.precommitments).toEqual([]);
  });

  test('a pushed act that breaks a commitment costs the voice trust with a breach reason', () => {
    const p = createPerson({
      id: 'h',
      name: 'h',
      seed: 2,
      bornAt: -40 * MINUTES_PER_YEAR,
      sex: 'male',
      now: 12 * 60,
      norms: [{ normId: 'sawm-ramadan', standing: 'obligatory', conviction: 0.5 }],
      voices: [{ voiceId: 'you', trust: 0.6 }],
      commitments: [ramadanFast(0, 30)],
    });
    const smoke: Affordance = {
      id: 's',
      action: 'smoke',
      label: 's',
      duration: 10,
      effort: 0,
      advertises: { leisure: 0.2 },
    };
    p.agenda.commitments[0]?.violatedBy?.push('smoke');
    const r = decide(p, [smoke], {
      suggestion: { voiceId: 'you', action: 'smoke', strength: 1, insist: true },
    });
    expect(r.chosenAction).toBe('smoke');
    const act = begin(p, smoke, r);
    if (!act) throw new Error('dead');
    tick(p, act.endsAt);
    finish(p, { affordanceId: 's', action: 'smoke', status: 'completed', at: act.endsAt });
    const v = p.will.voices.find((x) => x.voiceId === 'you');
    expect(v?.trust ?? 1).toBeLessThan(0.6);
    expect(v?.history.at(-1)?.reason).toMatch(/^breach/);
  });
});
