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
import type { AppraisalEvent, Person } from '../src/types.ts';
import { fullPerson } from './support.ts';

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
    const calm = fullPerson({ traits: { emotionality: 0.1 } });
    const sensitive = fullPerson({ traits: { emotionality: 0.9 } });
    appraise(calm, ev({ kind: 'outcome', desirability: -0.6, cause: 'outcome:fail:farm' }));
    appraise(sensitive, ev({ kind: 'outcome', desirability: -0.6, cause: 'outcome:fail:farm' }));
    expect(ids(calm)).toEqual(['distress']);
    expect(get(sensitive, 'distress')?.intensity).toBeGreaterThan(get(calm, 'distress')?.intensity ?? 1);
    const p = fullPerson();
    appraise(p, ev({ desirability: 0.5 }));
    expect(ids(p)).toEqual(['joy']);
  });
  test('prospects give hope/fear scaled by likelihood, confirmations give relief/disappointment', () => {
    const p = fullPerson();
    const [lo] = appraise(
      fullPerson(),
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

    const q = fullPerson();
    appraise(q, ev({ kind: 'prospect', desirability: 0.7, likelihood: 0.8, cause: 'prospect:harvest' }));
    expect(get(q, 'hope')).toBeDefined();
    appraise(q, ev({ kind: 'outcome', desirability: -0.4, cause: 'outcome:harvest:fail' }));
    expect(get(q, 'hope')).toBeUndefined();
    expect(get(q, 'disappointment')).toBeDefined();
    expect(get(q, 'distress')).toBeDefined();
  });
  test('unrelated outcome does not consume a prospect', () => {
    const p = fullPerson();
    appraise(p, ev({ kind: 'prospect', desirability: 0.7, likelihood: 0.8, cause: 'prospect:harvest' }));
    appraise(p, ev({ desirability: -0.4, cause: 'event:rain' }));
    expect(get(p, 'hope')).toBeDefined();
  });
  test('own deeds: pride, guilt when norm-related, shame otherwise; honesty raises guilt', () => {
    const p = fullPerson();
    appraise(p, ev({ kind: 'deed', agentId: 'p1', praiseworthiness: 0.6, cause: 'deed:help' }));
    expect(get(p, 'pride')).toBeDefined();
    const g = fullPerson({ traits: { honesty: 0.9 } });
    const g0 = fullPerson({ traits: { honesty: 0.1 } });
    for (const x of [g, g0])
      appraise(x, ev({ kind: 'deed', agentId: 'p1', praiseworthiness: -0.6, cause: 'deed:norm:theft' }));
    expect(ids(g)).toEqual(['guilt']);
    expect(get(g, 'guilt')?.intensity).toBeGreaterThan(get(g0, 'guilt')?.intensity ?? 1);
    const s = fullPerson();
    appraise(s, ev({ kind: 'deed', agentId: 'p1', praiseworthiness: -0.5, cause: 'deed:clumsy' }));
    expect(ids(s)).toEqual(['shame']);
  });
  test("others' deeds: anger at harmful agent (lower when agreeable), gratitude and love toward helpers", () => {
    const harsh = fullPerson({ traits: { agreeableness: 0.1 } });
    const mild = fullPerson({ traits: { agreeableness: 0.9 } });
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
    const p = fullPerson();
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
    const q = fullPerson();
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
    const p = fullPerson();
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
    const p = fullPerson();
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
    const p = fullPerson();
    feel(p, 'joy', 0.8, 'event:x', 0);
    advanceAffect(p, 90, 0.5);
    expect(get(p, 'joy')?.intensity).toBeCloseTo(0.4, 6);
    advanceAffect(p, 24 * 60, 0.5);
    expect(get(p, 'joy')).toBeUndefined();
    expect(p.affect.lastUpdated).toBe(90 + 24 * 60);
  });
  test('regulation shortens negative half-lives but not guilt', () => {
    const lo = fullPerson();
    const hi = fullPerson();
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
    const p = fullPerson();
    advanceAffect(p, 30, 1);
    expect(p.affect.mood.valence).toBeGreaterThan(0);
    expect(p.affect.mood.valence).toBeLessThan(0.1);
    advanceAffect(p, 3 * 1440, 1);
    expect(p.affect.mood.valence).toBeCloseTo(0.6, 2);
    advanceAffect(p, 3 * 1440, 0);
    expect(p.affect.mood.valence).toBeCloseTo(-0.6, 2);
  });
  test('negative emotions pull mood down and fear raises arousal', () => {
    const p = fullPerson();
    feel(p, 'fear', 0.9, 'event:x', 0);
    advanceAffect(p, 60, 0.5);
    expect(p.affect.mood.valence).toBeLessThan(0);
    expect(p.affect.mood.arousal).toBeGreaterThan(0.3);
  });
  test('closed form: exact without emotions, close with emotions', () => {
    const a = fullPerson();
    const b = fullPerson();
    advanceAffect(a, 600, 0.9);
    for (let i = 0; i < 600; i++) advanceAffect(b, 1, 0.9);
    expect(a.affect.mood.valence).toBeCloseTo(b.affect.mood.valence, 9);

    const c = fullPerson();
    const d = fullPerson();
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
      const p = fullPerson();
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
    const p = fullPerson();
    feel(p, 'joy', 0.2, 'a');
    feel(p, 'fear', 0.9, 'b');
    feel(p, 'anger', 0.5, 'c', 0, 'p2');
    feel(p, 'hope', 0.7, 'd');
    const r = readAffect(p);
    expect(r.dominant.map((e) => e.id)).toEqual(['fear', 'hope', 'anger']);
    expect(r.valence).toBeLessThan(0);
  });
  test('tendencies follow emotions', () => {
    const p = fullPerson();
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
    const harsh = fullPerson({ traits: { agreeableness: 0.1 } });
    const mild = fullPerson({ traits: { agreeableness: 0.9 } });
    for (const x of [harsh, mild]) feel(x, 'anger', 0.8, 'deed:insult', 0, 'p2');
    const th = actionTendencies(harsh);
    const tm = actionTendencies(mild);
    expect(th.confront).toBeGreaterThan(0);
    expect(th['confront:p2'] ?? 0).toBeGreaterThan(tm['confront:p2'] ?? 0);
    expect(tm['avoid:p2'] ?? 0).toBeGreaterThan(th['avoid:p2'] ?? 0);
  });
  test('headless control: a calm person has near-zero tendencies', () => {
    const t = actionTendencies(fullPerson());
    for (const v of Object.values(t)) expect(v).toBe(0);
  });
});

describe('affect/regulate and release', () => {
  test('regulation trains asymptotically and soothes negatives (not guilt)', () => {
    const p = fullPerson();
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
    const q = fullPerson();
    regulate(q, 600, 'rest');
    const g1 = q.affect.regulation - 0.3;
    regulate(q, 600, 'rest');
    const g2 = q.affect.regulation - 0.3 - g1;
    expect(g2).toBeLessThan(g1);
  });
  test('release clears guilt toward a repaired victim', () => {
    const p = fullPerson();
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
    const p = fullPerson();
    feel(p, 'love', 0.8, 'event:chat:p2', 0, 'p2');
    const t = actionTendencies(p);
    expect(t['approach:p2']).toBeGreaterThan(0.5);
    expect(t.social ?? 0).toBeCloseTo(0, 5);
    const q = fullPerson();
    feel(q, 'love', 0.8, 'event:wedding', 0);
    expect(actionTendencies(q).social).toBeGreaterThan(0.3);
  });
});
