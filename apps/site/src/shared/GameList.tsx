import { type Game, isExternal } from '../games.ts';
import { sketchFor } from './sketches.tsx';

/** The notebook cards for a list of games (home.css). */
export function GameList({ games }: { games: Game[] }) {
  return (
    <ul className="games">
      {games.map((g) => (
        <li key={g.id}>
          <a className="game" href={g.href}>
            <span className="game-art">{sketchFor(g.id)}</span>
            <span className="game-text">
              <span className="game-name">
                {g.name}
                {isExternal(g) && (
                  <span className="game-away" title="Opens another site">
                    {' '}
                    ↗
                  </span>
                )}
              </span>
              <span className="game-line">{g.line}</span>
              <span className="game-shows">{g.faculties.join(' · ')}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
