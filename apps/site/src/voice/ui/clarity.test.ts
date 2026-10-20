// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';
import { Composer } from './Composer.tsx';
import { DayLog } from './DayLog.tsx';
import { EndsList } from './EndsPane.tsx';
import { Premise } from './Premise.tsx';
import { TopBar } from './TopBar.tsx';
import type { VoiceActions } from './useVoice.ts';

// These component checks do not exercise telemetry transport.
vi.mock('../../shared/lab.tsx', () => ({ gameLabs: { voice: {} }, LabMenuContent: () => null }));

const cleanups: (() => void)[] = [];
function render(node: React.ReactNode) {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  flushSync(() => root.render(node));
  cleanups.push(() => {
    root.unmount();
    el.remove();
  });
  return el;
}
function query<T extends Element = HTMLElement>(el: Element, selector: string): T {
  const found = el.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

it('offers Begin after at most 40 mandatory words and keeps the full story on request', () => {
  const el = render(createElement(Premise, { ready: true, onBegin: () => {} }));
  const card = query(el, '.v-card');
  const copy = card.cloneNode(true) as HTMLElement;
  for (const details of copy.querySelectorAll('details')) {
    const summary = details.querySelector('summary');
    if (summary) details.replaceWith(summary.cloneNode(true));
  }
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  const text: string[] = [];
  while (walker.nextNode()) text.push(walker.currentNode.textContent ?? '');
  expect(text.join(' ').trim().split(/\s+/).length).toBe(34);
  expect(copy.textContent).toContain('Suggest an action; Halil decides.');
  const context = query<HTMLDetailsElement>(el, 'details');
  expect(context.open).toBe(false);
  expect(context.textContent).toContain('Nuran died fourteen weeks');
  expect(context.textContent).toContain('Who else he hears');
  expect(
    query(card, 'button').compareDocumentPosition(context) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(document.activeElement).toBe(card.querySelector('button'));
});

it('labels decision rows Why and opens the corresponding decision without making other prose look interactive', () => {
  let selected = '';
  const log = [
    {
      id: 'one',
      day: 1,
      minute: 240,
      clock: '04:00',
      who: 'halil' as const,
      kind: 'act' as const,
      text: 'I eat.',
      decisionId: 'd1',
    },
    {
      id: 'two',
      day: 1,
      minute: 241,
      clock: '04:01',
      who: 'halil' as const,
      kind: 'act' as const,
      text: 'I wait.',
    },
  ];
  const el = render(
    createElement(DayLog, {
      log,
      paused: true,
      selected: 'd1',
      onWhy: (id) => {
        selected = id;
      },
    }),
  );
  const button = query<HTMLButtonElement>(el, 'button.v-log-btn');
  expect(button.textContent).toContain('Why this action?');
  expect(button.getAttribute('aria-pressed')).toBe('true');
  button.click();
  expect(selected).toBe('d1');
  expect(el.querySelectorAll('button.v-log-btn')).toHaveLength(1);
  expect(query(el, 'div.v-log-btn').textContent).not.toContain('Why this action?');
  const css = readFileSync(resolve(import.meta.dirname, 'voice.css'), 'utf8');
  expect(css).toMatch(/button\.v-log-btn\s*\{[^}]*border:\s*1px solid/);
  expect(css).toMatch(/\.v-log-row\.is-selected \.v-log-btn\s*\{[^}]*outline:/);
});

it('shows English weekdays and dates for every fasting day and the rent deadline', () => {
  for (let day = 1; day <= 30; day++) {
    const el = render(
      createElement(TopBar, {
        ...sampleFrame,
        day,
        dayLabel: `Ramadan ${day}`,
        fastForward: undefined,
        actions: {} as VoiceActions,
        onPlaytestError: () => {},
      }),
    );
    const label = query(el, '.v-top-date').textContent ?? '';
    expect(label).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d+ (March|April)$/);
    if (day === 1) expect(label).toBe('Monday 11 March');
    if (day === 15) expect(label).toBe('Monday 25 March');
    if (day === 30) expect(label).toBe('Tuesday 9 April');
  }
  const ends = render(createElement(EndsList, { ends: sampleFrame.ends }));
  expect(ends.textContent).toContain('Ramadan 15 (Monday 25 March)');
});

it('dates the rent deadline in the suggestion context and optional opening story', () => {
  const composer = render(
    createElement(Composer, {
      composer: { open: true },
      prefill: {
        optionId: 'pay-rent',
        strength: 'mention',
        source: 'end',
        why: 'Osman wants 300 by Ramadan 15.',
      },
      options: [{ id: 'pay-rent', label: 'pay Osman', rank: 1, leaning: true }],
      leaning: sampleFrame.leaning,
      muted: false,
      doingLabel: undefined,
      telegraph: null,
      whyOpen: false,
      onPredict: () => {},
      onSuggest: () => {},
      onSayNothing: () => {},
    }),
  );
  expect(query(composer, '.v-prefill').textContent).toContain('Ramadan 15 (Monday 25 March)');
  const premise = render(createElement(Premise, { ready: true, onBegin: () => {} }));
  expect(query(premise, '.v-premise-ends').textContent).toContain('Ramadan 15 (Monday 25 March)');
});

it('marks selected pace with a neutral outline rather than the task accent', () => {
  const css = readFileSync(resolve(import.meta.dirname, 'voice.css'), 'utf8');
  const selected = css.match(/\.v-top \.v-seg button\[aria-pressed="true"\]\s*\{([^}]*)\}/)?.[1];
  expect(selected).toContain('outline:');
  expect(selected).not.toContain('var(--lantern)');
  const autoPause = css.match(/\.v-autopause\[aria-pressed="true"\] \.v-autopause-mark\s*\{([^}]*)\}/)?.[1];
  expect(autoPause).not.toContain('var(--lantern)');
});

it('gives phone pause and pace controls 44 pixel hit areas without the top-bar override shrinking them', () => {
  const css = readFileSync(resolve(import.meta.dirname, 'voice.css'), 'utf8');
  expect(css).toMatch(/\.v-top \.v-btn\s*\{[^}]*min-height:\s*44px/);
  expect(css).toMatch(/\.v-top \.v-btn\s*\{[^}]*min-width:\s*44px/);
});

it('keeps lab screen tracking in the game without a separate notebook row', () => {
  const app = readFileSync(resolve(import.meta.dirname, 'App.tsx'), 'utf8');
  expect(app).toContain('useLabScreen(gameLabs.voice,');
  expect(app).not.toContain('v-notebook');
  expect(app).not.toContain('<LabControls');
});
