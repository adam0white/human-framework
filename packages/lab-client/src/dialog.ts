/**
 * The "Send this run to the notebook" dialog, in the Field Notebook language (docs/design-language.md):
 * ink on warm paper, one accent, phone-first as a bottom sheet at 360×780. Plain DOM, no framework, so any game
 * can use it. It shows exactly what will be sent before anything is sent.
 */
import type { Lab } from './index.ts';
import { gzip, PRIVACY_URL, runEnvelope } from './util.ts';

export type SendDialogOptions = {
  lab: Lab;
  /** Returns the game's playtest export (seed, input log, state) at the moment the dialog opens. */
  getRun: () => unknown;
  /** Title. Default "Send this run to the notebook". */
  title?: string;
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
.hflab .exact{width:100%;height:12rem;font:13px/1.4 ui-monospace,Menlo,monospace;white-space:pre;overflow:auto;margin-top:8px;background:var(--paper-2);color:var(--ink);border:1px solid var(--ink-soft);border-radius:6px;padding:8px}
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
  note.placeholder = 'What you felt, where you got stuck, what you wanted to do.';
  const who = el('input', { id: 'hflab-who', type: 'text', maxLength: 40, value: options.who ?? '' });
  who.placeholder = 'e.g. owner, a friend of Adam';
  const exact = el('textarea', {
    className: 'exact',
    readOnly: true,
    'aria-label': 'The exact text that is sent',
  });
  const sizes = el('span', {});
  const summary = el('summary', {}, 'Exactly what is sent ', sizes);
  const details = el('details', {}, summary, exact);
  const status = el('p', { className: 'status', role: 'status' });
  const send = el('button', { className: 'send', type: 'button' }, 'Send');
  const cancel = el('button', { type: 'button' }, 'Not now');
  const eventsBox = el('input', { type: 'checkbox', id: 'hflab-events', checked: lab.eventsOn });
  const eventsNote = lab.eventsOn
    ? 'Also send anonymous play events from this game (start, end, milestones, last screen).'
    : 'Anonymous play events are off in this browser.';
  const eventsRow = el('label', { className: 'check', for: 'hflab-events' }, eventsBox, eventsNote);
  if (!lab.eventsOn) eventsBox.disabled = true;

  const text = () => JSON.stringify(runEnvelope(lab.game, build, run, { note: note.value, who: who.value }));
  eventsBox.addEventListener('change', () => lab.setEventsOff(!eventsBox.checked));
  let pending = 0;
  const refresh = async () => {
    const t = text();
    exact.value = JSON.stringify(JSON.parse(t), null, 1);
    const ticket = ++pending;
    sizes.textContent = `(${kb(new TextEncoder().encode(t).length)})`;
    try {
      const gz = await gzip(t);
      if (ticket === pending)
        sizes.textContent = `(${kb(new TextEncoder().encode(t).length)}, ${kb(gz.size)} compressed)`;
    } catch {}
  };
  details.addEventListener('toggle', () => {
    if (details.open) void refresh();
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 300);
  };
  note.addEventListener('input', later);
  who.addEventListener('input', later);

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
    details,
    eventsRow,
    el(
      'p',
      { className: 'soft' },
      'Nothing identifies you unless you write it. ',
      el('a', { href: PRIVACY_URL, target: '_blank', rel: 'noopener' }, 'How the notebook handles this'),
      '.',
    ),
    status,
    el('div', { className: 'row' }, cancel, send),
  );
  const veil = el('div', { className: 'hflab-veil' }, sheet);

  const close = () => {
    clearTimeout(timer);
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

  if (run === undefined) {
    status.className = 'status err';
    status.textContent = 'There is no run to send yet.';
    send.disabled = true;
  } else if (typeof CompressionStream === 'undefined') {
    status.className = 'status err';
    status.textContent = 'This browser cannot compress the run. Download the run file from the game instead.';
    send.disabled = true;
  }

  send.addEventListener('click', async () => {
    send.disabled = true;
    status.className = 'status';
    status.textContent = 'Sending…';
    // What is shown stays what is sent: the fields are locked while the request is in flight.
    note.readOnly = true;
    who.readOnly = true;
    const sent = text();
    clearTimeout(timer);
    exact.value = JSON.stringify(JSON.parse(sent), null, 1);
    try {
      const id = await lab.sendEnvelopeText(sent);
      status.className = 'status ok';
      status.textContent = `Sent. Reference ${id}. Quote it if you ever want this run removed.`;
      send.remove();
      cancel.textContent = 'Close';
      cancel.focus();
      options.onSent?.(id);
    } catch (e) {
      status.className = 'status err';
      status.textContent = `Not sent: ${(e as Error).message || 'the notebook could not be reached.'}`;
      send.disabled = false;
      note.readOnly = false;
      who.readOnly = false;
    }
  });

  document.body.append(veil);
  note.focus();
}
