/** Native popovers keep explanations out of layout and provide Escape, outside-tap and keyboard dismissal. */
import { type ReactNode, useId } from 'react';
import { settingWords } from './setting-words.ts';
import './help.css';
export function Help({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="game-help">
      <button type="button" className="game-help-button" popoverTarget={id} aria-label={settingWords(title)}>
        i
      </button>
      <div id={id} popover="auto" className="game-help-content">
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  );
}
