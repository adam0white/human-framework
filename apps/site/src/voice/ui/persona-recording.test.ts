import type { PersonaEnvelope } from '@adam0white/lab-client';
import { expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => {
  const allowed = new Set(['known-branch']);
  let key: string | null = null;
  let resolve: (value: unknown) => void = () => {};
  const request = vi.fn(
    (_request?: { action: string }) =>
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
  personaChannel: () => ({
    ready: Promise.resolve(true),
    enabled: true,
    setEnabled: () => {},
    request: (request: { action: string }) =>
      request.action === 'list' ? Promise.resolve([]) : fixture.request(request),
  }),
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
