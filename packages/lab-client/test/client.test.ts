import { gunzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as identity from '../src/identity.ts';
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
  it('bounds serialized log messages so a full Unicode burst and later screen deliver', async () => {
    const lab = createLab({ game: 'pass', build: { a: 'log-bytes' } });
    for (let i = 0; i < 59; i++) lab.log('game', '界'.repeat(1000));
    lab.log('game', '\u0000'.repeat(1000));
    lab.flush();
    await vi.waitFor(() => expect(envelopes.some((e) => e.kind === 'logs')).toBe(true));
    const logs = envelopes.find((e) => e.kind === 'logs')?.data as { message: string }[];
    expect(logs).toHaveLength(60);
    expect(logs[0]?.message).toBe('界'.repeat(333));
    expect(logs[59]?.message).toBe('\u0000'.repeat(166));
    for (const { message } of logs) {
      expect(new TextEncoder().encode(JSON.stringify(message).slice(1, -1)).byteLength).toBeLessThanOrEqual(
        1000,
      );
    }
    lab.screen('after Unicode logs');
    lab.flush();
    await vi.waitFor(() =>
      expect(
        envelopes.some((e) => e.kind === 'events' && JSON.stringify(e.data).includes('after Unicode logs')),
      ).toBe(true),
    );
  });

  it('retains 1000 ASCII characters and whole astral characters at the log limit', async () => {
    const lab = createLab({ game: 'pass', build: { a: 'log-bytes' } });
    lab.log('game', 'x'.repeat(1000));
    lab.log('game', `${'x'.repeat(999)}😀`);
    lab.flush();
    await vi.waitFor(() => expect(envelopes.some((e) => e.kind === 'logs')).toBe(true));
    const logs = envelopes.find((e) => e.kind === 'logs')?.data as { message: string }[];
    expect(logs.map((entry) => entry.message)).toEqual(['x'.repeat(1000), 'x'.repeat(999)]);
  });

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
  it('migrates obsolete persona decisions without prompting or interrupting recording', async () => {
    values.set('hf-persona-recording:fictional-branch', 'old-player');
    const lab = createLab({ game: 'pass', build: {} });
    lab.setPersonaRecording('fictional-branch');
    expect(values.has('hf-persona-recording:fictional-branch')).toBe(false);
    lab.allowPersonaRecording(false);
    expect(lab.personaRecordingAllowed).toBe(true);
    expect(lab.personaRecordingRequired).toBe(false);
    expect(lab.eventsOn).toBe(true);
    lab.setTelemetryOff(true);
    lab.setTelemetryOff(false);
    await lab.sendRun({ seed: 3 });
    await waitFor(1);
    expect(envelopes[0]).toMatchObject({ kind: 'run', player: lab.playerId });
  });

  it.each(['on', 'off', 'dnt', 'gpc'] as const)(
    'sends the run and linked note only when recording is on or sharing is ticked (%s)',
    async (choice) => {
      for (const sharePlay of [false, true]) {
        values.clear();
        envelopes.length = 0;
        vi.stubGlobal(
          'navigator',
          choice === 'dnt' ? { doNotTrack: '1' } : choice === 'gpc' ? { globalPrivacyControl: true } : {},
        );
        vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
          envelopes.push(
            JSON.parse(
              gunzipSync(new Uint8Array(await ((init?.body ?? new Blob()) as Blob).arrayBuffer())).toString(),
            ),
          );
          return Response.json({ ok: true, id: 'r-feedback' });
        });
        const lab = createLab({ game: 'voice', build: {} });
        if (choice === 'off') lab.setTelemetryOff(true);
        lab.setPersonaRecording('continuing-person');
        lab.allowPersonaRecording(false);
        await lab.sendFeedback('QA feedback-frictionless', { run: { seed: 3 }, sharePlay });
        if (choice === 'on' || sharePlay) {
          expect(lab.telemetryOn).toBe(true);
          await waitFor(2);
          expect(envelopes.map((e) => e.kind)).toEqual(['run', 'note']);
          expect(envelopes.every((e) => e.player === lab.playerId)).toBe(true);
          expect(envelopes[0]?.runId).toBe(envelopes[1]?.runId);
        } else {
          expect(lab.telemetryOn).toBe(false);
          expect(envelopes).toEqual([
            { v: 1, game: 'voice', build: {}, run: { feedbackOnly: true }, note: 'QA feedback-frictionless' },
          ]);
        }
      }
    },
  );

  it.each([{ doNotTrack: '1' }, { globalPrivacyControl: true }])(
    'enables recording from the single switch under browser privacy signal %j',
    async (navigator) => {
      vi.stubGlobal('navigator', navigator);
      const lab = createLab({ game: 'voice', build: {} });
      expect(lab.telemetryOn).toBe(false);
      lab.setTelemetryOff(false);
      expect(lab.telemetryOn).toBe(true);
      expect(lab.privacyOverride).toBe(true);
      expect(lab.playerId).not.toBeNull();
      await lab.sendFeedback('single switch');
      await waitFor(1);
      expect(envelopes[0]).toMatchObject({ kind: 'note', privacyOverride: true });
      lab.setTelemetryOff(true);
      expect(lab.telemetryOn).toBe(false);
    },
  );
  it.each([false, true])(
    'keeps feedback note-only if recording turns off during compression (linked: %s)',
    async (linked) => {
      vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
        envelopes.push(
          JSON.parse(
            gunzipSync(new Uint8Array(await ((init?.body ?? new Blob()) as Blob).arrayBuffer())).toString(),
          ),
        );
        return Response.json({ id: 'r-feedback' });
      });
      const lab = createLab({ game: 'voice', build: {} });
      lab.setPersonaRecording('private-persona-key');
      if (linked) lab.allowPersonaRecording(true);
      let finish: ((body: Blob) => void) | undefined;
      vi.spyOn(Response.prototype, 'blob').mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
      const sending = lab.sendFeedback('Keep this note', { run: { secret: 'continuing state' } });
      await vi.waitFor(() => expect(finish).toBeDefined());
      lab.setTelemetryOff(true);
      finish?.(new Blob(['compressed candidate']));
      await sending;
      expect(envelopes).toEqual([
        { v: 1, game: 'voice', build: {}, run: { feedbackOnly: true }, note: 'Keep this note' },
      ]);
    },
  );
  it('does not abort an explicit note when the identity bridge echoes recording off during fetch', async () => {
    let echo: ((player: string | null, off: boolean) => void) | undefined;
    vi.spyOn(identity, 'identityBridge').mockImplementation((change) => {
      echo = change;
      return { ready: Promise.resolve(), setOff: () => {} };
    });
    let finish: ((response: Response) => void) | undefined;
    let signal: AbortSignal | null | undefined;
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      signal = init?.signal;
      envelopes.push(
        JSON.parse(
          gunzipSync(new Uint8Array(await ((init?.body ?? new Blob()) as Blob).arrayBuffer())).toString(),
        ),
      );
      return new Promise<Response>((resolve, reject) => {
        finish = resolve;
        signal?.addEventListener('abort', () => reject(signal?.reason));
      });
    });
    const lab = createLab({ game: 'voice', build: {} });
    lab.setTelemetryOff(true);
    const result = lab.sendFeedback('QA feedback-fix').then(
      (id) => ({ id }),
      (error: unknown) => ({ error }),
    );
    await vi.waitFor(() => expect(finish).toBeDefined());
    echo?.(null, true);
    finish?.(Response.json({ id: 'r-feedback' }));
    expect(await result).toEqual({ id: 'r-feedback' });
    expect(signal?.aborted ?? false).toBe(false);
    expect(envelopes).toEqual([
      { v: 1, game: 'voice', build: {}, run: { feedbackOnly: true }, note: 'QA feedback-fix' },
    ]);
  });
  it('falls back to an independent note if the off echo interrupts linked-note preparation', async () => {
    let echo: ((player: string | null, off: boolean) => void) | undefined;
    vi.spyOn(identity, 'identityBridge').mockImplementation((change) => {
      echo = change;
      return { ready: Promise.resolve(), setOff: () => {} };
    });
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      envelopes.push(
        JSON.parse(
          gunzipSync(new Uint8Array(await ((init?.body ?? new Blob()) as Blob).arrayBuffer())).toString(),
        ),
      );
      return Response.json({ id: 'r-note' });
    });
    const lab = createLab({ game: 'voice', build: {} });
    let finish: ((body: Blob) => void) | undefined;
    vi.spyOn(Response.prototype, 'blob').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const result = lab.sendFeedback('QA feedback-fix').then(
      (id) => ({ id }),
      (error: unknown) => ({ error }),
    );
    await vi.waitFor(() => expect(finish).toBeDefined());
    echo?.(null, true);
    finish?.(new Blob(['compressed linked note']));
    expect(await result).toEqual({ id: 'r-note' });
    expect(envelopes).toEqual([
      { v: 1, game: 'voice', build: {}, run: { feedbackOnly: true }, note: 'QA feedback-fix' },
    ]);
  });
  it('keeps oversized continuing runs from blocking feedback', async () => {
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      envelopes.push(
        JSON.parse(
          gunzipSync(new Uint8Array(await ((init?.body ?? new Blob()) as Blob).arrayBuffer())).toString(),
        ),
      );
      return Response.json({ id: 'r-feedback' });
    });
    const lab = createLab({ game: 'voice', build: {} });
    lab.setPersonaRecording('private-persona-key');
    await lab.sendFeedback('Keep this note', { run: { state: 'x'.repeat(8 * 1024 * 1024) } });
    await waitFor(1);
    expect(envelopes[0]).toMatchObject({ kind: 'note', data: { note: 'Keep this note' } });
  });
  it('keeps the recording switch on while persona linkage is unanswered', () => {
    const lab = createLab({ game: 'voice', build: {} });
    lab.setPersonaRecording('private-persona-key');
    expect(lab.eventsOn).toBe(true);
    expect(lab.telemetryOn).toBe(true);
    lab.setTelemetryOff(true);
    expect(lab.telemetryOn).toBe(false);
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
  it('waits for the new on acknowledgement before sharing under the central identity', async () => {
    let acknowledge: (() => void) | undefined;
    vi.spyOn(identity, 'identityBridge').mockImplementation((change) => {
      let ready = Promise.resolve();
      return {
        get ready() {
          return ready;
        },
        setOff(off) {
          if (off) {
            change(null, true);
            return;
          }
          ready = new Promise<void>((resolve) => {
            acknowledge = () => {
              change('a'.repeat(32), false);
              resolve();
            };
          });
        },
      };
    });
    const lab = createLab({ game: 'voice', build: {} });
    lab.setTelemetryOff(true);
    const sent = lab.sendFeedback('Shared', { run: { seed: 1 }, sharePlay: true });
    await Promise.resolve();
    expect(envelopes).toHaveLength(0);
    acknowledge?.();
    await sent;
    await waitFor(2);
    expect(envelopes.every((envelope) => envelope.player === 'a'.repeat(32))).toBe(true);
  });

  it('does not strand the note on an unresolved optional snapshot', async () => {
    vi.useFakeTimers();
    const lab = createLab({ game: 'voice', build: {} });
    let calls = 0;
    const stop = lab.trackRun(() => (++calls === 1 ? undefined : new Promise(() => {})));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const sent = lab.sendFeedback('Keep the note');
    await vi.advanceTimersByTimeAsync(4001);
    await sent;
    vi.useRealTimers();
    await waitFor(1);
    expect(calls).toBe(2);
    expect(envelopes[0]).toMatchObject({ kind: 'note', data: { note: 'Keep the note' } });
    stop();
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
