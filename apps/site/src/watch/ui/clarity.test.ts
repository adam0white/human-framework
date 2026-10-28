let usePolicyWatch: typeof import('./useWatch.ts').useWatch;
function PolicyWatch({
  capture,
}: {
  capture(value: ReturnType<typeof import('./useWatch.ts').useWatch>): void;
}) {
  capture(usePolicyWatch());
  return null;
}

// @vitest-environment happy-dom

import { act, createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import * as castRuntime from '../../shared/cast-runtime.ts';
import { requireValue } from '../../shared/require-value.ts';
import { applyInput, newGame, stepMinute } from '../sim/night.ts';
import { buildFrame } from '../sim/view.ts';
import type { WatchActions } from './useWatch.ts';

vi.mock('../../shared/lab.tsx', () => ({
  gameLabs: { watch: { telemetryOn: true, screen: vi.fn(), milestone: vi.fn() } },
}));
vi.mock('./useWatch.ts', () => ({ useWatch: vi.fn() }));
vi.mock('./MapCanvas.tsx', () => ({ MapCanvas: () => null }));
const { App, GoalPage, DuskPanel, NightPanel, DawnPanel, WatchStrip, headerLine } = await import('./App.tsx');
const { Chronicle, Shelf } = await import('./chronicle.tsx');
const actions = {
  input: vi.fn(),
  hold: vi.fn(),
  readingSlow: vi.fn(),
  refreshShelf: vi.fn(),
} as unknown as WatchActions;
function render(node: Parameters<typeof renderToStaticMarkup>[0]) {
  const el = document.createElement('div');
  el.innerHTML = renderToStaticMarkup(node);
  return el;
}
const state = newGame(4242);
applyInput(state, { k: 'start' });
const dusk = buildFrame(state, 0, false);
it('shows the controlled-watch count as ordinary visible strip text', () => {
  if (!dusk.winter) throw new Error('Missing winter');
  const strip = render(createElement(WatchStrip, { frame: dusk }));
  expect(strip.querySelector('.w-thaw-state > span')?.textContent).toBe(`${dusk.winter.nights} watches left`);
});
it('separates starting lantern from the selected person’s post actions', () => {
  const props = {
    frame: dusk,
    actions,
    selected: null,
    setSelected: vi.fn(),
    press: 'urge' as const,
    setPress: vi.fn(),
    post: vi.fn(),
  };
  const idle = render(createElement(DuskPanel, props));
  expect(idle.querySelector('[aria-haspopup]')?.textContent).toContain('Starts at');
  expect(idle.querySelector('footer')?.textContent).not.toContain('West wall');
  const selected = render(createElement(DuskPanel, { ...props, selected: 'samira' }));
  expect(selected.querySelector('footer')?.textContent).toContain('Post Samira at');
  expect(selected.querySelectorAll('.w-place')).toHaveLength(4);
  expect(selected.querySelector('.w-press[aria-pressed=true]')?.textContent).toBe('Urge');
  expect(selected.textContent).toContain('Choosing a post does not give a night off.');
  expect(selected.textContent).toContain('At night, select the watcher. Choose Rest');
  expect(selected.querySelectorAll('.game-help-button')).toHaveLength(0);
});
it('keeps lantern and bell in the night action bar and people in the sheet', () => {
  const night = render(createElement(NightPanel, { frame: { ...dusk, phase: 'night' }, actions }));
  expect(night.querySelectorAll('.w-lantern-track button')).toHaveLength(4);
  expect(night.querySelector('footer .w-bellbtn small')).not.toBeNull();
  expect(night.querySelector('.lk-sheet-body .w-night-roster')).not.toBeNull();
  expect(night.querySelector('.w-place')).toBeNull();
  expect(night.querySelector('.w-night-roster')?.previousElementSibling?.textContent).toContain(
    'You cannot assign an empty post directly at night.',
  );
});
it('keeps restart and export out of the menu and puts Resume last', () => {
  const menu = render(
    createElement(Chronicle, {
      frame: dusk,
      actions,
      seed: 42,
      shelf: [],
      saving: true,
      current: 'new',
      onClose: vi.fn(),
    }),
  );
  expect(menu.textContent).not.toContain('Begin a new village');
  expect(menu.textContent).not.toContain('Copy the playtest');
  const buttons = menu.querySelectorAll('button');
  expect(buttons[buttons.length - 1]?.textContent?.trim()).toBe('Resume');
  expect(menu.textContent).toContain('Feedback');
  expect(menu.querySelector('select')).toBeNull();
  expect(menu.textContent).not.toContain('Save this person for another chapter');
  expect(menu.textContent).not.toContain('Save this played person as an explicit fresh branch');
  expect(menu.textContent).not.toContain('Use fresh local play');
});
it('holds the clock for the single top-bar info and menu without simulation inputs', async () => {
  const { useWatch } = await import('./useWatch.ts');
  vi.mocked(useWatch).mockReturnValue({
    frame: { ...dusk, phase: 'night' },
    speed: 'watch',
    error: null,
    seed: 42,
    shelf: [],
    saving: true,
    current: 'new',
    actions,
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(() => root.render(createElement(App)));
  expect(container.querySelectorAll('.game-help-button')).toHaveLength(1);
  const notice = container.querySelector('footer.lab-notice');
  expect(notice?.parentElement?.classList.contains('watch')).toBe(true);
  expect(notice?.previousElementSibling?.tagName).toBe('MAIN');
  expect(container.querySelectorAll('.w-speed')).toHaveLength(3);
  const popover = container.querySelector('.w-info-content');
  await act(() => {
    const toggle = new Event('toggle');
    Object.defineProperty(toggle, 'newState', { value: 'open' });
    popover?.dispatchEvent(toggle);
  });
  expect(actions.hold).toHaveBeenLastCalledWith(true);
  await act(() => {
    const toggle = new Event('toggle');
    Object.defineProperty(toggle, 'newState', { value: 'closed' });
    popover?.dispatchEvent(toggle);
  });
  expect(actions.hold).toHaveBeenLastCalledWith(false);
  await act(() => container.querySelector<HTMLButtonElement>('.w-chronicle')?.click());
  expect(actions.hold).toHaveBeenLastCalledWith(true);
  await act(() => root.unmount());
  container.remove();
});
it('uses person chips and a sheet for the morning account', () => {
  applyInput(state, { k: 'begin' });
  // A small presentation fixture needs no running clock.
  const frame = {
    ...buildFrame(state, 0, false),
    phase: 'dawn' as const,
    dawn: {
      night: 1,
      grainBefore: 20,
      grainAfter: 20,
      crossed: false,
      voices: [],
      lines: [],
      scout: null,
      ropeSnapped: false,
    },
  };
  const dawnPage = render(createElement(DawnPanel, { frame, actions }));
  expect(dawnPage.querySelector('select')).toBeNull();
  expect(dawnPage.textContent).toContain("The night's account");
  expect(dawnPage.querySelector('[popover]')).toBeNull();
});

it('replaces an account with helper choice and restores it without a game input', async () => {
  const { WatchRun } = await import('../sim/run.ts');
  const run = new WatchRun(4242);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  const frame = buildFrame(run.state, 0, false);
  const who = frame.watchers.find((w) => w.id === 'tamar');
  if (!who) throw new Error('Expected Tamar');
  who.account = { text: 'I’m tired. I’m keeping watch.', spoken: true };
  who.restRead = 'They looked tired at dusk';
  for (const helper of frame.watchers) {
    if (helper.id === who.id) continue;
    helper.post = 'gate-2';
    helper.account = { text: 'I’m here.', spoken: true };
  }
  who.acts = [
    {
      input: { k: 'down', who: 'tamar' },
      label: 'Let Tamar go down to rest',
      read: 'likely; leaves the Gate empty',
      available: true,
    },
    {
      input: { k: 'relieve', who: 'tamar', by: 'kian' },
      label: 'Send Kian to relieve Tamar',
      read: 'likely; leaves the mill wall empty',
      available: true,
    },
    {
      input: { k: 'relieve', who: 'tamar', by: 'samira' },
      label: 'Send Samira to relieve Tamar',
      read: 'You are too far away to call Samira; carry the light.',
      available: false,
    },
  ];
  const input = vi.fn();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const props = { frame, actions: { ...actions, input }, selected: 'tamar' };
  await act(async () => root.render(createElement(NightPanel, props)));
  const button = (text: string) =>
    [...container.querySelectorAll('button')].find((b) => b.textContent === text);
  expect(container.querySelector('.w-night-commit .w-bellbtn')).not.toBeNull();
  expect(container.querySelector('.w-account blockquote')?.textContent).toContain('tired');
  expect(container.querySelector('.w-account')?.textContent).toContain('They looked tired at dusk');
  expect(button('Rest')?.closest('.lk-commit')).not.toBeNull();
  expect(button('Send Kian to relieve Tamar')).toBeUndefined();
  await act(async () => button('Send relief')?.click());
  expect(container.querySelector('.w-account')).toBeNull();
  expect(container.querySelector('.w-helper-choice')?.textContent).toContain('leaves the mill wall empty');
  expect(container.querySelector('.w-helper-choice')?.textContent).toContain(
    'Samira: They cannot hear you from here; carry the light.',
  );
  expect(button('Send Samira to relieve Tamar')).toBeUndefined();
  await act(async () => button(`← ${who.name}`)?.click());
  expect(container.querySelector('.w-account')).not.toBeNull();
  expect(input).not.toHaveBeenCalled();
  who.acts = [
    ...who.acts,
    {
      input: { k: 'help', who: 'tamar', by: 'kian' },
      label: 'Send Kian to help Tamar',
      read: 'likely',
      available: true,
    },
  ];
  await act(async () => root.render(createElement(NightPanel, props)));
  expect(button('Send help')).toBeDefined();
  who.acts = who.acts.filter((a) => a.input.k !== 'help');
  await act(async () => root.render(createElement(NightPanel, props)));
  await act(async () => button('Send help')?.click());
  expect(container.querySelector('.w-helper-choice')?.textContent).toContain(
    'There is no current sign of hurt or a wolf at this post.',
  );
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(container.querySelector('.w-account')).not.toBeNull();
  await act(async () => button('Send relief')?.click());
  who.acts = who.acts.filter((a) => a.input.k === 'down');
  const helper = frame.watchers.find((w) => w.id === 'kian');
  if (!helper) throw new Error('Expected Kian');
  helper.post = 'mill-1';
  helper.account = { text: 'The watcher appears asleep. No reply comes.', spoken: false };
  await act(async () => root.render(createElement(NightPanel, props)));
  expect(container.querySelector('.w-helper-choice')?.textContent).toContain(
    'The watcher appears asleep. No reply comes.',
  );
  await act(async () => button(`← ${who.name}`)?.click());
  await act(async () => button('Rest')?.click());
  expect(input).toHaveBeenCalledExactlyOnceWith({ k: 'down', who: 'tamar' });
  await act(async () => root.unmount());
  container.remove();
});

it('shows the explanation for no night acts in the account action row', () => {
  const run = newGame(4242);
  applyInput(run, { k: 'start' });
  applyInput(run, { k: 'begin' });
  const frame = buildFrame(run, 0, false);
  const who = frame.watchers.find((watcher) => watcher.id === 'tamar');
  if (!who) throw new Error('Expected Tamar');
  who.acts = [];
  who.actsUnavailable = 'No spoken request can wake them. The bell rouses sleepers who hear it.';
  const account = render(createElement(NightPanel, { frame, actions, selected: who.id }));
  expect(account.querySelector('.w-account-commit .w-account-unavailable')?.textContent).toBe(
    `No spoken request can wake ${who.name}. The bell rouses sleepers who hear it.`,
  );
  expect(account.textContent).toContain(`${who.name} chooses whether to agree to each request.`);
  expect(account.textContent).not.toMatch(/wake them|theirs to answer/);
  expect(who.actsUnavailable).toBe('No spoken request can wake them. The bell rouses sleepers who hear it.');
});

it('records a winter choice from the flyleaf and states when it takes effect', async () => {
  const { WinterSetting } = await import('./WinterSetting.tsx');
  const input = vi.fn();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(WinterSetting, {
        frame: { ...dusk, phase: 'night', winterSetting: { active: 'hard', next: 'milder' } },
        actions: { ...actions, input },
      }),
    ),
  );
  expect(container.textContent).toContain(
    'The winter that came: as the village knows it. New hopes are for the next dusk.',
  );
  expect(container.textContent).toContain('Tamar:');
  expect(container.textContent).toContain('Idris:');
  expect(container.textContent).toContain('Danyal:');
  expect(container.textContent).toContain('Samira:');
  expect(container.textContent).not.toContain('Milder winter');
  const radios = container.querySelectorAll<HTMLInputElement>('input');
  expect(radios[1]?.checked).toBe(true);
  await act(async () => radios[0]?.click());
  expect(input).toHaveBeenCalledExactlyOnceWith({ k: 'winter', winter: 'hard' });
  await act(async () => root.unmount());
  container.remove();
});

it('keeps a heard doze in the account and removes stale acts after relief while it stays open', async () => {
  const { WatchRun } = await import('../sim/run.ts');
  const run = new WatchRun(4242);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  const frame = buildFrame(run.state, 0, false);
  const who = frame.watchers.find((w) => w.id === 'tamar');
  if (!who) throw new Error('Expected Tamar');
  who.post = 'gate-1';
  who.acts = [
    {
      input: { k: 'down', who: 'tamar' },
      label: 'Let Tamar go down to rest',
      read: 'likely',
      available: true,
    },
    {
      input: { k: 'relieve', who: 'tamar', by: 'kian' },
      label: 'Send Kian to relieve Tamar',
      read: 'likely',
      available: true,
    },
  ];
  frame.alerts.push({
    minute: frame.minute,
    kind: 'person',
    who: 'tamar',
    section: 'gate',
    text: 'Tamar falls asleep at the Gate.',
    slowed: false,
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  const props = { frame, actions, selected: 'tamar' };
  await act(async () => root.render(createElement(NightPanel, props)));
  expect(container.querySelector('.w-account-doze')?.textContent).toContain(
    'Tamar falls asleep at the Gate.',
  );
  expect(container.querySelector('.w-account-doze')?.textContent).toContain('A reply is possible now.');
  const relief = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Send relief');
  await act(async () => relief?.click());
  who.post = null;
  who.acts = [];
  who.account = { text: 'Too far away for your voice to reach.', spoken: false };
  who.actsUnavailable = 'The watcher is off the wall. Night requests need someone at a post.';
  await act(async () => root.render(createElement(NightPanel, props)));
  expect(container.querySelector('.w-helper-choice')).toBeNull();
  expect(container.querySelector('.w-account')?.textContent).toContain('Too far away');
  expect(container.querySelector('.w-account-commit')?.textContent).not.toMatch(/Rest|Send relief/);
  expect(container.querySelector('.w-account-unavailable')?.textContent).toContain('off the wall');
  await act(async () => root.unmount());
});

it('names dusk and dawn once in the top bar', () => {
  expect(headerLine(dusk)).toBe('Dusk · night 1');
  expect(headerLine({ ...dusk, phase: 'dawn' })).toBe('Dawn · night 1');
});

it('keeps bell and lantern beside accounts and exposes handovers and recent messages', () => {
  const f = { ...dusk, phase: 'night' as const };
  const who = f.watchers[0];
  if (!who) throw new Error('missing watcher');
  const frame = {
    ...f,
    watchers: f.watchers.map((w) =>
      w === who
        ? {
            ...w,
            account: { text: 'Still watching.', spoken: true },
            handover: 'Kian has been called; waiting for an answer.',
          }
        : w,
    ),
    alerts: [
      {
        minute: f.minute,
        text: 'Kian declined: too tired.',
        kind: 'person' as const,
        who: 'kian',
        section: 'gate' as const,
        slowed: false,
      },
    ],
  };
  const page = render(createElement(NightPanel, { frame, actions, selected: who.id }));
  expect(page.querySelector('.w-lantern-track')).not.toBeNull();
  expect(page.querySelector('.w-bellbtn')).not.toBeNull();
  expect(page.querySelector('[role=status]')?.textContent).toContain('waiting for an answer');
  expect(page.querySelector('.w-night-messages li')?.textContent).toBe('Kian declined: too tired.');
});

it('requires an explicit season recovery choice and loads that existing local page', async () => {
  const load = vi.fn(async () => true);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(() =>
    root.render(
      createElement(Shelf, {
        current: 'other',
        onClose: vi.fn(),
        actions: { ...actions, load },
        shelf: [
          {
            id: 'owned:1:winter',
            chronicle: 'owned',
            kind: 'season',
            castRecovery: true,
            seed: 703,
            year: 1,
            when: 'winter',
            savedAt: 1,
          },
        ],
      }),
    ),
  );
  const button = (text: string) =>
    requireValue([...container.querySelectorAll('button')].find((b) => b.textContent === text));
  await act(() => button('Restore season-start backup').click());
  expect(load).not.toHaveBeenCalled();
  expect(container.textContent).toContain('No new cast claim is made');
  await act(async () => button('Restore this saved page').click());
  expect(load).toHaveBeenCalledExactlyOnceWith('owned:1:winter');
  await act(() => root.unmount());
  container.remove();
});

it('offers night off separately from posting only in the admitted village, with literal player wording', () => {
  const state = newGame(2026, undefined, { duskRest: 'dusk-rest@1' });
  applyInput(state, { k: 'start' });
  stepMinute(state);
  const frame = buildFrame(state, 0, false);
  const props = {
    frame,
    actions,
    selected: 'tamar' as const,
    setSelected: vi.fn(),
    press: 'ask' as const,
    setPress: vi.fn(),
    post: vi.fn(),
  };
  const el = render(createElement(DuskPanel, props));
  expect(el.textContent).toContain('Ask Tamar of the Wall to take tonight off');
  expect(el.textContent).toContain('until dawn');
  expect(el.textContent).toContain('Choosing a post does not give a night off');
  expect(el.textContent).not.toMatch(/dusk-rest@|scenario 15/);
  const title = render(
    createElement(GoalPage, { frame, actions, shelf: [], current: 'new', onNew: vi.fn() }),
  );
  expect(title.querySelector('input[type=checkbox]')).toBeNull();
  expect(title.textContent).not.toContain('Offer night-off requests');
});

it('explains stairs in saved volume endings and epilogues without changing saved prose', async () => {
  const { ClosedPage } = await import('./pages.tsx');
  const frame = structuredClone(dusk);
  frame.volume.end = 'Tamar is too old for the stair; Kian keeps the Gate.';
  frame.volume.epilogue = [{ name: 'Tamar', text: '“I counted the stars from the wall stair.”' }];
  const before = JSON.stringify(frame);
  const page = render(createElement(ClosedPage, { frame, actions }));
  expect(page.textContent).toContain('the stairs up to the wall');
  expect(page.textContent).not.toContain('the wall stair');
  expect(JSON.stringify(frame)).toBe(before);
});

it('file entry renders the ordinary chooser with no authored worker or native shelf access', async () => {
  vi.resetModules();
  window.history.replaceState(null, '', '/watch/?file=1');
  const post = vi.fn();
  vi.stubGlobal(
    'Worker',
    class {
      postMessage = post;
      addEventListener() {}
      removeEventListener() {}
      terminate() {}
    },
  );
  const { useWatch: useCurrent } = await vi.importActual<typeof import('./useWatch.ts')>('./useWatch.ts');
  let current: ReturnType<typeof useCurrent> | undefined;
  usePolicyWatch = useCurrent;
  const reads = vi.spyOn(Storage.prototype, 'getItem'),
    writes = vi.spyOn(Storage.prototype, 'setItem');
  const node = document.createElement('div'),
    root = createRoot(node);
  try {
    await act(() =>
      root.render(
        createElement(PolicyWatch, {
          capture: (value) => {
            current = value;
          },
        }),
      ),
    );
    expect(post.mock.calls.some(([message]) => message.type === 'fileSession')).toBe(true);
    expect(
      post.mock.calls.some(([message]) => ['init', 'load', 'shelf', 'save'].includes(message.type)),
    ).toBe(false);
    expect(() => requireValue(current).actions.restart(1)).toThrow(/file/i);
    expect(() => requireValue(current).actions.refreshShelf()).toThrow(/file/i);
    await expect(requireValue(current).actions.load('native:auto')).rejects.toThrow(/file/i);
    const mocked = await import('./useWatch.ts');
    const fileLoads = vi.fn();
    vi.mocked(mocked.useWatch).mockReturnValue({
      ...requireValue(current),
      actions: { ...requireValue(current).actions, loadFile: fileLoads, cancelFileLoad: vi.fn() },
    });
    const { App: FileApp } = await import('./App.tsx');
    await act(() => root.render(createElement(FileApp)));
    expect(node.textContent).toContain('This file stays in this tab.');
    expect(node.querySelector('input[type=file]')).not.toBeNull();
    expect(node.textContent).not.toContain('Lighting the lantern');
    expect(reads).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    const picker = requireValue(node.querySelector<HTMLInputElement>('input[type=file]'));
    let resolveOld: (bytes: ArrayBuffer) => void = () => {};
    const oldRead = new Promise<ArrayBuffer>((resolve) => {
      resolveOld = resolve;
    });
    const latest = '{"syntheticChooser":"latest"}';
    const select = (read: () => Promise<ArrayBuffer>) => {
      Object.defineProperty(picker, 'files', {
        configurable: true,
        value: [{ size: 100, arrayBuffer: read }],
      });
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    };
    flushSync(() => select(() => oldRead));
    flushSync(() => select(async () => new TextEncoder().encode(latest).buffer));
    await vi.waitFor(() => expect(fileLoads.mock.calls.map(([text]) => text)).toEqual([latest]));
    resolveOld(new Uint8Array([0xff]).buffer);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fileLoads.mock.calls.map(([text]) => text)).toEqual([latest]);
    expect(node.querySelector('[role=alert]')).toBeNull();
    let resolveCancelled: (bytes: ArrayBuffer) => void = () => {};
    const cancelled = new Promise<ArrayBuffer>((resolve) => {
      resolveCancelled = resolve;
    });
    flushSync(() => select(() => cancelled));
    flushSync(() => picker.dispatchEvent(new Event('cancel')));
    resolveCancelled(new TextEncoder().encode('{"syntheticChooser":"cancelled"}').buffer);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fileLoads.mock.calls.map(([text]) => text)).toEqual([latest]);
  } finally {
    await act(() => root.unmount());
    reads.mockRestore();
    writes.mockRestore();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  }
});

it('holds On to dusk beside the open visit choice and names every empty wall at dusk (F-1592, F-1594)', async () => {
  const base = buildFrame(state, 0, false);
  const visit = {
    version: 'watch-warren-ada/1' as const,
    guardian: 'kian' as const,
    dependent: 'ada' as const,
    sourceMinute: 0,
    returnBy: 1440,
    kianAssented: true,
    adaAssented: true,
    commitmentId: 'c1',
    returnCommitmentId: 'c2',
    status: 'agreed' as const,
  };
  const frame = {
    ...base,
    phase: 'dawn' as const,
    refugeVisit: visit,
    dawn: {
      night: 1,
      grainBefore: 20,
      grainAfter: 16,
      crossed: true,
      breached: ['east' as const],
      voices: [],
      lines: [],
      scout: null,
      ropeSnapped: false,
    },
  };
  const page = render(createElement(DawnPanel, { frame, actions }));
  const toDusk = [...page.querySelectorAll('button')].find((b) => b.textContent === 'On to dusk');
  expect(toDusk?.hasAttribute('disabled')).toBe(true);
  expect(page.textContent).toContain('On to dusk waits until you choose for Kian and Ada.');
  expect(page.textContent).toContain('Let them care for each other today');
  // Preparing a visit must capture the departure before Stay can clear it.
  let finishCapture: (saved: boolean) => void = () => {};
  const capture = new Promise<boolean>((resolve) => {
    finishCapture = resolve;
  });
  const select = vi.spyOn(castRuntime, 'selectCast').mockImplementation(() => {});
  const checkpoint = vi.spyOn(castRuntime, 'checkpointCast').mockReturnValue(capture);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(createElement(DawnPanel, { frame: { ...frame, refugeReady: true }, actions })),
  );
  expect(select).toHaveBeenCalledWith('watch', 'hf.cast.kian.watch');
  expect(checkpoint).toHaveBeenCalledOnce();
  const stay = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'Stay here together',
  );
  expect(stay?.disabled).toBe(true);
  await act(async () => finishCapture(true));
  expect(stay?.disabled).toBe(false);
  expect(host.textContent).toContain('Kian and Ada’s visit is saved for another game.');
  await act(async () => root.unmount());
  host.remove();
  select.mockRestore();
  checkpoint.mockRestore();
  expect([...page.querySelectorAll('.w-choice-pair button')].map((b) => b.textContent)).toContain(
    'Stay here together',
  );
  expect(page.textContent).not.toMatch(/quiet action boundary|snapshot/i);
  expect(page.textContent).toContain('Raiders got over the east wall during the night.');
  // Control: with no open visit, On to dusk is live and nothing waits.
  const free = render(createElement(DawnPanel, { frame: { ...frame, refugeVisit: undefined }, actions }));
  const live = [...free.querySelectorAll('button')].find((b) => b.textContent === 'On to dusk');
  expect(live?.hasAttribute('disabled')).toBe(false);
  expect(free.textContent).not.toContain('waits until you choose');

  // Everyone at the Gate, tracks at the east wall: the warned wall and both other walls are named, once.
  const gated = {
    ...base,
    warned: 'east' as const,
    watchers: base.watchers.map((w) => ({ ...w, posted: 'gate-1' as const })),
  };
  const duskProps = {
    actions,
    selected: null,
    setSelected: vi.fn(),
    press: 'ask' as const,
    setPress: vi.fn(),
    post: vi.fn(),
  };
  const duskPage = render(createElement(DuskPanel, { ...duskProps, frame: gated }));
  expect(duskPage.textContent).toContain(
    'Nobody is posted on the east wall, where the scout warned of trouble, or on the west wall and the mill wall. Raids can come where the scout did not look',
  );
  // Control: every open wall held (the Gate left out of this fixture), no warning.
  const held = render(
    createElement(DuskPanel, {
      ...duskProps,
      frame: {
        ...gated,
        sections: gated.sections.filter((x) => x.id !== 'gate'),
        watchers: gated.watchers.map((w, i) => ({
          ...w,
          posted: (['west-1', 'mill-1', 'east-1'] as const)[i % 3] ?? 'east-1',
        })),
      },
    }),
  );
  expect(gated.watchers.length).toBeGreaterThanOrEqual(3);
  expect(held.textContent).not.toContain('Nobody is posted');
});

