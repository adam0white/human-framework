import { describe, expect, it } from 'vitest';
import { driverCheck, makePlayReply, runPlayOperation } from './lab-play-helpers.ts';

const dusk = {
  visible: 'Dusk',
  controls: [
    '- button "East wall · tracks"',
    '- button "East gate"',
    '- button "West wall"',
    '- button "Urge Kian to hold — The watcher will probably agree."',
    '- button "Restart"',
  ].join('\n'),
};

const previous = { visible: 'Before dawn\nRest', controls: '- button "Rest"', takenAt: 1000 };
const fresh = { visible: 'Dawn\nOn to dusk', controls: '- button "On to dusk"' };
const reply = (result: Awaited<ReturnType<typeof runPlayOperation>>, now = 6000) =>
  makePlayReply(result, { now, openedAt: 1000, started: 5000 });

describe('lab:play operation replies', () => {
  it('allows a named tab from the latest controls without requiring a role override', async () => {
    let actions = 0;
    const result = await runPlayOperation(
      { op: 'tap', name: 'meter' },
      {
        previous: null,
        snapshot: async () => ({ visible: 'meter', controls: '- tab "meter"' }),
        act: async () => {
          actions++;
          return undefined;
        },
      },
    );
    expect(result.status).toBe(200);
    expect(actions).toBe(1);
  });
  it('refuses a vanished control before acting and reuses the fresh pre-action read', async () => {
    let actions = 0;
    let reads = 0;
    const result = await runPlayOperation(
      { op: 'tap', name: 'Rest' },
      {
        previous,
        now: () => 5000,
        act: async () => {
          actions++;
          return undefined;
        },
        snapshot: async () => {
          reads++;
          return fresh;
        },
      },
    );
    expect(actions).toBe(0);
    expect(reads).toBe(1);
    expect(result.status).toBe(500);
    expect(reply(result)).toMatchObject({
      controls: fresh.controls,
      requested_control_present_before: false,
    });
    expect(result.error).toContain('it was listed 4 s ago');
  });
  it('allows a complete text label rendered across lines without matching a fragment', async () => {
    let actions = 0;
    const snapshot = async () => ({ visible: 'Choose\nPath', controls: '- text: Choose Path' });
    const options = {
      previous,
      snapshot,
      act: async () => {
        actions++;
        return undefined;
      },
    };
    const complete = await runPlayOperation({ op: 'tap', text: 'Choose Path' }, options);
    expect(complete.status).toBe(200);
    expect(complete.requested_control_present_before).toBe(true);
    const fragment = await runPlayOperation({ op: 'tap', text: 'Choos' }, options);
    expect(fragment.status).toBe(500);
    expect(actions).toBe(1);
  });
  it('detects stale local driver files and allows an explicit override or unavailable git', () => {
    expect(driverCheck('abc123\n', 1, false)).toMatchObject({
      driver: 'abc123',
      driver_check: 'stale',
      refuse: true,
    });
    expect(driverCheck('abc123', 1, true).refuse).toBe(false);
    expect(driverCheck('abc123', 0, false).driver_check).toBe('current');
    expect(driverCheck('abc123', 128, false)).toMatchObject({ driver_check: 'unavailable', refuse: false });
    expect(driverCheck(null, null, false)).toMatchObject({
      driver: 'unknown',
      driver_check: 'unavailable',
      refuse: false,
    });
  });
  it('keeps a successful action and its screenshot when the first snapshot times out', async () => {
    let attempts = 0;
    let completedActions = 0;
    const result = await runPlayOperation(
      { op: 'shot', file: 'test.png' },
      {
        previous,
        act: async () => {
          completedActions++;
          return '/scratch/test.png';
        },
        snapshot: async (timeout) => {
          if (attempts++ === 0) throw new Error('innerText timeout');
          if (timeout <= 5000) throw new Error('Retry needs more time');
          return fresh;
        },
      },
    );
    expect(result.status).toBe(200);
    expect(completedActions).toBe(1);
    expect(reply(result)).toMatchObject({ screenshot: '/scratch/test.png', controls: fresh.controls });
    expect(reply(result).error).toBeUndefined();
  });

  it('reports an unavailable snapshot without repeating old controls or failing a successful action', async () => {
    const result = await runPlayOperation(
      { op: 'shot', file: 'test.png' },
      {
        previous,
        act: async () => undefined,
        snapshot: async () => {
          throw new Error('body unavailable');
        },
      },
    );
    expect(result.status).toBe(200);
    expect(reply(result)).toMatchObject({ controls: '', visible: '', snapshot_ms: null });
    expect(reply(result).snapshot_warning).toContain('Snapshot unavailable');
    expect(reply(result).error).toBeUndefined();
  });

  it('reports the increasing age of controls on log replies without touching the browser', async () => {
    const result = await runPlayOperation(
      { op: 'log' },
      {
        previous,
        act: async () => undefined,
        snapshot: async () => {
          throw new Error('log must not snapshot');
        },
      },
    );
    expect(reply(result).snapshot_ms).toBe(5000);
    expect(reply(result).requested_control_present_before).toBeNull();
  });
});

