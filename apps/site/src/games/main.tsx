import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Decoration } from '../shared/Decoration.tsx';
import '../home/home.css';
import { GAMES } from '../games.ts';
import { GameList } from '../shared/GameList.tsx';
import { GameVersion } from '../shared/GameVersion.tsx';

declare const __HF_LIBRARY_VERSION__: string;
const selected = GAMES.find((game) => game.id === new URLSearchParams(location.search).get('game'));

/** The collection page: every game, read from src/games.ts. Other notebooks link here. */
function Collection() {
  return (
    <div className="page">
      <header className="top">
        <a className="mark" href="/">
          <Decoration kind="diamond" /> human framework
        </a>
      </header>
      <main>
        <section className="hero" aria-labelledby="games-title">
          <h1 id="games-title">{selected?.name ?? 'All games'}</h1>
          {selected ? (
            <>
              <p className="lede">{selected.line}</p>
              <p>{selected.faculties.join(' · ')}</p>
              <GameVersion id={selected.id as Parameters<typeof GameVersion>[0]['id']} />
              <p>
                <a href={selected.href}>Play {selected.name}</a> · <a href="/games/">All games</a>
              </p>
            </>
          ) : (
            <>
              <p className="lede">
                Choose a game. Each story puts you alongside people who make their own choices.
              </p>
              <GameList games={GAMES} />
            </>
          )}
        </section>
      </main>
      <footer className="foot">
        <span>
          <Decoration kind="diamond" /> human framework v{__HF_LIBRARY_VERSION__}
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
