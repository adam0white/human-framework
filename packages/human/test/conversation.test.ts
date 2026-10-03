import { describe, expect, test } from 'vitest';
import { believe, confirm, credence } from '../src/beliefs/index.ts';
import { converse } from '../src/conversation/index.ts';
import {
  applyReputationBelief,
  judge,
  markDeceased,
  relationshipWith,
  reputation,
} from '../src/social/index.ts';
import type { HeldNorm, Percept, Person } from '../src/types.ts';
import { lanePerson } from './lane-fixture.ts';

const holdsBackbiting: HeldNorm[] = [{ normId: 'backbiting', standing: 'forbidden', conviction: 0.9 }];
const holdsLying: HeldNorm[] = [{ normId: 'lying', standing: 'forbidden', conviction: 0.9 }];

/**
 * What the composite will do with a told percept once integrated: believe each claim from the speaker, move the
 * relationship with the claim's subject, and judge the outward act by the listener's own norms.
 */
function hear(listener: Person, percepts: Percept[]): void {
  for (const pc of percepts) {
    for (const c of pc.claims ?? []) {
      const before = credence(listener, c.prop);
      believe(listener, c.prop, c.value, c.confidence, pc.actorId ?? 'rumour', pc.at);
      applyReputationBelief(listener, c.prop, before, credence(listener, c.prop), pc.at);
    }
    if (pc.norms && pc.actorId) {
      const obs: Parameters<typeof judge>[1] = { actorId: pc.actorId, norms: pc.norms };
      if (pc.targetId !== undefined) obs.targetId = pc.targetId;
      if (pc.valence !== undefined) obs.valence = pc.valence;
      judge(listener, obs, listener.conscience.norms, pc.at);
    }
  }
}

