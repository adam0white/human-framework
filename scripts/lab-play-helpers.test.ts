import { describe, expect, it } from 'vitest';
import {
  clickNamedPlayControl,
  MissingPlayControl,
  makePlayReply,
  runPlayOperation,
} from './lab-play-helpers.ts';

const previous = { visible: 'Before dawn\nRest', controls: '- button "Rest"', takenAt: 1000 };
const fresh = { visible: 'Dawn\nOn to dusk', controls: '- button "On to dusk"' };
const reply = (result: Awaited<ReturnType<typeof runPlayOperation>>, now = 6000) =>
  makePlayReply(result, { now, openedAt: 1000, started: 5000 });

describe('lab:play named control identity', () => {
  it.each([
    ['Send Tariq home', 'Send Idris home', 'button'],
    ['Show Idris', 'Show Tariq', 'button'],
    ['House Later: after I pray Fajr', 'House Will refuse: busy', 'button'],
    ['Go to East wall', 'Go to West wall', 'button'],
    ['Send Tariq home', 'Send Tariq home tomorrow', 'button'],
    ['Read Tariq', 'Read Idris', 'link'],
  ])('refuses stale %s instead of activating %s', async (requested, current, currentRole) => {
    let activated = '';
    const page = {
      getByRole(role: string, options: { name: string | RegExp; exact?: boolean }) {
        const matches =
          role === currentRole &&
          (typeof options.name === 'string'
            ? options.exact
              ? options.name === current
              : current.includes(options.name)
            : options.name.test(current));
        return { matches };
      },
    };
    const result = await runPlayOperation(
      { op: 'tap', name: requested },
      {
        previous: { visible: requested, controls: `- ${currentRole} "${requested}"`, takenAt: 1000 },
        act: async () => {
          const clicked = await clickNamedPlayControl(
            page,
            async (target) => {
              if (!target.matches) return false;
              activated = current;
              return true;
            },
            requested,
          );
          if (!clicked) throw new MissingPlayControl(requested, `No actionable button named ${requested}`);
          return undefined;
        },
        snapshot: async () => ({ visible: current, controls: `- ${currentRole} "${current}"` }),
      },
    );
    expect(activated).toBe('');
    expect(result.status).toBe(500);
    expect(reply(result).error).toContain(`${requested} is not on the page now`);
    expect(reply(result).controls).toBe(`- ${currentRole} "${current}"`);
    expect(reply(result).requested_control_present_before).toBe(true);
  });

  it.each([
    ['button', undefined, true],
    ['link', undefined, true],
    ['link', 'link', true],
    ['link', 'button', false],
  ] as const)(
    'matches a current %s with requested role %s: %s',
    async (currentRole, requestedRole, expected) => {
      let activated = false;
      const clicked = await clickNamedPlayControl(
        {
          getByRole(role: string, options: { name: string; exact: true }) {
            return { matches: role === currentRole && options.name === 'Show Tariq' && options.exact };
          },
        },
        async (target) => {
          if (!target.matches) return false;
          activated = true;
          return true;
        },
        'Show Tariq',
        requestedRole,
      );
      expect(clicked).toBe(expected);
      expect(activated).toBe(expected);
    },
  );
});

describe('lab:play operation replies', () => {
  it.each([
    ['House Later: after I pray Fajr', '- \'button "House Later: after I pray Fajr"\''],
    ["House Later: I'm busy", "- 'button \"House Later: I''m busy\"'"],
  ])('recognizes the quoted snapshot label %s before it disappears', async (name, controls) => {
    const result = await runPlayOperation(
      { op: 'tap', name },
      {
        previous: { visible: name, controls, takenAt: 1000 },
        act: async () => {
          throw new MissingPlayControl(name, 'No actionable button');
        },
        snapshot: async () => fresh,
      },
    );
    expect(reply(result).requested_control_present_before).toBe(true);
    expect(reply(result).error).toContain(`${name} is not on the page now`);
    expect(reply(result).controls).toBe(fresh.controls);
  });

  it('does not mistake narrative text for the removed text control', async () => {
    const result = await runPlayOperation(
      { op: 'tap', text: 'Rest' },
      {
        previous,
        act: async () => {
          throw new MissingPlayControl('Rest', 'No visible clickable text: Rest');
        },
        snapshot: async () => ({ visible: 'Rested until dawn', controls: '- paragraph: Rested until dawn' }),
      },
    );
    expect(reply(result).error).toContain('Rest is not on the page now');
  });

  it.each([
    { op: 'tap', name: 'Rest' },
    { op: 'tap', text: 'Rest' },
  ])('refreshes a failed $op and explains that the advertised control left', async (op) => {
    const result = await runPlayOperation(op, {
      previous,
      now: () => 5000,
      act: async () => {
        throw new MissingPlayControl('Rest', 'No actionable button named Rest');
      },
      snapshot: async () => fresh,
    });
    const response = reply(result);
    expect(response.controls).toBe('- button "On to dusk"');
    expect(response.visible).toContain('Dawn');
    expect(response.error).toContain('Rest is not on the page now');
    expect(response.error).toContain('it was listed 4 s ago');
    expect(response.error).toContain('game state, not a driver failure');
    expect(response.requested_control_present_before).toBe(true);
    expect(response.snapshot_ms).toBe(1000);
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
      { op: 'tap', name: 'Rest' },
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

  it.each([
    [
      'not previously advertised',
      null,
      fresh,
      new MissingPlayControl('Rest', 'No actionable button named Rest'),
    ],
    [
      'still advertised',
      previous,
      previous,
      new MissingPlayControl('Rest', 'No actionable button named Rest'),
    ],
    [
      'disabled',
      previous,
      fresh,
      new Error('Rest is shown but disabled right now (game state, not a driver failure)'),
    ],
    ['unrelated error', previous, fresh, new Error('Connection lost')],
  ] as const)('preserves the original error when %s', async (_label, cached, current, error) => {
    const result = await runPlayOperation(
      { op: 'tap', name: 'Rest' },
      {
        previous: cached,
        act: async () => {
          throw error;
        },
        snapshot: async () => current,
      },
    );
    expect(reply(result).error).toBe(error.message);
    expect(reply(result).controls).toBe(current.controls);
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
