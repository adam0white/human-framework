import { describe, expect, test } from 'vitest';
import { testimonyWeight } from '../src/beliefs/beliefs.ts';
import { round } from '../src/core/index.ts';
import {
  type Affordance,
  createPerson,
  decide,
  hear,
  MINUTES_PER_DAY,
  MINUTES_PER_YEAR,
  markDeceased,
  type Percept,
  perceive,
  restore,
  seedSourceTrust,
  snapshot,
  socialTerms,
} from '../src/index.ts';
import { IMPRESSION_DEFAULTS, noteKnownBy, regardOf } from '../src/social/impressions.ts';
import { SOCIAL_DEFAULTS } from '../src/social/social.ts';

const NOW = 600;
const make = () =>
  createPerson({
    id: 'A',
    name: 'A',
    seed: 1,
    now: NOW,
    bornAt: -30 * MINUTES_PER_YEAR,
    sex: 'female',
    traits: { agreeableness: 0.5 },
  });
const broken = (witnesses?: string[]): Percept => ({
  kind: 'promise-broken',
  summary: 'I broke my promise to B',
  actorId: 'A',
  targetId: 'B',
  channel: 'saw',
  at: NOW,
  salience: 1,
  ...(witnesses === undefined ? {} : { witnesses }),
});
const offer = (over: Partial<Affordance> = {}): Affordance => ({
  id: 'repair',
  label: 'Make repair',
  action: 'talk',
  targetId: 'B',
  tags: ['repair'],
  duration: 5,
  effort: 0,
  focus: 0,
  advertises: {},
  ...over,
});
const ctx = { belongingUrgency: 0, tendencies: {} };
const repairTerm = (p: ReturnType<typeof make>, aff = offer()) =>
  socialTerms(p, aff, ctx).find((t) => t.source === 'regard:B');

