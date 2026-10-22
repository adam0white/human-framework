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
