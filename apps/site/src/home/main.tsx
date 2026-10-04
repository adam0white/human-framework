import { FRAMEWORK_VERSION } from '@human/framework';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/theme.css';
import './home.css';
import { SpineDiagram } from './Diagram.tsx';

const GRID_X = [0, 25, 50, 75, 100, 125, 150, 175, 200];
const GRID_Y = [0, 25, 50, 75, 100];

function Verdict({ kind, children }: { kind: 'assent' | 'notnow' | 'willnot' | 'cannot'; children: string }) {
  return <span className={`verdict verdict-${kind}`}>{children}</span>;
}

function WellScene({ variant }: { variant: 'classic' | 'human' }) {
  const human = variant === 'human';
  return (
    <svg className={`scene scene-${variant}`} viewBox="0 0 200 120" aria-hidden="true">
      <rect width="200" height="120" className="scene-ground" />
      {!human && (
        <g className="scene-grid">
          {GRID_X.map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="120" />
          ))}
          {GRID_Y.map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="200" y2={y} />
          ))}
        </g>
      )}
      <rect x="18" y="16" width="44" height="34" rx="3" className="scene-house" />
      <rect x="132" y="66" width="48" height="36" rx="3" className="scene-house" />
      <circle cx="104" cy="58" r="13" className="scene-apron" />
      <circle cx="104" cy="58" r="6.5" className="scene-water" />
      {[
        [70, 84],
        [118, 30],
        [150, 40],
      ].map(([x = 0, y = 0]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`} className="scene-person">
          <ellipse cx="0" cy="12" rx="6" ry="2" className="scene-shadow" />
          <rect x="-4.5" y="-2" width="9" height="13" rx="4" />
          <circle cx="0" cy="-6" r="4" />
        </g>
      ))}
      {human && (
        <g className="scene-bubble">
          <rect x="116" y="2" width="80" height="20" rx="6" />
          <rect x="116" y="2" width="3" height="20" rx="1.5" className="scene-rule" />
          <text x="123" y="15.5">
            after Maghrib
          </text>
        </g>
      )}
    </svg>
  );
}

function CrescentPage() {
  return (
    <svg className="scene scene-voice" viewBox="0 0 200 120" aria-hidden="true">
      <rect width="200" height="120" className="voice-sky" />
      <path d="M108 14a19 19 0 1 0 14 32A16 16 0 0 1 108 14z" className="voice-moon" />
      <g transform="rotate(-4 100 92)">
        <rect x="46" y="62" width="108" height="66" rx="3" className="voice-page" />
        {[76, 86, 96, 106].map((y) => (
          <line key={y} x1="56" y1={y} x2="144" y2={y} className="voice-rule" />
        ))}
        <path d="M58 74c10-3 22-3 34 0" className="voice-ink" />
        <path d="M58 84c16-2 30-2 50 0" className="voice-ink" />
        <path d="M58 94c8-2 16-2 26 0" className="voice-ink voice-ink-you" />
      </g>
    </svg>
  );
}

function Home() {
  return (
    <div className="page">
      <header className="nav">
        <a className="wordmark" href="/">
          <span className="wordmark-mark" aria-hidden="true" />
          Human Framework
        </a>
        <nav aria-label="Sections">
          <a href="#idea">The idea</a>
          <a href="#games">Games</a>
          <a href="#notes">Model notes</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Human Framework · v{FRAMEWORK_VERSION}</p>
          <h1>
            Simulated people who <em>decide</em>.
          </h1>
          <p className="lede">
            A deterministic, explainable framework for people in simulations. Hunger, duty, habit, fear,
            friendship and memory all pull at once. Your voice is one more pull, never a command. Each person
            weighs those pulls, then says yes, not now, or no, and can tell you why.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/colony/">
              Play <em>Twice at the Well</em>
              <span aria-hidden="true">→</span>
            </a>
            <a className="button button-ghost" href="/voice/">
              Play <em>The Day You Say Nothing</em>
            </a>
            <a className="button button-ghost" href="#idea">
              How it works
            </a>
          </div>
          <div className="hero-scenes" aria-hidden="true">
            <figure>
              <WellScene variant="classic" />
              <figcaption>Classic: they obey</figcaption>
            </figure>
            <figure>
              <WellScene variant="human" />
              <figcaption>Human: they decide</figcaption>
            </figure>
          </div>
        </section>

        <section className="idea" id="idea">
          <div className="section-head">
            <p className="eyebrow">The spine</p>
            <h2>Urge → Assent → Act</h2>
            <p>
              At each decision, every pull becomes a scored term. The person assents to one course of action,
              or turns down what was suggested, and acts. The world resolves what actually happens, and the
              outcome feeds back into their body, memory, skills, relationships and trust in whoever advised
              them.
            </p>
          </div>
          <div className="diagram-card">
            <SpineDiagram />
          </div>

          <div className="principles">
            <article>
              <h3>A suggestion is not a deed</h3>
              <p>A refusal always has a type, so it never reads as a bug:</p>
              <p className="verdicts">
                <Verdict kind="assent">yes</Verdict>
                <Verdict kind="notnow">not now: after I eat</Verdict>
                <Verdict kind="cannot">cannot: hurt</Verdict>
                <Verdict kind="willnot">will not: everyone goes hungry</Verdict>
              </p>
            </article>
            <article>
              <h3>Every choice explains itself</h3>
              <p>
                Each decision keeps its top options and the terms that scored them: needs, duties, promises,
                emotions, friends, effort, risk, and your suggestion. Tap any bubble to see the breakdown.
              </p>
              <div className="mini-bars" aria-hidden="true">
                <span style={{ width: '34%', background: 'var(--fam-norm)' }} />
                <span style={{ width: '22%', background: 'var(--fam-commitment)' }} />
                <span style={{ width: '18%', background: 'var(--fam-suggestion)' }} />
                <span style={{ width: '12%', background: 'var(--fam-need)' }} />
              </div>
            </article>
            <article>
              <h3>Same seed, same life</h3>
              <p>
                All randomness comes from seeded streams. A save is a snapshot plus the input log, so any run
                can be replayed exactly and any surprising choice can be inspected.
              </p>
            </article>
          </div>
        </section>

        <section className="games" id="games">
          <div className="section-head">
            <p className="eyebrow">Games</p>
            <h2>Experiments that show the framework</h2>
            <p>Short, disposable games built to test one claim each.</p>
          </div>
          <div className="game-grid">
            <a className="game-card game-live" href="/colony/">
              <div className="game-art">
                <WellScene variant="human" />
              </div>
              <div className="game-body">
                <p className="game-kicker">Game 1 · about three minutes</p>
                <h3>Twice at the Well</h3>
                <p>
                  Six villagers, two days, one well, one storm. You give the same orders to the same village
                  twice, side by side. On the left they obey like colony-sim units. On the right they are
                  people.
                </p>
                <span className="game-cta">
                  Play now <span aria-hidden="true">→</span>
                </span>
              </div>
            </a>
            <a className="game-card game-live" href="/voice/">
              <div className="game-art">
                <CrescentPage />
              </div>
              <div className="game-body">
                <p className="game-kicker">Game 2 · about fifteen minutes</p>
                <h3>The Day You Say Nothing</h3>
                <p>
                  You are a voice in Halil’s head for the first Ramadan since his wife died. He hears you, and
                  he decides. On Eid you go silent and watch what he does on his own.
                </p>
                <span className="game-cta">
                  Play now <span aria-hidden="true">→</span>
                </span>
              </div>
            </a>
            <a className="game-card game-live game-soon" href="/watch/">
              <div className="game-art game-art-soon" aria-hidden="true">
                ☾
              </div>
              <div className="game-body">
                <p className="game-kicker">Game 3 · early prototype</p>
                <h3>The Night Watch</h3>
                <p>
                  Keep the watch of a small walled village. Post the watchers at dusk against the scout’s
                  warning, carry the lantern at night. In this first cut the watchers always obey; people come
                  next.
                </p>
                <span className="game-cta">
                  Try the prototype <span aria-hidden="true">→</span>
                </span>
              </div>
            </a>
          </div>
        </section>

        <section className="notes" id="notes">
          <details>
            <summary>Model notes and limitations</summary>
            <div className="notes-body">
              <p>
                Parameters are engineering defaults chosen for plausible behaviour at game time scales. Where
                a published finding informs a shape, the module names it: the two-process sleep model, the
                power-law practice curve, exponential forgetting, OCC appraisal, HEXACO, Schwartz values. The
                parameters are not calibrated predictions of human behaviour.
              </p>
              <p>
                The structure follows a distinction in the project’s Islamic foundations: an internal
                suggestion is not yet a deed, responsibility attaches to deliberate assent and is bounded by
                capacity, and intention is recorded separately from the outward act. The software does not
                compute divine acceptance or give theological names to mechanisms. Norms come from a host
                catalogue with provenance; a person holds an understanding of each norm, and that
                understanding is not a ruling.
              </p>
              <p>
                Decisions read the perceived body; performance and health use the true body. Traits scale
                terms and never branch logic. Trust is a relation to a voice, never a measure of a person’s
                worth.
              </p>
            </div>
          </details>
        </section>
      </main>

      <footer className="footer">
        <span>Human Framework v{FRAMEWORK_VERSION}</span>
        <span>Deterministic · explainable · UI- and LLM-independent</span>
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
