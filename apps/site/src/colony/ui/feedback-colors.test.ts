// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps selected feedback words visible after the game layout styles load', () => {
  const style = document.createElement('style');
  // The app layout follows Feedback's imported styles in the production cascade.
  style.textContent = ['../../shared/theme.css', './feedback.css', './layout.css']
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n');
  document.head.append(style);
  const root = document.createElement('div');
  root.className = 'well-layout';
  root.innerHTML =
    '<section class="colony-feedback"><fieldset class="colony-verdicts"><button aria-pressed="true">I’d stop here</button></fieldset></section>';
  document.body.append(root);
  try {
    const button = root.querySelector('button');
    if (!button) throw new Error('Missing verdict');
    const computed = getComputedStyle(button);
    expect(computed.color).not.toBe(computed.backgroundColor);
  } finally {
    root.remove();
    style.remove();
  }
});
