/**
 * The chronicle is the menu (spec §6): opening it holds the clock. It shows the shelf of volumes, the recent
 * chronicle, the saved pages to resume (grouped by chronicle, newest first: "Continue" is a chronicle's running
 * page, then its season pages), the playtest export and a new village.
 */
import { useEffect, useState } from 'react';
import { FullscreenButton } from '../../shared/fullscreen.tsx';
import type { PageInfo } from '../protocol.ts';
import type { Frame, FrameVolume } from '../sim/view.ts';
import { Icon } from './icons.tsx';
import { SEASON_WORDS, yearWords } from './pages.tsx';
import type { WatchActions } from './useWatch.ts';
import { pageWhen } from './words.ts';

interface Group {
  chronicle: string;
  auto: PageInfo | null;
  seasons: PageInfo[];
  newest: number;
}

/** Saved pages by chronicle, the most recently kept chronicle first; season pages newest first. */
function groups(shelf: PageInfo[]): Group[] {
  const by = new Map<string, Group>();
  for (const p of shelf) {
    let g = by.get(p.chronicle);
    if (!g) {
      g = { chronicle: p.chronicle, auto: null, seasons: [], newest: 0 };
      by.set(p.chronicle, g);
    }
    g.newest = Math.max(g.newest, p.savedAt);
    if (p.kind === 'auto') {
      if (!g.auto || p.savedAt > g.auto.savedAt) g.auto = p;
    } else g.seasons.push(p);
  }
  const out = [...by.values()];
  for (const g of out) g.seasons.sort((a, b) => b.savedAt - a.savedAt);
  return out.sort((a, b) => b.newest - a.newest);
}

/** The volumes on the shelf and the one being written, once each. */
function volumes(frame: Frame): FrameVolume[] {
  const seen = new Set<number>();
  const out: FrameVolume[] = [];
  for (const v of [...frame.shelf, frame.volume]) {
    if (seen.has(v.n)) continue;
    seen.add(v.n);
    out.push(v);
  }
  return out;
}

export function Chronicle({
  frame,
  actions,
  seed,
  shelf,
  saving,
  onClose,
}: {
  frame: Frame;
  actions: WatchActions;
  seed: number;
  shelf: PageInfo[];
  saving: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [loadNote, setLoadNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    actions.refreshShelf();
  }, [actions]);

  const copy = async () => {
    const data = await actions.exportRun();
    const json = JSON.stringify(data);
    try {
      await navigator.clipboard.writeText(json);
      setStatus('Copied. Paste it into a message to the team.');
    } catch {
      setText(json);
      setStatus('Copy was blocked; select the text below.');
    }
  };

  const load = async (id: string) => {
    setBusy(id);
    setLoadNote('');
    const ok = await actions.load(id);
    setBusy(null);
    if (ok) onClose();
    else setLoadNote('That page could not be read. The chronicle you have open goes on.');
  };

  const gs = groups(shelf);
  const lines = frame.chronicle.slice().reverse();

  return (
    <div className="w-menu" role="dialog" aria-label="The chronicle">
      <div className="w-menu-head">
        <h2>The chronicle</h2>
        <button type="button" className="w-x" onClick={onClose}>
          <Icon name="x" size={18} label="Close" />
        </button>
      </div>
      <p className="w-note">The clock stands still while the chronicle is open.</p>

      <section className="w-menu-sec" aria-label="The volumes">
        <h3>The shelf</h3>
        <ul className="w-vols">
          {volumes(frame).map((v) => (
            <li key={v.n} className={v.end ? 'w-vol' : 'w-vol is-open'}>
              <span className="w-vol-spine">{v.numeral}</span>
              <span className="w-vol-body">
                <span className="w-vol-title">{v.title}</span>
                <span className="w-note">{v.question}</span>
                <span className="w-vol-end">{v.end ?? 'Still being written.'}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="w-menu-sec" aria-label="Saved pages">
        <h3>Saved pages</h3>
        {!saving ? (
          <p className="w-note">This browser is not keeping saves; the playtest export still works.</p>
        ) : null}
        {gs.length === 0 ? <p className="w-note">No pages are kept yet.</p> : null}
        {gs.map((g, i) => (
          <div key={g.chronicle} className="w-pages">
            <p className="w-kicker">{i === 0 ? 'The latest chronicle' : 'An older chronicle'}</p>
            <ul>
              {g.auto ? (
                <li className="w-pagerow is-continue">
                  <span>
                    <strong>Continue</strong>
                    <span className="w-note">
                      {' '}
                      · {yearWords(g.auto.year)}, {pageWhen(g.auto.when)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="w-chip"
                    disabled={busy !== null}
                    onClick={() => g.auto && load(g.auto.id)}
                  >
                    {busy === g.auto.id ? 'Opening…' : 'Load'}
                  </button>
                </li>
              ) : null}
              {g.seasons.map((p) => (
                <li key={p.id} className="w-pagerow">
                  <span>
                    {yearWords(p.year)}, {pageWhen(p.when)}
                  </span>
                  <button
                    type="button"
                    className="w-chip"
                    disabled={busy !== null}
                    onClick={() => load(p.id)}
                  >
                    {busy === p.id ? 'Opening…' : 'Load'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {loadNote ? <p className="w-note w-soft-fail">{loadNote}</p> : null}
      </section>

      <section className="w-menu-sec" aria-label="Recent chronicle">
        <h3>Lately written</h3>
        {lines.length === 0 ? <p className="w-note">Nothing is written yet.</p> : null}
        <ol className="w-lines">
          {lines.map((l) => (
            <li key={`${l.year}-${l.minute}-${l.text}`}>
              <span className="w-line-when">
                {SEASON_WORDS[l.season]}, {yearWords(l.year)}
              </span>
              {l.text}
            </li>
          ))}
        </ol>
      </section>

      <section className="w-menu-sec" aria-label="Playtest and new village">
        <button type="button" className="w-secondary" onClick={copy}>
          <Icon name="copy" size={16} /> Copy this volume (playtest export)
        </button>
        {status ? <p className="w-note">{status}</p> : null}
        {text ? <textarea className="w-export" readOnly value={text} rows={4} /> : null}
        <button
          type="button"
          className="w-secondary"
          onClick={() => {
            actions.restart((seed * 48271 + 11) % 2147483647);
            onClose();
          }}
        >
          Begin a new village
        </button>
        <FullscreenButton variant="item" className="w-secondary w-fs-item" />
      </section>
    </div>
  );
}
