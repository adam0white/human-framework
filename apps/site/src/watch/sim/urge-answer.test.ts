import { expect, it } from 'vitest';
import { WatchRun } from './run.ts';
import { buildFrame } from './view.ts';

// 2026-10-27 retest: "Tapping Urge Kian to hold ... gave no visible response". An urge is a spoken word, so the
// Keeper hears an answer at once, as a named bell call does. The answer follows the card's own read of the ask, so
// a card that says "will not agree" is not answered "I'll hold"; the rules (the one-shot ask) are unchanged.
it('answering a card with Urge puts a reply that matches the card’s read in what the Keeper hears', () => {
  for (let seed = 1; seed < 40; seed++) {
    const run = new WatchRun(seed);
    run.input({ k: 'start' });
    run.input({ k: 'begin' });
    while (run.state.phase === 'night' && !run.state.moment?.options.some((o) => o.id === 'urge')) run.step();
    const m = run.state.moment;
    if (!m) continue;
    const read = m.options.find((o) => o.id === 'urge')?.read ?? '';
    expect(run.input({ k: 'answer', id: m.id, choice: 'urge' })).toBe(true);
    const heard = buildFrame(run.state, 0, false, 0).alerts.at(-1);
    expect(heard?.who).toBe(m.who);
    expect(heard?.text).toMatch(/^You (urge|call) /);
    if (/will not agree/.test(read)) expect(heard?.text).toMatch(/does not answer/);
    if (/probably agree/.test(read)) expect(heard?.text).toMatch(/I’ll (hold|go)/);
    expect(run.state.asks[m.who]).toBeDefined();
    return;
  }
  throw new Error('no seed opened an Urge card');
});
