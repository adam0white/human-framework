import { describe, expect, test } from 'vitest';
import { runMethodAlternativesControl } from '../examples/method-alternatives-control.ts';

describe('independently successful procedures under the same observations', () => {
  test('another successful procedure preserves own acquired support and ordinary autonomy', () => {
    const result = runMethodAlternativesControl(19);
    expect(result.one.action).toBe('sort-by-label');
    expect(result.both.accepted).toBe(true);
    expect(result.both.evidence[0]?.support).toBe(result.one.evidence[0]?.support);
    expect(result.both.evidence[1]?.support).toBeGreaterThan(0);
    for (const arm of [result.withheld, result['skill-only']]) {
      expect(arm.action).toBe('ask-help');
      expect(arm.evidence.map((e) => e.support)).toEqual([0, 0]);
    }
    expect(result.failed.action).toBe('sort-with-template');
    expect(result.failed.evidence[0]?.support).toBeLessThan(0);
    expect(result.failed.evidence[1]?.support).toBe(result.both.evidence[1]?.support);
    expect(result.hungry.action).toBe('eat');
    expect(result.restored).toEqual(result.both);
    const methodTerms = result.both.trace.considered.flatMap((c) =>
      c.terms.filter((t) => t.source.startsWith('method:')),
    );
    expect(methodTerms.length).toBeGreaterThan(0);
    expect(methodTerms.every((t) => t.source.includes(':instructor'))).toBe(true);
    expect(runMethodAlternativesControl(19)).toEqual(result);
  });
});
