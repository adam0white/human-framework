import type { PersonaEnvelope } from '@adam0white/lab-client';
import { expect, it, vi } from 'vitest';

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

it('holds an old local allowance until the pinned central decision arrives, and respects denial', async () => {
  const head = {
    branchId: 'known-branch',
    revision: 'revision',
    castId: 'hf.cast.selin.voice',
  } as PersonaEnvelope;
  await gateVoiceFile(JSON.stringify({ voicePersonaHead: head }));
  settleVoiceFileGate(true);
  // The branch was allowed locally, but another origin may have revoked its central association.
  expect(fixture.lab.personaRecordingAllowed).toBe(false);
  await vi.waitFor(() => expect(fixture.request).toHaveBeenCalled());
  fixture.reply({ sameEpoch: false, branchId: head.branchId, revision: head.revision });
  await Promise.resolve();
  await Promise.resolve();
  fixture.lab.setPersonaRecording(head.branchId);
  expect(fixture.lab.personaRecordingAllowed).toBe(false);
  resetVoicePersona();
});
