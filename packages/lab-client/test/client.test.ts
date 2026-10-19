import { gunzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createLab,
  gzip,
  isLocalhost,
  newSessionId,
  privacySignal,
  runEnvelope,
  viewportClass,
} from '../src/index.ts';

describe('lab client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('honours Do Not Track and Global Privacy Control', () => {
    expect(privacySignal({ navigator: { globalPrivacyControl: true } })).toBe(true);
    expect(privacySignal({ navigator: { doNotTrack: '1' } })).toBe(true);
    expect(privacySignal({ doNotTrack: '1' })).toBe(true);
    expect(privacySignal({ navigator: { doNotTrack: '0' } })).toBe(false);
  });

  it('classes viewports by width only', () => {
    expect([360, 412, 768, 1440].map(viewportClass)).toEqual(['phone', 'phone', 'tablet', 'desktop']);
  });

  it('recognises localhost', () => {
    expect(['localhost', '127.0.0.1', 'pass.localhost'].every(isLocalhost)).toBe(true);
    expect(isLocalhost('pass.adamwhite.work')).toBe(false);
  });

  it('makes random 16-character session ids', () => {
    const a = newSessionId();
    expect(a).toMatch(/^[a-z0-9]{16}$/);
    expect(newSessionId()).not.toBe(a);
  });

  it('builds the exact envelope, omitting empty note and label', async () => {
    expect(runEnvelope('pass', { c: 'abc' }, { seed: 1 }, { note: '  ', who: '' })).toEqual({
      v: 1,
      game: 'pass',
      build: { c: 'abc' },
      run: { seed: 1 },
    });
    const text = JSON.stringify(
      runEnvelope('pass', {}, { seed: 1 }, { note: 'bored at night 3', who: 'owner' }),
    );
    const gz = await gzip(text);
    expect(gunzipSync(new Uint8Array(await gz.arrayBuffer())).toString()).toBe(text);
  });

  it('sends nothing from localhost or under GPC, but still sends an explicit run', async () => {
    const calls: { url: string; body: unknown }[] = [];
    vi.stubGlobal('location', { hostname: 'localhost' });
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body });
      return Response.json({ ok: true, id: 'r-abcdefghjk' });
    });
    const lab = createLab({ game: 'pass', build: { c: 'abc1234' } });
    expect(lab.eventsOn).toBe(false);
    lab.milestone('service 1 done');
    lab.flush();
    expect(calls).toHaveLength(0);
    const id = await lab.sendRun({ seed: 3 }, { note: 'hello' });
    expect(id).toBe('r-abcdefghjk');
    expect(calls[0]?.url).toBe('https://human.adamwhite.work/lab/api/run');
  });

  it('reports a refusal from the notebook as an error', async () => {
    vi.stubGlobal('location', { hostname: 'pass.adamwhite.work' });
    vi.stubGlobal('fetch', async () => Response.json({ error: 'Too many runs at once.' }, { status: 429 }));
    const lab = createLab({ game: 'pass', build: {} });
    await expect(lab.sendRun({})).rejects.toThrow('Too many runs at once.');
  });
});
