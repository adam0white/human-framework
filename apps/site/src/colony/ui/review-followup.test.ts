// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, createElement } from 'react';
import type { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { EndScreen } from './EndScreen.tsx';
import { ordersChanged } from './end-report.ts';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Telemetry transport is outside this local keyboard regression.
vi.mock('../../shared/lab.tsx', () => ({
  gameLabs: { well: {} },
  useLabScreen: () => {},
  LabMenuContent: () => null,
}));

vi.mock('./useColony.ts', () => ({ useColony: vi.fn() }));
// Canvas animation is outside this keyboard test; keep the real composer and App handlers.
vi.mock('./Pane.tsx', () => ({
  Pane: (props: {
    side: string;
    selectedId: string | null;
    following: boolean;
    followKey: number;
    onPlace(place: 'site'): void;
  }) =>
    createElement(
      'button',
      {
        type: 'button',
        'data-map': props.side,
        'data-selected': props.selectedId,
        'data-following': props.following,
        'data-follow-key': props.followKey,
        onClick: () => props.onPlace('site'),
      },
      'House',
    ),
}));

const game = new ColonyGame(20261003, createFrameworkHumanSide);
const _frame = game.frame();
const summary = game.summary();
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.replaceChildren();
});

function _required<T extends Element>(parent: ParentNode, selector: string): T {
  const el = parent.querySelector<T>(selector);
  if (!el) throw new Error(`Missing ${selector}`);
  return el;
}

function markup(component: Parameters<typeof renderToStaticMarkup>[0]) {
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(component);
  return node;
}

describe('Well review follow-up', () => {
  it('describes mood and trust in ending rows and order comparisons', () => {
    const report = {
      ...summary,
      orders: 1,
      character: { ...summary.character, morale: -0.4, trust: 0.2 },
      solo: { ...summary.solo, morale: 0.2, trust: 0.9 },
    };
    const el = markup(
      createElement(EndScreen, {
        summaries: { 2: report },
        humanKind: 'framework',
        canContinue: true,
        onContinue: vi.fn(),
        onAgain: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    const rows = [...el.querySelectorAll('tr')];
    expect(rows.find((r) => r.querySelector('th')?.textContent === 'Morale')?.textContent).toContain(
      'They feel disheartened.They feel encouraged.',
    );
    expect(rows.find((r) => r.querySelector('th')?.textContent === 'Trust in you')?.textContent).toContain(
      'They are wary of you.They trust you deeply.',
    );
    const changed = ordersChanged(report);
    expect(changed).toContain('morale They feel disheartened. (without you: They feel encouraged.)');
    expect(changed).toContain('trust in you They are wary of you. (without you: They trust you deeply.)');
    expect(changed).not.toContain('-0.40');
    expect(changed).not.toMatch(/trust in you \d/);
  });
  it('never scores prayer in the ending table or the order comparison', () => {
    const report = {
      ...summary,
      orders: 1,
      character: { ...summary.character, prayersKept: 0, prayersDue: 5 },
      solo: { ...summary.solo, prayersKept: 5, prayersDue: 5 },
    };
    const el = markup(
      createElement(EndScreen, {
        summaries: { 2: report },
        humanKind: 'framework',
        canContinue: true,
        onContinue: vi.fn(),
        onAgain: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(el.textContent).not.toMatch(/prayers kept/i);
    expect(ordersChanged(report)).not.toMatch(/prayer/i);
  });
  it('bounds ending comparisons to visible descriptions when values share a description', () => {
    const report = {
      ...summary,
      orders: 1,
      character: { ...summary.character, morale: 0, trust: 0.3 },
      solo: { ...summary.solo, ...summary.scoreboard.human, ...summary.character, morale: 0.14, trust: 0.59 },
      soloGoals: summary.goals.map((g) => g.human),
    };
    const text = ordersChanged(report);
    expect(text).not.toContain('changed nothing');
    expect(text).not.toContain('came out as it would have');
    expect(text).toBe('Your 1 order produced no differences visible in this report.');
  });
  it('keeps selected time settings neutral and gives the response and ribbon appropriate styling', () => {
    const css = readFileSync(resolve(import.meta.dirname, 'colony.css'), 'utf8');
    expect(css.match(/\.speed-play\.is-paused\s*\{([^}]*)\}/)?.[1]).not.toContain('var(--accent)');
    expect(css.match(/\.autopause input:checked \+ \.autopause-track\s*\{([^}]*)\}/)?.[1]).not.toContain(
      'var(--accent)',
    );
    expect(css).toMatch(/\.btn-confirm:not\(:disabled\)\s*\{[^}]*background: var\(--accent\)/s);
    for (const block of css.matchAll(/\.pause-ribbon \.btn\s*\{([^}]*)\}/g)) {
      expect(block[1]).toContain('min-height: 44px');
    }
  });
});

it('adds the optional dawn tally only when requested', () => {
  const props = {
    summaries: { 2: summary },
    humanKind: 'framework',
    canContinue: true,
    onContinue: () => {},
    onAgain: () => {},
    onClose: () => {},
  };
  expect(renderToStaticMarkup(createElement(EndScreen, props))).not.toContain('The village scores');
  const on = renderToStaticMarkup(createElement(EndScreen, { ...props, tally: true }));
  expect(on).toContain('The village scores');
  expect(on).toContain('Classic:');
  expect(on).toContain('Human:');
  expect(on).toContain('marks');
});
