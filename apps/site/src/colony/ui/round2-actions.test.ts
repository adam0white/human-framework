// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ColonyGame, NUDGES } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { App } from './App.tsx';
import type { PaneProps } from './Pane.tsx';
import type { Colony } from './useColony.ts';

let colony: Colony;
vi.mock('./useColony.ts', () => ({ useColony: () => colony }));
vi.mock('../../shared/lab.tsx', () => ({
  gameLabs: { well: { recordingAllowed: () => false } },
  useLabScreen: () => {},
}));
vi.mock('@adam0white/lab-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@adam0white/lab-kit')>()),
  telemetryOn: () => false,
  setTelemetryOff: () => {},
  telemetryNotice: () => null,
  debugFooter: (slot: Node) => {
    const node = document.createElement('div');
    node.append(slot);
    return node;
  },
}));
vi.mock('./Pane.tsx', () => ({
  Pane: (p: PaneProps) =>
    createElement(
      'div',
      { 'data-scene': p.side },
      createElement('button', { type: 'button', onClick: () => p.onPlace('well') }, `Scene well ${p.side}`),
      createElement(
        'button',
        { type: 'button', onClick: p.onShowVillage },
        `Show ${p.side === 'human' ? 'Human' : 'Classic'} village`,
      ),
      createElement(
        'button',
        { type: 'button', onClick: () => p.onSelect('idris') },
        `Scene person ${p.side}`,
      ),
    ),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>, container: HTMLDivElement;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', async () => new Response('{}'));
  const game = new ColonyGame(20261003, createFrameworkHumanSide);
  const frame = game.frame();
  colony = {
    frame,
    store: { current: { curr: frame, prev: null, at: 0, interval: 62 } },
    playback: {
      paused: true,
      pause: { kind: 'start', text: '', minute: 0 },
      speed: 1,
      autoPause: true,
      slowMo: false,
    },
    why: null,
    prediction: null,
    summaries: {},
    error: null,
    playtest: null,
    actions: Object.fromEntries(
      [
        'order',
        'cancel',
        'dismissNudge',
        'setSpeed',
        'setPace',
        'setContext',
        'setMenuOpen',
        'setPaused',
        'pauseForInspector',
        'resumeFromInspector',
        'setAutoPause',
        'continueDay',
        'requestWhy',
        'clearWhy',
        'predict',
        'predictPlaces',
        'predictSuggestion',
        'restart',
        'exportPlaytest',
        'sendPlaytest',
        'loadPlaytest',
        'clearPlaytest',
        'playtestError',
        'getRun',
      ].map((k) => [
        k,
        k === 'getRun'
          ? vi.fn().mockResolvedValue({ kind: 'human-playtest', game: 'colony', minute: 1 })
          : vi.fn(),
      ]),
    ) as unknown as Colony['actions'],
  };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  history.replaceState(null, '', '/');
});
async function click(text: string) {
  const b = [...container.querySelectorAll('button')].find((b) => b.textContent === text);
  expect(b, text).toBeDefined();
  await act(() => b?.click());
}
async function begin() {
  await act(() => root.render(createElement(App)));
  await click('Begin the first morning');
  colony.playback = { ...colony.playback, pause: null, paused: false };
  await act(() => root.render(createElement(App)));
}
it('starts on the shelf with one primary, default village and folded import', async () => {
  await act(() => root.render(createElement(App)));
  expect(container.querySelectorAll('.well-primary')).toHaveLength(1);
  expect(container.querySelectorAll('input[type=radio]')).toHaveLength(2);
  expect(container.querySelector('input[type=file]')).toBeNull();
  expect(container.textContent).not.toContain('Lab tools');
});
it('copies the current run directly from the game menu without opening feedback', async () => {
  history.replaceState(null, '', '/');
  await begin();
  const menu = container.querySelector<HTMLButtonElement>('button[aria-label="Game menu"]');
  await act(() => menu?.click());
  await click('Keep a copy of this run');
  expect(colony.actions.exportPlaytest).toHaveBeenCalledOnce();
  expect(container.querySelector('[aria-label="Feedback"]')).toBeNull();
});
it('sends a safe tile once with the how settings and keeps that person selected', async () => {
  await begin();
  await act(() => container.querySelector<HTMLButtonElement>('[data-person="idris"]')?.click());
  await click('Rush');
  const tile = [...container.querySelectorAll<HTMLButtonElement>('.well-places button')].find((b) =>
    b.textContent?.startsWith('Well'),
  );
  await act(() => tile?.click());
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(
    { personId: 'idris', placeId: 'well', rush: true },
    undefined,
  );
  expect(container.querySelector('.well-sheet-head')?.textContent).toContain('Idris');
  expect(container.querySelector('.well-how button')?.getAttribute('aria-pressed')).toBe('false');
});
it('reviews Cedar without issuing, then sends exactly once and preserves settings', async () => {
  await begin();
  await click('Scene person human');
  await click('Insist');
  const cedar = [...container.querySelectorAll<HTMLButtonElement>('.well-places button')].find((b) =>
    b.textContent?.startsWith('Cedar'),
  );
  await act(() => cedar?.click());
  expect(colony.actions.order).not.toHaveBeenCalled();
  expect(container.querySelector('.well-risk')?.textContent).toContain('The cedar can injure');
  await click('Send anyway');
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(
    { personId: 'idris', placeId: 'cedar', insist: true },
    undefined,
  );
});
it('map taps use the same how settings as tiles', async () => {
  await begin();
  await click('Scene person human');
  await click('Rush');
  await click('Scene well human');
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(
    { personId: 'idris', placeId: 'well', rush: true },
    undefined,
  );
});
it('explains initial quick suggestions before sending their unchanged payload, while risky ones still review', async () => {
  await begin();
  const n = NUDGES[0];
  if (!n || !colony.frame) throw Error('Missing fixture');
  // Presentation fixture: a real idle frame with this authored suggestion shown.
  // Actual HF4 builders may already be working when its scheduled time arrives.
  const game = new ColonyGame(20261003, createFrameworkHumanSide);
  colony.frame = { ...game.frame(), nudges: [n] };
  expect(colony.frame.cards).toHaveLength(0);
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-sheet-head')).toBeNull();
  expect(container.querySelector('.well-caption .well-task-context')?.textContent ?? '').toContain(
    'not the finished roof',
  );
  expect(colony.actions.order).not.toHaveBeenCalled();
  await click('Send');
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(suggestionInputForTest(n), n.id);
  const cooking = NUDGES.find((n) => n.id === 'storm-pot');
  if (!cooking) throw Error('Missing cooking suggestion');
  // Presentation-only cooking offer on a real fresh idle frame, not a native scheduled-cooking run.
  const idle = new ColonyGame(20261003, createFrameworkHumanSide).frame();
  colony.frame = { ...idle, nudges: [cooking] };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-caption .well-task-context')?.textContent ?? '').toContain(
    'threshold rises from 6 to 12 at Day 2 16:00',
  );
  await click('Send');
  expect(colony.actions.order).toHaveBeenNthCalledWith(2, suggestionInputForTest(cooking), cooking.id);
  const risky = NUDGES.find((n) => n.id === 'cedar');
  if (!risky) throw Error('Missing cedar');
  colony.frame = { ...colony.frame, nudges: [risky] };
  await act(() => root.render(createElement(App)));
  await click('Review');
  expect(colony.actions.order).toHaveBeenCalledTimes(2);
  expect(container.querySelector('.well-places .is-outlined')?.textContent).toContain('Cedar');
});
function suggestionInputForTest(n: (typeof NUDGES)[number]) {
  return {
    ...n.order,
    rush: Boolean(n.prefill?.rush ?? n.order.rush),
    insist: Boolean(n.prefill?.insist ?? n.order.insist),
  };
}
it('history has no send footer and the comparison exposes both villages', async () => {
  await begin();
  await click('All orders (0) ›');
  expect(container.querySelector('.well-sheet .well-primary')).toBeNull();
  expect(container.querySelector('.well-sheet .well-risk')).toBeNull();
  await click('←');
  await act(() => container.querySelector<HTMLButtonElement>('.well-goals')?.click());
  expect(container.querySelector('.well-stand')?.textContent).toContain('Not tracked in the Classic village');
  expect(container.querySelectorAll('.goal-bars')).toHaveLength(6);
});
it('injury selection binds subsequent orders to the named person and selects its map', async () => {
  await begin();
  if (!colony.frame) throw Error('Missing frame');
  colony.frame = {
    ...colony.frame,
    news: [{ personId: 'idris', side: 'classic', minute: 2, how: 'at work' }],
  };
  await act(() => root.render(createElement(App)));
  await act(() => container.querySelector<HTMLButtonElement>('[data-person="yusuf"]')?.click());
  await click('Hurt · Idris (Classic) · Show');
  await click('Scene well classic');
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(
    { personId: 'idris', placeId: 'well' },
    undefined,
  );
});
it('gives loaded runs a touch resume action and new runs return to the title page', async () => {
  await begin();
  colony.playtest = {
    result: {
      matches: true,
      hash: 'same',
      expected: 'same',
      file: { build: 'dev', framework: '2.14.1', engine: '2.14.1' },
      here: { framework: '2.14.1', engine: '2.14.1' },
      driftAt: -1,
      minute: 30,
    },
  };
  colony.playback = {
    ...colony.playback,
    paused: true,
    pause: { kind: 'manual', text: 'Loaded run', minute: 30 },
  };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-interstitial')?.textContent).toContain('Loaded run');
  await click('Play on from here');
  expect(colony.actions.setPaused).toHaveBeenLastCalledWith(false);
});
it('expires a moment even while new worker frames arrive', async () => {
  vi.useFakeTimers();
  try {
    await begin();
    if (!colony.frame) throw Error('Missing frame');
    const m = { id: 2 as const, personId: 'yusuf' as const, minute: 0, line: 'Same job, different answer' };
    colony.frame = { ...colony.frame, moments: [m] };
    await act(() => root.render(createElement(App)));
    expect(container.querySelector('.well-scene-alert')?.textContent).toContain(m.line);
    colony.frame = { ...colony.frame, moments: [{ ...m }], minute: 1 };
    await act(() => root.render(createElement(App)));
    await act(() => vi.advanceTimersByTime(4501));
    expect(container.querySelector('.well-scene-alert')?.textContent).not.toContain(m.line);
  } finally {
    vi.useRealTimers();
  }
});
it('shows a fresh suggestion forecast in the caption instead of repeating old availability', async () => {
  await begin();
  const n = NUDGES.find((n) => n.id === 'cook-forest');
  if (!n || !colony.frame) throw Error('Missing fixture');
  colony.frame = { ...colony.frame, nudges: [n] };
  colony.suggestionPrediction = {
    input: suggestionInputForTest(n),
    prediction: {
      personId: 'maryam',
      action: 'gather-timber',
      kind: 'notNow',
      text: 'After cooking the meal.',
    },
  };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-caption')?.textContent).toContain('After cooking the meal.');
});
it('marks scheduled work already underway and lets the player dismiss it without ordering again', async () => {
  await begin();
  const n = NUDGES[0];
  if (!n || !colony.frame) throw Error('Missing fixture');
  colony.frame = {
    ...colony.frame,
    nudges: [n],
    cards: [
      {
        order: { id: 'o1', ...n.order, action: 'build', issuedAt: 0, rollKey: 0, rush: false, insist: false },
        status: 'active',
        human: { state: 'assent' },
        classic: { state: 'ok' },
      },
    ],
  };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-caption')?.textContent).toContain('This work is already underway');
  expect(container.querySelector('.well-caption .well-task-context')).toBeNull();
  await click('Keep watching');
  expect(colony.actions.order).not.toHaveBeenCalled();
  expect(colony.actions.dismissNudge).toHaveBeenCalledWith(n.id);
});
it('keeps the refused destination outlined when choosing another worker', async () => {
  await begin();
  if (!colony.frame) throw Error('Missing frame');
  colony.frame = {
    ...colony.frame,
    cards: [
      {
        order: {
          id: 'o1',
          personId: 'idris',
          placeId: 'site',
          action: 'build',
          issuedAt: 0,
          rollKey: 0,
          rush: false,
          insist: false,
        },
        status: 'done',
        human: { state: 'willNot', settled: true },
        classic: { state: 'ok', settled: true },
      },
    ],
  };
  await act(() => root.render(createElement(App)));
  await click('Scene person human');
  // A map person selection is the same handler as the people list.
  colony.frame = { ...colony.frame, news: [{ personId: 'yusuf', side: 'human', minute: 2, how: 'at work' }] };
  await act(() => root.render(createElement(App)));
  await click('Hurt · Yusuf (Human) · Show');
  // Injury selection intentionally prioritizes Home; ordinary worker switches are tested below through Back.
  await click('←');
  await act(() => container.querySelector<HTMLButtonElement>('[data-person="idris"]')?.click());
  await click('←');
  await act(() => container.querySelector<HTMLButtonElement>('[data-person="yusuf"]')?.click());
  expect(container.querySelector('.well-places .is-outlined')?.textContent).toContain('House');
  expect(colony.actions.order).not.toHaveBeenCalled();
});

