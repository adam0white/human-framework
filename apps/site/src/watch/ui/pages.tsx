/**
 * The year's pages around the winter (G3-3): the open seasons (date, volume, granary, the people and a season card
 * when one is open), the fair, the thaw, a closed volume and a fallen village, plus the live chronicle strip over the
 * map. Everything is words and drawn values; choices that cannot be undone say so on the page.
 */
import { useState } from 'react';
import type { SeasonCard } from '../sim/state.ts';
import type { Frame, FrameVillager, FrameVolume } from '../sim/view.ts';
import { ExportButtons } from './exporting.tsx';
import { Icon } from './icons.tsx';
import { Impressions, Sacks } from './parts.tsx';
import type { WatchActions } from './useWatch.ts';
import { epilogueText, metWords, ordinalWord, picksWords, rootsWords } from './words.ts';

const SEASON_WORDS: Record<Frame['season'], string> = {
  winter: 'winter',
  spring: 'spring',
  summer: 'summer',
  autumn: 'autumn',
};

/** The latest chronicle lines over the map, newest first; each fades in as it is written. */
export function ChronicleStrip({ frame }: { frame: Frame }) {
  const lines = frame.chronicle.slice(-5).reverse();
  if (lines.length === 0) return null;
  return (
    <ol className="w-strip" aria-label="The chronicle, newest first" aria-live="off">
      {lines.map((l) => (
        <li key={`${l.year}-${l.minute}-${l.text}`} className={`w-strip-line w-strip-${l.kind}`}>
          {l.text}
        </li>
      ))}
    </ol>
  );
}

function VolumeLine({ v }: { v: FrameVolume }) {
  return (
    <p className="w-kicker">
      Volume {v.numeral} · {v.title}
    </p>
  );
}

