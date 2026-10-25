// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it } from 'vitest';
import { trustHistoryWords } from '../sim/view.ts';
import { InfoPanel } from './ShellPanels.tsx';

afterEach(() => history.replaceState(null, '', '/'));

it('keeps research notes behind the exact lab flag on the premise and report screens', () => {
  for (const search of ['', '?lab=0', '?lab=true', '?lab=1']) {
    history.replaceState(null, '', `/${search}`);
    for (const phase of ['premise', 'report']) {
      const info = renderToStaticMarkup(createElement(InfoPanel, { phase, onClose() {} }));
      expect(info.includes('empirical citation')).toBe(search === '?lab=1');
    }
  }
});

it('describes repeated trust events in sentences while retaining their reason', () => {
  expect(trustHistoryWords(0.02, 'went-well', undefined, 3)).toBe(
    'Your suggestion went well 3 times. He trusts you a little more.',
  );
  expect(trustHistoryWords(-0.04, 'harm-under-protest', 'work-extra')).toBe(
    'Your suggestion to take an afternoon shift hurt him, and he’d said no. He trusts you a little less.',
  );
});
