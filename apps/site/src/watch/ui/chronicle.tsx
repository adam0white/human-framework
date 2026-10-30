/** The menu reads the chronicle. Continuing saved pages belongs to the title's shelf. */
import { useEffect, useState } from 'react';
import { CastMenu } from '../../shared/CastMenu.tsx';
import { DebugMenu } from '../../shared/DebugMenu.tsx';
import { FullscreenButton } from '../../shared/fullscreen.tsx';
import { GameVersion } from '../../shared/GameVersion.tsx';
import type { PageInfo } from '../protocol.ts';
import type { Frame, FrameVolume } from '../sim/view.ts';
import { DownloadRun, FeedbackScreen, RecordingPreference } from './exporting.tsx';
import { Icon } from './icons.tsx';
import { SEASON_WORDS, yearWords } from './pages.tsx';
import type { WatchActions } from './useWatch.ts';
import { WinterSetting } from './WinterSetting.tsx';
import { pageWhen, watchWords } from './words.ts';

interface Group {
  chronicle: string;
  auto: PageInfo | null;
  volumes: PageInfo[];
  backups: PageInfo[];
  newest: number;
}

export function groups(shelf: PageInfo[]): Group[] {
  const by = new Map<string, Group>();
  for (const p of shelf) {
    let g = by.get(p.chronicle);
    if (!g) {
      g = { chronicle: p.chronicle, auto: null, volumes: [], backups: [], newest: 0 };
      by.set(p.chronicle, g);
    }
    g.newest = Math.max(g.newest, p.savedAt);
    if (p.kind === 'auto') {
      if (!g.auto || p.savedAt > g.auto.savedAt) g.auto = p;
    } else if (p.kind === 'volume') g.volumes.push(p);
    else if (p.kind === 'season' && p.castRecovery) g.backups.push(p);
  }
  const out = [...by.values()].filter((g) => g.auto || g.volumes.length > 0 || g.backups.length > 0);
  for (const g of out) g.volumes.sort((a, b) => a.savedAt - b.savedAt);
  return out.sort((a, b) => b.newest - a.newest);
}

function volumes(frame: Frame): FrameVolume[] {
  const seen = new Set<number>();
  return [...frame.shelf, frame.volume].filter((v) => {
    if (seen.has(v.n)) return false;
    seen.add(v.n);
    return true;
  });
}

