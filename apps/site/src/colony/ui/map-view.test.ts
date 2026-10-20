import { describe, expect, it } from 'vitest';
import { mapPoint, mapView } from './map-view.ts';

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
