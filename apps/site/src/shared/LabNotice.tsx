import { telemetryNotice } from '@adam0white/lab-kit';
import { useEffect, useRef } from 'react';
import { fileSession } from './cast-runtime.ts';
import './lab-notice.css';

/** Mount the first-visit disclosure in layout, below the game header. */
export function LabNotice() {
  const host = useRef<HTMLDivElement>(null);
  const notice = useRef<HTMLElement | null | undefined>(undefined);
  useEffect(() => {
    if (notice.current === undefined)
      notice.current = fileSession
        ? telemetryNotice(undefined, { preservation: 'preserve' })
        : telemetryNotice();
    const node = notice.current;
    if (!node) return;
    Object.assign(node.style, {
      fontFamily: 'inherit',
      position: 'static',
      transform: 'none',
      width: '100%',
    });
    host.current?.append(node);
    return () => {
      node.remove();
    };
  }, []);
  return <footer className="lab-notice" ref={host} />;
}
