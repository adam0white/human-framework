import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { PlaytestNotice } from './PlaytestMenu.tsx';
import type { ReplayResult } from './playtest.ts';

afterEach(() => vi.unstubAllGlobals());

it('keeps the initial replay notice understandable', () => {
  const result: ReplayResult = {
    matches: false,
    hash: 'computed-hash',
    expected: 'saved-hash',
    file: { build: 'source-build', framework: '2.22.0', engine: '2.21.0' },
    here: { framework: '2.23.0', engine: '2.23.0' },
    driftAt: 4,
    minute: 60,
  };
  const render = () =>
    renderToStaticMarkup(
      createElement(PlaytestNotice, {
        status: { result },
        onClose: () => {},
      }),
    );
  expect(render()).toContain('Start a fresh game.');
  expect(render()).not.toMatch(/computed-hash|saved-hash|source-build|log entry/);
  result.matches = true;
  vi.stubGlobal('location', { search: '' });
  expect(render()).toContain('The saved game replayed correctly.');
  expect(render()).not.toContain('hash');
});
