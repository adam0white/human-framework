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
