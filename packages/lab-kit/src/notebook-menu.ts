/**
 * Scope: one Game menu entry (DL-26) for saving, full JSON download, privacy and the client's send dialog.
 * The game owns export/replay correctness and saves. This never sends a run itself or creates a lab client.
 */
import { showSheet } from './dialog.ts';

export type NotebookLab = {
  openSendDialog(options: {
    getRun: () => unknown;
    compact?: (run: unknown) => unknown;
    compactNote?: string;
  }): void;
  readonly eventsOn?: boolean;
  setEventsOff?: (off: boolean) => void;
};
export type NotebookMenuOptions = {
  lab?: NotebookLab | null;
  getRun: () => unknown;
  filename: string;
  compact?: (run: unknown) => unknown;
  compactNote?: string;
  onSave?: () => void | Promise<void>;
};

/** Downloads full JSON; object URLs are released after the browser can consume the click. */
export function downloadJson(name: string, value: unknown): void {
  const text = JSON.stringify(value, null, 2);
  if (text === undefined) throw new TypeError('The export must be JSON.');
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function supportsCompact(): Promise<boolean> {
  try {
    // Optional peer: imported only on Send, never when using another kit component.
    const { default: pkg } = await import('@adam0white/lab-client/package.json', { with: { type: 'json' } });
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
    if (!match) return false;
    const major = Number(match[1]);
    const minor = Number(match[2]);
    return major > 0 || minor > 1 || (minor === 1 && Number(match[3]) >= 2);
  } catch {
    return false;
  }
}

/** Returns a single Game menu button; the sheet is created on each open. */
export function notebookMenu(options: NotebookMenuOptions): HTMLButtonElement {
  const entry = document.createElement('button');
  entry.type = 'button';
  entry.textContent = 'Game menu';
  entry.setAttribute('aria-haspopup', 'dialog');
  entry.addEventListener('click', () => {
    const sheet = document.createElement('dialog');
    sheet.className = 'lk-notebook';
    sheet.setAttribute('aria-label', 'Game menu');
    const title = document.createElement('h2');
    title.textContent = 'Game menu';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const button = (label: string, action: () => void | Promise<void>) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.textContent = label;
      node.addEventListener('click', async () => {
        node.disabled = true;
        try {
          await action();
        } catch {
          status.textContent = 'That did not work. Your run is still here; try Download this run.';
        } finally {
          node.disabled = false;
        }
      });
      sheet.append(node);
      return node;
    };
    sheet.append(title);
    if (options.onSave)
      button('Save', async () => {
        await options.onSave?.();
        status.textContent = 'Saved.';
      });
    button('Download this run', () => downloadJson(options.filename, options.getRun()));
    if (options.lab) {
      const lab = options.lab;
      button('Send this run to the notebook', async () => {
        const compact =
          (options.compact || options.compactNote) && (await supportsCompact())
            ? {
                ...(options.compact ? { compact: options.compact } : {}),
                ...(options.compactNote ? { compactNote: options.compactNote } : {}),
              }
            : {};
        if (!sheet.open) return;
        // Native close fires asynchronously. Let cleanup and focus return finish before
        // the external dialog captures its opener and moves focus into its own controls.
        await new Promise<void>((resolve) => {
          sheet.addEventListener('close', () => resolve(), { once: true });
          sheet.close();
        });
        try {
          lab.openSendDialog({ getRun: options.getRun, ...compact });
        } catch {
          showSheet(sheet);
          status.textContent = 'Sending could not open. Download this run; it still has everything.';
        }
      });
      if (lab.setEventsOff && typeof lab.eventsOn === 'boolean') {
        const toggle = button('Turn regular lab events off', () => {
          lab.setEventsOff?.(lab.eventsOn === true);
          updateToggle();
        });
        const updateToggle = () => {
          toggle.textContent = lab.eventsOn ? 'Turn regular lab events off' : 'Turn regular lab events on';
          toggle.setAttribute('aria-pressed', String(lab.eventsOn));
        };
        updateToggle();
      }
    } else {
      const unavailable = document.createElement('p');
      unavailable.className = 'flavour';
      unavailable.textContent = 'Sending is unavailable here. The downloaded export still has everything.';
      sheet.append(unavailable);
    }
    const privacy = document.createElement('a');
    privacy.href = 'https://human.adamwhite.work/lab/privacy/';
    privacy.textContent = 'Lab privacy';
    sheet.append(privacy, status);
    button('Close', () => sheet.close());
    showSheet(sheet);
  });
  return entry;
}
