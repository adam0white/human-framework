import { expect, it } from 'vitest';
import { publicFixture } from './public-fixture.ts';
import { dawnVoices } from './voices.ts';

it('does not say a watcher stayed after their actual leaving note', () => {
  // Authored accessible event history isolates narration; no actor memory or motive is manufactured.
  const s = publicFixture();
  s.notes.push(
    { minute: s.minute - 30, who: 'kian', kind: 'ran', section: 'east' },
    { minute: s.minute - 60, who: 'kian', kind: 'together', section: 'east', other: 'tamar' },
  );
  const text = dawnVoices(s).voices.find((v) => v.who === 'kian')?.text ?? '';
  expect(text).not.toContain('I stayed because');
});

it('recognizes a prior unanswered lesson request when the same pupil asks again', async () => {
  const { dayHook, settleLifeCard, LESSON_DAY } = await import('./life.ts');
  const { DAY } = await import('./config.ts');
  const s = publicFixture(LESSON_DAY * DAY);
  s.phase = 'summer';
  dayHook(s)(null, LESSON_DAY, s.minute);
  const first = s.card;
  expect(first?.kind).toBe('practise');
  if (!first) throw new Error('No actual lesson request');
  settleLifeCard(s, first, null);
  // A following-year opening carries the actual unanswered receipt, not a simulated year of life.
  const later = publicFixture((365 + LESSON_DAY) * DAY);
  later.year = 2;
  later.phase = 'summer';
  later.chronicle = structuredClone(s.chronicle);
  dayHook(later)(null, 365 + LESSON_DAY, later.minute);
  expect(later.card?.text).toContain('asks again');
  expect(later.card?.who).toBe(first.who);
});

it('does not count a requested post at nightfall as actual first guard work', async () => {
  const { WatchRun } = await import('./run.ts');
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  expect(run.state.posts.tamar).toBeTruthy();
  expect(run.state.cast.tamar?.stood).not.toBe(true);
  run.input({ k: 'begin' });
  expect(run.state.cast.tamar?.stood).not.toBe(true);
});
