import { FRAMEWORK_VERSION } from '@adam0white/human-framework';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
            Ranked by the owner’s play first, then playtests, depth and how well each shows HF.
          </p>
          <p>
            <a
              className="ranking-link"
              href="https://github.com/adam0white/human-framework/blob/main/docs/lab/ranking-2026-10-20.md"
            >
              Why this order
            </a>
          </p>
          <GameList games={GAMES} />
          <p className="note">
            Frozen experiments stay playable; no further work is planned unless the owner unfreezes them.
          </p>
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
