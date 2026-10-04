import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, type LogEntry } from './game.ts';
import { branch, HINDSIGHT_BRANCHES, hindsight } from './hindsight.ts';
import { createFrameworkHumanSide } from './human.ts';
import { at } from './world-types.ts';

describe('hindsight replay (end screen "what would have won")', () => {
  it('with no orders, a winning branch is found, and the same inputs give the same answer', () => {
    const t0 = performance.now();
    const a = hindsight(DEFAULT_SEED, createFrameworkHumanSide, []);
    const ms = performance.now() - t0;
    const b = hindsight(DEFAULT_SEED, createFrameworkHumanSide, []);
    console.log('hindsight (no orders)', JSON.stringify(a), `${ms.toFixed(0)} ms`);
    expect(a).not.toBeNull();
    expect(a?.wins).toBe(true);
    expect(a?.roofAt).not.toBeNull();
    expect(HINDSIGHT_BRANCHES).toContain(a?.from);
    expect(b).toEqual(a);
  });

  it('replays the player orders before the branch, then hands over to the policy', () => {
    const log: LogEntry[] = (['yusuf', 'tariq', 'idris', 'samira', 'danyal'] as const).map((id) => ({
      minute: 10,
      kind: 'order',
      input: { personId: id, placeId: 'forest' },
    }));
    const late = branch(DEFAULT_SEED, createFrameworkHumanSide, log, at(1, 12, 0));
    const dawn = branch(DEFAULT_SEED, createFrameworkHumanSide, [], 0);
    console.log('branch D1 12:00 after a forest morning', JSON.stringify(late), 'dawn', JSON.stringify(dawn));
    expect(dawn.wins).toBe(true);
    expect(late.builders.length).toBeGreaterThan(0);
  });
});
