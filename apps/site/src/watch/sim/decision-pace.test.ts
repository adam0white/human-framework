import { describe, expect, it } from 'vitest';
import { Pacer, RATE, type Speed } from './pace.ts';
import { endState, replay, WatchRun } from './run.ts';
import { buildFrame } from './view.ts';

function pending() {
  const run = new WatchRun(5);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  while (run.state.phase === 'night' && !run.state.moment) run.step();
  expect(run.state.moment).not.toBeNull();
  return run;
}

describe('watcher decision playback', () => {
  it.each<Speed>(['tactical', 'watch', 'fast', 'days', 'seasons'])(
    'keeps a live choice readable for a minute from %s, then restores the chosen speed',
    (speed) => {
      const run = pending();
      const pacer = new Pacer();
      pacer.speed = speed;
      pacer.tick(run, 0);
      const id = run.state.moment?.id;
      const minute = run.state.minute;
      expect(pacer.rate(run)).toBe(1 / 60);
      expect(pacer.slowed(run)).toBe(true);
      for (let n = 0; n < 241; n++) pacer.tick(run, 250);
      expect(run.state.minute).toBe(minute + 1);
      expect(run.state.moment?.id).toBe(id);
      // A speed selection while the choice is open must not shorten its window.
      pacer.speed = 'fast';
      expect(pacer.rate(run)).toBe(1 / 60);
      pacer.speed = speed;
      const choice = run.state.moment?.options.find((o) => o.id !== 'bell');
      expect(run.input({ k: 'answer', id: id ?? -1, choice: choice?.id ?? '' })).toBe(true);
      pacer.tick(run, 0);
      expect(pacer.slowed(run)).toBe(false);
      expect(pacer.rate(run)).toBe(RATE[speed]);
      // The existing return ramp begins at reading speed, without changing the chosen speed.
      expect(pacer.speed).toBe(speed);
      expect(pacer.paced(run)).toBe(1 / 60);
      const exp = run.export();
      expect(endState(replay(exp))).toEqual(exp.end);
    },
  );

  it('counts down real time through sub-minute progress and lets an unanswered choice expire', () => {
    const run = pending();
    const pacer = new Pacer();
    pacer.speed = 'fast';
    pacer.tick(run, 0);
    const start = run.state.minute;
    expect(buildFrame(run.state, pacer.progress, true, pacer.rate(run)).decisionSeconds).toBe(120);
    for (let n = 0; n < 20; n++) pacer.tick(run, 250);
    expect(buildFrame(run.state, pacer.progress, true, pacer.rate(run)).decisionSeconds).toBe(115);
    for (let n = 0; n < 456; n++) pacer.tick(run, 250);
    expect(run.state.moment).not.toBeNull();
    expect(buildFrame(run.state, pacer.progress, true, pacer.rate(run)).decisionSeconds).toBe(1);
    for (let n = 0; n < 5 && run.state.moment; n++) pacer.tick(run, 250);
    expect(run.state.minute).toBeGreaterThanOrEqual(start + 2);
    expect(run.state.moment).toBeNull();
    expect(pacer.speed).toBe('fast');
  });
});

it('restores Fast when a saved pending decision is answered before its first tick', () => {
  const run = pending();
  const pacer = new Pacer();
  pacer.speed = 'fast';
  pacer.adopt(run);
  const m = run.state.moment;
  expect(run.input({ k: 'answer', id: m?.id ?? -1, choice: 'let' })).toBe(true);
  pacer.follow(run);
  expect(pacer.slowed(run)).toBe(false);
  expect(pacer.paced(run)).toBe(12);
});

it('bounds the countdown by dawn and reports a stopped clock without a deadline', () => {
  const run = pending();
  // A saved late-night decision can have less than its normal window left.
  run.state.nightStart = run.state.minute - 719;
  expect(buildFrame(run.state, 0, true, 1 / 60).decisionSeconds).toBe(60);
  expect(buildFrame(run.state, 0.5, true, 1 / 60).decisionSeconds).toBe(30);
  expect(buildFrame(run.state, 0.5, true, 0).decisionSeconds).toBeNull();
});
