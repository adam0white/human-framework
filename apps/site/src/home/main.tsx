import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FACULTIES, GAMES } from '../games.ts';
import { GameList } from '../shared/GameList.tsx';
import './home.css';
import { SAMPLE_OUTPUT } from './sampleOutput.ts';

declare const __HF_LIBRARY_VERSION__: string;

const ACTIVE_GAMES = GAMES.filter((g) => g.status === 'active');
const TOP_GAME = ACTIVE_GAMES[0] ?? { name: 'Twice at the Well', href: '/colony/' };

const REPO = 'https://github.com/adam0white/human-framework';
// Shortened from sample.ts; the printed answer is SAMPLE_OUTPUT, which sample.test.ts checks against the real API.
const SNIPPET = `const answer = predict(aylin, offers, {
  voiceId: 'player', action: 'steal',
  strength: 1, insist: true,
});
// ${SAMPLE_OUTPUT.verdict}: ${SAMPLE_OUTPUT.kind} (${SAMPLE_OUTPUT.reason})
// "${SAMPLE_OUTPUT.says}"`;
const INSTALL = 'npm install @adam0white/human-framework';

function Answer({ kind, children }: { kind: 'yes' | 'later' | 'no'; children: string }) {
  return <span className={`answer answer-${kind}`}>{children}</span>;
}

function Home() {
  return (
    <div className="page">
      <header className="top">
        <a className="mark" href="/">
          <span aria-hidden="true">◇</span> human framework
        </a>
        <a className="top-link" href={REPO}>
          GitHub ↗
        </a>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <h1 id="hero-title">Simulated people who decide for themselves.</h1>
          <p className="lede">
            HF is a TypeScript library for game characters. You suggest; each person weighs it against their
            body, needs, habits, duties and trust, and answers. Tell a hungry villager to steal bread, and she
            may refuse:
          </p>
          <p className="answers-label">Three answers a person can give</p>
          <p className="answers">
            <Answer kind="yes">yes</Answer>
            <Answer kind="later">not now, after I eat</Answer>
            <Answer kind="no">will not, it is theft</Answer>
          </p>
          <p className="ctas">
            <a className="cta" href={TOP_GAME.href}>
              Play {TOP_GAME.name} →
            </a>
            <a href="/games/">All games</a>
          </p>
        </section>

        <section id="play" aria-labelledby="play-title">
          <h2 id="play-title">See it in play</h2>
          <GameList games={ACTIVE_GAMES.slice(0, 3)} />
          <p className="note">
            <a className="ranking-link" href="/games/">
              All games, ranked →
            </a>
          </p>
        </section>

        <section aria-labelledby="does-title">
          <h2 id="does-title">What a person has</h2>
          <dl className="faculties">
            {FACULTIES.map(([name, body]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
          <p className="note">
            With the same initial state, inputs, host logic and engine version, decisions repeat. Records
            retain scored terms for top considered options; history is bounded. Person state is plain JSON. A
            full replay also needs host state and inputs.
          </p>
        </section>

        <section aria-labelledby="use-title">
          <h2 id="use-title">Use it</h2>
          <pre className="install">
            <code>{INSTALL}</code>
          </pre>
          <pre className="install">
            <code>{SNIPPET}</code>
          </pre>
          <ol className="steps">
            <li>Create a person from a seed and a few traits.</li>
            <li>Offer what your world allows right now.</li>
            <li>Ask them to decide, run the action, report what happened.</li>
          </ol>
          <p>
            <a href={`${REPO}/blob/main/docs/api.md`}>Read the API</a> ·{' '}
            <a href={`${REPO}/blob/main/apps/site/src/home/sample.ts`}>full example</a> ·{' '}
            <a href="https://www.npmjs.com/package/@adam0white/human-framework">npm</a>
          </p>
        </section>

        <section className="faith" aria-labelledby="faith-title">
          <h2 id="faith-title">Faith and science</h2>
          <p>
            HF is guided by Islamic teaching about the human being, read alongside current science. It models
            a person’s held understanding of norms, not rulings. Conscience uses numeric state; HF never
            computes divine acceptance or assigns quantities to the ruh.
          </p>
          <p>
            <a href={`${REPO}/blob/main/research/reconciliation.md`}>How the two are reconciled</a>
          </p>
          <p className="margin">
            Prayer and fasting can affect a character’s choices; they are quiet parts of life in the games.
          </p>
        </section>
      </main>

      <footer className="foot">
        <span>
          <span aria-hidden="true">◇</span> human framework v{__HF_LIBRARY_VERSION__}
        </span>
        <span>
          code MIT · docs CC BY 4.0 · <a href={REPO}>source</a>
        </span>
      </footer>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Home />
    </StrictMode>,
  );
}