it('keeps a reviewed proposal deliberate through moving frames and its order lifecycle', async () => {
  await begin();
  const proposal = NUDGES.find((n) => n.id === 'cedar');
  if (!proposal || !colony.frame) throw Error('Missing proposal');
  const reviewed = { ...proposal, until: colony.frame.minute + 30, prefill: { rush: true } };
  colony.frame = { ...colony.frame, nudges: [reviewed] };
  await act(() => root.render(createElement(App)));
  const reviewButton = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === 'Review',
  );
  expect(reviewButton).toBeDefined();
  await act(() => reviewButton?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  colony.frame = {
    ...colony.frame,
    nudges: [{ ...reviewed, id: 'new-under-finger', order: { personId: 'maryam', placeId: 'cedar' } }],
  };
  await act(() => root.render(createElement(App)));
  await act(() => reviewButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
  expect(colony.actions.order).not.toHaveBeenCalled();
  expect(container.querySelector('.well-reviewed')?.textContent).toContain('Rush is suggested');
  expect(container.querySelector('.well-draft-how')?.textContent).toContain('Rush off');
  expect(container.querySelector('.well-reviewed')?.textContent).toContain(reviewed.reason);
  const next = {
    ...reviewed,
    id: 'different',
    order: { personId: 'maryam' as const, placeId: 'well' as const },
  };
  colony.frame = { ...colony.frame, nudges: [next], minute: colony.frame.minute + 1 };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-reviewed')?.textContent).toContain('Idris');
  await click('Rush');
  await click('Insist');
  await click('Appeal ▾');
  await click('Duty');
  await click('Send reviewed order');
  expect(colony.actions.order).not.toHaveBeenCalled();
  expect(container.querySelector('.well-risk')?.textContent).toContain('Idris');
  await click('Send anyway');
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(
    { ...reviewed.order, rush: true, insist: true, appeal: 'duty' },
    reviewed.id,
  );
  await click('Show Human village');
  expect(colony.actions.order).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Back to Idris');
  await click('Scene well human');
  expect(colony.actions.order).toHaveBeenCalledTimes(1);
  await click('Back to Idris');
  const game = new ColonyGame(20261003, createFrameworkHumanSide);
  game.issue({ ...reviewed.order, rush: true, insist: true, appeal: 'duty' });
  colony.frame = game.frame();
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-latest')?.textContent).toContain('Rush on');
  expect(container.querySelector('.well-latest')?.textContent).toContain('Insist on');
  expect(container.querySelector('.well-latest')?.textContent).toContain('Sent appeal: it’s your duty');
  await click('Rush');
  expect(container.querySelector('.well-latest')?.textContent).toContain('Rush on');
  expect(container.querySelector('.well-latest')?.textContent).toContain('pending');
  game.advance(1);
  colony.frame = game.frame();
  await act(() => root.render(createElement(App)));
  colony.frame = {
    ...colony.frame,
    cards: colony.frame.cards.map((c) => ({
      ...c,
      human: { state: 'notNow' as const, says: 'After I drink.' },
    })),
  };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-latest')?.textContent).toContain('Human answer: later');
  expect(container.querySelector('.well-latest')?.textContent).toContain('Issued');
  expect(container.querySelector('.well-latest')?.textContent).toContain('Idris: “After I drink.”');
  expect(container.querySelector('.well-latest')?.textContent).not.toContain('Answer time unavailable');
  colony.frame = {
    ...colony.frame,
    cards: colony.frame.cards.map((c) => ({
      ...c,
      human: { ...c.human, answerObservedAt: colony.frame!.minute },
    })),
  };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-latest')?.textContent).toContain(
    'Idris: “After I drink.” (this morning)',
  );
  colony.frame = {
    ...colony.frame,
    cards: colony.frame.cards.map((c) => ({ ...c, status: 'lapsed' as const })),
  };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-latest')?.textContent).toContain('lapsed');
  colony.frame = {
    ...new ColonyGame(20261003, createFrameworkHumanSide).frame(),
    nudges: [reviewed],
    minute: reviewed.until - 1,
  };
  await act(() => root.render(createElement(App)));
  await click('Review');
  colony.frame = { ...colony.frame, nudges: [next], minute: reviewed.until };
  await act(() => root.render(createElement(App)));
  expect(container.querySelector('.well-reviewed')?.textContent).toContain('unavailable');
  const send = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === 'Send reviewed order',
  );
  expect(send?.disabled).toBe(true);
  await act(() => send?.click());
  expect(colony.actions.order).toHaveBeenCalledTimes(1);
});