/** A season card: a proposal the Keeper may speak to. Play slows while it is open; doing nothing is allowed. */
export function SeasonCardView({ card, actions }: { card: SeasonCard; actions: WatchActions }) {
  return (
    <section className="w-moment w-card" aria-label="A matter for the Keeper">
      <p className="w-moment-text">{card.text}</p>
      <p className="w-card-read">{card.read}</p>
      <div className="w-moment-options">
        {card.options.map((o) => (
          <button
            key={o.id}
            type="button"
            className="w-option"
            onClick={() => actions.input({ k: 'card', id: card.id, choice: o.id })}
          >
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      <p className="w-moment-let">…or say nothing; they will decide alone. The days slow while you think.</p>
    </section>
  );
}

function PersonCard({ v }: { v: FrameVillager }) {
  const facts = [
    v.ageWords,
    v.spouse ? `married to ${v.spouse}` : null,
    v.family,
    rootsWords(v.bornHere, v.gen),
    v.limp ? 'walks with a stick' : null,
  ].filter((x): x is string => !!x);
  return (
    <li className={v.watcher ? 'w-villager is-watcher' : 'w-villager'}>
      <span className="w-person-head">
        <span className="w-person-name">{v.name}</span>
        {v.watcher ? <span className="w-badge">stands the wall</span> : null}
      </span>
      <span className="w-person-note">{facts.join(' · ')}</span>
      {v.impressions.length > 0 ? <Impressions impressions={v.impressions} /> : null}
    </li>
  );
}

/** The village's people: watchers first, then by age. Open by default on wide screens, folded on phones. */
export function People({ frame }: { frame: Frame }) {
  const [wide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900);
  const watchers = frame.villagers.filter((v) => v.watcher).length;
  return (
    <details className="w-people" open={wide}>
      <summary>
        <Icon name="users" size={16} /> The village
        <span className="w-note">
          {' '}
          · {frame.villagers.length === 1 ? 'one soul' : 'its people'},{' '}
          {watchers === 0 ? 'none at the wall' : watchers === 1 ? 'one at the wall' : 'some at the wall'}
        </span>
      </summary>
      <ul className="w-villagers">
        {frame.villagers.map((v) => (
          <PersonCard key={v.id} v={v} />
        ))}
      </ul>
    </details>
  );
}

/** Spring, summer and autumn: a continuous clock of days. */
export function SeasonPanel({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  return (
    <div className="w-season">
      {frame.card ? <SeasonCardView key={frame.card.id} card={frame.card} actions={actions} /> : null}
      <VolumeLine v={frame.volume} />
      <h2 className="w-season-date">{frame.date}</h2>
      <p className="w-note w-question">{frame.volume.question}</p>
      {frame.year <= 2 ? (
        <p className="w-note w-speed-hint">
          The days run on their own. <strong>Days</strong> and <strong>Seasons</strong>, in the top bar, carry
          the year faster; a matter for you slows it while you read.
        </p>
      ) : null}
      <div className="w-granary">
        <span>The granary</span>
        <Sacks have={frame.grain} lost={0} label="The granary, drawn as sacks" />
      </div>
      <People frame={frame} />
    </div>
  );
}

/** Autumn's fair: two or three choices that draw on the granary and cannot be undone. */
export function FairPage({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const fair = frame.fair;
  if (!fair) return null;
  return (
    <div className="w-page w-fair">
      <p className="w-kicker">{frame.date}</p>
      <h2>The fair</h2>
      <p>
        Traders and families come up the valley. What you take here is paid from the granary and{' '}
        <strong>cannot be undone</strong>.
      </p>
      <p className="w-picks">
        {fair.picksLeft <= 0
          ? picksWords(0)
          : 'Take as many as the granary can spare: the winter still has to be eaten through.'}
      </p>
      <div className="w-granary">
        <span>The granary</span>
        <Sacks have={frame.grain} lost={0} label="The granary, drawn as sacks" />
      </div>
      <ul className="w-offers">
        {fair.offers.map((o) => (
          <li key={o.id} className={o.taken ? 'w-offer is-taken' : 'w-offer'}>
            <h3>{o.label}</h3>
            <p>{o.text}</p>
            {!o.taken && o.affordable && o.after < frame.grain ? (
              <div className="w-offer-after">
                <span className="w-note">The granary after it</span>
                <Sacks have={o.after} lost={frame.grain - o.after} label="The granary if you take it" />
              </div>
            ) : null}
            {o.taken ? (
              <p className="w-taken">Taken. It stands.</p>
            ) : (
              <>
                <button
                  type="button"
                  className="w-secondary"
                  disabled={!o.affordable}
                  onClick={() => actions.input({ k: 'fair', pick: o.id })}
                >
                  Take it, for good
                </button>
                {!o.affordable ? (
                  <p className="w-note">
                    {o.named
                      ? 'You have named an heir.'
                      : fair.picksLeft <= 0
                        ? 'No more choices this year.'
                        : 'The granary cannot spare it.'}
                  </p>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="w-primary" onClick={() => actions.input({ k: 'continue' })}>
        Leave the fair
      </button>
    </div>
  );
}

function Leaves({ frame }: { frame: Frame }) {
  if (frame.leaves.length === 0) return null;
  return (
    <section className="w-leaves" aria-label="Blank leaves at the back of the volume">
      <h3>Leaves at the back of the volume</h3>
      <ul>
        {frame.leaves.map((l) => (
          <li key={l.id} className={l.filled ? 'w-leaf is-filled' : 'w-leaf'}>
            {l.filled ? <p className="w-leaf-text">{l.filled}</p> : <span className="w-leaf-blank" />}
            <span className="w-leaf-cond">{l.condition}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The thaw: what the winter changed for good, before spring begins. */
export function ThawPage({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const thaw = frame.thaw;
  if (!thaw) return null;
  const q = frame.winter?.question ?? null;
  // The question's own line is shown with the question.
  const lines = thaw.lines.filter((l) => !/^(Not done|Done): /.test(l));
  const closing = frame.volume.epilogue !== null;
  return (
    <div className="w-page w-thaw">
      <p className="w-kicker">{frame.date}</p>
      <h2>The thaw</h2>
      <p className={thaw.hungry ? 'w-thaw-winter is-hungry' : 'w-thaw-winter'}>{thaw.winter}</p>
      <Sacks have={frame.grain} lost={0} label="What the granary holds into spring" />
      {q ? (
        <div className={`w-question-box is-${q.met === true ? 'met' : q.met === false ? 'unmet' : 'open'}`}>
          <span className="w-kicker">This winter’s question</span>
          <p>{q.text}</p>
          <p className="w-met">{metWords(q.met)}</p>
        </div>
      ) : null}
      {lines.length > 0 ? (
        <>
          <h3 className="w-sub">Written this winter</h3>
          <ul className="w-dawnlines">
            {lines.slice(-12).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="w-note">The wall and the houses stand as they did.</p>
      )}
      <Leaves frame={frame} />
      <button type="button" className="w-primary" onClick={() => actions.input({ k: 'continue' })}>
        {closing ? 'Turn to the volume’s last page' : 'Into the spring'}
      </button>
    </div>
  );
}

function Epilogue({ v }: { v: FrameVolume }) {
  if (!v.epilogue || v.epilogue.length === 0) return null;
  return (
    <ul className="w-epilogue">
      {v.epilogue.map((e) => (
        <li key={`${e.name}-${e.text}`}>
          <span className="w-epi-name">{e.name}</span>
          <span className="w-epi-text">{epilogueText(e.text)}</span>
        </li>
      ))}
    </ul>
  );
}

/** A volume closed: the end of a chapter, not of the game. */
export function ClosedPage({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const v = frame.volume;
  return (
    <div className="w-page w-closed">
      <p className="w-kicker">Here ends volume {v.numeral}</p>
      <h2>{v.title}</h2>
      <p className="w-closed-q">{v.question}</p>
      {v.end ? <p className="w-closed-end">{v.end}</p> : null}
      <p className="w-fleuron" aria-hidden="true">
        ❦
      </p>
      <Epilogue v={v} />
      <p className="w-note">The village goes on. The next volume asks its own question of the living.</p>
      <button type="button" className="w-primary" onClick={() => actions.input({ k: 'continue' })}>
        <Icon name="book-open" size={18} /> Open the next volume
      </button>
      <ExportButtons
        actions={actions}
        label="Playtesting? Send the team this volume as it closed: it replays your whole chronicle."
      />
    </div>
  );
}

/** The village ended: its volume closes with the epilogue, and a new village can begin. */
export function FallenPage({ frame, actions, seed }: { frame: Frame; actions: WatchActions; seed: number }) {
  const v = frame.volume;
  return (
    <div className="w-page w-closed w-fallen">
      <p className="w-kicker">The chronicle closes · {frame.date}</p>
      <h2>{v.end ?? 'The granary is empty.'}</h2>
      <Sacks have={frame.grain} lost={0} label="The granary as it was left" />
      <p className="w-fleuron" aria-hidden="true">
        ❦
      </p>
      <Epilogue v={v} />
      <p>The village cannot stay. The chronicle closes this volume.</p>
      <ExportButtons
        actions={actions}
        label="Playtesting? Send the team the chronicle before you begin anew: it replays the whole run."
      />
      <button type="button" className="w-primary" onClick={() => actions.restart(seed + 1)}>
        Begin a new village
      </button>
    </div>
  );
}

/** A year in words for the shelf: "the third year". */
export function yearWords(year: number): string {
  return `the ${ordinalWord(year)} year`;
}

export { SEASON_WORDS };
