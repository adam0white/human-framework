import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../home/home.css';
import './lab.css';
import curatedFallback from './curated.json' with { type: 'json' };
import { EXPERIMENTS } from './experiments.ts';
import { LAB_GAMES } from './games.ts';
import type { Curated, CuratedGame, LedgerRow } from './ledger.ts';

/**
 * The lab dashboard at /lab/. Reads /lab/data.json (the lab Worker: curated feedback plus live builds and
 * anonymous event aggregates). Four readers: builders and agents, playtesters, the owner, and visitors.
 * Public views show aggregates and triaged quotes only. Without the Worker (local dev) it shows the curated
 * part bundled at build time and says so.
 */

type Telemetry = {
  sessions: number;
  ended: number;
  minutes: number[];
  milestones: [string, number][];
  quits: [string, number][];
  errors: [string, number][];
  viewports: Record<string, number>;
  builds: [string, number][];
};
type Live = { commit?: string; framework?: string; app?: string; dirty?: boolean } | null;
type GameData = CuratedGame & { live: Live; telemetry: Telemetry | null; runs: number };
type LabData = Omit<Curated, 'routes'> & {
  generated: string;
  curatedAt: string;
  window: { days: number; from: string; to: string; sampled: boolean };
  games: GameData[];
  totals: { sessions: number; runs: number; feedback: number };
};

const REPO = 'https://github.com/adam0white/human-framework/blob/main/';
const MINUTE_LABELS = ['under 1 min', '1–5 min', '5–15 min', '15–60 min', 'over an hour'];

