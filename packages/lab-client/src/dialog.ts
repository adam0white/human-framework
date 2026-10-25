/**
 * The "Send this run to the notebook" dialog, in the Field Notebook language (docs/design-language.md):
 * ink on warm paper, one accent, phone-first as a bottom sheet at 360×780. Plain DOM, no framework, so any game
 * can use it. It shows exactly what will be sent before anything is sent.
 */

import { FEEDBACK_LABELS, type FeedbackLabel } from './feedback.ts';
import { readLocal, writeLocal } from './identity.ts';
import type { Lab } from './index.ts';
import { checkRun, RUN_LIMITS } from './limits.ts';
import { type CompactOptions, gzip, PRIVACY_URL, runEnvelope } from './util.ts';

export type SendDialogOptions = CompactOptions & {
  /** Initial feedback text, retained when a consented send falls back to this dialog. */
  note?: string;
  /** Opt in to quiet stop/confusion choices. Selection sends nothing until Submit. */
  feedbackChoices?: boolean;
  lab: Lab;
  /** Returns the game's playtest export (seed, input log, state) at the moment the dialog opens. */
  getRun: () => unknown;
  /** Title. Default "Feedback". */
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
.hflab{--hflab-paper:var(--paper,#F3ECDD);--hflab-paper-2:var(--paper-2,#E9DFCB);--hflab-ink:var(--ink,#23201B);--hflab-ink-soft:var(--ink-soft,#6E665A);--hflab-rope:var(--rope,#C2412D);--hflab-moss:var(--moss,#4F6B3A);
  box-sizing:border-box;width:100%;max-width:34rem;max-height:92dvh;overflow:auto;background:var(--hflab-paper);color:var(--hflab-ink);
  font:400 17px/1.5 "Literata","Iowan Old Style",Georgia,serif;border:1.5px solid var(--hflab-ink);border-bottom:0;border-radius:14px 14px 0 0;
  padding:18px 16px max(16px,env(safe-area-inset-bottom));-webkit-text-size-adjust:100%}
@media (min-width:600px){.hflab-veil{align-items:center}.hflab{border-bottom:1.5px solid var(--hflab-ink);border-radius:14px}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .hflab{--hflab-paper:var(--paper,#1E1B16);--hflab-paper-2:var(--paper-2,#29251E);--hflab-ink:var(--ink,#E8DFCC);--hflab-ink-soft:var(--ink-soft,#9A9080);--hflab-rope:var(--rope,#E2614A);--hflab-moss:var(--moss,#8DAA6E)}}
:root[data-theme="dark"] .hflab{--hflab-paper:var(--paper,#1E1B16);--hflab-paper-2:var(--paper-2,#29251E);--hflab-ink:var(--ink,#E8DFCC);--hflab-ink-soft:var(--ink-soft,#9A9080);--hflab-rope:var(--rope,#E2614A);--hflab-moss:var(--moss,#8DAA6E)}
.hflab *{box-sizing:border-box}
.hflab h2{font-size:1.25rem;line-height:1.25;margin:0 0 6px;font-weight:600}
.hflab p{margin:0 0 12px;max-width:60ch}
.hflab .soft{color:var(--hflab-ink-soft);font-size:.92rem}
.hflab label{display:block;margin:12px 0 4px;font-weight:600;font-size:.95rem}
.hflab textarea,.hflab input[type=text]{width:100%;font:inherit;font-size:16px;color:var(--hflab-ink);background:var(--hflab-paper-2);
  border:1.5px solid var(--hflab-ink-soft);border-radius:8px;padding:8px 10px}
.hflab textarea:focus,.hflab input:focus,.hflab button:focus-visible,.hflab summary:focus-visible,.hflab a:focus-visible{outline:2px solid var(--hflab-rope);outline-offset:2px}
.hflab details{margin:14px 0;border-top:1.5px solid var(--hflab-ink-soft);padding-top:10px}
.hflab summary{cursor:pointer;font-weight:600}
.hflab .exact{width:100%;height:16rem;max-height:35dvh;resize:vertical;font:13px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;margin-top:8px;background:var(--hflab-paper-2);color:var(--hflab-ink);border:1px solid var(--hflab-ink-soft);border-radius:6px;padding:8px}
.hflab dl{margin:10px 0;font-size:.92rem;overflow-wrap:anywhere}
.hflab dt{font-weight:600;margin-top:6px}
.hflab dd{margin:0;white-space:pre-wrap}
.hflab .row{display:flex;gap:10px;margin-top:16px}
.hflab button{font:inherit;min-height:48px;border-radius:10px;padding:10px 16px;cursor:pointer;border:1.5px solid var(--hflab-ink);background:transparent;color:var(--hflab-ink)}
.hflab button.send{flex:1;background:var(--hflab-rope);border-color:var(--hflab-rope);color:#fff;font-weight:600}
.hflab button[disabled]{opacity:.55;cursor:default}
.hflab .status{margin-top:12px;min-height:1.5em}
.hflab .ok{color:var(--hflab-moss);font-weight:600}
.hflab .err{color:var(--hflab-rope)}
.hflab .check{display:flex;gap:8px;align-items:flex-start;font-weight:400;font-size:.92rem;color:var(--hflab-ink-soft)}
.hflab .check input{margin-top:4px;accent-color:var(--hflab-rope)}
.hflab a{color:inherit;text-decoration-color:var(--hflab-rope);text-underline-offset:3px}
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function openSendDialog(options: SendDialogOptions): void {
  const { lab } = options;
  if (!document.getElementById(STYLE_ID))
    document.head.append(el('style', { id: STYLE_ID, textContent: CSS }));
  const opener = document.activeElement as HTMLElement | null;
  let run: unknown;
  try {
    const exported = options.getRun();
    if (exported != null) run = JSON.parse(JSON.stringify(exported));
  } catch {
    /* Feedback remains available without an export. */
  }
  const build = { ...lab.build() };
  const note = el('textarea', { id: 'hflab-note', rows: 4, maxLength: 4000 });
  const draftKey = `hf-lab-feedback-draft:${lab.game}`;
  note.value = (options.note ?? readLocal(draftKey) ?? '').slice(0, 4000);
  note.placeholder = 'What happened, what you wanted, what got in the way.';
  const name = el('input', {
    id: 'hflab-name',
    type: 'text',
    maxLength: 60,
    value: options.name ?? readLocal('hf-lab-feedback-name') ?? '',
  });
  const verdict = el('fieldset', { 'aria-label': 'Would you keep playing?' });
  let verdictValue = '';
  for (const [value, label] of [
    ['keep', 'I’d keep playing'],
    ['mixed', 'Not sure'],
    ['quit', 'I’d stop here'],
  ] as const) {
    const button = el('button', { type: 'button', 'aria-pressed': 'false' }, label);
    button.addEventListener('click', () => {
      verdictValue = verdictValue === value ? '' : value;
      for (const node of verdict.querySelectorAll('button'))
        node.setAttribute('aria-pressed', String(node === button && verdictValue === value));
      void refresh();
    });
    verdict.append(button);
  }
  const choices = el('fieldset', { 'aria-label': 'What is happening?' });
  let feedbackLabel: FeedbackLabel | undefined;
  if (options.feedbackChoices) {
    for (const label of Object.keys(FEEDBACK_LABELS) as FeedbackLabel[]) {
      const button = el('button', { type: 'button', 'aria-pressed': 'false' }, FEEDBACK_LABELS[label]);
      button.addEventListener('click', () => {
        if (sending) return;
        feedbackLabel = feedbackLabel === label ? undefined : label;
        for (const node of choices.querySelectorAll('button'))
          node.setAttribute('aria-pressed', String(node === button && feedbackLabel === label));
        void refresh();
      });
      choices.append(button);
    }
  }
  const exact = el('textarea', {
    className: 'exact',
    readOnly: true,
    'aria-label': 'Full payload JSON, formatted for reading',
    wrap: 'soft',
    spellcheck: false,
  });
  const disclosure = el('p', { className: 'soft' });
  const compactNotice = el('p', { className: 'soft' });
  const copyStatus = el('p', { className: 'soft', role: 'status' });
  const copy = el('button', { id: 'hflab-copy', type: 'button' }, 'Copy JSON');
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(exact.value);
      copyStatus.textContent = 'JSON copied.';
    } catch {
      exact.focus();
      exact.select();
      copyStatus.textContent = 'Copy unavailable. JSON selected; use your device’s Copy command.';
    }
  });
  const overview = el('dl');
  const previewNote = el('dd', { id: 'hflab-preview-note' });
  const previewInputs = el('dd', { id: 'hflab-preview-inputs' });
  overview.append(el('dt', {}, 'Note'), previewNote, el('dt', {}, 'Inputs'), previewInputs);
  const status = el('p', { className: 'status', role: 'status' });
  const send = el('button', { className: 'send', type: 'button' }, 'Submit');
  const cancel = el('button', { type: 'button' }, 'Not now');
  const persona = el('input', {
    type: 'checkbox',
    id: 'hflab-share',
    checked: false,
  });
  const personaRow = el(
    'label',
    { className: 'check', for: 'hflab-share' },
    persona,
    'Share this run and my play with the lab',
  );
  persona.addEventListener('change', () => {
    void refresh();
  });
  let pending = 0;
  let closed = false;
  let sending = false;
  let approvedRun: unknown;
  let approvedNote = '';
  let approvedName = '';
  let compactAttempted = false;
  const refresh = async () => {
    const ticket = ++pending;
    send.disabled = true;
    status.className = 'status';
    status.textContent = 'Checking run size…';
    const message = [
      feedbackLabel ? FEEDBACK_LABELS[feedbackLabel] : '',
      verdictValue ? `Verdict: ${verdictValue}` : '',
      note.value.trim(),
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 4000);
    let candidate = lab.telemetryOn || persona.checked ? run : undefined;
    if (candidate !== undefined) {
      try {
        let text = JSON.stringify(
          runEnvelope(lab.game, build, candidate, { note: message, name: name.value }),
        );
        if (!checkRun(text) && options.compact && !compactAttempted) {
          compactAttempted = true;
          const replacement = options.compact(JSON.parse(JSON.stringify(candidate)));
          if (replacement == null) throw new Error('Run does not fit.');
          run = candidate = JSON.parse(JSON.stringify(replacement));
          compactNotice.textContent = options.compactNote ?? 'This run was shortened to fit the notebook.';
          text = JSON.stringify(runEnvelope(lab.game, build, candidate, { note: message, name: name.value }));
        }
        if (!checkRun(text)) throw new Error('Run does not fit.');
        if ((await gzip(text)).size > RUN_LIMITS.compressedBytes) throw new Error('Run does not fit.');
      } catch {
        candidate = undefined;
      }
    }
    if (closed || ticket !== pending || sending) return;
    approvedRun = candidate;
    approvedNote = message;
    approvedName = name.value.trim().slice(0, 60);
    const payload = runEnvelope(lab.game, build, candidate ?? { feedbackOnly: true }, {
      note: message,
      name: approvedName,
    });
    exact.value = JSON.stringify(payload, null, 2);
    previewNote.textContent = message || '(No note)';
    const record = candidate as { inputs?: unknown[]; log?: unknown[] } | undefined;
    previewInputs.textContent = String(record?.inputs?.length ?? record?.log?.length ?? 0);
    disclosure.textContent =
      candidate === undefined
        ? 'Only your note and optional name are sent. Recording stays as you chose. Keep a downloaded run if you need a full copy.'
        : lab.eventsOn || persona.checked
          ? 'Your run and note are queued with your recorded play history.'
          : 'Your run includes continuing character state. It is sent without a link to your recorded play history.';
    status.textContent = '';
    send.disabled = false;
  };
  note.addEventListener('input', () => {
    if (!sending) void refresh();
  });
  name.addEventListener('input', () => {
    if (!sending) void refresh();
  });
  const sheet = el(
    'div',
    { className: 'hflab', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hflab-title' },
    el('h2', { id: 'hflab-title' }, options.title ?? 'Feedback'),
    verdict,
    ...(options.feedbackChoices ? [choices] : []),
    el('label', { for: 'hflab-note' }, 'A note (optional)'),
    note,
    el('label', { for: 'hflab-name' }, 'Name (optional)'),
    name,
    ...(!lab.telemetryOn ? [personaRow] : []),
    disclosure,
    compactNotice,
    el('details', {}, el('summary', {}, 'What is sent'), overview, exact, copy, copyStatus),
    el(
      'p',
      { className: 'soft' },
      'Your note is private; a short nonpersonal quote may appear in the public feedback ledger. ',
      el('a', { href: PRIVACY_URL, target: '_blank', rel: 'noopener' }, 'Lab privacy'),
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
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      const focusable = [...sheet.querySelectorAll<HTMLElement>('textarea,input,button,summary,a')].filter(
        (node) => !(node as HTMLButtonElement).disabled,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    event.stopPropagation();
  };
  document.addEventListener('keydown', onKey, true);
  veil.addEventListener('click', (event) => {
    if (event.target === veil) close();
  });
  cancel.addEventListener('click', close);
  send.addEventListener('click', async () => {
    if (send.disabled || sending || closed) return;
    sending = true;
    send.disabled = true;
    note.readOnly = true;
    name.readOnly = true;
    persona.disabled = true;
    for (const button of [...verdict.querySelectorAll('button'), ...choices.querySelectorAll('button')])
      button.disabled = true;
    writeLocal(draftKey, approvedNote);
    status.textContent = 'Sending…';
    try {
      const id = await lab.sendFeedback(approvedNote, {
        name: approvedName,
        sharePlay: persona.checked,
        ...(approvedRun !== undefined ? { run: approvedRun } : {}),
      });
      writeLocal(draftKey, null);
      writeLocal('hf-lab-feedback-name', approvedName || null);
      status.className = 'status ok';
      status.textContent = `Sent. Reference ${id}.`;
      send.remove();
      cancel.textContent = 'Close';
      cancel.focus();
      options.onSent?.(id);
    } catch (error) {
      status.className = 'status err';
      const kept =
        readLocal(draftKey) === approvedNote
          ? ' Your text is saved on this device. Reopen Feedback to retry.'
          : ' Your text is still in this dialog. Keep it open to retry.';
      status.textContent = `Not sent: ${errorMessage(error, 'the notebook could not be reached.')}${kept}`;
      sending = false;
      send.disabled = false;
      note.readOnly = false;
      name.readOnly = false;
      persona.disabled = false;
      for (const button of [...verdict.querySelectorAll('button'), ...choices.querySelectorAll('button')])
        button.disabled = false;
    }
  });
  document.body.append(veil);
  void refresh();
  note.focus();
}
