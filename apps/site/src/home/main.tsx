import { FRAMEWORK_VERSION } from '@adam0white/human-framework';
import { type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './home.css';
import { SAMPLE_OUTPUT } from './sampleOutput.ts';

const REPO = 'https://github.com/adam0white/human-framework';
// Shortened from sample.ts; the printed answer is SAMPLE_OUTPUT, which sample.test.ts checks against the real API.
const SNIPPET = `const answer = predict(aylin, offers, {
  voiceId: 'player', action: 'steal',
  strength: 1, insist: true,
});
// ${SAMPLE_OUTPUT.verdict}: ${SAMPLE_OUTPUT.kind} (${SAMPLE_OUTPUT.reason})
// "${SAMPLE_OUTPUT.says}"`;
const INSTALL = 'npm install @adam0white/human-framework';

/** Monoline ink sketches, one per game. Strokes use currentColor; the accent marks the player's part. */
function Sketch({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg className="sketch" viewBox="0 0 120 72" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

const SKETCHES: Record<string, ReactNode> = {
  well: (
    <Sketch label="A well between two houses, with a person nearby">
      <path d="M10 30l14-10 14 10v20H10z" />
      <path d="M84 36l13-9 13 9v18H84z" />
      <ellipse cx="60" cy="48" rx="12" ry="4.5" />
      <path d="M48 48v8c0 3 24 3 24 0v-8M52 30v14M68 30v14M50 30h20" />
      <circle cx="40" cy="44" r="3" />
      <path d="M40 47.5v9M36.5 51h7M40 56.5l-3 6M40 56.5l3 6" />
      <path className="accent" d="M44 36c4-5 12-6 16-3" />
    </Sketch>
  ),
  voice: (
    <Sketch label="A crescent moon over an open notebook">
      <path d="M68 8a12 12 0 1 0 9 20 10 10 0 0 1-9-20z" />
      <path d="M22 44c12-4 26-4 38 2 12-6 26-6 38-2v22c-12-4-26-4-38 2-12-6-26-6-38-2z" />
      <path d="M60 46v22M30 52c8-1 16-1 22 1M30 58c8-1 14-1 20 1" />
      <path className="accent" d="M68 52c7-2 15-2 22 0" />
    </Sketch>
  ),
  watch: (
    <Sketch label="A watch tower on a village wall at night, a lantern below">
      <path d="M4 50h112M4 50v-6h8v6M20 50v-6h8v6M92 50v-6h8v6M108 50v-6h8v6" />
      <path d="M50 66V26h20v40M47 26h26" />
      <circle cx="60" cy="16" r="3" />
      <path d="M60 19.5v6" />
      <path d="M20 14h0M34 8h0M90 10h0M104 20h0" strokeWidth="2.4" strokeLinecap="round" />
      <path className="accent" d="M28 58h6v7h-6zM29 58c0-3 4-3 4 0" />
    </Sketch>
  ),
  rope: (
    <Sketch label="A climber on a rope down a rock face">
      <path d="M6 70c8-14 10-30 22-40s18-22 30-28M58 2c10 10 18 24 22 40s14 22 30 28" />
      <path className="accent" d="M60 4c0 14 2 28 0 40" />
      <circle cx="60" cy="48" r="3" />
      <path d="M60 51.5v9M56 55h8M60 60.5l-3 6M60 60.5l3 6" />
    </Sketch>
  ),
  neighbours: (
    <Sketch label="A row of houses on a street">
      <path d="M8 60V40l10-9 10 9v20M32 60V36l12-10 12 10v24M60 60V42l9-8 9 8v18M82 60V34l13-11 13 11v26" />
      <path d="M4 60h112" />
      <path className="accent" d="M41 60v-9h6v9" />
    </Sketch>
  ),
  repair: (
    <Sketch label="A lamp and a wrench on a workbench">
      <path d="M8 52h104M16 52v16M104 52v16" />
      <path d="M30 52h18M39 52l-5-22 14-12M44 14l14 5 4 12-18 4z" />
      <path className="accent" d="M76 48l18-18m0 0a5 5 0 1 1 6-6l-4 4 3 3 4-4a5 5 0 0 1-6 6" />
    </Sketch>
  ),
};

type Game = { id: string; name: string; href: string; line: string; shows: string; external?: boolean };

const GAMES: Game[] = [
  {
    id: 'well',
    name: 'Twice at the Well',
    href: '/colony/',
    line: 'One village, two days, played twice: once with units that obey, once with people who decide.',
    shows: 'people who can refuse',
  },
  {
    id: 'voice',
    name: 'The Day You Say Nothing',
    href: '/voice/',
    line: 'You are a voice in Halil’s head during his first Ramadan as a widower. He hears you, then decides.',
    shows: 'routines and trust that last',
  },
  {
    id: 'watch',
    name: 'The Night Watch',
    href: '/watch/',
    line: 'Keep the watch of a walled village, winter after winter, across generations.',
    shows: 'lives across generations',
  },
  {
    id: 'rope',
    name: 'The Rope',
    href: 'https://rope.adamwhite.work',
    line: 'A climb where the body has to last the descent.',
    shows: 'a body that knows it will tire',
    external: true,
  },
  {
    id: 'neighbours',
    name: 'Neighbours',
    href: 'https://neighbours.adamwhite.work',
    line: 'A town of 208 HF people. Change one thing and compare two futures.',
    shows: 'a whole town',
    external: true,
  },
  {
    id: 'repair',
    name: 'Small Works',
    href: 'https://repair.adamwhite.work',
    line: 'A repair workshop where neighbours watch, learn, and agree to help or not.',
    shows: 'learning by watching',
    external: true,
  },
];

const FACULTIES: [string, string][] = [
  ['Body', 'hunger, sleep, injury, illness, tiredness that builds over days'],
  ['Forecast', '“I can do it, but I’ll be spent for the descent”'],
  ['Needs and feelings', 'safety, belonging, rest, meaning, and moods'],
  ['Memory and belief', 'episodes that fade, beliefs with a source'],
  ['Habits and character', 'routines, skills, traits and values that change slowly'],
  ['Will', 'yes, not now, cannot, will not, each with a reason'],
  ['Conscience', 'a person’s own understanding of each norm'],
  ['Inner life', 'a nudge toward good or ill, and looking back on the day'],
  ['Relationships', 'trust, favours, gossip, marriage, grief'],
  ['A whole life', 'birth, upbringing, aging, natural death'],
];

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
            <a className="cta" href="/colony/">
              Play Twice at the Well →
            </a>
            <a href="#play">all six games ↓</a>
          </p>
        </section>

        <section id="play" aria-labelledby="play-title">
          <h2 id="play-title">See it in play</h2>
          <ul className="games">
            {GAMES.map((g) => (
              <li key={g.id}>
                <a className="game" href={g.href}>
                  <span className="game-art">{SKETCHES[g.id]}</span>
                  <span className="game-text">
                    <span className="game-name">
                      {g.name}
                      {g.external && (
                        <span className="game-away" title="Opens another site">
                          {' '}
                          ↗
                        </span>
                      )}
                    </span>
                    <span className="game-line">{g.line}</span>
                    <span className="game-shows">{g.shows}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="note">
            The first three run here. The others are separate sites built on the same package.
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
            Same seed, same life: every choice is deterministic and keeps the reasons that scored it. A person
            is plain JSON you can save and replay.
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
            what a person understands and holds, not rulings. Heart, soul and conscience are never reduced to
            numbers.
          </p>
          <p>
            <a href={`${REPO}/blob/main/research/reconciliation.md`}>How the two are reconciled</a>
          </p>
          <p className="margin">In the games, a prayer at dusk is just a line in the journal.</p>
        </section>
      </main>

      <footer className="foot">
        <span>
          <span aria-hidden="true">◇</span> human framework v{FRAMEWORK_VERSION}
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
