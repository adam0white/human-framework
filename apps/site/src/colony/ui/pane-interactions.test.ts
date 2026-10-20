// @vitest-environment happy-dom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { PlaceId } from '../sim/map.ts';
import { mapPoint, mapView } from './map-view.ts';
import { Pane } from './Pane.tsx';

// Exercise the real camera, hit testing and pointer handlers without painting pixels.
vi.mock('./renderer.ts', async (original) => ({
  ...(await original<typeof import('./renderer.ts')>()),
  drawScene: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const roots: ReturnType<typeof createRoot>[] = [];
let nextFrame = 0;
let animationFrames = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  animationFrames = new Map();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    animationFrames.set(++nextFrame, cb);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => animationFrames.delete(id));
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

async function draw() {
  const callbacks = [...animationFrames.values()];
  animationFrames.clear();
  await act(() => {
    for (const callback of callbacks) callback(1000);
  });
}

async function setup() {
  const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
  const first = frame.human[0];
  if (!first) throw new Error('Missing initial worker');
  const worker = { ...first, id: 'yusuf' as const, x: 9.5, y: 7 };
  const store = { current: { curr: { ...frame, human: [worker] }, prev: null, at: 0, interval: 62 } };
  const onSelect = vi.fn();
  const onPlace = vi.fn();
  const onHover = vi.fn();
  function Harness() {
    const [hoverPlace, setHoverPlace] = useState<PlaceId | null>(null);
    return createElement(Pane, {
      side: 'human',
      store,
      selectedId: 'yusuf',
      destination: null,
      hoverPlace,
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
  return { canvas, onSelect, onPlace, onHover };
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
