import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { Premise } from './Premise.tsx';
import { MenuPanel } from './ShellPanels.tsx';
import type { VoiceActions } from './useVoice.ts';

vi.mock('../../shared/CastMenu.tsx', () => ({ CastMenu: () => createElement('p', null, 'cast tools') }));
vi.mock('./persona.tsx', () => ({ VoicePersonaControls: () => createElement('p', null, 'persona tools') }));
vi.mock('./SendWord.tsx', () => ({ RecordingPreference: () => createElement('label', null, 'Recording') }));
const cleanups: (() => void)[] = [];
function mount(node: React.ReactNode) {
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
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  history.replaceState(null, '', '/');
});
it('keeps diagnostic concepts behind exact lab=1 and confirms a new game inline', () => {
  const onTitle = vi.fn();
  const render = () =>
    createElement(MenuPanel, {
      freeText: false,
      onFreeText: vi.fn(),
      label: 'Halil',
      pace: 'automatic',
      actions: {} as VoiceActions,
      onClose: vi.fn(),
      onTitle,
      onSendWord: vi.fn(),
      canReturn: true,
    });
  history.replaceState(null, '', '/?lab=0');
  const ordinary = mount(render());
  expect(ordinary.textContent).not.toMatch(/cast tools|persona tools|Experimental|How the day passes/);
  expect(ordinary.textContent).toContain('Feedback');
  const next = [...ordinary.querySelectorAll('button')].find((b) => b.textContent === 'New game');
  flushSync(() => next?.click());
  expect(onTitle).not.toHaveBeenCalled();
  expect(next?.textContent).toContain('Replace');
  flushSync(() => next?.click());
  expect(onTitle).toHaveBeenCalledOnce();
  history.replaceState(null, '', '/?lab=1');
  const lab = mount(render());
  expect(lab.textContent).toMatch(/cast tools/);
  expect(lab.textContent).toMatch(/Experimental/);
});
it('hides title import and seed paths in ordinary play', () => {
  const ordinary = mount(createElement(Premise, { ready: true, onBegin: vi.fn(), onOtherWays: vi.fn() }));
  expect(ordinary.textContent).not.toContain('Lab tools');
  history.replaceState(null, '', '/?lab=1');
  const lab = mount(createElement(Premise, { ready: true, onBegin: vi.fn(), onOtherWays: vi.fn() }));
  expect(lab.textContent).toContain('Lab tools');
});

it('omits file-mode restart and Other ways controls while retaining full reports, real continuation and native callbacks', async () => {
  history.replaceState(null, '', '/?lab=1');
  const { Report } = await import('./Report.tsx');
  const { sampleReport } = await import('../sim/fixtures.ts');
  const { EndScreen } = await import('../../colony/ui/EndScreen.tsx');
  const { ColonyGame } = await import('../../colony/sim/game.ts');
  const { createFrameworkHumanSide } = await import('../../colony/sim/human.ts');
  const game = new ColonyGame(20261003, createFrameworkHumanSide);
  const summary = game.summary();
  const restart = vi.fn(),
    other = vi.fn(),
    continuation = vi.fn(),
    download = vi.fn();
  const nativePremise = mount(
    createElement(Premise, { ready: true, onBegin: continuation, onOtherWays: other }),
  );
  const filePremise = mount(createElement(Premise, { ready: true, onBegin: continuation }));
  expect(filePremise.textContent).toContain('Halil is a widower.');
  expect(filePremise.textContent).not.toContain('Lab tools');
  nativePremise.querySelector<HTMLButtonElement>('.v-shelf-row')?.click();
  expect(other).toHaveBeenCalledOnce();
  const nativeReport = mount(
    createElement(Report, {
      view: sampleReport,
      onKeepListening: continuation,
      onReplay: restart,
      onNewTown: restart,
      onDownload: download,
    }),
  );
  const fileReport = mount(
    createElement(Report, { view: sampleReport, onKeepListening: continuation, onDownload: download }),
  );
  expect(fileReport.textContent).toContain('Without you');
  expect(fileReport.textContent).not.toMatch(/The same town again|New game/);
  for (const text of ['New game', 'The same town again'])
    [...nativeReport.querySelectorAll('button')].find((button) => button.textContent === text)?.click();
  expect(restart).toHaveBeenCalledTimes(2);
  [...fileReport.querySelectorAll('button')]
    .find((button) => button.textContent === 'Keep listening')
    ?.click();
  const nativeEnd = mount(
    createElement(EndScreen, {
      summaries: { 2: summary },
      humanKind: 'Human',
      canContinue: false,
      onContinue: continuation,
      onAgain: restart,
      onClose: vi.fn(),
    }),
  );
  const fileEnd = mount(
    createElement(EndScreen, {
      summaries: { 2: summary },
      humanKind: 'Human',
      canContinue: true,
      onContinue: continuation,
      onClose: vi.fn(),
      onDownload: download,
    }),
  );
  expect(fileEnd.textContent).toContain('Both villages received the same orders');
  expect(fileEnd.textContent).not.toContain('Play again');
  [...nativeEnd.querySelectorAll('button')].find((button) => button.textContent === 'Play again')?.click();
  expect(restart).toHaveBeenCalledTimes(3);
  [...fileEnd.querySelectorAll('button')].find((button) => button.textContent === 'Another day')?.click();
  expect(continuation).toHaveBeenCalledTimes(2);
  [...fileReport.querySelectorAll('button')]
    .find((button) => button.textContent === 'Download this run')
    ?.click();
  [...fileEnd.querySelectorAll('button')]
    .find((button) => button.textContent === 'Download this run')
    ?.click();
  expect(download).toHaveBeenCalledTimes(2);
});