export function HopesSheet({
  frame,
  actions,
  onClose,
}: {
  frame: Frame;
  actions: WatchActions;
  onClose: () => void;
}) {
  return (
    <div className="w-overlay w-sub-sheet" role="dialog" aria-label="The village’s hopes">
      <div className="w-menu-head">
        <h2>The village’s hopes</h2>
      </div>
      <div className="w-sheet-body">
        <WinterSetting frame={frame} actions={actions} />
      </div>
      <div className="w-sheet-actions">
        <button type="button" className="w-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

/** Only this title-page sheet loads a save or branches a closed volume. */
export function Shelf({
  shelf,
  current,
  actions,
  onClose,
  onLoaded,
}: {
  shelf: PageInfo[];
  current: string;
  actions: WatchActions;
  onClose: () => void;
  onLoaded?: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [recover, setRecover] = useState<string | null>(null);
  useEffect(() => {
    actions.refreshShelf();
  }, [actions]);
  const load = async (id: string) => {
    setBusy(id);
    setNote('');
    try {
      if (await actions.load(id)) {
        onClose();
        onLoaded?.();
      } else setNote('That page could not be read. The chronicle you have open goes on.');
    } catch {
      setNote('That page could not be read. Please try again.');
    } finally {
      setBusy(null);
    }
  };
  const all = groups(shelf);
  return (
    <div className="w-overlay w-sub-sheet" role="dialog" aria-label="The shelf">
      <div className="w-menu-head">
        <h2>The shelf</h2>
      </div>
      <div className="w-sheet-body">
        <p className="w-note">Continue a finished part to begin a new chronicle from its last page.</p>
        <h3>Other chronicles</h3>
        {all.length === 0 ? <p>No chronicles are kept yet.</p> : null}
        {all.map((g) => (
          <section key={g.chronicle} className="w-pages">
            <ul>
              {g.auto && g.chronicle !== current ? (
                <li className="w-pagerow">
                  <span>
                    A village
                    <span className="w-note">
                      {' '}
                      · {yearWords(g.auto.year)}, {pageWhen(g.auto.when)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="w-secondary"
                    disabled={busy !== null}
                    onClick={() => g.auto && load(g.auto.id)}
                  >
                    {busy === g.auto.id ? 'Opening…' : 'Continue'}
                  </button>
                </li>
              ) : null}
              {g.backups.map((p) => (
                <li key={p.id} className="w-pagerow">
                  <span>
                    Earlier page · {yearWords(p.year)}, {pageWhen(p.when)}
                    <span className="w-note">
                      Earlier local progress. Restores this page’s exact accepted cast heads.
                    </span>
                  </span>
                  <button
                    type="button"
                    className="w-secondary"
                    disabled={busy !== null}
                    onClick={() => setRecover(p.id)}
                  >
                    Restore season-start backup
                  </button>
                  {recover === p.id ? (
                    <div role="alert">
                      <p>
                        Replace this chronicle’s later local progress with this saved page? Later exports
                        remain separate. No new cast claim is made.
                      </p>
                      <button type="button" disabled={busy !== null} onClick={() => load(p.id)}>
                        Restore this saved page
                      </button>
                      <button type="button" onClick={() => setRecover(null)}>
                        Keep current page
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
              {g.volumes.map((p) => (
                <li key={p.id} className="w-pagerow">
                  <span>
                    Part {p.volume?.numeral}, <em>{p.volume?.title}</em>
                    <span className="w-note">
                      {' '}
                      · {watchWords(p.volume?.end ?? '')} · {yearWords(p.year)}, {pageWhen(p.when)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="w-secondary"
                    disabled={busy !== null}
                    onClick={() => load(p.id)}
                  >
                    {busy === p.id ? 'Opening…' : 'Take up again'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {note ? (
          <p role="status" className="w-soft-fail">
            {note}
          </p>
        ) : null}
      </div>
      <div className="w-sheet-actions">
        <button type="button" className="w-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function ReadChronicle({ frame, onClose }: { frame: Frame; onClose: () => void }) {
  return (
    <div className="w-overlay w-sub-sheet" role="dialog" aria-label="Read the chronicle">
      <div className="w-menu-head">
        <h2>Read the chronicle</h2>
      </div>
      <div className="w-sheet-body">
        <h3>Lately written</h3>
        {frame.chronicle.length === 0 ? <p>Nothing is written yet.</p> : null}
        <ol className="w-lines">
          {frame.chronicle
            .slice()
            .reverse()
            .map((l) => (
              <li key={`${l.year}-${l.minute}-${l.text}`}>
                <span className="w-line-when">
                  {SEASON_WORDS[l.season]}, {yearWords(l.year)}
                </span>
                {watchWords(l.text)}
              </li>
            ))}
        </ol>
        <h3>The parts</h3>
        <ul className="w-vols">
          {volumes(frame).map((v) => (
            <li key={v.n} className="w-vol">
              <span className="w-vol-spine">{v.numeral}</span>
              <span className="w-vol-body">
                <strong>{v.title}</strong>
                <span>{v.question}</span>
                <span>{watchWords(v.end ?? 'Still being written.')}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-sheet-actions">
        <button type="button" className="w-primary" onClick={onClose}>
          Back to the menu
        </button>
      </div>
    </div>
  );
}

export function Chronicle({
  frame,
  actions,
  seed,
  saving: _saving,
  onClose,
  onFeedback,
}: {
  frame: Frame;
  actions: WatchActions;
  seed: number;
  shelf: PageInfo[];
  saving: boolean;
  current: string;
  onClose: () => void;
  tallySetting?: React.ReactNode;
  onFeedback?: () => void;
  onTitle?: () => void;
}) {
  const [confirmNew, setConfirmNew] = useState(false);
  const [page, setPage] = useState<'read' | 'hopes' | 'feedback' | null>(null);
  if (page === 'read') return <ReadChronicle frame={frame} onClose={() => setPage(null)} />;
  if (page === 'hopes') return <HopesSheet frame={frame} actions={actions} onClose={() => setPage(null)} />;
  if (page === 'feedback') return <FeedbackScreen actions={actions} onBack={() => setPage(null)} />;
  return (
    <div className="w-menu" role="dialog" aria-label="Game menu">
      <div className="w-menu-head">
        <h2>Game menu</h2>
        <button type="button" className="w-x" onClick={onClose}>
          <Icon name="x" size={18} label="Close" />
        </button>
      </div>
      <p className="w-note">The game is paused while this menu is open.</p>
      <div className="w-sheet-body w-menu-rows">
        <button type="button" className="w-menu-row" onClick={() => setPage('read')}>
          Read the chronicle <span aria-hidden="true">▸</span>
        </button>
        <button type="button" className="w-menu-row" onClick={() => setPage('hopes')}>
          Hopes for the winter ahead <span aria-hidden="true">▸</span>
        </button>
        <button
          type="button"
          className="w-menu-row"
          onClick={() => (onFeedback ? onFeedback() : setPage('feedback'))}
        >
          Feedback <span aria-hidden="true">▸</span>
        </button>
        <FullscreenButton variant="item" className="w-menu-row w-fs-item" />
        <button
          type="button"
          className="w-menu-row"
          onClick={() => {
            if (!confirmNew) {
              setConfirmNew(true);
              return;
            }
            actions.restart(seed + 1);
            onClose();
          }}
        >
          {confirmNew ? 'Replace this game and start again' : 'New game'}
        </button>
        <a className="w-menu-row" href="/games/">
          All games
        </a>
        <RecordingPreference privacy={false} />
        <aside className="game-release">
          <GameVersion id="watch" />
        </aside>
        <CastMenu game="watch" />
      </div>
      <div className="w-sheet-actions">
        <button type="button" className="w-primary" onClick={onClose}>
          Resume
        </button>
      </div>
      <DebugMenu>
        <DownloadRun actions={actions} label="Keep a copy of this run" />
      </DebugMenu>
    </div>
  );
}
