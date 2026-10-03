import { describe, expect, test } from 'vitest';
import { believe } from '../src/beliefs/index.ts';
import {
  advanceSocial,
  applyReputationBelief,
  deceasedIds,
  isDeceased,
  markDeceased,
  parseTraitProp,
  reputation,
  seedRelationships,
  socialEvent,
  socialTerms,
} from '../src/social/index.ts';
import { MINUTES_PER_DAY } from '../src/types.ts';
import { lanePerson } from './lane-fixture.ts';

describe('bereavement ties', () => {
  test('markDeceased keeps roles and affection, freezes the tie against drift and events', () => {
    const p = lanePerson('halil', {
      relationships: seedRelationships([{ otherId: 'nuran', roles: ['spouse'] }], 0).relationships,
    });
    const rel = markDeceased(p, 'nuran', 100);
    expect(rel.roles).toEqual(['spouse', 'deceased']);
    expect(rel.deceasedAt).toBe(100);
    expect(isDeceased(p, 'nuran')).toBe(true);
    expect(deceasedIds(p)).toEqual(['nuran']);
    const before = { ...rel, roles: [...rel.roles] };
    advanceSocial(p, 400 * MINUTES_PER_DAY);
    socialEvent(p, { at: 200, kind: 'insult', otherId: 'nuran', byMe: false, magnitude: 1 });
    expect(p.social.relationships[0]).toEqual(before);
    // Idempotent; the earlier death minute is kept.
    markDeceased(p, 'nuran', 500);
    expect(p.social.relationships[0]?.deceasedAt).toBe(100);
    expect(p.social.relationships[0]?.roles.filter((r) => r === 'deceased')).toHaveLength(1);
  });

  test('a non-family deceased friend keeps familiarity (no two-year fade)', () => {
    const p = lanePerson('halil', {
      relationships: seedRelationships([{ otherId: 'old', roles: ['friend'] }], 0).relationships,
    });
    markDeceased(p, 'old', 0);
    const f = p.social.relationships[0]?.familiarity;
    advanceSocial(p, 1000 * MINUTES_PER_DAY);
    expect(p.social.relationships[0]?.familiarity).toBe(f);
  });

  test('no company term for an option with someone who has died', () => {
    const p = lanePerson('halil', {
      relationships: seedRelationships([{ otherId: 'nuran', roles: ['spouse'] }], 0).relationships,
    });
    const aff = {
      id: 'a',
      action: 'talk',
      label: 'Talk',
      with: ['nuran'],
      duration: 10,
      effort: 0,
      advertises: {},
      tags: ['social'],
    };
    expect(socialTerms(p, aff, { belongingUrgency: 0.5, tendencies: {} })).toHaveLength(1);
    markDeceased(p, 'nuran', 0);
    expect(socialTerms(p, aff, { belongingUrgency: 0.5, tendencies: {} })).toEqual([]);
  });
});

describe('hearsay moves relationships; reputation aggregates beliefs', () => {
  test('parseTraitProp recognises character propositions only', () => {
    expect(parseTraitProp('riza:dishonest')).toEqual({ personId: 'riza', trait: 'dishonest' });
    expect(parseTraitProp('halil:owes:osman')).toEqual({ personId: 'halil', trait: 'owes' });
    expect(parseTraitProp('stock:well:empty')).toBeUndefined();
    expect(parseTraitProp('dishonest')).toBeUndefined();
  });

  test('a rise in credence that p3 is dishonest lowers trust and respect; strangers move more than intimates', () => {
    const stranger = lanePerson('a');
    const intimate = lanePerson('b', {
      relationships: seedRelationships([{ otherId: 'p3', roles: ['friend'], familiarity: 1 }], 0)
        .relationships,
    });
    const t0 = intimate.social.relationships[0]?.trust ?? 0;
    const relS = applyReputationBelief(stranger, 'p3:dishonest', 0.5, 0.8, 0);
    const relI = applyReputationBelief(intimate, 'p3:dishonest', 0.5, 0.8, 0);
    expect(relS?.trust).toBeLessThan(0.5);
    expect(relS?.respect).toBeLessThan(0);
    expect(0.5 - (relS?.trust ?? 0)).toBeGreaterThan(t0 - (relI?.trust ?? 0));
    expect(applyReputationBelief(stranger, 'p3:dishonest', 0.8, 0.8, 0)).toBeNull();
    expect(applyReputationBelief(stranger, 'a:dishonest', 0.5, 0.9, 0)).toBeNull();
    expect(applyReputationBelief(stranger, 'weather:rain', 0.5, 0.9, 0)).toBeNull();
  });

  test("reputation reads others' relationships and beliefs without changing anyone", () => {
    const a = lanePerson('a', {
      relationships: seedRelationships([{ otherId: 't', trust: 0.2, respect: -0.4, familiarity: 0.8 }], 0)
        .relationships,
    });
    const b = lanePerson('b');
    believe(b, 't:dishonest', true, 0.9, 'a', 0);
    const t = lanePerson('t');
    believe(t, 't:honest', true, 0.9, 't', 0); // own view does not count
    const snap = JSON.stringify([a, b, t]);
    const r = reputation([t, b, a], 't');
    expect(JSON.stringify([a, b, t])).toBe(snap);
    expect(r.knownBy).toBe(2);
    expect(r.trust).toBeCloseTo(0.2, 6);
    expect(r.standing).toBeLessThan(0);
    expect(r.traits.dishonest).toBeGreaterThan(0.5);
    expect(r.traits.honest).toBeUndefined();
    expect(reputation([a, b], 'nobody')).toEqual({
      targetId: 'nobody',
      knownBy: 0,
      standing: 0,
      trust: 0.5,
      respect: 0,
      traits: {},
    });
  });
});
