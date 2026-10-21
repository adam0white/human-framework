import { describe, expect, test } from 'vitest';
import { main as community, DAYS } from '../examples/community.ts';
import { main as curiosity } from '../examples/curiosity-control.ts';
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

  test('curiosity: free exploration favours the learnable option only with needs met', () => {
    const [on, off, hungry] = curiosity();
    if (!on || !off || !hungry) throw new Error('Missing curiosity control arm');
    for (const arm of [on, off, hungry]) {
      expect(arm.minutes).toBe(1440);
      expect(arm.alive).toBe(true);
    }
    const early = on.decisions.slice(0, on.decisions.length / 2);
    expect(early.some((d) => d.choice === 'learnable')).toBe(true);
    expect(early.some((d) => d.choice === 'noisy')).toBe(true);
    const late = on.decisions.length / 3;
    expect(on.lateCounts.learnable).toBeGreaterThan(late / 2);
    expect(on.lateCounts.learnable).toBeGreaterThan(on.lateCounts.noisy);
    expect(
      on.decisions
        .filter((d) => d.choice === 'learnable')
        .slice(2)
        .every((d) => d.success),
    ).toBe(true);
    expect(off.counts.familiar).toBe(off.decisions.length);
    expect(hungry.decisions.map((d) => d.choice)).toEqual(off.decisions.map((d) => d.choice));
    expect(hungry.decisions.every((d) => Object.values(d.curiosity).every((value) => value === 0))).toBe(
      true,
    );
  });
});
