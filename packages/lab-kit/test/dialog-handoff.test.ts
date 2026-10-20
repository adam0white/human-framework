import { afterEach, expect, it, vi } from 'vitest';
import { openSendDialog } from '../../lab-client/src/dialog.ts';
import type { Lab } from '../../lab-client/src/index.ts';
import { notebookMenu } from '../src/notebook-menu.ts';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
it('hands focus to the real client after queued native close, then returns to Notebook', async () => {
  const lab = {
    game: 'pass',
    build: () => ({}),
    openSendDialog(options: { getRun: () => unknown }) {
      openSendDialog({ lab: lab as Lab, ...options });
    },
  };
  const entry = notebookMenu({
    lab,
    getRun: () => ({ seed: 1, inputs: [], state: {} }),
    filename: 'run.json',
  });
  document.body.append(entry);
  entry.focus();
  entry.click();
  const sheet = document.querySelector('dialog') as HTMLDialogElement;
  // Model the browser's queued native close event (happy-dom dispatches it synchronously).
  vi.spyOn(sheet, 'close').mockImplementation(() => {
    sheet.open = false;
    setTimeout(() => sheet.dispatchEvent(new Event('close')), 0);
  });
  const send = [...sheet.querySelectorAll('button')].find(
    (b) => b.textContent === 'Send this run to the notebook',
  );
  send?.focus();
  send?.click();
  await vi.waitFor(() => expect(document.querySelector('.hflab')).not.toBeNull());
  // Let queued browser tasks settle, including the native dialog's close event.
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(document.querySelector('.hflab')?.contains(document.activeElement)).toBe(true);
  const close = [...document.querySelectorAll('.hflab button')].find(
    (b) => b.textContent === 'Not now',
  ) as HTMLButtonElement;
  close.click();
  expect(document.activeElement).toBe(entry);
});
