import { describe, expect, test } from 'vitest';
import {
  actionTendencies,
  advanceAffect,
  appraise,
  createAffect,
  feel,
  readAffect,
  regulate,
  release,
} from '../src/affect/index.ts';
import { createRng } from '../src/core/index.ts';
import type { AppraisalEvent, NeedReservoirs, Person, Traits, Values } from '../src/types.ts';
import { ENGINE_VERSION, PERSON_SCHEMA } from '../src/types.ts';

function makePerson(
  over: { traits?: Partial<Traits>; values?: Partial<Values>; needs?: Partial<NeedReservoirs> } = {},
): Person {
  return {
    schema: PERSON_SCHEMA,
    engine: ENGINE_VERSION,
    id: 'p1',
    name: 'Test',
    now: 0,
    rng: createRng(1),
    life: { bornAt: -30 * 525_600, sex: 'female' },
    body: {
      satiety: 1,
      hydration: 1,
      sleepPressure: 0,
      exertion: 0,
      circadianPeak: 900,
      pain: 0,
      health: 1,
      fitness: 0.5,
      injuries: [],
      illnesses: [],
      sleepDebt: 0,
      asleep: false,
      since: 0,
      alive: true,
    },
    needs: {
      safety: 0.8,
      belonging: 0.7,
      esteem: 0.6,
      autonomy: 0.7,
      competence: 0.6,
      leisure: 0.6,
      meaning: 0.6,
      ...over.needs,
    },
    traits: {
      honesty: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
      ...over.traits,
    },
    values: {
      benevolence: 0.5,
      universalism: 0.5,
      tradition: 0.5,
      conformity: 0.5,
      security: 0.5,
      achievement: 0.5,
      power: 0.5,
      hedonism: 0.5,
      stimulation: 0.5,
      selfDirection: 0.5,
      ...over.values,
    },
    conscience: { norms: [], breaches: [], intentions: [] },
    affect: { mood: { valence: 0, arousal: 0.3 }, emotions: [], regulation: 0.3, lastUpdated: 0 },
    skills: {},
    habits: [],
    memory: { episodes: [], beliefs: [], expectations: [], sourceTrust: {}, nextEpisode: 0 },
    social: { relationships: [] },
    agenda: { commitments: [], goals: [], nextId: 0 },
    will: { voices: [], precommitments: [], switchMargin: 0.15, temperature: 0 },
    activity: null,
    trace: [],
    nextDecision: 0,
  };
}

const ev = (e: Partial<AppraisalEvent>): AppraisalEvent => ({
  at: 0,
  kind: 'event',
  desirability: 0,
  cause: 'event:test',
  ...e,
});
const ids = (p: Person) => p.affect.emotions.map((e) => e.id).sort();
const get = (p: Person, id: string, targetId?: string) =>
  p.affect.emotions.find((e) => e.id === id && (targetId === undefined || e.targetId === targetId));

describe('affect/createAffect', () => {
  test('neutral start', () => {
    const a = createAffect(100);
    expect(a.mood.valence).toBe(0);
    expect(a.emotions).toEqual([]);
    expect(a.lastUpdated).toBe(100);
  });
});

