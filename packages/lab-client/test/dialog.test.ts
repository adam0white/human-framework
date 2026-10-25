import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLab, RUN_LIMITS } from '../src/index.ts';
import { documentFixture } from './dom.ts';

function setup() {
  vi.stubGlobal('location', { hostname: 'human.adamwhite.work', origin: 'https://human.adamwhite.work' });
  const document = documentFixture();
  vi.stubGlobal('document', document);
  const lab = createLab({ game: 'pass', build: {} });
  const sent: string[] = [];
  lab.sendFeedback = async (note, options = {}) => {
    sent.push(
      JSON.stringify({
        v: 1,
        game: lab.game,
        build: lab.build(),
        run: options.run ?? { feedbackOnly: true },
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(options.name?.trim() ? { name: options.name.trim() } : {}),
      }),
    );
    return 'r-example';
  };
  const find = (name: string) => {
    const node = document.body.all().find((node) => node.id === name || node.className === name);
    if (!node) throw new Error(`Missing dialog element: ${name}`);
    return node;
  };
  return { lab, sent, find, document };
}
const oversized = () => ({ state: 'x'.repeat(RUN_LIMITS.inflatedBytes) });
const settled = () =>
  vi.waitFor(() => {
    const fixture = document as unknown as ReturnType<typeof documentFixture>;
    const status = fixture.body.all().find((node) => node.className.startsWith('status'));
    expect(status?.textContent).not.toBe('Checking run size…');
  });
afterEach(() => vi.unstubAllGlobals());

