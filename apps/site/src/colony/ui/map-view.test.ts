import { describe, expect, it } from 'vitest';
import { layoutSceneTargets, mapPoint, mapView } from './map-view.ts';

describe('portrait village view', () => {
  it('fills the phone map without stretching tiles', () => {
    const view = mapView(360, 380, null, null);
    expect(view.width / view.height).toBeCloseTo(360 / 380);
    expect(view.height).toBe(448);
    expect(view.width).toBeLessThan(640);
  });
  it('keeps the selected worker and destination in frame even across the village', () => {
    const worker = { x: 40, y: 80 };
    const place = { x: 560, y: 360 };
    const view = mapView(360, 380, worker, place);
    for (const point of [worker, place]) {
      const p = mapPoint(point, view, 360, 380);
      expect(p.x).toBeGreaterThanOrEqual(25);
      expect(p.x).toBeLessThanOrEqual(335);
      expect(p.y).toBeGreaterThanOrEqual(25);
      expect(p.y).toBeLessThanOrEqual(355);
    }
  });
  it('follows the worker after confirmation and clamps pan at the map edge', () => {
    const west = mapView(360, 380, { x: 24, y: 220 }, null);
    const east = mapView(360, 380, { x: 615, y: 220 }, null);
    expect(west.x).toBe(0);
    expect(east.x + east.width).toBe(640);
    expect(mapView(360, 380, null, null, { x: 10000, y: 0 }).x).toBe(east.x);
  });
  it('keeps the full village on the wide desktop canvas', () => {
    expect(mapView(640, 448, { x: 20, y: 20 }, null)).toEqual({ x: 0, y: 0, width: 640, height: 448 });
  });
});

it('fits the whole village when scene destinations need to remain visible', () => {
  const view = mapView(360, 240, { x: 30, y: 420 }, null, null, true);
  for (const point of [
    { x: 0, y: 0 },
    { x: 640, y: 448 },
    { x: 30, y: 420 },
  ]) {
    const shown = mapPoint(point, view, 360, 240);
    expect(shown.x).toBeGreaterThanOrEqual(0);
    expect(shown.x).toBeLessThanOrEqual(360);
    expect(shown.y).toBeGreaterThanOrEqual(0);
    expect(shown.y).toBeLessThanOrEqual(240);
  }
});

it('places reachable scene actions around speech and people and returns overflow', () => {
  const blocked = [{ x: 100, y: 60, w: 100, h: 90 }];
  const targets = Array.from({ length: 8 }, (_, index) => ({
    id: String(index),
    x: 150,
    y: 100,
    w: 108,
    h: 60,
  }));
  const positions = layoutSceneTargets(360, 240, targets, blocked);
  expect(positions.size).toBeGreaterThan(0);
  expect(positions.size).toBeLessThan(8);
  const placed = [...blocked];
  for (const point of positions.values()) {
    expect(point.x).toBeGreaterThanOrEqual(4);
    expect(point.y).toBeGreaterThanOrEqual(4);
    expect(point.x + 108).toBeLessThanOrEqual(356);
    expect(point.y + 60).toBeLessThanOrEqual(236);
    expect(
      placed.some(
        (r) => point.x < r.x + r.w && point.x + 108 > r.x && point.y < r.y + r.h && point.y + 60 > r.y,
      ),
    ).toBe(false);
    placed.push({ ...point, w: 108, h: 60 });
  }
});
