import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLab, RUN_LIMITS } from '../src/index.ts';
import { documentFixture } from './dom.ts';

function setup() {
  const document = documentFixture();
  vi.stubGlobal('document', document);
  const lab = createLab({ game: 'pass', build: {} });
  const sent: string[] = [];
  lab.sendEnvelopeText = async (text) => {
    sent.push(text);
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
  it('offers explicit browser-signal consent and lets the player revoke it', async () => {
    vi.stubGlobal('location', { hostname: 'pass.adamwhite.work' });
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    vi.stubGlobal('localStorage', undefined);
    const { lab, find } = setup();
    lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
    expect(find('hflab-privacy-note').textContent).toContain('Automatic lab recording is off.');
    const box = find('hflab-privacy-override');
    expect(lab.eventsOn).toBe(false);
    Object.assign(box, { checked: true });
    await box.fire('change');
    expect(lab.eventsOn).toBe(true);
    Object.assign(box, { checked: false });
    await box.fire('change');
    expect(lab.eventsOn).toBe(false);
    await settled();
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
      compacted: true,
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
    expect(JSON.parse(find('exact').value).compacted).toBe(true);
  });

  it('disables sending and explains an uncompactable oversized run', async () => {
    const { lab, find, sent, document } = setup();
    lab.openSendDialog({ getRun: oversized });
    await settled();
    expect(find('send').disabled).toBe(true);
    expect(document.body.all().some((node) => /saved export file/i.test(node.textContent))).toBe(true);
    await find('send').fire('click');
    expect(sent).toEqual([]);
  });

  it('refuses an oversized compact result after calling the callback only once', async () => {
    const { lab, find, sent } = setup();
    const compact = vi.fn(oversized);
    lab.openSendDialog({ getRun: oversized, compact });
    await settled();
    expect(find('send').disabled).toBe(true);
    expect(compact).toHaveBeenCalledTimes(1);
    await find('send').fire('click');
    expect(sent).toEqual([]);
  });

  it.each(['undefined', 'null', 'throws'] as const)(
    'keeps a failed mutating compactor refused after note edits (%s)',
    async (failure) => {
      const { lab, find, sent } = setup();
      const compact = vi.fn((run: unknown) => {
        (run as { state: string }).state = 'shrunk';
        if (failure === 'throws') throw new Error('compaction failed');
        return failure === 'null' ? null : undefined;
      });
      lab.openSendDialog({ getRun: oversized, compact });
      await settled();
      expect(find('send').disabled).toBe(true);
      find('hflab-note').value = 'edited after the failure';
      await find('hflab-note').fire('input');
      await settled();
      expect(find('send').disabled).toBe(true);
      expect(compact).toHaveBeenCalledTimes(1);
      await find('send').fire('click');
      expect(sent).toEqual([]);
    },
  );

  it.each([null, undefined])('shows a refusal when the compactor throws %s', async (failure) => {
    const { lab, find, document } = setup();
    lab.openSendDialog({
      getRun: oversized,
      compact: () => {
        throw failure;
      },
    });
    await settled();
    expect(find('send').disabled).toBe(true);
    expect(
      document.body.all().some((node) => node.textContent === 'Not sent: the run could not be prepared.'),
    ).toBe(true);
  });

  it.each([null, undefined])('shows a transport refusal when sending throws %s', async (failure) => {
    const { lab, find, document } = setup();
    lab.sendEnvelopeText = async () => {
      throw failure;
    };
    lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
    await settled();
    await find('send').fire('click');
    expect(
      document.body.all().some((node) => node.textContent === 'Not sent: the notebook could not be reached.'),
    ).toBe(true);
    expect(find('send').disabled).toBe(false);
  });

  it('refuses a gzip body over the compressed limit in the dialog', async () => {
    const { lab, find, sent, document } = setup();
    const blob = vi
      .spyOn(Response.prototype, 'blob')
      .mockResolvedValue(new Blob([new Uint8Array(RUN_LIMITS.compressedBytes + 1)]));
    try {
      lab.openSendDialog({ getRun: () => ({ seed: 1 }) });
      await settled();
      expect(find('send').disabled).toBe(true);
      expect(document.body.all().some((node) => /compressed run is .* MB/i.test(node.textContent))).toBe(
        true,
      );
      await find('send').fire('click');
      expect(sent).toEqual([]);
    } finally {
      blob.mockRestore();
    }
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
