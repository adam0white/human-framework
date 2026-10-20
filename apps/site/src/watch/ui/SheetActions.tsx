import { createContext, type ReactNode, useContext } from 'react';
import { createPortal } from 'react-dom';

/** Reading pages keep their existing callbacks, with the primary action outside the scrolling text. */
export const PageCommitContext = createContext<HTMLElement | null>(null);

export function PageActions({ children }: { children: ReactNode }) {
  const commit = useContext(PageCommitContext);
  return commit ? createPortal(children, commit) : children;
}
