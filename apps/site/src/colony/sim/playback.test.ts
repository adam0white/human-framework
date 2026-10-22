import { ENGINE_VERSION } from '@adam0white/human-framework';
import { describe, expect, it } from 'vitest';
import type { WorkerReply } from '../protocol.ts';
import { NUDGES, SCENARIO_VERSION } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { coalesce, MAX_MINUTES_PER_TICK, Playback } from './playback.ts';

function start(autoPause = true): Playback {
  const pb = new Playback(createFrameworkHumanSide);
  pb.handle({ type: 'init', seed: 20261003, scenarioVersion: SCENARIO_VERSION, gen: 1, autoPause });
  return pb;
}

/** Advance playback to the next pending decision. */
function runUntilDecision(pb: Playback): void {
  for (let i = 0; i < 10000 && !pb.state().slowMo; i++) pb.handle({ type: 'tick', dtMs: 250 });
  expect(pb.state().slowMo).toBe(true);
}

describe('playback: explicit pause and continuous decision slowdown', () => {
  it('starts paused behind the goal card and does not step until resumed', () => {
    const pb = start();
    expect(pb.paused).toBe(true);
    expect(pb.pause?.kind).toBe('start');
    expect(pb.handle({ type: 'tick', dtMs: 250 })).toEqual([]);
    expect(pb.game?.minute).toBe(0);
    const [reply] = pb.handle({ type: 'resume' }) as [WorkerReply];
    expect(reply.type === 'frame' && reply.playback.paused).toBe(false);
    pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.game?.minute).toBe(2); // 8 sim-min/s at 1×
  });

  it('slows a pending suggestion without stopping, then restores the chosen speed on commit', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    pb.handle({ type: 'setSpeed', speed: 2 });
    runUntilDecision(pb);
    expect(pb.paused).toBe(false);
    expect(pb.pause).toMatchObject({ kind: 'auto', reason: 'suggestion', nudgeId: 'dawn-site' });
    const minute = pb.game?.minute ?? 0;
    for (let i = 0; i < 4; i++) pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.game?.minute).toBe(minute + 1);
    pb.handle({ type: 'order', input: { personId: 'yusuf', placeId: 'site', rush: true } });
    expect(pb.state()).toMatchObject({ paused: false, slowMo: false, speed: 2, pause: null });
    const resolved = pb.game?.minute ?? 0;
    pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.game?.minute).toBe(resolved + 4);
  });

  it('keeps a decision slow beyond three seconds and through inspection, until dismissed', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    runUntilDecision(pb);
    pb.handle({ type: 'pause', cause: 'inspector' });
    expect(pb.paused).toBe(false);
    const minute = pb.game?.minute ?? 0;
    for (let i = 0; i < 20; i++) pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.game?.minute).toBe(minute + 5);
    expect(pb.state().slowMo).toBe(true);
    pb.handle({ type: 'dismissNudge', id: 'dawn-site' });
    expect(pb.state().slowMo).toBe(false);
  });

  it('can acknowledge a suggestion without answering it, and never pauses inspection', () => {
    const pb = start();
    pb.handle({ type: 'pause', cause: 'inspector' });
    expect(pb.pause?.kind).toBe('start');
    pb.handle({ type: 'resume' });
    runUntilDecision(pb);
    pb.handle({ type: 'resume' });
    pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.state().slowMo).toBe(false);
    expect(pb.game?.visibleNudges().some((n) => n.id === 'dawn-site')).toBe(true);
    pb.handle({ type: 'pause', cause: 'inspector' });
    expect(pb.paused).toBe(false);
    pb.handle({ type: 'pause', cause: 'manual' });
    pb.handle({ type: 'dismissNudge', id: 'dawn-site' });
    expect(pb.pause?.kind).toBe('manual');
  });

  it('returns to chosen speed when a suggestion expires or decision slowdown is disabled', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    runUntilDecision(pb);
    const dawn = NUDGES.find((n) => n.id === 'dawn-site');
    if (!dawn || !pb.game) throw new Error('no dawn suggestion');
    pb.game.advance(dawn.until - pb.game.minute - 1);
    pb.step(1);
    expect(pb.state().slowMo).toBe(false);
    const other = start();
    other.handle({ type: 'resume' });
    runUntilDecision(other);
    other.handle({ type: 'setAutoPause', on: false });
    expect(other.state().slowMo).toBe(false);
  });

  it('ordinary moments, storm notices and answered refusals never stop or slow the clock', () => {
    for (const autoPause of [true, false]) {
      const pb = start(autoPause);
      pb.handle({ type: 'resume' });
      for (const n of NUDGES) pb.handle({ type: 'dismissNudge', id: n.id });
      pb.handle({ type: 'setSpeed', speed: 2 });
      const g = pb.game;
      if (!g) throw new Error('no game');
      while (!g.ended) {
        const last = g.minute;
        pb.handle({ type: 'tick', dtMs: 250 });
        expect(g.minute - last).toBeLessThanOrEqual(MAX_MINUTES_PER_TICK);
        expect(pb.state()).toMatchObject({ paused: false, slowMo: false, pause: null });
      }
      expect(g.moments.length).toBeGreaterThan(0);
    }
  });

  it('coalesces reasons of one minute into one pause named by the first', () => {
    const p = coalesce(
      [
        { reason: 'refusal', text: 'Tariq: not tonight', orderId: 'o5', personId: 'tariq' },
        { reason: 'storm', text: 'The storm breaks.' },
      ],
      100,
    );
    expect(p).toEqual({
      kind: 'auto',
      reason: 'refusal',
      text: 'Tariq: not tonight · The storm breaks.',
      orderId: 'o5',
      personId: 'tariq',
      minute: 100,
    });
    expect(coalesce([], 5)).toBeNull();
  });

  it('still reaches all five moments when every suggestion is followed during continuous play', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    pb.handle({ type: 'setSpeed', speed: 2 });
    const g = pb.game;
    if (!g) throw new Error('no game');
    while (!g.ended) {
      pb.handle({ type: 'tick', dtMs: 250 });
      expect(pb.paused).toBe(false);
      for (const n of g.visibleNudges()) {
        pb.handle({ type: 'order', input: { ...n.order, ...(n.prefill ?? {}) }, nudgeId: n.id });
      }
    }
    expect(g.moments.map((m) => m.id).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('offers "Another day" once after Day 2, re-pauses behind the goal card and runs Day 3', () => {
    const pb = start();
    const g = pb.game;
    if (!g) throw new Error('no game');
    g.advance(2880);
    const replies = pb.handle({ type: 'resume' });
    expect(replies.map((r) => r.type)).toEqual(['frame', 'ended']);
    const f = replies[0];
    expect(f?.type === 'frame' && f.frame.canContinue).toBe(true);
    pb.handle({ type: 'continue' });
    expect(pb.pause?.kind).toBe('start');
    expect(g.endMinute).toBe(4320);
    expect(g.frame().goals.map((x) => x.id)).toEqual(['project', 'stock', 'lives']);
    expect(g.frame().canContinue).toBe(false);
    pb.handle({ type: 'resume' });
    g.advance(4320 - g.minute - 1);
    const end = pb.handle({ type: 'tick', dtMs: 250 });
    const summary = end.find((r) => r.type === 'ended');
    expect(summary?.type === 'ended' && summary.summary.day).toBe(3);
    expect(pb.handle({ type: 'continue' })[0]?.type).toBe('frame');
    expect(g.endMinute).toBe(4320);
  });
});

it('exports full linked snapshots in the existing replay format', async () => {
  const pb = start();
  pb.handle({ type: 'resume' });
  pb.handle({ type: 'tick', dtMs: 250 });
  const file = await pb.playtestFile(ENGINE_VERSION, true);
  expect(file.snapshotEncoding).toBe('json');
  expect(file.snapshot).toHaveProperty('human');
  const replay = new Playback(createFrameworkHumanSide).load(JSON.stringify(file), ENGINE_VERSION);
  expect(replay.result.matches).toBe(true);
});
