import { describe, expect, it } from 'vitest';
import { findPath, MAP, MAP_H, MAP_W, PLACES, pathLength, placeAt, spotFor, walkable } from './map.ts';
import { startTile, VILLAGERS } from './world-types.ts';

describe('map', () => {
  it('is the 20×14 grid of the spec', () => {
    expect(MAP_W).toBe(20);
    expect(MAP_H).toBe(14);
    expect(MAP.kinds).toHaveLength(20 * 14);
  });

  it('has footprints matching the spec tile counts', () => {
    const size = (id: string) => {
      const p = PLACES.find((q) => q.id === id);
      return p ? p.w * p.h : 0;
    };
    expect(size('field')).toBe(12);
    expect(size('forest')).toBe(20);
    expect(size('site')).toBe(9);
    expect(size('kitchen')).toBe(4);
    expect(size('masjid')).toBe(4);
    expect(size('home-yusuf')).toBe(4);
  });

  it('every place spot is walkable and reachable from every villager start', () => {
    for (const p of PLACES) {
      for (const s of p.spots) {
        expect(walkable(MAP, s.x, s.y), `${p.id} spot ${s.x},${s.y}`).toBe(true);
        for (const v of VILLAGERS) {
          expect(findPath(MAP, startTile(v), s), `${v.id} → ${p.id}`).not.toBeNull();
        }
      }
    }
  });

  it('finds shortest 4-connected paths that never cross solid buildings', () => {
    const from = spotFor('home-maryam', 0);
    const to = spotFor('field', 0);
    const path = findPath(MAP, from, to);
    expect(path).not.toBeNull();
    if (!path) return;
    // Lower bound: Manhattan distance.
    expect(path.length).toBeGreaterThanOrEqual(Math.abs(to.x - from.x) + Math.abs(to.y - from.y));
    let prev = from;
    for (const t of path) {
      expect(Math.abs(t.x - prev.x) + Math.abs(t.y - prev.y)).toBe(1);
      expect(walkable(MAP, t.x, t.y)).toBe(true);
      prev = t;
    }
    expect(prev).toEqual(to);
  });

  it('is deterministic and handles trivial and blocked targets', () => {
    const a = spotFor('kitchen', 1);
    const b = spotFor('forest', 3);
    expect(findPath(MAP, a, b)).toEqual(findPath(MAP, a, b));
    expect(findPath(MAP, a, a)).toEqual([]);
    // The kitchen interior is solid.
    expect(placeAt(MAP, 12, 9)).toBe('kitchen');
    expect(findPath(MAP, a, { x: 12, y: 9 })).toBeNull();
    expect(pathLength(MAP, a, { x: 12, y: 9 })).toBe(Number.POSITIVE_INFINITY);
  });
});
