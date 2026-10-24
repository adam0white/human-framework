import { expect, it } from 'vitest';
import { applyInput, newGame, nightEnd, stepMinute } from './night.ts';

it('a breach without stolen grain does not claim sacks were carried off', () => {
  const s = newGame(7);
  applyInput(s, { k: 'start' });
  applyInput(s, { k: 'begin' });
  s.spawns = [];
  s.tokens = [];
  s.grain = 0;
  s.tally.grainAtDusk = 0;
  s.tally.got.west = { wolf: 1, thief: 1 };
  s.minute = nightEnd(s) - 1;
  stepMinute(s);
  const text = JSON.stringify(s.dawn?.lines);
  expect(text).not.toMatch(/tore into|carried sacks/);
  expect(text).toContain('took no grain');
});

it('a night-wide loss does not assign stolen grain to every breach', () => {
  const s = newGame(7);
  applyInput(s, { k: 'start' });
  applyInput(s, { k: 'begin' });
  s.spawns = [];
  s.tokens = [];
  s.tally.grainAtDusk = 10;
  s.grain = 9;
  s.tally.got.west = { wolf: 1, thief: 1 };
  s.tally.got.east = { thief: 1 };
  s.minute = nightEnd(s) - 1;
  stepMinute(s);
  const lines = s.dawn?.lines ?? [];
  expect(lines.filter((line) => /tore into the store|carried sacks off/.test(line.text))).toHaveLength(0);
  expect(lines.filter((line) => /got over/.test(line.text))).toHaveLength(2);
});

it('the thaw question and chronicle account for households who left', async () => {
  const { buildFrame } = await import('./view.ts');
  const s = newGame(7);
  s.phase = 'thaw';
  s.winter.question = { kind: 'souls', text: 'Bring every soul and the granary to the thaw.', met: true };
  s.chronicle.push({
    year: s.year,
    minute: s.minute,
    season: 'winter',
    kind: 'winter',
    text: `Done: ${s.winter.question.text}`,
  });
  s.chronicle.push({
    year: s.year,
    minute: s.minute,
    season: 'spring',
    kind: 'leave',
    text: 'A household left.',
  });
  const f = buildFrame(s, 0, false);
  expect(f.winter?.question?.met).toBe(false);
  expect(f.thaw?.lines).toContain(`Not done: ${s.winter.question.text}`);
  expect(s.winter.question.met).toBe(true); // Projection does not rewrite a historical saved rule state.
});

it('a settled proposal cannot recur immediately, while legacy pages retain their rules', async () => {
  const { proposalAvailable, holdProposal } = await import('./life.ts');
  const s = newGame(7);
  expect(proposalAvailable(s, 'a', 'b', 100)).toBe(true);
  holdProposal(s, 'a', 'b', 100);
  expect(proposalAvailable(s, 'b', 'a', 101)).toBe(false);
  expect(proposalAvailable(s, 'a', 'b', 100 + 365 * 1440)).toBe(true);
  delete s.proposalHolds;
  expect(proposalAvailable(s, 'a', 'b', 101)).toBe(true);
});

it('new proposal holds survive current save/restore and replay; older cast pages refuse', async () => {
  const { WatchRun, replay, ruleHash } = await import('./run.ts');
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  const restored = WatchRun.resume(JSON.parse(run.snapshotText()));
  expect(restored.state.proposalHolds).toEqual({});
  const exp = run.export();
  expect(exp.scenario).toBe(14);
  expect(ruleHash(replay(exp))).toBe(exp.end.ruleHash);
  const legacy = run.snapshot();
  legacy.scenario = 9;
  delete legacy.state.proposalHolds;
  expect(() => WatchRun.resume(legacy)).toThrow(/scenario/);
});

it('later summer losses do not rewrite the preceding winter question', async () => {
  const { buildFrame } = await import('./view.ts');
  const s = newGame(7);
  s.phase = 'summer';
  s.minute = 200 * 1440;
  s.winter.question = { kind: 'souls', text: 'Bring every soul and the granary to the thaw.', met: true };
  s.chronicle.push({
    year: s.year,
    minute: 90 * 1440,
    season: 'spring',
    kind: 'winter',
    text: `Done: ${s.winter.question.text}`,
  });
  s.chronicle.push({
    year: s.year,
    minute: s.minute,
    season: 'summer',
    kind: 'death',
    text: 'A later death.',
  });
  expect(buildFrame(s, 0, false).chronicle.some((l) => l.text === `Done: ${s.winter.question?.text}`)).toBe(
    true,
  );
});
