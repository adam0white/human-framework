import { describe, expect, it } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import {
  drawScene,
  LOGICAL_H,
  LOGICAL_W,
  mapTypeSize,
  personLabelRect,
  type SceneInput,
} from './renderer.ts';

function canvasRecorder() {
  const calls: { method: string; args: unknown[] }[] = [];
  const ctx = new Proxy(
    {},
    {
      get(_target, method: string) {
        if (method === 'measureText') return (text: string) => ({ width: text.length * 9 });
        if (method === 'createRadialGradient') return () => ({ addColorStop() {} });
        return (...args: unknown[]) => {
          calls.push({ method, args });
        };
      },
      set() {
        return true;
      },
    },
  ) as CanvasRenderingContext2D;
  return { ctx, calls };
}

const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
const input: SceneInput = {
  side: 'human',
  minute: 0,
  darkness: 0,
  weather: frame.weather,
  world: frame.humanWorld,
  people: [
    {
      id: 'yusuf',
      name: 'Yusuf',
      x: 6,
      y: 7,
      state: 'walking',
      label: 'Walking to the well',
      carriedBy: null,
      hp: 100,
    },
  ],
  selectedId: 'yusuf',
  hoverPlace: 'site',
  showPlaceLabels: true,
  realTime: 0,
  cooking: false,
  labelScale: 425 / 360,
};

describe('Well map presentation', () => {
  it('returns the exact name rectangle drawn for pointer selection', () => {
    const { ctx, calls } = canvasRecorder();
    const labels = drawScene(ctx, input);
    expect(labels).toEqual([expect.objectContaining({ id: 'yusuf' })]);
    const label = labels?.[0];
    const text = calls.find((c) => c.method === 'fillText' && c.args[0] === 'Yusuf');
    expect(label).toBeDefined();
    expect(text?.args[1]).toBe((label?.x ?? 0) + (label?.w ?? 0) / 2);
    expect(text?.args[2]).toBeGreaterThan(label?.y ?? 0);
    expect(text?.args[2]).toBeLessThan((label?.y ?? 0) + (label?.h ?? 0));
  });

  it('keeps names and primary place text at least 14 CSS pixels in both cameras', () => {
    for (const scale of [1, 425 / 360, 640 / 360]) {
      expect(mapTypeSize(scale) / scale).toBeCloseTo(14, 10);
    }
  });

  it('keeps the selected sleeper named at their actual resting place', () => {
    const record = canvasRecorder();
    drawScene(record.ctx, {
      ...input,
      people: input.people.map((p) => ({ ...p, state: 'asleep', label: 'Asleep' })),
    });
    expect(record.calls.some((c) => c.method === 'fillText' && c.args[0] === 'Yusuf')).toBe(true);
  });

  it('keeps a crowded name inside the map and chooses space without another name', () => {
    const first = personLabelRect({ x: 620, y: 435 }, 100, 28, []);
    const second = personLabelRect({ x: 620, y: 435 }, 100, 28, [first]);
    for (const r of [first, second]) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(LOGICAL_W);
      expect(r.y + r.h).toBeLessThanOrEqual(LOGICAL_H);
    }
    expect(second).not.toEqual(first);
  });

  it('draws the actual travel label even when a different destination is selected', () => {
    const before = JSON.stringify(input);
    const { ctx, calls } = canvasRecorder();
    drawScene(ctx, input);
    const text = calls.filter((c) => c.method === 'fillText').map((c) => c.args[0]);
    expect(text).toContain('MASJID');
    expect(text).toContain('WELL');
    expect(text).toContain('Yusuf');
    expect(text).toContain('Walking to the well');
    expect(text).not.toContain('Walking to the house');
    // The selected worker and chosen House footprint share a visible connection.
    expect(calls).toContainEqual({ method: 'moveTo', args: [208, 240] });
    expect(calls).toContainEqual({ method: 'lineTo', args: [528, 304] });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('bends a working body only when the view reports work', () => {
    const walking = canvasRecorder();
    drawScene(walking.ctx, input);
    const working = canvasRecorder();
    drawScene(working.ctx, { ...input, people: input.people.map((p) => ({ ...p, state: 'working' })) });
    expect(walking.calls.some((c) => c.method === 'rotate' && c.args[0] === 0.24)).toBe(false);
    expect(working.calls.some((c) => c.method === 'rotate' && c.args[0] === 0.24)).toBe(true);
  });
});

it('wraps a person order in its scene tag, including an unselected person', () => {
  const { ctx, calls } = canvasRecorder();
  const status = "House: won't — that is my work";
  const labels = drawScene(ctx, {
    ...input,
    selectedId: null,
    people: input.people.map((p) => ({ ...p, orderStatus: status })),
  });
  const texts = calls.filter((c) => c.method === 'fillText').map((c) => String(c.args[0]));
  expect(texts.join(' ')).toContain(status);
  expect(labels?.[0]?.w).toBeLessThanOrEqual(
    180 * (input.labelScale ?? 1) + 14 * (input.labelScale ?? 1) * 0.7,
  );
});

it.each(['House: later, after I pray Fajr', 'House: won’t — “that is my work”'])(
  'keeps the full tag inside a cropped scene: %s',
  (status) => {
    const { ctx, calls } = canvasRecorder();
    const bounds = { x: 140, y: 130, w: 230, h: 160 };
    const labels = drawScene(ctx, {
      ...input,
      visibleBounds: bounds,
      people: input.people.map((p) => ({ ...p, x: 10.8, y: 7.9, orderStatus: status })),
    });
    const tag = labels[0];
    expect(tag).toBeDefined();
    if (!tag) throw new Error('Missing selected tag');
    expect(tag.x).toBeGreaterThanOrEqual(bounds.x);
    expect(tag.y).toBeGreaterThanOrEqual(bounds.y);
    expect(tag.x + tag.w).toBeLessThanOrEqual(bounds.x + bounds.w);
    expect(tag.y + tag.h).toBeLessThanOrEqual(bounds.y + bounds.h);
    const lines = calls.filter((c) => c.method === 'fillText').map((c) => String(c.args[0]));
    expect(lines.join(' ')).toContain(status);
  },
);

it('gives the selected person the preview scene instead of surrounding status tags', () => {
  const { ctx } = canvasRecorder();
  const person = input.people[0];
  if (!person) throw new Error('Missing person');
  const labels = drawScene(ctx, {
    ...input,
    focusLabels: true,
    people: [...input.people, { ...person, id: 'idris', name: 'Idris', x: 7, orderStatus: 'House: done' }],
  });
  expect(labels.map((label) => label.id)).toEqual(['yusuf']);
});

it('keeps the selected destination name within the visible preview', () => {
  const { ctx, calls } = canvasRecorder();
  drawScene(ctx, {
    ...input,
    focusLabels: true,
    hoverPlace: 'site',
    visibleBounds: { x: 520, y: 260, w: 160, h: 150 },
  });
  const house = calls.find((c) => c.method === 'fillText' && c.args[0] === 'HOUSE');
  expect(house).toBeDefined();
  expect(Number(house?.args[1]) - 45 / 2).toBeGreaterThanOrEqual(520);
  expect(Number(house?.args[1]) + 45 / 2).toBeLessThanOrEqual(680);
});
