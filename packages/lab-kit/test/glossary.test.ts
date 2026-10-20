// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { defineTerms, glossaryPanel, term } from '../src/glossary.ts';

describe('glossary', () => {
  it('shows the first meaning and gives later occurrences a native disclosure', () => {
    defineTerms({ imece: 'Shared work' });
    const first = term('imece');
    const second = term('imece');
    const firstButton = first.querySelector('button');
    const secondButton = second.querySelector('button');
    expect(firstButton?.getAttribute('aria-expanded')).toBe('true');
    expect(second.querySelector('span')?.hidden).toBe(true);
    expect(secondButton?.type).toBe('button');
    secondButton?.click();
    expect(secondButton?.getAttribute('aria-expanded')).toBe('true');
    expect(second.querySelector('span')?.textContent).toBe(' (Shared work)');
    secondButton?.click();
    expect(secondButton?.getAttribute('aria-expanded')).toBe('false');
    expect(firstButton?.getAttribute('aria-controls')).not.toBe(secondButton?.getAttribute('aria-controls'));
  });
  it('lists every definition safely and resets on replacement', () => {
    defineTerms({ '<word>': '<meaning>', other: 'Another meaning' });
    const panel = glossaryPanel();
    expect(panel.tagName).toBe('DL');
    expect(panel.getAttribute('aria-label')).toBe('Glossary');
    expect([...panel.querySelectorAll('dt')].map((node) => node.textContent)).toEqual(['<word>', 'other']);
    expect(panel.querySelector('dd')?.textContent).toBe('<meaning>');
    expect(panel.querySelector('meaning')).toBeNull();
    term('other');
    defineTerms({ other: 'Changed meaning' });
    expect(term('other').querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
    expect(() => term('missing')).toThrow('Unknown glossary term');
    expect(() => term('toString')).toThrow('Unknown glossary term');
  });
});
