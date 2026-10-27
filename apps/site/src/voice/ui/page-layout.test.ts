// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { sampleBetweenSkip, sampleReport } from '../sim/fixtures.ts';
import { Between } from './Between.tsx';
import { Report } from './Report.tsx';

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
});

it('puts the silent comparison second and keeps report actions outside its scrolling body', () => {
  const onSendWord = vi.fn();
  const el = mount(
    createElement(Report, {
      view: {
        ...sampleReport,
        silent: { intro: '', rows: [], same: 'The same month.', smaller: '', caption: '' },
      },
      tally: true,
      onKeepListening: vi.fn(),
      onReplay: vi.fn(),
      onNewTown: vi.fn(),
      onDownload: vi.fn(),
      onSendWord,
    }),
  );
  expect(
    [...el.querySelectorAll('.v-page-body > section')]
      .slice(0, 2)
      .map((section) => section.querySelector('h2')?.textContent),
  ).toEqual(['Eid, without you', 'A month without your suggestions']);
  expect(el.querySelector<HTMLDetailsElement>('.end-tally')?.open).toBe(false);
  expect(el.querySelector('.end-tally summary')?.textContent).toBe('See the tally');
  expect(el.querySelector('.v-page-actions details')?.hasAttribute('open')).toBe(false);
  const actions = el.querySelector('.v-page-actions');
  expect(actions?.closest('.v-page-body')).toBeNull();
  expect(
    [...(actions?.querySelectorAll('button') ?? [])]
      .filter((button) => !button.closest('details'))
      .map((button) => button.textContent),
  ).toEqual(['Feedback', 'New game', 'Keep listening']);
  flushSync(() => actions?.querySelector<HTMLButtonElement>('button')?.click());
  expect(onSendWord).toHaveBeenCalledOnce();
});

it('puts skipped-day words before the recap and sends their chosen reason from chips', () => {
  const onAdvance = vi.fn();
  const el = mount(createElement(Between, { view: sampleBetweenSkip, onAdvance }));
  const pick = el.querySelector<HTMLButtonElement>('.v-whisper-pick');
  flushSync(() => pick?.click());
  expect(el.querySelector('select')).toBeNull();
  const chips = el.querySelectorAll<HTMLButtonElement>('.v-whisper-reasons button');
  expect(chips[0]?.textContent).toBe('No reason');
  flushSync(() => chips[1]?.click());
  const primary = el.querySelector<HTMLButtonElement>('.v-page-actions .v-btn-primary');
  expect(primary?.closest('.v-page-body')).toBeNull();
  expect(el.querySelector<HTMLDetailsElement>('.v-between-recap')?.open).toBe(false);
  flushSync(() => primary?.click());
  expect(onAdvance).toHaveBeenCalledWith([expect.objectContaining({ appeal: 'duty' })]);
});
