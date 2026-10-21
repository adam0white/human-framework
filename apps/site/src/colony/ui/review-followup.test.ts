// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColonyGame, NUDGES } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { App } from './App.tsx';
import { EndScreen } from './EndScreen.tsx';
import { ordersChanged } from './end-report.ts';
import { Composer, EMPTY_COMPOSER } from './parts.tsx';
import { type Colony, useColony } from './useColony.ts';

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
const frame = game.frame();
const summary = game.summary();
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.replaceChildren();
});

function required<T extends Element>(parent: ParentNode, selector: string): T {
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
  it('leaves Enter on order options to native activation without sending the prepared order', async () => {
    const actions = {
      order: vi.fn(),
      cancel: vi.fn(),
      dismissNudge: vi.fn(),
      setSpeed: vi.fn(),
      setPaused: vi.fn(),
      setMenuOpen: vi.fn(),
      pauseForInspector: vi.fn(),
      resumeFromInspector: vi.fn(),
      setAutoPause: vi.fn(),
      continueDay: vi.fn(),
      requestWhy: vi.fn(),
      clearWhy: vi.fn(),
      predict: vi.fn(),
      restart: vi.fn(),
      exportPlaytest: vi.fn(),
      sendPlaytest: vi.fn(),
      loadPlaytest: vi.fn(),
      clearPlaytest: vi.fn(),
      playtestError: vi.fn(),
    };
    vi.mocked(useColony).mockReturnValue({
      store: { current: { curr: frame, prev: null, at: 0, interval: 62 } },
      frame: { ...frame, nudges: NUDGES.slice(0, 1) },
      playback: { paused: true, pause: null, speed: 1, autoPause: true, slowMo: false },
      why: null,
      prediction: null,
      summaries: {},
      error: null,
      playtest: null,
      actions,
    } satisfies Colony);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    roots.push(root);
    await act(() => root.render(createElement(App)));
    expect(container.querySelector('.order-scope')?.textContent).toBe('Each order goes to both villages.');
    expect(container.querySelector('.pane-classic h2')?.textContent).toBe('Classic they obey');
    expect(container.querySelector('.pane-human h2')?.textContent).toBe('Human they decide');
    const workerPicker = required<HTMLDetailsElement>(container, '.worker-picker');
    const workerSummary = required<HTMLElement>(workerPicker, 'summary');
    workerSummary.focus();
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    await act(() => workerSummary.dispatchEvent(space));
    expect(space.defaultPrevented).toBe(false);
    expect(actions.setPaused).not.toHaveBeenCalled();
    expect(container.querySelector('[data-map="human"]')?.getAttribute('data-following')).toBe('false');
    await act(() => workerSummary.click());
    await act(() => required<HTMLButtonElement>(workerPicker, '[data-person="yusuf"]').click());
    expect(workerPicker.open).toBe(false);
    expect(workerPicker.querySelector('summary')?.textContent).toContain('Yusuf');
    const placePicker = required<HTMLDetailsElement>(container, '.destination-picker');
    await act(() => required<HTMLElement>(placePicker, 'summary').click());
    await act(() => required<HTMLButtonElement>(placePicker, '[data-place="forest"]').click());
    expect(placePicker.open).toBe(false);
    expect(container.querySelector('select')).toBeNull();
    // A different worker keeps the requested place, including when replacing a refusal.
    await act(() => required<HTMLButtonElement>(workerPicker, '[data-person="maryam"]').click());
    expect(container.querySelector('.composer-line')?.textContent).toContain('Maryam → Forest');
    await act(() => required<HTMLButtonElement>(workerPicker, '[data-person="yusuf"]').click());
    // Switching village views also preserves the prepared order.
    await act(() => required<HTMLButtonElement>(container, '.map-toggle button').click());
    expect(container.querySelector('.composer-line')?.textContent).toContain('Yusuf → Forest');
    const about = [...container.querySelectorAll('button')].find((b) => b.textContent === 'About Yusuf');
    expect(about).toBeDefined();
    await act(() => about?.click());
    expect(container.querySelector('dialog')).not.toBeNull();
    expect(actions.pauseForInspector).not.toHaveBeenCalled();
    await act(() => required<HTMLButtonElement>(container, 'dialog .icon-x').click());
    const disclosure = required<HTMLDetailsElement>(container, '.order-options');
    const toggle = required<HTMLElement>(disclosure, 'summary');
    toggle.focus();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    await act(() => toggle.dispatchEvent(event));
    expect(actions.order).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    // happy-dom has no keyboard default activation; exercise its summary activation separately.
    await act(() => toggle.click());
    expect(disclosure.open).toBe(true);
    expect(container.querySelector('.composer-line')?.textContent).toContain('Yusuf → Forest');
    const confirm = required<HTMLButtonElement>(container, '.btn-confirm');
    await act(() => confirm.click());
    expect(actions.order).toHaveBeenCalledExactlyOnceWith(
      { personId: 'yusuf', placeId: 'forest' },
      undefined,
    );
    expect(container.querySelector('.colony')?.classList.contains('is-ordering')).toBe(false);
    expect(container.querySelector('[data-map="human"]')?.getAttribute('data-selected')).toBe('yusuf');
    expect(container.querySelector('.watching-worker')?.textContent).toContain('Yusuf');
    expect(container.querySelector('[data-map="human"]')?.getAttribute('data-following')).toBe('true');
    expect(container.querySelector('[data-map="human"]')?.getAttribute('data-follow-key')).toBe('1');
    await act(() => workerSummary.click());
    expect(container.querySelector('[data-map="human"]')?.getAttribute('data-following')).toBe('false');
    await act(() => required<HTMLButtonElement>(container, '[data-map="human"]').click());
    expect(container.querySelector('.composer-line')?.textContent).toContain('Yusuf: now pick a place.');
    expect(container.querySelector('.colony')?.classList.contains('is-ordering')).toBe(false);
    expect(actions.order).toHaveBeenCalledTimes(2);
    expect(actions.order).toHaveBeenLastCalledWith({ personId: 'yusuf', placeId: 'site' }, undefined);
    const suggestion = required<HTMLDetailsElement>(container, '.nudge-slot');
    await act(() => required<HTMLElement>(suggestion, 'summary').click());
    expect(suggestion.open).toBe(true);
    await act(() => required<HTMLButtonElement>(suggestion, '.nudge-head .btn').click());
    expect(suggestion.open).toBe(false);
    expect(container.querySelector('.composer-line')?.textContent).toContain('Yusuf: now pick a place.');
    expect(actions.order).toHaveBeenCalledTimes(3);
    expect(actions.order).toHaveBeenLastCalledWith({ personId: 'yusuf', placeId: 'site' }, 'dawn-site');
  });

  it.each([
    [{ rush: true }, 'Rush: faster, hungrier'],
    [{ insist: true }, 'Insist: may cost trust'],
    [{ appeal: 'safety' as const }, 'A promise: hurt on this job, they will hold you to it.'],
  ])('keeps active order costs readable with options closed: %j', (option, expected) => {
    const el = markup(
      createElement(Composer, {
        state: { ...EMPTY_COMPOSER, personId: 'yusuf', placeId: 'forest', ...option },
        frame,
        job: 'gather-timber',
        prediction: null,
        onChange: vi.fn(),
        onWho: vi.fn(),
        onWhere: vi.fn(),
        onHover: vi.fn(),
        onConfirm: vi.fn(),
        onInspect: vi.fn(),
      }),
    );
    expect(el.querySelector<HTMLDetailsElement>('.order-options')?.open).toBe(false);
    for (const details of el.querySelectorAll('details:not([open])')) {
      const label = details.querySelector('summary');
      if (label) details.replaceWith(label);
    }
    expect(el.textContent).toContain(expected);
    expect(el.querySelector('.btn-confirm')).not.toBeNull();
  });

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
      'DisheartenedHeartened',
    );
    expect(rows.find((r) => r.querySelector('th')?.textContent === 'Trust in you')?.textContent).toContain(
      'Wary of youTrusts you deeply',
    );
    const changed = ordersChanged(report);
    expect(changed).toContain('morale Disheartened (without you: Heartened)');
    expect(changed).toContain('trust in you Wary of you (without you: Trusts you deeply)');
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
  expect(renderToStaticMarkup(createElement(EndScreen, props))).not.toContain('The well’s tally');
  const on = renderToStaticMarkup(createElement(EndScreen, { ...props, tally: true }));
  expect(on).toContain('The well’s tally');
  expect(on).toContain('Classic:');
  expect(on).toContain('Human:');
  expect(on).toContain('marks');
});
