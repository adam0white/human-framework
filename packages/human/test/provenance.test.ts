import { describe, expect, test } from 'vitest';
import {
  BELIEF_DEFAULTS,
  believe,
  confirm,
  converse,
  createPerson,
  credence,
  decide,
  MAX_MINUTE,
  MINUTES_PER_DAY,
  noteProvenance,
  perceive,
  provenanceOf,
  restore,
  seedSourceTrust,
  snapshot,
} from '../src/index.ts';
import type { Affordance, BeliefProvenance, Percept, PerceptClaim, Person } from '../src/types.ts';

function person(id = 'listener'): Person {
  return createPerson({
    id,
    name: id,
    seed: 17,
    now: 10,
    bornAt: -30 * 365 * MINUTES_PER_DAY,
    sex: 'female',
    norms: [],
  });
}

function telling(claim: PerceptClaim, extra: Partial<Percept> = {}): Percept {
  return {
    at: 10,
    channel: 'told',
    kind: 'fact',
    actorId: 'teller',
    salience: 1,
    summary: 'A claim',
    claims: [claim],
    ...extra,
  };
}

const fact: PerceptClaim = { prop: 'well:dry', value: true, confidence: 0.95 };

describe('belief provenance', () => {
  test('two relays preserve the opaque token and first origin; firstFrom names the direct teller', () => {
    const a = person('A');
    const b = person('B');
    const c = person('C');
    perceive(a, [telling({ ...fact, lineage: 'host/chain:42' }, { channel: 'saw' })]);
    seedSourceTrust(b, a.id, 1);
    seedSourceTrust(c, b.id, 1);
    const first = converse(a, b, { at: 10, provenance: true });
    expect(first.claims[0]).toMatchObject({ origin: 'A', lineage: 'host/chain:42' });
    expect(first.told[0]?.claims?.[0]).toMatchObject({ origin: 'A', lineage: 'host/chain:42' });
    perceive(b, first.told);
    const second = converse(b, c, { at: 10, provenance: true });
    expect(second.claims[0]).toMatchObject({ origin: 'A', lineage: 'host/chain:42' });
    expect(second.told[0]?.claims?.[0]).toMatchObject({ origin: 'A', lineage: 'host/chain:42' });
    perceive(c, second.told);
    expect(provenanceOf(b, fact.prop)).toEqual({
      origin: 'A',
      firstFrom: 'A',
      at: 10,
      lineage: 'host/chain:42',
    });
    expect(provenanceOf(c, fact.prop)).toEqual({
      origin: 'A',
      firstFrom: 'B',
      at: 10,
      lineage: 'host/chain:42',
    });
  });

  test('the first provenance wins; confirm resets sources but keeps provenance through JSON restore', () => {
    const p = person();
    perceive(p, [telling({ ...fact, origin: 'origin', lineage: 'first' })]);
    const meta = structuredClone(provenanceOf(p, fact.prop));
    perceive(p, [telling({ ...fact, origin: 'other', lineage: 'second' }, { actorId: 'relay' })]);
    confirm(p, fact.prop, false, 10);
    expect(p.memory.beliefs[0]?.sources).toEqual([{ id: p.id, value: false }]);
    expect(provenanceOf(p, fact.prop)).toEqual(meta);
    const saved = snapshot(p);
    expect(restore(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(provenanceOf(restore(saved), fact.prop)).toEqual(meta);
  });

  test('metadata is opt-in; direct claims use self, testimony without an actor uses rumour', () => {
    const p = person();
    perceive(p, [telling(fact)]);
    confirm(p, 'observed', true, 10);
    expect(provenanceOf(p, fact.prop)).toBeUndefined();
    expect(provenanceOf(p, 'observed')).toBeUndefined();
    expect(provenanceOf(p, 'unknown')).toBeUndefined();
    perceive(p, [telling({ ...fact, lineage: 'late' })]);
    expect(provenanceOf(p, fact.prop)).toEqual({
      origin: 'teller',
      firstFrom: 'teller',
      at: 10,
      lineage: 'late',
    });
    const rumour = telling({ ...fact, prop: 'rumour', lineage: 'r' });
    delete rumour.actorId;
    perceive(p, [rumour]);
    expect(provenanceOf(p, 'rumour')).toMatchObject({ origin: 'rumour', firstFrom: 'rumour' });
    perceive(p, [telling({ ...fact, prop: 'seen', lineage: 's' }, { channel: 'felt' })]);
    expect(provenanceOf(p, 'seen')).toMatchObject({ origin: p.id, firstFrom: p.id });
    noteProvenance(p, { ...fact, prop: 'missing', origin: 'x' }, 'teller', 10);
    expect(p.memory.beliefs.some((b) => b.prop === 'missing')).toBe(false);
  });

  test('an absent person retains a false belief until they perceive the changed fact', () => {
    const absent = person();
    const witness = person('witness');
    let worldDry = true;
    perceive(absent, [telling({ ...fact, value: worldDry }, { channel: 'saw' })]);
    const before = snapshot(absent);
    worldDry = false;
    perceive(witness, [telling({ ...fact, value: worldDry }, { channel: 'saw' })]);
    expect(snapshot(absent)).toEqual(before);
    expect(credence(absent, fact.prop)).toBeGreaterThan(0.9);
    perceive(absent, [telling({ ...fact, value: worldDry }, { channel: 'saw' })]);
    expect(credence(absent, fact.prop)).toBeLessThan(0.1);
  });

  test('provenance alone changes no decisions, including after confirm and restore', () => {
    const plain = person();
    const meta = person();
    perceive(plain, [telling(fact)]);
    perceive(meta, [telling({ ...fact, origin: 'origin', lineage: 'opaque' })]);
    for (const p of [plain, meta]) confirm(p, fact.prop, true, 10);
    const offers: Affordance[] = [
      { id: 'rest', action: 'rest', label: 'rest', duration: 15, effort: 0, advertises: { rest: 0.3 } },
      { id: 'work', action: 'work', label: 'work', duration: 15, effort: 0.4, advertises: {}, material: 0.5 },
    ];
    const a = restore(snapshot(plain));
    const b = restore(snapshot(meta));
    // Exercise RNG-based selection as well as argmax, with exactly the same RNG state.
    for (const temperature of [0, 0.3]) {
      a.will.temperature = temperature;
      b.will.temperature = temperature;
      for (let i = 0; i < 5; i++) expect(decide(b, offers)).toEqual(decide(a, offers));
    }
    for (const belief of b.memory.beliefs) delete belief.provenance;
    expect(b).toEqual(a);
  });

  test('belief eviction drops its provenance', () => {
    const p = person();
    believe(p, 'weak', true, 0.5, 'teller', 0);
    noteProvenance(p, { ...fact, prop: 'weak', lineage: 'forgotten' }, 'teller', 0);
    for (let i = 0; i < BELIEF_DEFAULTS.maxBeliefs; i++) confirm(p, `new:${i}`, true, 10);
    expect(p.memory.beliefs).toHaveLength(BELIEF_DEFAULTS.maxBeliefs);
    expect(provenanceOf(p, 'weak')).toBeUndefined();
  });

  test.each(
    [
      null,
      [],
      {},
      { origin: '', firstFrom: 'x', at: 10 },
      { origin: 'x', firstFrom: 1, at: 10 },
      { origin: 'x', firstFrom: 'y', at: Infinity },
      { origin: 'x', firstFrom: 'y', at: MAX_MINUTE + 1 },
      { origin: 'x', firstFrom: 'y', at: 10, lineage: 7 },
    ].map((bad) => [bad]),
  )('restore drops malformed provenance: %j', (bad) => {
    const p = person();
    confirm(p, fact.prop, true, 10);
    const belief = p.memory.beliefs[0];
    if (!belief) throw new Error('missing test belief');
    belief.provenance = bad as unknown as BeliefProvenance;
    expect(provenanceOf(restore(snapshot(p)), fact.prop)).toBeUndefined();
  });

  test('the metadata sanitizer does not make restore throw on malformed legacy belief entries', () => {
    const p = person();
    const saved = snapshot(p) as unknown as { memory: { beliefs: unknown[] } };
    saved.memory.beliefs = [null, 4, [], {}];
    expect(() => restore(saved)).not.toThrow();
  });

  test('restore drops an over-long lineage without truncating; valid 64-character tokens survive', () => {
    const p = person();
    perceive(p, [telling({ ...fact, origin: 'origin', lineage: 'a'.repeat(64) })]);
    expect(provenanceOf(restore(snapshot(p)), fact.prop)?.lineage).toBe('a'.repeat(64));
    const meta = provenanceOf(p, fact.prop);
    if (!meta) throw new Error('missing test provenance');
    meta.lineage = 'a'.repeat(65);
    expect(provenanceOf(restore(snapshot(p)), fact.prop)).toEqual({
      origin: 'origin',
      firstFrom: 'teller',
      at: 10,
    });
  });
});

describe('converse provenance opt-in', () => {
  test('without the flag, output stays deep-equal even when the speaker has metadata', () => {
    const speaker = person('speaker');
    const listener = person();
    confirm(speaker, fact.prop, true, 10);
    const before = converse(speaker, listener, { at: 10 });
    noteProvenance(speaker, { ...fact, origin: 'origin', lineage: 'token' }, 'teller', 10);
    expect(converse(speaker, listener, { at: 10 })).toEqual(before);
    expect(converse(speaker, listener, { at: 10, provenance: false })).toEqual(before);
    expect(before.claims[0]).not.toHaveProperty('origin');
    expect(before.told[0]?.claims?.[0]).not.toHaveProperty('lineage');
  });

  test('a speaker without provenance names themself; a new lineage never makes repeated news new', () => {
    const speaker = person('speaker');
    const listener = person();
    seedSourceTrust(listener, speaker.id, 1);
    confirm(speaker, fact.prop, true, 10);
    const first = converse(speaker, listener, { at: 10, provenance: true });
    expect(first.claims[0]?.origin).toBe('speaker');
    expect(first.claims[0]).not.toHaveProperty('lineage');
    perceive(listener, first.told);
    noteProvenance(speaker, { ...fact, lineage: 'new' }, speaker.id, 10);
    expect(converse(speaker, listener, { at: 10, provenance: true }).claims).toEqual([]);
  });

  test('said-but-not-news still suppresses the percept when only lineage differs', () => {
    const speaker = person('speaker');
    const listener = person();
    confirm(speaker, fact.prop, true, 10);
    confirm(listener, fact.prop, true, 10);
    noteProvenance(speaker, { ...fact, lineage: 'different' }, speaker.id, 10);
    const result = converse(speaker, listener, { at: 10, provenance: true });
    expect(result.claims).toHaveLength(1);
    expect(result.told).toEqual([]);
  });

  test('advice percepts carry metadata only with the flag', () => {
    const speaker = person('speaker');
    const listener = person();
    const prop = `${listener.id}:should:rest`;
    confirm(speaker, prop, true, 10);
    const baseline = converse(speaker, listener, { at: 10 });
    noteProvenance(speaker, { ...fact, prop, origin: 'mentor', lineage: 'advice' }, 'mentor', 10);
    expect(converse(speaker, listener, { at: 10 })).toEqual(baseline);
    expect(
      converse(speaker, listener, { at: 10, provenance: true }).advice[0]?.percept.claims?.[0],
    ).toMatchObject({
      origin: 'mentor',
      lineage: 'advice',
    });
  });
});