describe('converse', () => {
  test("tells confident beliefs at the speaker's credence, never uncertain ones or ones about the listener", () => {
    const s = lanePerson('hacer');
    believe(s, 'well:dry', true, 0.95, s.id, 0);
    believe(s, 'bus:late', true, 0.55, s.id, 0);
    believe(s, 'halil:lazy', true, 0.95, s.id, 0);
    const r = converse(s, lanePerson('halil'), { at: 10 });
    expect(r.claims.map((c) => c.prop)).toEqual(['well:dry']);
    expect(r.told[0]?.claims?.[0]?.confidence).toBeCloseTo(credence(s, 'well:dry'), 3);
    expect(r.told[0]?.channel).toBe('told');
    expect(r.told[0]?.actorId).toBe('hacer');
    expect(r.deceit).toBe(false);
    expect(r.socialEvents.speaker[0]).toMatchObject({ kind: 'chat', otherId: 'halil', byMe: true });
    expect(r.socialEvents.listener[0]).toMatchObject({ kind: 'chat', otherId: 'hacer', byMe: false });
  });

  test('pure: neither person changes; deterministic', () => {
    const s = lanePerson('a');
    believe(s, 'p3:dishonest', true, 0.95, 's', 0);
    const l = lanePerson('b');
    const snap = JSON.stringify([s, l]);
    expect(converse(s, l, { at: 5 })).toEqual(converse(s, l, { at: 5 }));
    expect(JSON.stringify([s, l])).toBe(snap);
  });

  test('backbiting is tagged; a speaker who firmly holds the norm withholds it, one who does not tells it', () => {
    const loose = lanePerson('riza');
    const firm = lanePerson('yakup', { norms: holdsBackbiting, traits: { honesty: 0.8 } });
    for (const s of [loose, firm]) believe(s, 'osman:stingy', true, 0.95, s.id, 0);
    const told = converse(loose, lanePerson('halil'), { at: 1 });
    expect(told.claims[0]).toMatchObject({ prop: 'osman:stingy', backbiting: true, about: 'osman' });
    expect(told.told[0]?.norms).toEqual([{ normId: 'backbiting', relation: 'violates' }]);
    expect(told.norms).toEqual([{ normId: 'backbiting', relation: 'violates' }]);
    const held = converse(firm, lanePerson('halil'), { at: 1 });
    expect(held.claims).toEqual([]);
    expect(held.withheld).toContainEqual({ prop: 'osman:stingy', reason: 'norm:backbiting' });
    // Favourable news about a third party is not backbiting and is told by both.
    believe(firm, 'osman:generous', false, 0.05, 'yakup', 0); // i.e. believes he IS generous
    expect(converse(firm, lanePerson('halil'), { at: 1 }).claims.map((c) => c.prop)).toEqual([
      'osman:generous',
    ]);
  });

  test('deceit: low honesty-humility asserts a false advantageous claim; high honesty or a held lying norm does not', () => {
    const temptations = [{ prop: 'shop:rent-paid', value: true, gain: 0.8 }];
    const liar = lanePerson('l', { traits: { honesty: 0.1 } });
    const honest = lanePerson('h', { traits: { honesty: 0.9 } });
    const lowButHolds = lanePerson('n', { traits: { honesty: 0.3 }, norms: holdsLying });
    for (const s of [liar, honest, lowButHolds]) believe(s, 'shop:rent-paid', false, 0.95, s.id, 0);
    const lie = converse(liar, lanePerson('osman'), { at: 1, temptations });
    expect(lie.deceit).toBe(true);
    expect(lie.claims[0]).toMatchObject({ prop: 'shop:rent-paid', value: true, deceit: true });
    expect(lie.claims[0]?.speakerCredence).toBeLessThan(0.5);
    expect(lie.norms).toContainEqual({ normId: 'lying', relation: 'violates' });
    // The listener cannot see the lie.
    expect(lie.told[0]?.norms).toBeUndefined();
    for (const s of [honest, lowButHolds]) {
      const r = converse(s, lanePerson('osman'), { at: 1, temptations });
      expect(r.deceit).toBe(false);
      expect(r.claims.some((c) => c.prop === 'shop:rent-paid' && c.value)).toBe(false);
    }
  });

  test("advice: the speaker's belief that the listener should act becomes a told advice claim and a suggestion", () => {
    const selin = lanePerson('selin', { values: { benevolence: 0.8 } });
    selin.social.relationships.push({
      ...relationshipWith(selin, 'halil'),
      affection: 0.8,
      roles: ['parent'],
    });
    believe(selin, 'halil:should:see-doctor', true, 0.95, 'selin', 0);
    believe(selin, 'halil:should:sell-shop', true, 0.6, 'selin', 0);
    const r = converse(selin, lanePerson('halil'), { at: 3, placeId: 'phone' });
    expect(r.advice).toHaveLength(1);
    const a = r.advice[0];
    expect(a?.action).toBe('see-doctor');
    expect(a?.percept.claims?.[0]?.prop).toBe('advice:see-doctor');
    expect(a?.percept.placeId).toBe('phone');
    expect(a?.suggestion).toMatchObject({ voiceId: 'selin', action: 'see-doctor', appeal: 'benevolence' });
    expect(a?.suggestion.strength).toBeGreaterThan(0.3);
    // A cold acquaintance pushes less.
    const cold = lanePerson('osman');
    believe(cold, 'halil:should:see-doctor', true, 0.95, 'osman', 0);
    expect(converse(cold, lanePerson('halil'), { at: 3 }).advice[0]?.suggestion.strength).toBeLessThan(
      a?.suggestion.strength ?? 0,
    );
  });

  test('nobody converses with the dead', () => {
    const s = lanePerson('halil');
    believe(s, 'well:dry', true, 0.95, 's', 0);
    markDeceased(s, 'nuran', 0);
    expect(converse(s, lanePerson('nuran'), { at: 1 }).told).toEqual([]);
    const dead = lanePerson('x');
    (dead.body as { alive: boolean }).alive = false;
    expect(converse(s, dead, { at: 1 }).told).toEqual([]);
  });

  test('gossip chain: reputation emerges from beliefs spreading person to person', () => {
    const riza = lanePerson('riza', { traits: { extraversion: 0.9 } });
    const hacer = lanePerson('hacer', { traits: { extraversion: 0.9 } });
    const halil = lanePerson('halil');
    const osman = lanePerson('osman');
    hacer.memory.sourceTrust.riza = 0.8;
    halil.memory.sourceTrust.hacer = 0.8;
    believe(riza, 'osman:dishonest', true, 0.95, 'riza', 0);
    const town = [riza, hacer, halil, osman];
    const r0 = reputation(town, 'osman');
    // Day 11: Rıza tells Hacer. Day 12: what Hacer tells Halil depends on it.
    expect(converse(hacer, halil, { at: 2 }).claims).toEqual([]);
    hear(hacer, converse(riza, hacer, { at: 1 }).told);
    expect(credence(hacer, 'osman:dishonest')).toBeGreaterThan(0.7);
    const second = converse(hacer, halil, { at: 2 });
    expect(second.claims[0]?.prop).toBe('osman:dishonest');
    hear(halil, second.told);
    expect(credence(halil, 'osman:dishonest')).toBeGreaterThan(0.6);
    expect(relationshipWith(halil, 'osman').trust).toBeLessThan(0.5);
    const r1 = reputation(town, 'osman');
    expect(r1.knownBy).toBeGreaterThan(r0.knownBy);
    expect(r1.standing).toBeLessThan(r0.standing);
    expect(r1.traits.dishonest).toBeGreaterThan(0.6);
  });

  test('a listener who holds backbiting forbidden thinks less of the gossiper', () => {
    const riza = lanePerson('riza');
    believe(riza, 'osman:lazy', true, 0.95, 'riza', 0);
    const yakup = lanePerson('yakup', { norms: holdsBackbiting });
    const halil = lanePerson('halil');
    const told = converse(riza, yakup, { at: 1 }).told;
    hear(yakup, told);
    hear(halil, told);
    expect(relationshipWith(yakup, 'riza').respect).toBeLessThan(0);
    expect(relationshipWith(halil, 'riza').respect).toBe(0);
  });

  test('misinformation decays when confirmed false: the speaker who saw the truth stops spreading it', () => {
    const hacer = lanePerson('hacer');
    hacer.memory.sourceTrust.gossip = 0.9;
    hacer.memory.sourceTrust.gossip2 = 0.9;
    believe(hacer, 'riza:dishonest', true, 0.95, 'gossip', 0);
    believe(hacer, 'riza:dishonest', true, 0.95, 'gossip2', 0);
    expect(converse(hacer, lanePerson('x'), { at: 1 }).claims[0]?.value).toBe(true);
    expect(confirm(hacer, 'riza:dishonest', false, 2)).toEqual(['gossip', 'gossip2']);
    const after = converse(hacer, lanePerson('x'), { at: 3 });
    expect(after.claims.every((c) => !(c.prop === 'riza:dishonest' && c.value))).toBe(true);
  });
});