describe('lab:play tap name resolution', () => {
  // Runs one tap against the dusk controls and records which name the browser step received.
  const tap = async (op: Record<string, unknown>) => {
    const tapped: (string | undefined)[] = [];
    const result = await runPlayOperation(op, {
      previous: { ...dusk, takenAt: 1000 },
      snapshot: async () => dusk,
      act: async (resolvedName) => {
        tapped.push(resolvedName);
        return undefined;
      },
    });
    return { result, tapped, body: reply(result) };
  };
  it('taps an exact name as given', async () => {
    const { result, tapped, body } = await tap({ op: 'tap', name: 'East gate' });
    expect(result.status).toBe(200);
    expect(tapped).toEqual([undefined]);
    expect(body).not.toHaveProperty('tapped');
  });
  it('resolves a unique prefix past a separator or a read, and says which control it tapped', async () => {
    const wall = await tap({ op: 'tap', name: 'east WALL' });
    expect(wall.tapped).toEqual(['East wall · tracks']);
    expect(wall.body).toMatchObject({ tapped: { name: 'East wall · tracks', matched_by: 'prefix' } });
    const urge = await tap({ op: 'tap', text: 'Urge Kian to hold' });
    expect(urge.tapped).toEqual(['Urge Kian to hold — The watcher will probably agree.']);
  });
  it('refuses an ambiguous name, lists every candidate in full and taps nothing', async () => {
    const { result, tapped, body } = await tap({ op: 'tap', name: 'East' });
    expect(tapped).toEqual([]);
    expect(result.status).toBe(500);
    expect(result.error).toContain('"East wall · tracks", "East gate"');
    expect(result.error).toContain('ambiguous target, not a driver failure');
    expect(body.clickable).toHaveLength(5);
  });
  it('refuses a name with no match, never a word fragment, and returns the clickable names', async () => {
    const { result, tapped, body } = await tap({ op: 'tap', name: 'Rest' });
    expect(tapped).toEqual([]);
    expect(result.error).toContain('Rest is not on the page now');
    expect(body.clickable).toEqual([
      'East wall · tracks',
      'East gate',
      'West wall',
      'Urge Kian to hold — The watcher will probably agree.',
      'Restart',
    ]);
  });
  it('refuses a name that was exact in the last reply instead of re-aiming it at a newer control', async () => {
    let actions = 0;
    const result = await runPlayOperation(
      { op: 'tap', name: 'East wall' },
      {
        previous: { visible: 'Dusk', controls: '- button "East wall"', takenAt: 1000 },
        now: () => 5000,
        snapshot: async () => dusk,
        act: async () => {
          actions++;
          return undefined;
        },
      },
    );
    expect(actions).toBe(0);
    expect(result.error).toContain('it was listed 4 s ago');
  });
});
