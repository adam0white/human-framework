import { gunzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRun, createLab, RUN_LIMITS } from '../src/index.ts';

const lab = () => createLab({ game: 'pass', build: { c: 'abc' } });
const largeRun = () => ({ state: '界'.repeat(Math.ceil(RUN_LIMITS.inflatedBytes / 3)) });

afterEach(() => vi.unstubAllGlobals());

describe('run allocation checks', () => {
  it('counts UTF-8 bytes at the inclusive inflated boundary', () => {
    expect(checkRun('a'.repeat(RUN_LIMITS.inflatedBytes))).toBe(true);
    expect(checkRun('a'.repeat(RUN_LIMITS.inflatedBytes + 1))).toBe(false);
    expect(checkRun('界'.repeat(Math.floor(RUN_LIMITS.inflatedBytes / 3) + 1))).toBe(false);
  });

  it('bounds tokens, containers and depth inclusively', () => {
    expect(checkRun(','.repeat(RUN_LIMITS.tokens))).toBe(true);
    expect(checkRun(','.repeat(RUN_LIMITS.tokens + 1))).toBe(false);
    expect(checkRun('[]'.repeat(RUN_LIMITS.containers))).toBe(true);
    expect(checkRun('[]'.repeat(RUN_LIMITS.containers + 1))).toBe(false);
    expect(checkRun('['.repeat(RUN_LIMITS.depth))).toBe(true);
    expect(checkRun('['.repeat(RUN_LIMITS.depth + 1))).toBe(false);
  });

  it('ignores quoted structure and escaped quotes without parsing JSON', () => {
    expect(checkRun(JSON.stringify({ text: '\\"[{,:'.repeat(RUN_LIMITS.tokens) }))).toBe(true);
    expect(checkRun('not JSON')).toBe(true);
    expect(checkRun(`${JSON.stringify('\\"[{,:')}${','.repeat(RUN_LIMITS.tokens + 1)}`)).toBe(false);
  });
});

describe('bounded upload', () => {
  it('leaves an under-limit 0.1.1 envelope byte-identical and never compacts it', async () => {
    let sent = '';
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      sent = gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString();
      return Response.json({ id: 'r-example' });
    });
    const compact = vi.fn(() => ({ seed: 3 }));
    await lab().sendRun({ seed: 1 }, { note: ' hi ', who: ' owner ', compact });
    expect(sent).toBe('{"v":1,"game":"pass","note":"hi","who":"owner","build":{"c":"abc"},"run":{"seed":1}}');
    expect(compact).not.toHaveBeenCalled();
  });

  it('refuses oversized envelopes before compression or fetch', async () => {
    const compression = vi.fn(() => {
      throw new Error('compression attempted');
    });
    const fetch = vi.fn();
    vi.stubGlobal('CompressionStream', compression);
    vi.stubGlobal('fetch', fetch);
    await expect(lab().sendRun(largeRun())).rejects.toThrow(/saved export file/i);
    await expect(lab().sendEnvelopeText('['.repeat(RUN_LIMITS.depth + 1))).rejects.toThrow(
      /saved export file/i,
    );
    expect(compression).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('compacts once and sends the replacement with an explicit envelope marker', async () => {
    let sent: unknown;
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      sent = JSON.parse(gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString());
      return Response.json({ id: 'r-example' });
    });
    const run = largeRun();
    const compact = vi.fn(() => ({ seed: 4, inputs: ['wait'] }));
    await expect(lab().sendRun(run, { note: 'hello', compact })).resolves.toBe('r-example');
    expect(compact).toHaveBeenCalledExactlyOnceWith(run);
    expect(sent).toEqual({
      v: 1,
      game: 'pass',
      note: 'hello',
      build: { c: 'abc' },
      run: { seed: 4, inputs: ['wait'] },
      compacted: true,
    });
  });

  it('rechecks the compacted envelope and refuses it without retrying', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const run = largeRun();
    const compact = vi.fn(() => run);
    await expect(lab().sendRun(run, { compact })).rejects.toThrow(/saved export file/i);
    expect(compact).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([undefined, null])('refuses a missing compact replacement (%s)', async (replacement) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(lab().sendRun(largeRun(), { compact: () => replacement })).rejects.toThrow(
      /saved export file/i,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports the inflated size and cap in the refusal', async () => {
    await expect(lab().sendRun(largeRun())).rejects.toThrow(
      'This run is 4.1 MB; the notebook takes up to 4 MB. Your saved export file still has everything.',
    );
  });

  it('explains complexity refusals even when the bytes fit', async () => {
    await expect(lab().sendEnvelopeText('['.repeat(RUN_LIMITS.depth + 1))).rejects.toThrow(
      'This run is too long to send in one piece. Your saved export file still has all of it.',
    );
  });

  it('includes the envelope overhead in preflight', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const run = 'x'.repeat(RUN_LIMITS.inflatedBytes - 2);
    expect(checkRun(JSON.stringify(run))).toBe(true);
    await expect(lab().sendRun(run)).rejects.toThrow(/saved export file/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a gzip body at the inclusive compressed limit', async () => {
    const body = new Blob([new Uint8Array(RUN_LIMITS.compressedBytes)]);
    const blob = vi.spyOn(Response.prototype, 'blob').mockResolvedValue(body);
    const received: unknown[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      received.push(init.body);
      return Response.json({ id: 'r-example' });
    });
    try {
      await expect(lab().sendRun({ seed: 1 })).resolves.toBe('r-example');
      expect(received).toEqual([body]);
    } finally {
      blob.mockRestore();
    }
  });

  it('rejects an oversized gzip body before fetch', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    // Keep the real gzip pipeline, but replace its final Blob with a deliberately oversized body.
    const blob = vi
      .spyOn(Response.prototype, 'blob')
      .mockResolvedValue(new Blob([new Uint8Array(RUN_LIMITS.compressedBytes + 1)]));
    try {
      await expect(lab().sendRun({ seed: 1 })).rejects.toThrow(/compressed run is .* MB/i);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      blob.mockRestore();
    }
  });
});
