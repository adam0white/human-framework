import { expect, test } from 'vitest';
import { cognitionOwner } from '../src/cognition/cognition.ts';
import { decisionContext, offer, person } from './w2-fixture.ts';

test('received scarcity raises small material gains and losses within the material ceiling', () => {
  const p = person();
  const options = [
    offer('gain', { expected: { needs: {}, followedBy: [], provenance: [], material: 3 } }),
    offer('loss', { expected: { needs: {}, followedBy: [], provenance: [], material: -3 } }),
    offer('large', { expected: { needs: {}, followedBy: [], provenance: [], material: 300 } }),
  ];
  const ctx = decisionContext(p, options);
  const terms = (value: number) =>
    cognitionOwner.terms({ ...ctx, scarcity: { kind: 'known', value, evidenceIds: ['scarcity'] } }).terms;
  const read = (ts: ReturnType<typeof terms>, id: string) =>
    ts.find((t) => t.offerId === id && t.term.source === 'material')?.term.value ?? 0;
  const calm = terms(0),
    short = terms(1);
  expect(read(short, 'gain')).toBeGreaterThan(read(calm, 'gain'));
  expect(read(short, 'loss')).toBeLessThan(read(calm, 'loss'));
  expect(read(short, 'large')).toBeLessThanOrEqual(
    2 * p.frame.effective.builtins.COGNITION_DEFAULTS.materialWeight,
  );
});
