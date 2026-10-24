// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { applyInput, newGame } from '../sim/night.ts';
import { buildFrame } from '../sim/view.ts';
import type { WatchActions } from './useWatch.ts';

vi.mock('../../shared/lab.tsx', () => ({
  gameLabs: { watch: { telemetryOn: true, screen: vi.fn(), milestone: vi.fn() } },
}));
vi.mock('./useWatch.ts', () => ({ useWatch: vi.fn() }));
vi.mock('./MapCanvas.tsx', () => ({ MapCanvas: () => null }));
const { App, DuskPanel, NightPanel, DawnPanel, headerLine } = await import('./App.tsx');
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
  expect(selected.querySelectorAll('.game-help-button')).toHaveLength(0);
});
it('keeps lantern and bell in the night action bar and people in the sheet', () => {
  const night = render(createElement(NightPanel, { frame: { ...dusk, phase: 'night' }, actions }));
  expect(night.querySelectorAll('.w-lantern-track button')).toHaveLength(4);
  expect(night.querySelector('footer .w-bellbtn small')).not.toBeNull();
  expect(night.querySelector('.lk-sheet-body .w-night-roster')).not.toBeNull();
  expect(night.querySelector('.w-place')).toBeNull();
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
  who.restRead = 'seemed tiring at dusk';
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
      read: 'Too far to call Samira; carry the light.',
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
  expect(container.querySelector('.w-account')?.textContent).toContain('seemed tiring at dusk');
  expect(button('Rest')?.closest('.lk-commit')).not.toBeNull();
  expect(button('Send Kian to relieve Tamar')).toBeUndefined();
  await act(async () => button('Send relief')?.click());
  expect(container.querySelector('.w-account')).toBeNull();
  expect(container.querySelector('.w-helper-choice')?.textContent).toContain('leaves the mill wall empty');
  expect(container.querySelector('.w-helper-choice')?.textContent).toContain(
    'Samira: Out of your voice; carry the light.',
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
    'No current sign of hurt or a wolf at this post.',
  );
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(container.querySelector('.w-account')).not.toBeNull();
  await act(async () => button('Send relief')?.click());
  who.acts = who.acts.filter((a) => a.input.k === 'down');
  const helper = frame.watchers.find((w) => w.id === 'kian');
  if (!helper) throw new Error('Expected Kian');
  helper.post = 'mill-1';
  helper.account = { text: 'They appear asleep. No reply comes.', spoken: false };
  await act(async () => root.render(createElement(NightPanel, props)));
  expect(container.querySelector('.w-helper-choice')?.textContent).toContain(
    'They appear asleep. No reply comes.',
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
    who.actsUnavailable,
  );
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
    text: 'Tamar nods off at the Gate.',
    slowed: false,
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  const props = { frame, actions, selected: 'tamar' };
  await act(async () => root.render(createElement(NightPanel, props)));
  expect(container.querySelector('.w-account-doze')?.textContent).toContain('Tamar nods off at the Gate.');
  expect(container.querySelector('.w-account-doze')?.textContent).toContain('They can answer now.');
  const relief = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Send relief');
  await act(async () => relief?.click());
  who.post = null;
  who.acts = [];
  who.account = { text: 'Too far away for your voice to reach.', spoken: false };
  who.actsUnavailable = 'They are off the wall. Night requests need someone at a post.';
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
    [...container.querySelectorAll('button')].find((b) => b.textContent === text)!;
  await act(() => button('Restore season-start backup').click());
  expect(load).not.toHaveBeenCalled();
  expect(container.textContent).toContain('No new cast claim is made');
  await act(async () => button('Restore this saved page').click());
  expect(load).toHaveBeenCalledExactlyOnceWith('owned:1:winter');
  await act(() => root.unmount());
  container.remove();
});
