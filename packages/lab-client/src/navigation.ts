/** Top-level, one-device handoff. Never sends old origin IDs to the shelf or rewrites history. */

import { IDENTITY_ORIGIN, localPlayer, OFF_KEY, PLAYER_KEY, readLocal, writeLocal } from './identity.ts';
import { PERSONA_ORIGINS } from './persona.ts';

const KEY = 'hf-lab-navigation';
export const NOTICE_KEY = 'hf-lab:once:telemetry-notice-v1';
const allowed = (url: URL) => PERSONA_ORIGINS.has(url.origin);

/** Use for central collection links only. Fragment data is not sent in HTTP requests. */
export function gameNavigation(href: string, now = Date.now()): string {
  const url = new URL(href, IDENTITY_ORIGIN);
  if (typeof location === 'undefined' || location.origin !== IDENTITY_ORIGIN || !allowed(url)) return href;
  if (url.origin === IDENTITY_ORIGIN) return href;
  const off = readLocal(OFF_KEY) === '1';
  url.hash = `${KEY}=${encodeURIComponent(JSON.stringify({ v: 1, at: now, to: url.origin, player: off ? null : localPlayer(), off, notice: readLocal(NOTICE_KEY) === '1' }))}`;
  return url.href;
}

/** Runs before local identity activation. Only a direct central navigation may supply a handoff. */
export function acceptGameNavigation(now = Date.now()): boolean {
  if (typeof location === 'undefined' || typeof document === 'undefined' || typeof history === 'undefined')
    return false;
  const hash = new URLSearchParams(location.hash?.slice(1) ?? '');
  const raw = hash.get(KEY);
  if (!raw) return false;
  // Remove the fragment even when invalid so reloads and copied links cannot reapply it.
  hash.delete(KEY);
  history.replaceState(
    history.state,
    '',
    `${location.pathname}${location.search}${hash.size ? `#${hash}` : ''}`,
  );
  try {
    if (new URL(document.referrer).origin !== IDENTITY_ORIGIN || !allowed(new URL(location.href)))
      return false;
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      value.v !== 1 ||
      value.to !== location.origin ||
      typeof value.at !== 'number' ||
      value.at > now + 10000 ||
      now - value.at > 300000 ||
      typeof value.off !== 'boolean' ||
      typeof value.notice !== 'boolean'
    )
      return false;
    if (
      value.off
        ? value.player !== null
        : typeof value.player !== 'string' || !/^[a-f0-9]{32}$/.test(value.player)
    )
      return false;
    if (!value.off && readLocal(OFF_KEY) === '1') return false;
    // Future records use the central identity. Existing uploaded records retain their old IDs.
    const prior = readLocal(PLAYER_KEY);
    writeLocal(OFF_KEY, value.off ? '1' : null);
    writeLocal(PLAYER_KEY, value.player as string | null);
    writeLocal('hf-lab-top-level-player', value.off ? null : (value.player as string));
    if (value.notice) writeLocal(NOTICE_KEY, '1');
    if (prior !== value.player) {
      // Do not continue an old session/run under the newly navigated identity.
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('hf-lab-session') || key?.startsWith('hf-lab-run'))
          sessionStorage.removeItem(key);
      }
    }
    return true;
  } catch {
    return false;
  }
}
