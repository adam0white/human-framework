import { expect, test } from 'vitest';
import { assentCostControl } from '../examples/assent-cost-control.ts';
import {
  begin,
  createPerson,
  decide,
  enableAssentCost,
  predictResponse,
  readPerson,
  resolveChoice,
  restore,
  sanitizeWill,
  voiceOf,
} from '../src/index.ts';
import type { Affordance } from '../src/types.ts';

const offer: Affordance = {
  id: 'rest',
  action: 'rest',
  label: 'rest',
  duration: 5,
  effort: 0,
  advertises: {},
};
const spec = { provenance: 'host:observable-pressure-assumption', minStrength: 0.7, pressure: 0.1 };
const suggestion = { voiceId: 'guide', action: 'rest', strength: 0.7 };
const person = () => createPerson({ id: 'p', name: 'P', seed: 3, bornAt: -15768000, sex: 'male' });

test('ablation isolates accumulated voice pressure and preserves non-decision state and RNG', () => {
  expect(assentCostControl().off).toBe(0);
});

test('strong assent records actual bounded cost with provenance; mention and insist keep their existing costs', () => {
  const p = person();
  enableAssentCost(p, spec);
  decide(p, [offer], { suggestion: { ...suggestion, strength: 0.35 } });
  expect(voiceOf(p, 'guide')?.pressure).toBe(0);
  const r = decide(p, [offer], { suggestion });
  expect(r.suggestion?.assentCost).toEqual({ pressure: 0.1, provenance: spec.provenance });
  const v = voiceOf(p, 'guide');
  if (!v) throw new Error('missing voice');
  v.pressure = 0.98;
  const capped = decide(p, [offer], { suggestion });
  expect(v.pressure).toBe(1);
  expect(capped.suggestion?.assentCost?.pressure).toBeCloseTo(0.02);
  const insisted = decide(p, [offer], { suggestion: { ...suggestion, insist: true } });
  expect(insisted.suggestion?.assentCost).toBeUndefined();
});

test('preview does not book cost; opt-in survives JSON and malformed restore config is dropped', () => {
  const p = person();
  enableAssentCost(p, spec);
  const before = JSON.stringify(p);
  const considered = decide(structuredClone(p), [offer], { suggestion }).considered;
  predictResponse(
    p,
    considered,
    { now: p.now, affordances: [offer], body: readPerson(p).body, desperation: 0 },
    suggestion,
  );
  expect(JSON.stringify(p)).toBe(before);
  const w = JSON.parse(JSON.stringify(p.will));
  sanitizeWill(w);
  expect(w.assentCost).toEqual(spec);
  w.assentCost.pressure = Infinity;
  sanitizeWill(w);
  expect(w.assentCost).toBeUndefined();
  expect(() => enableAssentCost(p, { ...spec, pressure: 1 })).toThrow(RangeError);
});

test('quiet continuation charges nothing and absent opt-in keeps literal legacy state and resolution', () => {
  const legacy = person();
  const enabled = structuredClone(legacy);
  enableAssentCost(enabled, spec);
  const mention = { ...suggestion, strength: 0.35 };
  expect(decide(enabled, [offer], { suggestion: mention })).toEqual(
    decide(legacy, [offer], { suggestion: mention }),
  );
  delete enabled.will.assentCost;
  expect(enabled).toEqual(legacy);
  enableAssentCost(enabled, spec);
  const considered = decide(structuredClone(enabled), [offer], { suggestion }).considered;
  begin(enabled, offer, decide(structuredClone(enabled), [offer], { suggestion }));
  const before = structuredClone(enabled);
  const result = resolveChoice(
    enabled,
    considered,
    { now: enabled.now, affordances: [offer], body: readPerson(enabled).body, desperation: 0 },
    suggestion,
    { quiet: true },
  );
  expect(result.suggestion?.assentCost).toBeUndefined();
  expect(enabled).toEqual(before);
});

test('final promoted ordinary assent books cost; displaced assent stays free and raw restore replays', () => {
  const p = person();
  enableAssentCost(p, spec);
  const restored = restore(JSON.parse(JSON.stringify(p)));
  expect(restored).toEqual(p);
  const offers = ['work', 'rest'].map((id) => ({ ...offer, id, action: id, label: id }));
  const considered = offers.map((a, i) => ({
    affordanceId: a.id,
    action: a.action,
    utility: 2 - i,
    terms: [],
  }));
  const run = (who: typeof p) =>
    resolveChoice(
      who,
      considered,
      { now: who.now, affordances: offers, body: readPerson(who).body, desperation: 0 },
      [
        suggestion,
        { ...suggestion, voiceId: 'displaced', action: 'work' },
        { ...suggestion, voiceId: 'forcer', strength: 1, insist: true },
      ],
    );
  for (let i = 0; i < 3; i++) {
    const r = run(p);
    expect(r).toEqual(run(restored));
    expect(p).toEqual(restored);
    expect(restore(JSON.parse(JSON.stringify(p)))).toEqual(p);
    const guide = r.suggestions?.find((s) => s.voiceId === 'guide');
    expect(guide?.verdict).toBe('assented');
    expect(guide?.assentCost).toEqual({ pressure: expect.closeTo(0.1), provenance: spec.provenance });
    expect(r.suggestions?.find((s) => s.voiceId === 'displaced')?.verdict).toBe('deferred');
    expect(r.suggestions?.find((s) => s.voiceId === 'displaced')?.assentCost).toBeUndefined();
    expect(voiceOf(p, 'displaced')?.pressure).toBe(0);
    expect(r.suggestions?.find((s) => s.voiceId === 'forcer')?.assentCost).toBeUndefined();
  }
});