describe('affect/appraise', () => {
  test('desirability gives joy or distress, scaled by emotionality', () => {
    const calm = makePerson({ traits: { emotionality: 0.1 } });
    const sensitive = makePerson({ traits: { emotionality: 0.9 } });
    appraise(calm, ev({ kind: 'outcome', desirability: -0.6, cause: 'outcome:fail:farm' }));
    appraise(sensitive, ev({ kind: 'outcome', desirability: -0.6, cause: 'outcome:fail:farm' }));
    expect(ids(calm)).toEqual(['distress']);
    expect(get(sensitive, 'distress')?.intensity).toBeGreaterThan(get(calm, 'distress')?.intensity ?? 1);
    const p = makePerson();
    appraise(p, ev({ desirability: 0.5 }));
    expect(ids(p)).toEqual(['joy']);
  });
  test('prospects give hope/fear scaled by likelihood, confirmations give relief/disappointment', () => {
    const p = makePerson();
    const [lo] = appraise(
      makePerson(),
      ev({ kind: 'prospect', desirability: -0.8, likelihood: 0.2, cause: 'prospect:raid' }),
    );
    const [hi] = appraise(
      p,
      ev({ kind: 'prospect', desirability: -0.8, likelihood: 0.9, cause: 'prospect:raid' }),
    );
    expect(hi?.id).toBe('fear');
    expect(hi?.intensity).toBeGreaterThan(lo?.intensity ?? 1);
    appraise(p, ev({ desirability: 0.3, cause: 'event:raid:averted' }));
    expect(get(p, 'fear')).toBeUndefined();
    expect(get(p, 'relief')).toBeDefined();

    const q = makePerson();
    appraise(q, ev({ kind: 'prospect', desirability: 0.7, likelihood: 0.8, cause: 'prospect:harvest' }));
    expect(get(q, 'hope')).toBeDefined();
    appraise(q, ev({ kind: 'outcome', desirability: -0.4, cause: 'outcome:harvest:fail' }));
    expect(get(q, 'hope')).toBeUndefined();
    expect(get(q, 'disappointment')).toBeDefined();
    expect(get(q, 'distress')).toBeDefined();
  });
  test('unrelated outcome does not consume a prospect', () => {
    const p = makePerson();
    appraise(p, ev({ kind: 'prospect', desirability: 0.7, likelihood: 0.8, cause: 'prospect:harvest' }));
    appraise(p, ev({ desirability: -0.4, cause: 'event:rain' }));
    expect(get(p, 'hope')).toBeDefined();
  });
  test('own deeds: pride, guilt when norm-related, shame otherwise; honesty raises guilt', () => {
    const p = makePerson();
    appraise(p, ev({ kind: 'deed', agentId: 'p1', praiseworthiness: 0.6, cause: 'deed:help' }));
    expect(get(p, 'pride')).toBeDefined();
    const g = makePerson({ traits: { honesty: 0.9 } });
    const g0 = makePerson({ traits: { honesty: 0.1 } });
    for (const x of [g, g0])
      appraise(x, ev({ kind: 'deed', agentId: 'p1', praiseworthiness: -0.6, cause: 'deed:norm:theft' }));
    expect(ids(g)).toEqual(['guilt']);
    expect(get(g, 'guilt')?.intensity).toBeGreaterThan(get(g0, 'guilt')?.intensity ?? 1);
    const s = makePerson();
    appraise(s, ev({ kind: 'deed', agentId: 'p1', praiseworthiness: -0.5, cause: 'deed:clumsy' }));
    expect(ids(s)).toEqual(['shame']);
  });
  test("others' deeds: anger at harmful agent (lower when agreeable), gratitude and love toward helpers", () => {
    const harsh = makePerson({ traits: { agreeableness: 0.1 } });
    const mild = makePerson({ traits: { agreeableness: 0.9 } });
    for (const x of [harsh, mild])
      appraise(
        x,
        ev({
          kind: 'deed',
          agentId: 'p2',
          praiseworthiness: -0.7,
          desirability: -0.6,
          cause: 'deed:insult:p2',
        }),
      );
    expect(get(harsh, 'anger', 'p2')).toBeDefined();
    expect(get(harsh, 'anger')?.intensity).toBeGreaterThan(get(mild, 'anger')?.intensity ?? 1);
    const p = makePerson();
    appraise(
      p,
      ev({
        kind: 'deed',
        agentId: 'p3',
        praiseworthiness: 0.6,
        desirability: 0.5,
        affectionToAgent: 0.8,
        cause: 'deed:help:p3',
      }),
    );
    expect(get(p, 'gratitude', 'p3')).toBeDefined();
    expect(get(p, 'love', 'p3')).toBeDefined();
    const q = makePerson();
    appraise(
      q,
      ev({
        kind: 'deed',
        agentId: 'p3',
        praiseworthiness: 0.6,
        desirability: 0.5,
        affectionToAgent: 0.2,
        cause: 'deed:help:p3',
      }),
    );
    expect(get(q, 'love')).toBeUndefined();
  });
  test('loss gives long-lived grief; anger lasts hours, joy shorter', () => {
    const p = makePerson();
    appraise(p, ev({ desirability: -0.9, loss: true, targetId: 'p9', cause: 'event:death:p9' }));
    const grief = get(p, 'grief');
    expect(grief?.targetId).toBe('p9');
    expect(grief?.halfLife).toBeGreaterThanOrEqual(2 * 1440);
    appraise(
      p,
      ev({
        kind: 'deed',
        agentId: 'p2',
        praiseworthiness: -0.7,
        desirability: -0.6,
        cause: 'deed:insult:p2',
      }),
    );
    appraise(p, ev({ desirability: 0.5 }));
    const anger = get(p, 'anger')?.halfLife ?? 0;
    const joy = get(p, 'joy')?.halfLife ?? 0;
    expect(anger).toBeGreaterThanOrEqual(120);
    expect(joy).toBeLessThan(anger);
    expect(get(p, 'guilt')).toBeUndefined();
  });
  test('merge is max-ish, not a sum; bounded at 12 dropping the weakest', () => {
    const p = makePerson();
    appraise(p, ev({ desirability: 0.5 }));
    const once = get(p, 'joy')?.intensity ?? 0;
    for (let i = 0; i < 10; i++) appraise(p, ev({ desirability: 0.5 }));
    const many = get(p, 'joy')?.intensity ?? 0;
    expect(many).toBeGreaterThan(once);
    expect(many).toBeLessThan(Math.min(1, once * 2));
    for (let i = 0; i < 20; i++)
      appraise(
        p,
        ev({
          kind: 'deed',
          agentId: `q${i}`,
          praiseworthiness: 0.2 + i * 0.03,
          desirability: 0.3,
          cause: `deed:help:q${i}`,
        }),
      );
    expect(p.affect.emotions.length).toBe(12);
    expect(get(p, 'gratitude', 'q0')).toBeUndefined();
    expect(get(p, 'gratitude', 'q19')).toBeDefined();
  });
});

