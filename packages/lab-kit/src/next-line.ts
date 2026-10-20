/**
 * Registers one persistent instruction line with polite live announcements.
 * A later registration replaces the global target; callers own its layout and DOM lifetime.
 * This never adds instructions to a log or guesses what a game should say next.
 */
let current: HTMLElement | undefined;

export function nextLine(element: HTMLElement): void {
  if (current && current !== element) {
    current.removeAttribute('aria-live');
    current.removeAttribute('aria-atomic');
    current.classList.remove('lk-next', 'now');
  }
  current = element;
  element.classList.add('lk-next', 'now');
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-atomic', 'true');
}

/** Update the registered line; register a replacement after rebuilding the game's DOM. */
export function setNext(text: string): void {
  if (!current) throw new Error('Register a next line before calling setNext.');
  current.textContent = text;
}
