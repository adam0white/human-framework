// @vitest-environment happy-dom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { PlaceId } from '../sim/map.ts';
import { BubbleManager } from './bubbles.ts';
import { mapPoint, mapView } from './map-view.ts';
import { latestReply, Pane, type PaneProps } from './Pane.tsx';
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

function Harness({
  store,
  settings,
  onSelect,
  onPlace,
  onHover,
}: {
  store: { current: FrameStore };
  settings: Partial<PaneProps>;
  onSelect: PaneProps['onSelect'];
  onPlace: PaneProps['onPlace'];
  onHover: (place: PlaceId | null) => void;
}) {
  const [hoverPlace, setHoverPlace] = useState<PlaceId | null>(null);
  return createElement(Pane, {
    side: 'human',
    store,
    selectedId: 'yusuf',
    destination: null,
    hoverPlace,
    ...settings,
    onSelect,
    onPlace: settings.onPlace ?? onPlace,
    onHoverPlace: (place) => {
      onHover(place);
      setHoverPlace(place);
    },
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
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(() => root.render(createElement(Harness, { store, settings, onSelect, onPlace, onHover })));
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
      await act(() => root.render(createElement(Harness, { store, settings, onSelect, onPlace, onHover })));
    },
  };
}

async function pointer(
  canvas: HTMLCanvasElement,
  type: string,
  x: number,
  y: number,
  buttons = 0,
  pointerId = 1,
) {
  await act(() =>
    canvas.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId,
        pointerType: 'mouse',
        clientX: x,
        clientY: y,
        buttons,
      }),
    ),
  );
}

describe('Well map pointer interactions', () => {
  it('ignores a secondary pointer moving or cancelling during a held tap', async () => {
    const { canvas, onSelect } = await setup({ following: false, selectedId: null });
    const point = mapPoint({ x: 320, y: 234 }, mapView(360, 380, null, null), 360, 380);
    await pointer(canvas, 'pointerdown', point.x, point.y, 1);
    await pointer(canvas, 'pointermove', point.x + 100, point.y, 1, 2);
    await pointer(canvas, 'pointercancel', point.x, point.y, 0, 2);
    await pointer(canvas, 'pointerup', point.x, point.y);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('yusuf');
  });
  it('selects the person painted at pointerdown after a different person is painted under the held finger', async () => {
    const { canvas, store, onSelect, onPlace } = await setup({ following: false, selectedId: null });
    const point = mapPoint({ x: 320, y: 234 }, mapView(360, 380, null, null), 360, 380);
    await pointer(canvas, 'pointerdown', point.x, point.y, 1);
    const frame = required(store.current.curr);
    store.current.curr = { ...frame, human: [{ ...required(frame.human[0]), id: 'maryam' }] };
    await draw();
    expect(vi.mocked(drawScene).mock.calls.at(-1)?.[1].people[0]?.id).toBe('maryam');
    await pointer(canvas, 'pointerup', point.x, point.y);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('yusuf');
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('retains the painted place and sender callback through a camera and selection change', async () => {
    const { canvas, store, update, onPlace } = await setup({ following: true });
    const point = mapPoint({ x: 528, y: 304 }, mapView(360, 380, { x: 320, y: 240 }, null), 360, 380);
    await pointer(canvas, 'pointerdown', point.x, point.y, 1);
    const changedSender = vi.fn();
    required(required(store.current.curr).human[0]).x = 3;
    await update({ selectedId: 'maryam', onPlace: changedSender });
    await draw();
    await pointer(canvas, 'pointerup', point.x, point.y);
    expect(onPlace).toHaveBeenCalledExactlyOnceWith('site');
    expect(changedSender).not.toHaveBeenCalled();
  });

  it('sends nothing after a cancelled press', async () => {
    const { canvas, onSelect, onPlace } = await setup({ following: false, selectedId: null });
    const point = mapPoint({ x: 320, y: 234 }, mapView(360, 380, null, null), 360, 380);
    await pointer(canvas, 'pointerdown', point.x, point.y, 1);
    await pointer(canvas, 'pointercancel', point.x, point.y);
    await pointer(canvas, 'pointerup', point.x, point.y);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onPlace).not.toHaveBeenCalled();
  });

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
    await pointer(canvas, 'pointerdown', point.x, point.y, 1);
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
    await pointer(canvas, 'pointerdown', point.x, point.y, 1);
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
    await pointer(canvas, 'pointerdown', point.x, point.y, 1);
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

it('sends an ordinary order directly from a scene destination with its likely answer', async () => {
  const { container, onPlace } = await setup({
    scenePlaces: [
      { placeId: 'forest', label: 'Forest', answer: 'Already gathering timber: keeps him at it' },
    ],
    frameSelection: true,
  });
  const action = required(container.querySelector<HTMLButtonElement>('.scene-place'));
  expect(action.textContent).toContain('Already gathering timber');
  await act(() => action.click());
  expect(onPlace).toHaveBeenCalledExactlyOnceWith('forest');
  const viewport = required(container.querySelector('.map-viewport'));
  expect(viewport.contains(container.querySelector('canvas'))).toBe(true);
  expect(viewport.contains(container.querySelector('.map-follow'))).toBe(false);
});

it('shows only the latest spoken reply, keeping thoughts out of the answer layer', () => {
  const reply = (id: string, minute: number, kind: 'assent' | 'thought') => ({
    bubble: { id, minute, kind, personId: 'yusuf' as const, text: id },
    phase: 'line' as const,
  });
  const latest = reply('latest', 12, 'assent');
  expect(latestReply([reply('older', 10, 'assent'), latest, reply('thought', 15, 'thought')])).toEqual([
    latest,
  ]);
});

it('keeps a selected worker in the scene while order options consume map height', async () => {
  const { canvas, store } = await setup({
    following: false,
    frameSelection: true,
    scenePlaces: [{ placeId: 'forest', label: 'Forest', answer: 'Gather timber' }],
  });
  const person = required(required(store.current.curr).human[0]);
  person.x = 0;
  person.y = 0;
  mapHeight = 180;
  resizeMap?.();
  await draw();
  const transform = lastTransform(canvas);
  const x = 16 * required(transform[0]) + required(transform[4]);
  const y = 16 * required(transform[3]) + required(transform[5]);
  expect(x).toBeGreaterThanOrEqual(0);
  expect(x).toBeLessThanOrEqual(360);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(y).toBeLessThanOrEqual(180);
});

it('holds scene cards under a held finger while the followed worker moves', async () => {
  const { container, store, onPlace } = await setup({
    following: true,
    scenePlaces: [
      { placeId: 'site', label: 'House', answer: 'Later' },
      { placeId: 'well', label: 'Well', answer: 'Later' },
    ],
  });
  const house = required(container.querySelector<HTMLButtonElement>('[data-place="site"]'));
  house.setPointerCapture = vi.fn();
  const before = house.style.transform;
  await act(() =>
    house.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 7,
        pointerType: 'touch',
        clientX: 100,
        clientY: 100,
        buttons: 1,
      }),
    ),
  );
  required(required(store.current.curr).human[0]).x = 1;
  await draw();
  expect(house.style.transform).toBe(before);
  await act(() =>
    house.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 7,
        pointerType: 'touch',
        clientX: 100,
        clientY: 100,
      }),
    ),
  );
  expect(onPlace).toHaveBeenCalledExactlyOnceWith('site');
});

