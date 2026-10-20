/**
 * Presentation only: keep the scene and its speech targets together during a gesture, and give
 * each displayed frame 600 ms before replacement. The worker and game clock keep running.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const SETTLE_MS = 600;

export function useStableSpeechFrame<T>(frame: T) {
  const [shown, setShown] = useState(frame);
  const latest = useRef(frame);
  const current = useRef(frame);
  const until = useRef(Date.now() + SETTLE_MS);
  const pointers = useRef(new Set<number>());
  const keys = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useRef(() => {});
  refresh.current = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    if (pointers.current.size || keys.current.size || latest.current === current.current) return;
    const wait = until.current - Date.now();
    if (wait > 0) {
      timer.current = setTimeout(() => refresh.current(), wait);
      return;
    }
    current.current = latest.current;
    until.current = Date.now() + SETTLE_MS;
    setShown(current.current);
  };
  useLayoutEffect(() => {
    latest.current = frame;
    refresh.current();
  }, [frame]);
  useEffect(() => {
    const release = (event: PointerEvent) => {
      if (!pointers.current.delete(event.pointerId)) return;
      // Click follows pointerup. Leave its rendered control and handler intact through dispatch.
      until.current = Date.now() + SETTLE_MS;
      refresh.current();
    };
    const releaseKey = (event: KeyboardEvent) => {
      if (!keys.current.delete(event.key)) return;
      until.current = Date.now() + SETTLE_MS;
      refresh.current();
    };
    const cancel = () => {
      pointers.current.clear();
      keys.current.clear();
      until.current = Date.now() + SETTLE_MS;
      refresh.current();
    };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', cancel);
    window.addEventListener('keyup', releaseKey, true);
    return () => {
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keyup', releaseKey, true);
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);
  return {
    frame: shown,
    onKeyDownCapture: (event: { key: string; target: EventTarget | null }) => {
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        event.target instanceof Element &&
        event.target.closest('button')
      ) {
        keys.current.add(event.key);
        refresh.current();
      }
    },
    onPointerDownCapture: (event: { pointerId: number }) => {
      pointers.current.add(event.pointerId);
      refresh.current();
    },
  };
}