describe('affect/advanceAffect', () => {
  test('emotions decay by half-life and drop below 0.02', () => {
    const p = makePerson();
    feel(p, 'joy', 0.8, 'event:x', 0);
    advanceAffect(p, 90, 0.5);
    expect(get(p, 'joy')?.intensity).toBeCloseTo(0.4, 6);
    advanceAffect(p, 24 * 60, 0.5);
    expect(get(p, 'joy')).toBeUndefined();
    expect(p.affect.lastUpdated).toBe(90 + 24 * 60);
  });
  test('regulation shortens negative half-lives but not guilt', () => {
    const lo = makePerson();
    const hi = makePerson();
    hi.affect.regulation = 0.9;
    lo.affect.regulation = 0;
    for (const x of [lo, hi]) {
      feel(x, 'anger', 0.8, 'event:x', 0, 'p2');
      feel(x, 'guilt', 0.8, 'deed:norm:x', 0, 'p3');
      advanceAffect(x, 240, 0.5);
    }
    expect(get(hi, 'anger')?.intensity).toBeLessThan(get(lo, 'anger')?.intensity ?? 0);
    expect(get(hi, 'guilt')?.intensity).toBeCloseTo(get(lo, 'guilt')?.intensity ?? 0, 9);
  });
  test('mood follows need satisfaction slowly (hours, not minutes)', () => {
    const p = makePerson();
    advanceAffect(p, 30, 1);
    expect(p.affect.mood.valence).toBeGreaterThan(0);
    expect(p.affect.mood.valence).toBeLessThan(0.1);
    advanceAffect(p, 3 * 1440, 1);
    expect(p.affect.mood.valence).toBeCloseTo(0.6, 2);
    advanceAffect(p, 3 * 1440, 0);
    expect(p.affect.mood.valence).toBeCloseTo(-0.6, 2);
  });
  test('negative emotions pull mood down and fear raises arousal', () => {
    const p = makePerson();
    feel(p, 'fear', 0.9, 'event:x', 0);
    advanceAffect(p, 60, 0.5);
    expect(p.affect.mood.valence).toBeLessThan(0);
    expect(p.affect.mood.arousal).toBeGreaterThan(0.3);
  });
  test('closed form: exact without emotions, close with emotions', () => {
    const a = makePerson();
    const b = makePerson();
    advanceAffect(a, 600, 0.9);
    for (let i = 0; i < 600; i++) advanceAffect(b, 1, 0.9);
    expect(a.affect.mood.valence).toBeCloseTo(b.affect.mood.valence, 9);

    const c = makePerson();
    const d = makePerson();
    for (const x of [c, d]) {
      feel(x, 'grief', 0.8, 'event:loss', 0, 'p9');
      feel(x, 'anger', 0.7, 'event:insult', 0, 'p2');
    }
    advanceAffect(c, 600, 0.3);
    for (let i = 0; i < 600; i++) advanceAffect(d, 1, 0.3);
    expect(get(c, 'grief')?.intensity).toBeCloseTo(get(d, 'grief')?.intensity ?? 0, 9);
    expect(Math.abs(c.affect.mood.valence - d.affect.mood.valence)).toBeLessThan(0.02);
    expect(Math.abs(c.affect.mood.arousal - d.affect.mood.arousal)).toBeLessThan(0.02);
  });
  test('deterministic, bounded, and does not consume rng', () => {
    const run = () => {
      const p = makePerson();
      appraise(p, ev({ desirability: -1, loss: true, targetId: 'x', cause: 'event:loss' }));
      appraise(
        p,
        ev({ kind: 'deed', agentId: 'p2', praiseworthiness: -1, desirability: -1, cause: 'deed:harm' }),
      );
      advanceAffect(p, 1e6, 0);
      return p;
    };
    const a = run();
    expect(JSON.stringify(a)).toBe(JSON.stringify(run()));
    expect(a.affect.mood.valence).toBeGreaterThanOrEqual(-1);
    expect(a.rng).toEqual(createRng(1));
  });
});

