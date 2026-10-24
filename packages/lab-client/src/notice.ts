/** Atomic first-disclosure claim on the central browser origin; partitioned/blocked storage falls back locally. */
import { IDENTITY_ORIGIN, readLocal, writeLocal } from './identity.ts';
import { randomId } from './linked.ts';
import { PERSONA_ORIGINS } from './persona.ts';
export const SHARED_NOTICE_KEY = 'hf-lab-notice-shared-v1';
export function claimLocalNotice(): boolean {
  const show = readLocal(SHARED_NOTICE_KEY) !== '1';
  writeLocal(SHARED_NOTICE_KEY, '1');
  return show;
}
/** The caller already applies its once/origin fallback. No recording identity is exchanged here. */
export async function claimLabNotice(): Promise<boolean> {
  if (typeof location === 'undefined' || typeof document === 'undefined') return true;
  if (location.origin === IDENTITY_ORIGIN) return claimLocalNotice();
  if (!PERSONA_ORIGINS.has(location.origin)) return true;
  if (!document.body) return true;
  return new Promise<boolean>((resolve) => {
    const frame = document.createElement('iframe');
    const id = randomId();
    frame.hidden = true;
    frame.title = 'Lab notice preference';
    frame.src = `${IDENTITY_ORIGIN}/lab/identity/`;
    const finish = (show: boolean) => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      frame.remove();
      resolve(show);
    };
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== IDENTITY_ORIGIN ||
        event.source !== frame.contentWindow ||
        event.data?.type !== 'hf-lab-notice-reply' ||
        event.data.id !== id ||
        typeof event.data.show !== 'boolean'
      )
        return;
      finish(event.data.show);
    };
    const timer = setTimeout(() => finish(true), 2000);
    window.addEventListener('message', receive);
    frame.addEventListener('load', () =>
      frame.contentWindow?.postMessage({ type: 'hf-lab-notice-claim', id }, IDENTITY_ORIGIN),
    );
    document.body.append(frame);
  });
}
