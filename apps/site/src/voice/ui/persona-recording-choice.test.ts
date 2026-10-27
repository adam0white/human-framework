import { expect, it, vi } from 'vitest';
import { chooseCastRecording } from '../../shared/cast-runtime.ts';
import { gameLabs } from '../../shared/lab.tsx';
import { chooseVoiceRecording } from './persona.tsx';

vi.mock('../../shared/cast-runtime.ts', () => ({
  fileSession: false,
  castState: vi.fn(() => ({ gated: true })),
  chooseCastRecording: vi.fn(),
  castRecordingGate: vi.fn(() => 'whole-cast'),
  setCastEnabled: vi.fn(),
  sitePersonaShelf: { ready: Promise.resolve(), enabled: true, request: vi.fn() },
}));
vi.mock('../../shared/lab.tsx', () => ({
  gameLabs: { voice: { setPersonaRecording: vi.fn(), allowPersonaRecording: vi.fn() } },
}));

it.each([true, false])('uses the single recording switch for ordinary Voice (%s)', async (allow) => {
  await chooseVoiceRecording(allow);
  expect(chooseCastRecording).toHaveBeenLastCalledWith('voice', allow);
  expect(gameLabs.voice.setPersonaRecording).not.toHaveBeenCalled();
  expect(gameLabs.voice.allowPersonaRecording).not.toHaveBeenCalled();
});
