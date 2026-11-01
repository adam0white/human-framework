import { CastOffer } from '../../shared/CastOffer.tsx';
import { Decoration } from '../../shared/Decoration.tsx';
import { EndTally } from '../../shared/EndTally.tsx';
import { watchTally } from './end-tally.ts';
import { RunSecondaries } from './exporting.tsx';
/**
 * The year's pages around the winter (G3-3): the open seasons (date, volume, granary, the people and a season card
 * when one is open), the fair, the thaw, a closed volume and a fallen village, plus the live chronicle strip over the
 * map. Everything is words and drawn values; choices that cannot be undone say so on the page.
 */

import { useEffect, useState } from 'react';
import type { SeasonCard } from '../sim/state.ts';
import type { Frame, FrameVillager, FrameVolume } from '../sim/view.ts';
import { Icon } from './icons.tsx';
import { Impressions, Sacks } from './parts.tsx';
import { PageActions } from './SheetActions.tsx';
import type { WatchActions } from './useWatch.ts';
import { epilogueText, metWords, ordinalWord, picksWords, rootsWords, watchWords } from './words.ts';

const SEASON_WORDS: Record<Frame['season'], string> = {
  winter: 'winter',
  spring: 'spring',
  summer: 'summer',
  autumn: 'autumn',
};

/** The latest chronicle lines over the map, newest first; each fades in as it is written. */
export function ChronicleStrip({ frame }: { frame: Frame }) {
  // Only this season's news: spring's arrivals do not hang over the autumn fair (G3-4 designer review).
  const lines = frame.chronicle
    .filter((l) => l.year === frame.year && l.season === frame.season)
    .slice(-5)
    .reverse();
  if (lines.length === 0) return null;
  return (
    <ol className="w-strip" aria-label="The chronicle, newest first" aria-live="off">
      {lines.map((l) => (
        <li key={`${l.year}-${l.minute}-${l.text}`} className={`w-strip-line w-strip-${l.kind}`}>
          {watchWords(l.text)}
        </li>
      ))}
    </ol>
  );
}

function VolumeLine({ v }: { v: FrameVolume }) {
  return (
    <p className="w-kicker">
      Part {v.numeral} · {v.title}
    </p>
  );
}

/** A season card: a proposal the Keeper may speak to. Play slows while it is open; doing nothing is allowed. */
export function SeasonCardView({ card, actions }: { card: SeasonCard; actions: WatchActions }) {
  return (
    <section className="w-moment w-card" aria-label="A matter for the Keeper">
      <p className="w-moment-text">{watchWords(card.text)}</p>
      <p className="w-card-read">{watchWords(card.read)}</p>
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
      <p className="w-moment-let">
        {card.kind === 'proposal'
          ? '…or say nothing; they will decide alone.'
          : card.kind === 'practise'
            ? 'Without an answer, no lessons are arranged this summer.'
            : 'You can leave the family to themselves.'}{' '}
        The days slow while you think.
      </p>
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
        {v.watcher ? <span className="w-badge">Guards the wall</span> : null}
      </span>
      <span className="w-person-note">{facts.join(' · ')}</span>
      {v.impressions.length > 0 ? <Impressions impressions={v.impressions} /> : null}
    </li>
  );
}