describe('affect/readAffect and actionTendencies', () => {
  test('readAffect returns top 3 strongest', () => {
    const p = makePerson();
    feel(p, 'joy', 0.2, 'a');
    feel(p, 'fear', 0.9, 'b');
    feel(p, 'anger', 0.5, 'c', 0, 'p2');
    feel(p, 'hope', 0.7, 'd');
    const r = readAffect(p);
    expect(r.dominant.map((e) => e.id)).toEqual(['fear', 'hope', 'anger']);
    expect(r.valence).toBeLessThan(0);
  });
  test('tendencies follow emotions', () => {
    const p = makePerson();
    feel(p, 'fear', 0.8, 'a');
    feel(p, 'loneliness', 0.6, 'b');
    feel(p, 'guilt', 0.7, 'c', 0, 'p3');
    feel(p, 'boredom', 0.5, 'd');
    feel(p, 'grief', 0.5, 'e', 0, 'p9');
    feel(p, 'gratitude', 0.6, 'f', 0, 'p4');
    const t = actionTendencies(p);
    expect(t.risky).toBeLessThan(0);
    expect(t.social).toBeGreaterThan(0);
    expect(t.repair).toBeGreaterThan(0);
    expect(t.worship).toBeGreaterThan(0);
    expect(t.novel).toBeGreaterThan(0);
    expect(t.rest).toBeGreaterThan(0);
    expect(t.comfort).toBeGreaterThan(0);
    expect(t['approach:p4']).toBeGreaterThan(0);
    expect(t['repair:p3']).toBeGreaterThan(0);
    for (const v of Object.values(t)) expect(Math.abs(v)).toBeLessThanOrEqual(1);
  });
  test('anger splits into confront vs avoid by agreeableness', () => {
    const harsh = makePerson({ traits: { agreeableness: 0.1 } });
    const mild = makePerson({ traits: { agreeableness: 0.9 } });
    for (const x of [harsh, mild]) feel(x, 'anger', 0.8, 'deed:insult', 0, 'p2');
    const th = actionTendencies(harsh);
    const tm = actionTendencies(mild);
    expect(th.confront).toBeGreaterThan(0);
    expect(th['confront:p2'] ?? 0).toBeGreaterThan(tm['confront:p2'] ?? 0);
    expect(tm['avoid:p2'] ?? 0).toBeGreaterThan(th['avoid:p2'] ?? 0);
  });
  test('headless control: a calm person has near-zero tendencies', () => {
    const t = actionTendencies(makePerson());
    for (const v of Object.values(t)) expect(v).toBe(0);
  });
});