it('cancels a scene order when the finger ends over a different place', async () => {
  const { container, onPlace } = await setup({
    scenePlaces: [
      { placeId: 'site', label: 'House', answer: 'Later' },
      { placeId: 'well', label: 'Well', answer: 'Later' },
    ],
  });
  const house = required(container.querySelector<HTMLButtonElement>('[data-place="site"]'));
  const well = required(container.querySelector<HTMLButtonElement>('[data-place="well"]'));
  house.setPointerCapture = vi.fn();
  await act(() =>
    house.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 7,
        pointerType: 'touch',
        clientX: 100,
        clientY: 100,
        buttons: 1,
      }),
    ),
  );
  await act(() =>
    well.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 7,
        pointerType: 'touch',
        clientX: 100,
        clientY: 100,
      }),
    ),
  );
  await act(() => well.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
  expect(onPlace).not.toHaveBeenCalled();
});

it('hides a reply that cannot fit without covering the selected person', async () => {
  const bubbles = new BubbleManager();
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(340);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(220);
  const { container, store } = await setup({ bubbles, following: false });
  required(required(store.current.curr).human[0]).bubble = {
    id: 'answer',
    minute: 0,
    personId: 'yusuf',
    kind: 'notNow',
    text: 'After I eat.',
  };
  store.current.curr = { ...required(store.current.curr) };
  mapHeight = 180;
  resizeMap?.();
  await draw();
  await draw();
  const bubble = required(container.querySelector<HTMLButtonElement>('.bubble'));
  expect(bubble.style.visibility).toBe('hidden');
});

it('keeps the place-picker row when every scene action fits, so fit cannot resize its own scene', async () => {
  const { container } = await setup({
    scenePlaces: [{ placeId: 'site', label: 'House', answer: 'Likely yes' }],
    onMorePlaces: vi.fn(),
  });
  const picker = container.querySelector<HTMLButtonElement>('.scene-more-places');
  expect(picker).not.toBeNull();
  expect(picker?.textContent).toBe('Choose place');
});

it('selects the person standing at a place even when another worker is selected', async () => {
  vi.mocked(drawScene).mockReturnValue([{ id: 'idris', x: 100, y: 100, w: 90, h: 44 }]);
  const { canvas, container, onSelect, onPlace } = await setup({ following: false, selectedId: 'tariq' });
  const point = mapPoint({ x: 140, y: 120 }, mapView(360, 380, null, null), 360, 380);
  await pointer(canvas, 'pointerdown', point.x, point.y, 1);
  await pointer(canvas, 'pointerup', point.x, point.y);
  expect(onSelect).toHaveBeenCalledExactlyOnceWith('idris');
  expect(onPlace).not.toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Choose map target"]')).toBeNull();
});
