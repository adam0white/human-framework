// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { phoneStage } from '../src/stage.ts';

function fixture() {
  document.body.innerHTML = `<button id="open">Order</button><main class="lk-stage"><header class="lk-strip"><button data-lk-strip-toggle aria-expanded="false" aria-controls="state">State</button><div class="lk-chips"><span>Roof 7 of 10</span></div><div class="lk-strip-detail" id="state">The roof needs three more beams.</div></header><div class="lk-scene"></div><section class="lk-sheet" aria-label="Order"><header class="lk-sheet-head"><button class="lk-sheet-handle" aria-label="Drag sheet">Resize</button><button data-lk-snap="peek">Peek</button><button data-lk-snap="half">Half</button><button data-lk-snap="full">Full</button><button data-lk-back>Back</button><button data-lk-close>Close</button></header><div class="lk-sheet-body"><button id="nested">Choose a place</button></div><footer class="lk-commit"><button>Confirm</button></footer></section></main>`;
  return document.querySelector<HTMLElement>('main') as HTMLElement;
}
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  document.body.innerHTML = '';
});

describe('phone stage', () => {
  it('keeps game DOM and restores the sheet origin and opening focus', () => {
    const root = fixture();
    const panel = root.querySelector<HTMLElement>('.lk-sheet') as HTMLElement;
    const opener = document.querySelector<HTMLButtonElement>('#open') as HTMLButtonElement;
    const nested = document.querySelector<HTMLButtonElement>('#nested') as HTMLButtonElement;
    const changes = vi.fn();
    const stage = phoneStage(root, { onChange: changes });
    expect(panel.hidden).toBe(true);
    opener.focus();
    stage.open({ id: 'order', height: 'half' });
    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(panel);
    expect(root.dataset.sheet).toBe('half');
    stage.open({ id: 'places', opener: nested });
    expect(root.dataset.sheetId).toBe('places');
    expect(root.dataset.sheetBack).toBe('true');
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.dataset.sheetId).toBe('order');
    expect(document.activeElement).toBe(nested);
    stage.close();
    expect(document.activeElement).toBe(opener);
    expect(root.querySelector('.lk-sheet')).toBe(panel);
    expect(changes).toHaveBeenLastCalledWith(null, false);
    stage.destroy();
  });
  it('supports labelled snap buttons, expanded state and browser back', () => {
    const root = fixture();
    const stage = phoneStage(root);
    stage.open({ id: 'order' });
    root.querySelector<HTMLButtonElement>('[data-lk-snap="full"]')?.click();
    expect(root.dataset.sheet).toBe('full');
    expect(root.querySelector('[data-lk-snap="full"]')?.getAttribute('aria-pressed')).toBe('true');
    root.querySelector<HTMLButtonElement>('[data-lk-strip-toggle]')?.click();
    expect(root.querySelector('.lk-strip')?.getAttribute('data-expanded')).toBe('true');
    expect(root.querySelector('[data-lk-strip-toggle]')?.getAttribute('aria-expanded')).toBe('true');
    stage.open({ id: 'nested' });
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(root.dataset.sheetId).toBe('order');
    stage.destroy();
    root.querySelector<HTMLButtonElement>('[data-lk-close]')?.click();
    expect(root.dataset.sheetId).toBe('order');
  });
  it('leaves React state intact in observe-only mode and emits snap requests', () => {
    const root = fixture();
    root.dataset.sheet = 'half';
    root.dataset.sheetId = 'order';
    const onChange = vi.fn();
    const stage = phoneStage(root, { observeOnly: true, onChange });
    expect(root.dataset.sheet).toBe('half');
    root.querySelector<HTMLButtonElement>('[data-lk-snap="full"]')?.click();
    expect(onChange).toHaveBeenLastCalledWith({ id: 'order', height: 'full' }, false);
    expect(root.dataset.sheet).toBe('half');
    stage.destroy();
  });
  it('preserves prior history state and removes its entry on close', () => {
    const root = fixture();
    window.history.replaceState({ route: 'village' }, '');
    const stage = phoneStage(root);
    stage.open({ id: 'order' });
    expect(window.history.state.route).toBe('village');
    expect(window.history.state.__labKitStage).toBeTruthy();
    stage.close();
    expect(window.history.state).toEqual({ route: 'village' });
    stage.destroy();
  });
  it('schedules only one asynchronous history removal across repeated close and destroy', async () => {
    const root = fixture();
    const stage = phoneStage(root);
    stage.open({ id: 'order' });
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    stage.close();
    stage.close();
    stage.destroy();
    expect(back).toHaveBeenCalledTimes(1);
    window.history.replaceState(null, '');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    back.mockRestore();
  });
  it('rearms a replacement controller after the prior asynchronous cleanup traversal', async () => {
    const root = fixture();
    const first = phoneStage(root);
    first.open({ id: 'order' });
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    first.destroy();
    const push = vi.spyOn(window.history, 'pushState');
    const second = phoneStage(root);
    second.open({ id: 'order' });
    expect(push).not.toHaveBeenCalled();
    window.history.replaceState({ route: 'scene' }, '');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.dataset.sheetId).toBe('order');
    expect(push).toHaveBeenCalledTimes(1);
    expect(window.history.state.route).toBe('scene');
    second.destroy();
    window.history.replaceState(null, '');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    push.mockRestore();
    back.mockRestore();
  });
  it('restores recreated nested openers by stable id or explicit selector', () => {
    for (const useSelector of [false, true]) {
      const root = fixture();
      const stage = phoneStage(root, {
        history: false,
        onChange(sheet) {
          const body = root.querySelector('.lk-sheet-body') as HTMLElement;
          body.innerHTML =
            sheet?.id === 'order'
              ? '<button id="choose-place" data-place-opener>Choose a place</button>'
              : '<button>Choose</button>';
        },
      });
      stage.open({ id: 'order' });
      const opener = root.querySelector<HTMLElement>('[data-place-opener]') as HTMLElement;
      if (useSelector) opener.removeAttribute('id');
      stage.open({ id: 'places', opener, ...(useSelector ? { openerSelector: '[data-place-opener]' } : {}) });
      stage.back();
      expect(opener.isConnected).toBe(false);
      expect(document.activeElement).toBe(root.querySelector('[data-place-opener]'));
      stage.destroy();
    }
  });
  it('publishes actual scene bounds and responds to viewport changes', () => {
    const root = fixture();
    const scene = root.querySelector<HTMLElement>('.lk-scene') as HTMLElement;
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 80, 360, 300));
    const onSceneRect = vi.fn();
    const stage = phoneStage(root, { onSceneRect });
    expect(onSceneRect).toHaveBeenLastCalledWith({ x: 0, y: 80, width: 360, height: 300 });
    expect(root.style.getPropertyValue('--lk-scene-height')).toBe('300px');
    window.dispatchEvent(new Event('resize'));
    expect(onSceneRect).toHaveBeenCalledTimes(2);
    stage.destroy();
  });
  it('subtracts a stage topbar from the keyboard viewport height', () => {
    const root = fixture();
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 60, 360, 630));
    const original = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { height: 350, offsetTop: 0, addEventListener() {}, removeEventListener() {} },
    });
    const stage = phoneStage(root);
    expect(root.style.getPropertyValue('--lk-viewport-height')).toBe('350px');
    expect(root.style.getPropertyValue('--lk-available-height')).toBe('290px');
    expect(root.dataset.lkKeyboard).toBe('true');
    stage.destroy();
    if (original) Object.defineProperty(window, 'visualViewport', original);
    else Reflect.deleteProperty(window, 'visualViewport');
  });
  it('snaps a handle gesture without requiring dragging for any height', () => {
    const root = fixture();
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 690));
    const panel = root.querySelector<HTMLElement>('.lk-sheet') as HTMLElement;
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 400, 360, 290));
    const stage = phoneStage(root);
    stage.open({ id: 'order', height: 'half' });
    const handle = root.querySelector<HTMLElement>('.lk-sheet-handle');
    handle?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientY: 400 }));
    handle?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientY: 100 }));
    expect(root.dataset.sheet).toBe('full');
    stage.destroy();
  });
  it('recovers focus after an asynchronous renderer recreates the opener', async () => {
    const root = fixture();
    const panel = root.querySelector<HTMLElement>('.lk-sheet-body');
    if (!panel) throw new Error('Missing sheet body');
    const controller = phoneStage(root, {
      history: false,
      onChange(sheet) {
        if (sheet?.id === 'order')
          setTimeout(() => {
            panel.innerHTML = '<button id="recreated">Place</button>';
          }, 0);
        else if (sheet?.id === 'places') panel.innerHTML = 'Choose a destination';
      },
    });
    controller.open({ id: 'order' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const opener = root.querySelector<HTMLElement>('#recreated');
    if (!opener) throw new Error('Missing recreated opener');
    controller.open({ id: 'places', opener });
    controller.back();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(document.activeElement?.id).toBe('recreated');
    controller.destroy();
  });
  it('ships additive CSS for attribute-only consumers with wrap and dock rules', () => {
    const css = readFileSync('packages/lab-kit/stage.css', 'utf8');
    for (const name of [
      'lk-stage',
      'lk-strip',
      'lk-scene',
      'lk-sheet',
      'lk-commit',
      'lk-chips',
      'lk-sheet-body',
    ])
      expect(css).toContain(`.${name}`);
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('min-width: 900px');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('.lk-sheet[hidden]');
    expect(css).toContain('data-sheet="half"');
  });
});
