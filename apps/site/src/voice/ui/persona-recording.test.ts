import type { PersonaEnvelope } from '@adam0white/lab-client';
import { expect, it, vi } from 'vitest';
import { requireValue } from '../../shared/require-value.ts';

const fixture = vi.hoisted(() => {
  const allowed = new Set(['known-branch']);
  let key: string | null = null;
  let resolve: (value: unknown) => void = () => {};
  const request = vi.fn(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  return {
    request,
    reply: (value: unknown) => resolve(value),
    lab: {
      setPersonaRecording(value: string | null) {
        key = value;
      },
      allowPersonaRecording(value: boolean) {
        if (key) {
          if (value) allowed.add(key);
          else allowed.delete(key);
        }
      },
      get personaRecordingAllowed() {
        return key === null || allowed.has(key);
      },
      get playerId() {
        return key === null || allowed.has(key) ? 'current-player' : null;
      },
    },
  };
});
vi.mock('../../shared/lab.tsx', () => ({ gameLabs: { voice: fixture.lab } }));
vi.mock('@adam0white/lab-client', async (original) => ({
  ...(await original<typeof import('@adam0white/lab-client')>()),
  personaChannel: () => ({ ready: Promise.resolve(true), enabled: true, request: fixture.request }),
}));

import { gateVoiceFile, resetVoicePersona, settleVoiceFileGate } from './persona.tsx';

it('accepts an old recorded branch without a separate recording decision RPC', async () => {
  const head = {
    branchId: 'known-branch',
    revision: 'revision',
    castId: 'hf.cast.selin.voice',
  } as PersonaEnvelope;
  await gateVoiceFile(JSON.stringify({ voicePersonaHead: head }));
  settleVoiceFileGate(true);
  await Promise.resolve();
  expect(fixture.lab.personaRecordingAllowed).toBe(true);
  expect(fixture.request).not.toHaveBeenCalled();
  resetVoicePersona();
});

it('native hide publishes an actual played departure, pins its full prefix and refreshes autosave after receipt', async () => {
  const { RecordedGame, voiceState, voiceHash } = await import('../sim/record.ts');
  const { VoiceGame } = await import('../sim/game.ts');
  const { play } = await import('../sim/headless.ts');
  const { ENGINE_VERSION } = await import('@adam0white/human-framework');
  const { makePlaytestFile } = await import('../../shared/playtest.ts');
  const { acceptPersona } = await import('@adam0white/lab-client');
  const { saveVoice, VOICE_SAVE_KEY } = await import('./autosave.ts');
  const persona = await import('./persona.tsx');
  const rec = new RecordedGame(new VoiceGame(7, 4));
  play(rec, { stop: (game) => (game.run.ppl.selin.agenda.owed?.length ?? 0) > 0 || game.t > 4 * 1440 });
  rec.apply({ type: 'personaCheckpoint' });
  play(rec, { stop: (game) => !!game.personaDeparture?.transfer || game.t > 6 * 1440 });
  expect(rec.game.personaDeparture?.transfer).toBeDefined();
  const file = await makePlaytestFile({
    game: 'voice',
    seed: 7,
    scenario: 'voice-4',
    minute: rec.game.t,
    log: rec.log,
    hash: voiceHash(rec.game),
    engine: ENGINE_VERSION,
    snapshot: voiceState(rec.game),
    plainSnapshot: true,
  });
  let state: import('@adam0white/lab-client').PersonaShelfState = { heads: {}, revisions: [] };
  fixture.request.mockImplementation((async (request: { action: string; envelope?: PersonaEnvelope }) => {
    if (request.action === 'get') return null;
    if (request.action === 'put' && request.envelope) {
      state = acceptPersona(state, request.envelope);
      return request.envelope;
    }
    throw Error('Unexpected native request');
  }) as never);
  const storage = new Map<string, string>();
  const local = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  };
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'hidden' }));
  vi.stubGlobal('localStorage', local);
  const replies: Record<string, unknown>[] = [];
  let receive!: (event: { data: unknown }) => void;
  vi.stubGlobal('addEventListener', (_type: string, handler: typeof receive) => {
    receive = handler;
  });
  vi.stubGlobal('postMessage', (reply: import('../protocol.ts').WorkerToMain) => {
    replies.push(reply as unknown as Record<string, unknown>);
    if (reply.type === 'personaCheckpoint') void persona.receiveVoicePersona(reply);
    if (reply.type === 'playtest') saveVoice(local, reply.file);
  });
  let stop = () => {};
  try {
    persona.resetVoicePersona();
    await import('../worker.ts');
    receive({ data: { type: 'loadPlaytest', text: JSON.stringify(file), gen: 1 } });
    await vi.waitFor(() => expect(replies.some((reply) => reply.type === 'replayed')).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const sent: string[] = [];
    stop = persona.bindVoicePersona(
      (message) => {
        sent.push(message.type);
        receive({ data: message });
      },
      () => {},
      async (header) => header,
    );
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    receive({ data: { type: 'resume' } });
    await vi.waitFor(() => {
      receive({ data: { type: 'tick', dtMs: 250 } });
      expect(replies.some((reply) => reply.type === 'personaCheckpoint')).toBe(true);
    });
    await vi.waitFor(() =>
      expect(
        storage.has(VOICE_SAVE_KEY),
        JSON.stringify({
          sent,
          replies: replies.map((r) => ({ type: r.type, error: r.error, message: r.message })),
        }),
      ).toBe(true),
    );
    const accepted = requireValue(state.revisions.at(-1));
    const prefix = JSON.parse(requireValue(storage.get(`hf-voice-departure:${accepted.branchId}`)));
    expect(prefix.voicePersonaHead).toEqual(accepted);
    expect(prefix.oneCast.at(-1)).toMatchObject({
      stage: 'checkpoint',
      outcome: 'accepted',
      revision: accepted.revision,
    });
    const acknowledged = replies.find((reply) => reply.type === 'personaCheckpoint') as unknown as {
      transfer: { person: unknown };
    };
    expect(accepted.transfer.person).toEqual(acknowledged.transfer.person);
    const replayedPrefix = (await import('../sim/record.ts')).replayVoice(prefix.seed, prefix.log, 4);
    expect(voiceHash(replayedPrefix.rec.game)).toBe(prefix.hash);
    const refreshed = JSON.parse(requireValue(storage.get(VOICE_SAVE_KEY)));
    expect(refreshed.voicePersonaHead).toEqual(accepted);
    expect(refreshed.oneCast).toEqual(prefix.oneCast);
    expect(refreshed.seed).toBe(file.seed);
    expect(refreshed.log).toEqual(prefix.log);
  } finally {
    stop();
    persona.resetVoicePersona();
    vi.unstubAllGlobals();
  }
});