describe('bounded send dialog', () => {
  it('remembers an optional name locally and sends the name shown in the preview', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    const { lab, find, sent, document } = setup();
    lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
    find('hflab-name').value = '  Sam  ';
    await find('hflab-name').fire('input');
    await settled();
    expect(JSON.parse(find('exact').value).name).toBe('Sam');
    await find('send').fire('click');
    expect(JSON.parse(sent[0] ?? '{}').name).toBe('Sam');
    await document.body
      .all()
      .find((node) => node.textContent === 'Close')
      ?.fire('click');
    lab.openSendDialog({ getRun: () => ({ seed: 2 }) });
    expect(find('hflab-name').value).toBe('Sam');
    await settled();
  });
  it.each(['off', 'privacy', 'persona'])('sends from the same sheet when %s', async (choice) => {
    vi.stubGlobal('location', { hostname: 'human.adamwhite.work', origin: 'https://human.adamwhite.work' });
    vi.stubGlobal('navigator', choice === 'privacy' ? { globalPrivacyControl: true } : {});
    const { lab, find, sent, document } = setup();
    if (choice === 'off') lab.setTelemetryOff(true);
    if (choice === 'persona') lab.setPersonaRecording('continuing-person');
    lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
    await settled();
    await find('send').fire('click');
    expect(sent).toHaveLength(1);
    expect(document.body.all().filter((node) => node.className === 'hflab')).toHaveLength(1);
    expect(lab.personaRecordingAllowed).toBe(true);
  });

  it.each(['off', 'dnt', 'gpc'] as const)('defers checkbox opt-in until Submit (%s)', async (choice) => {
    vi.stubGlobal(
      'navigator',
      choice === 'dnt' ? { doNotTrack: '1' } : choice === 'gpc' ? { globalPrivacyControl: true } : {},
    );
    for (const ticked of [false, true]) {
      const { lab, find, sent, document } = setup();
      if (choice === 'off') lab.setTelemetryOff(true);
      const send = vi.spyOn(lab, 'sendFeedback');
      lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
      const checkbox = find('hflab-share') as unknown as HTMLInputElement & {
        fire(type: string): Promise<void>;
      };
      expect(checkbox.checked).toBe(false);
      checkbox.checked = ticked;
      await checkbox.fire('change');
      await settled();
      expect(lab.telemetryOn).toBe(false);
      await find('send').fire('click');
      expect(send).toHaveBeenLastCalledWith('', expect.objectContaining({ sharePlay: ticked }));
      expect(JSON.parse(sent[0] ?? '{}').run).toEqual(ticked ? { seed: 1 } : { feedbackOnly: true });
      document.body
        .all()
        .find((node) => node.textContent === 'Close')
        ?.fire('click');
    }
  });

  it('shows the compact payload and disclosure before consent, and sends that same text', async () => {
    const { lab, sent, find, document } = setup();
    const compact = vi.fn(() => ({ seed: 7, inputs: ['wait'] }));
    lab.openSendDialog({ getRun: oversized, compact, compactNote: 'Only the seed and inputs are included.' });
    await settled();
    const preview = find('exact').value;
    expect(JSON.parse(preview)).toEqual({
      v: 1,
      game: 'pass',
      build: {},
      run: { seed: 7, inputs: ['wait'] },
    });
    expect(
      document.body.all().some((node) => node.textContent === 'Only the seed and inputs are included.'),
    ).toBe(true);
    expect(sent).toEqual([]);
    expect(find('send').disabled).toBe(false);
    await find('send').fire('click');
    expect(JSON.parse(sent[0] ?? '{}')).toEqual(JSON.parse(preview));
    expect(preview).toContain('\n  "v": 1,');
    expect(compact).toHaveBeenCalledTimes(1);
  });

  it('formats the current frozen payload and selects it if copying fails', async () => {
    const { lab, sent, find } = setup();
    const run = { seed: 3, inputs: ['wait'], state: { minute: 15 } };
    lab.openSendDialog({ getRun: () => run });
    run.inputs.push('later');
    find('hflab-note').value = '  A note\nwith two lines  ';
    await find('hflab-note').fire('input');
    await settled();
    const preview = find('exact');
    expect(preview.value).toBe(JSON.stringify(JSON.parse(preview.value), null, 2));
    expect(find('hflab-preview-note').textContent).toBe('A note\nwith two lines');
    expect(find('hflab-preview-inputs').textContent).toBe('1');
    const select = vi.fn();
    Object.assign(preview, { select });
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
    });
    await find('hflab-copy').fire('click');
    expect(select).toHaveBeenCalledOnce();
    await find('send').fire('click');
    expect(JSON.parse(preview.value)).toEqual(JSON.parse(sent[0] ?? '{}'));
    expect(JSON.parse(preview.value).run.inputs).toEqual(['wait']);
  });

  it('discloses compaction by default and never reruns the callback on note edits', async () => {
    const { lab, find, document } = setup();
    const compact = vi.fn(() => ({ seed: 1 }));
    lab.openSendDialog({ getRun: oversized, compact });
    await settled();
    expect(document.body.all().some((node) => /shortened to fit the notebook/i.test(node.textContent))).toBe(
      true,
    );
    find('hflab-note').value = 'hello';
    await find('hflab-note').fire('input');
    await settled();
    expect(compact).toHaveBeenCalledTimes(1);
    expect(JSON.parse(find('exact').value).note).toBe('hello');
  });

  it('sends a note when the run cannot fit or be exported', async () => {
    const { lab, find, sent } = setup();
    lab.openSendDialog({ getRun: oversized });
    find('hflab-note').value = 'Please fix the crossing';
    await find('hflab-note').fire('input');
    await settled();
    expect(find('send').disabled).toBe(false);
    await find('send').fire('click');
    expect(JSON.parse(sent[0] ?? '{}')).toMatchObject({
      note: 'Please fix the crossing',
      run: { feedbackOnly: true },
    });
  });

  it.each([null, undefined])('shows a transport refusal when sending throws %s', async (failure) => {
    const { lab, find, document } = setup();
    lab.sendFeedback = async () => {
      throw failure;
    };
    lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
    await settled();
    await find('send').fire('click');
    expect(
      document.body
        .all()
        .some((node) => node.textContent.startsWith('Not sent: the notebook could not be reached.')),
    ).toBe(true);
    expect(find('send').disabled).toBe(false);
  });

  it('keeps refused feedback across closing and reopening the dialog', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    const { lab, find, document } = setup();
    lab.sendFeedback = async () => {
      throw new Error('offline');
    };
    lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
    find('hflab-note').value = 'Keep my feedback';
    await find('hflab-note').fire('input');
    await settled();
    await find('send').fire('click');
    expect(find('status err').textContent).toContain('saved on this device');
    await document.body
      .all()
      .find((node) => node.textContent === 'Back to the game')
      ?.fire('click');
    lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
    expect(find('hflab-note').value).toBe('Keep my feedback');
    await settled();
  });

  it('ignores a stale compressed-size result after a later edit', async () => {
    const { lab, find, sent } = setup();
    const results: ((body: Blob) => void)[] = [];
    const blob = vi
      .spyOn(Response.prototype, 'blob')
      .mockImplementation(() => new Promise((resolve) => results.push(resolve)));
    try {
      lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
      find('hflab-note').value = 'latest';
      await find('hflab-note').fire('input');
      expect(results).toHaveLength(2);
      results[1]?.(new Blob(['small']));
      await settled();
      expect(find('send').disabled).toBe(false);
      results[0]?.(new Blob([new Uint8Array(RUN_LIMITS.compressedBytes + 1)]));
      await settled();
      expect(find('send').disabled).toBe(false);
      await find('send').fire('click');
      expect(JSON.parse(sent[0] ?? '{}').note).toBe('latest');
    } finally {
      blob.mockRestore();
    }
  });

  it('keeps the preview current and disables consent while recomputing compressed size', async () => {
    const { lab, find, sent } = setup();
    lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
    await settled();
    expect(find('send').disabled).toBe(false);
    find('hflab-note').value = 'new note';
    const refreshing = find('hflab-note').fire('input');
    expect(find('send').disabled).toBe(true);
    await refreshing;
    await settled();
    expect(JSON.parse(find('exact').value).note).toBe('new note');
    await find('send').fire('click');
    expect(JSON.parse(sent[0] ?? '{}')).toEqual(JSON.parse(find('exact').value));
  });
});

it('uses Feedback as the default one-page dialog title', async () => {
  const { lab, find } = setup();
  lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
  await settled();
  expect(find('hflab-title').children).toContain('Feedback');
  expect(find('hflab-note')).toBeDefined();
});

it('opts in to quiet choices, previews their exact text and sends only on Submit', async () => {
  const { lab, find, sent, document } = setup();
  lab.openSendDialog({ getRun: () => ({ seed: 17 }), feedbackChoices: true });
  await settled();
  const stopping = document.body.all().find((n) => n.children.includes("I'm stopping"));
  const confused = document.body.all().find((n) => n.children.includes("I'm confused"));
  expect(stopping).toBeDefined();
  await stopping?.fire('click');
  await confused?.fire('click');
  await settled();
  expect(sent).toHaveLength(0);
  expect(JSON.parse(find('exact').value).note).toBe("I'm confused");
  await find('send').fire('click');
  expect(JSON.parse(sent[0] ?? '{}').note).toBe("I'm confused");
  expect(find('status ok').textContent).toContain('Reference r-example');
});
it('keeps quiet choices absent without opt-in', async () => {
  const { lab, document } = setup();
  lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
  await settled();
  expect(document.body.all().some((n) => n.children.includes("I'm stopping"))).toBe(false);
});