describe('believed regard (2.10.0)', () => {
  test('seen promise-breaking lowers regard more for the promisee than for a third-party witness', () => {
    const p = make();
    perceive(p, [broken(['B', 'C'])]);
    expect(regardOf(p, 'B', NOW)).toEqual({ value: -0.6, confidence: round(2 / 3.5), seenAt: NOW });
    expect(regardOf(p, 'C', NOW).value).toBe(-0.3);
    expect(regardOf(p, 'C', NOW).confidence).toBe(regardOf(p, 'B', NOW).confidence);
    const term = repairTerm(p);
    expect(term).toEqual({ source: 'regard:B', value: round(0.5 * 0.6 * round(2 / 3.5)) });
    expect(term?.value).toBeGreaterThan(0);
  });

  test('the regard term alone tips a close decision toward repair', () => {
    const p = make();
    perceive(p, [broken(['B'])]);
    const without = restore(snapshot(p));
    // Remove only the new evidence, retaining all other consequences of the attended act.
    delete without.social.impressions;
    const repair = offer({ effort: 0.1 });
    const ordinary = offer({ id: 'ordinary', tags: [], targetId: undefined });
    expect(decide(without, [ordinary, repair]).chosenAffordanceId).toBe('ordinary');
    expect(decide(p, [ordinary, repair]).chosenAffordanceId).toBe('repair');
  });

  test('a trusted report moves regard; missing or untrusted sources write nothing', () => {
    const p = make();
    const before = snapshot(p);
    expect(
      noteKnownBy(p, { otherId: 'B', act: { kind: 'harm', targetId: 'B' }, via: 'told' }),
    ).toBeUndefined();
    expect(p).toEqual(before);
    seedSourceTrust(p, 'D', 0.1);
    const untrusted = snapshot(p);
    expect(
      noteKnownBy(p, { otherId: 'B', act: { kind: 'harm' }, via: 'told', sourceId: 'D' }),
    ).toBeUndefined();
    expect(p).toEqual(untrusted);
    seedSourceTrust(p, 'D', 0.8);
    const e = noteKnownBy(p, {
      otherId: 'B',
      act: { kind: 'harm', targetId: 'B' },
      via: 'told',
      sourceId: 'D',
    });
    const weight = 2 * testimonyWeight(0.8);
    expect(e?.value).toBe(-0.6);
    expect(e?.confidence).toBeCloseTo(weight / (weight + IMPRESSION_DEFAULTS.priorWeight), 5);
  });

  test('a secret witness and an unlearned relay leave regard at the prior', () => {
    const p = make();
    const before = regardOf(p, 'C', NOW);
    // C is present in the host world, but A only saw B see the act. A hears no relay to C.
    perceive(p, [broken(['B'])]);
    expect(regardOf(p, 'C', NOW)).toEqual(before);
    expect(p.social.impressions?.map((i) => i.targetId)).toEqual(['B']);
  });

  test('attention drops an own-act percept before it can form regard', () => {
    const p = make();
    const distractions: Percept[] = Array.from({ length: 12 }, (_, i) => ({
      kind: `noise:${i}`,
      summary: 'A nearby sound',
      at: NOW,
      channel: 'saw',
      salience: 0.8,
    }));
    const unnoticed = { ...broken(['B']), salience: 0 };
    const attended = perceive(p, [...distractions, unnoticed]);
    expect(attended).not.toContain(unnoticed);
    expect(regardOf(p, 'B', NOW)).toEqual({ value: 0, confidence: 0 });
    expect(p.social.impressions).toBeUndefined();
  });

  test('an impression without a regard cue leaves every social term unchanged', () => {
    const p = make();
    const aff = offer({ tags: ['repair', 'social'], with: ['B', 'C', 'D'] });
    const before = socialTerms(p, aff, ctx);
    hear(p, 'B', 'tie:A', -0.9, NOW, 1);
    hear(p, 'B', 'fear', 0.9, NOW, 1);
    expect(socialTerms(p, aff, ctx)).toEqual(before);
    expect(repairTerm(p)).toBeUndefined();
  });

  test.each(['apology', 'amends'])('%s action needs no repair tag', (action) => {
    const p = make();
    perceive(p, [broken(['B'])]);
    expect(repairTerm(p, offer({ action, tags: [] }))?.value).toBeGreaterThan(0);
  });

  test('ordinary offers, a different target, and the dead get no regard term, without any lens call', () => {
    const p = make();
    perceive(p, [broken(['B'])]);
    expect(repairTerm(p, offer({ tags: [] }))).toBeUndefined();
    expect(socialTerms(p, offer({ targetId: 'C' }), ctx).some((t) => t.source.startsWith('regard:'))).toBe(
      false,
    );
    markDeceased(p, 'B', NOW);
    expect(repairTerm(p)).toBeUndefined();
  });

  test('repair is bounded by regardRepairMax and scales with agreeableness', () => {
    const p = make();
    perceive(p, [broken(['B'])]);
    const base = repairTerm(p)?.value ?? 0;
    p.traits.agreeableness = 1;
    expect(repairTerm(p)?.value).toBeCloseTo(1.5 * base, 5);
    for (let i = 0; i < 12; i++)
      noteKnownBy(p, { otherId: 'B', act: { kind: 'harm', valence: -1, targetId: 'B' }, via: 'seen' });
    expect(repairTerm(p)?.value).toBe(SOCIAL_DEFAULTS.terms.regardRepairMax);
  });

  test('own held norms enter the projection without changing relationships or conscience', () => {
    const p = make();
    p.conscience.norms.push({ normId: 'keeping-promises', standing: 'obligatory', conviction: 1 });
    const before = snapshot(p);
    noteKnownBy(p, {
      otherId: 'B',
      via: 'seen',
      act: {
        kind: 'promise-broken',
        targetId: 'B',
        norms: [{ normId: 'keeping-promises', relation: 'violates' }],
      },
    });
    expect(regardOf(p, 'B', NOW).value).toBe(-0.9);
    expect(p.social.relationships).toEqual(before.social.relationships);
    expect(p.conscience).toEqual(before.conscience);
    expect(p.rng).toEqual(before.rng);
  });

  test.each(['constructor', 'toString', '__proto__'])(
    'unknown kind %s still carries held-norm judgement',
    (kind) => {
      const p = make();
      p.conscience.norms.push({ normId: 'keeping-promises', standing: 'obligatory', conviction: 1 });
      noteKnownBy(p, {
        otherId: 'B',
        via: 'seen',
        act: {
          kind,
          targetId: 'B',
          norms: [{ normId: 'keeping-promises', relation: 'violates' }],
        },
      });
      expect(regardOf(p, 'B', NOW).value).toBe(-0.3);
    },
  );

  test.each([
    ['promise-broken', -0.6],
    ['promise-kept', 0.3],
    ['harm', -0.6],
    ['help', 0.4],
    ['apology', 0.2],
    ['unknown', 0],
  ] as const)('%s uses its default valence and only negative evidence gets doubled weight', (kind, value) => {
    const p = make();
    noteKnownBy(p, { otherId: 'B', via: 'seen', act: { kind, targetId: 'B' } });
    expect(regardOf(p, 'B', NOW).value).toBe(value);
    const weight = value < 0 ? 2 : 1;
    expect(regardOf(p, 'B', NOW).confidence).toBe(round(weight / (weight + 1.5)));
    if (value >= 0) expect(repairTerm(p)).toBeUndefined();
  });

  test('reads are pure and confidence decays over 60 days', () => {
    const p = make();
    noteKnownBy(p, { otherId: 'B', via: 'seen', act: { kind: 'help', valence: -0.8, targetId: 'B' } });
    const before = snapshot(p);
    expect(regardOf(p, 'B', NOW + 60 * MINUTES_PER_DAY)).toEqual({
      value: -0.8,
      confidence: 0.4,
      seenAt: NOW,
    });
    regardOf(p, 'unknown', NOW);
    socialTerms(p, offer(), ctx);
    expect(p).toEqual(before);
  });

  test('self witnesses are ignored', () => {
    const p = make();
    const before = snapshot(p);
    expect(noteKnownBy(p, { otherId: 'A', via: 'seen', act: { kind: 'harm' } })).toBeUndefined();
    expect(p).toEqual(before);
  });

  test('restore preserves a negative regard cue and clamps it to the signed range', () => {
    const p = make();
    perceive(p, [broken(['B'])]);
    const saved = snapshot(p);
    expect(restore(saved).social.impressions).toEqual(p.social.impressions);
    expect(regardOf(restore(saved), 'B', NOW)).toEqual(regardOf(p, 'B', NOW));
    const cue = saved.social.impressions?.[0]?.cues.find((c) => c.key === 'regard');
    if (!cue) throw new Error('missing regard cue');
    cue.mean = -5;
    expect(regardOf(restore(saved), 'B', NOW).value).toBe(-1);
    cue.mean = 5;
    expect(regardOf(restore(saved), 'B', NOW).value).toBe(1);
  });
});
