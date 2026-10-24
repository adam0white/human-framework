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
  shelf.textContent = 'Inspect, download or delete your people';
  panel.append(shelf);
  if (!options.recordingAllowed) {
    const explanation = document.createElement('p');
    explanation.textContent =
      'Recording this continuing person can link this play to earlier recorded games. Record this continuing person? Local play and file export remain available either way.';
    panel.append(explanation);
    for (const [text, allow] of [
      ['Record this continuing person', true],
      ['Do not link this history', false],
    ] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.onclick = () => {
        options.allowRecording(allow);
        explanation.textContent = allow
          ? 'Recording choice requested. Feedback can still send.'
          : 'Not linked to recorded history; feedback can still send.';
      };
      panel.append(button);
    }
  }
  return panel;
}

export type FeedbackPersonaLab = {
  readonly personaRecordingRequired?: boolean;
  readonly personaRecordingAllowed?: boolean;
  allowPersonaRecording?(allow: boolean): void;
};

/** Optional feedback-sheet control. Sending feedback never depends on this choice. */
export function feedbackPersonaControl(lab: FeedbackPersonaLab): HTMLElement | null {
  if (!lab.personaRecordingRequired || !lab.allowPersonaRecording) return null;
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = lab.personaRecordingAllowed === true;
  checkbox.addEventListener('change', () => {
    lab.allowPersonaRecording?.(checkbox.checked);
    checkbox.checked = lab.personaRecordingAllowed === true;
  });
  label.append(checkbox, ' Link this continuing person to lab recording (optional)');
  return label;
}
