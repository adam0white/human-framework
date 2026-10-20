// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColonyGame, SCENARIO_VERSION } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { Playback } from '../sim/playback.ts';
import { App } from './App.tsx';
import type { Colony } from './useColony.ts';

let colony: Colony;
vi.mock('./renderer.ts', async (original) => ({
  ...(await original<typeof import('./renderer.ts')>()),
  drawScene: () => [],
}));
vi.mock('./useColony.ts', () => ({ useColony: () => colony }));
vi.mock('../../shared/lab.tsx', async (original) => ({
  ...(await original<typeof import('../../shared/lab.tsx')>()),
  useLabScreen: () => {},
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
let animationFrames: FrameRequestCallback[];
let contexts: WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>;
async function draw() {
  const pending = animationFrames.splice(0);
  await act(() => {
    for (const callback of pending) callback(1000);
  });
}
function transform() {
  const canvas = container.querySelector<HTMLCanvasElement>('.pane-classic canvas');
  if (!canvas) throw new Error('Missing Classic canvas');
  const ctx = contexts.get(canvas);
  if (!ctx) throw new Error('Missing canvas context');
  return vi.mocked(ctx.setTransform).mock.calls.at(-1);
}

beforeEach(() => {
  vi.stubGlobal('fetch', async () => new Response('{}'));
  animationFrames = [];
  contexts = new WeakMap();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    animationFrames.push(callback);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 360,
    bottom: 380,
    width: 360,
    height: 380,
    toJSON() {
      return {};
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) {
      ctx = { setTransform: vi.fn(), fillRect: vi.fn() } as unknown as CanvasRenderingContext2D;
      contexts.set(this, ctx);
    }
    return ctx;
  });
  const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
  const maryam = frame.classic.find((person) => person.id === 'maryam');
  if (maryam) {
    maryam.x = 1;
    maryam.y = 1;
  }
  frame.news = [{ personId: 'maryam', side: 'classic', minute: 330, how: 'at work' }];
  colony = {
    frame,
    store: { current: { curr: frame, prev: null, at: 0, interval: 62 } },
    playback: { paused: true, pause: null, speed: 1, autoPause: false, slowMo: false },
    why: null,
    prediction: null,
    summaries: {},
    error: null,
    playtest: null,
    actions: {
      order: vi.fn(),
      cancel: vi.fn(),
      dismissNudge: vi.fn(),
      setSpeed: vi.fn(),
      setPaused: vi.fn(),
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
    },
  };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function button(text: string) {
  const result = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
  if (!result) throw new Error(`Missing button: ${text}`);
  return result;
}
async function click(text: string) {
  await act(() => button(text).click());
}
async function prepare() {
  await act(() => root.render(createElement(App)));
  await act(() => container.querySelector<HTMLButtonElement>('[data-person="yusuf"]')?.click());
  await act(() =>
    container.querySelector<HTMLButtonElement>('.destination-picker [data-place="site"]')?.click(),
  );
}

describe('Well person news follow', () => {
  it('holds the map when news arrives and moves only after Show and Back clicks', async () => {
    await prepare();
    await draw();
    const before = transform();
    await act(() => {
      if (colony.frame) colony.frame = { ...colony.frame, news: [...colony.frame.news] };
      colony.store.current.curr = colony.frame;
      root.render(createElement(App));
    });
    await draw();
    expect(transform()).toEqual(before);
    await click('Show Maryam');
    await draw();
    const followingMaryam = transform();
    expect(followingMaryam).toEqual(before); // Both workers fit in the full village view.
    await click('Back to Yusuf');
    await draw();
    expect(transform()).toEqual(followingMaryam);
  });

  it('returns to the village view when no worker was selected', async () => {
    await act(() => root.render(createElement(App)));
    await draw();
    const village = transform();
    await click('Show Maryam');
    await draw();
    expect(transform()).not.toEqual(village);
    await click('Back to village');
    await draw();
    expect(transform()).toEqual(village);
  });

  it('shows news only on request and returns to the prepared worker without changing the order', async () => {
    await prepare();
    expect(container.querySelector('.news-follow')).toBeNull();
    expect(container.querySelector('.stage')?.classList.contains('show-human')).toBe(true);
    await click('Show Maryam');
    expect(container.querySelector('.news-follow')?.textContent).toContain('Watching Maryam');
    expect(container.querySelector('.stage')?.classList.contains('show-classic')).toBe(true);
    expect(container.querySelector('.worker-picker summary')?.textContent).toBe('Worker · Yusuf');
    expect(container.querySelector('.destination-picker summary')?.textContent).toBe('Place · House');
    await click('Back to Yusuf');
    expect(container.querySelector('.news-follow')).toBeNull();
    expect(container.querySelector('.stage')?.classList.contains('show-human')).toBe(true);
    await act(() => container.querySelector<HTMLButtonElement>('.btn-confirm')?.click());
    expect(colony.actions.order).toHaveBeenCalledWith({ personId: 'yusuf', placeId: 'site' }, undefined);
  });

  it('keeps the original return worker when following another news item', async () => {
    await prepare();
    await click('Show Maryam');
    await act(() => {
      if (colony.frame)
        colony.frame = {
          ...colony.frame,
          news: [...colony.frame.news, { personId: 'tariq', side: 'human', minute: 340, how: 'at work' }],
        };
      root.render(createElement(App));
    });
    expect(container.querySelector('.news-follow')?.textContent).toContain('Watching Maryam');
    await click('Show Tariq');
    expect(container.querySelector('.news-follow')?.textContent).toContain('Watching Tariq');
    await click('Back to Yusuf');
    expect(container.querySelector('.stage')?.classList.contains('show-human')).toBe(true);
  });
});

describe('Well Keep watching from App', () => {
  it.each([false, true])(
    'acknowledges a suggestion with paused=%s and keeps expiry on simulation time',
    async (paused) => {
      const pb = new Playback(createFrameworkHumanSide);
      pb.handle({ type: 'init', seed: 20261003, scenarioVersion: SCENARIO_VERSION, gen: 1, autoPause: true });
      pb.handle({ type: 'resume' });
      pb.handle({ type: 'setSpeed', speed: 2 });
      pb.handle({ type: 'dismissNudge', id: 'dawn-site' });
      while (!pb.state().slowMo) pb.handle({ type: 'tick', dtMs: 250 });
      const game = pb.game;
      const nudge = game?.visibleNudges().find((item) => item.id === 'cedar');
      if (!game || !nudge) throw new Error('Missing pending cedar suggestion');
      const minute = game.minute;
      if (paused) {
        pb.handle({ type: 'pause', cause: 'manual' });
        for (let i = 0; i < 40; i++) pb.handle({ type: 'tick', dtMs: 250 });
        expect(game.minute).toBe(minute);
        expect(game.visibleNudges().some((item) => item.id === nudge.id)).toBe(true);
      }
      colony.frame = game.frame();
      colony.store.current.curr = colony.frame;
      colony.playback = pb.state();
      const resume = vi.fn((value: boolean) => {
        expect(value).toBe(false);
        pb.handle({ type: 'resume' });
      });
      colony.actions.setPaused = resume;
      await act(() => root.render(createElement(App)));
      const suggestion = container.querySelector<HTMLDetailsElement>('.nudge-slot');
      if (!suggestion) throw new Error('Missing suggestion disclosure');
      await act(() => {
        suggestion.open = true;
      });
      await click('Keep watching');
      expect(resume).toHaveBeenCalledTimes(paused ? 2 : 1);
      expect(suggestion.open).toBe(true);
      expect(pb.state()).toMatchObject({ paused: false, slowMo: false, speed: 2 });
      expect(game.visibleNudges().some((item) => item.id === nudge.id)).toBe(true);
      pb.handle({ type: 'tick', dtMs: 250 });
      expect(game.minute).toBe(minute + 4);
      expect(game.visibleNudges().some((item) => item.id === nudge.id)).toBe(true);
      pb.handle({ type: 'pause', cause: 'manual' });
      for (let i = 0; i < 40; i++) pb.handle({ type: 'tick', dtMs: 250 });
      expect(game.minute).toBe(minute + 4);
      expect(game.visibleNudges().some((item) => item.id === nudge.id)).toBe(true);
      pb.handle({ type: 'resume' });
      while (game.minute < nudge.until) pb.handle({ type: 'tick', dtMs: 250 });
      expect(game.visibleNudges().some((item) => item.id === nudge.id)).toBe(false);
    },
  );
});
