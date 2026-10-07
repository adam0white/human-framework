import { FRAMEWORK_VERSION } from '@adam0white/human-framework';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/theme.css';
import './home.css';
import { SpineDiagram, SpineStack } from './Diagram.tsx';
// The code sample is shown from its own source file, which `sample.test.ts` runs against the real API.
import sampleSource from './sample.ts?raw';
import { SAMPLE_OUTPUT } from './sampleOutput.ts';

/** The release tarball for this framework version; it installs by URL until the package is on npm. */
const TARBALL = `https://github.com/adam0white/human-framework/releases/download/v${FRAMEWORK_VERSION}/adam0white-human-framework-${FRAMEWORK_VERSION}.tgz`;

/** The GitHub mark (Octicons `mark-github`, MIT). */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

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
            after I eat
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

/** Game 3: a stretch of village wall at night, one tower with a watcher, the Keeper's lantern below. */
function WatchScene() {
  return (
    <svg className="scene scene-watch" viewBox="0 0 200 120" aria-hidden="true">
      <rect width="200" height="120" className="watch-sky" />
      {[
        [22, 18],
        [58, 10],
        [150, 14],
        [182, 30],
        [96, 22],
      ].map(([x = 0, y = 0]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" className="watch-star" />
      ))}
      <path d="M0 74h200v46H0z" className="watch-wall" />
      {[0, 20, 40, 60, 80, 120, 140, 160, 180].map((x) => (
        <rect key={x} x={x + 4} y="68" width="12" height="8" className="watch-wall" />
      ))}
      <rect x="86" y="40" width="28" height="80" className="watch-tower" />
      <rect x="83" y="36" width="34" height="6" className="watch-tower" />
      <g transform="translate(100 30)" className="watch-person">
        <rect x="-4" y="-2" width="8" height="10" rx="3.5" />
        <circle cx="0" cy="-6" r="3.6" />
      </g>
      <circle cx="44" cy="100" r="22" className="watch-glow" />
      <g transform="translate(44 100)" className="watch-lantern">
        <rect x="-3.5" y="-5" width="7" height="9" rx="1.5" />
        <path d="M-2 -5a2 2 0 0 1 4 0" fill="none" />
      </g>
    </svg>
  );
}

/** Comments in the sample read muted; everything else stays plain text. The sample has no `//` inside strings. */
function CodeSample({ source }: { source: string }) {
  // The first line is a formatter directive, not part of the example.
  const lines = source
    .trimEnd()
    .split('\n')
    .filter((line) => !line.startsWith('// biome-ignore'));
  return (
    <pre className="code">
      <code>
        {lines.map((line, i) => {
          const at = line.indexOf('//');
          const key = `${i}:${line}`;
          if (at < 0) return <span key={key}>{`${line}\n`}</span>;
          return (
            <span key={key}>
              {line.slice(0, at)}
              <span className="code-comment">{line.slice(at)}</span>
              {'\n'}
            </span>
          );
        })}
      </code>
    </pre>
  );
}

