import { telemetryNotice } from '@adam0white/lab-kit';
import { useEffect, useRef } from 'react';
import './lab-notice.css';

/** Mount the first-visit disclosure in layout, below the game header. */
export function LabNotice({ onDismiss }: { onDismiss?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const notice = useRef<HTMLElement | null | undefined>(undefined);
  useEffect(() => {
    if (notice.current === undefined) notice.current = telemetryNotice();
    const node = notice.current;
    if (!node) return;
    Object.assign(node.style, {
      position: 'static',
      transform: 'none',
      width: '100%',
    });
    host.current?.append(node);
    const dismissed = () => onDismiss?.();
    const button = node.querySelector('button');
    button?.addEventListener('click', dismissed);
    return () => {
      button?.removeEventListener('click', dismissed);
      node.remove();
    };
  }, [onDismiss]);
  return <div className="lab-notice" ref={host} />;
}
