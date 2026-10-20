/**
 * Scope: an optional first-visit goal card with up to three steps and a single Start action.
 * It does not teach later rules, pause the game or decide whether a goal is understandable.
 */
import { showSheet } from './dialog.ts';
import { type FlagStorage, once } from './once.ts';

export type IntroCardOptions = {
  title: string;
  goal: string;
  steps?: string[];
  next?: string;
  onClose: () => void;
  /** Stable, game-specific flag; defaults to pathname and title. */
  key?: string;
  storage?: FlagStorage | null;
};

/** Mounts and opens the card once; returns null on later visits. */
export function introCard(options: IntroCardOptions): HTMLDialogElement | null {
  const key = options.key ?? `intro:${globalThis.location?.pathname ?? '/'}:${options.title}`;
  if (!once(key, options.storage)) return null;
  const dialog = document.createElement('dialog');
  dialog.className = 'lk-intro';
  dialog.setAttribute('aria-label', options.title);
  const goal = document.createElement('p');
  goal.className = 'now';
  goal.textContent = options.goal;
  const title = document.createElement('h2');
  title.textContent = options.title;
  dialog.append(goal, title);
  if (options.steps?.length) {
    const steps = document.createElement('ol');
    for (const text of options.steps.slice(0, 3)) {
      const step = document.createElement('li');
      step.textContent = text;
      steps.append(step);
    }
    dialog.append(steps);
  }
  if (options.next) {
    const next = document.createElement('p');
    next.textContent = options.next;
    dialog.append(next);
  }
  const start = document.createElement('button');
  start.type = 'button';
  start.textContent = 'Start';
  start.addEventListener('click', () => dialog.close());
  dialog.append(start);
  showSheet(dialog, options.onClose);
  return dialog;
}
