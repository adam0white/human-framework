/** Cross-game identity uses only first-party localStorage and checked postMessage, never cookies or URL IDs. */
import { randomId } from './linked.ts';
export const PLAYER_KEY = 'hf-lab-player';
export const OFF_KEY = 'hf-lab-recording-off';
export const IDENTITY_ORIGIN = 'https://human.adamwhite.work';
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}
export function localPlayer(): string {
  const old = readLocal(PLAYER_KEY);
  if (old && /^[a-f0-9]{32}$/.test(old)) return old;
  const id = randomId();
  writeLocal(PLAYER_KEY, id);
  return id;
}
export function identityBridge(change: (player: string | null, off: boolean) => void): {
  setOff: (off: boolean) => void;
  ready: Promise<void>;
} {
  let frame: HTMLIFrameElement | undefined;
  let desired: 'get' | 'on' | 'off' = readLocal(OFF_KEY) === '1' ? 'off' : 'get';
  let resolveReady: () => void = () => {};
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    resolveReady();
  };
  const setOff = (off: boolean) => {
    desired = off ? 'off' : 'on';
    writeLocal(OFF_KEY, off ? '1' : null);
    if (off) writeLocal(PLAYER_KEY, null);
    frame?.contentWindow?.postMessage(
      { type: 'hf-lab-identity', action: off ? 'off' : 'on' },
      IDENTITY_ORIGIN,
    );
  };
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    location.origin === IDENTITY_ORIGIN ||
    !location.hostname.endsWith('.adamwhite.work')
  ) {
    finish();
    return { setOff, ready };
  }
  const start = () => {
    try {
      frame = document.createElement('iframe');
      frame.src = `${IDENTITY_ORIGIN}/lab/identity/`;
      frame.hidden = true;
      frame.title = 'Lab recording preference';
      const receive = (event: MessageEvent) => {
        if (
          event.origin !== IDENTITY_ORIGIN ||
          event.source !== frame?.contentWindow ||
          event.data?.type !== 'hf-lab-identity'
        )
          return;
        const { player, off } = event.data as { player: unknown; off: unknown };
        if (
          typeof off !== 'boolean' ||
          (player !== null && (typeof player !== 'string' || !/^[a-f0-9]{32}$/.test(player)))
        )
          return;
        change(player as string | null, off);
        finish();
      };
      window.addEventListener('message', receive);
      frame.addEventListener('load', () =>
        frame?.contentWindow?.postMessage({ type: 'hf-lab-identity', action: desired }, IDENTITY_ORIGIN),
      );
      document.body.append(frame);
      // A blocked frame leaves an explicitly origin-scoped id; do not delay play.
      timer = setTimeout(finish, 2000);
    } catch {
      finish();
    }
  };
  if (document.body) start();
  else window.addEventListener('DOMContentLoaded', start, { once: true });
  return { setOff, ready };
}