describe('affect/regulate and release', () => {
  test('regulation trains asymptotically and soothes negatives (not guilt)', () => {
    const p = makePerson();
    feel(p, 'anger', 0.8, 'a', 0, 'p2');
    feel(p, 'guilt', 0.8, 'deed:norm:x', 0, 'p3');
    feel(p, 'joy', 0.5, 'c');
    const r0 = p.affect.regulation;
    regulate(p, 30, 'worship');
    expect(p.affect.regulation).toBeGreaterThan(r0);
    expect(get(p, 'anger')?.intensity).toBeLessThan(0.8);
    expect(get(p, 'anger')?.intensity).toBeGreaterThan(0.6);
    expect(get(p, 'guilt')?.intensity).toBe(0.8);
    expect(get(p, 'joy')?.intensity).toBe(0.5);
    for (let i = 0; i < 2000; i++) regulate(p, 60, 'reflection');
    expect(p.affect.regulation).toBeLessThanOrEqual(0.95);
    expect(p.affect.regulation).toBeGreaterThan(0.9);
    // Diminishing returns.
    const q = makePerson();
    regulate(q, 600, 'rest');
    const g1 = q.affect.regulation - 0.3;
    regulate(q, 600, 'rest');
    const g2 = q.affect.regulation - 0.3 - g1;
    expect(g2).toBeLessThan(g1);
  });
  test('release clears guilt toward a repaired victim', () => {
    const p = makePerson();
    appraise(
      p,
      ev({ kind: 'deed', agentId: 'p1', praiseworthiness: -0.8, targetId: 'p3', cause: 'deed:norm:theft' }),
    );
    expect(get(p, 'guilt', 'p3')).toBeDefined();
    expect(actionTendencies(p)['repair:p3']).toBeGreaterThan(0);
    expect(release(p, { id: 'guilt', targetId: 'p3', causePrefix: 'norm:theft' })).toBe(1);
    expect(get(p, 'guilt')).toBeUndefined();
  });
});

describe('review fixes (2026-10-03)', () => {
  test('love toward a person pulls through approach:<id> only, not also through the general social tendency', () => {
    const p = makePerson();
    feel(p, 'love', 0.8, 'event:chat:p2', 0, 'p2');
    const t = actionTendencies(p);
    expect(t['approach:p2']).toBeGreaterThan(0.5);
    expect(t.social ?? 0).toBeCloseTo(0, 5);
    const q = makePerson();
    feel(q, 'love', 0.8, 'event:wedding', 0);
    expect(actionTendencies(q).social).toBeGreaterThan(0.3);
  });
});
