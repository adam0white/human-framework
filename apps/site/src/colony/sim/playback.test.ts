import { ENGINE_VERSION } from '@adam0white/human-framework';
import { describe, expect, it } from 'vitest';
import type { WorkerReply } from '../protocol.ts';
import { NUDGES, SCENARIO_VERSION } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { coalesce, Playback } from './playback.ts';
import { at, WARNING_AT } from './world-types.ts';

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

  it('gives a new suggestion ten seconds of reading before looking pace', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    runUntilDecision(pb);
    expect(pb.state()).toMatchObject({ pace: 'reading', paceLine: 'slowed: a suggestion' });
    for (let i = 0; i < 39; i++) pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.state().pace).toBe('reading');
    for (let i = 0; i < 3; i++) pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.state().pace).toBe('looking');
    const minute = pb.game?.minute ?? 0;
    for (let i = 0; i < 16; i++) pb.handle({ type: 'tick', dtMs: 250 });
    expect((pb.game?.minute ?? 0) - minute).toBe(16);
  });

  it('holds overlays without changing a manual pause and ramps context changes', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    pb.handle({ type: 'setContext', context: { person: 'maryam' } });
    expect(pb.state()).toMatchObject({ pace: 'looking', paceLine: "slowed: you're with Maryam" });
    pb.handle({ type: 'tick', dtMs: 250 });
    pb.handle({ type: 'tick', dtMs: 150 });
    expect(pb.game?.minute).toBe(2); // 400ms ramp integrates 8 -> 4, without a jump.
    pb.handle({ type: 'setContext', context: { info: true } });
    const minute = pb.game?.minute;
    for (let i = 0; i < 16; i++) pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.game?.minute).toBe(minute);
    expect(pb.state().pace).toBe('held');
    pb.handle({ type: 'pause' });
    pb.handle({ type: 'setContext', context: { info: false } });
    expect(pb.state().paused).toBe(true);
  });

  it('reads the Human reply for four seconds and drops fast carry before it', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    pb.handle({ type: 'setPace', pace: 2 });
    pb.handle({ type: 'order', input: { personId: 'yusuf', placeId: 'well' } });
    expect(pb.step(8)).toBe(1);
    expect(pb.state()).toMatchObject({ pace: 'reading', paceLine: 'slowed: Yusuf is answering' });
    for (let i = 0; i < 17; i++) pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.state().pace).toBe('watching');
  });

  it('acknowledges suggestions and keeps presentation out of the replay log', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    runUntilDecision(pb);
    pb.handle({ type: 'resume' });
    expect(pb.state().slowMo).toBe(false);
    expect(pb.game?.visibleNudges().some((n) => n.id === 'dawn-site')).toBe(true);
    pb.handle({ type: 'setContext', context: { reading: true } });
    expect(pb.state().pace).toBe('reading');
    pb.handle({ type: 'setPace', pace: 0.5 });
    pb.handle({ type: 'setPace', pace: 'auto' });
    expect(pb.state().automatic).toBe(true);
    expect(pb.game?.log).toEqual([]);
  });

  it('reads the storm warning for three seconds before restoring Watching', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    for (const n of NUDGES) pb.handle({ type: 'dismissNudge', id: n.id });
    pb.game?.advance(WARNING_AT - 1);
    expect(pb.step(8)).toBe(1);
    expect(pb.state()).toMatchObject({ pace: 'reading', paceLine: 'slowed: the storm is coming' });
    for (let i = 0; i < 13; i++) pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.state().pace).toBe('watching');
  });

  it('runs an asleep village at Night and keeps the storm at Watching', () => {
    const pb = start();
    pb.handle({ type: 'resume' });
    for (const n of NUDGES) pb.handle({ type: 'dismissNudge', id: n.id });
    pb.game?.advance(at(1, 23));
    expect(pb.game?.human.view().map((person) => person.state)).toEqual(Array(6).fill('asleep'));
    expect(pb.state().pace).toBe('night');
    pb.handle({ type: 'setContext', context: { person: 'yusuf' } });
    expect(pb.state().pace).toBe('looking');
    pb.handle({ type: 'setContext', context: { person: null } });
    pb.game?.advance(at(2, 23) - (pb.game?.minute ?? 0));
    expect(pb.state().pace).toBe('watching');
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
