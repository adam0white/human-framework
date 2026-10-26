/**
 * Ablated RM-130 control. Run: node packages/human/examples/assent-cost-control.ts
 * A host repeatedly urges an available, willingly chosen rest. Only the opt-in differs.
 * This measures pressure accumulation, not human distress or religious responsibility.
 */
import assert from 'node:assert/strict';
import { createPerson, decide, enableAssentCost, readPerson, resolveChoice, voiceOf } from '../src/index.ts';
import type { Affordance } from '../src/types.ts';

const offer: Affordance = {
  id: 'rest',
  action: 'rest',
  label: 'rest',
  duration: 5,
  effort: 0,
  advertises: {},
};
export function assentCostControl() {
  const off = createPerson({ id: 'person', name: 'Person', seed: 13, bornAt: -15768000, sex: 'male' });
  const on = structuredClone(off);
  enableAssentCost(on, { provenance: 'control:repeated-strong-advice', minStrength: 0.7, pressure: 0.1 });
  for (let i = 0; i < 8; i++) {
    for (const p of [off, on]) {
      const result = decide(p, [offer], { suggestion: { voiceId: 'guide', action: 'rest', strength: 0.7 } });
      assert.equal(result.suggestion?.verdict, 'assented');
    }
  }
  const pressure = { off: voiceOf(off, 'guide')?.pressure, on: voiceOf(on, 'guide')?.pressure };
  assert.equal(pressure.off, 0);
  assert.ok((pressure.on ?? 0) > 0.79);
  assert.deepEqual(on.rng, off.rng);
  const ablated = structuredClone(on);
  delete ablated.will.assentCost;
  const voice = voiceOf(ablated, 'guide');
  assert.ok(voice);
  voice.pressure = 0;
  assert.ok(on.trace.at(-1)?.considered[0]?.terms.some((t) => t.source === 'autonomy' && t.value < 0));
  // Compare receipt-bearing traces separately: only cost, autonomy term and utility may differ.
  for (const [i, record] of on.trace.entries()) {
    const control = off.trace[i];
    assert.ok(control);
    const { considered, suggestion: receipt, ...rest } = record;
    const { considered: baseline, suggestion: plain, ...controlRest } = control;
    assert.deepEqual(rest, controlRest);
    const { assentCost, ...verdict } = receipt ?? {};
    assert.equal(assentCost?.provenance, 'control:repeated-strong-advice');
    assert.deepEqual(verdict, plain);
    for (const [j, score] of considered.entries()) {
      const original = baseline[j];
      assert.ok(original);
      const { terms, utility, ...option } = score;
      const { terms: oldTerms, utility: oldUtility, ...oldOption } = original;
      assert.deepEqual(option, oldOption);
      assert.deepEqual(
        terms.filter((t) => t.source !== 'autonomy'),
        oldTerms,
      );
      assert.ok(
        Math.abs(
          utility -
            oldUtility -
            terms.filter((t) => t.source === 'autonomy').reduce((n, t) => n + t.value, 0),
        ) < 0.00011,
      );
    }
  }
  const { trace: _onTrace, ...onState } = ablated;
  const { trace: _offTrace, ...offState } = off;
  assert.deepEqual(onState, offState);
  // A distinct ordinary adviser assents after another voice forces the same option.
  for (const enabled of [false, true]) {
    const p = createPerson({ id: 'promoted', name: 'P', seed: 13, bornAt: -15768000, sex: 'male' });
    if (enabled) enableAssentCost(p, { provenance: 'control:promoted', minStrength: 0.7, pressure: 0.1 });
    const offers = ['work', 'rest'].map((id) => ({ ...offer, id, action: id, label: id }));
    const result = resolveChoice(
      p,
      offers.map((a, i) => ({ affordanceId: a.id, action: a.action, utility: 2 - i, terms: [] })),
      { now: p.now, affordances: offers, body: readPerson(p).body, desperation: 0 },
      [
        { voiceId: 'ordinary', action: 'rest', strength: 0.7 },
        { voiceId: 'forcer', action: 'rest', strength: 1, insist: true },
      ],
    );
    const ordinary = result.suggestions?.find((s) => s.voiceId === 'ordinary');
    assert.equal(ordinary?.verdict, 'assented');
    assert.equal(ordinary?.assentCost?.pressure, enabled ? 0.1 : undefined);
    assert.equal(voiceOf(p, 'ordinary')?.pressure, enabled ? 0.1 : 0);
    assert.equal(result.suggestions?.find((s) => s.voiceId === 'forcer')?.assentCost, undefined);
  }
  return pressure;
}
if (process.argv[1]?.endsWith('assent-cost-control.ts')) console.log(assentCostControl());
