/** Shared label for the central page for continuing people. */
export const PEOPLE_ACROSS_GAMES = 'People across games';

/** Separate fictional continuity and historical recording choices. The host owns admission and snapshots. */
export type PersonaControls = {
  enabled: boolean;
  setEnabled(value: boolean): void;
  recordingAllowed: boolean;
  allowRecording(value: boolean): void;
};
export function personaControls(options: PersonaControls): HTMLElement {
  const panel = document.createElement('section');
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = options.enabled;
  label.append(checkbox, document.createTextNode(' Keep fictional people between games in this browser'));
  checkbox.onchange = () => options.setEnabled(checkbox.checked);
  panel.append(label);
  const shelf = document.createElement('a');
  shelf.href = 'https://human.adamwhite.work/lab/people/';
  shelf.target = '_blank';
  shelf.rel = 'noopener';
  shelf.textContent = PEOPLE_ACROSS_GAMES;
  panel.append(shelf);
  return panel;
}

export type FeedbackPersonaLab = {
  readonly telemetryOn?: boolean;
};

/** One optional share choice; reading it on Submit is the explicit opt-in. */
export function feedbackPersonaControl(lab: FeedbackPersonaLab): HTMLElement | null {
  if (lab.telemetryOn) return null;
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = false;
  label.append(checkbox, ' Share this run and my play with the lab');
  return label;
}

/** Pass this value as sendFeedback's sharePlay option on Submit. */
export function feedbackSharePlay(control: HTMLElement | null): boolean {
  return control?.querySelector('input')?.checked === true;
}