// Independent review concern: current danger must be checked after a held press.
it('review concern revalidates danger after pointer down', async () => {
  await begin();
  const proposal = NUDGES.find((n) => n.id === 'dawn-site');
  if (!proposal || !colony.frame) throw Error('Missing proposal');
  const held = { ...proposal, until: colony.frame.minute + 30 };
  colony.frame = { ...colony.frame, weather: { ...colony.frame.weather, kind: 'clear' }, nudges: [held] };
  await act(() => root.render(createElement(App)));
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === 'Send',
  );
  expect(button).toBeDefined();
  await act(() => button?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  colony.frame = {
    ...colony.frame,
    minute: colony.frame.minute + 1,
    weather: { ...colony.frame.weather, kind: 'storm' },
  };
  await act(() => root.render(createElement(App)));
  await act(() => button?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
  expect(colony.actions.order).not.toHaveBeenCalled();
});

it('checks current storm risk again when sending the captured reviewed draft', async () => {
  await begin();
  const proposal = NUDGES.find((n) => n.id === 'dawn-site');
  if (!proposal || !colony.frame) throw Error('Missing proposal');
  const held = { ...proposal, until: colony.frame.minute + 30, prefill: { rush: true } };
  colony.frame = { ...colony.frame, weather: { ...colony.frame.weather, kind: 'clear' }, nudges: [held] };
  await act(() => root.render(createElement(App)));
  await click('Review');
  colony.frame = {
    ...colony.frame,
    minute: colony.frame.minute + 1,
    weather: { ...colony.frame.weather, kind: 'storm' },
    nudges: [],
  };
  await act(() => root.render(createElement(App)));
  await click('Send reviewed order');
  expect(colony.actions.order).not.toHaveBeenCalled();
  expect(container.querySelector('.well-risk')?.textContent).toContain('Yusuf');
  await click('Send anyway');
  expect(colony.actions.order).toHaveBeenCalledExactlyOnceWith(held.order, held.id);
});

it('retains selected injury context across newer news, clears it on another selection and restart', async () => {
  await begin();
  if (!colony.frame) throw Error('Missing frame');
  const first = { personId: 'idris' as const, side: 'classic' as const, minute: 2, how: 'hurt at work' };
  colony.frame = { ...colony.frame, news: [first] };
  await act(() => root.render(createElement(App)));
  await click('Hurt · Idris (Classic) · Show');
  const context = () => container.querySelector('.well-selected-injury')?.textContent;
  expect(context()).toContain('Idris');
  expect(context()).toContain('Classic');
  expect(context()).toContain('Day 1 05:02');
  expect(context()).toContain('hurt at work');
  colony.frame = {
    ...colony.frame,
    news: [{ personId: 'samira', side: 'human', minute: 7, how: 'hurt in the storm' }],
  };
  await act(() => root.render(createElement(App)));
  expect(context()).toContain('Idris');
  expect(context()).not.toContain('Samira');
  expect(container.querySelector('.well-person-body')?.textContent).toContain('Human village:');
  await click('Scene person human');
  expect(context()).toBeUndefined();
  // Reopen a notice, then use the ordinary new-game route.
  await click('Hurt · Samira (Human) · Show');
  expect(context()).toContain('Samira');
  await act(() => container.querySelector<HTMLButtonElement>('[aria-label="Game menu"]')?.click());
  await click('New game');
  await click('Replace this game and start again');
  expect(context()).toBeUndefined();
});

it('explains both opening preparation choices without changing their actual start input', async () => {
  await act(() => root.render(createElement(App)));
  const labels = [...container.querySelectorAll('.well-village-choice label')];
  expect(labels[0]?.textContent).toContain('Day 2 16:00');
  expect(labels[1]?.textContent).toContain('Day 2 12:00');
  expect(labels[1]?.textContent).toContain('Day 2 19:00');
  await act(() => labels[1]?.querySelector<HTMLInputElement>('input')?.click());
  expect(colony.actions.restart).toHaveBeenCalledWith('early-warning');
});
