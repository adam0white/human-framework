/** Static identity bridge. Only lab origins can read/change the random localStorage id. No network writes. */
import {
  localPlayer,
  OFF_KEY,
  PLAYER_KEY,
  readLocal,
  writeLocal,
} from '../../../../packages/lab-client/src/identity.ts';

const parents = new Map<Window, string>();
const allowed = (origin: string) => /^https:\/\/([a-z0-9-]+\.)*adamwhite\.work$/.test(origin);
function broadcast() {
  const off = readLocal(OFF_KEY) === '1';
  const player = off ? null : localPlayer();
  for (const [parent, origin] of parents)
    parent.postMessage({ type: 'hf-lab-identity', player, off }, origin);
}
window.addEventListener('message', (event: MessageEvent) => {
  if (
    !allowed(event.origin) ||
    !event.source ||
    event.source !== window.parent ||
    event.data?.type !== 'hf-lab-identity'
  )
    return;
  const action = event.data.action;
  if (!['get', 'off', 'on'].includes(action)) return;
  parents.set(window.parent, event.origin);
  if (action === 'off') {
    writeLocal(OFF_KEY, '1');
    writeLocal(PLAYER_KEY, null);
  }
  if (action === 'on') writeLocal(OFF_KEY, null);
  broadcast();
});
window.addEventListener('storage', (event) => {
  if (event.key === OFF_KEY || event.key === PLAYER_KEY || event.key === null) broadcast();
});

// Persona messages are deliberately independent of recording identity and its broader origin rule.
import {
  isPersonaConsentMessage,
  isPersonaMessage,
  PERSONA_CONSENT_KEY,
} from '../../../../packages/lab-client/src/persona.ts';
import { shelfRequest } from './persona-store.ts';

window.addEventListener('message', (event: MessageEvent) => {
  if (
    window.parent === window ||
    !isPersonaConsentMessage(event.origin, event.source, window.parent, event.data)
  )
    return;
  const { id, action, enabled } = event.data;
  if (action === 'set') writeLocal(PERSONA_CONSENT_KEY, enabled ? '1' : '0');
  window.parent.postMessage(
    { type: 'hf-persona-consent-reply', id, value: readLocal(PERSONA_CONSENT_KEY) === '1' },
    event.origin,
  );
});
window.addEventListener('message', (event: MessageEvent) => {
  if (window.parent === window || !isPersonaMessage(event.origin, event.source, window.parent, event.data))
    return;
  const parent = window.parent;
  if (readLocal(PERSONA_CONSENT_KEY) !== '1') {
    parent.postMessage(
      { type: 'hf-persona-reply', id: event.data.id, error: 'Enable fictional person continuity first.' },
      event.origin,
    );
    return;
  }
  const {
    id,
    action,
    castId,
    castIds,
    envelope,
    envelopes,
    expectedHeads,
    revision,
    fork,
    authored,
    allowRecording,
    recordingEpoch,
  } = event.data;
  void shelfRequest({
    action,
    castId,
    castIds,
    envelope,
    envelopes,
    expectedHeads,
    revision,
    fork: fork === true,
    authored: authored === true,
    allowRecording: typeof allowRecording === 'boolean' ? allowRecording : undefined,
    recordingEpoch: typeof recordingEpoch === 'string' ? recordingEpoch : undefined,
  }).then(
    (value) => parent.postMessage({ type: 'hf-persona-reply', id, value }, event.origin),
    (error: unknown) =>
      parent.postMessage(
        {
          type: 'hf-persona-reply',
          id,
          error: error instanceof Error ? error.message : 'Shelf unavailable.',
        },
        event.origin,
      ),
  );
});
