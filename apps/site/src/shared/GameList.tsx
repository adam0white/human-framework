import { gameNavigation } from '@adam0white/lab-client';
import { telemetryNotice } from '@adam0white/lab-kit';
import { useEffect, useRef } from 'react';
import { type Game, isExternal } from '../games.ts';
import { sketchFor } from './sketches.tsx';

/** The notebook cards for a list of games (home.css). */
export function GameList({ games }: { games: Game[] }) {
  const notice = useRef<HTMLDivElement>(null);
  const noticeNode = useRef<HTMLElement | null | undefined>(undefined);
  useEffect(() => {
    if (noticeNode.current === undefined) noticeNode.current = telemetryNotice();
    const node = noticeNode.current;
    if (node) notice.current?.append(node);
    return () => node?.remove();
  }, []);
  return (
    <>
      {/* biome-ignore lint/a11y/noRedundantRoles: Safari removes list semantics when list-style is none. */}
      <ol className="games" role="list">
        {games.map((g) => (
          <li key={g.id} value={g.rank}>
            <a
              className={`game${g.status === 'frozen' ? ' game-frozen' : ''}`}
              href={g.href}
              onClick={(event) => {
                event.currentTarget.href = gameNavigation(g.href);
              }}
            >
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
      <footer ref={notice} />
    </>
  );
}
