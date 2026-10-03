import { describe, expect, test } from 'vitest';
import { main as community, DAYS } from '../examples/community.ts';
import { main as minimal } from '../examples/minimal.ts';
import { main as suggestions } from '../examples/suggestions.ts';

// Structural checks only: the examples must keep running and keep showing what they claim, but exact
// wording and tuning belong to the faculties, not to these tests.
const VERDICTS = ['assented', 'complied', 'deferred', 'modified', 'refused'];

describe('examples', () => {
  test('minimal: a person runs a day in a hand-written World', () => {
    const lines = minimal();
    expect(lines.length).toBeGreaterThan(4);
    for (const line of lines) expect(line).toMatch(/\w/);
    expect(lines.some((l) => /activities begun/.test(l))).toBe(true);
  });

  test('suggestions: one voice, typed verdicts', () => {
    const { lines, verdicts } = suggestions();
    expect(verdicts).toHaveLength(5);
    for (const r of verdicts) {
      expect(VERDICTS).toContain(r.verdict);
      if (r.kind !== undefined) expect(['cannot', 'notNow', 'willNot']).toContain(r.kind);
      expect(r.says.length).toBeGreaterThan(0);
    }
    // The example's point: a push is not a command. At least one assent and at least one refusal.
    expect(verdicts.some((r) => r.verdict === 'assented')).toBe(true);
    expect(verdicts.some((r) => r.verdict === 'refused')).toBe(true);
    expect(lines.some((l) => l.startsWith('decide():'))).toBe(true);
  });

  test('community: played and silent periods close into day records and diff', () => {
    const { lines, played, silent } = community();
    expect(played).toHaveLength(DAYS);
    expect(silent).toHaveLength(DAYS);
    expect(silent.every((r) => r.day > (played.at(-1)?.day ?? 0))).toBe(true);
    for (const line of lines) expect(line).toMatch(/\w/);
  });
});
