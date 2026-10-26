import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GAMES } from './games.ts';
import { LAB_GAMES } from './lab/games.ts';
import { GameList } from './shared/GameList.tsx';

describe('ranked games', () => {
  it('keeps unique contiguous ranks in array order and unique ids with valid statuses', () => {
    expect(GAMES.map((g) => g.rank)).toEqual(GAMES.map((_, i) => i + 1));
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
    for (const g of GAMES) expect(['active', 'frozen']).toContain(g.status);
  });

  it('keeps the owner’s order and the active experiments', () => {
    expect(GAMES.map((g) => g.id)).toEqual([
      'murmur',
      'stairwell',
      'pass',
      'glance',
      'watch',
      'hearsay',
      'goodhands',
      'valley',
      'voice',
      'well',
      'warren',
      'repair',
      'neighbours',
      'rope',
      'commonstead',
      'smoke',
      'word',
      'child',
      'days',
      'lefthand',
    ]);
    expect(GAMES.filter((g) => g.status === 'frozen').map((g) => g.id)).toEqual([]);
    expect(LAB_GAMES).toEqual(
      GAMES.map(({ id, name, href, rank, status }) => ({
        id,
        name,
        href,
        rank,
        status,
      })),
    );
  });

  it('renders semantic ranks and playable links without development labels', () => {
    const html = renderToStaticMarkup(createElement(GameList, { games: GAMES }));
    expect(html).toContain('<ol class="games" role="list">');
    expect(html.match(/<li value="\d+">/g)).toHaveLength(GAMES.length);
    expect(html).not.toContain('Frozen experiment');
    for (const g of GAMES) expect(html).toContain(`href="${g.href}"`);
  });
});
