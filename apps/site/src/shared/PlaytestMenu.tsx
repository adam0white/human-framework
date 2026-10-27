/**
 * The Game menu both games put in their top bar, and the notice that reports a load. The menu
 * offers run files, inline lab actions and a way back to all games. Everything
 * a file says is rendered as React text.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { DebugMenu } from './DebugMenu.tsx';
import { playerError } from './player-error.ts';
import { pickJsonFile, type ReplayResult } from './playtest.ts';
import './playtest.css';

export type PlaytestStatus =
  | { result: ReplayResult }
  | { error: string }
  | { busy: 'export' | 'load' }
  | null;

export function PlaytestMenu({
  onExport,
  onOpenChange,
  onLoad,
  onError,
  className = '',
  extra,
}: {
  onOpenChange?: (open: boolean) => void;
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
  const first = useRef<HTMLAnchorElement>(null);

  useLayoutEffect(() => {
    onOpenChange?.(open);
    return () => onOpenChange?.(false);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onDown = (e: PointerEvent) => {
      // The lab dialog mounts in body. Keep its opener mounted until it restores focus.
      if (e.target instanceof Element && e.target.closest('.hflab-veil')) return;
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.hflab-veil')) return;
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
        title="Game menu"
        aria-label="Game menu"
      >
        Game menu
      </button>
      {open && (
        <div className="pt-menu-list" id={id}>
          {extra}
          <a href="/games/" ref={first}>
            All games
          </a>
          <DebugMenu>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onExport();
              }}
            >
              Download this run
            </button>
            <button type="button" onClick={load}>
              Import run
            </button>
          </DebugMenu>
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
  let diagnostic: React.ReactNode;
  if ('busy' in status)
    body = status.busy === 'export' ? 'Making the playtest file…' : 'Replaying the playtest file…';
  else if ('error' in status) {
    tone = 'bad';
    body = playerError(status.error, 'load');
    diagnostic = status.error;
  } else {
    const r = status.result;
    const builds =
      r.file.framework !== r.here.framework || r.file.engine !== r.here.engine
        ? ` The file was made with framework ${r.file.framework} (engine ${r.file.engine}); this page runs ${r.here.framework} (engine ${r.here.engine}).`
        : '';
    tone = r.matches ? 'good' : 'bad';
    body = r.matches
      ? 'The saved game replayed correctly.'
      : 'The saved game could not replay correctly. Start a fresh game.';
    diagnostic = `Replay ${r.matches ? 'matched' : 'differed'}: hash ${r.hash}, file ${r.expected}. First difference: ${r.driftAt}. Build: ${r.file.build}.${builds}`;
  }
  return (
    <div className={`pt-notice is-${tone}`} role="status" data-testid="playtest-notice">
      <span>
        {body}
        {diagnostic && (
          <DebugMenu>
            <p>{diagnostic}</p>
          </DebugMenu>
        )}
      </span>
      {!('busy' in status) && (
        <button type="button" className="pt-notice-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      )}
    </div>
  );
}
