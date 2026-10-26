import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';
import { TopBar } from './TopBar.tsx';

test('clock status describes this clock, separately from the scene start time', () => {
  const status = (paused: boolean, reading: boolean) =>
    renderToStaticMarkup(
      createElement(TopBar, {
        frame: { ...sampleFrame, phase: 'day', intro: undefined, paused, clock: '09:33' },
        title: false,
        reading,
        skipping: false,
        infoOpen: false,
        menuOpen: false,
        onInfo() {},
        onMenu() {},
      }),
    );
  expect(status(false, false)).toContain('Clock running.');
  expect(status(true, false)).toContain('Clock stopped at 09:33.');
  expect(status(true, true)).toContain('Clock stopped at 09:33.');
  expect(status(false, true)).toContain('Clock slowed while you read.');
});
