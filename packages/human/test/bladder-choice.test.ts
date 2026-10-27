import { expect, it } from 'vitest';
import { bladderAt, bladderMotivation } from '../src/body/bladder.ts';
import type { Offer } from '../src/run-schema.ts';
import { effective } from './w1-fixture.ts';

it('delays intake, preserves pending on voiding, and motivates only a declared feasible toilet action', () => {
  const p = effective.builtins.BLADDER_DEFAULTS;
  const b = bladderAt({ fill: 0, pending: 1 }, 45, p);
  expect(b.pending).toBeCloseTo(0.5, 14);
  expect(b.fill).toBeCloseTo(0.545, 14);
  const offer: Offer = {
    id: 'toilet',
    person: 'a',
    actionId: 'toilet',
    label: 'Use toilet',
    durationMs: 60000,
    participants: [],
    alongside: [],
    demands: { mode: 'awake', effort: 0, focus: 0, requires: {} },
    tags: [],
    norms: [],
    expected: { needs: {}, followedBy: [], provenance: [], voidsBladder: true },
    fulfills: [],
    advances: [],
    diminishes: [],
  };
  expect(bladderMotivation(b, offer, 1, p)).toBeGreaterThan(0);
  expect(bladderMotivation(b, offer, 0, p)).toBe(0);
});
