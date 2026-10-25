import { describe, expect, it } from 'vitest';
import { MOTION_REACH } from './config.ts';
import { personOf } from './people.ts';
import { WatchRun } from './run.ts';
import type { Token } from './state.ts';
import { buildFrame } from './view.ts';

function night() {
  const run = new WatchRun(4242);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  run.step();
  const s = run.state;
  const p = personOf(s, 'tamar');
  if (!p?.activity) throw new Error('Expected Tamar to have a current activity');
  p.activity.action = 'hold-post';
  p.body.asleep = false;
  p.body.downed = undefined;
  s.place.tamar = 'gate-1';
  s.lantern = { x: 1, target: 1 };
  s.warned = 'west';
  s.warnedAlso = null;
  s.tokens = [];
  return { s, p };
}

function token(change: Partial<Token> = {}): Token {
  return {
    id: 999,
    kind: 'wolf',
    section: 'gate',
    pos: MOTION_REACH,
    hp: 1,
    climb: 0,
    state: 'coming',
    since: 0,
    ...change,
  };
}

const account = (s: ReturnType<typeof night>['s']) =>
  buildFrame(s, 0, false).watchers.find((w) => w.id === 'tamar')?.account;

describe('a watcher’s read-only night account', () => {
  it('uses current activity and cannot alter the run', () => {
    const { s, p } = night();
    if (!p.activity) throw new Error('Expected an activity');
    p.activity.action = 'eat';
    const before = JSON.stringify(s);
    expect(account(s)).toEqual({
      text: 'I’m eating a little. Nothing is close that I can make out.',
      spoken: true,
    });
    expect(JSON.stringify(s)).toBe(before);
    expect(account(s)).toEqual(account(s));
    s.phase = 'dusk';
    expect(account(s)).toBeNull();
  });

  it('does not turn a scout warning, distant token, departed token or other stretch into a sighting', () => {
    const { s } = night();
    s.tokens = [
      token({ pos: MOTION_REACH - 0.001 }),
      token({ id: 998, section: 'west', pos: 1, state: 'foot' }),
      token({ id: 997, pos: 1, state: 'fled' }),
      token({ id: 996, pos: 1, state: 'in' }),
    ];
    expect(account(s)?.text).toContain('Nothing is close that I can make out.');
    s.warnedAlso = 'gate';
    expect(account(s)?.text).toContain(
      'The scout warned us about this stretch. I can’t make anything out yet.',
    );
    expect(account(s)?.text).not.toMatch(/wolf|thief|close on this stretch/);
  });

  it('reports local close movement without revealing its kind or count', () => {
    const { s } = night();
    s.tokens = [token()];
    expect(account(s)?.text).toContain('Something is close on this stretch.');
    expect(account(s)?.text).not.toMatch(/wolf|thief|\d/);
    s.tokens = [token({ state: 'foot', pos: 0 })];
    expect(account(s)?.text).toContain('Something is close on this stretch.');
  });

  it('lets a conscious watcher answer from an unlit neighbouring stretch', () => {
    const { s } = night();
    s.place.tamar = 'mill-1';
    const watcher = buildFrame(s, 0, false).watchers.find((w) => w.id === 'tamar');
    expect(watcher?.lit).toBe(false);
    expect(watcher?.account?.spoken).toBe(true);
  });

  it('does not claim a reply or disclose activity beyond voice reach', () => {
    const { s, p } = night();
    s.place.tamar = 'east-1';
    p.body.asleep = true;
    expect(account(s)).toEqual({ text: 'Too far away for your voice to reach.', spoken: false });
    s.place.tamar = 'home';
    expect(account(s)?.spoken).toBe(false);
  });

  it('does not give sleepers or downed watchers a spoken account, or expose their state in the dark', () => {
    const { s, p } = night();
    p.body.asleep = true;
    expect(account(s)).toEqual({ text: 'The watcher appears asleep. No reply comes.', spoken: false });
    s.place.tamar = 'mill-1';
    expect(account(s)).toEqual({ text: 'No reply comes from the dark.', spoken: false });
    p.body.asleep = false;
    p.body.downed = { since: s.minute, reason: 'test injury' };
    expect(account(s)).toEqual({ text: 'No reply comes from the dark.', spoken: false });
    s.place.tamar = 'gate-1';
    expect(account(s)).toEqual({ text: 'The watcher is down and cannot answer.', spoken: false });
  });
});

it('gives a read-only reason when a night account has no applicable request', () => {
  const { s, p } = night();
  s.place.tamar = 'hall';
  const before = JSON.stringify(s);
  const frame = buildFrame(s, 0, false);
  const watcher = frame.watchers.find((w) => w.id === 'tamar');
  expect(watcher?.acts).toEqual([]);
  expect(watcher?.actsUnavailable).toContain('Night requests need someone at a post');
  expect(JSON.stringify(s)).toBe(before);
  s.place.tamar = 'east-1';
  p.body.asleep = true;
  const far = buildFrame(s, 0, false).watchers.find((w) => w.id === 'tamar');
  // Unseen sleep is never disclosed by an availability explanation.
  if (!far?.acts.length)
    expect(far?.actsUnavailable).toBe('Your voice cannot reach this post: the lantern is at the Gate.');
  expect(far?.actsUnavailable).not.toMatch(/asleep|sleeping/);
});
