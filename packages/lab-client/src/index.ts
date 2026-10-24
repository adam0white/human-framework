/** Default-on linked lab telemetry. Games own their replay exports; this client owns consent and delivery.
 * Pseudonymous identity is shared by the lab identity frame, with an origin-scoped fallback if blocked.
 * Off deletes the local id, clears pending pieces and aborts active uploads. Browser privacy signals
 * suppress automatic linked data unless the player explicitly overrides them for this game.
 */

import { openSendDialog, type SendDialogOptions } from './dialog.ts';
import {
  identityBridge,
  localPlayer,
  PLAYER_KEY,
  OFF_KEY as RECORDING_OFF,
  readLocal,
  writeLocal,
} from './identity.ts';
import { checkRun, compressedRefusal, RUN_LIMITS, runRefusal } from './limits.ts';
import { linkedTransport, randomId } from './linked.ts';
import { type Build, type CompactOptions, DEFAULT_ENDPOINT, gzip, prepareRun } from './util.ts';

export { checkRun, RUN_LIMITS } from './limits.ts';
export * from './persona.ts';

export { type Build, type CompactOptions, DEFAULT_ENDPOINT, gzip, PRIVACY_URL, runEnvelope } from './util.ts';
export { openSendDialog, type SendDialogOptions };

const SID_KEY = 'hf-lab-session';
const OFF_KEY = 'hf-lab-events-off';
const OVERRIDE_KEY = 'hf-lab-privacy-override';

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
  /** Whether regular events are being sent (false under DNT/GPC without explicit consent, when turned off, or on localhost). */
  readonly eventsOn: boolean;
  /** Turn regular events off or on for this game in this browser (remembered in localStorage). */
  setEventsOff(off: boolean): void;
  /** Whether the browser asks not to track. */
  readonly privacySignalOn: boolean;
  /** Explicit per-game consent to linked recording despite that signal. */
  readonly privacyOverride: boolean;
  setPrivacyOverride(allow: boolean): void;
  /** Queues a linked run and resolves to its upload reference; this is not a delivery receipt. */
  sendRun(
    run: unknown,
    extra?: { note?: string; who?: string; name?: string } & CompactOptions,
  ): Promise<string>;
  /** Queues the run and note from a serialized envelope, adding linkage metadata. */
  sendEnvelopeText(text: string): Promise<string>;
  /** Opens the "Send this run to the notebook" dialog. */
  openSendDialog(options: Omit<SendDialogOptions, 'lab'>): void;
  readonly telemetryOn: boolean;
  readonly playerId: string | null;
  setTelemetryOff(off: boolean): void;
  /** Poll a game's full seed/input/state export in the background; returns its teardown. */
  trackRun(
    getRun: () => unknown | Promise<unknown>,
    options?: { getLogs?: () => unknown[]; runKey?: () => string | number },
  ): () => void;
  captureSave(value: unknown): void;
  log(level: 'error' | 'warn' | 'game', message: string): void;
  /** Queues feedback attached to the current linked run. It does not opt into character analysis. */
  sendFeedback(note: string, options?: { name?: string }): Promise<string>;
  /** Call before attaching a persisted/imported persona run or any upload hook. */
  setPersonaRecording(personaKey: string | null): void;
  readonly personaRecordingAllowed: boolean;
  /** Explicit historical-linkage choice for the current recording identity only. */
  allowPersonaRecording(allow: boolean): void;
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
  const overrideKey = `${OVERRIDE_KEY}:${game}`;
  const local_ = g.location ? isLocalhost(g.location.hostname) : true;
  let off = readLocal(RECORDING_OFF) === '1' || getItem(local, offKey) === '1';
  let override = getItem(local, overrideKey) === '1';
  let player: string | null = null;
  let identity: ReturnType<typeof identityBridge> | undefined;
  let personaKey: string | null = null;
  const personaAllowed = () =>
    !personaKey || Boolean(player && readLocal(`hf-persona-recording:${personaKey}`) === player);
  const queue: { event: Event; runId: string }[] = [];
  const logs: { level: 'error' | 'warn' | 'game'; message: string; at: number; runId: string }[] = [];
  const stopped = () =>
    !personaAllowed() ||
    off ||
    readLocal(RECORDING_OFF) === '1' ||
    (privacySignal(g) && !override) ||
    (local_ && !options.sendFromLocalhost);
  const sessionKey = `${SID_KEY}:${game}`;
  const stored = getItem(session, sessionKey)?.split(':');
  let sid = stored?.[0] ?? '';
  let started = Number(stored?.[1]);
  const fresh = !/^[a-f0-9]{32}$/.test(sid) || !Number.isFinite(started);
  if (fresh) {
    sid = randomId();
    started = Date.now();
    setItem(session, sessionKey, `${sid}:${started}`);
  }
  const runStorageKey = `hf-lab-run:${game}`;
  let runId = getItem(session, runStorageKey) ?? randomId();
  if (!/^[a-f0-9]{32}$/.test(runId)) runId = randomId();
  setItem(session, runStorageKey, runId);
  let build: Build = options.build ?? {};
  let buildKnown = Boolean(options.build);
  let transport: ReturnType<typeof linkedTransport>;
  const explicitUploads = new Set<AbortController>();
  const reset = () => {
    for (const upload of explicitUploads) upload.abort();
    explicitUploads.clear();
    queue.length = 0;
    logs.length = 0;
    transport?.clear();
  };
  const onIdentity = (id: string | null, value: boolean) => {
    if (player !== id) reset();
    player = id;
    off = value;
    writeLocal(RECORDING_OFF, value ? '1' : null);
    writeLocal(PLAYER_KEY, id);
    if (value) {
      sid = randomId();
      started = Date.now();
      runId = randomId();
      setItem(session, sessionKey, `${sid}:${started}`);
      setItem(session, runStorageKey, runId);
      reset();
    }
    g.dispatchEvent?.(new Event('hf-lab-preference'));
  };
  const activate = () => {
    if (
      off ||
      readLocal(RECORDING_OFF) === '1' ||
      (privacySignal(g) && !override) ||
      (local_ && !options.sendFromLocalhost)
    )
      return;
    player = localPlayer();
    identity ??= identityBridge(onIdentity);
  };
  activate();
  transport = linkedTransport({
    game,
    endpoint,
    build: () => build,
    override: () => override,
    enabled: () => !stopped(),
    link: () => (player ? { player, session: sid, runId } : null),
    ready: identity?.ready,
  });
  const at = () => Math.max(0, Date.now() - started);
  let runKey: (() => string | number) | undefined;
  let observedKey: string | number | undefined;
  const syncRun = () => {
    const next = runKey?.();
    if (observedKey !== undefined && next !== observedKey) {
      runId = randomId();
      setItem(session, runStorageKey, runId);
    }
    observedKey = next;
  };
  const milestones = new Set<string>();
  let lastScreen = '';
  let snapshot: (() => Promise<void>) | undefined;
  function flush(allowUnknownBuild = false) {
    if (stopped()) {
      reset();
      return;
    }
    if (!buildKnown && !allowUnknownBuild) return;
    const events = queue.splice(0);
    const lines = logs.splice(0);
    void (identity?.ready ?? Promise.resolve())
      .then(async () => {
        if (stopped()) return;
        const base = player ? { player, session: sid } : null;
        if (!base) return;
        for (const id of new Set(events.map((e) => e.runId))) {
          const group = events.filter((e) => e.runId === id).map((e) => e.event);
          for (let i = 0; i < group.length; i += 30)
            await transport.send(
              'events',
              { vp: viewportClass(g.innerWidth ?? 1280), started, e: group.slice(i, i + 30) },
              { ...base, runId: id },
            );
        }
        for (const id of new Set(lines.map((e) => e.runId)))
          await transport.send(
            'logs',
            lines.filter((e) => e.runId === id),
            { ...base, runId: id },
          );
        await transport.drain();
      })
      .catch(() => {});
  }
  const push = (event: Event) => {
    if (stopped()) return;
    syncRun();
    queue.push({ event, runId });
    if (queue.length >= 40) flush(true);
  };
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
  const log = (level: 'error' | 'warn' | 'game', message: string) => {
    if (stopped() || logs.length >= 60) return;
    // Never read arbitrary console objects, browser headers, URLs with queries, or stacks.
    const cleaned = message
      .replace(/https?:\/\/[^\s]+/g, (url) => url.split(/[?#]/)[0] ?? '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
      .slice(0, 1000);
    syncRun();
    logs.push({ level, message: cleaned, at: Date.now(), runId });
  };
  if (typeof g.addEventListener === 'function') {
    g.addEventListener('hf-lab-preference', () => {
      if (off || readLocal(RECORDING_OFF) === '1') {
        player = null;
        reset();
      } else activate();
    });
    g.addEventListener('storage', (event: StorageEvent) => {
      if (![offKey, overrideKey, RECORDING_OFF, PLAYER_KEY, null].includes(event.key)) return;
      off = readLocal(RECORDING_OFF) === '1' || getItem(local, offKey) === '1';
      override = getItem(local, overrideKey) === '1';
      if (off || readLocal(RECORDING_OFF) === '1') {
        player = null;
        reset();
      } else activate();
    });
    if (options.captureErrors !== false) {
      g.addEventListener('error', (e: ErrorEvent) => {
        push(['err', at(), errorLabel(e.error, e.filename, e.lineno, e.colno)]);
        log('error', e.message || errorLabel(e.error));
      });
      g.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
        push(['err', at(), errorLabel(e.reason)]);
        log(
          'error',
          e.reason instanceof Error
            ? e.reason.message
            : typeof e.reason === 'string'
              ? e.reason
              : errorLabel(e.reason),
        );
      });
      // One dispatcher per page prevents multiple game clients wrapping each other.
      const key = Symbol.for('hf-lab-console');
      const global = g as unknown as Record<symbol, Set<typeof log> | undefined>;
      let sinks = global[key];
      if (!sinks) {
        sinks = new Set();
        global[key] = sinks;
        for (const level of ['warn', 'error'] as const) {
          const original = console[level].bind(console);
          console[level] = (...args: unknown[]) => {
            original(...args);
            const message = args.filter((x): x is string => typeof x === 'string').join(' ');
            if (message) for (const sink of global[key] ?? []) sink(level, message);
          };
        }
      }
      sinks.add(log);
    }
    g.addEventListener('pagehide', () => {
      push(['end', at()]);
      void snapshot?.();
      flush(true);
    });
    g.document?.addEventListener('visibilitychange', () => {
      if (g.document.visibilityState === 'hidden') {
        void snapshot?.();
        flush(true);
      }
    });
    setInterval(() => flush(), 20000);
  }
  const setOff = (value: boolean) => {
    off = value;
    setItem(local, offKey, value ? '1' : null);
    writeLocal(RECORDING_OFF, value ? '1' : null);
    if (value) {
      sid = randomId();
      started = Date.now();
      runId = randomId();
      setItem(session, sessionKey, `${sid}:${started}`);
      setItem(session, runStorageKey, runId);
      player = null;
      writeLocal(PLAYER_KEY, null);
      reset();
      identity ??= identityBridge(onIdentity);
      identity.setOff(true);
    } else {
      activate();
      identity?.setOff(false);
    }
    g.dispatchEvent?.(new Event('hf-lab-preference'));
  };
  const lab: Lab = {
    game,
    endpoint,
    build: () => build,
    setPersonaRecording(key) {
      if (key !== null && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key))
        throw new Error('Invalid persona recording key.');
      personaKey = key;
      if (!personaAllowed()) reset();
    },
    get personaRecordingAllowed() {
      return personaAllowed();
    },
    allowPersonaRecording(allow) {
      if (!personaKey) return;
      writeLocal(`hf-persona-recording:${personaKey}`, allow && player ? player : null);
      if (!personaAllowed()) reset();
    },
    get eventsOn() {
      return !stopped();
    },
    get telemetryOn() {
      return !stopped();
    },
    get playerId() {
      return stopped() ? null : player;
    },
    get privacySignalOn() {
      return privacySignal(g);
    },
    get privacyOverride() {
      return override;
    },
    setPrivacyOverride(value) {
      override = value;
      setItem(local, overrideKey, value ? '1' : null);
      if (off || readLocal(RECORDING_OFF) === '1') {
        player = null;
        reset();
      } else activate();
    },
    setEventsOff: setOff,
    setTelemetryOff: setOff,
    milestone(name) {
      if (milestones.has(name)) return;
      milestones.add(name);
      push(['ms', at(), name.slice(0, 80)]);
    },
    screen(name) {
      if (name === lastScreen) return;
      lastScreen = name;
      push(['scr', at(), name.slice(0, 80)]);
    },
    flush,
    log,
    trackRun(getRun, opts = {}) {
      let busy = false;
      let disposed = false;
      runKey = opts.runKey;
      syncRun();
      const take = async () => {
        if (busy || disposed || stopped()) return;
        busy = true;
        try {
          syncRun();
          const captured = player ? { player, session: sid, runId } : undefined;
          const generation = opts.runKey?.();
          const run = await getRun();
          if (run !== undefined && run !== null && !disposed && !stopped() && generation === opts.runKey?.())
            await transport.send('run', run, captured);
          for (const line of opts.getLogs?.() ?? []) if (typeof line === 'string') log('game', line);
        } catch {
        } finally {
          busy = false;
        }
      };
      snapshot = take;
      const timer = setInterval(() => void take(), 60000);
      void (identity?.ready ?? Promise.resolve()).then(take);
      return () => {
        disposed = true;
        clearInterval(timer);
        if (snapshot === take) snapshot = undefined;
      };
    },
    captureSave(value) {
      syncRun();
      const captured = player ? { player, session: sid, runId } : undefined;
      if (!stopped())
        void (identity?.ready ?? Promise.resolve())
          .then(() => transport.send('save', value, captured))
          .catch(() => {});
    },
    async sendFeedback(note, options = {}) {
      syncRun();
      if (stopped()) throw new Error('Lab recording is off.');
      await snapshot?.();
      return transport.send('note', { note: note.trim().slice(0, 4000) }, undefined, options.name);
    },
    async sendRun(run, extra = {}) {
      syncRun();
      if (!personaAllowed()) throw new Error('Choose whether to record this continuing person first.');
      if (!stopped()) {
        await (identity?.ready ?? Promise.resolve());
        const id = await transport.send('run', run);
        if (extra.note || extra.name?.trim())
          await transport.send(
            'note',
            { note: extra.note?.trim().slice(0, 4000) ?? '' },
            undefined,
            extra.name,
          );
        return id;
      }
      if (off || readLocal(RECORDING_OFF) === '1') throw new Error('Lab recording is off.');
      // Explicit legacy Send under a privacy signal remains a separate consented unlinked export.
      return lab.sendEnvelopeText(prepareRun(game, build, run, extra));
    },
    async sendEnvelopeText(text) {
      if (!personaAllowed()) throw new Error('Choose whether to record this continuing person first.');
      if (off || readLocal(RECORDING_OFF) === '1') throw new Error('Lab recording is off.');
      if (!stopped()) {
        const envelope = JSON.parse(text) as { run: unknown; note?: string; name?: string };
        return lab.sendRun(envelope.run, { note: envelope.note, name: envelope.name });
      }
      if (!checkRun(text)) throw new Error(runRefusal(text));
      const body = await gzip(text);
      if (body.size > RUN_LIMITS.compressedBytes) throw new Error(compressedRefusal(body.size));
      if (!personaAllowed()) throw new Error('Choose whether to record this continuing person first.');
      const upload = new AbortController();
      explicitUploads.add(upload);
      let res: Response;
      try {
        res = await fetch(`${endpoint}/run`, {
          signal: upload.signal,
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/gzip' },
          mode: 'cors',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        });
      } finally {
        explicitUploads.delete(upload);
      }
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

export * from './cast.ts';
export * from './life.ts';
export { claimCastChapterBatch, type LifeBatchPreparation } from './life.ts';
export { acceptPersonaBatch, closePersonaBranch } from './persona.ts';