const AREAS: { name: string; body: string }[] = [
  {
    name: 'Body',
    body: 'Hunger, thirst, sleep pressure and the daily rhythm, fatigue and fitness, injury, illness. Choices read the body as the person feels it; health follows the true body.',
  },
  {
    name: 'Needs and feelings',
    body: 'Bodily and psychological needs pull at once: safety, belonging, esteem, autonomy, competence, rest, meaning. Emotions come from appraising events, and mood colours what follows.',
  },
  {
    name: 'Memory and belief',
    body: 'Episodes that fade, attention with a limited budget, beliefs held with credence and a source. Over years, episodes fold into lasting gists, so a fear learned at 20 still counts at 40.',
  },
  {
    name: 'Commitments',
    body: 'Promises, appointments, jobs, goals and abstentions. A duty about to close is protected; purposes left untended fade and are let go.',
  },
  {
    name: 'Conscience',
    body: 'A person holds an understanding of each norm, with its source, not a ruling. Some acts are vetoed, intention is kept apart from the deed, and a breach can bring guilt and repair. Prayer and fasting are quiet parts of life for those who hold them.',
  },
  {
    name: 'Will',
    body: 'Assent with a typed answer for every suggestion, counter-offers, trust and pressure per voice, and direct command when a host needs it. Self-control comes from habits, values and effort, not a willpower fuel.',
  },
  {
    name: 'Skills, habits, character',
    body: 'Practice with diminishing gains, rust, teaching and learning by watching. Habits form on cues and fade without them. HEXACO traits and Schwartz values weight choices and shift slowly with age.',
  },
  {
    name: 'Relationships',
    body: 'Affection, trust and respect between two people, favours owed, gossip and lies, grief. Impressions of how others feel, which can be wrong. Courtship, marriage and widowhood.',
  },
  {
    name: 'A whole life',
    body: 'Aging, heredity of temperament, upbringing, pregnancy and birth, chronic illness and natural death. Years run a day at a time, and parents’ stories reach their children.',
  },
  {
    name: 'Surroundings',
    body: 'Cold, darkness, crowding, weather and day length shift mood, body and needs by small, bounded amounts.',
  },
];

