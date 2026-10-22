/**
 * The "Send this run to the notebook" dialog, in the Field Notebook language (docs/design-language.md):
 * ink on warm paper, one accent, phone-first as a bottom sheet at 360×780. Plain DOM, no framework, so any game
 * can use it. It shows exactly what will be sent before anything is sent.
 */

import { readLocal, writeLocal } from './identity.ts';
import type { Lab } from './index.ts';
import { checkRun, compressedRefusal, RUN_LIMITS, runRefusal } from './limits.ts';
import { type CompactOptions, gzip, PRIVACY_URL, runEnvelope } from './util.ts';

export type SendDialogOptions = CompactOptions & {
  /** Initial feedback text, retained when a consented send falls back to this dialog. */
  note?: string;
  lab: Lab;
  /** Returns the game's playtest export (seed, input log, state) at the moment the dialog opens. */
  getRun: () => unknown;
  /** Title. Default "Send this run to the notebook". */
  title?: string;
  /** Optional name prefill; otherwise remembers the last name on this origin/device. */
  name?: string;
  /** Prefill for the "who you are" field. The dialog itself remembers nothing. */
  who?: string;
  /** Called with the reference id after a successful send. */
  onSent?: (id: string) => void;
};

const STYLE_ID = 'hf-lab-style';

