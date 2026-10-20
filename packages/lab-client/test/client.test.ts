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
  it('sends the end event when the page closes before its build lookup answers', () => {
    const listeners = new Map<string, () => void>();
    const bodies: { e: unknown[][]; b: object }[] = [];
    vi.stubGlobal('location', { hostname: 'pass.adamwhite.work' });
    vi.stubGlobal('sessionStorage', undefined);
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('setInterval', () => 0);
    vi.stubGlobal('addEventListener', (kind: string, listener: () => void) => {
      listeners.set(kind, listener);
    });
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      if (url === '/release.json') return new Promise<Response>(() => {});
      bodies.push(JSON.parse(String(init?.body)));
      return Promise.resolve(Response.json({}));
    });
    createLab({ game: 'pass' });
    listeners.get('pagehide')?.();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.e.at(-1)?.[0]).toBe('end');
    expect(bodies[0]?.b).toEqual({});
  });

  it('splits UTF-8 batches below the server byte limit without dropping events', () => {
    const bodies: string[] = [];
    vi.stubGlobal('location', { hostname: 'pass.adamwhite.work' });
    vi.stubGlobal('sessionStorage', undefined);
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return Response.json({});
    });
    const lab = createLab({ game: 'pass', build: {} });
    for (let i = 0; i < 39; i++) lab.screen(`${'界'.repeat(78)}${String(i).padStart(2, '0')}`);
    lab.flush();
    expect(bodies.every((body) => new TextEncoder().encode(body).length <= 8192)).toBe(true);
    expect(bodies.flatMap((body) => JSON.parse(body).e)).toHaveLength(40);
  });

  it('keeps session ids and elapsed time separate for games sharing an origin', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    });
    vi.stubGlobal('location', { hostname: 'human.adamwhite.work' });
    const sent: { g: string; s: string; e: unknown[][] }[] = [];
    vi.stubGlobal('fetch', async (_url: string, opts?: RequestInit) => {
      sent.push(JSON.parse(String(opts?.body)));
      return Response.json({});
    });
    const time = vi.spyOn(Date, 'now').mockReturnValue(1000000);
    try {
      const a = createLab({ game: 'well', build: {} });
      a.flush();
      time.mockReturnValue(1060000);
      const b = createLab({ game: 'voice', build: {} });
      b.screen('play');
      b.flush();
      const aReload = createLab({ game: 'well', build: {} });
      aReload.screen('play');
      aReload.flush();
      expect(sent[0]?.e).toEqual([['start', 0]]);
      expect(sent[1]?.e).toEqual([
        ['start', 0],
        ['scr', 0, 'play'],
      ]);
      expect(sent[1]?.s).not.toBe(sent[0]?.s);
      expect(sent[2]?.s).toBe(sent[0]?.s);
      expect(sent[2]?.e).toEqual([['scr', 60000, 'play']]);
    } finally {
      time.mockRestore();
    }
  });

  it('shares opt-out across open clients and clears queued events', () => {
    const values = new Map<string, string>();
    const listeners: ((event: { key: string; newValue: string | null }) => void)[] = [];
    vi.stubGlobal('location', { hostname: 'pass.adamwhite.work' });
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    });
    vi.stubGlobal(
      'addEventListener',
      (type: string, fn: (event: { key: string; newValue: string | null }) => void) => {
        if (type === 'storage') listeners.push(fn);
      },
    );
    vi.stubGlobal('setInterval', () => 0);
    const send = vi.fn(async () => Response.json({}));
    vi.stubGlobal('fetch', send);
    const a = createLab({ game: 'pass', build: {} });
    const b = createLab({ game: 'pass', build: {} });
    b.screen('title');
    a.setEventsOff(true);
    for (const listener of listeners) listener({ key: 'hf-lab-events-off:pass', newValue: '1' });
    expect(b.eventsOn).toBe(false);
    b.flush();
    a.setEventsOff(false);
    for (const listener of listeners) listener({ key: 'hf-lab-events-off:pass', newValue: null });
    b.flush();
    expect(send).not.toHaveBeenCalled();
  });

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