/** The village is a reading sheet, separate from the running season. */
export function People({
  frame,
  onReadingChange,
}: {
  frame: Frame;
  onReadingChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    onReadingChange?.(open);
    return () => onReadingChange?.(false);
  }, [open, onReadingChange]);
  return (
    <>
      <button type="button" className="w-menu-row" onClick={() => setOpen(true)}>
        The village <Decoration kind="chevron" />
      </button>
      {open ? (
        <div className="w-overlay w-sub-sheet" role="dialog" aria-label="The village">
          <div className="w-menu-head">
            <h2>The village</h2>
          </div>
          <div className="w-sheet-body">
            <p>{frame.souls}.</p>
            <ul className="w-villagers">
              {frame.villagers.map((v) => (
                <PersonCard key={v.id} v={v} />
              ))}
            </ul>
          </div>
          <div className="w-sheet-actions">
            <button type="button" className="w-primary" onClick={() => setOpen(false)}>
              Back to the village
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** A pending matter takes the sheet; the village returns after the answer. */
export function SeasonPanel({
  frame,
  actions,
  onReadingChange,
}: {
  frame: Frame;
  actions: WatchActions;
  onReadingChange?: (open: boolean) => void;
}) {
  if (frame.card) return <SeasonCardView key={frame.card.id} card={frame.card} actions={actions} />;
  return (
    <div className="w-season">
      <VolumeLine v={frame.volume} />
      <p className="w-note w-question">{frame.volume.question}</p>
      <People frame={frame} onReadingChange={onReadingChange} />
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
      <p className="w-picks">{picksWords(fair.picksLeft)} Everyone still needs food through the winter.</p>
      <div className="w-granary">
        <span>The granary</span>
        <Sacks
          have={frame.grain}
          lost={0}
          need={frame.need}
          label="The granary, drawn as sacks; the mark is what the village needs until harvest"
        />
      </div>
      <ul className="w-offers">
        {fair.offers.map((o) => (
          <li key={o.id} className={o.taken ? 'w-offer is-taken' : 'w-offer'}>
            <h3>{o.label}</h3>
            <p>{watchWords(o.text)}</p>
            {!o.taken && o.affordable && o.after < frame.grain ? (
              <div className="w-offer-after">
                <span className="w-note">Grain remaining after this offer</span>
                <Sacks
                  have={o.after}
                  lost={frame.grain - o.after}
                  need={frame.need}
                  label="The granary if you take it; the mark is what the village needs until harvest"
                />
              </div>
            ) : null}
            {o.taken ? (
              <p className="w-taken">You have taken this offer. It cannot be undone.</p>
            ) : (
              <>
                <button
                  type="button"
                  className="w-secondary"
                  disabled={!o.affordable}
                  onClick={() => actions.input({ k: 'fair', pick: o.id })}
                >
                  Take this offer
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
      <PageActions>
        <button type="button" className="w-primary" onClick={() => actions.input({ k: 'continue' })}>
          Leave the fair
        </button>
      </PageActions>
    </div>
  );
}

function Leaves({ frame }: { frame: Frame }) {
  if (frame.leaves.length === 0) return null;
  return (
    <section className="w-leaves" aria-label="Blank pages at the end of this part">
      <h3>Blank pages at the end of this part</h3>
      <ul>
        {frame.leaves.map((l) => (
          <li key={l.id} className={l.filled ? 'w-leaf is-filled' : 'w-leaf'}>
            {l.filled ? (
              <p className="w-leaf-text">{watchWords(l.filled)}</p>
            ) : (
              <span className="w-leaf-blank" />
            )}
            <span className="w-leaf-cond">{watchWords(l.condition)}</span>
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
          <p>{watchWords(q.text)}</p>
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
      <EndTally title="The winter’s tally" lines={watchTally(frame)} />
      <Leaves frame={frame} />
      <PageActions>
        <button type="button" className="w-primary" onClick={() => actions.input({ k: 'continue' })}>
          {closing ? 'Read this part’s last page' : 'Into the spring'}
        </button>
      </PageActions>
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
          <span className="w-epi-text">{watchWords(epilogueText(e.text))}</span>
        </li>
      ))}
    </ul>
  );
}

/** A volume closed: the end of a chapter, not of the game. */
export function ClosedPage({
  frame,
  actions,
  onFeedback,
}: {
  frame: Frame;
  actions: WatchActions;
  onFeedback?: () => void;
}) {
  const v = frame.volume;
  return (
    <div className="w-page w-closed">
      <p className="w-kicker">Here ends part {v.numeral}</p>
      <h2>{v.title}</h2>
      <p className="w-closed-q">{v.question}</p>
      {v.end ? <p className="w-closed-end">{watchWords(v.end)}</p> : null}
      <p className="w-fleuron" aria-hidden="true">
        ❦
      </p>
      <Epilogue v={v} />
      <p className="w-note">The village goes on. The next part brings a new question for its people.</p>
      <PageActions>
        <button type="button" className="w-primary" onClick={() => actions.input({ k: 'continue' })}>
          <Icon name="book-open" size={18} /> Open the next part
        </button>
      </PageActions>
      <CastOffer game="watch" />
      <RunSecondaries actions={actions} onFeedback={onFeedback} />
    </div>
  );
}

/** The village ended: its volume closes with the epilogue, and a new village can begin. */
export function FallenPage({
  frame,
  actions,
  seed,
  tally: _tally,
  onFeedback,
}: {
  frame: Frame;
  actions: WatchActions;
  seed: number;
  tally?: boolean;
  onFeedback?: () => void;
}) {
  const v = frame.volume;
  return (
    <div className="w-page w-closed w-fallen">
      <p className="w-kicker">The chronicle closes · {frame.date}</p>
      <h2>{watchWords(v.end ?? 'The granary is empty.')}</h2>
      <Sacks have={frame.grain} lost={0} label="The granary as it was left" />
      <p className="w-fleuron" aria-hidden="true">
        ❦
      </p>
      <Epilogue v={v} />
      <p>The villagers cannot stay here. This part of the chronicle ends.</p>
      <EndTally title="The chronicle’s tally" lines={watchTally(frame)} />
      <CastOffer game="watch" />
      <RunSecondaries actions={actions} onFeedback={onFeedback} />
      <PageActions>
        <button type="button" className="w-primary" onClick={() => actions.restart(seed + 1)}>
          Begin a new village
        </button>
      </PageActions>
    </div>
  );
}

/** A year in words for the shelf: "the third year". */
export function yearWords(year: number): string {
  return `the ${ordinalWord(year)} year`;
}

export { SEASON_WORDS };
