/**
 * @adam0white/lab-client: the Human Framework game lab's browser client.
 *
 * Two things, both small:
 * - Regular events: anonymous and tiny. Session start and end, how long, milestones the game declares, the
 *   last screen before leaving, the build (commit, HF version, game version) and a viewport class. Batched and
 *   sent with a keepalive fetch that carries no cookies. No cookies, no fingerprinting, no personal data; a random session id
 *   lives in this tab's sessionStorage only. Nothing is sent when the browser signals Do Not Track or Global
 *   Privacy Control, when the player turned events off, or (by default) from localhost.
 * - An opt-in run: the game's own playtest export, gzip-compressed in the browser, plus an optional note and
 *   an optional "who you are" label, sent only when the player presses Send in the dialog, which first shows
 *   exactly what will be sent.
 *
 * Privacy note: https://human.adamwhite.work/lab/privacy/. Endpoint: the lab Worker on human.adamwhite.work.
 * Not covered: replay links, offline queueing of runs, and any analytics beyond the fields above.
 */
import { openSendDialog, type SendDialogOptions } from './dialog.ts';
import { checkRun, compressedRefusal, RUN_LIMITS, runRefusal } from './limits.ts';
import { type Build, type CompactOptions, DEFAULT_ENDPOINT, gzip, prepareRun } from './util.ts';

export { checkRun, RUN_LIMITS } from './limits.ts';

export { type Build, type CompactOptions, DEFAULT_ENDPOINT, gzip, PRIVACY_URL, runEnvelope } from './util.ts';
export { openSendDialog, type SendDialogOptions };

const SID_KEY = 'hf-lab-session';
const OFF_KEY = 'hf-lab-events-off';

export type Viewport = 'phone' | 'tablet' | 'desktop';
type Event = ['start' | 'ms' | 'scr' | 'err' | 'end', number, string?];

export type LabOptions = {
  /** game id, the subdomain: 'pass', 'glance', 'murmur' */
  game: string;
  /** build info. Default: read from this site's /release.json (commit, framework, app). */
  build?: Build;
  /** default DEFAULT_ENDPOINT */
  endpoint?: string;
  /** capture uncaught error messages (message text only, at most 5 per session). Default true. */
  captureErrors?: boolean;
  /** send events from localhost too (for testing the endpoint). Default false. */
  sendFromLocalhost?: boolean;
};

export type Lab = {
  /** A milestone the game declares, e.g. 'service 3 done'. Each name counts once per session. */
  milestone(name: string): void;
  /** The screen the player is on now, e.g. 'night 2: service'. The last one before leaving is the quit point. */
  screen(name: string): void;
  /** Sends what is queued now. Called by itself every 20 s and when the page is hidden. */
  flush(): void;
  /** Whether regular events are being sent (false under DNT/GPC, when turned off, or on localhost). */
  readonly eventsOn: boolean;
  /** Turn regular events off or on for this game in this browser (remembered in localStorage). */
  setEventsOff(off: boolean): void;
  /** Sends a run directly. Resolves to the run's reference id. */
  sendRun(run: unknown, extra?: { note?: string; who?: string } & CompactOptions): Promise<string>;
  /** Sends an envelope already serialized (the dialog sends exactly the text it showed). */
  sendEnvelopeText(text: string): Promise<string>;
  /** Opens the "Send this run to the notebook" dialog. */
  openSendDialog(options: Omit<SendDialogOptions, 'lab'>): void;
  readonly game: string;
  readonly endpoint: string;
  /** The build info once known. */
  build(): Build;
};

type Env = {
  navigator?: Partial<Navigator> & { globalPrivacyControl?: boolean };
  location?: { hostname: string };
  innerWidth?: number;
  doNotTrack?: string;
};

/** True when the browser asks not to be tracked (Do Not Track or Global Privacy Control). */
export function privacySignal(env: Env = globalThis as Env): boolean {
  const nav = env.navigator;
  return nav?.globalPrivacyControl === true || nav?.doNotTrack === '1' || env.doNotTrack === '1';
}

export function viewportClass(width: number): Viewport {
  return width < 600 ? 'phone' : width < 1024 ? 'tablet' : 'desktop';
}

export function isLocalhost(hostname: string): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname) || hostname.endsWith('.localhost');
}

/**
 * An error as its type and place only, never its message (a message can hold player text):
 * "TypeError at index-3f2a.js:12:345".
 */
export function errorLabel(error: unknown, file?: string, line?: number, col?: number): string {
  const raw = error && typeof error === 'object' ? (error as { name?: unknown }).name : undefined;
  const name = typeof raw === 'string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(raw) ? raw : 'Error';
  const base = file?.split(/[?#]/)[0]?.split('/').pop() ?? '';
  return /^[\w.-]{1,60}$/.test(base) && line ? `${name} at ${base}:${line}:${col ?? 0}` : name;
}

/** A random session id: 16 base-36 characters from crypto.getRandomValues. Not derived from the device. */
export function newSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => (b % 36).toString(36)).join('');
}