it('actual file return handlers revoke delayed file reads before returning to the current run', async () => {
  const { readGameFile } = await vi.importActual<typeof import('../../shared/cast-runtime.ts')>(
    '../../shared/cast-runtime.ts',
  );
  for (const game of ['colony', 'voice', 'watch']) {
    const source = readFileSync(resolve(process.cwd(), 'apps/site/src', game, 'ui/App.tsx'), 'utf8');
    const callbacks = [
      ...source.matchAll(
        / {2}const (?:cancelFileSelection|closeFileMenu) = useCallback\([\s\S]*?\n {2}}, \[[^\n]*\]\);/g,
      ),
    ]
      .map(([code]) => code)
      .join('\n');
    const change = source.match(
      /onChange=\{(\(event\) => \{[\s\S]*?event.target.value = '';\n {10}})\}/,
    )?.[1];
    const resume = source.match(/onClick=\{([^{}\n]+)\}>\s*Resume/)?.[1];
    if (!change || !resume) throw Error(`Missing actual ${game} handlers`);
    const fileRead = { current: 0 },
      cancel = vi.fn(),
      install = vi.fn(),
      status = vi.fn();
    const make = new Function(
      'fileSession',
      'fileRead',
      'actions',
      'setMenu',
      'setMenuOpen',
      'setShelf',
      'setFileError',
      'readGameFile',
      'useCallback',
      `${callbacks}; return { change: ${change}, resume: ${resume} };`,
    );
    const handlers = make(
      true,
      fileRead,
      { cancelFileLoad: cancel, loadPlaytest: install, loadFile: install },
      () => {},
      () => {},
      () => {},
      status,
      readGameFile,
      (fn: () => void) => fn,
    ) as { change(event: unknown): void; resume(): void };
    for (const bytes of [
      new TextEncoder().encode('{"replacement":"B"}').buffer,
      new Uint8Array([255]).buffer,
    ]) {
      let finish!: (value: ArrayBuffer) => void;
      const reading = new Promise<ArrayBuffer>((resolve) => {
        finish = resolve;
      });
      handlers.change({ target: { files: [{ size: 100, arrayBuffer: () => reading }], value: '' } });
      const cancellations = cancel.mock.calls.length;
      handlers.resume();
      expect(cancel).toHaveBeenCalledTimes(cancellations + 1);
      status.mockClear();
      finish(bytes);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(install).not.toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    }
    // Default native Resume changes UI only and never cancels a native run.
    const native = make(
      false,
      fileRead,
      { cancelFileLoad: cancel },
      () => {},
      () => {},
      () => {},
      status,
      readGameFile,
      (fn: () => void) => fn,
    ) as { resume(): void };
    cancel.mockClear();
    native.resume();
    expect(cancel).not.toHaveBeenCalled();
  }
});
