import { describe, expect, test } from 'vitest';
import { main } from '../examples/word-and-witness-control.ts';
import { MINUTES_PER_DAY, testimonyWeight } from '../src/index.ts';

const results = main();

for (const domain of ['stairwell', 'dock'] as const) {
  describe(`word and witness control: ${domain}`, () => {
    const arms = results.filter((r) => r.domain === domain);
    const get = (arm: (typeof arms)[number]['arm']) => {
      const result = arms.find((r) => r.arm === arm);
      if (!result) throw new Error(`Missing ${domain}/${arm}`);
      return result;
    };
    const full = get('full');

    test('all arms live the same twenty daily routines, ending after the last night of sleep', () => {
      const end = 20 * MINUTES_PER_DAY + 6 * 60;
      for (const r of arms) {
        expect(r.days).toBe(20);
        expect(r.decisions.map((d) => d.day)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
        expect(r.clocks).toEqual({ A: end, B: end, C: end, D: end });
        expect(r.alive).toEqual({ A: true, B: true, C: true, D: true });
      }
    });

    test('full: witnessed breach prompts repair and the attended report costs only B source trust', () => {
      expect(full.evidence.broken).toBe(true);
      expect(full.evidence.breachAttended).toEqual({ A: true, B: true, C: true });
      expect(full.evidence.accounts).toEqual({ B: true, C: false });
      expect(full.evidence.reportAttended).toBe(true);
      expect(full.regard.B.value).toBeLessThan(0);
      expect(full.regard.C.value).toBeLessThan(0);
      const first = full.decisions.find((d) => d.choice === 'apology')?.day;
      expect(first).toBeGreaterThanOrEqual(3);
      expect(first).toBeLessThanOrEqual(10);
      const { beforeB, afterB, reporterTrust, finalB, beforeC, finalC } = full.trust;
      // Documented loss coefficient, independent of the framework's tunable default.
      expect(afterB).toBe(beforeB - 0.25 * testimonyWeight(reporterTrust) * beforeB);
      expect(afterB).toBeLessThan(beforeB);
      expect(finalB).toBe(afterB);
      expect(finalC).toBe(beforeC);
    });

    test('no-regard: beliefs and source trust match full, but A never apologises', () => {
      const r = get('no-regard');
      expect(r.beliefs).toEqual(full.beliefs);
      expect(r.trust).toEqual(full.trust);
      expect(r.decisions.every((d) => d.choice === 'ordinary')).toBe(true);
      expect(r.regard.B).toEqual({ value: 0, confidence: 0 });
      expect(r.regard.C).toEqual(r.regard.priorC);
    });

    test('no-contradiction: B keeps source trust; regard and apology choices match full', () => {
      const r = get('no-contradiction');
      expect(r.trust.afterB).toBe(r.trust.beforeB);
      expect(r.trust.finalB).toBe(r.trust.beforeB);
      expect(r.trust.finalC).toBe(r.trust.beforeC);
      expect(r.regard).toEqual(full.regard);
      expect(r.decisions).toEqual(full.decisions);
      expect(r.beliefs).toEqual(full.beliefs);
    });

    test('no-provenance: metadata is absent and decisions match full', () => {
      const r = get('no-provenance');
      expect(r.decisions).toEqual(full.decisions);
      expect(r.trust).toEqual(full.trust);
      expect(r.provenanceB).toBeUndefined();
      expect(r.beliefs.B.find((b) => b.prop === r.prop)).toBeDefined();
      expect(r.beliefs.B.find((b) => b.prop === r.prop)?.provenance).toBeUndefined();
      expect(full.provenanceB).toMatchObject({ origin: full.ids.D, firstFrom: full.ids.D });
    });

    test('secret-witness: C receives the breach but A has no cue that C saw it', () => {
      const r = get('secret-witness');
      expect(r.evidence.breachAttended.C).toBe(true);
      expect(r.regard.C).toEqual(r.regard.priorC);
      expect(r.regard.B).toEqual(full.regard.B);
      expect(r.decisions).toEqual(full.decisions);
    });
  });
}

test('renaming the domain preserves every arm verdict and the complete choice sequence', () => {
  for (const stairwell of results.filter((r) => r.domain === 'stairwell')) {
    const dock = results.find((r) => r.domain === 'dock' && r.arm === stairwell.arm);
    expect(dock).toBeDefined();
    expect(dock?.ids).not.toEqual(stairwell.ids);
    expect(dock?.prop).not.toBe(stairwell.prop);
    expect(dock?.decisions).toEqual(stairwell.decisions);
    expect(dock?.regard).toEqual(stairwell.regard);
    expect(dock?.trust).toEqual(stairwell.trust);
    expect(dock?.evidence).toEqual(stairwell.evidence);
  }
});

test('the seeded control repeats exactly and returns plain JSON', () => {
  expect(main()).toStrictEqual(results);
  expect(JSON.parse(JSON.stringify(results))).toStrictEqual(results);
});