function storage(kind: 'sessionStorage' | 'localStorage'): Storage | undefined {
  try {
    return (globalThis as unknown as Record<string, Storage | undefined>)[kind];
  } catch {
    return undefined;
  }
}
const getItem = (s: Storage | undefined, k: string) => {
  try {
    return s?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
const setItem = (s: Storage | undefined, k: string, v: string | null) => {
  try {
    if (v === null) s?.removeItem(k);
    else s?.setItem(k, v);
  } catch {}
};

export function createLab(options: LabOptions): Lab {
  const game = options.game;
  const endpoint = (options.endpoint ?? DEFAULT_ENDPOINT).replace(/\/$/, '');
  const g = globalThis as unknown as Env & Window;
  const session = storage('sessionStorage');
  const local = storage('localStorage');
  const offKey = `${OFF_KEY}:${game}`;
  const local_ = g.location ? isLocalhost(g.location.hostname) : true;
  let off = getItem(local, offKey) === '1';
  const blocked = () => {
    if (getItem(local, offKey) === '1') off = true;
    if (off) queue.length = 0;
    return privacySignal(g) || off || (local_ && !options.sendFromLocalhost);
  };

  // Session id and start time: per tab, survive reloads in that tab, gone when the tab closes.
  const sidKey = `${SID_KEY}:${game}`;
  const stored = getItem(session, sidKey)?.split(':');
  let sid = stored?.[0] ?? '';
  let started = Number(stored?.[1]);
  const fresh = !/^[a-z0-9]{16}$/.test(sid) || !Number.isFinite(started);
  if (fresh) {
    sid = newSessionId();
    started = Date.now();
    setItem(session, sidKey, `${sid}:${started}`);
  }
  const at = () => Math.max(0, Date.now() - started);

  let build: Build = options.build ?? {};
  let buildKnown = Boolean(options.build);
  const queue: Event[] = [];
  const milestones = new Set<string>();
  let lastScreen = '';
  let errors = 0;

  const push = (e: Event) => {
    if (blocked()) return;
    queue.push(e);
    if (queue.length >= 40) flush(true);
  };

  function flush(allowUnknownBuild = false) {
    if (blocked() || !queue.length || (!buildKnown && !allowUnknownBuild)) return;
    while (queue.length) {
      let count = Math.min(queue.length, 50);
      const encode = () =>
        JSON.stringify({
          v: 1,
          g: game,
          s: sid,
          b: build,
          vp: viewportClass(g.innerWidth ?? 1280),
          e: queue.slice(0, count),
        });
      let body = encode();
      while (count > 1 && new TextEncoder().encode(body).byteLength > 8192) {
        count--;
        body = encode();
      }
      queue.splice(0, count);
      // A single oversized event is invalid; it must not block every later event.
      if (new TextEncoder().encode(body).byteLength > 8192) continue;
      // Plain text avoids preflight; keepalive permits completion after close, without cookies.
      try {
        void fetch(`${endpoint}/events`, {
          method: 'POST',
          body,
          keepalive: true,
          mode: 'cors',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        }).catch(() => {});
      } catch {}
    }
  }

  if (!buildKnown && typeof fetch === 'function') {
    fetch('/release.json', { cache: 'no-store', credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((r: Record<string, unknown>) => {
        build = {
          ...(typeof r.commit === 'string' ? { c: r.commit.slice(0, 12) } : {}),
          ...(typeof r.framework === 'string' ? { hf: r.framework } : {}),
          ...(typeof r.app === 'string' ? { a: r.app } : {}),
        };
      })
      .catch(() => {})
      .finally(() => {
        buildKnown = true;
        flush();
      });
  }

  if (fresh) push(['start', 0]);

  if (typeof g.addEventListener === 'function') {
    g.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== offKey && event.key !== null) return;
      off = getItem(local, offKey) === '1';
      if (off) queue.length = 0;
    });
    if (options.captureErrors !== false) {
      const onError = (label: string) => {
        if (errors >= 5) return;
        errors++;
        push(['err', at(), label]);
      };
      g.addEventListener('error', (e: ErrorEvent) =>
        onError(errorLabel(e.error, e.filename, e.lineno, e.colno)),
      );
      g.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => onError(errorLabel(e.reason)));
    }
    g.addEventListener('pagehide', () => {
      push(['end', at()]);
      flush(true);
    });
    g.document?.addEventListener('visibilitychange', () => {
      if (g.document.visibilityState === 'hidden') flush(true);
    });
    setInterval(flush, 20_000);
  }

  const lab: Lab = {
    game,
    endpoint,
    get eventsOn() {
      return !blocked();
    },
    build: () => build,
    milestone(name) {
      if (milestones.has(name)) return;
      milestones.add(name);
      push(['ms', at(), name]);
    },
    screen(name) {
      if (name === lastScreen) return;
      lastScreen = name;
      push(['scr', at(), name]);
    },
    flush,
    setEventsOff(value) {
      off = value;
      setItem(local, offKey, value ? '1' : null);
      if (value) queue.length = 0;
    },
    async sendRun(run, extra = {}) {
      return lab.sendEnvelopeText(prepareRun(game, build, run, extra));
    },
    async sendEnvelopeText(text) {
      if (!checkRun(text)) throw new Error(runRefusal(text));
      const body = await gzip(text);
      if (body.size > RUN_LIMITS.compressedBytes) throw new Error(compressedRefusal(body.size));
      const res = await fetch(`${endpoint}/run`, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/gzip' },
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      const reply = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !reply.id) throw new Error(reply.error ?? `The notebook answered ${res.status}.`);
      return reply.id;
    },
    openSendDialog(opts) {
      openSendDialog({ ...opts, lab });
    },
  };
  return lab;
}
