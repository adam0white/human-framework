import { expect, it, vi } from 'vitest';
import { feedbackPersonaControl } from '../src/persona.ts';

it('offers persona recording linkage only when relevant and changes it only on explicit input', () => {
  const lab = {
    personaRecordingRequired: false,
    personaRecordingAllowed: false,
    allowPersonaRecording: vi.fn(),
  };
  expect(feedbackPersonaControl(lab)).toBeNull();
  lab.personaRecordingRequired = true;
  const panel = feedbackPersonaControl(lab);
  const input = panel?.querySelector('input');
  expect(input?.checked).toBe(false);
  expect(lab.allowPersonaRecording).not.toHaveBeenCalled();
  lab.allowPersonaRecording.mockImplementation((allow: boolean) => {
    lab.personaRecordingAllowed = allow;
  });
  if (input) {
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change'));
  }
  expect(lab.allowPersonaRecording).toHaveBeenLastCalledWith(true);
  if (input) {
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change'));
  }
  expect(lab.allowPersonaRecording).toHaveBeenLastCalledWith(false);
});
