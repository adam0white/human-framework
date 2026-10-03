import { describe, expect, test } from 'vitest';
import { createRng } from '../src/core/index.ts';
import {
  advanceSocial,
  closeness,
  defaultRelationship,
  ensureRelationship,
  judge,
  relationshipWith,
  SOCIAL_DEFAULTS,
  seedRelationships,
  socialEvent,
  socialTerms,
} from '../src/social/index.ts';
import type { Affordance, HeldNorm, Person, Traits } from '../src/types.ts';

/** Minimal person fixture: only the slices social reads are meaningful. */
function person(traits: Partial<Traits> = {}, benevolence = 0.5): Person {
  return {
    id: 'me',
    now: 0,
    rng: createRng(1),
    traits: {
      honesty: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
      ...traits,
    },
    values: { benevolence },
    social: { relationships: [] },
  } as unknown as Person;
}

const talk = (id: string, extra: Partial<Affordance> = {}): Affordance => ({
  id: `talk-${id}`,
  action: 'talk',
  label: 'Talk',
  with: [id],
  duration: 30,
  effort: 0.1,
  advertises: { belonging: 0.2 },
  tags: ['social'],
  ...extra,
});
const term = (terms: { source: string; value: number }[], source: string) =>
  terms.find((t) => t.source === source)?.value ?? 0;

describe('social/relationships', () => {
  test('defaults, read-only lookup and insertion', () => {
    const p = person();
    expect(defaultRelationship('x', 5)).toEqual({
      otherId: 'x',
      affection: 0,
      trust: 0.5,
      respect: 0,
      familiarity: 0,
      roles: [],
      ledger: 0,
      lastInteraction: 5,
    });
    relationshipWith(p, 'x').affection = 1;
    expect(p.social.relationships).toHaveLength(0);
    ensureRelationship(p, 'x', 0);
    ensureRelationship(p, 'x', 0);
    expect(p.social.relationships).toHaveLength(1);
  });

  test('bounded at 80, evicting the least familiar non-role tie', () => {
    const specs = Array.from({ length: 80 }, (_, i) => ({
      otherId: `p${String(i).padStart(2, '0')}`,
      familiarity: 0.5 + i / 1000,
    }));
    specs[0] = { otherId: 'p00', familiarity: 0.5 };
    const p = person();
    p.social = seedRelationships([...specs, { otherId: 'mum', roles: ['parent'], familiarity: 0 }], 0);
    expect(p.social.relationships).toHaveLength(80);
    expect(p.social.relationships.some((r) => r.otherId === 'p00')).toBe(false);
    ensureRelationship(p, 'newcomer', 0);
    expect(p.social.relationships).toHaveLength(80);
    expect(p.social.relationships.some((r) => r.otherId === 'mum')).toBe(true);
  });

  test('roles imply baselines unless overridden', () => {
    const s = seedRelationships(
      [
        { otherId: 'w', roles: ['spouse'] },
        { otherId: 'b', roles: ['sibling'], affection: -0.2 },
        { otherId: 's', roles: [] },
      ],
      0,
    );
    const [w, b, st] = s.relationships;
    expect(w?.affection).toBeGreaterThan(0.5);
    expect(w?.familiarity).toBeGreaterThan(0.8);
    expect(b?.affection).toBe(-0.2);
    expect(b?.familiarity).toBeGreaterThan(0.5);
    expect(st?.affection).toBe(0);
  });
});

