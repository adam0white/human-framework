/**
 * The playtest menu both games put in their top bar, and the notice that reports a load. A small "Playtest"
 * button opens two plain actions (with `className` including `pt-compact`, it shrinks to "⋯" on phones): download this run as a file, or load a file (replayed in the worker). Everything
 * a file says is rendered as React text.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { pickJsonFile, type ReplayResult } from './playtest.ts';
import './playtest.css';

export type PlaytestStatus =
  | { result: ReplayResult }
  | { error: string }
  | { busy: 'export' | 'load' }
  | null;

export function PlaytestMenu({
  onExport,
  onLoad,
  onError,
  className = '',
  extra,
}: {
  onExport: () => void;
  onLoad: (text: string) => void;
  onError: (message: string) => void;
  className?: string;
  /** More items at the end of the list (a game's phone-only items, such as full screen). */
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const load = () => {
    setOpen(false);
    pickJsonFile().then(
      (text) => {
        if (text !== null) onLoad(text);
      },
      (e: unknown) => onError(e instanceof Error ? e.message : String(e)),
    );
  };

  return (
    <div className={`pt-menu ${className}`} ref={root}>
      <button
        type="button"
        ref={button}
        className="pt-menu-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        title="Playtest file"
        aria-label="Playtest file"
      >
        <span className="pt-long">Playtest</span>
        <span className="pt-short" aria-hidden="true">
          ⋯
        </span>
      </button>
      {open && (
        <div className="pt-menu-list" id={id}>
          <button
            type="button"
            ref={first}
            onClick={() => {
              setOpen(false);
              onExport();
            }}
          >
            Download playtest file
          </button>
          <button type="button" onClick={load}>
            Load playtest file
          </button>
          {extra}
        </div>
      )}
    </div>
  );
}

/** What the last load or export came to, as a small dismissible notice. */
export function PlaytestNotice({ status, onClose }: { status: PlaytestStatus; onClose: () => void }) {
  if (!status) return null;
  let body: React.ReactNode;
  let tone = 'info';
  if ('busy' in status)
    body = status.busy === 'export' ? 'Making the playtest file…' : 'Replaying the playtest file…';
  else if ('error' in status) {
    tone = 'bad';
    body = status.error;
  } else {
    const r = status.result;
    const builds =
      r.file.framework !== r.here.framework || r.file.engine !== r.here.engine
        ? ` The file was made with framework ${r.file.framework} (engine ${r.file.engine}); this page runs ${r.here.framework} (engine ${r.here.engine}).`
        : '';
    tone = r.matches ? 'good' : 'bad';
    body = r.matches
      ? `Playtest file replayed. The state matches the file (hash ${r.hash}).${builds}`
      : `Playtest file replayed, but the state differs from the file: hash ${r.hash}, file ${r.expected}.${
          r.driftAt >= 0 ? ` The replay first parted from the file at log entry ${r.driftAt}.` : ''
        }${builds} Build of the file: ${r.file.build}.`;
  }
  return (
    <div className={`pt-notice is-${tone}`} role="status" data-testid="playtest-notice">
      <span>{body}</span>
      {!('busy' in status) && (
        <button type="button" className="pt-notice-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      )}
    </div>
  );
}
