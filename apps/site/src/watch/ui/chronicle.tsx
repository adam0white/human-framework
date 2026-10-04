/**
 * The chronicle is the menu (spec §6): opening it holds the clock. Volumes are the save slots and there is no
 * rewind within a volume, so the menu shows:
 * - this chronicle's shelf of volumes; a closed volume can be taken up again, which begins a *new* chronicle from
 *   its last page and leaves this one as it is;
 * - other kept chronicles, each opened at its running page ("Continue"), with their closed volumes;
 * - what was lately written (folded), the playtest export and a new village.
 * Season pages are kept only as backups (`store.ts`) and are not offered here.
 */
import { useEffect, useState } from 'react';
import { FullscreenButton } from '../../shared/fullscreen.tsx';
import type { PageInfo } from '../protocol.ts';
import type { Frame, FrameVolume } from '../sim/view.ts';
import { ExportButtons } from './exporting.tsx';
import { Icon } from './icons.tsx';
import { SEASON_WORDS, yearWords } from './pages.tsx';
import type { WatchActions } from './useWatch.ts';
import { pageWhen } from './words.ts';

interface Group {
  chronicle: string;
  auto: PageInfo | null;
  volumes: PageInfo[];
  newest: number;
}

/** Saved pages by chronicle, the most recently kept chronicle first; closed volumes oldest first. */
export function groups(shelf: PageInfo[]): Group[] {
  const by = new Map<string, Group>();
  for (const p of shelf) {
    let g = by.get(p.chronicle);
    if (!g) {
      g = { chronicle: p.chronicle, auto: null, volumes: [], newest: 0 };
      by.set(p.chronicle, g);
    }
    g.newest = Math.max(g.newest, p.savedAt);
    if (p.kind === 'auto') {
      if (!g.auto || p.savedAt > g.auto.savedAt) g.auto = p;
    } else if (p.kind === 'volume') g.volumes.push(p);
  }
  const out = [...by.values()].filter((g) => g.auto || g.volumes.length > 0);
  for (const g of out) g.volumes.sort((a, b) => a.savedAt - b.savedAt);
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
  current,
  onClose,
}: {
  frame: Frame;
  actions: WatchActions;
  seed: number;
  shelf: PageInfo[];
  saving: boolean;
  current: string;
  onClose: () => void;
}) {
  const [loadNote, setLoadNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    actions.refreshShelf();
  }, [actions]);

  const load = async (id: string) => {
    setBusy(id);
    setLoadNote('');
    const ok = await actions.load(id);
    setBusy(null);
    if (ok) onClose();
    else
      setLoadNote(
        'That page could not be read; it may have been written by an older version of the game. The chronicle you have open goes on.',
      );
  };

  const all = groups(shelf);
  const mine = all.find((g) => g.chronicle === current);
  const others = all.filter((g) => g.chronicle !== current);
  const lines = frame.chronicle.slice().reverse();
  const takeUp = (p: PageInfo | undefined) =>
    p ? (
      <button
        type="button"
        className="w-load"
        disabled={busy !== null}
        onClick={() => load(p.id)}
        aria-label={`Take up volume ${p.volume?.numeral ?? ''} again as a new chronicle`}
      >
        {busy === p.id ? 'Opening…' : 'Take up again'}
      </button>
    ) : null;

  return (
    <div className="w-menu" role="dialog" aria-label="The chronicle">
      <div className="w-menu-head">
        <h2>The chronicle</h2>
        <button type="button" className="w-x" onClick={onClose}>
          <Icon name="x" size={18} label="Close" />
        </button>
      </div>
      <p className="w-note">
        The clock stands still while the chronicle is open.{' '}
        {saving
          ? 'Every page you live is kept as you go; what is written is not unwritten.'
          : 'This browser is not keeping saves; the playtest export still works.'}
      </p>

      <section className="w-menu-sec" aria-label="The volumes">
        <h3>The shelf</h3>
        <ul className="w-vols">
          {volumes(frame).map((v) => {
            const page = v.end ? mine?.volumes.find((p) => p.id === `${current}:vol:${v.n}`) : undefined;
            return (
              <li key={v.n} className={v.end ? 'w-vol' : 'w-vol is-open'}>
                <span className="w-vol-spine">{v.numeral}</span>
                <span className="w-vol-body">
                  <span className="w-vol-title">{v.title}</span>
                  <span className="w-note">{v.question}</span>
                  <span className="w-vol-end">{v.end ?? 'Still being written.'}</span>
                  {page ? <span className="w-vol-act">{takeUp(page)}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
        {mine?.volumes.length ? (
          <p className="w-note">
            Taking up a closed volume begins a new chronicle from its last page. This one stays on the shelf
            as it is.
          </p>
        ) : null}
      </section>

      {others.length > 0 ? (
        <section className="w-menu-sec" aria-label="Other chronicles">
          <h3>Other chronicles</h3>
          {others.map((g) => (
            <div key={g.chronicle} className="w-pages">
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
                      className="w-load"
                      disabled={busy !== null}
                      onClick={() => g.auto && load(g.auto.id)}
                    >
                      {busy === g.auto.id ? 'Opening…' : 'Continue'}
                    </button>
                  </li>
                ) : null}
                {g.volumes.map((p) => (
                  <li key={p.id} className="w-pagerow">
                    <span>
                      Volume {p.volume?.numeral}, <em>{p.volume?.title}</em>
                      {p.volume?.end ? <span className="w-note"> · {p.volume.end}</span> : null}
                    </span>
                    {takeUp(p)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
      {loadNote ? <p className="w-note w-soft-fail">{loadNote}</p> : null}

      <section className="w-menu-sec" aria-label="Recent chronicle">
        <details className="w-lately" open>
          <summary>
            <h3>Lately written</h3>
          </summary>
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
        </details>
      </section>

      <section className="w-menu-sec" aria-label="Playtest and new village">
        <h3>Playtest</h3>
        <ExportButtons actions={actions} />
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
