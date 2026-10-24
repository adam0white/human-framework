// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it } from 'vitest';
import { GAMES } from '../games.ts';
import { GameList } from './GameList.tsx';

afterEach(() => history.replaceState(null, '', '/games/'));
function shelf(search: string) {
  history.replaceState(null, '', `/games/${search}`);
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(createElement(GameList, { games: GAMES }));
  return node;
}
it('keeps all15 games in the same order while moving development metadata behind exact lab=1', () => {
  const ordinary = shelf('?lab=0');
  const lab = shelf('?lab=1');
  expect(ordinary.querySelectorAll('li')).toHaveLength(15);
  expect([...ordinary.querySelectorAll('.game-name')].map((n) => n.textContent)).toEqual(
    [...lab.querySelectorAll('.game-name')].map((n) => n.textContent),
  );
  expect(ordinary.querySelector('.game-shows,.game-status,.game-frozen')).toBeNull();
  expect(ordinary.textContent).not.toMatch(/Owner acceptance pending|Frozen experiment/);
  expect(lab.querySelector('.game-shows')).not.toBeNull();
  expect(lab.textContent).toContain('Owner acceptance pending');
  expect(lab.textContent).toContain('Frozen experiment');
  expect(ordinary.textContent).toContain('four weeks');
  expect(ordinary.textContent).toContain('kapıcı');
  expect(ordinary.textContent).toContain('agha');
  expect(ordinary.textContent).toContain('Izmir');
});
