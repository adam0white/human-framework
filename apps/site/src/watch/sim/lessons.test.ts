import { describe, expect, it } from 'vitest';
import { WatchRun } from './run.ts';

describe('a blessed lesson is answered at the next thaw (owner playtest 2026-10-05)', () => {
  it('seed 1: Kian is blessed lessons in the first summer and the second thaw says what came of it', () => {
    const run = new WatchRun(1);
    run.input({ k: 'start' });
    for (let g = 0; g < 2_000_000 && !(run.state.year === 2 && run.state.phase === 'thaw'); g++) {
      const s = run.state;
      if (s.phase === 'dusk') run.input({ k: 'begin' });
      else if (s.phase === 'dawn') run.input({ k: 'toDusk' });
      else if (s.phase === 'thaw' || s.phase === 'closed' || s.phase === 'fair') run.input({ k: 'continue' });
      else if (s.card) run.input({ k: 'card', id: s.card.id, choice: s.card.options[0]?.id ?? '' });
      else run.step();
    }
    const s = run.state;
    expect(s.phase).toBe('thaw');
    const blessed = s.pairings.find((x) => x.who === 'kian');
    expect(blessed?.from).toBeTypeOf('number');
    expect(blessed?.told).toBe(true);
    const line = s.chronicle.find((l) => l.year === 2 && l.who === 'kian' && /sling lessons/.test(l.text));
    expect(line?.text).toMatch(/with Tamar/);
  }, 60_000);
});
