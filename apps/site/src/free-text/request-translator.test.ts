// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { RequestTranslator } from './RequestTranslator.tsx';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const c of cleanups.splice(0)) c();
  vi.unstubAllGlobals();
  localStorage.clear();
});
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
function mount() {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  const confirmed: unknown[] = [];
  let scene = 'scene1';
  const render = () =>
    flushSync(() =>
      root.render(
        createElement(RequestTranslator, {
          acts: [{ id: 'rest', label: 'rest at home' }],
          scene,
          onHold: () => {},
          onConfirm: (d) => confirmed.push(d),
        }),
      ),
    );
  render();
  cleanups.push(() => {
    flushSync(() => root.unmount());
    el.remove();
  });
  return {
    el,
    confirmed,
    change: () => {
      scene = 'scene2';
      render();
    },
  };
}
function request(el: Element) {
  const text = el.querySelector('textarea');
  if (!text) throw Error('Missing input');
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (!set) throw Error('Missing input setter');
  flushSync(() => {
    set.call(text, 'rest');
    text.dispatchEvent(new Event('input', { bubbles: true }));
    text.dispatchEvent(new Event('change', { bubbles: true }));
  });
  flushSync(() =>
    [...el.querySelectorAll('button')].find((b) => b.textContent === 'Find a suggestion')?.click(),
  );
}
const response = () =>
  Response.json({
    candidate: { optionId: 'rest', target: 'Halil', timing: 'now', strength: 'mention', insist: false },
  });
test('inference cannot submit; only explicit confirmation supplies a canonical draft', async () => {
  vi.stubGlobal('fetch', async () => response());
  const { el, confirmed } = mount();
  request(el);
  await settle();
  expect(confirmed).toEqual([]);
  const confirm = [...el.querySelectorAll('button')].find((b) => b.textContent === 'Confirm this suggestion');
  expect(confirm).toBeDefined();
  flushSync(() => confirm?.click());
  expect(confirmed).toEqual([{ optionId: 'rest', strength: 'mention', insist: false }]);
});
test('late inference from a changed scene cannot offer confirmation', async () => {
  let finish!: (r: Response) => void;
  vi.stubGlobal(
    'fetch',
    () =>
      new Promise<Response>((r) => {
        finish = r;
      }),
  );
  const { el, confirmed, change } = mount();
  request(el);
  change();
  finish(response());
  await settle();
  expect(el.textContent).toContain('scene changed');
  expect(el.textContent).not.toContain('Confirm this suggestion');
  expect(confirmed).toEqual([]);
});
