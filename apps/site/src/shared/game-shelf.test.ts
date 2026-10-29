// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it } from 'vitest';
import { GAMES } from '../games.ts';
import { GameList } from './GameList.tsx';

afterEach(() => history.replaceState(null, '', '/games/'));
function shelf() {
  history.replaceState(null, '', '/games/');
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(createElement(GameList, { games: GAMES }));
  return node;
}
it('shows public game descriptions and faculty labels', () => {
  const ordinary = shelf();
  expect(ordinary.querySelectorAll('li')).toHaveLength(GAMES.length);
  expect(ordinary.querySelector('.game-shows')).not.toBeNull();
  expect(ordinary.textContent).not.toMatch(/Owner acceptance pending|Frozen experiment/);
  expect(ordinary.textContent).toContain('four weeks');
  expect(ordinary.textContent).toContain('caretaker');
  expect(ordinary.textContent).toContain('landlord');
  expect(ordinary.textContent).toContain('Izmir');
});

it('shows each live pin and explains every retained 3.x game', async () => {
  const { default: releases } = await import('../game-releases.json');
  const ordinary = shelf();
  for (const game of GAMES) {
    const receipt = releases[game.id as keyof typeof releases];
    expect(receipt.commit).toMatch(/^[a-f0-9]{40}$/);
    const card = ordinary.querySelector(`li[value="${game.rank}"]`);
    if (!card) throw new Error(`Missing card: ${game.id}`);
    expect(card.textContent).toContain(`HF ${receipt.framework}`);
    expect(card.querySelector('a[href*="release.json"]')?.getAttribute('href')).toBe(receipt.release);
    if (receipt.framework.startsWith('3.')) {
      expect('reason' in receipt && receipt.reason.length > 20).toBe(true);
    }
  }
  expect(ordinary.textContent).toContain('HF 4 still exceeds its simulation and saved-history budgets.');
  expect(ordinary.textContent).toContain('November 24, 2026');
});