function fallback(): LabData {
  const c = curatedFallback as Curated;
  return {
    ...c,
    curatedAt: c.generated,
    window: { days: 7, from: '', to: '', sampled: false },
    games: LAB_GAMES.map((g) => ({ ...g, live: null, telemetry: null, runs: 0 })),
    totals: { sessions: 0, runs: 0, feedback: c.ledger.length },
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const latestFirst = (a: LedgerRow, b: LedgerRow) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);

function Quote({ row }: { row: LedgerRow }) {
  return (
    <figure className="quote">
      <blockquote>{row.words}</blockquote>
      <figcaption>
        {row.who}
        {row.kind !== 'owner' && row.kind !== 'human' ? ` (${row.kind})` : ''}, {row.game}, {row.date}
        {row.verdict !== '-' ? <span className={`verdict v-${row.verdict}`}> · {row.verdict}</span> : null}{' '}
        <span className="soft">{row.id}</span>
      </figcaption>
    </figure>
  );
}

function GameCard({ g, ledger }: { g: GameData & (typeof LAB_GAMES)[number]; ledger: LedgerRow[] }) {
  const quotes = ledger.filter((r) => r.game === g.id && r.kind !== 'owner').sort(latestFirst);
  const owner = ledger.filter((r) => r.game === g.id && r.kind === 'owner').sort(latestFirst);
  const t = g.telemetry;
  const external = /^https?:/.test(g.href);
  return (
    <article className="lab-game" id={`game-${g.id}`}>
      <h3>
        <a href={g.href}>{g.name}</a> {g.status === 'frozen' && <span className="soft">· frozen </span>}
        <span className="soft">{external ? new URL(g.href).host : g.href}</span>
      </h3>
      <p className="build">
        {g.live ? (
          <>
            live build <code>{g.live.commit?.slice(0, 7) ?? '?'}</code>
            {g.live.dirty ? ' (built from uncommitted changes)' : ''} · HF {g.live.framework ?? '?'}
            {g.live.app ? ` · game ${g.live.app}` : ''}
          </>
        ) : (
          <span className="soft">live build not read</span>
        )}
      </p>
      {t ? (
        <dl className="numbers">
          <div>
            <dt>sessions</dt>
            <dd>
              {t.sessions} ({t.ended} closed the page)
            </dd>
          </div>
          <div>
            <dt>how long</dt>
            <dd>
              {t.minutes
                .map((n, i) => (n ? `${MINUTE_LABELS[i]}: ${n}` : ''))
                .filter(Boolean)
                .join(' · ')}
            </dd>
          </div>
          {t.quits.length ? (
            <div>
              <dt>last screen</dt>
              <dd>{t.quits.map(([s, n]) => `${s} (${n})`).join(' · ')}</dd>
            </div>
          ) : null}
          {t.milestones.length ? (
            <div>
              <dt>milestones</dt>
              <dd>{t.milestones.map(([s, n]) => `${s} (${n})`).join(' · ')}</dd>
            </div>
          ) : null}
          {t.errors.length ? (
            <div>
              <dt>errors</dt>
              <dd className="errs">{t.errors.map(([s, n]) => `${s} (${n})`).join(' · ')}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="soft">No anonymous play events in this window.</p>
      )}
      <p className="soft">
        {g.runs ? `${plural(g.runs, 'run')} sent to the notebook this week` : 'No runs sent this week'}
      </p>
      {owner[0] ? <Quote row={owner[0]} /> : null}
      {quotes.slice(0, 2).map((r) => (
        <Quote key={r.id} row={r} />
      ))}
    </article>
  );
}

function Lab() {
  const [data, setData] = useState<LabData>(fallback);
  const [live, setLive] = useState<'loading' | 'live' | 'offline'>('loading');
  useEffect(() => {
    fetch('/lab/data.json', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<LabData>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        setData(d);
        setLive('live');
      })
      .catch(() => setLive('offline'));
  }, []);

  const ledger = data.ledger;
  const recent = [...ledger].sort(latestFirst);
  const ownerWords = recent.filter((r) => r.kind === 'owner').slice(0, 3);
  const playerWords = recent.filter((r) => r.kind !== 'owner' && r.verdict !== '-').slice(0, 4);
  const asksBy = (id: string) => data.asks.filter((a) => a.game === id);
  // Use the current ranking and status even while data.json is cached from an older build.
  const games = LAB_GAMES.map((g) => ({
    live: null,
    telemetry: null,
    runs: 0,
    ...data.games.find((d) => d.id === g.id),
    ...g,
  }));
  const gamesWithAsks = games.filter((g) => asksBy(g.id).length);

  return (
    <div className="page lab">
      <header className="top">
        <a className="mark" href="/">
          <span aria-hidden="true">◇</span> human framework
        </a>
        <a className="top-link" href="/games/">
          All games
        </a>
      </header>
      <main>
        <section className="hero" aria-labelledby="lab-title">
          <h1 id="lab-title">The lab</h1>
          <p className="lede">
            Every game here is built on the same framework of simulated people. This page keeps what the games
            are learning from the people who play them: real players, the owner, and simulated playtesters.
          </p>
          <p className="soft">
            {live === 'loading'
              ? 'Reading the notebook…'
              : live === 'offline'
                ? 'Live numbers are unavailable; showing the triaged feedback only.'
                : `Last ${data.window.days} days: ${plural(data.totals.sessions, 'anonymous session')}, ${plural(data.totals.runs, 'run')} sent by players who chose to. ${plural(data.totals.feedback, 'piece')} of feedback triaged.`}
            {data.window.sampled ? ' Some days were sampled.' : ''}
          </p>
          <nav className="jump" aria-label="On this page">
            <a href="#learning">what we are learning</a>
            <a href="#try">try next</a>
            <a href="#games">games</a>
            <a href="#builders">for builders</a>
            <a href="#owner">for the owner</a>
          </nav>
        </section>

        <section id="learning" aria-labelledby="learning-title">
          <h2 id="learning-title">What the lab is learning</h2>
          <p>
            Each piece of feedback gets an id and is routed once to every place it helps: a fix for one game,
            a lesson for every game, a request to the framework, or a correction to the simulated playtesters.
            These are the lessons so far. Every game builder reads them before starting.
          </p>
          {data.lessons.length ? (
            <ol className="lessons">
              {data.lessons.map((l) => (
                <li key={l.id}>
                  <strong>{l.title.replace(/\.$/, '')}.</strong> {l.text} <span className="soft">{l.id}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="soft">No lessons recorded yet.</p>
          )}
          {ownerWords.length ? (
            <>
              <h3>The owner, playing</h3>
              {ownerWords.map((r) => (
                <Quote key={r.id} row={r} />
              ))}
            </>
          ) : null}
          {playerWords.length ? (
            <>
              <h3>Playtesters, most recent</h3>
              {playerWords.map((r) => (
                <Quote key={r.id} row={r} />
              ))}
            </>
          ) : null}
        </section>

        <section id="try" aria-labelledby="try-title">
          <h2 id="try-title">Try next</h2>
          <p>
            If you are playtesting, these are what each game wants tested now. When you finish, use the game’s
            “send this run to the notebook” and say what you felt in the note.
          </p>
          {gamesWithAsks.length ? (
            gamesWithAsks.map((g) => (
              <div key={g.id} className="try">
                <h3>
                  <a href={g.href}>{g.name}</a>
                </h3>
                <ul>
                  {asksBy(g.id).map((a) => (
                    <li key={a.ask}>
                      {a.ask}
                      {a.why ? <span className="soft"> ({a.why})</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="soft">No testing asks recorded yet.</p>
          )}
        </section>

        <section id="games" aria-labelledby="games-title">
          <h2 id="games-title">Games</h2>
          {games.map((g) => (
            <GameCard key={g.id} g={g} ledger={ledger} />
          ))}
        </section>

        <section id="experiments" aria-labelledby="experiments-title">
          <h2 id="experiments-title">Experiments</h2>
          <p>Research runs, not games. Each has a write-up with what was measured and what it cost.</p>
          {EXPERIMENTS.map((x) => (
            <div key={x.id} className="try">
              <h3>
                <a href={x.href}>{x.name}</a>{' '}
                <span className="soft">
                  ({x.date}, {x.status})
                </span>
              </h3>
              <p>
                {x.line} <a href={x.writeup}>Write-up</a>
              </p>
            </div>
          ))}
        </section>

        <section id="builders" aria-labelledby="builders-title">
          <h2 id="builders-title">For builders and agents</h2>
          <ul>
            <li>
              Machine-readable: <a href="/lab/data.json">/lab/data.json</a> (live builds, aggregates, ledger,
              lessons, asks, HF requests; cached five minutes).
            </li>
            <li>
              Before starting a game, read <a href={`${REPO}docs/lab/lessons.md`}>the lessons</a>. Add
              feedback to <a href={`${REPO}docs/lab/feedback-ledger.md`}>the ledger</a>, then run{' '}
              <code>npm run lab:ledger</code>.
            </li>
            <li>
              Add the client to a game: <a href={`${REPO}packages/lab-client/README.md`}>lab-client README</a>
              .
            </li>
          </ul>
          <h3>HF requests raised by feedback</h3>
          {data.hfRequests.length ? (
            <ul>
              {data.hfRequests.map((h) => (
                <li key={h.ref}>
                  <code>{h.ref}</code>{' '}
                  <span className="soft">
                    ({h.games.join(', ')}; {h.from.join(', ')})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="soft">None routed yet.</p>
          )}
        </section>

        <section id="owner" aria-labelledby="owner-title">
          <h2 id="owner-title">For the owner</h2>
          <p>
            Runs and notes sent to the notebook are private. They are not on this page or in data.json. Read
            them on your own machine with <code>npm run lab:inbox</code>, which downloads each run and note
            from the private bucket and writes a local page with a file to load in the game’s “Replay a run
            file”.
          </p>
          <p>
            To send your own run with a note: in a game, open its menu, choose “Send this run to the
            notebook”, write the note and put <em>owner</em> in “who you are”.
          </p>
        </section>
      </main>
      <footer className="foot">
        <a href="/lab/privacy/">how the lab handles data</a>
        <a href="/games/">
          <span aria-hidden="true">◇</span> All games
        </a>
      </footer>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Lab />
    </StrictMode>,
  );
}