it('file entry installs no Voice watcher and accidental native callbacks cannot access absent Shelf or source storage', async () => {
  vi.resetModules();
  const windowEvents = Object.assign(new EventTarget(), {
    location: { pathname: '/voice/', search: '?file=1' },
  });
  vi.stubGlobal('window', windowEvents);
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'hidden' }));
  const writes = vi.fn(),
    reads = vi.fn();
  vi.stubGlobal('localStorage', { setItem: writes, getItem: reads });
  const watch = vi.spyOn(windowEvents, 'addEventListener');
  const requests = fixture.request.mock.calls.length;
  const persona = await import('./persona.tsx');
  const post = vi.fn();
  const stop = persona.bindVoicePersona(
    post,
    () => {},
    async (header) => header,
  );
  window.dispatchEvent(new Event('pagehide'));
  document.dispatchEvent(new Event('visibilitychange'));
  persona.checkpointVoicePersona();
  await persona.receiveVoicePersona({ type: 'personaCheckpoint', gen: 1 });
  expect(await persona.prepareVoiceReturn()).toBeNull();
  await persona.gateVoiceFile('{}');
  persona.settleVoiceFileGate(true);
  persona.resetVoicePersona();
  expect(watch).not.toHaveBeenCalled();
  expect(post).not.toHaveBeenCalled();
  expect(reads).not.toHaveBeenCalled();
  expect(writes).not.toHaveBeenCalled();
  expect(fixture.request.mock.calls.length).toBe(requests);
  stop();
  vi.unstubAllGlobals();
});
