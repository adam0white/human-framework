// @vitest-environment happy-dom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { PlaceId } from '../sim/map.ts';
import { mapPoint, mapView } from './map-view.ts';
import { Pane, type PaneProps } from './Pane.tsx';
import { drawScene } from './renderer.ts';
import type { FrameStore } from './useColony.ts';

// Exercise the real camera, hit testing and pointer handlers without painting pixels.
vi.mock('./renderer.ts', async (original) => ({
  ...(await original<typeof import('./renderer.ts')>()),
  drawScene: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const roots: ReturnType<typeof createRoot>[] = [];
let nextFrame = 0;
let animationFrames = new Map<number, FrameRequestCallback>();
let resizeMap: (() => void) | undefined;
let mapHeight = 380;
let mapWidth = 360;

beforeEach(() => {
  animationFrames = new Map();
  mapHeight = 380;
  mapWidth = 360;
  vi.mocked(drawScene).mockReset();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    animationFrames.set(++nextFrame, cb);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => animationFrames.delete(id));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resizeMap = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: mapWidth,
    bottom: mapHeight,
    width: mapWidth,
    height: mapHeight,
    toJSON() {
      return {};
    },
  }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    setTransform: vi.fn(),
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
});

afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Missing test element or frame');
  return value;
}

function lastTransform(canvas: HTMLCanvasElement): number[] {
  return required(
    vi.mocked(required(canvas.getContext('2d')).setTransform).mock.calls.at(-1),
  ) as unknown as number[];
}

async function draw() {
  const callbacks = [...animationFrames.values()];
  animationFrames.clear();
  await act(() => {
    for (const callback of callbacks) callback(1000);
  });
}

async function setup(initial: Partial<PaneProps> = {}) {
  const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
  const first = frame.human[0];
  if (!first) throw new Error('Missing initial worker');
  const worker = { ...first, id: 'yusuf' as const, x: 9.5, y: 7 };
  const store: { current: FrameStore } = {
    current: { curr: { ...frame, human: [worker] }, prev: null, at: 0, interval: 62 },
  };
  const onSelect = vi.fn();
  const onPlace = vi.fn();
  const onHover = vi.fn();
  let settings = initial;
  function Harness() {
    const [hoverPlace, setHoverPlace] = useState<PlaceId | null>(null);
    return createElement(Pane, {
      side: 'human',
      store,
      selectedId: 'yusuf',
      destination: null,
      hoverPlace,
      ...settings,
      onSelect,
      onPlace,
      onHoverPlace: (place) => {
        onHover(place);
        setHoverPlace(place);
      },
    });
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(() => root.render(createElement(Harness)));
  await draw();
  const canvas = container.querySelector('canvas');
  if (!canvas) throw new Error('Missing map canvas');
  canvas.setPointerCapture = vi.fn();
  return {
    canvas,
    container,
    store,
    onSelect,
    onPlace,
    onHover,
    async update(next: Partial<PaneProps>) {
      settings = { ...settings, ...next };
      await act(() => root.render(createElement(Harness)));
    },
  };
}

async function pointer(canvas: HTMLCanvasElement, type: string, x: number, y: number, buttons = 0) {
  await act(() =>
    canvas.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: x,
        clientY: y,
        buttons,
      }),
    ),
  );
}

