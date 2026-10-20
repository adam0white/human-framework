import { describe, expect, it } from 'vitest';
import { layoutFor } from './map.ts';

describe('short Watch scenes', () => {
  it('leaves room below the wall for the staggered names and Keeper', () => {
    for (const height of [120, 160, 240, 600]) {
      const layout = layoutFor(360, height);
      expect(layout.yWall + layout.wallH + 35).toBeLessThanOrEqual(height);
    }
  });
});