describe('social/socialEvent', () => {
  test('negativity bias: harm moves affection ~2x as far as an equal help', () => {
    const p = person();
    const help = socialEvent(p, { at: 0, kind: 'help', otherId: 'a', byMe: false, magnitude: 0.8 }).affection;
    const harm = socialEvent(p, { at: 0, kind: 'harm', otherId: 'b', byMe: false, magnitude: 0.8 }).affection;
    expect(help).toBeGreaterThan(0);
    expect(-harm / help).toBeCloseTo(SOCIAL_DEFAULTS.negativityBias, 5);
    // A help followed by an equal harm leaves the tie worse than neutral.
    const q = person();
    socialEvent(q, { at: 0, kind: 'help', otherId: 'c', byMe: false, magnitude: 0.8 });
    const after = socialEvent(q, { at: 1, kind: 'harm', otherId: 'c', byMe: false, magnitude: 0.8 });
    expect(after.affection).toBeLessThan(0);
  });

  test('discovered deceit drops trust more for a high honesty-humility person', () => {
    const hi = person({ honesty: 0.9 });
    const lo = person({ honesty: 0.1 });
    const ev = { at: 0, kind: 'deceit-discovered' as const, otherId: 'liar', byMe: false, magnitude: 1 };
    expect(socialEvent(hi, ev).trust).toBeLessThan(socialEvent(lo, ev).trust);
    expect(relationshipWith(hi, 'liar').trust).toBeLessThan(0.5);
  });

  test('agreeableness softens anger at insults', () => {
    const soft = person({ agreeableness: 0.9 });
    const hard = person({ agreeableness: 0.1 });
    const ev = { at: 0, kind: 'insult' as const, otherId: 'x', byMe: false, magnitude: 1 };
    expect(socialEvent(soft, ev).affection).toBeGreaterThan(socialEvent(hard, ev).affection);
  });

  test('ledger: helping makes them owe me; being helped makes me owe them', () => {
    const p = person();
    expect(socialEvent(p, { at: 0, kind: 'help', otherId: 'a', byMe: true, magnitude: 1 }).ledger).toBe(1);
    expect(socialEvent(p, { at: 0, kind: 'help', otherId: 'b', byMe: false, magnitude: 1 }).ledger).toBe(-1);
  });

  test('forgiving restores part of lost trust and affection', () => {
    const p = person();
    socialEvent(p, { at: 0, kind: 'harm', otherId: 'a', byMe: false, magnitude: 1 });
    const hurt = { ...relationshipWith(p, 'a') };
    const after = socialEvent(p, { at: 1, kind: 'forgive', otherId: 'a', byMe: true, magnitude: 1 });
    expect(after.affection).toBeGreaterThan(hurt.affection);
    expect(after.affection).toBeLessThan(0);
    expect(after.trust).toBeGreaterThan(hurt.trust);
  });

  test('familiarity grows with diminishing increments and stays bounded', () => {
    const p = person();
    const gains: number[] = [];
    let prev = 0;
    for (let i = 0; i < 100; i++) {
      const f = socialEvent(p, {
        at: i,
        kind: 'shared-work',
        otherId: 'a',
        byMe: true,
        magnitude: 1,
      }).familiarity;
      gains.push(f - prev);
      prev = f;
    }
    expect(gains[1]).toBeLessThan(gains[0] ?? 0);
    expect(prev).toBeLessThanOrEqual(1);
    expect(prev).toBeGreaterThan(0.9);
    const r = relationshipWith(p, 'a');
    expect(r.affection).toBeLessThanOrEqual(1);
    expect(r.trust).toBeLessThanOrEqual(1);
  });

  test('is deterministic', () => {
    const run = () => {
      const p = person();
      const kinds = ['help', 'insult', 'chat', 'gift', 'conflict', 'praise'] as const;
      kinds.forEach((kind, i) => {
        socialEvent(p, { at: i, kind, otherId: i % 2 ? 'a' : 'b', byMe: i % 3 === 0, magnitude: 0.6 });
      });
      return JSON.stringify(p.social);
    };
    expect(run()).toBe(run());
  });
});

describe('social/advanceSocial', () => {
  test('affection drifts ~1%/week for non-role ties; family keeps familiarity', () => {
    const p = person();
    p.social = seedRelationships(
      [
        { otherId: 'acq', affection: 0.5, familiarity: 0.5 },
        { otherId: 'mum', roles: ['parent'] },
      ],
      0,
    );
    const mumBefore = { ...relationshipWith(p, 'mum') };
    advanceSocial(p, 7 * 1440);
    expect(relationshipWith(p, 'acq').affection).toBeCloseTo(0.495, 6);
    expect(relationshipWith(p, 'acq').familiarity).toBeLessThan(0.5);
    expect(relationshipWith(p, 'mum').familiarity).toBe(mumBefore.familiarity);
    expect(relationshipWith(p, 'mum').affection).toBe(mumBefore.affection);
  });

  test('closed form: 1 x 600 min equals 600 x 1 min', () => {
    const mk = () => {
      const p = person();
      p.social = seedRelationships([{ otherId: 'a', affection: -0.7, familiarity: 0.8 }], 0);
      return p;
    };
    const a = mk();
    const b = mk();
    advanceSocial(a, 600);
    for (let i = 0; i < 600; i++) advanceSocial(b, 1);
    expect(relationshipWith(b, 'a').affection).toBeCloseTo(relationshipWith(a, 'a').affection, 10);
    expect(relationshipWith(b, 'a').familiarity).toBeCloseTo(relationshipWith(a, 'a').familiarity, 10);
  });
});

