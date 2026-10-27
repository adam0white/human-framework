/** React adapter for the public lab-kit diagnostics footer. */
import { debugFooter } from '@adam0white/lab-kit';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function DebugMenu({ children }: { children?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const slot = document.createElement('div');
    root.current?.replaceChildren(debugFooter(slot));
    setContent(slot);
    return () => root.current?.replaceChildren();
  }, []);
  return <div ref={root}>{content && createPortal(children, content)}</div>;
}
