import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  partnerTrial,
  runFullnessArm,
  runPartnerControl,
  runPromiseControl,
} from '../examples/game-requests-control.ts';
import {
  type Affordance,
  begin,
  bodyForecast,
  bodyForecastTerm,
  createPerson,
  decide,
  enableFullness,
  finish,
  forecastThresholds,
  lifeModifiers,
  noteVoicePromise,
  type Person,
  restore,
  seedVoice,
  snapshot,
  voiceOf,
  WILL_DEFAULTS,
} from '../src/index.ts';

const DAY = 1440;
const make = (over: Partial<Parameters<typeof createPerson>[0]> = {}): Person =>
  createPerson({ id: 'p', name: 'P', seed: 1, now: 600, bornAt: -30 * 365 * DAY, sex: 'female', ...over });

describe('seedVoice (2.8.0)', () => {
  test('adds a seeded voice with the authored trust', () => {
    const p = make();
    const v = seedVoice(p, 'player', 0.8);
    expect(v.trust).toBe(0.8);
    expect(v.seeded).toBe(true);
    expect(v.history).toEqual([]);
  });

  test('is a no-op on a known voice unless replace is set', () => {
    const p = make({ voices: [{ voiceId: 'player', trust: 0.3 }] });
    const v = voiceOf(p, 'player');
    if (v) v.accepted = 4;
    expect(seedVoice(p, 'player', 0.9).trust).toBe(0.3);
    const r = seedVoice(p, 'player', 0.9, { replace: true });
    expect(r.trust).toBe(0.9);
    expect(r.accepted).toBe(4);
    expect(p.will.voices).toHaveLength(1);
  });

  test('clamps and falls back on bad numbers', () => {
    const p = make();
    expect(seedVoice(p, 'a', 3).trust).toBe(1);
    expect(seedVoice(p, 'b', Number.NaN).trust).toBe(WILL_DEFAULTS.defaultVoiceTrust);
  });

  test('a seeded voice survives eviction when the voice list is full', () => {
    const p = make();
    seedVoice(p, 'kept', 0.6);
    for (let i = 0; i < WILL_DEFAULTS.maxVoices + 4; i++) noteVoicePromise(p, `v${i}`, { kept: true });
    expect(voiceOf(p, 'kept')?.trust).toBe(0.6);
    expect(p.will.voices.length).toBe(WILL_DEFAULTS.maxVoices);
  });
});

describe('noteVoicePromise (2.8.0)', () => {
  test('kept raises trust, broken lowers it more, with history reasons', () => {
    const { kept, broken } = runPromiseControl();
    expect(kept[1]).toBeGreaterThan(0.5);
    expect(0.5 - (broken[1] ?? 0)).toBeGreaterThan((kept[1] ?? 0) - 0.5);
    const p = make();
    noteVoicePromise(p, 'v', { kept: true, at: 700, action: 'carry' });
    noteVoicePromise(p, 'v', { kept: false, at: 800, action: 'carry' });
    expect(voiceOf(p, 'v')?.history.map((h) => h.reason)).toEqual(['promise-kept', 'promise-broken']);
    expect(voiceOf(p, 'v')?.history[0]?.action).toBe('carry');
  });

  test('repeat kept promises earn less each time; the discount fades over days', () => {
    const { kept } = runPromiseControl();
    const gains = kept.slice(1).map((t, i) => t - (kept[i] ?? 0));
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeLessThan(gains[i - 1] ?? 0);
    const p = make();
    seedVoice(p, 'v', 0.5);
    noteVoicePromise(p, 'v', { kept: true, at: 0, action: 'x' });
    const t1 = voiceOf(p, 'v')?.trust ?? 0;
    noteVoicePromise(p, 'v', { kept: true, at: 30 * DAY, action: 'x' });
    const fresh = 0.1 * (1 - t1);
    expect((voiceOf(p, 'v')?.trust ?? 0) - t1).toBeCloseTo(fresh, 3);
  });

  test('needs no resolution, consumes no randomness and does not touch decisions', () => {
    const p = make();
    const rng = JSON.stringify(p.rng);
    noteVoicePromise(p, 'v', { kept: false });
    expect(JSON.stringify(p.rng)).toBe(rng);
    expect(p.trace).toHaveLength(0);
    expect(voiceOf(p, 'v')?.trust).toBeCloseTo(0.375, 6);
  });
});

