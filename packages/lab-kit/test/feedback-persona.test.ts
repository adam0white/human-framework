import { expect, it, vi } from 'vitest';
import { feedbackPersonaControl, feedbackSharePlay, personaControls } from '../src/persona.ts';

it('shows one unticked share choice only when recording is off and defers enabling until Submit', () => {
  expect(feedbackPersonaControl({ telemetryOn: true })).toBeNull();
  const panel = feedbackPersonaControl({ telemetryOn: false });
  expect(panel?.textContent).toBe(' Share this run and my play with the lab');
  expect(feedbackSharePlay(panel)).toBe(false);
  const input = panel?.querySelector('input');
  if (input) input.checked = true;
  expect(feedbackSharePlay(panel)).toBe(true);
});
it('keeps continuity controls without separate recording linkage consent', () => {
  const allowRecording = vi.fn();
  const panel = personaControls({
    enabled: true,
    setEnabled: vi.fn(),
    recordingAllowed: false,
    allowRecording,
  });
  expect(panel.querySelectorAll('input')).toHaveLength(1);
  expect(panel.querySelectorAll('button')).toHaveLength(0);
  expect(allowRecording).not.toHaveBeenCalled();
});