const CSS = `
.hflab-veil{position:fixed;inset:0;z-index:2147483000;background:rgba(20,17,12,.45);display:flex;align-items:flex-end;justify-content:center}
.hflab{--paper:#F3ECDD;--paper-2:#E9DFCB;--ink:#23201B;--ink-soft:#6E665A;--rope:#C2412D;--moss:#4F6B3A;
  box-sizing:border-box;width:100%;max-width:34rem;max-height:92dvh;overflow:auto;background:var(--paper);color:var(--ink);
  font:400 17px/1.5 "Literata","Iowan Old Style",Georgia,serif;border:1.5px solid var(--ink);border-bottom:0;border-radius:14px 14px 0 0;
  padding:18px 16px max(16px,env(safe-area-inset-bottom));-webkit-text-size-adjust:100%}
@media (min-width:600px){.hflab-veil{align-items:center}.hflab{border-bottom:1.5px solid var(--ink);border-radius:14px}}
@media (prefers-color-scheme:dark){.hflab{--paper:#1E1B16;--paper-2:#29251E;--ink:#E8DFCC;--ink-soft:#9A9080;--rope:#E2614A;--moss:#8DAA6E}}
.hflab *{box-sizing:border-box}
.hflab h2{font-size:1.25rem;line-height:1.25;margin:0 0 6px;font-weight:600}
.hflab p{margin:0 0 12px;max-width:60ch}
.hflab .soft{color:var(--ink-soft);font-size:.92rem}
.hflab label{display:block;margin:12px 0 4px;font-weight:600;font-size:.95rem}
.hflab textarea,.hflab input[type=text]{width:100%;font:inherit;font-size:16px;color:var(--ink);background:var(--paper-2);
  border:1.5px solid var(--ink-soft);border-radius:8px;padding:8px 10px}
.hflab textarea:focus,.hflab input:focus,.hflab button:focus-visible,.hflab summary:focus-visible,.hflab a:focus-visible{outline:2px solid var(--rope);outline-offset:2px}
.hflab details{margin:14px 0;border-top:1.5px solid var(--ink-soft);padding-top:10px}
.hflab summary{cursor:pointer;font-weight:600}
.hflab .exact{width:100%;height:16rem;max-height:35dvh;resize:vertical;font:13px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;margin-top:8px;background:var(--paper-2);color:var(--ink);border:1px solid var(--ink-soft);border-radius:6px;padding:8px}
.hflab dl{margin:10px 0;font-size:.92rem;overflow-wrap:anywhere}
.hflab dt{font-weight:600;margin-top:6px}
.hflab dd{margin:0;white-space:pre-wrap}
.hflab .row{display:flex;gap:10px;margin-top:16px}
.hflab button{font:inherit;min-height:48px;border-radius:10px;padding:10px 16px;cursor:pointer;border:1.5px solid var(--ink);background:transparent;color:var(--ink)}
.hflab button.send{flex:1;background:var(--rope);border-color:var(--rope);color:#fff;font-weight:600}
.hflab button[disabled]{opacity:.55;cursor:default}
.hflab .status{margin-top:12px;min-height:1.5em}
.hflab .ok{color:var(--moss);font-weight:600}
.hflab .err{color:var(--rope)}
.hflab .check{display:flex;gap:8px;align-items:flex-start;font-weight:400;font-size:.92rem;color:var(--ink-soft)}
.hflab .check input{margin-top:4px;accent-color:var(--rope)}
.hflab a{color:inherit;text-decoration-color:var(--rope);text-underline-offset:3px}
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & Record<string, unknown> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'className') node.className = String(v);
    else if (k.startsWith('aria-') || k === 'role' || k === 'for') node.setAttribute(k, String(v));
    else (node as unknown as Record<string, unknown>)[k] = v;
  }
  node.append(...children);
  return node;
}

const kb = (n: number) => (n < 1024 ? `${n} bytes` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`);

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function openSendDialog(options: SendDialogOptions): void {
  const { lab } = options;
  if (!document.getElementById(STYLE_ID)) {
    document.head.append(el('style', { id: STYLE_ID, textContent: CSS }));
  }
  // A frozen copy of the run and build at the moment the dialog opens: what is shown is what is sent.
  let run: unknown;
  try {
    const exported = options.getRun();
    run = exported === undefined || exported === null ? undefined : JSON.parse(JSON.stringify(exported));
  } catch {
    run = undefined;
  }
  const build = { ...lab.build() };
  const opener = document.activeElement as HTMLElement | null;

  const titleId = 'hflab-title';
  const note = el('textarea', { id: 'hflab-note', rows: 4, maxLength: 4000 });
  note.value = options.note?.slice(0, 4000) ?? '';
  note.placeholder = 'What you felt, where you got stuck, what you wanted to do.';
  const who = el('input', { id: 'hflab-who', type: 'text', maxLength: 40, value: options.who ?? '' });
  who.placeholder = 'e.g. owner, a friend of Adam';
  const name = el('input', {
    id: 'hflab-name',
    type: 'text',
    maxLength: 60,
    value: options.name ?? readLocal('hf-lab-feedback-name') ?? '',
  });
  const exact = el('textarea', {
    className: 'exact',
    readOnly: true,
    'aria-label': 'Full payload JSON, formatted for reading',
    wrap: 'soft',
    spellcheck: false,
  });
  const compactNotice = el('p', { className: 'soft' });
  const sizes = el('span', {});
  const summary = el('summary', {}, 'Run and note payload ', sizes);
  const overview = el('dl');
  const fields = new Map<string, HTMLElement>();
  for (const [key, label] of [
    ['game', 'Game'],
    ['build', 'Build'],
    ['when', 'When'],
    ['duration', 'Run duration'],
    ['inputs', 'Inputs'],
    ['note', 'Note'],
    ['sizes', 'Sizes'],
  ] as const) {
    const value = el('dd', { id: `hflab-preview-${key}` });
    fields.set(key, value);
    overview.append(el('dt', {}, label), value);
  }
  const copy = el('button', { id: 'hflab-copy', type: 'button' }, 'Copy JSON');
  const copyStatus = el('p', { className: 'soft', role: 'status' });
  copy.addEventListener('click', async () => {
    const value = exact.value;
    try {
      await navigator.clipboard.writeText(value);
      copyStatus.textContent = 'JSON copied.';
    } catch {
      exact.focus();
      exact.select();
      copyStatus.textContent = 'Copy unavailable. JSON selected; use your device’s Copy command.';
    }
  });
  const details = el(
    'details',
    {},
    summary,
    overview,
    el(
      'p',
      { className: 'soft' },
      'JSON formatted for reading. Recording adds player, session and run ids, and sends compressed pieces in the background.',
    ),
    exact,
    copy,
    copyStatus,
  );
  const openedAt = new Date().toLocaleString();
  const status = el('p', { className: 'status', role: 'status' });
  const send = el('button', { className: 'send', type: 'button' }, 'Send');
  const cancel = el('button', { type: 'button' }, 'Not now');
  const eventsBox = el('input', { type: 'checkbox', id: 'hflab-events', checked: lab.eventsOn });
  const eventsLabel = el('span');
  const eventsRow = el('label', { className: 'check', for: 'hflab-events' }, eventsBox, eventsLabel);
  const privacyNote = el('p', { className: 'soft', id: 'hflab-privacy-note', role: 'status' });
  const overrideBox = el('input', {
    type: 'checkbox',
    id: 'hflab-privacy-override',
    checked: lab.privacyOverride,
  });
  const overrideRow = el(
    'label',
    { className: 'check', for: 'hflab-privacy-override' },
    overrideBox,
    'Allow linked lab recording despite the browser signal',
  );
  const syncEvents = () => {
    eventsBox.checked = lab.eventsOn;
    eventsLabel.textContent = lab.eventsOn
      ? 'Record play, runs, saves and logs for the lab.'
      : 'Lab recording is off in this browser.';
    eventsBox.disabled = lab.privacySignalOn && !lab.privacyOverride;
    privacyNote.textContent = !lab.privacySignalOn
      ? 'Your saved choice allows linked recording even when your browser asks sites not to track.'
      : lab.eventsOn
        ? 'Your browser asks sites not to track. You chose to send linked recording.'
        : 'Your browser asks sites not to track. Automatic lab recording is off.';
  };
  syncEvents();
  overrideBox.addEventListener('change', () => {
    lab.setPrivacyOverride(overrideBox.checked);
    if (overrideBox.checked) lab.setEventsOff(false);
    syncEvents();
  });

  const text = () =>
    JSON.stringify(
      runEnvelope(lab.game, build, run, {
        note: note.value,
        who: who.value,
        name: name.value,
        compacted,
      }),
    );
  eventsBox.addEventListener('change', () => {
    lab.setEventsOff(!eventsBox.checked);
    syncEvents();
  });
  let compacted = false;
  let compactAttempted = false;
  let pending = 0;
  let approvedText = '';
  let sending = false;
  let closed = false;
  const refresh = async () => {
    const ticket = ++pending;
    send.disabled = true;
    approvedText = '';
    status.className = 'status';
    status.textContent = 'Checking run size…';
    try {
      if (run === undefined) throw new Error('There is no run to send yet.');
      if (typeof CompressionStream === 'undefined') {
        throw new Error('This browser cannot compress the run. Download the run file from the game instead.');
      }
      let t = text();
      if (!checkRun(t) && options.compact && !compactAttempted) {
        compactAttempted = true;
        // A failed compactor must not mutate the held run and bypass disclosure on a later edit.
        const replacement = options.compact(JSON.parse(JSON.stringify(run)));
        if (replacement === undefined || replacement === null) throw new Error(runRefusal(t));
        run = JSON.parse(JSON.stringify(replacement));
        compacted = true;
        compactNotice.textContent = options.compactNote ?? 'This run was shortened to fit the notebook.';
        t = text();
      }
      // Parse the very serialization held for sending; formatting cannot diverge from the wire data.
      const payload = JSON.parse(t) as ReturnType<typeof runEnvelope>;
      exact.value = JSON.stringify(payload, null, 2);
      copyStatus.textContent = '';
      const set = (key: string, value: string) => {
        const field = fields.get(key);
        if (field) field.textContent = value;
      };
      const record = (value: unknown): Record<string, unknown> =>
        value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
      const exported = record(payload.run);
      set('game', payload.game);
      set(
        'build',
        Object.entries(payload.build)
          .map(
            ([key, value]) =>
              `${({ c: 'Commit', hf: 'HF', a: 'App' } as Record<string, string>)[key] ?? key}: ${value}`,
          )
          .join(' · ') || 'Not recorded',
      );
      const timestamp = exported.exportedAt ?? exported.savedAt;
      set(
        'when',
        typeof timestamp === 'string'
          ? timestamp
          : `Preview opened ${openedAt} (local time; not recorded in payload)`,
      );
      const state = record(exported.state);
      const minute = exported.minute ?? exported.endMinute ?? state.minute;
      set(
        'duration',
        typeof minute === 'number' && Number.isFinite(minute)
          ? `Elapsed time not recorded; game clock: ${minute} minutes`
          : 'Elapsed time not recorded',
      );
      set(
        'inputs',
        Array.isArray(exported.inputs)
          ? String(exported.inputs.length)
          : Array.isArray(exported.log)
            ? `${exported.log.length} replay log entries`
            : 'Not recorded',
      );
      set('note', payload.note ?? '(No note)');
      set('sizes', `${kb(new TextEncoder().encode(t).length)} JSON; checking compressed size…`);
      sizes.textContent = `(${kb(new TextEncoder().encode(t).length)})`;
      if (!checkRun(t)) throw new Error(runRefusal(t));
      const gz = await gzip(t);
      if (closed || ticket !== pending || sending) return;
      sizes.textContent = `(${kb(new TextEncoder().encode(t).length)}, ${kb(gz.size)} compressed)`;
      set('sizes', `${kb(new TextEncoder().encode(t).length)} JSON; ${kb(gz.size)} compressed`);
      if (gz.size > RUN_LIMITS.compressedBytes) throw new Error(compressedRefusal(gz.size));
      approvedText = t;
      status.textContent = '';
      send.disabled = false;
    } catch (error) {
      if (closed || ticket !== pending) return;
      status.className = 'status err';
      status.textContent = `Not sent: ${errorMessage(error, 'the run could not be prepared.')}`;
    }
  };
  note.addEventListener('input', () => {
    if (!sending) void refresh();
  });
  name.addEventListener('input', () => {
    if (!sending) void refresh();
  });
  who.addEventListener('input', () => {
    if (!sending) void refresh();
  });

  const sheet = el(
    'div',
    { className: 'hflab', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    el('h2', { id: titleId }, options.title ?? 'Send this run to the notebook'),
    el(
      'p',
      {},
      'This sends your run (the seed, every input you made, and where the game stands now) to the lab’s private notebook, so the people making this game can replay it. The run and note are not published; a short line from a note may be quoted, without anything personal, in the lab’s public feedback ledger.',
    ),
    el('label', { for: 'hflab-note' }, 'A note ', el('span', { className: 'soft' }, '(optional)')),
    note,
    el(
      'label',
      { for: 'hflab-who' },
      'Who you are ',
      el('span', { className: 'soft' }, '(optional, no need for a name)'),
    ),
    who,
    el('label', { for: 'hflab-name' }, 'Name (optional)'),
    name,
    compactNotice,
    details,
    eventsRow,
    ...(lab.privacySignalOn || lab.privacyOverride ? [privacyNote, overrideRow] : []),
    el(
      'p',
      { className: 'soft' },
      'A name labels your player id and its linked play history. It is optional and remembered on this device. ',
      el('a', { href: PRIVACY_URL, target: '_blank', rel: 'noopener' }, 'How the notebook handles this'),
      '.',
    ),
    status,
    el('div', { className: 'row' }, cancel, send),
  );
  const veil = el('div', { className: 'hflab-veil' }, sheet);

  const close = () => {
    closed = true;
    pending++;
    veil.remove();
    document.removeEventListener('keydown', onKey, true);
    opener?.focus?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      const focusable = [...sheet.querySelectorAll<HTMLElement>('textarea,input,button,summary,a')].filter(
        (n) => !(n as HTMLButtonElement).disabled,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    e.stopPropagation();
  };
  document.addEventListener('keydown', onKey, true);
  veil.addEventListener('click', (e) => {
    if (e.target === veil) close();
  });
  cancel.addEventListener('click', close);

  send.addEventListener('click', async () => {
    if (!approvedText || send.disabled || sending || closed) return;
    sending = true;
    send.disabled = true;
    status.className = 'status';
    status.textContent = 'Sending…';
    // What is shown stays what is sent: the fields are locked while the request is in flight.
    note.readOnly = true;
    who.readOnly = true;
    name.readOnly = true;
    const sent = approvedText;
    try {
      const id = await lab.sendEnvelopeText(sent);
      writeLocal('hf-lab-feedback-name', name.value.trim().slice(0, 60) || null);
      status.className = 'status ok';
      status.textContent = lab.telemetryOn
        ? `Queued for background upload. Reference ${id}.`
        : `Sent. Reference ${id}. Quote it if you ever want this run removed.`;
      send.remove();
      cancel.textContent = 'Close';
      cancel.focus();
      options.onSent?.(id);
    } catch (e) {
      status.className = 'status err';
      status.textContent = `Not sent: ${errorMessage(e, 'the notebook could not be reached.')}`;
      sending = false;
      send.disabled = false;
      note.readOnly = false;
      who.readOnly = false;
      name.readOnly = false;
    }
  });

  document.body.append(veil);
  void refresh();
  note.focus();
}