describe('reconsider and alongside (2.8.0)', () => {
  test('control: only reconsider plus alongside takes the person on with the partner', () => {
    const rows = runPartnerControl(6);
    expect(rows.map((r) => r.goes)).toEqual([0, 0, 0, 6]);
    expect(partnerTrial('CT', 1).terms).toMatch(/together:partner=/);
  });

  test('reconsider is recorded and drops only the inertia bonus', () => {
    const p = make();
    const a: Affordance = { id: 'a', action: 'a', label: 'a', duration: 30, effort: 0, advertises: {} };
    const b: Affordance = { ...a, id: 'b', action: 'b', label: 'b' };
    begin(p, a, decide(p, [a]));
    const plain = decide(p, [a, b], { now: p.now + 1 });
    expect(plain.reconsider).toBeUndefined();
    const again = decide(p, [a, b], { now: p.now + 1, reconsider: true });
    expect(again.reconsider).toBe(true);
    // Equal utilities: inertia keeps a; without it the id tie-break decides (still a), so no spurious switch.
    expect(again.chosenAffordanceId).toBe('a');
  });

  test('reconsider lets a slightly better option beat the running one', () => {
    const run = (reconsider: boolean) => {
      const p = make();
      const a: Affordance = { id: 'a', action: 'a', label: 'a', duration: 60, effort: 0.1, advertises: {} };
      const b: Affordance = { ...a, id: 'b', action: 'b', label: 'b', effort: 0 };
      begin(p, a, decide(p, [a]));
      const r = decide(p, [a, b], { now: p.now + 5, ...(reconsider ? { reconsider: true } : {}) });
      const u = (id: string) => r.considered.find((c) => c.affordanceId === id)?.utility ?? 0;
      return { chosen: r.chosenAffordanceId, gap: u('b') - u('a') };
    };
    const plain = run(false);
    expect(plain.gap).toBeGreaterThan(0);
    expect(plain.gap).toBeLessThan(WILL_DEFAULTS.switchMargin * WILL_DEFAULTS.inertiaFloor);
    expect(plain.chosen).toBe('a');
    expect(run(true).chosen).toBe('b');
  });

  test('no together term for a stranger, oneself or the dead', () => {
    const p = make({
      relationships: [
        { otherId: 'friend', affection: 0.5, familiarity: 0.7 },
        { otherId: 'gone', affection: 0.8, familiarity: 0.9 },
      ],
    });
    const rel = p.social.relationships.find((r) => r.otherId === 'gone');
    if (rel) rel.deceasedAt = 0;
    const go: Affordance = {
      id: 'go',
      action: 'go',
      label: 'go',
      duration: 10,
      effort: 0.1,
      advertises: {},
      alongside: ['friend', 'stranger', 'p', 'gone', 'friend'],
    };
    const r = decide(p, [go]);
    const sources = r.considered[0]?.terms.map((t) => t.source).filter((s) => s.startsWith('together:'));
    expect(sources).toEqual(['together:friend']);
  });
});

describe('fullness (2.8.0)', () => {
  test('control: idle sipping at full water stops with fullness on', () => {
    const off = runFullnessArm(false);
    const on = runFullnessArm(true);
    expect(off.sip).toBeGreaterThan(60);
    expect(on.sip).toBeLessThan(off.sip / 10);
    expect(on.sit).toBeGreaterThan(off.sit);
  });

  test('a thirsty person still drinks: no term below comfort', () => {
    const p = make({ body: { hydration: 0.3 } });
    enableFullness(p);
    const sip: Affordance = {
      id: 'sip',
      action: 'sip',
      label: 'sip',
      duration: 4,
      effort: 0,
      advertises: { water: 0.35 },
    };
    const terms = decide(p, [sip]).considered[0]?.terms.map((t) => t.source) ?? [];
    expect(terms).toContain('need:water');
    expect(terms.some((s) => s.startsWith('full:'))).toBe(false);
  });

  test('round-trips through restore; a malformed flag is dropped', () => {
    const p = make({ enable: { fullness: true } });
    expect(restore(JSON.parse(JSON.stringify(snapshot(p)))).body.fullness).toBe(true);
    const bad = JSON.parse(JSON.stringify(snapshot(make())));
    bad.body.fullness = 'yes';
    expect(restore(bad).body.fullness).toBeUndefined();
  });
});

describe('legacy continuation (2.8.0)', () => {
  test('persons without the new options continue exactly as npm 2.3.0 (engine stamp removed)', () => {
    // Same scenario and digests as the 2.4.0 promptings legacy test (measured against installed npm 2.3.0).
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
});

describe('forecast thresholds per offer (2.8.0)', () => {
  const up: Affordance = {
    id: 'up',
    action: 'up',
    label: 'up',
    duration: 120,
    effort: 0.8,
    advertises: {},
    followedBy: [{ label: 'the way down', duration: 120, effort: 0.7 }],
  };
  const rested = () => make({ now: 9 * 60 });

  test('without forecastAt, or with an invalid pair, the defaults apply exactly', () => {
    const p = rested();
    const base = bodyForecastTerm(p, up, lifeModifiers(p));
    for (const forecastAt of [
      undefined,
      { comfortAt: 0.9, spentAt: 0.5 },
      { comfortAt: Number.NaN },
      { spentAt: 2 },
    ]) {
      const aff = forecastAt ? { ...up, forecastAt } : up;
      expect(forecastThresholds(aff)).toEqual({ comfortAt: 0.8, spentAt: 0.97 });
      expect(bodyForecastTerm(p, aff, lifeModifiers(p))).toEqual(base);
      expect(bodyForecast(p, aff).line).toBe(bodyForecast(p, up).line);
    }
  });

  test('lower thresholds make a readout below the default comfort weigh and read as hard', () => {
    const p = rested();
    const worst = Math.max(
      ...bodyForecast(p, up)
        .spans.slice(1)
        .map((s) => s.worst),
    );
    expect(worst).toBeLessThan(0.8);
    expect(bodyForecastTerm(p, up, lifeModifiers(p))).toBeUndefined();
    const low = { ...up, forecastAt: { comfortAt: Math.max(0, worst - 0.2), spentAt: worst + 0.1 } };
    expect(bodyForecastTerm(p, low, lifeModifiers(p))?.value).toBeLessThan(0);
    expect(bodyForecast(p, low).line).toBe('I can do it, though the way down will be hard.');
    const r = decide(p, [low]);
    expect(r.considered[0]?.terms.some((t) => t.source === 'forecast:body')).toBe(true);
  });
});