describe('Well map pointer interactions', () => {
  it('holds the camera while selecting, moving people and resizing the composer', async () => {
    const { canvas, store, update } = await setup({ following: false, selectedId: null });
    const initial = lastTransform(canvas);
    await update({ selectedId: 'yusuf', destination: 'site' });
    required(required(store.current.curr).human[0]).x = 3;
    await draw();
    expect(lastTransform(canvas)).toEqual(initial);
    mapHeight = 240;
    resizeMap?.();
    await draw();
    const resized = required(lastTransform(canvas));
    resized.forEach((value, index) => {
      expect(value).toBeCloseTo(required(required(initial)[index]));
    });
  });

  it('frames a confirmed destination and lets Follow override composition', async () => {
    const { canvas, container, update } = await setup({ following: false, selectedId: null });
    const initial = lastTransform(canvas);
    await update({ selectedId: 'yusuf', destination: 'site' });
    await draw();
    expect(lastTransform(canvas)).toEqual(initial);
    await act(() => required(container.querySelector<HTMLButtonElement>('.map-follow')).click());
    await draw();
    expect(lastTransform(canvas)).not.toEqual(initial);
    await update({ following: true, followKey: 1 });
    await draw();
    const confirmed = mapView(360, 380, { x: 320, y: 240 }, { x: 528, y: 304 });
    const calls = required(lastTransform(canvas));
    expect(calls[0]).toBeCloseTo(360 / confirmed.width);
    expect(calls[4]).toBeCloseTo((-confirmed.x * 360) / confirmed.width);
  });

  it('holds a locally followed camera when the same picker opens again', async () => {
    const { canvas, container, store, update } = await setup({ following: false, selectedId: 'yusuf' });
    await act(() => required(container.querySelector<HTMLButtonElement>('.map-follow')).click());
    await draw();
    const followed = lastTransform(canvas);
    await update({ holdKey: 1 });
    required(required(store.current.curr).human[0]).x = 3;
    await draw();
    expect(lastTransform(canvas)).toEqual(followed);
  });

  it('hits the last displayed person instead of an unpainted simulation update', async () => {
    const { canvas, store, onSelect } = await setup({ following: false, selectedId: null });
    const view = mapView(360, 380, null, null);
    const point = mapPoint({ x: 320, y: 234 }, view, 360, 380);
    required(required(store.current.curr).human[0]).x = 3;
    await pointer(canvas, 'pointerup', point.x, point.y);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('yusuf');
  });

  it('redraws Centre village with no selected worker after a frozen resize', async () => {
    const { canvas, container } = await setup({ following: false, selectedId: null });
    mapHeight = 240;
    resizeMap?.();
    await draw();
    const frozen = lastTransform(canvas);
    await act(() => required(container.querySelector<HTMLButtonElement>('.map-follow')).click());
    await draw();
    expect(lastTransform(canvas)).not.toEqual(frozen);
  });

  it('does not drift on the next draw after a panned camera resizes', async () => {
    const { canvas } = await setup({ destination: 'site' });
    await pointer(canvas, 'pointerdown', 100, 100, 1);
    await pointer(canvas, 'pointermove', 120, 100, 1);
    await pointer(canvas, 'pointerup', 120, 100);
    await draw();
    const initial = lastTransform(canvas);
    mapWidth = 300;
    mapHeight = 240;
    resizeMap?.();
    await draw();
    const resized = lastTransform(canvas);
    resized.forEach((value, index) => {
      expect(value).toBeCloseTo(required(initial[index]));
    });
    await draw();
    expect(lastTransform(canvas)).toEqual(resized);
  });

  it('selects a name at the label rectangle the renderer last displayed', async () => {
    vi.mocked(drawScene).mockReturnValue([{ id: 'yusuf', x: 450, y: 180, w: 90, h: 25 }]);
    const { canvas, onSelect } = await setup({ following: false, selectedId: null });
    const point = mapPoint({ x: 495, y: 192 }, mapView(360, 380, null, null), 360, 380);
    await pointer(canvas, 'pointermove', point.x, point.y);
    expect(canvas.style.cursor).toBe('pointer');
    await pointer(canvas, 'pointerup', point.x, point.y);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('yusuf');
  });

  it('offers a list instead of guessing between overlapping people', async () => {
    const { canvas, store, container, onSelect } = await setup();
    const first = required(required(store.current.curr).human[0]);
    required(store.current.curr).human.push({ ...first, id: 'maryam' });
    await draw();
    const view = mapView(360, 380, { x: 320, y: 240 }, null);
    const point = mapPoint({ x: 320, y: 234 }, view, 360, 380);
    await pointer(canvas, 'pointerup', point.x, point.y);
    expect(onSelect).not.toHaveBeenCalled();
    const choices = container.querySelector('[aria-label="Choose map target"]');
    expect(choices?.textContent).toContain('Yusuf');
    expect(choices?.textContent).toContain('Maryam');
    const maryam = [...required(choices).querySelectorAll('button')].find((b) => b.textContent === 'Maryam');
    await act(() => required(maryam).click());
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('maryam');
    expect(container.querySelector('[aria-label="Choose map target"]')).toBeNull();
  });

  it('keeps a hovered destination under the pointer until the click chooses it', async () => {
    const { canvas, onSelect, onPlace, onHover } = await setup();
    const view = mapView(360, 380, { x: 320, y: 240 }, null);
    const house = mapPoint({ x: 528, y: 304 }, view, 360, 380);
    await pointer(canvas, 'pointermove', house.x, house.y);
    expect(onHover).toHaveBeenLastCalledWith('site');
    // Let the hover rerender and redraw before clicking the same screen coordinate.
    await draw();
    await pointer(canvas, 'pointerdown', house.x, house.y, 1);
    await pointer(canvas, 'pointerup', house.x, house.y);
    expect(onPlace).toHaveBeenCalledExactlyOnceWith('site');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not select a worker or destination when a drag ends over a worker', async () => {
    const { canvas, onSelect, onPlace } = await setup();
    const view = mapView(360, 380, { x: 320, y: 240 }, null);
    const worker = mapPoint({ x: 320, y: 234 }, view, 360, 380);
    await pointer(canvas, 'pointerdown', worker.x - 30, worker.y, 1);
    await pointer(canvas, 'pointermove', worker.x, worker.y, 1);
    // Pointerup must suppress hit testing, even before another animation frame paints the pan.
    await pointer(canvas, 'pointerup', worker.x, worker.y);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onPlace).not.toHaveBeenCalled();
  });
});
