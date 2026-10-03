import { describe, expect, it } from 'vitest';
import type { PauseInfo, WorkerReply } from '../protocol.ts';
import { NUDGES, SCENARIO_VERSION } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { coalesce, MAX_MINUTES_PER_TICK, Playback } from './playback.ts';
import { at, STORM_START, WARNING_AT } from './world-types.ts';

function start(autoPause = true): Playback {
  const pb = new Playback(createFrameworkHumanSide);
  pb.handle({ type: 'init', seed: 20261003, scenarioVersion: SCENARIO_VERSION, gen: 1, autoPause });
  return pb;
}

/** Tick until paused or `limit` sim minutes pass. */
function runUntilPause(pb: Playback, limit = 3000): void {
  const g = pb.game;
  if (!g) throw new Error('no game');
  const until = g.minute + limit;
  while (!pb.paused && !g.ended && g.minute < until) pb.handle({ type: 'tick', dtMs: 250 });
}

describe('playback: start, auto-pause, resume on act', () => {
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

  it('pauses at the minute a suggestion appears, never past it, and resumes when it is used', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    pb.handle({ type: 'setSpeed', speed: 2 });
    runUntilPause(pb);
    const dawn = NUDGES.find((n) => n.id === 'dawn-site');
    expect(pb.pause).toMatchObject({ kind: 'auto', reason: 'suggestion', nudgeId: 'dawn-site' });
    expect(pb.game?.minute).toBe(dawn?.minute);
    // Another order leaves it paused; using the suggestion resumes.
    pb.handle({ type: 'order', input: { personId: 'samira', placeId: 'field' } });
    expect(pb.paused).toBe(true);
    pb.handle({ type: 'order', input: { personId: 'yusuf', placeId: 'site' }, nudgeId: 'dawn-site' });
    expect(pb.paused).toBe(false);
    expect(pb.game?.visibleNudges().map((n) => n.id)).not.toContain('dawn-site');
  });

  it('an order typed in the composer that matches the suggestion settles it and resumes too', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    runUntilPause(pb);
    expect(pb.pause?.nudgeId).toBe('dawn-site');
    pb.handle({ type: 'order', input: { personId: 'yusuf', placeId: 'site', rush: true } });
    expect(pb.paused).toBe(false);
  });

  it('skipping the suggestion also resumes; a manual pause does not resume on act', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    runUntilPause(pb);
    pb.handle({ type: 'dismissNudge', id: 'dawn-site' });
    expect(pb.paused).toBe(false);
    pb.handle({ type: 'pause' });
    pb.handle({ type: 'dismissNudge', id: 'cedar' });
    expect(pb.pause?.kind).toBe('manual');
  });

  it('an inspector pause never replaces another pause; a manual pause replaces it', () => {
    const pb = start();
    pb.handle({ type: 'pause', cause: 'inspector' });
    expect(pb.pause?.kind).toBe('start');
    pb.handle({ type: 'resume' });
    pb.handle({ type: 'pause', cause: 'inspector' });
    expect(pb.pause?.kind).toBe('inspector');
    pb.handle({ type: 'pause', cause: 'manual' });
    expect(pb.pause?.kind).toBe('manual');
  });

  it('with auto-pause off it runs through suggestions and slows down for moments instead', () => {
    const pb = start(false);
    pb.handle({ type: 'resume' });
    runUntilPause(pb, at(1, 7, 0));
    expect(pb.paused).toBe(false);
    expect(pb.game?.minute ?? 0).toBeGreaterThanOrEqual(at(1, 7, 0));
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

  it('a full auto-paused run following every suggestion: once-per rules, storm pauses, all five moments', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    pb.handle({ type: 'setSpeed', speed: 2 });
    const g = pb.game;
    if (!g) throw new Error('no game');
    const pauses: PauseInfo[] = [];
    let last = g.minute;
    while (!g.ended) {
      pb.handle({ type: 'tick', dtMs: 250 });
      expect(g.minute - last).toBeLessThanOrEqual(MAX_MINUTES_PER_TICK);
      last = g.minute;
      if (!pb.paused) continue;
      const p = pb.pause;
      if (!p) throw new Error('paused without info');
      pauses.push(p);
      expect(p.minute).toBe(g.minute);
      const n = p.reason === 'suggestion' ? NUDGES.find((x) => x.id === p.nudgeId) : undefined;
      if (n) pb.handle({ type: 'order', input: { ...n.order, ...(n.prefill ?? {}) }, nudgeId: n.id });
      else pb.handle({ type: 'resume' });
      expect(pb.paused).toBe(false);
    }
    const keys = pauses.map((p) => `${p.reason}:${p.nudgeId ?? p.orderId ?? p.text}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(pauses.filter((p) => p.reason === 'storm').map((p) => p.minute)).toEqual([
      WARNING_AT,
      STORM_START,
    ]);
    const shown = pauses.filter((p) => p.reason === 'suggestion').map((p) => p.nudgeId);
    expect(shown).toContain('dawn-site');
    expect(shown).toContain('roof-hands-1');
    expect(pauses.some((p) => p.reason === 'refusal' && p.personId === 'tariq')).toBe(true);
    expect(g.moments.map((m) => m.id).sort()).toEqual([1, 2, 3, 4, 5]);
    if (process.env.BALANCE) console.log(pauses.map((p) => `${p.minute} ${p.reason} ${p.text}`).join('\n'));
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
