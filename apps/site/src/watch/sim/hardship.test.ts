/**
 * Hardship rules (WATCH-cold-loss, scenarios 17–19): a careless winter's loss carries into the year. A passive
 * Keeper (standing posts, lantern at the Gate) empties the granary in winter 1; the hungry spring takes its frailest
 * face, the unsown fields give a poor harvest, and the second hungry spring ends the village. The same seed under
 * the legacy rules (a 14–16 page) is still standing, and its export still replays exactly.
 */
import { describe, expect, it } from 'vitest';
import { planInputs } from '../../../test/watch/plans.ts';
import { replay, ruleHash, WatchRun } from './run.ts';
import { isSeason } from './season.ts';

function passive(run: WatchRun, untilYear: number): WatchRun {
  if (run.state.phase === 'goal') run.input({ k: 'start' });
  for (let guard = 0; guard < 5_000_000; guard++) {
    const s = run.state;
    if (s.phase === 'fallen' || s.year > untilYear) return run;
    switch (s.phase) {
      case 'dusk':
        for (const i of planInputs(s, 'usual', false)) run.input(i);
        run.input({ k: 'begin' });
        break;
      case 'night':
        run.step();
        break;
      case 'dawn':
        run.input({ k: 'toDusk' });
        break;
      case 'thaw':
      case 'closed':
      case 'fair':
        run.input({ k: 'continue' });
        break;
      default:
        if (!isSeason(s)) throw new Error(`no policy for ${s.phase}`);
        if (s.card) run.input({ k: 'card', id: s.card.id, choice: s.card.options.at(-1)?.id ?? '' });
        run.step();
    }
  }
  throw new Error('did not finish');
}

describe('hardship rules', () => {
  it('a passive Keeper loses a life to the hungry spring, sows short, and falls at the second', () => {
    const run = passive(new WatchRun(1), 3);
    const s = run.state;
    const y1 = s.chronicle.filter((l) => l.year === 1).map((l) => l.text);
    expect(y1.some((t) => /hunger took|died of hunger/.test(t))).toBe(true);
    expect(y1.some((t) => /no seed grain left to sow/.test(t))).toBe(true);
    expect(s.annals[0]?.harvest).toBeLessThan(15);
    expect(s.phase).toBe('fallen');
    expect(s.year).toBe(2);
    expect(s.chronicle.at(-1)?.text).toMatch(/second hungry spring/);
    const exp = run.export();
    expect(exp.scenario).toBe(17);
    expect(ruleHash(replay(exp))).toBe(exp.end.ruleHash);
  }, 120_000);

  it('control: the same seed under the legacy rules is still standing, and its export replays as scenario 14', () => {
    const legacy = new WatchRun(1);
    delete legacy.state.hardship;
    passive(legacy, 2);
    expect(legacy.state.phase).not.toBe('fallen');
    expect(legacy.state.year).toBe(3);
    const exp = legacy.export();
    expect(exp.scenario).toBe(14);
    expect(ruleHash(replay(exp))).toBe(exp.end.ruleHash);
    const resumed = WatchRun.resume(JSON.parse(legacy.snapshotText()));
    expect(resumed.state.hardship).toBeUndefined();
    expect(resumed.export().scenario).toBe(14);
  }, 120_000);
});
