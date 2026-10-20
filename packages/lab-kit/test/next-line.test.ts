// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { nextLine, setNext } from '../src/next-line.ts';

describe('next line', () => {
  it('updates a persistent polite instruction target and replaces it explicitly', () => {
    const first = document.createElement('p');
    nextLine(first);
    expect(first.getAttribute('aria-live')).toBe('polite');
    expect(first.getAttribute('aria-atomic')).toBe('true');
    expect(first.classList.contains('lk-next')).toBe(true);
    setNext('Pick who carries the rope');
    expect(first.textContent).toBe('Pick who carries the rope');
    const replacement = document.createElement('p');
    nextLine(replacement);
    setNext('<Next: rest>');
    expect(replacement.textContent).toBe('<Next: rest>');
    expect(replacement.children).toHaveLength(0);
    expect(first.textContent).toBe('Pick who carries the rope');
    expect(first.hasAttribute('aria-live')).toBe(false);
    expect(first.classList.contains('lk-next')).toBe(false);
    expect(first.classList.contains('now')).toBe(false);
  });
});