describe('social/judge', () => {
  const theftForbidden: HeldNorm[] = [{ normId: 'theft', standing: 'forbidden', conviction: 0.9 }];
  const theft = { actorId: 'thief', norms: [{ normId: 'theft', relation: 'violates' as const }] };

  test("uses the observer's own norms: a person without the norm does not care", () => {
    const holder = person();
    const indifferent = person();
    const r1 = judge(holder, theft, theftForbidden, 0);
    const r2 = judge(indifferent, theft, [], 0);
    expect(r1.praiseworthiness).toBeLessThan(-0.5);
    expect(relationshipWith(holder, 'thief').respect).toBeLessThan(0);
    expect(relationshipWith(holder, 'thief').trust).toBeLessThan(0.5);
    expect(r2.praiseworthiness).toBe(0);
    expect(indifferent.social.relationships).toHaveLength(0);
  });

  test('conviction scales the judgement; fulfilment raises respect', () => {
    const weak = person();
    judge(weak, theft, [{ normId: 'theft', standing: 'forbidden', conviction: 0.2 }], 0);
    const strong = person();
    judge(strong, theft, theftForbidden, 0);
    expect(relationshipWith(strong, 'thief').respect).toBeLessThan(relationshipWith(weak, 'thief').respect);
    const p = person();
    const r = judge(
      p,
      { actorId: 'giver', norms: [{ normId: 'charity', relation: 'fulfills' }] },
      [{ normId: 'charity', standing: 'recommended', conviction: 1 }],
      0,
    );
    expect(r.praiseworthiness).toBeGreaterThan(0);
    expect(relationshipWith(p, 'giver').respect).toBeGreaterThan(0);
  });

  test('judging oneself changes no relationship', () => {
    const p = person();
    const r = judge(p, { ...theft, actorId: 'me' }, theftForbidden, 0);
    expect(r.praiseworthiness).toBeLessThan(0);
    expect(p.social.relationships).toHaveLength(0);
  });
});

describe('social/socialTerms', () => {
  const setup = (belongingUrgency: number) => {
    const p = person();
    p.social = seedRelationships(
      [
        { otherId: 'friend', affection: 0.7, familiarity: 0.7 },
        { otherId: 'rival', affection: -0.6, familiarity: 0.7 },
      ],
      0,
    );
    const ctx = { belongingUrgency, tendencies: {} };
    return {
      p,
      friend: term(socialTerms(p, talk('friend'), ctx), 'social:friend'),
      rival: term(socialTerms(p, talk('rival'), ctx), 'social:rival'),
    };
  };

  test('lonely person is pulled toward a liked partner and away from a disliked one', () => {
    const lonely = setup(0.9);
    const content = setup(0.05);
    expect(lonely.friend).toBeGreaterThan(0);
    expect(lonely.rival).toBeLessThan(0);
    expect(lonely.friend).toBeGreaterThan(content.friend);
    expect(lonely.rival).toBeCloseTo(content.rival, 1);
  });

  test('approach/avoid tendencies and benevolence toward family when helping', () => {
    const p = person({}, 0.9);
    p.social = seedRelationships([{ otherId: 'kid', roles: ['child'] }], 0);
    const help: Affordance = {
      ...talk('kid'),
      id: 'help-kid',
      action: 'help',
      with: [],
      targetId: 'kid',
      tags: ['help'],
    };
    const base = term(socialTerms(p, help, { belongingUrgency: 0, tendencies: {} }), 'social:kid');
    const avoid = term(
      socialTerms(p, help, { belongingUrgency: 0, tendencies: { 'avoid:kid': 0.3 } }),
      'social:kid',
    );
    const lowBen = person({}, 0.1);
    lowBen.social = p.social;
    const lowBenTerm = term(socialTerms(lowBen, help, { belongingUrgency: 0, tendencies: {} }), 'social:kid');
    expect(base).toBeGreaterThan(lowBenTerm);
    expect(avoid).toBeCloseTo(base - 0.3, 4);
    // Unknown targets are not added through targetId.
    expect(
      socialTerms(p, { ...help, targetId: 'stranger' }, { belongingUrgency: 0, tendencies: {} }),
    ).toEqual([]);
  });

  test('large groups cost introverts and please extraverts', () => {
    const party = talk('a', { with: ['a', 'b', 'c', 'd', 'e'] });
    const ctx = { belongingUrgency: 0.3, tendencies: {} };
    expect(term(socialTerms(person({ extraversion: 0.1 }), party, ctx), 'social:group')).toBeLessThan(0);
    expect(term(socialTerms(person({ extraversion: 0.9 }), party, ctx), 'social:group')).toBeGreaterThan(0);
    expect(socialTerms(person(), talk('a'), ctx).some((t) => t.source === 'social:group')).toBe(false);
  });

  test('headless control: relationship-aware terms separate friend from rival; a flat social bonus cannot', () => {
    const { friend, rival } = setup(0.6);
    const flat = (_id: string) => 0.6 * 0.5; // trivial alternative: belonging urgency x constant
    expect(friend - rival).toBeGreaterThan(0.5);
    expect(flat('friend') - flat('rival')).toBe(0);
  });
});

describe('social/closeness', () => {
  test('family and liked familiar ties are closer than strangers', () => {
    const p = person();
    p.social = seedRelationships(
      [
        { otherId: 'w', roles: ['spouse'] },
        { otherId: 'n', roles: ['neighbor'] },
      ],
      0,
    );
    expect(closeness(p, 'w')).toBeGreaterThan(closeness(p, 'n'));
    expect(closeness(p, 'n')).toBeGreaterThan(closeness(p, 'nobody'));
    expect(closeness(p, 'w')).toBeLessThanOrEqual(1);
  });
});
