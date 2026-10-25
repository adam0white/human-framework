import { FRAMEWORK_VERSION } from '@adam0white/human-framework';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { labMode } from '../shared/lab-mode.ts';
import '../home/home.css';
import { GAMES } from '../games.ts';
import { GameList } from '../shared/GameList.tsx';

/** The collection page: every game, read from src/games.ts. Other notebooks link here. */
function Collection() {
  return (
    <div className="page">
      <header className="top">
        <a className="mark" href="/">
          <span aria-hidden="true">◇</span> human framework
        </a>
      </header>
      <main>
        <section className="hero" aria-labelledby="games-title">
          <h1 id="games-title">All games</h1>
          <p className="lede">
            Choose a game. Each story puts you alongside people who make their own choices.
          </p>
          {labMode() && (
            <p>
              <a
                className="ranking-link"
                href="https://github.com/adam0white/human-framework/blob/main/docs/lab/ranking-2026-10-20.md"
              >
                Why this order
              </a>
            </p>
          )}
          <GameList games={GAMES} />
          {labMode() && (
            <p className="note">
              All games remain playable. Framework upgrades and maintenance are in progress. Lab panel rounds
              are allowed on HF 3.0 builds. Friends’ playtests and Show HN remain paused.
            </p>
          )}
        </section>
      </main>
      <footer className="foot">
        <span>
          <span aria-hidden="true">◇</span> human framework v{FRAMEWORK_VERSION}
        </span>
        <a href="/">about HF</a>
      </footer>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Collection />
    </StrictMode>,
  );
}
