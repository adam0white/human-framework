import { expect, it, vi } from 'vitest';
import { feedbackPersonaControl, personaControls } from '../src/persona.ts';

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

it('does not claim linkage approval before the host confirms its recording choice', () => {
  const panel = personaControls({
    enabled: true,
    setEnabled: vi.fn(),
    recordingAllowed: false,
    allowRecording: vi.fn(),
  });
  document.body.append(panel);
  const yes = [...panel.querySelectorAll('button')].find(
    (button) => button.textContent === 'Record this continuing person',
  );
  yes?.click();
  expect(panel.textContent).toContain('Recording choice requested. Feedback can still send.');
  expect(panel.textContent).not.toContain('Historical recording linkage allowed');
  panel.remove();
});
