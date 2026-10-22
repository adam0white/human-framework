import { gunzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLab,
  isLocalhost,
  newSessionId,
  privacySignal,
  runEnvelope,
  viewportClass,
} from '../src/index.ts';
import { LINKED_LIMITS, linkedTransport } from '../src/linked.ts';

const id = 'a'.repeat(32);
const envelopes: Record<string, unknown>[] = [];
let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  envelopes.length = 0;
  vi.stubGlobal('location', { hostname: 'human.adamwhite.work', origin: 'https://human.adamwhite.work' });
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('indexedDB', undefined);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('addEventListener', undefined);
  vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
    envelopes.push(
      JSON.parse(
        gunzipSync(new Uint8Array(await ((init?.body ?? new Blob()) as Blob).arrayBuffer())).toString(),
      ),
    );
    return Response.json({ ok: true });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function waitFor(count: number) {
  await vi.waitFor(() => expect(envelopes).toHaveLength(count));
}
describe('linked lab client', () => {
  it('shares player identity across games, keeps their sessions separate, and links events and saves', async () => {
    const well = createLab({ game: 'well', build: { c: 'abc1234' } });
    const voice = createLab({ game: 'voice', build: {} });
    well.flush();
    voice.flush();
    await waitFor(2);
    expect(envelopes[0]?.player).toBe(envelopes[1]?.player);
    expect(envelopes[0]?.session).not.toBe(envelopes[1]?.session);
    well.captureSave({ seed: 3, inputs: [], state: { day: 1 } });
    await waitFor(3);
    expect(envelopes[2]).toMatchObject({
      kind: 'save',
      player: well.playerId,
      session: envelopes.find((e) => e.game === 'well')?.session,
      runId: envelopes.find((e) => e.game === 'well')?.runId,
    });
  });
  it('stops uploads and removes identity immediately, including explicit sends', async () => {
    const lab = createLab({ game: 'well', build: {} });
    const before = lab.playerId;
    lab.screen('play');
    lab.setTelemetryOff(true);
    lab.flush();
    expect(lab.playerId).toBeNull();
    expect(values.has('hf-lab-player')).toBe(false);
    await expect(lab.sendRun({ seed: 3 })).rejects.toThrow('off');
    expect(envelopes).toHaveLength(0);
    lab.setTelemetryOff(false);
    expect(lab.playerId).not.toBe(before);
  });
  it('suppresses all automatic linked data under DNT/GPC until explicit per-game override', async () => {
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    const lab = createLab({ game: 'well', build: {} });
    expect(lab.telemetryOn).toBe(false);
    expect(lab.playerId).toBeNull();
    lab.captureSave({ seed: 1 });
    lab.log('warn', 'message');
    lab.flush();
    expect(envelopes).toHaveLength(0);
    lab.setPrivacyOverride(true);
    lab.screen('play');
    lab.flush();
    await waitFor(1);
    expect(envelopes[0]?.privacyOverride).toBe(true);
  });
  it('chunks a large complete snapshot, matches Worker byte bounds and deduplicates unchanged data', async () => {
    const lab = createLab({ game: 'well', build: {} });
    const run = { seed: 7, inputs: [], state: '界'.repeat(150000) };
    await lab.sendRun(run);
    await waitFor(3);
    const pieces = envelopes.map((e) => e.data as { text: string; index: number });
    expect(
      JSON.parse(
        pieces
          .sort((a, b) => a.index - b.index)
          .map((p) => p.text)
          .join(''),
      ),
    ).toEqual(run);
    expect(envelopes.every((e) => Buffer.byteLength(JSON.stringify(e)) <= LINKED_LIMITS.inflated)).toBe(true);
    await lab.sendRun(run);
    expect(envelopes).toHaveLength(3);
  });
  it('queues one stable piece for polite retry and clears it on opt-out', async () => {
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const requests: RequestInit[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      requests.push(init);
      return new Response(null, { status: 429 });
    });
    const transport = linkedTransport({
      game: 'well',
      endpoint: '/lab/api',
      link: () => ({ player: id, session: id, runId: id }),
      enabled: () => true,
      override: () => false,
      build: () => ({}),
    });
    await transport.send('note', { note: 'rough at night' });
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    await transport.drain();
    expect(requests).toHaveLength(1);
    now += 70000;
    await transport.drain();
    expect(requests).toHaveLength(2);
    expect(await ((requests[0]?.body ?? new Blob()) as Blob).text()).toBe(
      await ((requests[1]?.body ?? new Blob()) as Blob).text(),
    );
    transport.clear();
    now += 1000000;
    await transport.drain();
    expect(requests).toHaveLength(2);
  });
  it('attaches feedback to the linked run and scrubs common personal text in logs', async () => {
    const lab = createLab({ game: 'well', build: {} });
    lab.log('warn', 'failed https://example.com/a?secret=1 person@example.com');
    lab.flush();
    await waitFor(2);
    await lab.sendFeedback('stuck at the well');
    await waitFor(3);
    const log = envelopes.find((e) => e.kind === 'logs');
    expect(JSON.stringify(log?.data)).not.toContain('secret');
    expect(JSON.stringify(log?.data)).not.toContain('person@example.com');
    const note = envelopes.find((e) => e.kind === 'note');
    expect(note?.runId).toBe(log?.runId);
  });
  it('keeps optional feedback names at the envelope top level and bounds them', async () => {
    const lab = createLab({ game: 'well', build: {} });
    await lab.sendFeedback('A note', { name: `  ${'N'.repeat(70)}  ` });
    await waitFor(1);
    expect(envelopes[0]).toMatchObject({ kind: 'note', name: 'N'.repeat(60), data: { note: 'A note' } });
    await lab.sendFeedback('Another note', { name: '   ' });
    await waitFor(2);
    expect(envelopes[1]).not.toHaveProperty('name');
  });
  it('uses only random ids and coarse viewport classes', () => {
    expect(newSessionId()).toMatch(/^[a-z0-9]{16}$/);
    expect([360, 412, 768, 1440].map(viewportClass)).toEqual(['phone', 'phone', 'tablet', 'desktop']);
    expect(isLocalhost('pass.localhost')).toBe(true);
    expect(privacySignal({ navigator: { doNotTrack: '1' } })).toBe(true);
    expect(runEnvelope('well', {}, { seed: 1 }, { note: '  ' })).toEqual({
      v: 1,
      game: 'well',
      build: {},
      run: { seed: 1 },
    });
  });
});