it('drops the bell from an open night moment once the rope has snapped (F-1596)', () => {
  const moment = {
    id: 9,
    kind: 'waver' as const,
    who: 'kian',
    section: 'gate' as const,
    opened: 0,
    until: 120,
    text: 'Kian looks back at the steps.',
    options: [
      { id: 'let', label: 'Let Kian go' },
      { id: 'bell', label: 'Ring and call Kian by name' },
    ],
  };
  const at = (snapped: boolean) =>
    render(
      createElement(NightPanel, {
        frame: { ...dusk, phase: 'night', moment, rope: { wear: snapped ? 1 : 0.2, snapped } },
        actions,
      }),
    ).textContent ?? '';
  expect(at(true)).not.toContain('Ring and call Kian by name');
  expect(at(true)).toContain('The rope is broken tonight');
  // Control: a sound rope keeps the choice.
  expect(at(false)).toContain('Ring and call Kian by name');
});

it('keeps two morning questions with the selected person after a worker frame arrives', async () => {
  const s = newGame(1);
  applyInput(s, { k: 'start' });
  applyInput(s, { k: 'begin' });
  while (s.phase === 'night') stepMinute(s);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const received: string[] = [];
  const active = {
    ...actions,
    input: (input: Parameters<WatchActions['input']>[0]) => {
      if (input.k === 'talk') received.push(input.who);
      applyInput(s, input);
      root.render(createElement(DawnPanel, { frame: buildFrame(s, 0, false), actions: active }));
    },
  } as WatchActions;
  const click = async (text: string) =>
    act(() => {
      const button = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
      if (!button) throw new Error(`Missing ${text}`);
      button.click();
    });
  await act(() => root.render(createElement(DawnPanel, { frame: buildFrame(s, 0, false), actions: active })));
  await click('Kian');
  await click('Ask Kian: Tell me about last night');
  const followup = [...container.querySelectorAll<HTMLButtonElement>('.w-ask-btns button')][0];
  expect(followup?.textContent).toMatch(/^Ask Kian:/);
  await act(() => followup?.click());
  expect(received).toEqual(['kian', 'kian']);
  expect(s.talks.left).toBe(0);
  await act(() => root.unmount());
  container.remove();
});

it('starts a normal new village with both public requests available', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const onNew = vi.fn();
  await act(() =>
    root.render(createElement(GoalPage, { frame: dusk, actions, shelf: [], current: 'new', onNew })),
  );
  expect(container.querySelector('input[type=checkbox]')).toBeNull();
  const begin = [...container.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Go up to the wall'),
  );
  expect(begin).toBeDefined();
  await act(() => begin?.click());
  expect(onNew).toHaveBeenCalledWith({ duskRest: 'dusk-rest@1', localWarning: 'local-warning@1' });
  await act(() => root.unmount());
});
