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

it('offers a full start page with one primary and no inline information controls', () => {
  const el = render(createElement(Premise, { ready: true, onBegin: () => {} }));
  expect(el.querySelector('.v-page')).not.toBeNull();
  expect(el.querySelectorAll('.v-btn-primary')).toHaveLength(1);
  expect(el.textContent).toContain('Suggest an action; Halil decides.');
  expect(el.textContent).toContain('Other ways in');
  expect(el.querySelector('.game-help')).toBeNull();
});

it('puts saved continuation first and confirms replacing a month inline', () => {
  const begin = vi.fn();
  const keep = vi.fn();
  const el = render(
    createElement(Premise, {
      ready: true,
      savedRun: { label: 'Ramadan 15, 14:20' },
      onBegin: begin,
      onContinue: keep,
    }),
  );
  expect(el.querySelector('.v-btn-primary')?.textContent).toBe('Continue · Ramadan 15, 14:20');
  flushSync(() =>
    [...el.querySelectorAll('button')].find((b) => b.textContent === 'Begin the month again')?.click(),
  );
  expect(begin).not.toHaveBeenCalled();
  expect(el.textContent).toContain('The month so far is replaced.');
  flushSync(() =>
    [...el.querySelectorAll('button')].find((b) => b.textContent === 'Replace the month and begin')?.click(),
  );
  expect(begin).toHaveBeenCalledOnce();
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
        frame: { ...sampleFrame, day, dayLabel: `Ramadan ${day}` },
        title: false,
        reading: false,
        skipping: false,
        infoOpen: false,
        menuOpen: false,
        onInfo: () => {},
        onMenu: () => {},
      }),
    );
    const label = query(el, '.v-calendar-desktop').textContent ?? '';
    expect(query(el, '.v-calendar-phone').textContent).toMatch(/^[A-Z][a-z]{2} \d+ (Mar|Apr)$/);
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
});

it('keeps lab screen tracking in the game without a separate notebook row', () => {
  const app = readFileSync(resolve(import.meta.dirname, 'App.tsx'), 'utf8');
  expect(app).toContain('useLabScreen(gameLabs.voice,');
  expect(app).not.toContain('v-notebook');
  expect(app).not.toContain('<LabControls');
});

it('keeps one information and one menu control in the top bar', () => {
  const el = render(
    createElement(TopBar, {
      frame: sampleFrame,
      title: false,
      reading: false,
      skipping: false,
      infoOpen: false,
      menuOpen: false,
      onInfo: () => {},
      onMenu: () => {},
    }),
  );
  expect(el.querySelectorAll('button')).toHaveLength(2);
  expect(el.querySelector('[aria-label="Information"]')).not.toBeNull();
  expect(el.querySelector('[aria-label="Game menu"]')).not.toBeNull();
  expect(el.querySelector('[aria-label="Pace"]')).toBeNull();
});

it('counts free-play days from Eid in the top bar', () => {
  const el = render(
    createElement(TopBar, {
      frame: { ...sampleFrame, phase: 'free', day: 34, clock: '10:40' },
      title: false,
      reading: false,
      skipping: false,
      infoOpen: false,
      menuOpen: false,
      onInfo: () => {},
      onMenu: () => {},
    }),
  );
  expect(query(el, '.v-shell-when').textContent).toBe('After Eid · day 3 · 10:40');
});
