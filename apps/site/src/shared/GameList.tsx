import { type Game, isExternal } from '../games.ts';
import { sketchFor } from './sketches.tsx';

/** The notebook cards for a list of games (home.css). */
export function GameList({ games }: { games: Game[] }) {
  return (
    // biome-ignore lint/a11y/noRedundantRoles: Safari removes list semantics when list-style is none.
    <ol className="games" role="list">
      {games.map((g) => (
        <li key={g.id} value={g.rank}>
          <a className={`game${g.status === 'frozen' ? ' game-frozen' : ''}`} href={g.href}>
            <span className="game-art">{sketchFor(g.id)}</span>
            <span className="game-text">
              <span className="game-name">
                <span className="game-rank" aria-hidden="true">
                  {g.rank}.
                </span>{' '}
                {g.name}
                {isExternal(g) && (
                  <span className="game-away" title="Opens another site">
                    {' '}
                    ↗
                  </span>
                )}
              </span>
              {g.status === 'frozen' && <span className="game-status">Frozen experiment</span>}
              <span className="game-line">{g.line}</span>
              <span className="game-shows">{g.faculties.join(' · ')}</span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}