function Home() {
  return (
    <div className="page">
      <header className="nav">
        <a className="wordmark" href="/">
          <span className="wordmark-mark" aria-hidden="true" />
          <span className="wordmark-long">Human Framework</span>
          <abbr className="wordmark-short" title="Human Framework">
            HF
          </abbr>
        </a>
        <nav aria-label="Sections">
          <a href="#models">Models</a>
          <a href="#use">Use</a>
          <a href="#examples">Examples</a>
          <a className="nav-github" href="https://github.com/adam0white/human-framework" aria-label="GitHub">
            <GitHubMark />
            <span className="nav-github-label">GitHub</span>
          </a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">HF · Human Framework · v{FRAMEWORK_VERSION}</p>
          <h1>
            Simulated people who <em>decide</em>.
          </h1>
          <p className="lede">
            HF is a deterministic TypeScript framework for simulating people. Each person weighs what they are
            told against their own needs, habits, duties and trust, then says yes, not now, or no, and can
            tell you why.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#use">
              See it in code <span aria-hidden="true">→</span>
            </a>
            <a className="button button-ghost" href="#examples">
              Play the three examples
            </a>
          </div>
          <div className="hero-scenes" aria-hidden="true">
            <figure>
              <WellScene variant="classic" />
              <figcaption>Classic units: they obey</figcaption>
            </figure>
            <figure>
              <WellScene variant="human" />
              <figcaption>HF people: they decide</figcaption>
            </figure>
          </div>
        </section>

        <section className="idea" id="idea">
          <div className="section-head">
            <p className="eyebrow">The core idea</p>
            <h2>Urge → Assent → Act</h2>
            <p>
              At each decision, every pull on a person becomes a scored term. They assent to one course of
              action, or turn down what was suggested, and act. The host world resolves what actually happens,
              and the outcome feeds back into their body, memory, skills, relationships and trust in whoever
              advised them.
            </p>
          </div>
          <div className="diagram-card">
            <SpineDiagram />
            <SpineStack />
          </div>

          <div className="principles">
            <article>
              <h3>A suggestion is not a deed</h3>
              <p>A refusal always has a type, so it never reads as a bug:</p>
              <p className="verdicts">
                <Verdict kind="assent">yes</Verdict>
                <Verdict kind="notnow">not now: after I eat</Verdict>
                <Verdict kind="cannot">cannot: hurt</Verdict>
                <Verdict kind="willnot">will not: it is theft</Verdict>
              </p>
            </article>
            <article>
              <h3>Every choice explains itself</h3>
              <p>
                Each decision keeps its top options and the terms that scored them: needs, duties, promises,
                emotions, friends, effort, risk, and the suggestion. A game can show that breakdown as it is.
              </p>
              <div className="mini-bars" aria-hidden="true">
                <span style={{ width: '34%', background: 'var(--fam-norm)' }} />
                <span style={{ width: '22%', background: 'var(--fam-commitment)' }} />
                <span style={{ width: '18%', background: 'var(--fam-suggestion)' }} />
                <span style={{ width: '12%', background: 'var(--fam-need)' }} />
              </div>
            </article>
            <article>
              <h3>Ask before you act</h3>
              <p>
                <code>predict</code> answers “what would they say?” without changing the person or drawing
                randomness, so a game can hint at an answer before the player commits.
              </p>
            </article>
          </div>
        </section>

        <section className="models" id="models">
          <div className="section-head">
            <p className="eyebrow">What HF models</p>
            <h2>One person, many faculties</h2>
            <p>
              Each area is a module that owns its slice of the person’s state. Some faculties are complete and
              others partial or opt-in; HF keeps a faculty-by-faculty inventory of what is done, partial and
              missing.
            </p>
          </div>
          <div className="area-grid">
            {AREAS.map((a) => (
              <article key={a.name}>
                <h3>{a.name}</h3>
                <p>{a.body}</p>
              </article>
            ))}
          </div>
          <p className="fine">
            Parameters are engineering defaults chosen for plausible behaviour at game time scales. Where a
            published finding informs a shape (the two-process sleep model, the power-law practice curve,
            exponential forgetting, OCC appraisal, HEXACO, Schwartz values), the module names it. They are not
            calibrated predictions of human behaviour. Space, travel, inventory and economy belong to the host
            game.
          </p>
          <p className="fine">
            Not modelled yet: planning several steps ahead, inference between beliefs, culture and norms
            spreading through a community, divorce.
          </p>
        </section>

        <section className="props" id="properties">
          <div className="section-head">
            <p className="eyebrow">Properties</p>
            <h2>Built to be replayed and inspected</h2>
          </div>
          <dl className="prop-grid">
            <div>
              <dt>Deterministic</dt>
              <dd>
                All randomness comes from seeded streams held in the person’s state. Same seed and same
                inputs, same life.
              </dd>
            </div>
            <div>
              <dt>Replayable</dt>
              <dd>
                HF saves a person as a JSON snapshot. Each example game adds the seed and the player’s input
                log, so its playtest file replays the run exactly.
              </dd>
            </div>
            <div>
              <dt>Plain JSON</dt>
              <dd>
                A person is plain data: no classes, no closures. <code>restore</code> checks every value
                against its bounds and upgrades saves from older engine versions.
              </dd>
            </div>
            <div>
              <dt>Lives over decades</dt>
              <dd>
                People age, court, marry, raise children and die of natural causes. A settlement of 25 people
                runs 50 years in about 3.5 seconds in the project’s benchmark.
              </dd>
            </div>
          </dl>
        </section>

        <section className="use" id="use">
          <div className="section-head">
            <p className="eyebrow">How you use it</p>
            <h2>The host offers, the person decides</h2>
            <p>
              Your game describes what a person can do right now as affordances. HF chooses, or answers a
              suggestion; your game resolves what happened and reports it back. HF has no UI and no LLM in the
              loop.
            </p>
          </div>
          <div className="use-grid">
            <div className="use-code">
              <CodeSample source={sampleSource} />
              <div className="code-output">
                <p className="code-output-head">Returns</p>
                <p>
                  <code>answer</code>: {SAMPLE_OUTPUT.verdict} / {SAMPLE_OUTPUT.kind} ({SAMPLE_OUTPUT.reason}
                  ), “{SAMPLE_OUTPUT.says}”
                </p>
                <p>
                  <code>record</code>: she waits. Stealing scored highest ({SAMPLE_OUTPUT.stealScore}:{' '}
                  {SAMPLE_OUTPUT.stealTerms.map(([source, value]) => `${source} ${value}`).join(', ')}), and
                  her own norm vetoed it.
                </p>
              </div>
            </div>
            <div>
              <ol className="steps">
                <li>
                  <strong>
                    <code>createPerson</code>
                  </strong>{' '}
                  from a spec: seed, birth, body, traits, values, norms, relationships, the voices they hear.
                </li>
                <li>
                  <strong>Offer affordances</strong>: actions with a duration, an effort and advertised
                  effects, tagged with the norms they touch.
                </li>
                <li>
                  <strong>
                    <code>predict</code>
                  </strong>{' '}
                  previews an answer; <code>decide</code> makes and records a choice with every scored term.
                </li>
                <li>
                  <strong>Run the activity</strong>: <code>begin</code> it, <code>tick</code> the clock, and{' '}
                  <code>finish</code> with the outcome your world resolved. Body, memory, skills and trust
                  update.
                </li>
                <li>
                  <strong>
                    <code>stepCommunity</code>
                  </strong>{' '}
                  runs that loop for a whole village against your <code>World</code>;{' '}
                  <code>liveCommunity</code> steps decades a day at a time.
                </li>
              </ol>
              <dl className="facts">
                <div>
                  <dt>Runtime</dt>
                  <dd>Plain ES modules, no runtime dependencies; Node 24+ or a modern browser.</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {FRAMEWORK_VERSION}, used by the three games below. Open source on{' '}
                    <a href="https://github.com/adam0white/human-framework">GitHub</a>: code under MIT, docs
                    and research under CC BY 4.0. Not on npm yet; install the{' '}
                    <a
                      href={`https://github.com/adam0white/human-framework/releases/tag/v${FRAMEWORK_VERSION}`}
                    >
                      release
                    </a>{' '}
                    tarball:
                    <code className="install">npm install {TARBALL}</code>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <p className="fine">
            The example is the page’s own source file, type-checked and run against{' '}
            <code>@adam0white/human-framework</code> {FRAMEWORK_VERSION} by the test suite, which also checks
            the output printed under it.
          </p>
        </section>

        <section className="games" id="examples">
          <div className="section-head">
            <p className="eyebrow">Three examples</p>
            <h2>Games built on HF</h2>
            <p>Each one is built to show a different part of the framework. All three run in the browser.</p>
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
                  Six villagers, two days, one well, one storm, played twice side by side with the same
                  orders.
                </p>
                <p className="game-shows">
                  <strong>Shows the will:</strong> on the left, colony-sim units obey; on the right, the same
                  village weighs each order against hunger, fear and friends.
                </p>
                <span className="game-cta">
                  Play <span aria-hidden="true">→</span>
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
                  he decides.
                </p>
                <p className="game-shows">
                  <strong>Shows habits and trust:</strong> routines that lost their cue, grief in memory, and
                  how far he trusts you. On the last day you go silent and see what stayed.
                </p>
                <span className="game-cta">
                  Play <span aria-hidden="true">→</span>
                </span>
              </div>
            </a>
            <a className="game-card game-live" href="/watch/">
              <div className="game-art">
                <WatchScene />
              </div>
              <div className="game-body">
                <p className="game-kicker">Game 3 · endless, winter after winter</p>
                <h3>The Night Watch</h3>
                <p>Keep the watch of a small walled village across generations.</p>
                <p className="game-shows">
                  <strong>Shows a whole life:</strong> watchers refuse posts, learn courage, marry, raise
                  children who inherit their stories, grow old and die.
                </p>
                <span className="game-cta">
                  Play <span aria-hidden="true">→</span>
                </span>
              </div>
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>
          HF (Human Framework) v{FRAMEWORK_VERSION} · <code>@adam0white/human-framework</code> ·{' '}
          <a href="https://github.com/adam0white/human-framework">GitHub</a>
        </span>
        <span>Deterministic · explainable · no UI or LLM in the loop</span>
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
